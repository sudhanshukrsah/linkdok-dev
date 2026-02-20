/**
 * Vercel Serverless Function - Diffbot Content Extraction API
 * Keeps Diffbot token secure on the server
 */
import { rateLimit, getIP, setCorsHeaders, isOriginAllowed } from './_rateLimit.js';

export default async function handler(req, res) {
  const origin = req.headers['origin'];
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (origin && !isOriginAllowed(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 20 requests / 60 s per IP
  const ip = getIP(req);
  const rl = rateLimit(ip, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ error: 'Too many requests', retryAfter: rl.retryAfter, rateLimited: true });
  }

  const DIFFBOT_TOKEN = process.env.VITE_DIFFBOT_TOKEN;

  if (!DIFFBOT_TOKEN) {
    // Return 200 + failure so the client-side fallback chain (Jina → AllOrigins) kicks in
    return res.status(200).json({
      success: false,
      error: 'Diffbot token not configured — set VITE_DIFFBOT_TOKEN in Vercel dashboard environment variables'
    });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        success: false 
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ 
        error: 'Invalid URL format',
        success: false 
      });
    }

    const diffbotUrl = `https://api.diffbot.com/v3/article?token=${DIFFBOT_TOKEN}&url=${encodeURIComponent(url)}`;
    
    const response = await fetch(diffbotUrl, {
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      throw new Error(`Diffbot API returned HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.objects || data.objects.length === 0) {
      return res.status(200).json({
        url,
        success: false,
        error: 'No article found'
      });
    }
    
    const article = data.objects[0];
    
    // Combine title and text
    let content = '';
    if (article.title) content += `${article.title}\n\n`;
    if (article.text) content += article.text;
    
    // Basic cleaning
    const cleanText = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    if (cleanText.length < 100) {
      return res.status(200).json({
        url,
        success: false,
        error: 'Content too short'
      });
    }
    
    res.status(200).json({
      url,
      extractedText: cleanText,
      extractedAt: Date.now(),
      success: true,
      method: 'diffbot'
    });
  } catch (error) {
    console.error('Diffbot Extraction Error:', error);
    res.status(200).json({
      url: req.body?.url,
      success: false,
      error: 'Failed to extract content'
    });
  }
}
