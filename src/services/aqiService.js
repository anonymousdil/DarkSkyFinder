// Function to fetch AQI data from OpenWeather API
const fetchFromOpenWeather = async (lat, lon) => {
  const openWeatherApiKey = process.env.VITE_OPENWEATHER_API_KEY; // Retrieve the API key from the .env file

  // Check if API key is provided
  if (!openWeatherApiKey) {
    console.error('[AQI Service] OpenWeather API key is missing in the environment variables.');
    throw new Error('OpenWeather API key not configured. Please add VITE_OPENWEATHER_API_KEY to .env.');
  }

  console.log(`[AQI Service] Fetching AQI data from OpenWeather for coordinates: ${lat}, ${lon}`);

  try {
    // OpenWeather API endpoint for Air Pollution data
    const apiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}`;
    const response = await fetch(apiUrl);

    // Check HTTP response status
    if (!response.ok) {
      console.error(`[AQI Service] Failed API call. Status code: ${response.status}`);
      console.error(`Response: ${await response.text()}`);
      throw new Error('Failed to fetch AQI data from OpenWeather API.');
    }

    const data = await response.json();

    // Extract AQI and pollutants and add metadata
    const enrichedData = {
      aqi: data.list[0].main.aqi,               // Air Quality Index value
      components: data.list[0].components,     // Pollutant components (e.g., PM2.5, O3)
      timestamp: Date.now(),                   // Timestamp in milliseconds for the data retrieval
      station: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,  // Location as Lat/Lon (for mock station display)
      source: 'OpenWeather',                   // API source for attribution
      isMockData: false                        // Indicates this is real data, not mock or fallback
    };

    console.log('[AQI Service] Successfully fetched and enriched AQI data:', enrichedData);

    return enrichedData;
  } catch (error) {
    // Log and throw any errors caught during the process
    console.error('[AQI Service] An error occurred while fetching AQI data from OpenWeather:', error.message);
    throw new Error('There was an issue with the OpenWeather API. Please check your internet connection or API key.');
  }
};
