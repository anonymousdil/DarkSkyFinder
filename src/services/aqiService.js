import axios from 'axios';

/**
 * Service for fetching Air Quality Index (AQI) data
 * Uses OpenAQ API and WAQI (World Air Quality Index) as fallback
 */

// Cache for API responses
const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

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
    // Try WAQI API (World Air Quality Index) - free tier available
    // Note: For production, you might need an API token
    const response = await axios.get(`https://api.waqi.info/feed/geo:${lat};${lon}/`, {
      params: {
        token: 'demo' // Replace with actual token in production
      },
      timeout: 10000
    });

    if (response.data && response.data.status === 'ok' && response.data.data) {
      const data = response.data.data;
      const aqiData = {
        aqi: data.aqi || 'N/A',
        pm25: data.iaqi?.pm25?.v || null,
        pm10: data.iaqi?.pm10?.v || null,
        o3: data.iaqi?.o3?.v || null,
        no2: data.iaqi?.no2?.v || null,
        so2: data.iaqi?.so2?.v || null,
        co: data.iaqi?.co?.v || null,
        dominant: data.dominentpol || 'unknown',
        station: data.city?.name || 'Unknown',
        timestamp: Date.now(),
        source: 'WAQI'
      };

      // Cache the result
      cache.set(cacheKey, {
        data: aqiData,
        timestamp: Date.now()
      });

      return aqiData;
    }

    throw new Error('Invalid response from WAQI');
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
