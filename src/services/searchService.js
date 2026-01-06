import axios from 'axios';
import fuzzysort from 'fuzzysort';

/**
 * Enhanced Search Service for location searching with:
 * - Fuzzy matching for similar names
 * - Autocomplete suggestions
 * - Synonym matching
 * - Result ranking
 */

// Cache for search results and autocomplete
const searchCache = new Map();
const autocompleteCache = new Map();
const CACHE_DURATION = 1800000; // 30 minutes in milliseconds

// Location synonyms for common place types
const locationSynonyms = {
  'park': ['parks', 'nature reserve', 'wilderness', 'national park', 'state park'],
  'mountain': ['mountains', 'peak', 'peaks', 'mount', 'mt', 'range'],
  'desert': ['deserts', 'wilderness', 'badlands', 'dunes'],
  'beach': ['beaches', 'coast', 'shore', 'seaside', 'coastline'],
  'lake': ['lakes', 'reservoir', 'pond'],
  'forest': ['forests', 'woods', 'woodland', 'timber'],
  'valley': ['valleys', 'canyon', 'gorge', 'ravine'],
  'observatory': ['observatories', 'telescope', 'planetarium'],
  'dark sky': ['dark skies', 'dark sky park', 'stargazing', 'astronomy'],
  'city': ['cities', 'town', 'urban', 'metro', 'metropolitan'],
  'island': ['islands', 'isle', 'atoll'],
  'plateau': ['plateaus', 'mesa', 'tableland']
};

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Levenshtein distance
 */
const levenshteinDistance = (a, b) => {
  const matrix = [];
  const aLen = a.length;
  const bLen = b.length;

  // Initialize matrix
  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  // Calculate distances
  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bLen][aLen];
};

/**
 * Calculate similarity score (0-1, where 1 is exact match)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score
 */
const calculateSimilarity = (str1, str2) => {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
};

/**
 * Expand search query with synonyms
 * @param {string} query - Search query
 * @returns {string[]} Array of query variations including synonyms
 */
const expandQueryWithSynonyms = (query) => {
  const queries = [query];
  const queryLower = query.toLowerCase();

  // Check each synonym group
  for (const [key, synonyms] of Object.entries(locationSynonyms)) {
    if (queryLower.includes(key)) {
      // Add variations with synonyms
      synonyms.forEach(synonym => {
        queries.push(query.replace(new RegExp(key, 'gi'), synonym));
      });
    }
    // Check if query contains any synonym and add the key
    synonyms.forEach(synonym => {
      if (queryLower.includes(synonym)) {
        queries.push(query.replace(new RegExp(synonym, 'gi'), key));
      }
    });
  }

  return [...new Set(queries)]; // Remove duplicates
};

/**
 * Get autocomplete suggestions for a query
 * @param {string} query - Partial search query
 * @param {number} limit - Maximum number of suggestions (default: 5)
 * @returns {Promise<Array>} Array of autocomplete suggestions
 */
