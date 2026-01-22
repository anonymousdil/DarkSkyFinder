import * as Astronomy from 'astronomy-engine';

/**
 * Service for calculating constellation visibility based on location and time
 * Uses astronomy-engine for astronomical calculations
 */

// Cache for constellation data
const cache = new Map();
const CACHE_DURATION = 1800000; // 30 minutes in milliseconds

/**
 * Constellation data with approximate center coordinates (RA in hours, Dec in degrees)
 * Source: IAU constellation boundaries
 */
const CONSTELLATIONS = [
  { name: 'Ursa Major', abbr: 'UMa', ra: 11.0, dec: 50.0, season: 'Spring', magnitude: 1.8 },
  { name: 'Ursa Minor', abbr: 'UMi', ra: 15.0, dec: 75.0, season: 'All Year', magnitude: 2.0 },
  { name: 'Orion', abbr: 'Ori', ra: 5.5, dec: 5.0, season: 'Winter', magnitude: 0.1 },
  { name: 'Cassiopeia', abbr: 'Cas', ra: 1.0, dec: 60.0, season: 'Fall', magnitude: 2.2 },
  { name: 'Andromeda', abbr: 'And', ra: 1.0, dec: 40.0, season: 'Fall', magnitude: 2.1 },
  { name: 'Perseus', abbr: 'Per', ra: 3.0, dec: 45.0, season: 'Winter', magnitude: 1.8 },
  { name: 'Taurus', abbr: 'Tau', ra: 4.5, dec: 15.0, season: 'Winter', magnitude: 0.9 },
  { name: 'Gemini', abbr: 'Gem', ra: 7.0, dec: 22.0, season: 'Winter', magnitude: 1.2 },
  { name: 'Cancer', abbr: 'Cnc', ra: 8.5, dec: 20.0, season: 'Spring', magnitude: 3.5 },
  { name: 'Leo', abbr: 'Leo', ra: 10.5, dec: 15.0, season: 'Spring', magnitude: 1.4 },
  { name: 'Virgo', abbr: 'Vir', ra: 13.0, dec: 0.0, season: 'Spring', magnitude: 1.0 },
  { name: 'Libra', abbr: 'Lib', ra: 15.0, dec: -15.0, season: 'Summer', magnitude: 2.6 },
  { name: 'Scorpius', abbr: 'Sco', ra: 17.0, dec: -30.0, season: 'Summer', magnitude: 1.1 },
  { name: 'Sagittarius', abbr: 'Sgr', ra: 19.0, dec: -25.0, season: 'Summer', magnitude: 1.8 },
  { name: 'Capricornus', abbr: 'Cap', ra: 21.0, dec: -20.0, season: 'Fall', magnitude: 3.6 },
  { name: 'Aquarius', abbr: 'Aqr', ra: 22.5, dec: -10.0, season: 'Fall', magnitude: 2.9 },
  { name: 'Pisces', abbr: 'Psc', ra: 0.5, dec: 10.0, season: 'Fall', magnitude: 3.6 },
  { name: 'Aries', abbr: 'Ari', ra: 2.5, dec: 20.0, season: 'Winter', magnitude: 2.0 },
  { name: 'Cygnus', abbr: 'Cyg', ra: 20.5, dec: 40.0, season: 'Summer', magnitude: 1.3 },
  { name: 'Lyra', abbr: 'Lyr', ra: 18.5, dec: 35.0, season: 'Summer', magnitude: 0.0 },
  { name: 'Aquila', abbr: 'Aql', ra: 19.5, dec: 5.0, season: 'Summer', magnitude: 0.8 },
  { name: 'Pegasus', abbr: 'Peg', ra: 23.0, dec: 20.0, season: 'Fall', magnitude: 2.4 },
  { name: 'Boötes', abbr: 'Boo', ra: 14.5, dec: 30.0, season: 'Spring', magnitude: 0.0 },
  { name: 'Corona Borealis', abbr: 'CrB', ra: 15.5, dec: 30.0, season: 'Summer', magnitude: 2.2 },
  { name: 'Hercules', abbr: 'Her', ra: 17.0, dec: 30.0, season: 'Summer', magnitude: 2.8 },
  { name: 'Ophiuchus', abbr: 'Oph', ra: 17.5, dec: -8.0, season: 'Summer', magnitude: 2.1 },
  { name: 'Draco', abbr: 'Dra', ra: 17.0, dec: 65.0, season: 'Summer', magnitude: 2.2 },
  { name: 'Cepheus', abbr: 'Cep', ra: 22.0, dec: 70.0, season: 'Fall', magnitude: 2.4 },
  { name: 'Auriga', abbr: 'Aur', ra: 6.0, dec: 40.0, season: 'Winter', magnitude: 0.1 },
  { name: 'Canis Major', abbr: 'CMa', ra: 6.5, dec: -20.0, season: 'Winter', magnitude: -1.5 },
  { name: 'Canis Minor', abbr: 'CMi', ra: 7.5, dec: 5.0, season: 'Winter', magnitude: 0.4 },
  { name: 'Hydra', abbr: 'Hya', ra: 10.0, dec: -15.0, season: 'Spring', magnitude: 2.0 },
  { name: 'Corvus', abbr: 'Crv', ra: 12.5, dec: -20.0, season: 'Spring', magnitude: 2.6 },
  { name: 'Crater', abbr: 'Crt', ra: 11.5, dec: -15.0, season: 'Spring', magnitude: 3.6 },
  { name: 'Centaurus', abbr: 'Cen', ra: 13.0, dec: -45.0, season: 'Spring', magnitude: 0.0 },
  { name: 'Crux', abbr: 'Cru', ra: 12.5, dec: -60.0, season: 'Spring', magnitude: 0.8 },
];

