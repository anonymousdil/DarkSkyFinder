import { getSunTimes } from './sunCalculationService';

/**
 * Service for calculating the best times for stargazing
 * Considers sunset, astronomical twilight, cloud cover, humidity, and light pollution
 */

/**
 * Calculate optimal stargazing times for a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Object} skyData - Sky viewability data (cloud cover, humidity, etc.)
 * @param {Object} lightData - Light pollution data (Bortle class)
 * @param {Date} date - Date for calculation (defaults to today)
 * @returns {Object} Stargazing time recommendations
 */
export const getBestStargazingTimes = (lat, lon, skyData, lightData, date = new Date()) => {
  // Get sun times for the location
  const sunTimes = getSunTimes(lat, lon, date);
  
  // Calculate quality scores for different factors
  const scores = {
    cloudCover: calculateCloudCoverScore(skyData?.cloudCover),
    humidity: calculateHumidityScore(skyData?.rh2m),
    lightPollution: calculateLightPollutionScore(lightData?.bortleClass),
    transparency: calculateTransparencyScore(skyData?.transparency)
  };
  
  // Calculate overall viewing quality (0-100)
  const overallQuality = Math.round(
    scores.cloudCover * 0.40 +      // Cloud cover most important (40%)
    scores.lightPollution * 0.30 +  // Light pollution (30%)
    scores.transparency * 0.20 +    // Atmospheric transparency (20%)
    scores.humidity * 0.10          // Humidity (10%)
  );
  
  // Get viewing quality category
  const qualityCategory = getQualityCategory(overallQuality);
  
  // Determine optimal time windows
  const timeWindows = calculateTimeWindows(sunTimes, overallQuality);
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    overallQuality,
    scores,
    skyData,
    lightData
  );
  
  return {
    sunTimes,
    scores,
    overallQuality,
    qualityCategory,
    timeWindows,
    recommendations,
    bestTime: timeWindows.optimal,
    calculated: new Date()
  };
};

/**
 * Calculate cloud cover score (0-100, higher is better)
 * @param {number} cloudCover - Cloud cover value (1-9 scale from 7Timer)
 * @returns {number} Score 0-100
 */
const calculateCloudCoverScore = (cloudCover) => {
  if (!cloudCover || cloudCover === 'unknown') return 50;
  
  // Convert 1-9 scale to 0-100 (inverted - lower cloud cover is better)
  const score = ((9 - cloudCover) / 8) * 100;
  return Math.max(0, Math.min(100, score));
};

/**
 * Calculate humidity score (0-100, higher is better)
 * @param {number} humidity - Relative humidity percentage
 * @returns {number} Score 0-100
 */
const calculateHumidityScore = (humidity) => {
  if (!humidity) return 50;
  
  // Lower humidity is better for stargazing
  // Optimal: 20-40%, Poor: >80%
  if (humidity <= 40) return 100;
  if (humidity <= 60) return 80;
  if (humidity <= 70) return 60;
  if (humidity <= 80) return 40;
  return 20;
};

/**
 * Calculate light pollution score (0-100, higher is better)
 * @param {number} bortleClass - Bortle scale class (1-9)
 * @returns {number} Score 0-100
 */
const calculateLightPollutionScore = (bortleClass) => {
  if (!bortleClass) return 50;
  
  // Convert Bortle 1-9 to 0-100 (inverted - lower Bortle is better)
  const score = ((9 - bortleClass) / 8) * 100;
  return Math.max(0, Math.min(100, score));
};

/**
 * Calculate transparency score (0-100, higher is better)
 * @param {number} transparency - Transparency value (1-8 scale from 7Timer)
 * @returns {number} Score 0-100
 */
const calculateTransparencyScore = (transparency) => {
  if (!transparency || transparency === 'unknown') return 50;
  
  // Convert 1-8 scale to 0-100 (higher transparency is better)
  const score = ((transparency - 1) / 7) * 100;
  return Math.max(0, Math.min(100, score));
};

/**
 * Get quality category based on overall score
 * @param {number} score - Overall quality score (0-100)
 * @returns {Object} Category information
 */
const getQualityCategory = (score) => {
  if (score >= 85) {
    return {
      level: 'Exceptional',
      color: '#4CAF50',
      emoji: '🌟',
      description: 'Perfect conditions for stargazing'
    };
  }
  if (score >= 70) {
    return {
      level: 'Excellent',
      color: '#8BC34A',
      emoji: '⭐',
      description: 'Great conditions for stargazing'
    };
  }
  if (score >= 55) {
    return {
      level: 'Good',
      color: '#CDDC39',
      emoji: '✨',
      description: 'Good conditions for stargazing'
    };
  }
  if (score >= 40) {
    return {
      level: 'Fair',
      color: '#FFC107',
      emoji: '🌤️',
      description: 'Acceptable conditions, some limitations'
    };
  }
  if (score >= 25) {
    return {
      level: 'Poor',
      color: '#FF9800',
      emoji: '☁️',
      description: 'Challenging conditions for stargazing'
    };
  }
  return {
    level: 'Very Poor',
    color: '#F44336',
    emoji: '🌧️',
    description: 'Not recommended for stargazing'
  };
};

/**
 * Calculate optimal time windows for stargazing
 * @param {Object} sunTimes - Sun times from getSunTimes
 * @param {number} quality - Overall quality score
 * @returns {Object} Time windows
 */
