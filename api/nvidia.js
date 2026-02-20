/**
 * Vercel Serverless Function - NVIDIA NIM Chat API
 * Keeps NVIDIA API key secure on the server
 */
import { rateLimit, getIP, setCorsHeaders, isOriginAllowed, validateMessages } from './_rateLimit.js';

// NVIDIA model ID allow-list – must stay in sync with NVIDIA_REGISTRY in aiTutor.js
const ALLOWED_MODELS = new Set([
  'moonshotai/kimi-k2.5',                      // kimi-k2.5
  'stepfun-ai/step-3.5-flash',                 // step-flash
  'mistralai/devstral-2-123b-instruct-2512',   // devstral
  'deepseek-ai/deepseek-v3.2',                  // deepseek-v3.2
  'mistralai/mistral-large-3-675b-instruct-2512', // mistral-large
  'qwen/qwen3.5-397b-a17b',                    // qwen3.5
  'z-ai/glm5',                                  // glm5
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
    // 200 + failure so client-side fallback chain (OpenRouter) kicks in cleanly
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
      chatTemplateKwargs,
      stream = false
    } = req.body;

    // Validate messages
    const msgError = validateMessages(messages);
    if (msgError) return res.status(400).json({ error: msgError });

    // Validate model – only allow known NVIDIA models
    const resolvedModel = model || 'moonshotai/kimi-k2.5';
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
    if (chatTemplateKwargs) payload.chat_template_kwargs = chatTemplateKwargs;

    const response = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Accept': stream ? 'text/event-stream' : 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(295000) // 295s — just under maxDuration:300 in vercel.json
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
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
