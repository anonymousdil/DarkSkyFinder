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
- **Real-time AQI Data**: Live Air Quality Index from Aqicn.org (WAQI) API with:
  - Real-time data from 12,000+ monitoring stations worldwide
  - Detailed pollutant breakdown (PM2.5, PM10, O₃, NO₂, SO₂, CO)
  - Graceful fallback to mock data when API is unavailable
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

For detailed information about the enhanced search API, see [SEARCH_API_DOCUMENTATION.md](./SEARCH_API_DOCUMENTATION.md).

## API Configuration

### Air Quality Index (AQI) Data

The application uses the **Aqicn.org API (WAQI - World Air Quality Index)** for real-time air quality data. To enable real-time AQI data:

1. Get a free API token from open weather
2. Copy `.env.example` to `.env`
3. Add your API token:
   ```
   VITE_AQICN_API_TOKEN=your_api_token_here
   ```

**API Features:**
- Real-time air quality data from over 12,000+ monitoring stations worldwide
- Detailed pollutant measurements (PM2.5, PM10, O₃, NO₂, SO₂, CO)
- US EPA Air Quality Index (already calculated)
- Free tier with unlimited API calls (rate-limited)
- Data from trusted sources including EPA, DEFRA, and local environmental agencies

**Note**: The app will work with mock data if the API token is not configured, but real-time data is recommended for accurate air quality information.

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

## Performance Optimizations

- **API Caching**: Sky viewability data is cached for 1 hour to reduce API calls
- **Lazy Loading**: Components load only when needed
- **Optimized Rendering**: React state management for efficient updates
