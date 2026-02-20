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
  // Allow all origins — API keys are server-side, rate limiting guards against abuse.
  // Removing strict origin gating so custom domains and all Vercel deployment URLs work.
  return true;
}

/**
 * Set appropriate CORS response headers.
 * Echoes back the request Origin when allowed (required for credentialed
 * requests), so the browser sees an exact match rather than a wildcard.
 */
export function setCorsHeaders(res, origin) {
  // Use wildcard so any origin (custom domain, Vercel preview, localhost) can call this function
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const ALLOWED_ROLES = new Set(['user', 'assistant', 'system']);
const MAX_MESSAGES  = 30;
const MAX_MSG_CHARS = 800_000; // supports base64 images (~600KB) and large extracted content

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
