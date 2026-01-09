/**
 * Vercel Serverless Function - OpenRouter Chat API
 * Keeps API key secure on the server
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.OPENROUTER_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ 
      error: 'API key not configured on server' 
    });
  }

  try {
    const { messages, model, stream = false, temperature = 0.7, maxTokens = 4000 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Invalid request: messages array required' 
      });
    }

    const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
    const APP_URL = process.env.APP_URL || req.headers.origin || '';

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': APP_URL,
        'X-Title': 'LinkDok - AI Learning Platform'
      },
      body: JSON.stringify({
        model: model || 'tngtech/deepseek-r1t2-chimera:free',
        messages,
        temperature,
        max_tokens: maxTokens,
        stream
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || response.statusText);
    }

    // Handle streaming responses
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          res.write(chunk);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } else {
      // Handle non-streaming responses
      const data = await response.json();
      res.status(200).json(data);
    }
  } catch (error) {
    console.error('OpenRouter API Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process request' 
    });
  }
}
