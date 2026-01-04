/**
 * AI-Powered Search Fallback System
 * Provides Google-like "intent understanding" when no articles match
 */

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * Minimum relevance score to consider results valid
 * Below this, trigger AI fallback
 */
const MIN_RELEVANCE_THRESHOLD = 45; // 45% relevance

/**
 * Call OpenRouter API
 */
async function callOpenRouter(prompt, maxTokens = 500) {
  if (!API_KEY) {
    throw new Error('API key not configured');
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
        'HTTP-Referer': APP_URL,
        'X-Title': 'Link Collector - Search Fallback'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || response.statusText);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error('AI Fallback Error:', error);
    throw error;
  }
}

/**
 * Parse AI response into structured data
 */
function parseAIResponse(text) {
  const lines = text.split('\n').filter(line => line.trim());
  
  let explanation = '';
  const suggestions = [];
  
  let inSuggestions = false;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Check if we're in suggestions section
    if (trimmed.toLowerCase().includes('related search') || 
        trimmed.toLowerCase().includes('suggested search') ||
        trimmed.toLowerCase().includes('you might also search')) {
      inSuggestions = true;
      return;
    }
    
    if (inSuggestions) {
      // Extract suggestions (handle numbered lists, bullets, etc.)
      const cleaned = trimmed
        .replace(/^[\d\.\-\*\•]+\s*/, '') // Remove bullets/numbers
        .replace(/^["']|["']$/g, '') // Remove quotes
        .trim();
      
      if (cleaned && cleaned.length > 2 && cleaned.length < 60) {
        suggestions.push(cleaned);
      }
    } else {
      // Build explanation
      if (trimmed) {
        explanation += trimmed + ' ';
      }
    }
  });
  
  return {
    explanation: explanation.trim(),
    suggestions: suggestions.slice(0, 5) // Max 5 suggestions
  };
}

/**
 * Generate AI-powered search fallback
 * Returns explanation and suggested queries when no results found
 */
export async function generateSearchFallback(query) {
  const prompt = `User searched for: "${query}"

You are a helpful search assistant. The user couldn't find any news articles about this topic in our database.

Please provide:
1. A brief 2-3 sentence explanation of what this topic/person/event is about in simple language
2. 3-5 related search queries the user might want to try instead

Format:
First, write the explanation.
Then on a new line write "Related searches you might try:"
Then list the suggestions.

Be concise and helpful. Focus on popular, relevant alternative searches.`;

  try {
    const response = await callOpenRouter(prompt, 400);
    const parsed = parseAIResponse(response);
    
    return {
      type: 'ai_fallback',
      query: query,
      explanation: parsed.explanation || `We couldn't find any articles about "${query}". Try searching with different keywords or explore our categories.`,
      suggestions: parsed.suggestions.length > 0 ? parsed.suggestions : [
        `${query} news`,
        `${query} latest updates`,
        `${query} india`
      ],
      googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(query + ' news')}`
    };
  } catch (error) {
    console.error('Failed to generate AI fallback:', error);
    
    // Return basic fallback if AI fails
    return {
      type: 'ai_fallback',
      query: query,
      explanation: `We couldn't find any articles matching "${query}". Try using different keywords or check back later.`,
      suggestions: [
        `${query} news`,
        `${query} latest`,
        `${query} india`,
        `${query} updates`
      ],
      googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(query + ' news')}`
    };
  }
}

/**
 * Check if search results are weak and need fallback
 */
export function shouldUseFallback(searchResults) {
  // No results at all
  if (!searchResults || searchResults.length === 0) {
    return true;
  }
  
  // All results have low relevance
  const highRelevanceResults = searchResults.filter(
    result => result.searchRelevance >= MIN_RELEVANCE_THRESHOLD
  );
  
  return highRelevanceResults.length === 0;
}

/**
 * Create a basic fallback without AI (instant)
 */
export function createBasicFallback(query) {
  return {
    type: 'basic_fallback',
    query: query,
    explanation: `No articles found for "${query}". Try different keywords or search on Google.`,
    suggestions: [
      `${query} news`,
      `${query} latest updates`,
      `${query} india`,
      `latest ${query}`
    ],
    googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(query + ' news')}`
  };
}