/**
 * Calculate horizontal coordinates (altitude and azimuth) from equatorial coordinates
 * @param {number} ra - Right Ascension in hours
 * @param {number} dec - Declination in degrees
 * @param {number} lat - Observer latitude in degrees
 * @param {number} lon - Observer longitude in degrees
 * @param {Date} date - Observation date/time
 * @returns {Object} Altitude and azimuth in degrees
 */
function raDecToAltAz(ra, dec, lat, lon, date) {
  // Convert RA from hours to degrees
  const raDeg = ra * 15.0;
  
  // Calculate Local Sidereal Time (LST)
  const hourAngle = Astronomy.SiderealTime(date) * 15.0 - raDeg + lon;
  
  // Convert to radians
  const haRad = hourAngle * Math.PI / 180.0;
  const decRad = dec * Math.PI / 180.0;
  const latRad = lat * Math.PI / 180.0;
  
  // Calculate altitude
  const sinAlt = Math.sin(decRad) * Math.sin(latRad) + 
                 Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
  const altitude = Math.asin(sinAlt) * 180.0 / Math.PI;
  
  // Calculate azimuth
  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / 
                (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180.0 / Math.PI;
  
  // Adjust azimuth based on hour angle
  if (Math.sin(haRad) > 0) {
    azimuth = 360.0 - azimuth;
  }
  
  return { altitude, azimuth };
}

/**
 * Get visible constellations for a given location and time
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Date} date - Observation date/time (default: now)
 * @returns {Promise<Object>} Constellation visibility data
 */
export const getVisibleConstellations = async (lat, lon, date = new Date()) => {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)},${date.getTime()}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data;
  }

  try {
    const observer = new Astronomy.Observer(lat, lon, 0);
    
    // Calculate sun position to determine if it's night
    const sunHorizon = Astronomy.Horizon(date, observer, 0, 0, 'normal');
    const sunAltitude = sunHorizon.altitude;
    
    // Determine time of day
    let timeOfDay = 'Day';
    if (sunAltitude < -18) {
      timeOfDay = 'Astronomical Night';
    } else if (sunAltitude < -12) {
      timeOfDay = 'Nautical Twilight';
    } else if (sunAltitude < -6) {
      timeOfDay = 'Civil Twilight';
    } else if (sunAltitude < 0) {
      timeOfDay = 'Golden Hour';
    }
    
    // Calculate moon phase and position
    const moonIllumination = Astronomy.Illumination(Astronomy.Body.Moon, date);
    const moonPhase = moonIllumination.phase_angle;
    const moonFraction = moonIllumination.phase_fraction * 100;
    
    // Calculate constellation positions
    const constellations = CONSTELLATIONS.map(constellation => {
      const position = raDecToAltAz(
        constellation.ra,
        constellation.dec,
        lat,
        lon,
        date
      );
      
      // Determine visibility status
      let visibility = 'Not Visible';
      let visibilityScore = 0;
      
      if (position.altitude > 0) {
        if (position.altitude > 60) {
          visibility = 'Excellent (Overhead)';
          visibilityScore = 5;
        } else if (position.altitude > 30) {
          visibility = 'Good (High)';
          visibilityScore = 4;
        } else if (position.altitude > 15) {
          visibility = 'Fair (Medium)';
          visibilityScore = 3;
        } else if (position.altitude > 5) {
          visibility = 'Poor (Low)';
          visibilityScore = 2;
        } else {
          visibility = 'Very Low (Near Horizon)';
          visibilityScore = 1;
        }
      }
      
      // Get cardinal direction from azimuth
      const direction = getCardinalDirection(position.azimuth);
      
      return {
        ...constellation,
        altitude: position.altitude,
        azimuth: position.azimuth,
        direction,
        visibility,
        visibilityScore,
        isVisible: position.altitude > 0
      };
    });
    
    // Sort by visibility score (highest first), then altitude
    const sortedConstellations = constellations.sort((a, b) => {
      if (b.visibilityScore !== a.visibilityScore) {
        return b.visibilityScore - a.visibilityScore;
      }
      return b.altitude - a.altitude;
    });
    
    const visibleCount = sortedConstellations.filter(c => c.isVisible).length;
    
    const data = {
      timestamp: date.toISOString(),
      location: { lat, lon },
      timeOfDay,
      sunAltitude: sunAltitude.toFixed(2),
      moonPhase: moonPhase.toFixed(1),
      moonIllumination: moonFraction.toFixed(1),
      constellations: sortedConstellations,
      visibleCount,
      totalCount: CONSTELLATIONS.length,
      bestViewing: timeOfDay.includes('Night')
    };
    
    // Cache the result
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Error calculating constellation visibility:', error);
    throw error;
  }
};

