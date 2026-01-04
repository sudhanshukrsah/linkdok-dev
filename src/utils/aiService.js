/**
 * AI Service using OpenRouter API
 * For link summarization and chat functionality
 */

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * Make a request to OpenRouter chat completions endpoint
 */
async function callOpenRouter(prompt) {
  if (!API_KEY) {
    throw new Error('API key not configured. Please set VITE_OPENROUTER_API_KEY in .env file.');
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        'HTTP-Referer': APP_URL,
        'X-Title': 'Link Collector'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || response.statusText);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    throw new Error(`API Error: ${error.message}`);
  }
}

/**
 * Chat with AI - supports streaming
 */
export async function chatWithAI(messages, options = {}) {
  if (!API_KEY) {
    throw new Error('API key not configured. Please set VITE_OPENROUTER_API_KEY in .env file.');
  }

  const { stream = false, signal, onChunk } = options;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        'HTTP-Referer': APP_URL,
        'X-Title': 'Link Collector'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: stream
      }),
      signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || response.statusText);
    }

    if (stream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed?.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                if (onChunk) onChunk(content);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }

      return fullResponse;
    } else {
      const data = await response.json();
      return data?.choices?.[0]?.message?.content?.trim() || '';
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new Error(`API Error: ${error.message}`);
  }
}

/**
 * Strip HTML tags from text
 */
function stripHTML(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a short summary for an article
 * Returns a 2-3 line factual summary
 */
export async function summarizeArticle(title, description) {
  // Strip HTML tags from description
  const cleanDescription = stripHTML(description);
  
  // Fallback if no description
  if (!cleanDescription || cleanDescription.length < 20) {
    return cleanDescription || title;
  }
  
  // Truncate very long descriptions
  const truncatedDesc = cleanDescription.slice(0, 500);
  
  const prompt = `Summarize this news article in 2-3 sentences. Use neutral, factual tone. No emojis. No opinions.

Title: ${title}
Content: ${truncatedDesc}

Write only the summary, nothing else.`;

  try {
    const summary = await callOpenRouter(prompt);
    const cleaned = summary.trim();
    
    // Log for debugging
    console.log('Summary generated for:', title.substring(0, 50));
    console.log('Summary:', cleaned.substring(0, 100));
    
    return cleaned || cleanDescription.substring(0, 200);
  } catch (error) {
    console.error('Failed to summarize article:', title);
    console.error('Error:', error.message);
    // Return the cleaned description instead of "Latest news"
    return cleanDescription.substring(0, 200) + '...';
  }
}
