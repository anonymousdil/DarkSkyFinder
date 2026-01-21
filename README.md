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
- **Real-time AQI Data**: Live Air Quality Index with intelligent fallback system:
  - Primary source: Aqicn.org (WAQI) API with 12,000+ monitoring stations worldwide
  - Fallback source: OpenWeather Air Pollution API for redundancy
  - Detailed pollutant breakdown (PM2.5, PM10, O₃, NO₂, SO₂, CO)
  - Automatic data validation and freshness checks
  - Graceful fallback to estimated data when APIs are unavailable
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
- Intelligent dual-source AQI data system:
  - Primary: AQICN with 12,000+ monitoring stations worldwide
  - Fallback: OpenWeather Air Pollution API for reliability
- Real-time data with automatic freshness validation
- Detailed pollutant measurements (PM2.5, PM10, O₃, NO₂, SO₂, CO)
- US EPA Air Quality Index calculation
- Automatic fallback to estimated data if both APIs fail
- Data source clearly displayed in UI
- Free tier available for both APIs (with rate limits)
- Comprehensive error handling and retry logic

**Note**: The app will work with estimated data if API tokens are not configured, but real-time data is recommended for accurate air quality information.

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
- AQICN (WAQI) API - Primary AQI data source
- OpenWeather Air Pollution API - Fallback AQI data source

## Performance Optimizations

- **API Caching**: AQI and sky viewability data cached for 1 hour to reduce API calls and manage rate limits
- **Intelligent Fallback**: Automatic fallback from AQICN to OpenWeather to ensure data availability
- **Data Validation**: Freshness checks to ensure AQI data is current (warns if older than 3 hours)
- **Retry Logic**: Exponential backoff for failed API requests
- **Lazy Loading**: Components load only when needed
- **Optimized Rendering**: React state management for efficient updates
