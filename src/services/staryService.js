/**
 * Stary Chatbot Service
 * Provides intelligent stargazing recommendations and location analysis
 * Now enhanced with LLM capabilities for conversational queries
 */

import { searchLocations, parseCoordinates } from './searchService.js';
import { getLightPollution, getStargazingRecommendations } from './lightPollutionService.js';
import { getSkyViewability } from './skyViewabilityService.js';
import { 
  processLLMQuery, 
  formatConversationHistory, 
  isConversationalQuery
} from './llmService.js';

/**
 * Process user query and generate chatbot response
 * Enhanced with LLM support for conversational queries
 * @param {string} query - User's query (location or conversational)
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<Object>} Chatbot response with recommendations
 */
export const processQuery = async (query, conversationHistory = []) => {
  if (!query || !query.trim()) {
    return {
      type: 'error',
      message: "🌟 Hi there! I'm Stary, your stargazing companion. Please tell me a location or ask me anything about stargazing!",
      suggestions: ['Try: "Yellowstone National Park"', 'Or ask: "What\'s the best time to see the Milky Way?"']
    };
  }

  // Determine if query is conversational
  const isConversational = isConversationalQuery(query);
  
  // If conversational, try LLM first
  if (isConversational) {
    try {
      const llmResponse = await processLLMQuery(
        query, 
        formatConversationHistory(conversationHistory)
      );

      if (llmResponse.success) {
        // Check if LLM extracted location information
        if (llmResponse.locationInfo && llmResponse.locationInfo.location) {
          // Process the location extracted by LLM
          const locationQuery = llmResponse.locationInfo.location;
          const locationData = await processLocationQuery(locationQuery);
          
          if (locationData.success) {
            return {
              type: 'llm_with_location',
              message: llmResponse.message,
              location: locationData.location,
              data: locationData.data,
              alternatives: locationData.alternatives
            };
          }
        }

        // Pure conversational response
        return {
          type: 'llm_conversation',
          message: llmResponse.message
        };
      }
    } catch (error) {
      console.warn('LLM processing failed, falling back to structured query:', error);
      // Fall through to structured processing
    }
  }

  // Process as structured location query
  return await processLocationQuery(query);
};

/**
 * Process structured location query
 * @param {string} query - Location query string
 * @returns {Promise<Object>} Location analysis result
 */
const processLocationQuery = async (query) => {
  // Check if input is coordinates
  const coords = parseCoordinates(query);
  
  if (coords) {
    const result = await analyzeLocation(coords.lat, coords.lon, 'Coordinates');
    return { success: true, ...result };
  }

  // Search for location
  try {
    const searchResult = await searchLocations(query, { limit: 5 });
    
    if (!searchResult.success || searchResult.results.length === 0) {
      return {
        success: false,
        type: 'not_found',
        message: `🔍 Hmm, I couldn't find "${query}". Could you try a different spelling or be more specific?`,
        suggestions: ['Try adding country/state', 'Check spelling', 'Use coordinates instead']
      };
    }

    // Get the best match (first result)
    const bestMatch = searchResult.results[0];
    
    // Analyze the location
    const result = await analyzeLocation(bestMatch.lat, bestMatch.lon, bestMatch.name);
    return { success: true, ...result };
  } catch (error) {
    console.error('Stary query error:', error);
    return {
      success: false,
      type: 'error',
      message: '⚠️ Oops! Something went wrong on my end. Please try again in a moment.',
      error: error.message
    };
  }
};

/**
 * Analyze location for stargazing suitability
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} locationName - Location name
 * @returns {Promise<Object>} Analysis results
 */
const analyzeLocation = async (lat, lon, locationName) => {
  try {
    // Fetch light pollution and sky data in parallel
    const [lightData, skyData] = await Promise.all([
      getLightPollution(lat, lon),
      getSkyViewability(lat, lon).catch(() => null) // Sky data is optional
    ]);

    // Get recommendations
    const recommendations = getStargazingRecommendations(lightData.bortleClass);
    
    // Determine overall suitability
    const suitability = determineSuitability(lightData, skyData);
    
    // Generate friendly message
    const message = generateMessage(locationName, lightData, skyData, suitability);
    
    // Generate alternatives if location is not ideal
    const alternatives = suitability.score < 6 ? generateAlternatives(lat) : null;

    return {
      type: 'analysis',
      message,
      location: {
        name: locationName,
        lat,
        lon
      },
      data: {
        lightPollution: {
          bortleClass: lightData.bortleClass,
          name: lightData.name,
          description: lightData.description,
          sqm: lightData.sqm,
          quality: lightData.stargazingQuality
        },
        sky: skyData ? {
          cloudCover: skyData.cloudCover,
          seeing: skyData.seeing,
          transparency: skyData.transparency,
          quality: skyData.overallQuality
        } : null,
        recommendations: recommendations,
        suitability: suitability
      },
      alternatives: alternatives
    };
  } catch (error) {
    console.error('Location analysis error:', error);
    return {
      type: 'error',
      message: `⚠️ I found ${locationName}, but couldn't analyze the stargazing conditions. Please try again.`,
      error: error.message
    };
  }
};

/**
 * Determine overall stargazing suitability
 * @param {Object} lightData - Light pollution data
 * @param {Object} skyData - Sky viewability data
 * @returns {Object} Suitability score and recommendation
 */
