/**
 * Content Extraction Service
 * Multi-layer approach for maximum reliability
 */

const DIFFBOT_TOKEN = import.meta.env.VITE_DIFFBOT_TOKEN;

/**
 * Extract text content from a webpage URL
 * Tries multiple methods in sequence for reliability
 */
export async function extractContentFromURL(url) {
  console.log(`[Content Extractor] Extracting content from ${url}`);
  
  // Method 1: Try Diffbot (most reliable, paid service) - only if token is configured
  if (DIFFBOT_TOKEN) {
    const diffbotResult = await tryDiffbotExtraction(url);
    if (diffbotResult.success) return diffbotResult;
  } else {
    console.log('[Content Extractor] Diffbot token not configured, skipping...');
  }
  
  // Method 2: Try Jina AI Reader
  const jinaResult = await tryJinaExtraction(url);
  if (jinaResult.success) return jinaResult;
  
  // Method 3: Try AllOrigins proxy
  const proxyResult = await tryProxyExtraction(url);
  if (proxyResult.success) return proxyResult;
  
  // Method 4: Try direct fetch (might work for some sites)
  const directResult = await tryDirectExtraction(url);
  if (directResult.success) return directResult;
  
  // All methods failed
  console.error(`All extraction methods failed for ${url}`);
  return {
    url,
    extractedText: '',
    extractedAt: Date.now(),
    success: false,
    error: 'Unable to extract content from this URL'
  };
}

/**
 * Method 1: Diffbot Article API (professional extraction)
 */
