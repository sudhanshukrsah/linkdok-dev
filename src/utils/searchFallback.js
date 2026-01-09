/**
 * Simple Search Fallback System
 * Only searches through available categories and links
 * No AI - just basic suggestions
 */

/**
 * Minimum relevance score to consider results valid
 */
const MIN_RELEVANCE_THRESHOLD = 45; // 45% relevance

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
    explanation: `No links found for "${query}". Try different keywords or browse categories.`,
    suggestions: [],
    googleSearchUrl: null
  };
}

