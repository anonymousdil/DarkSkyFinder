/**
 * LLM Service for Stary Chatbot
 * Handles communication with the backend LLM API
 */

import axios from 'axios';

// Backend API base URL (configurable via environment variable)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Check if LLM backend is available
 * @returns {Promise<boolean>} True if backend is healthy
 */
export const checkLLMAvailability = async () => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, {
      timeout: 5000
    });
    return response.data.status === 'ok' && response.data.openaiConfigured;
  } catch (error) {
    console.warn('LLM backend not available:', error.message);
    return false;
  }
};

/**
 * Process query using LLM
 * @param {string} query - User query
 * @param {Array} conversationHistory - Previous conversation messages
 * @returns {Promise<Object>} LLM response
 */
export const processLLMQuery = async (query, conversationHistory = []) => {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/chat`,
      {
        query,
        conversationHistory
      },
      {
        timeout: 30000, // 30 second timeout for LLM responses
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || 'LLM request failed');
    }

    return {
      success: true,
      message: response.data.response,
      locationInfo: response.data.locationInfo,
      usage: response.data.usage
    };
  } catch (error) {
    console.error('LLM service error:', error);

    // Return error information
    if (error.response) {
      // Server responded with error
      return {
        success: false,
        error: error.response.data?.error || 'Server error',
        message: error.response.data?.message || error.message
      };
    } else if (error.request) {
      // Request made but no response
      return {
        success: false,
        error: 'Network error',
        message: 'Unable to reach LLM backend. Make sure the server is running.'
      };
    } else {
      // Other errors
      return {
        success: false,
        error: 'Request error',
        message: error.message
      };
    }
  }
};

/**
 * Format conversation history for API
 * @param {Array} messages - Chat messages
 * @returns {Array} Formatted messages for API
 */
export const formatConversationHistory = (messages) => {
  return messages
    .filter(msg => msg.type === 'user' || msg.type === 'bot')
    .map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
};

/**
 * Detect if a query is conversational vs. structured location query
 * @param {string} query - User query
 * @returns {boolean} True if likely conversational
 */
export const isConversationalQuery = (query) => {
  const conversationalPatterns = [
    /^(what|when|where|why|how|can|could|would|should|is|are|tell me|explain)/i,
    /\?$/,
    /weather|tonight|best time|recommendation|advice|tip|help/i,
    /^(hi|hello|hey|greetings)/i
  ];

  return conversationalPatterns.some(pattern => pattern.test(query.trim()));
};

/**
 * Check if query contains location indicators
 * @param {string} query - User query
 * @returns {boolean} True if likely contains location
 */
export const hasLocationIndicator = (query) => {
  const locationPatterns = [
    /\d+\.?\d*\s*,\s*-?\d+\.?\d*/, // Coordinates
    /in\s+[A-Z]/i, // "in California"
    /near\s+[A-Z]/i, // "near New York"
    /(show|find|search|locate)/i // Action verbs
  ];

  return locationPatterns.some(pattern => pattern.test(query));
};
