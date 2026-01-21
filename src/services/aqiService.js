const fetchFromOpenWeather = async (lat, lon) => {
  const openWeatherApiKey = process.env.VITE_OPENWEATHER_API_KEY;
  if (!openWeatherApiKey) {
    throw new Error('OpenWeather API key not configured');
  }

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${bca4460ade4fda9cce3c64440a1d9be8}`
  );

  if (!response.ok) {
    throw new Error('Invalid response from OpenWeather API');
  }

  const data = await response.json();
  return {
    aqi: data.list[0].main.aqi,
    components: data.list[0].components,
  };
};

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