export const getAutocompleteSuggestions = async (query, limit = 5) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const cacheKey = `${query.toLowerCase()}-${limit}`;
  
  // Check cache
  const cached = autocompleteCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Use Nominatim's autocomplete feature
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1`
    );

    if (response.data && response.data.length > 0) {
      const suggestions = response.data.map(item => ({
        name: item.display_name,
        type: item.type || 'location',
        category: item.class || 'place',
        importance: item.importance || 0,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      }));

      // Cache the suggestions
      autocompleteCache.set(cacheKey, {
        data: suggestions,
        timestamp: Date.now()
      });

      return suggestions;
    }

    return [];
  } catch (error) {
    console.error('Autocomplete error:', error);
    return [];
  }
};

// Constants for ranking and normalization
const MAX_DISTANCE_KM = 10000; // Maximum distance for proximity normalization

/**
 * Rank search results based on multiple factors
 * @param {Array} results - Raw search results
 * @param {string} originalQuery - Original search query
 * @param {Object} options - Ranking options
 * @returns {Array} Ranked results with metadata
 */
const rankResults = (results, originalQuery, options = {}) => {
  const { userLat = null, userLon = null } = options;

  return results.map(result => {
    let score = 0;
    const reasons = [];

    // 1. Similarity score (40% weight)
    const similarity = calculateSimilarity(originalQuery, result.display_name);
    score += similarity * 0.4;
    reasons.push({
      factor: 'name_similarity',
      value: (similarity * 100).toFixed(1) + '%',
      contribution: (similarity * 0.4).toFixed(2)
    });

    // 2. Importance from Nominatim (30% weight)
    const importance = result.importance || 0;
    score += importance * 0.3;
    reasons.push({
      factor: 'importance',
      value: importance.toFixed(3),
      contribution: (importance * 0.3).toFixed(2)
    });

    // 3. Geographic proximity (20% weight) - if user location available
    if (userLat !== null && userLon !== null) {
      const distance = calculateDistance(
        userLat, userLon,
        parseFloat(result.lat), parseFloat(result.lon)
      );
      // Normalize distance (closer = better, using MAX_DISTANCE_KM for normalization)
      const proximityScore = Math.max(0, 1 - distance / MAX_DISTANCE_KM);
      score += proximityScore * 0.2;
      reasons.push({
        factor: 'proximity',
        value: distance.toFixed(1) + ' km',
        contribution: (proximityScore * 0.2).toFixed(2)
      });
    }

    // 4. Prefix match bonus (10% weight)
    const queryLower = originalQuery.toLowerCase();
    const nameLower = result.display_name.toLowerCase();
    if (nameLower.startsWith(queryLower)) {
      score += 0.1;
      reasons.push({
        factor: 'prefix_match',
        value: 'yes',
        contribution: '0.10'
      });
    }

    return {
      ...result,
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      rankingScore: score,
      rankingReasons: reasons
    };
  }).sort((a, b) => b.rankingScore - a.rankingScore);
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * centralAngle;
};

/**
 * Enhanced search with fuzzy matching, synonyms, and ranking
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Enhanced search results
 */
export const searchLocations = async (query, options = {}) => {
  const {
    limit = 10,
    userLat = null,
    userLon = null,
    includeMetadata = true
  } = options;

  if (!query || !query.trim()) {
    return {
      success: false,
      error: 'Query cannot be empty',
      results: []
    };
  }

  const cacheKey = `${query.toLowerCase()}-${limit}-${userLat}-${userLon}`;
  
  // Check cache
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Expand query with synonyms
    const queryVariations = expandQueryWithSynonyms(query);
    
    // Fetch results for all query variations
    const allResults = [];
    const seenIds = new Set();

    for (const queryVariation of queryVariations) {
      try {
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryVariation)}&limit=${limit}&addressdetails=1`
        );

        if (response.data && response.data.length > 0) {
          response.data.forEach(item => {
            // Use place_id to avoid duplicates
            if (!seenIds.has(item.place_id)) {
              seenIds.add(item.place_id);
              allResults.push(item);
            }
          });
        }
      } catch (err) {
        console.error(`Error fetching results for "${queryVariation}":`, err);
      }
    }

    // If no results, return error
    if (allResults.length === 0) {
      const result = {
        success: false,
        error: 'No locations found matching your query',
        results: [],
        metadata: {
          query: query,
          queryVariations: queryVariations,
          totalResults: 0
        }
      };
      
      // Cache the result
      searchCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    }

    // Rank results
    const rankedResults = rankResults(allResults, query, { userLat, userLon });

    // Apply fuzzy matching for similar names
    const queryLower = query.toLowerCase();
    const fuzzyResults = rankedResults.map(result => {
      const nameLower = result.display_name.toLowerCase();
      let fuzzyScore = -10000;
      let fuzzyHighlight = null;
      
      try {
        const fuzzyMatch = fuzzysort.single(queryLower, nameLower);
        if (fuzzyMatch) {
          fuzzyScore = fuzzyMatch.score;
          fuzzyHighlight = fuzzysort.highlight(fuzzyMatch, '<b>', '</b>');
        }
      } catch (error) {
        console.warn('Fuzzy matching error for:', result.display_name, error);
      }
      
      return {
        ...result,
        fuzzyScore,
        fuzzyHighlight
      };
    });

    // Re-sort considering fuzzy scores
    fuzzyResults.sort((a, b) => {
      // Primary: ranking score
      // Secondary: fuzzy score (higher is better)
      const scoreDiff = b.rankingScore - a.rankingScore;
      if (Math.abs(scoreDiff) > 0.05) return scoreDiff;
      return b.fuzzyScore - a.fuzzyScore;
    });

    // Limit results
    const finalResults = fuzzyResults.slice(0, limit);

    const response = {
      success: true,
      results: finalResults.map((result, index) => ({
        id: result.place_id,
        name: result.display_name,
        lat: result.lat,
        lon: result.lon,
        type: result.type || 'unknown',
        category: result.class || 'place',
        importance: result.importance || 0,
        rank: index + 1,
        ...(includeMetadata && {
          metadata: {
            similarityScore: (calculateSimilarity(query, result.display_name) * 100).toFixed(1) + '%',
            rankingScore: result.rankingScore.toFixed(3),
            fuzzyScore: result.fuzzyScore,
            fuzzyHighlight: result.fuzzyHighlight,
            rankingReasons: result.rankingReasons,
            address: result.address || {}
          }
        })
      })),
      metadata: {
        query: query,
        queryVariations: queryVariations,
        totalResults: allResults.length,
        returnedResults: finalResults.length,
        hasSynonymExpansion: queryVariations.length > 1
      }
    };

    // Cache the response
    searchCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    return response;
  } catch (error) {
    console.error('Search error:', error);
    return {
      success: false,
      error: 'An error occurred while searching. Please try again.',
      results: [],
      metadata: {
        query: query,
        totalResults: 0
      }
    };
  }
};

/**
 * Parse coordinates from input
 * @param {string} input - Input string
 * @returns {Object|null} Coordinates or null
 */
export const parseCoordinates = (input) => {
  const coordPattern = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
  const coordMatch = input.match(coordPattern);

  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }
  
  return null;
};

/**
 * Clear search cache
 */
export const clearSearchCache = () => {
  searchCache.clear();
  autocompleteCache.clear();
};
