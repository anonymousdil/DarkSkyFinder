/**
 * Service for calculating sunrise, sunset, and astronomical twilight times
 * Uses astronomical formulas to calculate sun position
 */

/**
 * Calculate Julian Day from Date
 * @param {Date} date - Date to convert
 * @returns {number} Julian Day
 */
const getJulianDay = (date) => {
  const time = date.getTime();
  return (time / 86400000) + 2440587.5;
};

/**
 * Calculate solar mean anomaly
 * @param {number} jd - Julian Day
 * @returns {number} Solar mean anomaly in degrees
 */
const getSolarMeanAnomaly = (jd) => {
  const n = jd - 2451545.0;
  return (357.5291 + 0.98560028 * n) % 360;
};

/**
 * Calculate equation of center
 * @param {number} M - Solar mean anomaly in degrees
 * @returns {number} Equation of center in degrees
 */
const getEquationOfCenter = (M) => {
  const Mrad = M * Math.PI / 180;
  return 1.9148 * Math.sin(Mrad) + 
         0.0200 * Math.sin(2 * Mrad) + 
         0.0003 * Math.sin(3 * Mrad);
};

/**
 * Calculate solar declination
 * @param {number} lambda - Ecliptic longitude in degrees
 * @returns {number} Declination in degrees
 */
const getSolarDeclination = (lambda) => {
  const lambdaRad = lambda * Math.PI / 180;
  const epsilon = 23.439; // Earth's axial tilt in degrees
  const epsilonRad = epsilon * Math.PI / 180;
  return Math.asin(Math.sin(lambdaRad) * Math.sin(epsilonRad)) * 180 / Math.PI;
};

/**
 * Calculate hour angle for a given altitude
 * @param {number} lat - Latitude in degrees
 * @param {number} declination - Solar declination in degrees
 * @param {number} altitude - Sun altitude in degrees (-0.833 for sunrise/sunset, -18 for astronomical twilight)
 * @returns {number} Hour angle in degrees
 */
const getHourAngle = (lat, declination, altitude) => {
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  const altRad = altitude * Math.PI / 180;
  
  const cosH = (Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)) / 
               (Math.cos(latRad) * Math.cos(decRad));
  
  // Check if sun is always above or below horizon
  if (cosH > 1) return null; // Sun never rises
  if (cosH < -1) return null; // Sun never sets
  
  return Math.acos(cosH) * 180 / Math.PI;
};

/**
 * Calculate sunrise and sunset times
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @param {Date} date - Date for calculation (defaults to today)
 * @returns {Object} Sunrise and sunset times with twilight data
 */
export const getSunTimes = (lat, lon, date = new Date()) => {
  // Set to noon UTC for calculation
  const noon = new Date(date);
  noon.setUTCHours(12, 0, 0, 0);
  
  const jd = getJulianDay(noon);
  const M = getSolarMeanAnomaly(jd);
  const C = getEquationOfCenter(M);
  const lambda = (M + C + 180 + 102.9372) % 360; // Ecliptic longitude
  const declination = getSolarDeclination(lambda);
  
  // Calculate equation of time for more accurate results
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const eot = 4 * (L - lambda); // in minutes
  
  // Sunrise/sunset (sun's center at -0.833 degrees)
  const H0 = getHourAngle(lat, declination, -0.833);
  
  // Civil twilight (sun at -6 degrees)
  const H_civil = getHourAngle(lat, declination, -6);
  
  // Nautical twilight (sun at -12 degrees)
  const H_nautical = getHourAngle(lat, declination, -12);
  
  // Astronomical twilight (sun at -18 degrees)
  const H_astro = getHourAngle(lat, declination, -18);
  
  // Calculate times in UTC
  const calculateTime = (hourAngle, isRise) => {
    if (hourAngle === null) return null;
    
    const t = 720 - 4 * (lon + (isRise ? -hourAngle : hourAngle)) - eot;
    const hours = Math.floor(t / 60);
    const minutes = Math.round(t % 60);
    
    const time = new Date(date);
    time.setUTCHours(hours, minutes, 0, 0);
    return time;
  };
  
  return {
    sunrise: calculateTime(H0, true),
    sunset: calculateTime(H0, false),
    civilTwilight: {
      dawn: calculateTime(H_civil, true),
      dusk: calculateTime(H_civil, false)
    },
    nauticalTwilight: {
      dawn: calculateTime(H_nautical, true),
      dusk: calculateTime(H_nautical, false)
    },
    astronomicalTwilight: {
      dawn: calculateTime(H_astro, true),
      dusk: calculateTime(H_astro, false)
    },
    solarNoon: new Date(noon.getTime() + (eot * 60000))
  };
};

