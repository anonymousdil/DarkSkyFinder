# DarkSkyFinder
The Ultimate Stargazing Companion!!

> **✨ NEW**: Complete Air Quality Index (AQI) integration using AQICN API - [Setup Guide](./AQI_IMPLEMENTATION_GUIDE.md)

## Features

- **Welcome Page**: Beautiful hero section with starry sky imagery and information about stargazing
- **Interactive Map**: World map powered by Leaflet with multiple layer options and advanced zoom controls
- **Enhanced Location Search**: Advanced search with direct navigation:
  - **Direct Navigation**: Automatically navigates to the best matching location
  - **Fuzzy Matching**: Find locations even with typos (e.g., "Yelowstone" finds "Yellowstone")
  - **Autocomplete Suggestions**: Real-time suggestions as you type (2+ characters)
  - **Synonym Matching**: Automatically expands searches (e.g., "park" also searches "nature reserve")
  - **Result Ranking**: Intelligent ranking based on similarity, importance, proximity, and prefix match
  - **Coordinate Search**: Search by exact coordinates (lat, lon)
- **Advanced Zoom Controls**: Seamless 0-100x zoom scale with:
  - Interactive zoom slider for precise control
  - Zoom in/out buttons for quick adjustments
  - Real-time zoom level indicator
  - Smooth zoom transitions
- **Three Distinct Views**: Toggle between specialized views for comprehensive stargazing analysis:
  - **AQI View**: Detailed air quality information with breathing quality indicators and health implications
  - **Light Pollution View**: Bortle scale analysis with sky quality measurements and stargazing recommendations
  - **Ultimate View**: Comprehensive report combining AQI, light pollution, and sky conditions into a single score
- **Real-time AQI Data**: Live Air Quality Index from AQICN (World Air Quality Index) API:
  - Comprehensive air pollution data using AQICN's global monitoring network
  - Detailed pollutant breakdown (PM2.5, PM10, O₃, NO₂, SO₂, CO)
  - Automatic data validation and freshness checks
  - Graceful fallback to estimated data when API is unavailable
- **Light Pollution Analysis**: Bortle scale classification with educational content and typical location examples
- **Multiple Map Layers**: Toggle between standard map, terrain view, and satellite imagery
- **Sky Viewability Information**: Real-time astronomical weather conditions including:
  - Cloud cover percentage
  - Seeing conditions (atmospheric stability)
  - Transparency (atmospheric clarity)
  - Temperature, humidity, and wind
  - Overall stargazing quality rating
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/anonymousdil/DarkSkyFinder.git
cd DarkSkyFinder
```

2. Install dependencies:
```bash
npm install
```

3. Configure API tokens (optional but recommended):
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - **AQICN API** (for real-time AQI data):
     - Visit [https://aqicn.org/data-platform/token/](https://aqicn.org/data-platform/token/) and request a free API token
     - Add to `.env`: `VITE_AQICN_TOKEN=your_actual_aqicn_token_here`
   
   - **Gemini API** (for LLM-powered conversational chatbot):
     - Visit [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
     - Create an API key (requires Google Cloud account (free tier available))
     - Add to `.env`: `GEMINI_API_KEY=your_openai_api_key_here`
     - **Note**: This is a backend-only variable and will NOT be exposed to the frontend for security
   
   - **⚠️ SECURITY NOTE**: Never commit your `.env` file with real API tokens to version control. The `.env` file is already in `.gitignore`.

4. Start the development servers:

   **Option A - Full Experience (Frontend + LLM Backend):**
   ```bash
   npm run dev:full
   ```
   This starts both the Vite frontend (port 5173) and Express backend (port 3001) concurrently.

   **Option B - Frontend Only (without LLM features):**
   ```bash
   npm run dev
   ```
   The chatbot will still work with structured location queries, but won't have conversational AI capabilities.

   **Option C - Backend Only:**
   ```bash
   npm run dev:backend
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

### Basic Features

1. Open the application and click "Dive In" on the welcome page
2. Search for a location using the enhanced search features:
   - Type a location name and get autocomplete suggestions as you type
   - Select from suggestions or press Enter to search
   - The search automatically navigates to the best matching location
   - Search by exact coordinates (e.g., "40.7128, -74.0060")
   - The search is typo-tolerant and understands synonyms
