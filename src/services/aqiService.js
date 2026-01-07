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
 * @param {number} pm25 - PM2.5 concentration in μg/m³
 * @returns {number} US EPA AQI value
 */
const calculatePM25AQI = (pm25) => {
  // US EPA breakpoints for PM2.5
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
      return Math.round(aqi);
    }
  }

  // If concentration is above all breakpoints
  return 500;
};

/**
 * Determine dominant pollutant from components
 * @param {Object} components - Air quality components
 * @returns {string} Dominant pollutant code
 */
const getDominantPollutantFromComponents = (components) => {
  const pollutantAQIs = {};
  
  if (components.pm2_5) pollutantAQIs.pm25 = calculatePM25AQI(components.pm2_5);
  if (components.pm10) pollutantAQIs.pm10 = components.pm10 * 0.5; // Simplified conversion
  if (components.o3) pollutantAQIs.o3 = components.o3 * 0.4;
  if (components.no2) pollutantAQIs.no2 = components.no2 * 0.3;
  if (components.so2) pollutantAQIs.so2 = components.so2 * 0.2;
  if (components.co) pollutantAQIs.co = components.co * 0.001;

  let maxPollutant = 'pm25';
  let maxValue = 0;
  
  for (const [pollutant, value] of Object.entries(pollutantAQIs)) {
    if (value > maxValue) {
      maxValue = value;
      maxPollutant = pollutant;
    }
  }
  
  return maxPollutant;
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
    return cachedData.data;
  }

  try {
    // Use OpenWeatherMap Air Pollution API
    const response = await axios.get('https://api.openweathermap.org/data/2.5/air_pollution', {
      params: {
        lat: lat,
        lon: lon,
        appid: API_KEY || 'demo'
      },
      timeout: 10000
    });

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
        co: components.co ? Math.round(components.co / 100) / 10 : null, // Convert to ppm
        dominant: dominant,
        station: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
        timestamp: Date.now(),
        source: 'OpenWeatherMap'
      };

      // Cache the result
      cache.set(cacheKey, {
        data: aqiData,
        timestamp: Date.now()
      });

      return aqiData;
    }

    throw new Error('Invalid response from OpenWeatherMap');
  } catch (error) {
    console.warn('Error fetching real AQI data, using mock data:', error.message);
    
    // Return enhanced mock data as fallback
    return getMockAQI(lat, lon);
  }
};

/**
 * Generate mock AQI data (fallback)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Object} Mock AQI data
 */
const getMockAQI = (lat, lon) => {
  // Generate deterministic but varied AQI based on location
  const seed = Math.abs(Math.sin(lat) * Math.cos(lon) * 10000);
  const baseAQI = Math.floor((seed % 120) + 10);
  
  return {
    aqi: baseAQI,
    pm25: Math.floor(baseAQI * 0.4),
    pm10: Math.floor(baseAQI * 0.6),
    o3: Math.floor(baseAQI * 0.5),
    no2: Math.floor(baseAQI * 0.3),
    so2: Math.floor(baseAQI * 0.2),
    co: Math.floor(baseAQI * 0.7),
    dominant: getDominantPollutant(baseAQI),
    station: `Station ${Math.floor(seed % 1000)}`,
    timestamp: Date.now(),
    source: 'Mock Data'
  };
};

/**
 * Determine dominant pollutant based on AQI
 * @param {number} aqi - AQI value
 * @returns {string} Pollutant name
 */
const getDominantPollutant = (aqi) => {
  if (aqi < 50) return 'pm25';
  if (aqi < 80) return 'o3';
  if (aqi < 100) return 'pm10';
  return 'no2';
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
