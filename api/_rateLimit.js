/**
 * Security utilities shared across all Vercel serverless functions.
 * No external dependency required — in-memory sliding window.
 *
 * Note: Vercel keeps warm instances alive across requests, so this Map
 * persists and provides real protection against rapid-fire abuse.
 * Cold-start resets it — that's acceptable for our scale.
 */

// ---------------------------------------------------------------------------
// Rate limiter – sliding window, per-IP
// ---------------------------------------------------------------------------
const _store = new Map(); // ip -> number[] of timestamps

/**
 * @param {string} ip
 * @param {{ limit?: number, windowMs?: number }} opts
 * @returns {{ allowed: boolean, retryAfter?: number }}
 */
export function rateLimit(ip, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const key  = ip || 'anon';
  const hits = (_store.get(key) ?? []).filter(t => now - t < windowMs);

  if (hits.length >= limit) {
    const retryAfter = Math.ceil((hits[0] + windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(1, retryAfter) };
  }

  hits.push(now);
  _store.set(key, hits);

  // Cleanup – prevent unbounded memory growth on high-traffic instances
  if (_store.size > 10_000) {
    for (const [k, v] of _store) {
      if (v.every(t => now - t >= windowMs)) _store.delete(k);
    }
  }

  return { allowed: true };
}

/**
 * Extract the real client IP, honouring Vercel / reverse-proxy headers.
 * @param {import('@vercel/node').VercelRequest} req
 * @returns {string}
 */
export function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'anon'
  );
}

// ---------------------------------------------------------------------------
// CORS – only allow requests that originate from our own app
// ---------------------------------------------------------------------------

/**
 * Returns true when the Origin is one we trust.
 * Requests with NO Origin header (server-to-server, curl, Postman) are
 * allowed — CORS is a browser-only mechanism anyway.
 */
export function isOriginAllowed(origin) {
  if (!origin) return true; // non-browser call — not blocked by CORS

  // Local dev
  if (origin === 'http://localhost:5173' || origin === 'http://localhost:3000') return true;

  // Explicitly configured production URL
  if (process.env.APP_URL && origin === process.env.APP_URL) return true;

  // Any *.vercel.app deployment (previews + production)
  if (/^https:\/\/[a-z0-9][a-z0-9-]*\.vercel\.app$/.test(origin)) return true;

  return false;
}

/**
 * Set appropriate CORS response headers.
 * Echoes back the request Origin when allowed (required for credentialed
 * requests), so the browser sees an exact match rather than a wildcard.
 */
export function setCorsHeaders(res, origin) {
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const ALLOWED_ROLES = new Set(['user', 'assistant', 'system']);
const MAX_MESSAGES  = 30;
const MAX_MSG_CHARS = 50_000; // ~12,500 tokens — generous but bounded

/**
 * Returns an error string on failure, null when valid.
 * @param {unknown} messages
 * @returns {string|null}
 */
export function validateMessages(messages) {
  if (!Array.isArray(messages))     return 'messages must be an array';
  if (messages.length === 0)        return 'messages array is empty';
  if (messages.length > MAX_MESSAGES) return `Too many messages (max ${MAX_MESSAGES})`;

  for (const m of messages) {
    if (!m || typeof m !== 'object')          return 'Invalid message object';
    if (!ALLOWED_ROLES.has(m.role))           return `Invalid role "${m.role}"`;

    // content can be a string (text) or an array (multimodal)
    const textLen = typeof m.content === 'string'
      ? m.content.length
      : JSON.stringify(m.content).length;

    if (textLen > MAX_MSG_CHARS)
      return `Message too large (max ${MAX_MSG_CHARS} characters)`;
  }

  return null; // ✓ valid
}