async function tryDiffbotExtraction(url) {
  try {
    console.log(`[Content Extractor] Method 1: Trying Diffbot API...`);
    
    const diffbotUrl = `https://api.diffbot.com/v3/article?token=${DIFFBOT_TOKEN}&url=${encodeURIComponent(url)}`;
    
    const response = await fetch(diffbotUrl, {
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.objects || data.objects.length === 0) {
      throw new Error('No article found');
    }
    
    const article = data.objects[0];
    
    // Combine title and text
    let content = '';
    if (article.title) content += `${article.title}\n\n`;
    if (article.text) content += article.text;
    
    const cleanText = cleanExtractedText(content);
    
    if (cleanText.length < 100) {
      throw new Error('Content too short');
    }
    
    console.log(`[Content Extractor] ✓ Diffbot successful (${cleanText.length} chars)`);
    
    return {
      url,
      extractedText: cleanText,
      extractedAt: Date.now(),
      success: true,
      method: 'diffbot'
    };
  } catch (error) {
    console.warn(`Diffbot failed: ${error.message}`);
    return { success: false };
  }
}

/**
 * Method 2: Jina AI Reader (works for most sites)
 */
/**
 * Method 2: Jina AI Reader (works for most sites)
 */
async function tryJinaExtraction(url) {
  try {
    console.log(`[Content Extractor] Method 2: Trying Jina AI Reader...`);
    
    const jinaUrl = `https://r.jina.ai/${url}`;
    
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text'
      },
      signal: AbortSignal.timeout(12000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const text = await response.text();
    const cleanText = cleanExtractedText(text);
    
    if (cleanText.length < 100) {
      throw new Error('Content too short');
    }
    
    console.log(`[Content Extractor] ✓ Jina AI successful (${cleanText.length} chars)`);
    
    return {
      url,
      extractedText: cleanText,
      extractedAt: Date.now(),
      success: true,
      method: 'jina'
    };
  } catch (error) {
    console.warn(`Jina AI failed: ${error.message}`);
    return { success: false };
  }
}

/**
 * Method 3: AllOrigins CORS Proxy
 */
async function tryProxyExtraction(url) {
  try {
    console.log(`[Content Extractor] Method 3: Trying AllOrigins proxy...`);
    
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(12000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.contents) {
      throw new Error('No content returned');
    }
    
    const text = extractTextFromHTML(data.contents);
    const cleanText = cleanExtractedText(text);
    
    if (cleanText.length < 100) {
      throw new Error('Content too short');
    }
    
    console.log(`[Content Extractor] ✓ Proxy successful (${cleanText.length} chars)`);
    
    return {
      url,
      extractedText: cleanText,
      extractedAt: Date.now(),
      success: true,
      method: 'proxy'
    };
  } catch (error) {
    console.warn(`Proxy extraction failed: ${error.message}`);
    return { success: false };
  }
}

/**
 * Method 4: Direct fetch (works for CORS-enabled sites)
 */
/**
 * Method 4: Direct fetch (works for CORS-enabled sites)
 */
async function tryDirectExtraction(url) {
  try {
    console.log(`[Content Extractor] Method 4: Trying direct fetch...`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const text = extractTextFromHTML(html);
    const cleanText = cleanExtractedText(text);
    
    if (cleanText.length < 100) {
      throw new Error('Content too short');
    }
    
    console.log(`[Content Extractor] ✓ Direct fetch successful (${cleanText.length} chars)`);
    
    return {
      url,
      extractedText: cleanText,
      extractedAt: Date.now(),
      success: true,
      method: 'direct'
    };
  } catch (error) {
    console.warn(`Direct fetch failed: ${error.message}`);
    return { success: false };
  }
}

/**
 * Clean extracted text
 */
function cleanExtractedText(text) {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
    .trim()
    .substring(0, 80000); // Limit to 80k chars
}

/**
 * Extract clean text from HTML (fallback method)
 * Focuses on main article/content areas
 */
function extractTextFromHTML(html) {
  // Create a temporary DOM element
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // First, remove definitely unwanted elements
  const tagsToRemove = [
    'script', 'style', 'iframe', 'noscript', 'svg',
    'button', 'input', 'select', 'textarea', 'form'
  ];
  
  tagsToRemove.forEach(tag => {
    const elements = doc.querySelectorAll(tag);
    elements.forEach(el => el.remove());
  });
  
  // Remove common ad/cookie/popup selectors
  const selectorsToRemove = [
    '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
    '[class*="advertisement"]', '[id*="cookie"]', '[id*="popup"]'
  ];
  
  selectorsToRemove.forEach(selector => {
    try {
      const elements = doc.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    } catch (e) {
      // Ignore selector errors
    }
  });
  
  // Try to find main content area first
  let contentElement = null;
  
  // Look for common content containers in priority order
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.main-content',
    '#main-content',
    '.content',
    '#content',
    '.post-content',
    '.article-content',
    '[class*="tutorial"]',
    '[id*="tutorial"]',
    'body'
  ];
  
  for (const selector of contentSelectors) {
    try {
      const element = doc.querySelector(selector);
      if (element && element.textContent.trim().length > 200) {
        contentElement = element;
        console.log(`[Content Extractor] Found content in: ${selector}`);
        break;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  // Get text content
  let text = contentElement?.textContent || doc.body?.textContent || '';
  
  return text;
}

/**
 * Extract content from multiple URLs in parallel
 * Returns array of extraction results
 */
export async function extractBulkContent(urls) {
  const promises = urls.map(url => extractContentFromURL(url));
  return Promise.all(promises);
}

/**
 * Get total character count of extracted content
 */
export function getTotalContentLength(extractedContents) {
  return extractedContents.reduce((total, content) => {
    return total + (content.extractedText?.length || 0);
  }, 0);
}

/**
 * Truncate content to fit within token limit
 * Keeps most recent/relevant content
 */
export function truncateContentForAI(extractedContents, maxChars = 30000) {
  let totalChars = 0;
  const truncated = [];
  
  // Sort by extraction date (most recent first)
  const sorted = [...extractedContents].sort((a, b) => 
    (b.extractedAt || 0) - (a.extractedAt || 0)
  );
  
  for (const content of sorted) {
    const text = content.extractedText || '';
    const remaining = maxChars - totalChars;
    
    if (remaining <= 0) break;
    
    if (text.length <= remaining) {
      truncated.push(content);
      totalChars += text.length;
    } else {
      // Add partial content
      truncated.push({
        ...content,
        extractedText: text.substring(0, remaining) + '... [truncated]'
      });
      totalChars += remaining;
      break;
    }
  }
  
  return truncated;
}