/**
 * Format time for display
 * @param {Date} time - Time to format
 * @param {string} timezone - Optional timezone (defaults to local)
 * @returns {string} Formatted time string
 */
export const formatTime = (time, timezone = undefined) => {
  if (!time) return 'N/A';
  
  return time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  });
};

/**
 * Format time with date for display
 * @param {Date} time - Time to format
 * @param {string} timezone - Optional timezone (defaults to local)
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (time, timezone = undefined) => {
  if (!time) return 'N/A';
  
  return time.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  });
};

/**
 * Check if it's currently nighttime
 * @param {Object} sunTimes - Sun times object from getSunTimes
 * @param {Date} currentTime - Current time (defaults to now)
 * @returns {boolean} True if nighttime
 */
export const isNighttime = (sunTimes, currentTime = new Date()) => {
  if (!sunTimes.sunset || !sunTimes.sunrise) return false;
  
  const now = currentTime.getTime();
  const sunset = sunTimes.sunset.getTime();
  const sunrise = sunTimes.sunrise.getTime();
  
  if (sunset < sunrise) {
    // Normal case: sunset is before sunrise (same day)
    return now >= sunset || now < sunrise;
  } else {
    // Edge case: crossing midnight
    return now >= sunset && now < sunrise;
  }
};

/**
 * Check if it's astronomical dark (best for stargazing)
 * @param {Object} sunTimes - Sun times object from getSunTimes
 * @param {Date} currentTime - Current time (defaults to now)
 * @returns {boolean} True if astronomical dark
 */
export const isAstronomicalDark = (sunTimes, currentTime = new Date()) => {
  if (!sunTimes.astronomicalTwilight.dusk || !sunTimes.astronomicalTwilight.dawn) return false;
  
  const now = currentTime.getTime();
  const dusk = sunTimes.astronomicalTwilight.dusk.getTime();
  const dawn = sunTimes.astronomicalTwilight.dawn.getTime();
  
  if (dusk < dawn) {
    // Normal case
    return now >= dusk || now < dawn;
  } else {
    // Edge case
    return now >= dusk && now < dawn;
  }
};

/**
 * Get current sun phase
 * @param {Object} sunTimes - Sun times object from getSunTimes
 * @param {Date} currentTime - Current time (defaults to now)
 * @returns {Object} Current phase information
 */
export const getCurrentSunPhase = (sunTimes, currentTime = new Date()) => {
  const now = currentTime.getTime();
  
  if (!sunTimes.sunrise || !sunTimes.sunset) {
    return { phase: 'unknown', description: 'Unable to determine sun phase' };
  }
  
  const sunrise = sunTimes.sunrise.getTime();
  const sunset = sunTimes.sunset.getTime();
  const civilDawn = sunTimes.civilTwilight.dawn?.getTime();
  const civilDusk = sunTimes.civilTwilight.dusk?.getTime();
  const astroDawn = sunTimes.astronomicalTwilight.dawn?.getTime();
  const astroDusk = sunTimes.astronomicalTwilight.dusk?.getTime();
  
  if (astroDusk && astroDawn) {
    if ((now >= astroDusk && now < astroDawn) || 
        (astroDusk > astroDawn && (now >= astroDusk || now < astroDawn))) {
      return { 
        phase: 'astronomical_night', 
        description: 'Astronomical Night - Best for stargazing',
        icon: '🌌'
      };
    }
  }
  
  if (now >= sunrise && now < sunset) {
    return { 
      phase: 'day', 
      description: 'Daytime',
      icon: '☀️'
    };
  }
  
  if (civilDawn && civilDusk) {
    if ((now >= civilDusk && now < sunset) || (now >= sunrise && now < civilDawn)) {
      return { 
        phase: 'twilight', 
        description: 'Twilight',
        icon: '🌅'
      };
    }
  }
  
  return { 
    phase: 'night', 
    description: 'Night',
    icon: '🌙'
  };
};
