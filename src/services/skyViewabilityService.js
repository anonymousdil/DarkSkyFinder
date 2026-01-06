import axios from 'axios';

/**
 * Service for fetching sky viewability and astronomical weather data
 * Uses 7Timer! API for astronomical weather forecasting
 * Documentation: http://www.7timer.info/doc.php
 */

// Cache for API responses to avoid excessive calls
const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Fetch astronomical weather data from 7Timer!
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Sky viewability data
 */
export const getSkyViewability = async (lat, lon) => {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data;
  }

  try {
    // Use 7Timer! ASTRO API for astronomical weather
    const response = await axios.get('http://www.7timer.info/bin/astro.php', {
      params: {
        lon: lon.toFixed(2),
        lat: lat.toFixed(2),
        ac: 0, // 0 = no cloud cover in percentage
        unit: 'metric',
        output: 'json',
        tzshift: 0
      },
      timeout: 10000
    });

    if (response.data && response.data.dataseries) {
      const currentForecast = response.data.dataseries[0]; // Get current/next forecast
      
      const skyData = {
        cloudCover: currentForecast.cloudcover || 'unknown',
        seeing: currentForecast.seeing || 'unknown',
        transparency: currentForecast.transparency || 'unknown',
        lifted_index: currentForecast.lifted_index || 0,
        rh2m: currentForecast.rh2m || 0,
        wind10m: currentForecast.wind10m || {},
        temp2m: currentForecast.temp2m || 0,
        prec_type: currentForecast.prec_type || 'none',
        timestamp: Date.now(),
        source: '7Timer! ASTRO'
      };

      // Cache the result
      cache.set(cacheKey, {
        data: skyData,
        timestamp: Date.now()
      });

      return skyData;
    }

    throw new Error('Invalid response from 7Timer!');
  } catch (error) {
    console.error('Error fetching sky viewability data:', error);
    
    // Return mock data as fallback
    return getMockSkyData();
  }
};

/**
 * Get mock sky viewability data (fallback)
 * @returns {Object} Mock sky data
 */
const getMockSkyData = () => {
  const cloudCovers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const seeingLevels = [1, 2, 3, 4, 5, 6, 7, 8];
  const transparencies = [1, 2, 3, 4, 5, 6, 7, 8];
  
  return {
    cloudCover: cloudCovers[Math.floor(Math.random() * cloudCovers.length)],
    seeing: seeingLevels[Math.floor(Math.random() * seeingLevels.length)],
    transparency: transparencies[Math.floor(Math.random() * transparencies.length)],
    lifted_index: Math.floor(Math.random() * 20) - 10,
    rh2m: Math.floor(Math.random() * 100),
    wind10m: {
      direction: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
      speed: Math.floor(Math.random() * 5) + 1
    },
    temp2m: Math.floor(Math.random() * 30) - 5,
    prec_type: 'none',
    timestamp: Date.now(),
    source: 'Mock Data'
  };
};

/**
 * Interpret cloud cover value
 * @param {number} cloudCover - Cloud cover value (1-9)
 * @returns {Object} Description and quality
 */
export const interpretCloudCover = (cloudCover) => {
  const levels = {
    1: { text: '0%-6%', quality: 'Excellent', color: '#4CAF50' },
    2: { text: '6%-19%', quality: 'Very Good', color: '#8BC34A' },
    3: { text: '19%-31%', quality: 'Good', color: '#CDDC39' },
    4: { text: '31%-44%', quality: 'Fair', color: '#FFEB3B' },
    5: { text: '44%-56%', quality: 'Moderate', color: '#FFC107' },
    6: { text: '56%-69%', quality: 'Poor', color: '#FF9800' },
    7: { text: '69%-81%', quality: 'Very Poor', color: '#FF5722' },
    8: { text: '81%-94%', quality: 'Bad', color: '#F44336' },
    9: { text: '94%-100%', quality: 'Overcast', color: '#9C27B0' }
  };
  
  return levels[cloudCover] || { text: 'Unknown', quality: 'N/A', color: '#999' };
};

/**
 * Interpret seeing conditions (atmospheric turbulence)
 * @param {number} seeing - Seeing value (1-8)
 * @returns {Object} Description and arc seconds
 */
export const interpretSeeing = (seeing) => {
  const levels = {
    1: { text: '<0.5"', quality: 'Excellent', description: 'Perfect for planetary observation' },
    2: { text: '0.5"-0.75"', quality: 'Very Good', description: 'Great for planets' },
    3: { text: '0.75"-1"', quality: 'Good', description: 'Good for most observations' },
    4: { text: '1"-1.25"', quality: 'Fair', description: 'Acceptable conditions' },
    5: { text: '1.25"-1.5"', quality: 'Moderate', description: 'Moderate turbulence' },
    6: { text: '1.5"-2"', quality: 'Poor', description: 'Challenging conditions' },
    7: { text: '2"-2.5"', quality: 'Very Poor', description: 'Poor for detailed views' },
    8: { text: '>2.5"', quality: 'Bad', description: 'Very poor conditions' }
  };
  
  return levels[seeing] || { text: 'Unknown', quality: 'N/A', description: 'Data unavailable' };
};

/**
 * Interpret transparency (atmospheric clarity)
 * @param {number} transparency - Transparency value (1-8)
 * @returns {Object} Description and magnitude limit
 */
export const interpretTransparency = (transparency) => {
  const levels = {
    1: { text: 'Mag <3', quality: 'Very Poor', description: 'Heavy haze or fog' },
    2: { text: 'Mag 3-4', quality: 'Poor', description: 'Significant haze' },
    3: { text: 'Mag 4-5', quality: 'Moderate', description: 'Light haze' },
    4: { text: 'Mag 5-6', quality: 'Fair', description: 'Slight haze' },
    5: { text: 'Mag 6-7', quality: 'Good', description: 'Clear skies' },
    6: { text: 'Mag 7-8', quality: 'Very Good', description: 'Very clear' },
    7: { text: 'Mag 8-9', quality: 'Excellent', description: 'Exceptionally clear' },
    8: { text: 'Mag >9', quality: 'Perfect', description: 'Perfect transparency' }
  };
  
  return levels[transparency] || { text: 'Unknown', quality: 'N/A', description: 'Data unavailable' };
};

/**
 * Get overall stargazing quality rating
 * @param {Object} skyData - Sky viewability data
 * @returns {Object} Overall rating
 */
export const getStargazingQuality = (skyData) => {
  const { cloudCover, seeing, transparency } = skyData;
  
  // Calculate score (lower cloud cover, higher seeing and transparency are better)
  const cloudScore = 10 - (cloudCover || 5);
  const seeingScore = seeing || 4;
  const transparencyScore = transparency || 4;
  
  const totalScore = cloudScore * 0.5 + seeingScore * 0.25 + transparencyScore * 0.25;
  
  if (totalScore >= 8) return { rating: 'Excellent', color: '#4CAF50', emoji: '🌟' };
  if (totalScore >= 6) return { rating: 'Very Good', color: '#8BC34A', emoji: '⭐' };
  if (totalScore >= 4.5) return { rating: 'Good', color: '#CDDC39', emoji: '✨' };
  if (totalScore >= 3) return { rating: 'Fair', color: '#FFC107', emoji: '🌤️' };
  if (totalScore >= 2) return { rating: 'Poor', color: '#FF9800', emoji: '☁️' };
  return { rating: 'Very Poor', color: '#F44336', emoji: '🌧️' };
};
