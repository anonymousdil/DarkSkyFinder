import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini client (only if API key is available)
let geminiClient = null;
if (process.env.GEMINI_API_KEY) {
  geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// System prompt for the Starry chatbot
const SYSTEM_PROMPT = `You are Stary, a friendly and knowledgeable stargazing companion chatbot for the DarkSkyFinder application. Your role is to help users find the best stargazing locations and answer questions about astronomy and stargazing.

Key capabilities:
1. Answer questions about stargazing, astronomy, and celestial events
2. Provide recommendations for dark sky locations
3. Extract location information from user queries (place names, coordinates)
4. Discuss light pollution, air quality, and weather conditions for stargazing
5. Be conversational, friendly, and enthusiastic about stargazing

When users ask about specific locations:
- Try to extract the location name or coordinates from their query
- Provide general stargazing advice related to that location
- Encourage them to use the map feature for detailed analysis

Response format:
- For location queries: Include a structured JSON block at the end with format: {"location": "place name or coordinates", "type": "location_query"}
- For general questions: Just provide a helpful, conversational response
- Keep responses concise (2-3 paragraphs max) and engaging
- Use emojis occasionally to maintain a friendly tone 🌟

Remember:
- You don't have access to real-time data yourself
- Direct users to the map for detailed light pollution, AQI, and sky condition data
- Be honest if you don't know something
- Stay focused on stargazing and astronomy topics`;

/**
 * Extract location information from LLM response
 * @param {string} response - LLM response text
 * @returns {Object|null} Location info or null
 */
function extractLocationInfo(response) {
  try {
    // Look for JSON block in response
    const jsonMatch = response.match(/\{[^}]*"location"[^}]*\}/);
    if (jsonMatch) {
      const locationData = JSON.parse(jsonMatch[0]);
      return locationData;
    }
  } catch (error) {
    console.error('Error extracting location:', error);
  }
  return null;
}

/**
 * Process chat query with Gemini
 * POST /api/chat
 * Body: { query: string, conversationHistory?: array }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { query, conversationHistory = [] } = req.body;
    console.log('[Chat API] Received request:', { query, historyLength: conversationHistory.length });

    if (!query || typeof query !== 'string') {
      console.error('[Chat API] Invalid query parameter');
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameter'
      });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY || !geminiClient) {
      console.error('[Chat API] Gemini API key not configured');
      return res.status(503).json({
        success: false,
        error: 'Gemini API key not configured',
        message: 'Please configure GEMINI_API_KEY in your .env file to enable LLM features.'
      });
    }

    // Build conversation context for Gemini
    // Gemini uses a different format - we'll construct the full prompt
    let fullPrompt = SYSTEM_PROMPT + '\n\n';
    
    // Add conversation history (limit to last 10 messages to manage token usage)
    const recentHistory = conversationHistory.slice(-10);
    if (recentHistory.length > 0) {
      fullPrompt += 'Previous conversation:\n';
      recentHistory.forEach(msg => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        fullPrompt += `${role}: ${msg.content}\n`;
      });
      fullPrompt += '\n';
    }

    // Add current user query
    fullPrompt += `User: ${query}\nAssistant:`;

    console.log('[Chat API] Calling Gemini API...');
    // Call Gemini API
    const model = geminiClient.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text();
    console.log('[Chat API] Gemini API response received, length:', responseText.length);

    // Extract location info if present
    const locationInfo = extractLocationInfo(responseText);

    // Remove JSON block from display text if present
    const displayText = locationInfo 
      ? responseText.replace(/\{[^}]*"location"[^}]*\}/, '').trim()
      : responseText;

    res.json({
      success: true,
      response: displayText,
      locationInfo: locationInfo,
      usage: {
        promptTokens: 0, // Gemini doesn't provide detailed token usage in the same way
        completionTokens: 0,
        totalTokens: 0
      }
    });
    console.log('[Chat API] Response sent successfully');

  } catch (error) {
    console.error('Chat API error:', error);

    // Handle specific Gemini errors
    if (error.status === 401 || error.message?.includes('API key')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Gemini API key',
        message: 'Please check your GEMINI_API_KEY configuration.'
      });
    }

    if (error.status === 429 || error.message?.includes('quota')) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again in a moment.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'An error occurred processing your request.'
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DarkSkyFinder LLM Backend',
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌟 DarkSkyFinder LLM Backend running on port ${PORT}`);
  console.log(`Gemini API configured: ${process.env.GEMINI_API_KEY ? 'Yes ✓' : 'No ✗'}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  Warning: GEMINI_API_KEY not set. LLM features will not work.');
  }
});

export default app;