const calculateTimeWindows = (sunTimes, quality) => {
  const windows = {
    optimal: null,
    acceptable: [],
    allNight: null
  };
  
  if (!sunTimes.astronomicalTwilight.dusk || !sunTimes.astronomicalTwilight.dawn) {
    return windows;
  }
  
  const dusk = sunTimes.astronomicalTwilight.dusk;
  const dawn = sunTimes.astronomicalTwilight.dawn;
  
  // Astronomical dark period is the all-night window
  windows.allNight = {
    start: dusk,
    end: dawn,
    duration: calculateDuration(dusk, dawn)
  };
  
  // If quality is good, the entire astronomical dark period is optimal
  if (quality >= 55) {
    windows.optimal = {
      start: dusk,
      end: dawn,
      duration: calculateDuration(dusk, dawn),
      description: 'Entire astronomical dark period'
    };
  } else if (quality >= 25) {
    // For fair conditions, recommend middle of the night (darkest time)
    // Handle midnight crossing properly
    const duskTime = dusk.getTime();
    const dawnTime = dawn.getTime();
    
    let midNight;
    if (dawnTime > duskTime) {
      // Same night, no midnight crossing
      midNight = new Date((duskTime + dawnTime) / 2);
    } else {
      // Crosses midnight
      midNight = new Date(((duskTime + dawnTime + 24 * 60 * 60 * 1000) / 2));
    }
    
    const twoHoursBefore = new Date(midNight.getTime() - 2 * 60 * 60 * 1000);
    const twoHoursAfter = new Date(midNight.getTime() + 2 * 60 * 60 * 1000);
    
    windows.optimal = {
      start: twoHoursBefore,
      end: twoHoursAfter,
      duration: '4 hours',
      description: 'Peak darkness around midnight'
    };
  }
  
  // Add acceptable windows (civil/nautical twilight for Moon/planet viewing)
  if (sunTimes.civilTwilight.dusk && sunTimes.astronomicalTwilight.dusk) {
    windows.acceptable.push({
      start: sunTimes.civilTwilight.dusk,
      end: sunTimes.astronomicalTwilight.dusk,
      description: 'Early evening twilight - good for planets and Moon',
      type: 'evening_twilight'
    });
  }
  
  if (sunTimes.astronomicalTwilight.dawn && sunTimes.civilTwilight.dawn) {
    windows.acceptable.push({
      start: sunTimes.astronomicalTwilight.dawn,
      end: sunTimes.civilTwilight.dawn,
      description: 'Morning twilight - good for planets and Moon',
      type: 'morning_twilight'
    });
  }
  
  return windows;
};

/**
 * Calculate duration between two times
 * @param {Date} start - Start time
 * @param {Date} end - End time
 * @returns {string} Duration string
 */
const calculateDuration = (start, end) => {
  let duration = end.getTime() - start.getTime();
  
  // Handle crossing midnight
  if (duration < 0) {
    duration += 24 * 60 * 60 * 1000;
  }
  
  const hours = Math.floor(duration / (60 * 60 * 1000));
  const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours === 0) return `${minutes} minutes`;
  if (minutes === 0) return `${hours} hours`;
  return `${hours}h ${minutes}m`;
};

/**
 * Generate specific recommendations based on conditions
 * @param {number} overallQuality - Overall quality score
 * @param {Object} scores - Individual factor scores
 * @param {Object} skyData - Sky data
 * @param {Object} lightData - Light pollution data
 * @returns {Array} Array of recommendation strings
 */
const generateRecommendations = (overallQuality, scores, skyData, lightData) => {
  const recommendations = [];
  
  // Cloud cover recommendations
  if (scores.cloudCover < 40) {
    recommendations.push('⚠️ High cloud cover expected - visibility may be limited');
  } else if (scores.cloudCover >= 80) {
    recommendations.push('✅ Clear skies expected - excellent visibility');
  }
  
  // Humidity recommendations
  if (scores.humidity < 50) {
    recommendations.push('⚠️ High humidity may cause hazy conditions');
  } else if (scores.humidity >= 80) {
    recommendations.push('✅ Low humidity - crisp, clear viewing conditions');
  }
  
  // Light pollution recommendations
  if (lightData?.bortleClass <= 3) {
    recommendations.push('✅ Dark skies - perfect for deep sky objects and Milky Way');
  } else if (lightData?.bortleClass >= 7) {
    recommendations.push('⚠️ Significant light pollution - focus on Moon, planets, and bright objects');
    recommendations.push('💡 Consider using a light pollution filter');
  }
  
  // Transparency recommendations
  if (scores.transparency < 50) {
    recommendations.push('⚠️ Poor atmospheric transparency - fainter objects may be difficult');
  }
  
  // Overall recommendations
  if (overallQuality >= 70) {
    recommendations.push('🌟 Excellent night for stargazing - great for all types of observations');
  } else if (overallQuality < 40) {
    recommendations.push('💡 Consider waiting for better conditions or focusing on bright objects');
  }
  
  // Moon phase recommendation (placeholder - could be enhanced with moon phase calculation)
  recommendations.push('🌙 Check moon phase - new moon nights offer the darkest skies');
  
  return recommendations;
};

/**
 * Get next best stargazing window in the near future
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Object} skyData - Sky viewability data
 * @param {Object} lightData - Light pollution data
 * @param {number} daysToCheck - Number of days to check (default 7)
 * @returns {Object} Next best window information
 */
export const getNextBestWindow = async (lat, lon, skyData, lightData, daysToCheck = 7) => {
  const today = new Date();
  const windows = [];
  
  for (let i = 0; i < daysToCheck; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    
    const result = getBestStargazingTimes(lat, lon, skyData, lightData, checkDate);
    
    if (result.overallQuality >= 55) {
      windows.push({
        date: checkDate,
        quality: result.overallQuality,
        window: result.timeWindows.optimal
      });
    }
  }
  
  if (windows.length === 0) {
    return null;
  }
  
  // Sort by quality and return the best
  windows.sort((a, b) => b.quality - a.quality);
  return windows[0];
};
