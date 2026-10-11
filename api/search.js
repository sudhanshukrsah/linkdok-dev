/**
 * Tavily web-search proxy. The API key remains server-side and search results
 * are reduced to the fields the chat assistant needs for grounded answers.
 */
import { rateLimit, getIP, setCorsHeaders, isOriginAllowed } from './_rateLimit.js';

const MAX_QUERY_LENGTH = 500;
const MAX_RESULTS = 5;

export default async function handler(req, res) {
  const origin = req.headers.origin;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!isOriginAllowed(origin)) return res.status(403).json({ error: 'Forbidden' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const limit = rateLimit(getIP(req), { limit: 12, windowMs: 60_000 });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: 'Too many web searches', retryAfter: limit.retryAfter });
  }

  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
  if (!query) return res.status(400).json({ error: 'Search query is required' });
  if (query.length > MAX_QUERY_LENGTH) return res.status(400).json({ error: 'Search query is too long' });

  // Support the existing local name and the conventional production name.
  const apiKey = process.env.TAVILY_API_KEY || process.env.VITE_TVLY_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Web search is not configured' });

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: MAX_RESULTS,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => 'Search provider error');
      console.error('Tavily search failed:', response.status, detail.slice(0, 500));
      return res.status(502).json({ error: 'Web search is temporarily unavailable' });
    }

    const data = await response.json();
    const results = (data.results || []).slice(0, MAX_RESULTS).map((result) => ({
      title: String(result.title || 'Untitled source').slice(0, 300),
      url: String(result.url || ''),
      content: String(result.content || '').slice(0, 1800),
      publishedDate: result.published_date || null,
    })).filter((result) => result.url && result.content);

    return res.status(200).json({ query, results });
  } catch (error) {
    console.error('Tavily search error:', error);
    return res.status(502).json({ error: 'Web search is temporarily unavailable' });
  }
}
