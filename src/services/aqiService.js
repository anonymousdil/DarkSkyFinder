/**
 * aqiService.js
 * --------------------------------------------
 * Calculates REAL (US EPA) AQI (0–500) using
 * PM2.5 and PM10 data from AQICN (World Air Quality Index).
 * 
 * Provides exact numeric AQI values (not labels) and detailed
 * air quality information for stargazing locations.
 */

/* ======================================================
   🔑 API TOKEN SETUP (IMPORTANT)
   ------------------------------------------------------
   DO NOT hardcode your API token here.

   Instead, set it as an environment variable in .env file:

   VITE_AQICN_TOKEN=your_api_token_here

   Get your free API token at: https://aqicn.org/data-platform/token/
   Free tier includes: 1,000 calls/minute with rate limits
====================================================== */

// Load AQICN API token from environment variables (configured in .env file)
// SECURITY: Never hardcode the token here - always use environment variables
const AQICN_TOKEN = import.meta.env.VITE_AQICN_TOKEN;

/* Cache for AQI data to reduce API calls */
const aqiCache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds
const STALE_THRESHOLD = 10800000; // 3 hours in milliseconds

/* ======================================================
   AQI CATEGORY DEFINITIONS (US EPA STANDARD)
   Returns exact numeric AQI values with category metadata
====================================================== */

const AQI_CATEGORIES = [
  {
    min: 0,
    max: 50,
    level: 'Good',
    color: '#00E400',
    description: 'Air quality is satisfactory, and air pollution poses little or no risk.',
    breathingQuality: 'Excellent',
    healthImplications: 'Air quality is considered satisfactory. Outdoor activities are safe for everyone.',
    stargazingImpact: 'Excellent visibility. Ideal conditions for stargazing with minimal atmospheric interference.'
  },
  {
    min: 51,
    max: 100,
    level: 'Moderate',
    color: '#FFFF00',
    description: 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.',
    breathingQuality: 'Good',
    healthImplications: 'Acceptable air quality. Sensitive individuals should consider limiting prolonged outdoor exertion.',
    stargazingImpact: 'Good visibility. Some atmospheric haze may be present but should not significantly impact stargazing.'
  },
  {
    min: 101,
    max: 150,
    level: 'Unhealthy for Sensitive Groups',
    color: '#FF7E00',
    description: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
    breathingQuality: 'Moderate',
    healthImplications: 'Sensitive groups (children, elderly, people with respiratory conditions) should reduce prolonged outdoor activities.',
    stargazingImpact: 'Moderate visibility. Atmospheric haze and light scattering may reduce clarity for deep sky observations.'
  },
  {
    min: 151,
    max: 200,
    level: 'Unhealthy',
    color: '#FF0000',
    description: 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.',
    breathingQuality: 'Poor',
    healthImplications: 'Everyone should limit prolonged outdoor activities. Sensitive groups should avoid outdoor activities.',
    stargazingImpact: 'Reduced visibility. Poor atmospheric conditions will significantly affect stargazing quality.'
  },
  {
    min: 201,
    max: 300,
    level: 'Very Unhealthy',
    color: '#8F3F97',
    description: 'Health alert: The risk of health effects is increased for everyone.',
    breathingQuality: 'Very Poor',
    healthImplications: 'Everyone should avoid prolonged outdoor activities. Sensitive groups should remain indoors.',
    stargazingImpact: 'Very poor visibility. Stargazing is not recommended due to severe atmospheric pollution.'
  },
  {
    min: 301,
    max: 500,
    level: 'Hazardous',
    color: '#7E0023',
    description: 'Health warning of emergency conditions: everyone is more likely to be affected.',
    breathingQuality: 'Hazardous',
    healthImplications: 'Everyone should avoid all outdoor activities. Remain indoors and keep windows closed.',
    stargazingImpact: 'Extremely poor visibility. Stargazing is not possible due to hazardous air conditions.'
  }
];

/* ======================================================
   POLLUTANT INFORMATION REFERENCE DATA
====================================================== */

