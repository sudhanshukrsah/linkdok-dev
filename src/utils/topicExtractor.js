/**
 * Topic and Entity Extraction Utility
 * Extracts main topics and entities from news articles
 */

/**
 * Common entity patterns (people, organizations, places, events)
 */
const ENTITY_PATTERNS = {
  // Cricket entities
  cricket: [
    'virat kohli', 'rohit sharma', 'ms dhoni', 'sachin tendulkar', 'hardik pandya',
    'bumrah', 'ipl', 'bcci', 'india cricket', 'test cricket', 'odi', 't20',
    'world cup', 'mumbai indians', 'csk', 'rcb', 'kkr'
  ],
  
  // Politics entities
  politics: [
    'modi', 'narendra modi', 'rahul gandhi', 'amit shah', 'bjp', 'congress',
    'parliament', 'lok sabha', 'rajya sabha', 'supreme court', 'election',
    'mamata banerjee', 'kejriwal', 'yogi adityanath'
  ],
  
  // Business entities
  business: [
    'reliance', 'tata', 'adani', 'infosys', 'wipro', 'amazon', 'flipkart',
    'google', 'microsoft', 'apple', 'tesla', 'stock market', 'nifty', 'sensex',
    'rbi', 'sebi', 'rupee', 'inflation'
  ],
  
  // Tech entities
  tech: [
    'ai', 'artificial intelligence', 'chatgpt', 'openai', 'google', 'meta',
    'facebook', 'twitter', 'instagram', 'whatsapp', 'youtube', 'android',
    'iphone', 'samsung', 'cryptocurrency', 'bitcoin', 'blockchain'
  ],
  
  // Entertainment entities
  entertainment: [
    'bollywood', 'shah rukh khan', 'salman khan', 'aamir khan', 'amitabh bachchan',
    'deepika padukone', 'priyanka chopra', 'netflix', 'amazon prime', 'hotstar',
    'oscar', 'cannes'
  ],
  
  // Places
  places: [
    'india', 'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata', 'hyderabad',
    'pune', 'ahmedabad', 'us', 'usa', 'china', 'russia', 'pakistan', 'uk',
    'ukraine', 'israel', 'gaza'
  ]
};

/**
 * Topic keywords for classification
 */
const TOPIC_KEYWORDS = {
  cricket: ['cricket', 'ipl', 'test', 'odi', 't20', 'wicket', 'runs', 'century', 'bowler', 'batsman', 'match'],
  politics: ['election', 'minister', 'parliament', 'government', 'party', 'vote', 'policy', 'law', 'court'],
  business: ['stock', 'market', 'economy', 'company', 'profit', 'revenue', 'investment', 'trade', 'price'],
  technology: ['tech', 'ai', 'software', 'app', 'digital', 'internet', 'cyber', 'data', 'computer'],
  entertainment: ['film', 'movie', 'actor', 'bollywood', 'series', 'music', 'concert', 'award'],
  sports: ['sport', 'football', 'tennis', 'olympics', 'player', 'team', 'coach', 'trophy', 'championship'],
  science: ['science', 'research', 'study', 'space', 'health', 'medical', 'climate', 'environment'],
  general: []
};

/**
 * Normalize text for matching
 */
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().trim();
}

/**
 * Extract entities from text
 */
function extractEntities(text) {
  const normalizedText = normalizeText(text);
  const foundEntities = new Set();
  
  // Check all entity patterns
  Object.values(ENTITY_PATTERNS).forEach(categoryEntities => {
    categoryEntities.forEach(entity => {
      if (normalizedText.includes(entity)) {
        foundEntities.add(entity);
      }
    });
  });
  
  // Also extract capitalized words (likely names/places)
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^\w]/g, '');
    
    // Check for capitalized words (2+ chars)
    if (word.length > 2 && /^[A-Z]/.test(word)) {
      // Check if it's part of a multi-word entity
      if (i < words.length - 1) {
        const nextWord = words[i + 1].replace(/[^\w]/g, '');
        if (/^[A-Z]/.test(nextWord)) {
          const twoWord = `${word} ${nextWord}`.toLowerCase();
          foundEntities.add(twoWord);
          i++; // Skip next word
          continue;
        }
      }
      foundEntities.add(word.toLowerCase());
    }
  }
  
  return Array.from(foundEntities);
}

/**
 * Determine the main topic from text
 */
function extractTopic(text) {
  const normalizedText = normalizeText(text);
  const topicScores = {};
  
  // Score each topic based on keyword matches
  Object.entries(TOPIC_KEYWORDS).forEach(([topic, keywords]) => {
    topicScores[topic] = 0;
    keywords.forEach(keyword => {
      if (normalizedText.includes(keyword)) {
        topicScores[topic]++;
      }
    });
  });
  
  // Find topic with highest score
  let maxScore = 0;
  let mainTopic = 'general';
  
  Object.entries(topicScores).forEach(([topic, score]) => {
    if (score > maxScore) {
      maxScore = score;
      mainTopic = topic;
    }
  });
  
  return mainTopic;
}

/**
 * Extract topic and entities from a news article
 */
export function enrichArticleWithMetadata(article) {
  const titleText = article.title || '';
  const summaryText = article.description || article.summary || '';
  const combinedText = `${titleText} ${summaryText}`;
  
  // Extract main topic
  const topic = extractTopic(combinedText);
  
  // Extract entities (people, places, organizations)
  const entities = extractEntities(combinedText);
  
  // Create searchable entity text
  const entityText = entities.join(' ');
  
  return {
    ...article,
    topic,
    entities,
    entityText,
    topicNormalized: normalizeText(topic),
    entitiesNormalized: normalizeText(entityText)
  };
}

/**
 * Batch enrich multiple articles
 */
export function enrichArticles(articles) {
  return articles.map(enrichArticleWithMetadata);
}