const determineSuitability = (lightData, skyData) => {
  let score = 0;
  const factors = [];

  // Light pollution score (0-10, where 10 is best)
  // Bortle scale ranges from 1-9. Multiplier converts to 0-10 scale: (10-1)*1.11=9.99 ≈ 10
  const BORTLE_TO_SCORE_MULTIPLIER = 10 / 9; // 1.11
  const lightScore = (10 - lightData.bortleClass) * BORTLE_TO_SCORE_MULTIPLIER;
  score += lightScore * 0.6; // 60% weight
  factors.push({
    name: 'Light Pollution',
    score: lightScore.toFixed(1),
    impact: 'high'
  });

  // Sky conditions score (if available)
  if (skyData) {
    const cloudScore = (100 - skyData.cloudCover) / 10; // 0-100 to 0-10
    score += cloudScore * 0.3; // 30% weight
    factors.push({
      name: 'Cloud Cover',
      score: cloudScore.toFixed(1),
      impact: 'medium'
    });

    const seeingScore = skyData.seeing * 2; // Assuming 0-5 scale
    score += seeingScore * 0.1; // 10% weight
    factors.push({
      name: 'Atmospheric Clarity',
      score: seeingScore.toFixed(1),
      impact: 'low'
    });
  }

  // Determine recommendation
  let recommendation, emoji;
  if (score >= 8) {
    recommendation = 'Excellent';
    emoji = '🌟✨';
  } else if (score >= 6) {
    recommendation = 'Good';
    emoji = '⭐';
  } else if (score >= 4) {
    recommendation = 'Fair';
    emoji = '🌙';
  } else {
    recommendation = 'Poor';
    emoji = '☁️';
  }

  return {
    score: score.toFixed(1),
    recommendation,
    emoji,
    factors
  };
};

/**
 * Generate friendly chatbot message
 * @param {string} locationName - Location name
 * @param {Object} lightData - Light pollution data
 * @param {Object} skyData - Sky viewability data
 * @param {Object} suitability - Suitability analysis
 * @returns {string} Friendly message
 */
const generateMessage = (locationName, lightData, skyData, suitability) => {
  const { recommendation, emoji } = suitability;
  const bortleClass = lightData.bortleClass;

  let message = `${emoji} **${locationName}**\n\n`;

  // Overall assessment
  if (recommendation === 'Excellent') {
    message += `🎉 Wow! This looks like an **amazing** spot for stargazing! `;
  } else if (recommendation === 'Good') {
    message += `⭐ This is a **good** location for stargazing! `;
  } else if (recommendation === 'Fair') {
    message += `🌙 This location has **fair** stargazing conditions. `;
  } else {
    message += `☁️ This location has **challenging** conditions for stargazing. `;
  }

  // Light pollution details
  message += `The sky here is classified as **${lightData.name}** (Bortle ${bortleClass}). `;
  
  if (bortleClass <= 3) {
    message += `You'll see the Milky Way in stunning detail! 🌌\n\n`;
  } else if (bortleClass <= 5) {
    message += `You'll be able to see many stars and some deep-sky objects. 🔭\n\n`;
  } else if (bortleClass <= 7) {
    message += `Light pollution will limit what you can see, but planets and bright stars are still visible. 🪐\n\n`;
  } else {
    message += `Significant light pollution will make stargazing difficult. 🌃\n\n`;
  }

  // Sky conditions
  if (skyData) {
    message += `**Current Sky Conditions:**\n`;
    message += `☁️ Cloud Cover: ${skyData.cloudCover}%\n`;
    if (skyData.cloudCover < 20) {
      message += `Clear skies ahead! 🌟\n`;
    } else if (skyData.cloudCover < 50) {
      message += `Partly cloudy, but still decent viewing! 🌤️\n`;
    } else {
      message += `Cloudy conditions may obstruct viewing. 🌥️\n`;
    }
  }

  return message;
};

/**
 * Generate alternative location suggestions
 * @param {number} lat - Current latitude
 * @returns {Array} Alternative suggestions
 */
const generateAlternatives = (lat) => {
  // In a real implementation, this would search for nearby dark sky locations
  // For now, provide generic suggestions based on region
  
  const suggestions = [];
  
  // Determine hemisphere and region
  if (Math.abs(lat) > 60) {
    suggestions.push({
      name: 'Remote northern/southern areas',
      reason: 'Polar regions often have less light pollution'
    });
  } else if (Math.abs(lat) > 30) {
    suggestions.push({
      name: 'National parks nearby',
      reason: 'Protected areas typically have darker skies'
    });
  } else {
    suggestions.push({
      name: 'Desert regions',
      reason: 'Clear, dry air and low population density'
    });
  }

  suggestions.push({
    name: 'Dark Sky Reserves',
    reason: 'Certified locations with minimal light pollution'
  });

  return suggestions;
};

/**
 * Get greeting message
 * @returns {Object} Greeting response
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  let greeting;

  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour < 18) {
    greeting = 'Good afternoon';
  } else {
    greeting = 'Good evening';
  }

  return {
    type: 'greeting',
    message: `🌟 ${greeting}! I'm **Stary**, your AI-powered stargazing companion!\n\nI can help you in two ways:\n\n🗺️ **Location Analysis**: Tell me a place or coordinates for detailed stargazing analysis\n💬 **Conversation**: Ask me anything about astronomy, celestial events, or stargazing tips!\n\nWhat would you like to know?`,
    examples: [
      'Yellowstone National Park',
      'What\'s the best time to see the Milky Way?',
      'How\'s the weather for stargazing tonight?'
    ]
  };
};
