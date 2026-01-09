/**
 * AI Service using OpenRouter API via Serverless Functions
 * API keys are kept secure on the server
 */

// Use serverless API endpoint instead of direct API calls
const API_ENDPOINT = '/api/chat';

// Primary model - most cost-effective
const PRIMARY_MODEL = 'tngtech/deepseek-r1t2-chimera:free';

// Fallback models if primary fails
const FALLBACK_MODELS = [
  'nex-agi/deepseek-v3.1-nex-n1:free',
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen-2.5-vl-7b-instruct:free',
  'google/gemma-3-27b-it:free'
];

/**
 * Make a request to OpenRouter via serverless function with fallback support
 */
async function callOpenRouter(prompt) {
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      console.log(`Trying model: ${model}`);
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          maxTokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || response.statusText);
      }

      const data = await response.json();
      const result = data?.choices?.[0]?.message?.content?.trim() || '';
      console.log(`✓ Success with model: ${model}`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`✗ Model ${model} failed: ${error.message}`);
      // Try next model if available
      if (i < modelsToTry.length - 1) {
        continue;
      }
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

/**
 * Chat with AI - supports streaming with fallback
 */
export async function chatWithAI(messages, options = {}) {
  const { stream = false, signal, onChunk } = options;
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      console.log(`Chat using model: ${model}`);
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.7,
          maxTokens: 4000,
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

        console.log(`✓ Chat success with model: ${model}`);
        return fullResponse;
      } else {
        const data = await response.json();
        const result = data?.choices?.[0]?.message?.content?.trim() || '';
        console.log(`✓ Chat success with model: ${model}`);
        return result;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      lastError = error;
      console.warn(`✗ Chat model ${model} failed: ${error.message}`);
      // Try next model if available
      if (i < modelsToTry.length - 1) {
        continue;
      }
    }
  }

  throw new Error(`All chat models failed. Last error: ${lastError?.message}`);
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
