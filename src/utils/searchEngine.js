/**
 * Advanced Search Engine using Fuse.js
 * Provides Google-like search with typo tolerance and fuzzy matching
 * SEARCHES ALL ARCHIVED ARTICLES - NO DATE RESTRICTIONS
 */

import Fuse from 'fuse.js';
import { enrichArticleWithMetadata } from './topicExtractor.js';

/**
 * Stop words to remove from search queries (English + Hindi)
 */
const STOP_WORDS = new Set([
  'the', 'is', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'into', 'like', 'through', 'after',
  'over', 'between', 'out', 'against', 'during', 'without', 'before',
  'under', 'around', 'among', 'ka', 'ke', 'ko', 'ki', 'se', 'me', 'hai',
  'hain', 'tha', 'the', 'ho', 'par', 'pe'
]);

/**
 * Normalize and clean text for better searching
 */
function normalizeText(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Remove stop words from query
 */
function removeStopWords(text) {
  return text
    .split(' ')
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .join(' ');
}

/**
 * Prepare search data from categories
 * Creates a flat array of searchable items with topic/entity enrichment
 * NO DATE FILTERING - ALL ARTICLES ARE SEARCHABLE
 */
export function prepareSearchData(categories) {
  const searchableItems = [];
  
  categories.forEach(category => {
    category.links.forEach(link => {
      // Enrich article with topic and entities
      const enrichedArticle = enrichArticleWithMetadata(link);
      
      // Create combined searchable text
      const titleText = normalizeText(enrichedArticle.title || '');
      const summaryText = normalizeText(enrichedArticle.description || enrichedArticle.summary || '');
      const categoryText = normalizeText(category.name || '');
      const sourceText = normalizeText(enrichedArticle.source || '');
      const topicText = normalizeText(enrichedArticle.topic || '');
      const entityText = normalizeText(enrichedArticle.entityText || '');
      
      const searchText = `${titleText} ${summaryText} ${categoryText} ${sourceText} ${topicText} ${entityText}`;
      
      searchableItems.push({
        // Original data
        id: enrichedArticle.id,
        categoryId: category.id,
        categoryName: category.name,
        title: enrichedArticle.title,
        url: enrichedArticle.url,
        description: enrichedArticle.description,
        summary: enrichedArticle.summary,
        source: enrichedArticle.source,
        pubDate: enrichedArticle.pubDate,
        image: enrichedArticle.image,
        isFavorite: enrichedArticle.isFavorite,
        isPinned: enrichedArticle.isPinned,
        createdAt: enrichedArticle.createdAt,
        
        // Enriched metadata
        topic: enrichedArticle.topic,
        entities: enrichedArticle.entities,
        entityText: enrichedArticle.entityText,
        
        // Searchable fields (normalized)
        titleNormalized: titleText,
        summaryNormalized: summaryText,
        categoryNormalized: categoryText,
        sourceNormalized: sourceText,
        topicNormalized: topicText,
        entitiesNormalized: entityText,
        searchText: searchText
      });
    });
  });
  
  return searchableItems;
}

/**
 * Create Fuse.js instance with optimized configuration
 * Weighted by: topic > entities > title > summary
 */
export function createSearchEngine(searchableItems) {
  const options = {
    // Fuzzy matching threshold (0 = perfect match, 1 = match anything)
    threshold: 0.35,
    
    // Include score in results
    includeScore: true,
    
    // Ignore location of match (search entire text)
    ignoreLocation: true,
    
    // Minimum character length to search
    minMatchCharLength: 2,
    
    // Use extended search for better control
    useExtendedSearch: false,
    
    // Keys to search with weights (TOPIC and ENTITIES are highest priority)
    keys: [
      {
        name: 'topicNormalized',
        weight: 0.35 // Highest - main topic
      },
      {
        name: 'entitiesNormalized',
        weight: 0.30 // Very high - entities (people, places, orgs)
      },
      {
        name: 'titleNormalized',
        weight: 0.25 // High priority
      },
      {
        name: 'summaryNormalized',
        weight: 0.08 // Lower priority
      },
      {
        name: 'categoryNormalized',
        weight: 0.02
      }
    ]
  };
  
  return new Fuse(searchableItems, options);
}

/**
 * Perform search with query preprocessing
 * RELEVANCE > RECENCY - older articles can rank higher if more relevant
 */
export function performSearch(fuseInstance, query, options = {}) {
  if (!query || !query.trim()) {
    return [];
  }
  
  // Normalize and clean query
  const normalizedQuery = normalizeText(query);
  const cleanedQuery = removeStopWords(normalizedQuery);
  
  // If query becomes empty after stop word removal, use original
  const finalQuery = cleanedQuery.trim() || normalizedQuery;
  
  if (!finalQuery) {
    return [];
  }
  
  // Perform search
  const results = fuseInstance.search(finalQuery);
  
  // Sort by RELEVANCE FIRST, then by date for very similar scores
  // This ensures old but highly relevant articles appear before recent but less relevant ones
  const sortedResults = results.sort((a, b) => {
    // Lower score = better match in Fuse.js
    const scoreDiff = a.score - b.score;
    
    // Only use date as tiebreaker if scores are VERY similar (within 0.03)
    if (Math.abs(scoreDiff) < 0.03) {
      const dateA = new Date(a.item.pubDate || a.item.createdAt || 0);
      const dateB = new Date(b.item.pubDate || b.item.createdAt || 0);
      return dateB - dateA; // Most recent first (for ties only)
    }
    
    return scoreDiff; // Sort by relevance
  });
  
  // Apply limit if specified
  const limit = options.limit || sortedResults.length;
  
  return sortedResults.slice(0, limit).map(result => ({
    ...result.item,
    searchScore: result.score,
    searchRelevance: Math.round((1 - result.score) * 100) // Convert to percentage
  }));
}

/**
 * Highlight matched keywords in text (simple implementation)
 */
export function highlightMatches(text, query) {
  if (!text || !query) return text;
  
  const normalizedQuery = normalizeText(query);
  const keywords = removeStopWords(normalizedQuery).split(' ').filter(k => k.length > 2);
  
  if (keywords.length === 0) return text;
  
  let highlightedText = text;
  
  keywords.forEach(keyword => {
    const regex = new RegExp(`(${keyword})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
  });
  
  return highlightedText;
}

/**
 * Debounce function for search input
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
