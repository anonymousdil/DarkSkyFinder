// Function to fetch AQI data from OpenWeather API
const fetchFromOpenWeather = async (lat, lon) => {
  const openWeatherApiKey = process.env.VITE_OPENWEATHER_API_KEY; // Your OpenWeather API token from .env file

  if (!openWeatherApiKey) {
    throw new Error('OpenWeather API key not configured');
  }

  console.log('[AQI Service] Attempting to fetch from OpenWeather API...');

  // OpenWeather API endpoint for air pollution data
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${openWeatherApiKey}`
  );

  if (!response.ok) {
    throw new Error('Invalid response from OpenWeather API');
  }

  const data = await response.json();

  // Extract AQI and pollutant data
  return {
    aqi: data.list[0].main.aqi,
    components: data.list[0].components,
    timestamp: Date.now(), // Add a timestamp for freshness
    station: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`, // Mock station lat/lon format
    source: 'OpenWeather', // Add the data source for attribution
    isMockData: false,
  };
};

// High-level function to fetch AQI data using the OpenWeather API
const fetchAQIData = async (lat, lon) => {
  try {
    const data = await fetchFromOpenWeather(lat, lon);
    return data;
  } catch (error) {
    console.error('[AQI Service] Failed to fetch AQI data:', error.message);
    throw new Error('Failed to fetch AQI data. Please check your OpenWeather API key.');
  }
};

export { fetchAQIData };