/**
 * Get cardinal direction from azimuth
 * @param {number} azimuth - Azimuth in degrees
 * @returns {string} Cardinal direction
 */
function getCardinalDirection(azimuth) {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(azimuth / 22.5) % 16;
  return directions[index];
}

/**
 * Get best viewing time for constellations at a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Date} date - Date to check (default: today)
 * @returns {Promise<Object>} Best viewing times
 */
export const getBestViewingTime = async (lat, lon, date = new Date()) => {
  try {
    const observer = new Astronomy.Observer(lat, lon, 0);
    
    // Find sunset and sunrise times
    const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, date, 1);
    const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, date, 1);
    
    // Check if we got valid results
    if (!sunset || !sunrise) {
      return {
        sunset: null,
        sunrise: null,
        astronomicalNightStart: null,
        astronomicalNightEnd: null,
        bestTime: null
      };
    }
    
    // Convert AstroTime to Date
    const sunsetDate = sunset.date;
    const sunriseDate = sunrise.date;
    
    // Find astronomical twilight (sun 18° below horizon)
    const nightStart = new Date(sunsetDate.getTime());
    nightStart.setHours(nightStart.getHours() + 1.5); // Approximate astronomical twilight
    
    const nightEnd = new Date(sunriseDate.getTime());
    nightEnd.setHours(nightEnd.getHours() - 1.5);
    
    // Calculate midnight (best viewing time)
    const midnight = new Date((nightStart.getTime() + nightEnd.getTime()) / 2);
    
    return {
      sunset: sunsetDate.toISOString(),
      sunrise: sunriseDate.toISOString(),
      astronomicalNightStart: nightStart.toISOString(),
      astronomicalNightEnd: nightEnd.toISOString(),
      bestTime: midnight.toISOString()
    };
  } catch (error) {
    console.error('Error calculating best viewing time:', error);
    return {
      sunset: null,
      sunrise: null,
      astronomicalNightStart: null,
      astronomicalNightEnd: null,
      bestTime: null
    };
  }
};

/**
 * Get planet visibility information
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Date} date - Observation date/time
 * @returns {Array} Visible planets with positions
 */
export const getVisiblePlanets = (lat, lon, date = new Date()) => {
  try {
    const observer = new Astronomy.Observer(lat, lon, 0);
    const planets = [
      Astronomy.Body.Mercury,
      Astronomy.Body.Venus,
      Astronomy.Body.Mars,
      Astronomy.Body.Jupiter,
      Astronomy.Body.Saturn
    ];
    
    const visiblePlanets = planets.map(planet => {
      const equatorial = Astronomy.Equator(planet, date, observer, true, true);
      const horizontal = Astronomy.Horizon(date, observer, equatorial.ra, equatorial.dec, 'normal');
      
      return {
        name: planet,
        ra: equatorial.ra,
        dec: equatorial.dec,
        altitude: horizontal.altitude,
        azimuth: horizontal.azimuth,
        isVisible: horizontal.altitude > 0,
        direction: getCardinalDirection(horizontal.azimuth)
      };
    }).filter(p => p.isVisible);
    
    return visiblePlanets;
  } catch (error) {
    console.error('Error calculating planet visibility:', error);
    return [];
  }
};