3. Use the **Zoom Control** (bottom right) to adjust map view:
   - Click **+** to zoom in or **−** to zoom out
   - Use the slider for precise zoom control
   - Zoom scale ranges from **0x** (world view) to **100x** (street level)
   - Current zoom level is displayed in real-time
4. Click on markers to view detailed information
5. Select your preferred view using the view toggle:
   - **AQI**: Air Quality Index with breathing quality and health recommendations
   - **Light**: Light pollution analysis with Bortle scale and stargazing suitability
   - **Ultimate**: Comprehensive stargazing report combining all metrics
6. Use the Layer Switcher to toggle between:
   - Standard Map (OpenStreetMap)
   - Terrain Map (OpenTopoMap)
   - Satellite View (Esri World Imagery)
7. View detailed sky conditions, air quality, and light pollution data for your selected location
8. Pin locations by clicking anywhere on the map to save them to your board

### Stary Chatbot - AI-Powered Companion

The **Stary** chatbot (🌟 icon) provides two modes of interaction:

#### Structured Location Queries (Always Available)
- "Yellowstone National Park"
- "Death Valley"
- "44.4280, -110.5885" (coordinates)

#### Conversational AI Mode (Requires Gemini API Key)
When configured with Gemini API key, Stary can handle free-form conversations:

**Example Questions:**
- "What's the best time to see the Milky Way?"
- "How does light pollution affect stargazing?"
- "Tell me about meteor showers this month"
- "What equipment do I need for astrophotography?"
- "Show me dark sky locations in California"
- "How's the weather for stargazing tonight?"

**Features:**
- Natural language understanding
- Context-aware responses
- Automatic location extraction from conversational queries
- Astronomy knowledge and recommendations
- Friendly, engaging personality

**Fallback Behavior:**
If the backend is unavailable or Gemini API is not configured, Stary gracefully falls back to structured location query mode.

**API Features:**
- AQICN (World Air Quality Index) API for real-time AQI data
- Real-time data with automatic freshness validation
- Detailed pollutant measurements (PM2.5, PM10, O₃, NO₂, SO₂, CO)
- Air Quality Index on US EPA standard (0-500 scale)
- Automatic fallback to estimated data if API fails
- Data source clearly displayed in UI
- Free tier available (1,000 calls/minute with rate limits)
- Comprehensive error handling and logging

**Note**: The app will work with estimated data if the API token is not configured, but real-time data is recommended for accurate air quality information.

### Sky Viewability Data

The application uses the **7Timer! ASTRO API** for astronomical weather forecasting, which is completely free and requires no API key. This provides:
- Cloud cover predictions
- Atmospheric seeing conditions
- Transparency/clarity
- Temperature, humidity, and wind data

No setup is required for sky viewability data.

## Technologies Used

- React 19
- Vite
- React Router DOM
- Leaflet & React Leaflet
- Axios
- Express.js (Backend Server)
- OpenAI Gemini 2.0 Flash (LLM Integration)
- OpenStreetMap (Standard Map Tiles)
- OpenTopoMap (Terrain Map Tiles)
- Esri World Imagery (Satellite View)
- 7Timer! Astronomical Weather API
- AQICN (World Air Quality Index) API - Exclusive AQI data source

## Performance Optimizations

- **API Caching**: AQI and sky viewability data cached for 1 hour to reduce API calls and manage rate limits
- **Enhanced Error Handling**: Comprehensive error handling with detailed logging for AQI service
- **Data Validation**: Freshness checks to ensure AQI data is current (warns if older than 3 hours)
- **Lazy Loading**: Components load only when needed
- **Optimized Rendering**: React state management for efficient updates

## Testing

### AQI Integration Testing

A comprehensive test harness is included to verify the AQI integration:

1. **Browser-based Tests** (Manual Testing Only):
   - **Important**: This test makes live API calls and is designed for manual browser testing only
   - Start the development server: `npm run dev`
   - Navigate to `http://localhost:5173/test-aqi-service.html`
   - Click "Run All Tests" to verify:
     - API endpoint accessibility
     - AQI category mapping (1-5 scale)
     - Error handling for invalid coordinates
     - Real-time data from multiple locations
   - **Note**: This test will be blocked in CI/CD environments due to firewall rules (this is normal and expected)

