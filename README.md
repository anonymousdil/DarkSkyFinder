# DarkSkyFinder
The Ultimate Stargazing Companion!!

## Features

- **Welcome Page**: Beautiful hero section with starry sky imagery and information about stargazing
- **Interactive Map**: World map powered by Leaflet with multiple layer options
- **Enhanced Location Search**: Advanced search with multiple features:
  - **Fuzzy Matching**: Find locations even with typos (e.g., "Yelowstone" finds "Yellowstone")
  - **Autocomplete Suggestions**: Real-time suggestions as you type (2+ characters)
  - **Synonym Matching**: Automatically expands searches (e.g., "park" also searches "nature reserve")
  - **Result Ranking**: Intelligent ranking based on similarity, importance, proximity, and prefix match
  - **Multiple Results**: Shows ranked results with detailed metadata when multiple matches exist
  - **Coordinate Search**: Search by exact coordinates (lat, lon)
- **AQI Display**: View Air Quality Index for each searched location on marker hover/click
- **Multiple Map Layers**: Toggle between standard map, terrain view, and satellite imagery
- **Sky Viewability Information**: Real-time astronomical weather conditions including:
  - Cloud cover percentage
  - Seeing conditions (atmospheric stability)
  - Transparency (atmospheric clarity)
  - Temperature, humidity, and wind
  - Overall stargazing quality rating
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173` to view the application.

### Build

```bash
npm run build
```

## Usage

1. Open the application and click "Dive In" on the welcome page
2. Search for a location using the enhanced search features:
   - Type a location name and get autocomplete suggestions as you type
   - Select from suggestions or press Enter to search
   - For multiple matches, review ranked results with metadata
   - Search by exact coordinates (e.g., "40.7128, -74.0060")
   - The search is typo-tolerant and understands synonyms
3. Click on markers to view AQI information and sky conditions
4. Use the Layer Switcher to toggle between:
   - Standard Map (OpenStreetMap)
   - Terrain Map (OpenTopoMap)
   - Satellite View (Esri World Imagery)
5. Click "View Sky Conditions" to see detailed astronomical weather data

For detailed information about the enhanced search API, see [SEARCH_API_DOCUMENTATION.md](./SEARCH_API_DOCUMENTATION.md).

## API Configuration

### Sky Viewability Data

The application uses the **7Timer! ASTRO API** for astronomical weather forecasting, which is completely free and requires no API key. This provides:
- Cloud cover predictions
- Atmospheric seeing conditions
- Transparency/clarity
- Temperature, humidity, and wind data

No setup is required for basic functionality.

### Optional: Enhanced Weather Data

For more detailed weather information, you can optionally configure OpenWeatherMap:

1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Copy `.env.example` to `.env`
3. Add your API key:
   ```
   VITE_OPENWEATHER_API_KEY=your_api_key_here
   ```

**Note**: The app works perfectly fine without this optional configuration, using 7Timer! data and fallback mock data when needed.

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