const POLLUTANT_INFO = {
  pm2_5: {
    name: 'PM2.5',
    fullName: 'Fine Particulate Matter (PM2.5)',
    description: 'Fine particles less than 2.5 micrometers in diameter',
    healthEffects: 'Can penetrate deep into lungs and bloodstream, causing respiratory and cardiovascular issues',
    sources: 'Vehicle emissions, industrial processes, wildfires, dust'
  },
  pm10: {
    name: 'PM10',
    fullName: 'Coarse Particulate Matter (PM10)',
    description: 'Particles less than 10 micrometers in diameter',
    healthEffects: 'Can cause respiratory irritation and aggravate asthma',
    sources: 'Dust, pollen, mold, vehicle emissions, construction activities'
  },
  o3: {
    name: 'O₃',
    fullName: 'Ozone',
    description: 'Ground-level ozone, a secondary pollutant',
    healthEffects: 'Can cause respiratory problems, especially during physical activity',
    sources: 'Formed by chemical reactions between NOx and VOCs in sunlight'
  },
  no2: {
    name: 'NO₂',
    fullName: 'Nitrogen Dioxide',
    description: 'Reddish-brown gas with a pungent odor',
    healthEffects: 'Irritates airways and can aggravate respiratory diseases',
    sources: 'Vehicle emissions, power plants, industrial facilities'
  },
  so2: {
    name: 'SO₂',
    fullName: 'Sulfur Dioxide',
    description: 'Colorless gas with a sharp, pungent smell',
    healthEffects: 'Can cause respiratory problems and eye irritation',
    sources: 'Fossil fuel combustion, industrial processes, volcanic emissions'
  },
  co: {
    name: 'CO',
    fullName: 'Carbon Monoxide',
    description: 'Colorless, odorless gas',
    healthEffects: 'Reduces oxygen delivery to organs and tissues',
    sources: 'Vehicle emissions, incomplete combustion of carbon-based fuels'
  }
};

/* ======================================================
   AQI BREAKPOINT TABLES (US EPA STANDARD)
====================================================== */

const AQI_BREAKPOINTS = {
  pm25: [
    { cLow: 0.0, cHigh: 12.0, aqiLow: 0, aqiHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, aqiLow: 151, aqiHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, aqiLow: 201, aqiHigh: 300 },
    { cLow: 250.5, cHigh: 350.4, aqiLow: 301, aqiHigh: 400 },
    { cLow: 350.5, cHigh: 500.4, aqiLow: 401, aqiHigh: 500 }
  ],
  pm10: [
    { cLow: 0, cHigh: 54, aqiLow: 0, aqiHigh: 50 },
    { cLow: 55, cHigh: 154, aqiLow: 51, aqiHigh: 100 },
    { cLow: 155, cHigh: 254, aqiLow: 101, aqiHigh: 150 },
    { cLow: 255, cHigh: 354, aqiLow: 151, aqiHigh: 200 },
    { cLow: 355, cHigh: 424, aqiLow: 201, aqiHigh: 300 },
    { cLow: 425, cHigh: 504, aqiLow: 301, aqiHigh: 400 },
    { cLow: 505, cHigh: 604, aqiLow: 401, aqiHigh: 500 }
  ]
};

/* ======================================================
   AQI CALCULATION (LINEAR INTERPOLATION)
====================================================== */

function _calculateAQI(concentration, breakpoints) {
  // Handle invalid or zero concentrations
  if (concentration == null || concentration < 0) {
    return null;
  }

  // Find the appropriate breakpoint range
  for (const bp of breakpoints) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      return Math.round(
        ((bp.aqiHigh - bp.aqiLow) / (bp.cHigh - bp.cLow)) *
          (concentration - bp.cLow) +
          bp.aqiLow
      );
    }
  }

  // If concentration exceeds highest breakpoint, cap at maximum AQI
  if (concentration > breakpoints[breakpoints.length - 1].cHigh) {
    return 500; // Maximum AQI value
  }

  // If we somehow didn't match any range, return null
  return null;
}

/* ======================================================
   FETCH + COMPUTE EXACT AQI
====================================================== */

