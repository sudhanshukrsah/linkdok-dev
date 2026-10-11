/**
 * Vercel Serverless Function - NVIDIA NIM Chat API
 * Keeps NVIDIA API key secure on the server
 */
import { rateLimit, getIP, setCorsHeaders, isOriginAllowed, validateMessages } from './_rateLimit.js';

// NVIDIA model ID allow-list – must stay in sync with NVIDIA_REGISTRY in aiTutor.js
const ALLOWED_MODELS = new Set([
  'z-ai/glm-5.3',
  'z-ai/glm-5.3-flash',
  'moonshotai/kimi-k3',
  'meta/muse-glimmer-30b',
  'nvidia/nemotron-3-ultra-550b-a55b',
  'google/gemma-4-31b-it',
  'openai/gpt-oss-20b',
]);

export default async function handler(req, res) {
  const origin = req.headers['origin'];
  setCorsHeaders(res, origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Block requests from unknown browser origins
  if (origin && !isOriginAllowed(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 10 requests / 60 s per IP
  const ip = getIP(req);
  const rl = rateLimit(ip, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: rl.retryAfter,
      rateLimited: true
    });
  }

  const NVIDIA_API_KEY = process.env.VITE_NVIDIA_API_KEY;

  if (!NVIDIA_API_KEY) {
    // Return a structured configuration error to the client.
    return res.status(200).json({
      success: false,
      error: 'NVIDIA API key not configured — set VITE_NVIDIA_API_KEY in Vercel dashboard'
    });
  }

  try {
    const {
      messages,
      model,
      temperature = 0.3,
      maxTokens = 8192,
      topP,
      topK,
      reasoningEffort,
      reasoningBudget,
      chatTemplateKwargs,
      stream = false
    } = req.body;

    // Validate messages
    const msgError = validateMessages(messages);
    if (msgError) return res.status(400).json({ error: msgError });

    // Validate model – only allow known NVIDIA models
    const resolvedModel = model || 'z-ai/glm-5.3-flash';
    if (!ALLOWED_MODELS.has(resolvedModel)) {
      return res.status(400).json({ error: 'Unknown model requested' });
    }

    const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

    const payload = {
      model: resolvedModel,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP ?? 1.0,
      stream
    };

    if (topK !== undefined) payload.top_k = topK;
    if (reasoningEffort) payload.reasoning_effort = reasoningEffort;
    if (reasoningBudget !== undefined) payload.reasoning_budget = reasoningBudget;
    if (chatTemplateKwargs) payload.chat_template_kwargs = chatTemplateKwargs;

    const response = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Accept': stream ? 'text/event-stream' : 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`NVIDIA ${response.status}: ${errorText}`);
    }

    if (stream) {
      // Pipe SSE stream directly back to client
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Forward the raw SSE bytes. Decoding and re-encoding each chunk can
          // drop a character when a UTF-8 sequence crosses a chunk boundary.
          res.write(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      const data = await response.json();
      return res.status(200).json({ ...data, success: true });
    }

  } catch (error) {
    console.error('NVIDIA API Error:', error);
    if (!res.headersSent) {
      return res.status(200).json({
        success: false,
        error: 'AI request failed. Please try again.'
      });
    }
    if (!res.writableEnded) res.end();
  }
}
