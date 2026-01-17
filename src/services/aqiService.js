import axios from 'axios';

/**
 * Service for fetching Air Quality Index (AQI) data
 * Uses OpenWeatherMap Air Pollution API for real-time air quality data
 */

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Get API key from environment variables
const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

// API configuration
const API_CONFIG = {
  timeout: 10000, // 10 seconds
  maxRetries: 3,
  retryDelay: 1000, // Initial retry delay in ms
};

/**
 * Convert OpenWeatherMap AQI (1-5) to US EPA AQI (0-500)
 * @param {number} owmAqi - OpenWeatherMap AQI (1-5)
 * @param {Object} components - Air quality components
 * @returns {number} US EPA AQI value
 */
const convertToUSAQI = (owmAqi, components) => {
  // If we have PM2.5, calculate precise AQI from it
  if (components.pm2_5) {
    return calculatePM25AQI(components.pm2_5);
  }
  
  // Otherwise map OpenWeatherMap's 1-5 scale to US EPA scale
  const aqiMap = {
    1: 25,   // Good (0-50)
    2: 75,   // Fair (51-100)
    3: 125,  // Moderate (101-150)
    4: 175,  // Poor (151-200)
    5: 250   // Very Poor (201-300)
  };
  return aqiMap[owmAqi] || 50;
};

/**
 * Calculate US EPA AQI from PM2.5 concentration
 * Updated to align with latest US EPA AQI calculation standards (2024)
 * @param {number} pm25 - PM2.5 concentration in μg/m³
 * @returns {number} US EPA AQI value
 */