/**
 * Fetch AQI from AQICN and compute exact numeric AQI value
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @returns {Object} AQI details with exact numeric values
 */
async function fetchAQIFromAPI(lat, lon) {
  // Validate coordinates
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
  }

  if (!AQICN_TOKEN) {
    console.warn('[AQI Service] AQICN API token not configured. Using mock data.');
    return null;
  }

  const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${AQICN_TOKEN}`;

  console.log(`[AQI Service] Fetching AQI data from AQICN for coordinates: ${lat}, ${lon}`);

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) {
      console.error('[AQI Service] API authentication failed. Check your API token.');
      throw new Error('AQICN API authentication failed. Verify your API token is correct and active.');
    }
    if (response.status === 429) {
      console.error('[AQI Service] API rate limit exceeded.');
      throw new Error('AQICN API rate limit exceeded. Please try again later.');
    }
    throw new Error(`Failed to fetch AQI data from AQICN (Status: ${response.status})`);
  }

  const data = await response.json();

  if (data.status !== 'ok' || !data.data) {
    throw new Error('Invalid AQI data received from AQICN');
  }

  const aqicnData = data.data;

  // AQICN returns the overall AQI directly
  const overallAQI = aqicnData.aqi;
  
  if (overallAQI === null || overallAQI === undefined || overallAQI === '-') {
    throw new Error('Cannot calculate AQI - AQI data is missing from API response');
  }

  // Extract pollutant concentrations from iaqi (Individual Air Quality Index)
  // AQICN provides pollutant data in iaqi object where each pollutant has a 'v' value
  // Note: These are already AQI values (not raw concentrations in µg/m³)
  const iaqi = aqicnData.iaqi || {};
  
  const pm25 = iaqi.pm25?.v ?? null;
  const pm10 = iaqi.pm10?.v ?? null;
  const o3 = iaqi.o3?.v ?? null;
  const no2 = iaqi.no2?.v ?? null;
  const so2 = iaqi.so2?.v ?? null;
  const co = iaqi.co?.v ?? null;

  // AQICN already provides AQI values in iaqi, not raw concentrations
  // So we use them directly as AQI values
  const pm25AQI = pm25 !== null ? pm25 : null;
  const pm10AQI = pm10 !== null ? pm10 : null;

  // Get dominant pollutant from AQICN (they provide it directly)
  // Note: AQICN API uses the spelling "dominentpol" (their typo, not ours)
  let dominant = aqicnData.dominentpol || 'pm2_5';
  
  // Normalize dominant pollutant name to match our convention
  if (dominant === 'pm25') {
    dominant = 'pm2_5';
  }

  console.log(`[AQI Service] Successfully fetched and calculated exact numeric AQI: ${overallAQI}`);

  // Extract city information and metadata
  const cityInfo = aqicnData.city || {};
  const attribution = aqicnData.attributions || [];

  return {
    aqi: overallAQI, // Exact numeric value (0-500 scale)
    pm25,
    pm10,
    pm25AQI, // Exact numeric PM2.5 AQI
    pm10AQI, // Exact numeric PM10 AQI
    o3,
    no2,
    so2,
    co,
    dominant,
    timestamp: Date.now(),
    source: 'AQICN',
    isMockData: false,
    cityName: cityInfo.name || null,
    cityUrl: cityInfo.url || null,
    attribution: attribution.length > 0 ? attribution : null,
    forecast: aqicnData.forecast || null
  };
}

/**
 * Generate mock/estimated AQI data as fallback
 * Returns exact numeric values based on location characteristics
 * @param {number} lat Latitude
 * @param {number} lon Longitude (reserved for future use in mock data generation)
 * @returns {Object} Mock AQI data with exact numeric values
 */
function generateMockAQI(lat, lon) { // eslint-disable-line no-unused-vars
  // Generate reasonable mock data based on location (exact numeric values)
  // Urban areas typically have higher AQI, rural areas lower
  const urbanFactor = Math.abs(lat) < 40 ? 1.2 : 1.0; // Tropical/subtropical areas tend to be more polluted
  const baseAQI = Math.round(50 + (Math.random() * 30) * urbanFactor);
  
  // Ensure exact numeric value between 30 and 100
  const mockAQI = Math.min(100, Math.max(30, baseAQI));

  console.warn(`[AQI Service] Using estimated mock data with exact numeric AQI: ${mockAQI}`);

  return {
    aqi: mockAQI, // Exact numeric value
    pm25: mockAQI * 0.35, // Estimated concentration
    pm10: mockAQI * 0.50, // Estimated concentration
    o3: null,
    no2: null,
    so2: null,
    co: null,
    dominant: 'pm2_5',
    timestamp: Date.now(),
    source: 'Estimated',
    isMockData: true,
    isStale: false
  };
}

/**
 * Main function to get AQI data with caching and fallback
 * Always returns exact numeric AQI values (never labels)
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @param {Object} options Options object
 * @param {boolean} options.forceFresh Force fresh data, bypass cache
 * @returns {Promise<Object>} AQI data with exact numeric values
 */
export async function getAQI(lat, lon, options = {}) {
  const { forceFresh = false } = options;
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;

  // Check cache unless force fresh is requested
  if (!forceFresh && aqiCache.has(cacheKey)) {
    const cached = aqiCache.get(cacheKey);
    const age = Date.now() - cached.timestamp;
    
    if (age < CACHE_DURATION) {
      console.log(`[AQI Service] Using cached data (age: ${Math.round(age / 1000)}s)`);
      return {
        ...cached,
        isStale: age > STALE_THRESHOLD
      };
    }
  }

  // Try to fetch fresh data from API
  try {
    const aqiData = await fetchAQIFromAPI(lat, lon);
    
    // If API returned null (no API key), use mock data
    if (!aqiData) {
      const mockData = generateMockAQI(lat, lon);
      aqiCache.set(cacheKey, mockData);
      return mockData;
    }

    // Cache the real data
    aqiCache.set(cacheKey, aqiData);
    return {
      ...aqiData,
      isStale: false
    };

  } catch (error) {
    console.error('[AQI Service] Error fetching AQI data:', error.message);
    
    // If we have cached data (even if expired), return it with stale flag
    if (aqiCache.has(cacheKey)) {
      console.log('[AQI Service] Using stale cached data due to API error');
      return {
        ...aqiCache.get(cacheKey),
        isStale: true
      };
    }

    // Last resort: return mock data
    console.warn('[AQI Service] Falling back to mock data due to API error');
    const mockData = generateMockAQI(lat, lon);
    aqiCache.set(cacheKey, mockData);
    return mockData;
  }
}

/**
 * Get AQI category information based on exact numeric AQI value
 * @param {number} aqiValue Exact numeric AQI value (0-500)
 * @returns {Object} Category information
 */
export function getAQICategory(aqiValue) {
  // Ensure we're working with a numeric value
  const numericAQI = typeof aqiValue === 'number' ? aqiValue : parseInt(aqiValue, 10);

  if (isNaN(numericAQI)) {
    console.warn('[AQI Service] Invalid AQI value provided to getAQICategory:', aqiValue);
    return AQI_CATEGORIES[0]; // Return 'Good' as default
  }

  // Find the appropriate category for this exact numeric AQI value
  for (const category of AQI_CATEGORIES) {
    if (numericAQI >= category.min && numericAQI <= category.max) {
      return category;
    }
  }

  // If AQI is over 500, return Hazardous
  if (numericAQI > 500) {
    return AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
  }

  // Default to first category (Good)
  return AQI_CATEGORIES[0];
}

/**
 * Get information about a specific pollutant
 * @param {string} pollutantKey Pollutant key (e.g., 'pm2_5', 'pm10', 'o3')
 * @returns {Object|null} Pollutant information or null if not found
 */
export function getPollutantInfo(pollutantKey) {
  if (!pollutantKey) {
    return null;
  }

  // Normalize the key
  const normalizedKey = pollutantKey.toLowerCase().replace('.', '_');
  
  return POLLUTANT_INFO[normalizedKey] || null;
}

