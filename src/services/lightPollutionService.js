/**
 * Service for light pollution data and Bortle scale information
 * Uses a combination of geographic data and calculations
 */

// Cache for light pollution data
const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

/**
 * Get light pollution data for a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Light pollution data with Bortle scale
 */
export const getLightPollution = async (lat, lon) => {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data;
  }

  // In a production app, you would fetch from a light pollution API
  // For now, we'll use geographic heuristics to estimate light pollution
  const lightData = estimateLightPollution(lat, lon);

  // Cache the result
  cache.set(cacheKey, {
    data: lightData,
    timestamp: Date.now()
  });

  return lightData;
};

/**
 * Estimate light pollution based on geographic location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Object} Light pollution estimate
 */
const estimateLightPollution = (lat, lon) => {
  // Use a combination of latitude and longitude to create variation
  // This is a simplified heuristic - in production, use real data
  const seed = Math.abs(Math.sin(lat * 0.1) * Math.cos(lon * 0.1) * 100);
  
  // Determine Bortle class (1-9, where 1 is darkest)
  let bortleClass = Math.floor((seed % 7) + 1);
  
  // Adjust based on latitude (polar regions tend to be darker)
  if (Math.abs(lat) > 60) {
    bortleClass = Math.max(1, bortleClass - 2);
  }
  
  // Adjust based on longitude patterns (simulating populated areas)
  const populatedLongitudes = [-74, 0, 77, 121, 139]; // Major city longitudes
  const nearCity = populatedLongitudes.some(cityLon => Math.abs(lon - cityLon) < 5);
  if (nearCity) {
    bortleClass = Math.min(9, bortleClass + 3);
  }

  return {
    bortleClass,
    ...getBortleInfo(bortleClass),
    sqm: getBortleSQM(bortleClass),
    nelm: getBortleNELM(bortleClass),
    mpsas: getBortleMPSAS(bortleClass),
    timestamp: Date.now(),
    source: 'Estimated'
  };
};

/**
 * Get Bortle scale information
 * @param {number} bortleClass - Bortle class (1-9)
 * @returns {Object} Bortle scale information
 */
export const getBortleInfo = (bortleClass) => {
  const bortleScale = {
    1: {
      name: 'Excellent Dark Sky',
      color: '#000000',
      description: 'The Milky Way is highly visible with stunning detail. Zodiacal light is easily visible.',
      visibleStars: '7.6-8.0 magnitude',
      milkyWay: 'Highly detailed with visible structure',
      zodiacalLight: 'Clearly visible',
      airglow: 'Visible',
      stargazingQuality: 'Perfect - World-class dark sky',
      examples: 'Remote wilderness areas, dark sky reserves'
    },
    2: {
      name: 'Truly Dark Sky',
      color: '#0a0a0a',
      description: 'The Milky Way is still spectacular. Some light pollution visible on horizon.',
      visibleStars: '7.1-7.5 magnitude',
      milkyWay: 'Highly detailed with clear structure',
      zodiacalLight: 'Visible',
      airglow: 'Sometimes visible',
      stargazingQuality: 'Excellent - Outstanding dark sky',
      examples: 'Remote rural areas, national parks'
    },
    3: {
      name: 'Rural Sky',
      color: '#1a1a1a',
      description: 'The Milky Way is easily visible. Light pollution domes visible near the horizon.',
      visibleStars: '6.6-7.0 magnitude',
      milkyWay: 'Clearly visible with some detail',
      zodiacalLight: 'Visible in spring/autumn',
      airglow: 'Rarely visible',
      stargazingQuality: 'Very Good - Great for stargazing',
      examples: 'Rural areas, small towns'
    },
    4: {
      name: 'Rural/Suburban Transition',
      color: '#2d2d2d',
      description: 'The Milky Way is visible but washed out. Light pollution domes in several directions.',
      visibleStars: '6.1-6.5 magnitude',
      milkyWay: 'Visible but washed out',
      zodiacalLight: 'Barely visible',
      airglow: 'Not visible',
      stargazingQuality: 'Good - Suitable for most observations',
      examples: 'Rural areas near cities, outer suburbs'
    },
    5: {
      name: 'Suburban Sky',
      color: '#4a4a4a',
      description: 'The Milky Way is very weak or invisible. Only hints of its brightest parts visible.',
      visibleStars: '5.6-6.0 magnitude',
      milkyWay: 'Barely visible, only brightest parts',
      zodiacalLight: 'Not visible',
      airglow: 'Not visible',
      stargazingQuality: 'Fair - Limited by light pollution',
      examples: 'Suburban areas, small cities'
    },
    6: {
      name: 'Bright Suburban Sky',
      color: '#666666',
      description: 'The Milky Way is invisible. Sky is grayish-white. Only brighter stars visible.',
      visibleStars: '5.1-5.5 magnitude',
      milkyWay: 'Not visible',
      zodiacalLight: 'Not visible',
      airglow: 'Not visible',
      stargazingQuality: 'Poor - Significant light pollution',
      examples: 'Suburban areas, medium cities'
    },
    7: {
      name: 'Suburban/Urban Transition',
      color: '#8a8a8a',
      description: 'Sky is light gray or orange. The entire sky is affected by light pollution.',
      visibleStars: '4.6-5.0 magnitude',
      milkyWay: 'Not visible',
      zodiacalLight: 'Not visible',
      airglow: 'Not visible',
      stargazingQuality: 'Very Poor - Heavy light pollution',
      examples: 'Bright suburbs, city outskirts'
    },
    8: {
      name: 'City Sky',
      color: '#b3b3b3',
      description: 'Sky is whitish gray or orange. Only the brightest stars and planets are visible.',
      visibleStars: '4.1-4.5 magnitude',
      milkyWay: 'Not visible',
      zodiacalLight: 'Not visible',
      airglow: 'Not visible',
      stargazingQuality: 'Bad - Severe light pollution',
      examples: 'Cities, urban centers'
    },
    9: {
      name: 'Inner City Sky',
      color: '#ffffff',
      description: 'Sky is brilliantly lit. Only the Moon, planets, and brightest stars visible.',
      visibleStars: '<4.0 magnitude',
      milkyWay: 'Not visible',
      zodiacalLight: 'Not visible',
      airglow: 'Not visible',
      stargazingQuality: 'Terrible - Extreme light pollution',
      examples: 'City centers, downtown areas'
    }
  };

  return bortleScale[bortleClass] || bortleScale[5];
};

