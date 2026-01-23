import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize OpenAI client (only if API key is available)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
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
 * Process chat query with OpenAI
 * POST /api/chat
 * Body: { query: string, conversationHistory?: array }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { query, conversationHistory = [] } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameter'
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || !openai) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API key not configured',
        message: 'Please configure OPENAI_API_KEY in your .env file to enable LLM features.'
      });
    }

    // Build messages array for OpenAI API
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT }
    ];

    // Add conversation history (limit to last 10 messages to manage token usage)
    const recentHistory = conversationHistory.slice(-10);
    messages.push(...recentHistory);

    // Add current user query
    messages.push({ role: 'user', content: query });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0].message.content;

    // Extract location info if present
    const locationInfo = extractLocationInfo(response);

    // Remove JSON block from display text if present
    const displayText = locationInfo 
      ? response.replace(/\{[^}]*"location"[^}]*\}/, '').trim()
      : response;

    res.json({
      success: true,
      response: displayText,
      locationInfo: locationInfo,
      usage: {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);

    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid OpenAI API key',
        message: 'Please check your OPENAI_API_KEY configuration.'
      });
    }

    if (error.status === 429) {
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
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌟 DarkSkyFinder LLM Backend running on port ${PORT}`);
  console.log(`OpenAI API configured: ${process.env.OPENAI_API_KEY ? 'Yes ✓' : 'No ✗'}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  Warning: OPENAI_API_KEY not set. LLM features will not work.');
  }
});

export default app;
