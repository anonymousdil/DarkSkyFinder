import axios from 'axios';

/**
 * Service for fetching Air Quality Index (AQI) data
 * Uses Aqicn.org (WAQI) API for real-time air quality data
 */

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Get API keys from environment variables
const AQICN_API_KEY = import.meta.env.VITE_AQICN_API_TOKEN;
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

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
 * Convert OpenWeather AQI (1-5 scale) to US EPA AQI (0-500 scale)
 * OpenWeather uses a simplified 1-5 scale:
 * 1 = Good, 2 = Fair, 3 = Moderate, 4 = Poor, 5 = Very Poor
 * We map this to approximate US EPA AQI ranges for consistency
 * @param {number} owAqi - OpenWeather AQI (1-5)
 * @returns {number} Approximate US EPA AQI
 */
const convertOpenWeatherAQI = (owAqi) => {
  const aqiMap = {
    1: 25,   // Good: 0-50
    2: 75,   // Fair: 51-100
    3: 125,  // Moderate: 101-150
    4: 175,  // Poor: 151-200
    5: 250   // Very Poor: 201-300
  };
  return aqiMap[owAqi] || 50;
};

/**
 * Calculate US EPA AQI from pollutant concentration
 * Based on US EPA AQI calculation methodology
 * @param {string} pollutant - Pollutant type (pm25, pm10, o3, no2, so2, co)
 * @param {number} concentration - Concentration value
 * @returns {number} AQI value
 */
const calculateAQI = (pollutant, concentration) => {
  // AQI breakpoints [C_low, C_high, I_low, I_high]
  const breakpoints = {
    pm25: [
      [0, 12, 0, 50],
      [12.1, 35.4, 51, 100],
      [35.5, 55.4, 101, 150],
      [55.5, 150.4, 151, 200],
      [150.5, 250.4, 201, 300],
      [250.5, 500, 301, 500]
    ],
    pm10: [
      [0, 54, 0, 50],
      [55, 154, 51, 100],
      [155, 254, 101, 150],
      [255, 354, 151, 200],
      [355, 424, 201, 300],
      [425, 604, 301, 500]
    ],
    o3: [ // 8-hour O3 (ppb)
      [0, 54, 0, 50],
      [55, 70, 51, 100],
      [71, 85, 101, 150],
      [86, 105, 151, 200],
      [106, 200, 201, 300]
    ],
    no2: [ // 1-hour NO2 (ppb)
      [0, 53, 0, 50],
      [54, 100, 51, 100],
      [101, 360, 101, 150],
      [361, 649, 151, 200],
      [650, 1249, 201, 300],
      [1250, 2049, 301, 500]
    ],
    so2: [ // 1-hour SO2 (ppb)
      [0, 35, 0, 50],
      [36, 75, 51, 100],
      [76, 185, 101, 150],
      [186, 304, 151, 200],
      [305, 604, 201, 300],
      [605, 1004, 301, 500]
    ],
    co: [ // 8-hour CO (ppm)
      [0, 4.4, 0, 50],
      [4.5, 9.4, 51, 100],
      [9.5, 12.4, 101, 150],
      [12.5, 15.4, 151, 200],
      [15.5, 30.4, 201, 300],
      [30.5, 50.4, 301, 500]
    ]
  };

  const bp = breakpoints[pollutant];
  if (!bp) return null;

  for (const [cLow, cHigh, iLow, iHigh] of bp) {
    if (concentration >= cLow && concentration <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (concentration - cLow) + iLow);
    }
  }
  
  return null;
};

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
 * Fetch AQI data from OpenWeather Air Pollution API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} AQI data from OpenWeather
 */
const fetchFromOpenWeather = async (lat, lon) => {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OpenWeather API key not configured');
  }

  console.log('[AQI Service] Attempting to fetch from OpenWeather API...');
  
  const response = await fetchWithRetry(
    'https://api.openweathermap.org/data/2.5/air_pollution',
    {
      params: {
        lat,
        lon,
        appid: OPENWEATHER_API_KEY
      },
      timeout: API_CONFIG.timeout
    }
  );

  if (response.data && response.data.list && response.data.list.length > 0) {
    const data = response.data.list[0];
    const components = data.components;
    const aqi = data.main.aqi;

    // Convert concentrations from μg/m³ to appropriate units and calculate individual AQI values
    // OpenWeather provides concentrations in μg/m³, we need to convert and calculate AQI
    const pm25Aqi = components.pm2_5 ? calculateAQI('pm25', components.pm2_5) : null;
    const pm10Aqi = components.pm10 ? calculateAQI('pm10', components.pm10) : null;
    
    // Convert gases from μg/m³ to ppb/ppm for AQI calculation
    // Conversion factor: ppb = (μg/m³ × 24.45) / molecular_weight
    const o3Ppb = components.o3 ? (components.o3 * 24.45) / 48 : null;
    const no2Ppb = components.no2 ? (components.no2 * 24.45) / 46 : null;
    const so2Ppb = components.so2 ? (components.so2 * 24.45) / 64 : null;
    const coPpm = components.co ? components.co / 1000 : null;

    const o3Aqi = o3Ppb ? calculateAQI('o3', o3Ppb) : null;
    const no2Aqi = no2Ppb ? calculateAQI('no2', no2Ppb) : null;
    const so2Aqi = so2Ppb ? calculateAQI('so2', so2Ppb) : null;
    const coAqi = coPpm ? calculateAQI('co', coPpm) : null;

    // Calculate overall AQI as the maximum of individual pollutant AQIs
    const aqiValues = [pm25Aqi, pm10Aqi, o3Aqi, no2Aqi, so2Aqi, coAqi].filter(v => v !== null);
    const usAqi = aqiValues.length > 0 ? Math.max(...aqiValues) : convertOpenWeatherAQI(aqi);

    // Determine dominant pollutant
    let dominant = 'pm25';
    let maxAqi = 0;
    const pollutantMap = {
      pm25: pm25Aqi,
      pm10: pm10Aqi,
      o3: o3Aqi,
      no2: no2Aqi,
      so2: so2Aqi,
      co: coAqi
    };

    for (const [key, value] of Object.entries(pollutantMap)) {
      if (value !== null && value > maxAqi) {
        maxAqi = value;
        dominant = key;
      }
    }

    return {
      aqi: usAqi,
      pm25: components.pm2_5 ? Math.round(components.pm2_5) : null,
      pm10: components.pm10 ? Math.round(components.pm10) : null,
      o3: o3Ppb ? Math.round(o3Ppb) : null,
      no2: no2Ppb ? Math.round(no2Ppb) : null,
      so2: so2Ppb ? Math.round(so2Ppb) : null,
      co: coPpm ? Math.round(coPpm * 10) / 10 : null,
      dominant: dominant,
      station: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
      timestamp: data.dt ? data.dt * 1000 : Date.now(),
      source: 'OpenWeather',
      isMockData: false
    };
  }

  throw new Error('Invalid response from OpenWeather API');
};

