/**
 * Vercel Serverless Function - Diffbot Content Extraction API
 * Keeps Diffbot token secure on the server
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const DIFFBOT_TOKEN = process.env.DIFFBOT_TOKEN;

  if (!DIFFBOT_TOKEN) {
    return res.status(400).json({ 
      error: 'Diffbot token not configured',
      success: false 
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
      url: req.body.url,
      success: false,
      error: error.message || 'Failed to extract content'
    });
  }
}
