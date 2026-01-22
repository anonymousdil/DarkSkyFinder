# DarkSkyFinder
The Ultimate Stargazing Companion!!

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
- **Real-time AQI Data**: Live Air Quality Index from OpenWeather API:
  - Comprehensive air pollution data using OpenWeather Air Pollution API
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

3. Configure API token (optional but recommended):
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Get your free OpenWeather API key:
     - **OpenWeather API**: Visit [https://openweathermap.org/api](https://openweathermap.org/api) and sign up for a free API key
   - Add your token to `.env`:
     ```
     VITE_OPENWEATHER_API_KEY=your_actual_openweather_key_here
     ```
   - **⚠️ SECURITY NOTE**: Never commit your `.env` file with real API tokens to version control. The `.env` file is already in `.gitignore`.

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

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


**API Features:**
- OpenWeather Air Pollution API for real-time AQI data
- Real-time data with automatic freshness validation
- Detailed pollutant measurements (PM2.5, PM10, O₃, NO₂, SO₂, CO)
- Air Quality Index on a 1-5 scale (mapped to standard EPA AQI)
- Automatic fallback to estimated data if API fails
- Data source clearly displayed in UI
- Free tier available (1,000 calls/day with rate limits)
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
- OpenStreetMap (Standard Map Tiles)
- OpenTopoMap (Terrain Map Tiles)
- Esri World Imagery (Satellite View)
- 7Timer! Astronomical Weather API
- OpenWeather Air Pollution API - Exclusive AQI data source

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
     - All pollutant values show in µg/m³
     - Source shows "OpenWeather" (not "Estimated")
     - Console shows successful API logs

3. **Expected Console Logs**:
   ```
   [AQI Service] Fetching AQI data from OpenWeather for coordinates: X, Y
   [AQI Service] Successfully fetched and enriched AQI data
   ```

For detailed testing instructions, see `AQI_INTEGRATION_VERIFICATION.md`.