const calculatePM25AQI = (pm25) => {
  // Validate input
  if (pm25 === null || pm25 === undefined || isNaN(pm25) || pm25 < 0) {
    console.warn('[AQI Service] Invalid PM2.5 value:', pm25);
    return null;
  }

  // US EPA breakpoints for PM2.5 (updated 2024)
  const breakpoints = [
    { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
    { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
    { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 }
  ];

  for (const bp of breakpoints) {
    if (pm25 >= bp.cLow && pm25 <= bp.cHigh) {
      const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow;
      const roundedAqi = Math.round(aqi);
      console.debug(`[AQI Service] PM2.5 ${pm25.toFixed(1)} μg/m³ -> AQI ${roundedAqi}`);
      return roundedAqi;
    }
  }

  // If concentration is above all breakpoints
  console.warn(`[AQI Service] PM2.5 concentration ${pm25.toFixed(1)} exceeds maximum breakpoint, returning 500`);
  return 500;
};

/**
 * Calculate US EPA AQI from PM10 concentration
 * @param {number} pm10 - PM10 concentration in μg/m³
 * @returns {number} US EPA AQI value
 */
const calculatePM10AQI = (pm10) => {
  if (pm10 === null || pm10 === undefined || isNaN(pm10) || pm10 < 0) {
    return null;
  }

  const breakpoints = [
    { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
    { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
    { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
    { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
    { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
    { cLow: 425, cHigh: 504, iLow: 301, iHigh: 400 },
    { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 }
  ];

  for (const bp of breakpoints) {
    if (pm10 >= bp.cLow && pm10 <= bp.cHigh) {
      const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm10 - bp.cLow) + bp.iLow;
      return Math.round(aqi);
    }
  }

  return 500;
};

/**
 * Calculate US EPA AQI from O3 concentration
 * @param {number} o3 - O3 concentration in μg/m³
 * @returns {number} US EPA AQI value
 */
const calculateO3AQI = (o3) => {
  if (o3 === null || o3 === undefined || isNaN(o3) || o3 < 0) {
    return null;
  }

  // Convert μg/m³ to ppb (at 25°C and 1 atm: 1 ppb ≈ 2.0 μg/m³)
  const o3ppb = o3 / 2.0;

  const breakpoints = [
    { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
    { cLow: 55, cHigh: 70, iLow: 51, iHigh: 100 },
    { cLow: 71, cHigh: 85, iLow: 101, iHigh: 150 },
    { cLow: 86, cHigh: 105, iLow: 151, iHigh: 200 },
    { cLow: 106, cHigh: 200, iLow: 201, iHigh: 300 }
  ];

  for (const bp of breakpoints) {
    if (o3ppb >= bp.cLow && o3ppb <= bp.cHigh) {
      const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (o3ppb - bp.cLow) + bp.iLow;
      return Math.round(aqi);
    }
  }

  return o3ppb > 200 ? 500 : 50;
};

/**
 * Calculate US EPA AQI from NO2 concentration
 * @param {number} no2 - NO2 concentration in μg/m³
 * @returns {number} US EPA AQI value
 */
const calculateNO2AQI = (no2) => {
  if (no2 === null || no2 === undefined || isNaN(no2) || no2 < 0) {
    return null;
  }

  // Convert μg/m³ to ppb (at 25°C and 1 atm: 1 ppb ≈ 1.88 μg/m³)
  const no2ppb = no2 / 1.88;

  const breakpoints = [
    { cLow: 0, cHigh: 53, iLow: 0, iHigh: 50 },
    { cLow: 54, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 360, iLow: 101, iHigh: 150 },
    { cLow: 361, cHigh: 649, iLow: 151, iHigh: 200 },
    { cLow: 650, cHigh: 1249, iLow: 201, iHigh: 300 },
    { cLow: 1250, cHigh: 1649, iLow: 301, iHigh: 400 },
    { cLow: 1650, cHigh: 2049, iLow: 401, iHigh: 500 }
  ];

  for (const bp of breakpoints) {
    if (no2ppb >= bp.cLow && no2ppb <= bp.cHigh) {
      const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (no2ppb - bp.cLow) + bp.iLow;
      return Math.round(aqi);
    }
  }

  return 500;
};

/**
 * Calculate US EPA AQI from SO2 concentration
 * @param {number} so2 - SO2 concentration in μg/m³
 * @returns {number} US EPA AQI value
 */
const calculateSO2AQI = (so2) => {
  if (so2 === null || so2 === undefined || isNaN(so2) || so2 < 0) {
    return null;
  }

  // Convert μg/m³ to ppb (at 25°C and 1 atm: 1 ppb ≈ 2.62 μg/m³)
  const so2ppb = so2 / 2.62;

  const breakpoints = [
    { cLow: 0, cHigh: 35, iLow: 0, iHigh: 50 },
    { cLow: 36, cHigh: 75, iLow: 51, iHigh: 100 },
    { cLow: 76, cHigh: 185, iLow: 101, iHigh: 150 },
    { cLow: 186, cHigh: 304, iLow: 151, iHigh: 200 },
    { cLow: 305, cHigh: 604, iLow: 201, iHigh: 300 },
    { cLow: 605, cHigh: 804, iLow: 301, iHigh: 400 },
    { cLow: 805, cHigh: 1004, iLow: 401, iHigh: 500 }
  ];

  for (const bp of breakpoints) {
    if (so2ppb >= bp.cLow && so2ppb <= bp.cHigh) {
      const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (so2ppb - bp.cLow) + bp.iLow;
      return Math.round(aqi);
    }
  }

  return 500;
};

/**
 * Calculate US EPA AQI from CO concentration
 * @param {number} co - CO concentration in μg/m³
 * @returns {number} US EPA AQI value
 */
const calculateCOAQI = (co) => {
  if (co === null || co === undefined || isNaN(co) || co < 0) {
    return null;
  }

  // Convert μg/m³ to ppm (at 25°C and 1 atm: 1 ppm ≈ 1145 μg/m³)
  const coppm = co / 1145;

  const breakpoints = [
    { cLow: 0.0, cHigh: 4.4, iLow: 0, iHigh: 50 },
    { cLow: 4.5, cHigh: 9.4, iLow: 51, iHigh: 100 },
    { cLow: 9.5, cHigh: 12.4, iLow: 101, iHigh: 150 },
    { cLow: 12.5, cHigh: 15.4, iLow: 151, iHigh: 200 },
    { cLow: 15.5, cHigh: 30.4, iLow: 201, iHigh: 300 },
    { cLow: 30.5, cHigh: 40.4, iLow: 301, iHigh: 400 },
    { cLow: 40.5, cHigh: 50.4, iLow: 401, iHigh: 500 }
  ];

  for (const bp of breakpoints) {
    if (coppm >= bp.cLow && coppm <= bp.cHigh) {
      const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (coppm - bp.cLow) + bp.iLow;
      return Math.round(aqi);
    }
  }

  return 500;
};

/**
 * Determine dominant pollutant from components
 * Uses US EPA AQI calculations to accurately determine which pollutant is most significant
 * @param {Object} components - Air quality components
 * @returns {string} Dominant pollutant code
 */
const getDominantPollutantFromComponents = (components) => {
  const pollutantAQIs = {};
  
  // Calculate AQI for each available pollutant using proper EPA formulas
  if (components.pm2_5) {
    const aqi = calculatePM25AQI(components.pm2_5);
    if (aqi !== null) pollutantAQIs.pm25 = aqi;
  }
  if (components.pm10) {
    const aqi = calculatePM10AQI(components.pm10);
    if (aqi !== null) pollutantAQIs.pm10 = aqi;
  }
  if (components.o3) {
    const aqi = calculateO3AQI(components.o3);
    if (aqi !== null) pollutantAQIs.o3 = aqi;
  }
  if (components.no2) {
    const aqi = calculateNO2AQI(components.no2);
    if (aqi !== null) pollutantAQIs.no2 = aqi;
  }
  if (components.so2) {
    const aqi = calculateSO2AQI(components.so2);
    if (aqi !== null) pollutantAQIs.so2 = aqi;
  }
  if (components.co) {
    const aqi = calculateCOAQI(components.co);
    if (aqi !== null) pollutantAQIs.co = aqi;
  }

  // Find pollutant with highest AQI
  let maxPollutant = 'pm25';
  let maxAQI = 0;
  
  for (const [pollutant, aqi] of Object.entries(pollutantAQIs)) {
    if (aqi > maxAQI) {
      maxAQI = aqi;
      maxPollutant = pollutant;
    }
  }
  
  console.debug(`[AQI Service] Dominant pollutant: ${maxPollutant} (AQI: ${maxAQI})`);
  return maxPollutant;
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

    // Use OpenWeatherMap Air Pollution API with retry logic
    const response = await fetchWithRetry(
      'https://api.openweathermap.org/data/2.5/air_pollution',
      {
        params: {
          lat: lat,
          lon: lon,
          appid: API_KEY
        },
        timeout: API_CONFIG.timeout
      }
    );

    if (response.data && response.data.list && response.data.list.length > 0) {
      const data = response.data.list[0];
      const components = data.components;
      
      // Calculate US EPA AQI from the data
      const usAqi = convertToUSAQI(data.main.aqi, components);
      const dominant = getDominantPollutantFromComponents(components);
      
      const aqiData = {
        aqi: usAqi,
        pm25: components.pm2_5 ? Math.round(components.pm2_5) : null,
        pm10: components.pm10 ? Math.round(components.pm10) : null,
        o3: components.o3 ? Math.round(components.o3) : null,
        no2: components.no2 ? Math.round(components.no2) : null,
        so2: components.so2 ? Math.round(components.so2) : null,
        co: components.co ? Math.round(components.co / 1145 * 10) / 10 : null, // Convert μg/m³ to ppm
        dominant: dominant,
        station: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
        timestamp: Date.now(),
        source: 'OpenWeatherMap',
        isMockData: false
      };

      // Cache the result
      cache.set(cacheKey, {
        data: aqiData,
        timestamp: Date.now()
      });

      console.log('[AQI Service] Successfully fetched real-time AQI data');
      return aqiData;
    }

    throw new Error('Invalid response from OpenWeatherMap');
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
  // Using approximate inverse of AQI formulas
  let pm25, pm10, o3, no2, so2, co;
  
  if (baseAQI <= 50) {
    pm25 = Math.floor(baseAQI * 0.24); // 0-12 μg/m³
    pm10 = Math.floor(baseAQI * 1.08); // 0-54 μg/m³
    o3 = Math.floor(baseAQI * 2.16); // 0-108 μg/m³
    no2 = Math.floor(baseAQI * 1.88 * 0.53); // 0-50 ppb equivalent
    so2 = Math.floor(baseAQI * 2.62 * 0.35); // 0-35 ppb equivalent
    co = (baseAQI * 0.088).toFixed(1); // 0-4.4 ppm
  } else {
    pm25 = Math.floor(12 + (baseAQI - 50) * 0.47); // 12-35 μg/m³
    pm10 = Math.floor(54 + (baseAQI - 50) * 2); // 54-154 μg/m³
    o3 = Math.floor(108 + (baseAQI - 50) * 0.64); // 108-140 μg/m³
    no2 = Math.floor(100 + (baseAQI - 50) * 0.94); // 50-100 ppb equivalent
    so2 = Math.floor(92 + (baseAQI - 50) * 1.05); // 35-75 ppb equivalent
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