/**
 * Fetch AQI data from AQICN (WAQI) API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} AQI data from AQICN
 */
const fetchFromAQICN = async (lat, lon) => {
  if (!AQICN_API_KEY) {
    throw new Error('AQICN API key not configured');
  }

  console.log('[AQI Service] Attempting to fetch from AQICN API...');

  const response = await fetchWithRetry(
    `https://api.waqi.info/feed/geo:${lat};${lon}/`,
    {
      params: {
        token: AQICN_API_KEY
      },
      timeout: API_CONFIG.timeout
    }
  );

  if (response.data && response.data.status === 'ok' && response.data.data) {
    const data = response.data.data;
    
    // Extract AQI value (already in US EPA scale)
    const usAqi = data.aqi;
    
    // Extract individual pollutant sub-indices from iaqi
    const iaqi = data.iaqi || {};
    
    const components = {
      pm2_5: iaqi.pm25 ? iaqi.pm25.v : null,
      pm10: iaqi.pm10 ? iaqi.pm10.v : null,
      o3: iaqi.o3 ? iaqi.o3.v : null,
      no2: iaqi.no2 ? iaqi.no2.v : null,
      so2: iaqi.so2 ? iaqi.so2.v : null,
      co: iaqi.co ? iaqi.co.v : null
    };
    
    // Mapping for converting component keys to pollutant codes
    const POLLUTANT_KEY_MAP = {
      'pm2_5': 'pm25',
      'pm10': 'pm10',
      'o3': 'o3',
      'no2': 'no2',
      'so2': 'so2',
      'co': 'co'
    };
    
    // Find the dominant pollutant (the one with highest sub-AQI)
    let dominant = 'pm25';
    let maxValue = 0;
    for (const [key, value] of Object.entries(components)) {
      if (value !== null && value > maxValue) {
        maxValue = value;
        dominant = POLLUTANT_KEY_MAP[key] || key;
      }
    }
    
    // Get station name from city data
    const stationName = data.city && data.city.name ? data.city.name : `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    
    return {
      aqi: usAqi,
      pm25: components.pm2_5 ? Math.round(components.pm2_5) : null,
      pm10: components.pm10 ? Math.round(components.pm10) : null,
      o3: components.o3 ? Math.round(components.o3) : null,
      no2: components.no2 ? Math.round(components.no2) : null,
      so2: components.so2 ? Math.round(components.so2) : null,
      co: components.co ? Math.round(components.co * 10) / 10 : null,
      dominant: dominant,
      station: stationName,
      timestamp: Date.now(),
      source: 'AQICN (WAQI)',
      isMockData: false
    };
  }

  throw new Error('Invalid response from AQICN API');
};

/**
 * Get AQI data for a location
 * Tries AQICN first, then OpenWeather as fallback, finally mock data
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

  let aqiData = null;
  let errors = [];

  // Try AQICN API first (primary source)
  try {
    aqiData = await fetchFromAQICN(lat, lon);
    console.log('[AQI Service] ✓ Successfully fetched real-time AQI data from AQICN');
  } catch (error) {
    errors.push(`AQICN: ${error.message}`);
    console.warn('[AQI Service] AQICN API failed:', error.message);
  }

  // If AQICN fails, try OpenWeather API (fallback)
  if (!aqiData) {
    try {
      aqiData = await fetchFromOpenWeather(lat, lon);
      console.log('[AQI Service] ✓ Successfully fetched real-time AQI data from OpenWeather (fallback)');
    } catch (error) {
      errors.push(`OpenWeather: ${error.message}`);
      console.warn('[AQI Service] OpenWeather API failed:', error.message);
    }
  }

  // If both APIs fail, use mock data
  if (!aqiData) {
    console.warn('[AQI Service] All API sources failed, using mock data as final fallback');
    console.warn('[AQI Service] Errors:', errors.join('; '));
    aqiData = getMockAQI(lat, lon);
  }

  // Validate data freshness (data should not be older than 3 hours)
  const dataAge = Date.now() - aqiData.timestamp;
  const MAX_DATA_AGE = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
  
  if (dataAge > MAX_DATA_AGE && !aqiData.isMockData) {
    console.warn(`[AQI Service] ⚠️ Warning: AQI data is ${Math.round(dataAge / 3600000)} hours old`);
    aqiData.isStale = true;
  } else {
    aqiData.isStale = false;
  }

  // Cache the result
  cache.set(cacheKey, {
    data: aqiData,
    timestamp: Date.now()
  });

  return aqiData;
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
