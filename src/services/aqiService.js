/**
 * AQI Service - Provides Air Quality Index data exclusively from OpenWeather API
 * This service fetches, processes, and caches AQI data with enhanced error handling
 */

// Cache for AQI data to minimize API calls
const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const STALE_THRESHOLD = 10800000; // 3 hours in milliseconds

/**
 * Function to fetch AQI data from OpenWeather API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Enriched AQI data
 */
const fetchFromOpenWeather = async (lat, lon) => {
  const openWeatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

  // Validate API key
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
      const errorText = await response.text();
      console.error(`[AQI Service] Failed API call. Status code: ${response.status}`);
      console.error(`[AQI Service] Response: ${errorText}`);
      throw new Error(`Failed to fetch AQI data from OpenWeather API. Status: ${response.status}`);
    }

    const data = await response.json();

    // Validate response data
    if (!data.list || !data.list[0] || !data.list[0].main || !data.list[0].components) {
      console.error('[AQI Service] Invalid response format from OpenWeather API:', data);
      throw new Error('Invalid response format from OpenWeather API.');
    }

    const components = data.list[0].components;
    const aqiValue = data.list[0].main.aqi;

    // Determine dominant pollutant based on component values
    const dominantPollutant = determineDominantPollutant(components);

    // Extract AQI and pollutants with enriched metadata
    const enrichedData = {
      aqi: aqiValue,                                      // Air Quality Index value (1-5 scale from OpenWeather)
      pm25: components.pm2_5 || 0,                        // PM2.5 in μg/m³
      pm10: components.pm10 || 0,                         // PM10 in μg/m³
      o3: components.o3 || 0,                             // Ozone in μg/m³
      no2: components.no2 || 0,                           // Nitrogen dioxide in μg/m³
      so2: components.so2 || 0,                           // Sulfur dioxide in μg/m³
      co: components.co || 0,                             // Carbon monoxide in μg/m³
      dominant: dominantPollutant,                        // Dominant pollutant code
      components: components,                             // Full components object
      timestamp: Date.now(),                              // Timestamp in milliseconds
      station: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`, // Location as coordinates
      source: 'OpenWeather',                              // API source attribution
      isMockData: false,                                  // Real data flag
      isStale: false                                      // Data freshness flag
    };

    console.log('[AQI Service] Successfully fetched and enriched AQI data:', enrichedData);

    return enrichedData;
  } catch (error) {
    console.error('[AQI Service] Error fetching AQI data from OpenWeather:', error.message);
    throw error;
  }
};

/**
 * Determine the dominant pollutant from components
 * @param {Object} components - Pollutant components
 * @returns {string} Dominant pollutant code
 */
const determineDominantPollutant = (components) => {
  const pollutants = [
    { code: 'pm25', value: components.pm2_5 || 0 },
    { code: 'pm10', value: components.pm10 || 0 },
    { code: 'o3', value: components.o3 || 0 },
    { code: 'no2', value: components.no2 || 0 },
    { code: 'so2', value: components.so2 || 0 },
    { code: 'co', value: components.co || 0 }
  ];

  // Find pollutant with highest value
  const dominant = pollutants.reduce((max, current) => 
    current.value > max.value ? current : max
  , pollutants[0]);

  return dominant.code;
};

/**
 * Get AQI data for a location (main export function)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} AQI data with metadata
 */
export const getAQI = async (lat, lon) => {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    console.log('[AQI Service] Returning cached AQI data');
    // Check if cached data is stale
    const isStale = Date.now() - cachedData.timestamp > STALE_THRESHOLD;
    return { ...cachedData.data, isStale };
  }

  console.log('[AQI Service] Cache miss or expired, fetching fresh data');

  try {
    // Fetch from OpenWeather API
    const aqiData = await fetchFromOpenWeather(lat, lon);

    // Cache the result
    cache.set(cacheKey, {
      data: aqiData,
      timestamp: Date.now()
    });

    return aqiData;
  } catch (error) {
    console.error('[AQI Service] Failed to fetch AQI data:', error.message);
    
    // Return mock data as fallback
    console.warn('[AQI Service] Returning mock/estimated AQI data');
    return {
      aqi: 2,                                      // Moderate air quality
      pm25: 25,
      pm10: 40,
      o3: 50,
      no2: 30,
      so2: 20,
      co: 400,
      dominant: 'pm25',
      timestamp: Date.now(),
      station: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
      source: 'Estimated',
      isMockData: true,
      isStale: false
    };
  }
};

/**
 * Get AQI category information based on AQI value
 * OpenWeather uses a 1-5 scale, this function maps it to standard AQI categories
 * @param {number} aqi - AQI value (1-5 from OpenWeather, or 0-500 from other sources)
 * @returns {Object} Category information
 */
export const getAQICategory = (aqi) => {
  // OpenWeather uses 1-5 scale, convert to standard 0-500 scale if needed
  let standardAqi = aqi;
  if (aqi <= 5) {
    // Map OpenWeather 1-5 scale to approximate standard AQI
    const mapping = { 1: 25, 2: 75, 3: 125, 4: 175, 5: 250 };
    standardAqi = mapping[aqi] || 75;
  }

  if (standardAqi <= 50) {
    return {
      level: 'Good',
      color: '#00e400',
      description: 'Air quality is satisfactory',
      breathingQuality: 'Excellent',
      healthImplications: 'Air quality is considered satisfactory, and air pollution poses little or no risk.',
      stargazingImpact: 'Minimal impact on sky visibility'
    };
  } else if (standardAqi <= 100) {
    return {
      level: 'Moderate',
      color: '#ffff00',
      description: 'Air quality is acceptable',
      breathingQuality: 'Good',
      healthImplications: 'Air quality is acceptable for most people. However, sensitive groups may experience minor respiratory effects.',
      stargazingImpact: 'Slight haze may affect horizon visibility'
    };
  } else if (standardAqi <= 150) {
    return {
      level: 'Unhealthy for Sensitive Groups',
      color: '#ff7e00',
      description: 'Sensitive groups may be affected',
      breathingQuality: 'Acceptable',
      healthImplications: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
      stargazingImpact: 'Moderate haze affecting sky clarity'
    };
  } else if (standardAqi <= 200) {
    return {
      level: 'Unhealthy',
      color: '#ff0000',
      description: 'Everyone may begin to experience health effects',
      breathingQuality: 'Poor',
      healthImplications: 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.',
      stargazingImpact: 'Significant haze reducing visibility'
    };
  } else if (standardAqi <= 300) {
    return {
      level: 'Very Unhealthy',
      color: '#8f3f97',
      description: 'Health alert: everyone may experience serious effects',
      breathingQuality: 'Very Poor',
      healthImplications: 'Health warnings of emergency conditions. The entire population is more likely to be affected.',
      stargazingImpact: 'Heavy haze severely limiting visibility'
    };
  } else {
    return {
      level: 'Hazardous',
      color: '#7e0023',
      description: 'Health warnings of emergency conditions',
      breathingQuality: 'Hazardous',
      healthImplications: 'Health alert: everyone may experience more serious health effects.',
      stargazingImpact: 'Extreme haze making stargazing difficult'
    };
  }
};

/**
 * Get pollutant information
 * @param {string} pollutantCode - Pollutant code (pm25, pm10, o3, no2, so2, co)
 * @returns {Object} Pollutant information
 */
export const getPollutantInfo = (pollutantCode) => {
  const pollutants = {
    pm25: {
      name: 'PM2.5',
      fullName: 'Fine Particulate Matter (PM2.5)',
      unit: 'μg/m³',
      description: 'Tiny particles that can penetrate deep into lungs'
    },
    pm10: {
      name: 'PM10',
      fullName: 'Particulate Matter (PM10)',
      unit: 'μg/m³',
      description: 'Inhalable particles that can affect respiratory system'
    },
    o3: {
      name: 'O₃',
      fullName: 'Ozone',
      unit: 'μg/m³',
      description: 'Ground-level ozone, a harmful air pollutant'
    },
    no2: {
      name: 'NO₂',
      fullName: 'Nitrogen Dioxide',
      unit: 'μg/m³',
      description: 'Harmful gas from vehicle and industrial emissions'
    },
    so2: {
      name: 'SO₂',
      fullName: 'Sulfur Dioxide',
      unit: 'μg/m³',
      description: 'Harmful gas from burning fossil fuels'
    },
    co: {
      name: 'CO',
      fullName: 'Carbon Monoxide',
      unit: 'μg/m³',
      description: 'Colorless, odorless gas from combustion'
    }
  };

  return pollutants[pollutantCode] || {
    name: pollutantCode || 'Unknown',
    fullName: 'Unknown Pollutant',
    unit: 'μg/m³',
    description: 'Pollutant information not available'
  };
};