2. **Manual Verification**:
   - Start the development server: `npm run dev`
   - Search for a location (e.g., "New York")
   - Click the location marker
   - Verify:
     - AQI data displays without "mock data" warnings
     - All pollutant values show as AQI values (0-500 scale)
     - Source shows "AQICN" (not "Estimated")
     - Console shows successful API logs

3. **Expected Console Logs**:
   ```
   [AQI Service] Fetching AQI data from AQICN for coordinates: X, Y
   [AQI Service] Successfully fetched and calculated exact numeric AQI
   ```

For detailed testing instructions, see `AQI_INTEGRATION_VERIFICATION.md`.

## LLM Backend Deployment

### Local Development

The LLM backend runs on port 3001 by default. To start it:

```bash
# Install backend dependencies (first time only)
cd server
npm install

# Start backend
npm run dev

# Or from root directory
npm run dev:backend

# Or start both frontend and backend together
npm run dev:full
```

### Production Deployment

For production deployment, you'll need to:

1. **Deploy the Backend Server:**
   - The `server/` directory contains a standalone Express.js application
   - Deploy to services like Heroku, Railway, Render, or AWS
   - Set environment variable `VITE_GEMINI_API_KEY` in your hosting service
   - Ensure the backend URL is accessible from your frontend

2. **Configure Frontend:**
   - Set `VITE_BACKEND_URL` in your `.env` to point to your deployed backend
   - Example: `VITE_BACKEND_URL=https://your-backend.herokuapp.com`

3. **Build Frontend:**
   ```bash
   npm run build
   ```
   Deploy the `dist/` folder to static hosting (Vercel, Netlify, etc.)

### Environment Variables Summary

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `VITE_AQICN_TOKEN` | Optional | Real-time AQI data | `abc123...` |
| `GEMINI_API_KEY` | Required for LLM | Conversational AI features (backend only) | `sk-proj-...` |
| `BACKEND_PORT` | Optional | Backend server port | `3001` |
| `VITE_BACKEND_URL` | Optional | Backend URL for frontend | `http://localhost:3001` |

## Troubleshooting

### LLM Features Not Working

**Problem:** Chatbot doesn't respond to conversational queries

**Solutions:**
1. Check if backend server is running:
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should return: `{"status":"ok","service":"DarkSkyFinder LLM Backend","openaiConfigured":true}`

2. Verify Gemini API key is set in `.env`:
   ```bash
   grep GEMINI_API_KEY .env
   ```

3. Check browser console for errors
4. Ensure both frontend and backend are running (`npm run dev:full`)

### Backend Server Won't Start

**Problem:** Error when running `npm run dev:backend`

**Solutions:**
1. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```

2. Check if port 3001 is already in use:
   ```bash
   lsof -i :3001  # On macOS/Linux
   netstat -ano | findstr :3001  # On Windows
   ```

3. Change port in `.env`:
   ```
   BACKEND_PORT=3002
   VITE_BACKEND_URL=http://localhost:3002
   ```

### Gemini API Errors

**Problem:** "Rate limit exceeded" or "Invalid API key"

**Solutions:**
1. Verify API key is correct and has credits
2. Check OpenAI account dashboard for usage limits
3. Consider upgrading OpenAI plan if hitting rate limits
4. The chatbot will automatically fall back to structured queries

### CORS Errors

**Problem:** Browser console shows CORS errors when connecting to backend

**Solutions:**
1. Ensure backend CORS is configured (already set in `server/index.js`)
2. Check `VITE_BACKEND_URL` matches actual backend URL
3. For production, update CORS settings to allow your frontend domain

## Cost Considerations

### Gemini API Costs

The Stary chatbot uses **Gemini 2.0 Flash** model which is **FREE** for most use cases:
- Free tier: 15 requests per minute (RPM), 1 million tokens per day
- Input/Output: Free for flash models
- Average conversation: 500-1000 tokens (FREE!)

**Free tier limits:**
- 15 RPM (requests per minute)
- 1 million tokens per day
- More than enough for personal/development use
- Consider implementing request caching for common questions

### Free Tier Limits

- **7Timer!**: Free, no limits
- **AQICN**: 1,000 calls/minute (free tier)
- **Gemini**: 15 RPM, 1M tokens/day (free tier)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.
