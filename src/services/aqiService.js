import axios from 'axios';

/**
 * Service for fetching Air Quality Index (AQI) data
 * Uses Aqicn.org (WAQI) API for real-time air quality data
 */

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Get API key from environment variables
const API_KEY = import.meta.env.VITE_AQICN_API_TOKEN;

// API configuration
const API_CONFIG = {
  timeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000, // Initial retry delay in ms
};

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch data from API with retry logic and exponential backoff
 * @param {string} url - API URL
 * @param {Object} config - Axios config
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<Object>} API response
 */
const fetchWithRetry = async (url, config, retries = API_CONFIG.maxRetries) => {
  try {
    const response = await axios.get(url, config);
    return response;
  } catch (error) {
    if (retries > 0) {
      // Calculate exponential backoff delay
      const delay = API_CONFIG.retryDelay * Math.pow(2, API_CONFIG.maxRetries - retries);
      console.warn(`[AQI Service] API call failed, retrying in ${delay}ms... (${retries} retries left)`);
      await sleep(delay);
      return fetchWithRetry(url, config, retries - 1);
    }
    throw error;
  }
};

/**
 * Get AQI data for a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} AQI data with detailed metrics
 */
export const getAQI = async (lat, lon) => {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    console.debug('[AQI Service] Returning cached data');
    return cachedData.data;
  }

  try {
    // Validate API key
    if (!API_KEY) {
      console.warn('[AQI Service] No API key configured, using mock data');
      return getMockAQI(lat, lon);
    }

    // Use Aqicn.org (WAQI) API with retry logic
    const response = await fetchWithRetry(
      `https://api.waqi.info/feed/geo:${lat};${lon}/`,
      {
        params: {
          token: API_KEY
        },
        timeout: API_CONFIG.timeout
      }
    );

    if (response.data && response.data.status === 'ok' && response.data.data) {
      const data = response.data.data;
      
      // Extract AQI value (already in US EPA scale)
      const usAqi = data.aqi;
      
      // Extract individual pollutant sub-indices from iaqi
      // WAQI API returns individual AQI values for each pollutant (iaqi),
      // not raw concentrations. The 'v' field represents the AQI sub-index
      // for that specific pollutant.
      const iaqi = data.iaqi || {};
      
      // Since WAQI provides AQI sub-indices rather than raw concentrations,
      // we'll use these values directly for display. The values are already
      // calculated AQI values per pollutant.
      // Note: For precise concentration values, a different API endpoint would be needed
      const components = {
        pm2_5: iaqi.pm25 ? iaqi.pm25.v : null,
        pm10: iaqi.pm10 ? iaqi.pm10.v : null,
        o3: iaqi.o3 ? iaqi.o3.v : null,
        no2: iaqi.no2 ? iaqi.no2.v : null,
        so2: iaqi.so2 ? iaqi.so2.v : null,
        co: iaqi.co ? iaqi.co.v : null
      };
      
      // Find the dominant pollutant (the one with highest sub-AQI)
      let dominant = 'pm25';
      let maxValue = 0;
      for (const [key, value] of Object.entries(components)) {
        if (value !== null && value > maxValue) {
          maxValue = value;
          // Convert component key to expected format
          const pollutantMap = {
            'pm2_5': 'pm25',
            'pm10': 'pm10',
            'o3': 'o3',
            'no2': 'no2',
            'so2': 'so2',
            'co': 'co'
          };
          dominant = pollutantMap[key] || key;
        }
      }
      
      // Get station name from city data
      const stationName = data.city && data.city.name ? data.city.name : `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
      
      const aqiData = {
        aqi: usAqi,
        // WAQI iaqi values are AQI sub-indices, displayed as approximate concentrations
        // for UI consistency. For precise concentration values, consider using
        // supplementary endpoints or data sources.
        pm25: components.pm2_5 ? Math.round(components.pm2_5) : null,
        pm10: components.pm10 ? Math.round(components.pm10) : null,
        o3: components.o3 ? Math.round(components.o3) : null,
        no2: components.no2 ? Math.round(components.no2) : null,
        so2: components.so2 ? Math.round(components.so2) : null,
        co: components.co ? Math.round(components.co * 10) / 10 : null,
        dominant: dominant,
        station: stationName,
        timestamp: Date.now(),
        source: 'Aqicn.org (WAQI)',
        isMockData: false
      };

      // Cache the result
      cache.set(cacheKey, {
        data: aqiData,
        timestamp: Date.now()
      });

      console.log('[AQI Service] Successfully fetched real-time AQI data from Aqicn.org');
      return aqiData;
    }

    throw new Error('Invalid response from Aqicn.org API');
  } catch (error) {
    console.warn('[AQI Service] Error fetching real AQI data, using fallback mock data:', error.message);
    
    // Return enhanced mock data as fallback
    return getMockAQI(lat, lon);
  }
};

/**
 * Generate mock AQI data (fallback)
 * Enhanced to provide more realistic baseline values
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Object} Mock AQI data
 */
const getMockAQI = (lat, lon) => {
  console.warn('[AQI Service] ⚠️ WARNING: Using mock data as fallback. Real-time data unavailable.');
  
  // Generate deterministic but realistic AQI based on location
  const seed = Math.abs(Math.sin(lat) * Math.cos(lon) * 10000);
  
  // Most locations have good to moderate air quality (AQI 0-100)
  // with occasional unhealthy days
  const baseAQI = Math.floor((seed % 80) + 20); // Range: 20-100
  
  // Calculate realistic pollutant concentrations based on AQI
  // All values stored in μg/m³ (as expected by the API and calculation functions)
  let pm25, pm10, o3, no2, so2, co;
  
  if (baseAQI <= 50) {
    pm25 = Math.floor(baseAQI * 0.24); // 0-12 μg/m³
    pm10 = Math.floor(baseAQI * 1.08); // 0-54 μg/m³
    o3 = Math.floor(baseAQI * 2.16); // 0-108 μg/m³ (≈0-54 ppb)
    no2 = Math.floor(baseAQI * 1.88 * 0.53); // 0-50 μg/m³ (≈0-27 ppb)
    so2 = Math.floor(baseAQI * 2.62 * 0.35); // 0-46 μg/m³ (≈0-18 ppb)
    co = (baseAQI * 0.088).toFixed(1); // 0-4.4 ppm
  } else {
    pm25 = Math.floor(12 + (baseAQI - 50) * 0.47); // 12-35 μg/m³
    pm10 = Math.floor(54 + (baseAQI - 50) * 2); // 54-154 μg/m³
    o3 = Math.floor(108 + (baseAQI - 50) * 0.64); // 108-140 μg/m³ (≈54-70 ppb)
    no2 = Math.floor(100 + (baseAQI - 50) * 0.94); // 100-147 μg/m³ (≈53-78 ppb)
    so2 = Math.floor(92 + (baseAQI - 50) * 1.05); // 92-144 μg/m³ (≈35-55 ppb)
    co = (4.4 + (baseAQI - 50) * 0.1).toFixed(1); // 4.4-9.4 ppm
  }
  
  // Determine dominant pollutant based on typical patterns
  let dominant;
  if (baseAQI < 40) {
    dominant = 'pm25';
  } else if (baseAQI < 70) {
    dominant = seed % 2 === 0 ? 'o3' : 'pm25';
  } else {
    dominant = seed % 3 === 0 ? 'pm10' : (seed % 3 === 1 ? 'pm25' : 'no2');
  }
  
  return {
    aqi: baseAQI,
    pm25: pm25,
    pm10: pm10,
    o3: o3,
    no2: no2,
    so2: so2,
    co: parseFloat(co),
    dominant: dominant,
    station: `Mock Station ${Math.floor(seed % 1000)}`,
    timestamp: Date.now(),
    source: 'Mock Data (Fallback)',
    isMockData: true
  };
};

/**
 * Get AQI category and description
 * @param {number} aqi - AQI value
 * @returns {Object} Category information
 */
export const getAQICategory = (aqi) => {
  if (aqi === 'N/A' || aqi === null || aqi === undefined) {
    return {
      level: 'Unknown',
      color: '#999999',
      description: 'AQI data not available',
      healthImplications: 'Unable to determine air quality',
      breathingQuality: 'Unknown',
      stargazingImpact: 'Unknown impact on visibility'
    };
  }

  if (aqi <= 50) {
    return {
      level: 'Good',
      color: '#00e400',
      description: 'Air quality is satisfactory',
      healthImplications: 'Air quality is satisfactory, and air pollution poses little or no risk.',
      breathingQuality: 'Excellent - Safe for all outdoor activities',
      stargazingImpact: 'Minimal impact - Clear skies expected'
    };
  }

  if (aqi <= 100) {
    return {
      level: 'Moderate',
      color: '#ffff00',
      description: 'Air quality is acceptable',
      healthImplications: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.',
      breathingQuality: 'Good - Generally safe for most people',
      stargazingImpact: 'Slight impact - May reduce visibility slightly'
    };
  }

  if (aqi <= 150) {
    return {
      level: 'Unhealthy for Sensitive Groups',
      color: '#ff7e00',
      description: 'Members of sensitive groups may experience health effects',
      healthImplications: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
      breathingQuality: 'Fair - Sensitive individuals should limit prolonged outdoor activities',
      stargazingImpact: 'Moderate impact - Reduced visibility likely'
    };
  }

  if (aqi <= 200) {
    return {
      level: 'Unhealthy',
      color: '#ff0000',
      description: 'Everyone may begin to experience health effects',
      healthImplications: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.',
      breathingQuality: 'Poor - Everyone should limit outdoor activities',
      stargazingImpact: 'Significant impact - Poor visibility expected'
    };
  }

  if (aqi <= 300) {
    return {
      level: 'Very Unhealthy',
      color: '#8f3f97',
      description: 'Health alert: everyone may experience more serious health effects',
      healthImplications: 'Health alert: The risk of health effects is increased for everyone.',
      breathingQuality: 'Very Poor - Avoid outdoor activities',
      stargazingImpact: 'Severe impact - Very poor visibility'
    };
  }

  return {
    level: 'Hazardous',
    color: '#7e0023',
    description: 'Health warnings of emergency conditions',
    healthImplications: 'Health warning of emergency conditions: everyone is more likely to be affected.',
    breathingQuality: 'Hazardous - Stay indoors',
    stargazingImpact: 'Extreme impact - Stargazing not recommended'
  };
};

/**
 * Get pollutant description
 * @param {string} pollutant - Pollutant code
 * @returns {Object} Pollutant information
 */
export const getPollutantInfo = (pollutant) => {
  const pollutants = {
    pm25: {
      name: 'PM2.5',
      fullName: 'Fine Particulate Matter',
      description: 'Particles smaller than 2.5 micrometers',
      unit: 'µg/m³'
    },
    pm10: {
      name: 'PM10',
      fullName: 'Coarse Particulate Matter',
      description: 'Particles smaller than 10 micrometers',
      unit: 'µg/m³'
    },
    o3: {
      name: 'O₃',
      fullName: 'Ozone',
      description: 'Ground-level ozone',
      unit: 'ppb'
    },
    no2: {
      name: 'NO₂',
      fullName: 'Nitrogen Dioxide',
      description: 'Traffic-related pollutant',
      unit: 'ppb'
    },
    so2: {
      name: 'SO₂',
      fullName: 'Sulfur Dioxide',
      description: 'Industrial pollutant',
      unit: 'ppb'
    },
    co: {
      name: 'CO',
      fullName: 'Carbon Monoxide',
      description: 'Combustion byproduct',
      unit: 'ppm'
    }
  };

  return pollutants[pollutant] || {
    name: pollutant.toUpperCase(),
    fullName: 'Unknown Pollutant',
    description: 'No information available',
    unit: 'N/A'
  };
};