/**
 * Get Sky Quality Meter (SQM) reading for Bortle class
 * @param {number} bortleClass - Bortle class
 * @returns {number} SQM value in mag/arcsec²
 */
const getBortleSQM = (bortleClass) => {
  const sqmValues = {
    1: 21.7,
    2: 21.5,
    3: 21.3,
    4: 20.4,
    5: 19.1,
    6: 18.0,
    7: 19.0,
    8: 17.0,
    9: 16.0
  };
  return sqmValues[bortleClass] || 19.0;
};

/**
 * Get Naked Eye Limiting Magnitude (NELM) for Bortle class
 * @param {number} bortleClass - Bortle class
 * @returns {number} NELM value
 */
const getBortleNELM = (bortleClass) => {
  const nelmValues = {
    1: 7.8,
    2: 7.4,
    3: 6.8,
    4: 6.3,
    5: 5.8,
    6: 5.3,
    7: 4.8,
    8: 4.3,
    9: 3.8
  };
  return nelmValues[bortleClass] || 5.8;
};

/**
 * Get Magnitudes per Square Arcsecond (MPSAS) for Bortle class
 * @param {number} bortleClass - Bortle class
 * @returns {number} MPSAS value
 */
const getBortleMPSAS = (bortleClass) => {
  // MPSAS is essentially the same as SQM
  return getBortleSQM(bortleClass);
};

/**
 * Get stargazing recommendations based on Bortle class
 * @param {number} bortleClass - Bortle class
 * @returns {Object} Recommendations
 */
export const getStargazingRecommendations = (bortleClass) => {
  if (bortleClass <= 3) {
    return {
      recommended: true,
      activities: [
        'Deep sky observation (galaxies, nebulae)',
        'Milky Way photography',
        'Meteor shower observation',
        'Naked eye astronomy',
        'Wide-field astrophotography'
      ],
      bestTime: 'Any clear night',
      equipment: 'All types of telescopes and binoculars'
    };
  } else if (bortleClass <= 5) {
    return {
      recommended: true,
      activities: [
        'Bright deep sky objects',
        'Planetary observation',
        'Moon observation',
        'Limited Milky Way viewing',
        'Star cluster observation'
      ],
      bestTime: 'New moon nights recommended',
      equipment: 'Medium to large telescopes, light pollution filters helpful'
    };
  } else if (bortleClass <= 7) {
    return {
      recommended: false,
      activities: [
        'Planetary observation',
        'Moon observation',
        'Bright star clusters',
        'Double star observation'
      ],
      bestTime: 'New moon nights essential',
      equipment: 'Telescopes with light pollution filters required'
    };
  } else {
    return {
      recommended: false,
      activities: [
        'Moon observation',
        'Planetary observation (limited)',
        'Brightest stars only'
      ],
      bestTime: 'Consider traveling to darker location',
      equipment: 'Light pollution filters essential, limited effectiveness'
    };
  }
};

/**
 * Compare light pollution between two locations
 * @param {Object} location1 - First location data
 * @param {Object} location2 - Second location data
 * @returns {Object} Comparison result
 */
export const compareLocations = (location1, location2) => {
  const diff = location1.bortleClass - location2.bortleClass;
  
  return {
    better: diff < 0 ? 'location1' : diff > 0 ? 'location2' : 'equal',
    difference: Math.abs(diff),
    recommendation: diff === 0 
      ? 'Both locations have similar light pollution levels'
      : `${diff < 0 ? 'First' : 'Second'} location is ${Math.abs(diff)} Bortle class(es) darker`
  };
};
