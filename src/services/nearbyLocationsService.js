import { getAQI } from './aqiService';
import { getLightPollution } from './lightPollutionService';

/**
 * Service for finding nearby locations with similar or better stargazing conditions
 * Searches within a specified radius for locations with equal or better AQI and Bortle scores
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

/**
 * Generate search grid points within radius
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @param {number} gridSize - Number of points per dimension
 * @returns {Array} Array of coordinate pairs
 */
const generateSearchGrid = (lat, lon, radiusKm, gridSize = 8) => {
  const points = [];
  
  // Calculate degree offset for radius
  const latOffset = radiusKm / 111; // Approximately 111 km per degree latitude
  const lonOffset = radiusKm / (111 * Math.cos(lat * Math.PI / 180));
  
  // Generate grid in a circular pattern
  const step = (2 * radiusKm) / gridSize;
  
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const testLat = lat - latOffset + (i * step / 111);
      const testLon = lon - lonOffset + (j * step / (111 * Math.cos(lat * Math.PI / 180)));
      
      // Only include points within the radius
      const distance = calculateDistance(lat, lon, testLat, testLon);
      if (distance <= radiusKm && distance > 0.5) { // Exclude very close points
        points.push({
          lat: testLat,
          lon: testLon,
          distance: distance
        });
      }
    }
  }
  
  // Add cardinal and intercardinal direction points
  const directions = [
    { lat: lat + latOffset, lon: lon, name: 'North' },
    { lat: lat - latOffset, lon: lon, name: 'South' },
    { lat: lat, lon: lon + lonOffset, name: 'East' },
    { lat: lat, lon: lon - lonOffset, name: 'West' },
    { lat: lat + latOffset * 0.7, lon: lon + lonOffset * 0.7, name: 'Northeast' },
    { lat: lat + latOffset * 0.7, lon: lon - lonOffset * 0.7, name: 'Northwest' },
    { lat: lat - latOffset * 0.7, lon: lon + lonOffset * 0.7, name: 'Southeast' },
    { lat: lat - latOffset * 0.7, lon: lon - lonOffset * 0.7, name: 'Southwest' }
  ];
  
  directions.forEach(dir => {
    const distance = calculateDistance(lat, lon, dir.lat, dir.lon);
    points.push({
      lat: dir.lat,
      lon: dir.lon,
      distance: distance,
      direction: dir.name
    });
  });
  
  return points;
};

/**
 * Find nearby locations with equal or better stargazing conditions
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} currentAQI - Current location's AQI
 * @param {number} currentBortle - Current location's Bortle class
 * @param {number} radiusKm - Search radius in kilometers (default 10)
 * @returns {Promise<Object>} Nearby locations with better conditions
 */
export const findNearbyLocations = async (lat, lon, currentAQI, currentBortle, radiusKm = 10) => {
  try {
    // Generate search points
    const searchPoints = generateSearchGrid(lat, lon, radiusKm);
    
    // Sample a subset to avoid too many API calls
    const maxSamples = 16;
    const sampledPoints = searchPoints.length > maxSamples 
      ? sampleArray(searchPoints, maxSamples)
      : searchPoints;
    
    // Fetch data for all sample points in parallel
    const results = await Promise.all(
      sampledPoints.map(async (point) => {
        try {
          const [aqiData, lightData] = await Promise.all([
            getAQI(point.lat, point.lon),
            getLightPollution(point.lat, point.lon)
          ]);
          
          return {
            lat: point.lat,
            lon: point.lon,
            distance: point.distance,
            direction: point.direction,
            aqi: aqiData?.aqi || null,
            bortleClass: lightData?.bortleClass || null,
            aqiData: aqiData,
            lightData: lightData
          };
        } catch (error) {
          console.error(`Error fetching data for point ${point.lat}, ${point.lon}:`, error);
          return null;
        }
      })
    );
    
    // Filter out failed fetches and locations that don't meet criteria
    const validLocations = results.filter(loc => {
      if (!loc || loc.aqi === null || loc.bortleClass === null) return false;
      
      // Location must have equal or better (lower) AQI and Bortle class
      const betterAQI = loc.aqi <= currentAQI;
      const betterBortle = loc.bortleClass <= currentBortle;
      
      return betterAQI && betterBortle;
    });
    
    // Calculate improvement scores
    const locationsWithScores = validLocations.map(loc => {
      // Calculate improvement (negative values mean better conditions)
      const aqiImprovement = currentAQI - loc.aqi;
      const bortleImprovement = currentBortle - loc.bortleClass;
      
      // Combined score (higher is better)
      const score = (aqiImprovement * 0.3) + (bortleImprovement * 0.7) - (loc.distance * 0.1);
      
      return {
        ...loc,
        improvements: {
          aqi: aqiImprovement,
          bortle: bortleImprovement
        },
        score: score
      };
    });
    
    // Sort by score (best locations first)
    locationsWithScores.sort((a, b) => b.score - a.score);
    
    // Categorize locations
    const categorized = {
      excellent: locationsWithScores.filter(loc => 
        loc.improvements.aqi >= 20 && loc.improvements.bortle >= 2
      ),
      better: locationsWithScores.filter(loc => 
        (loc.improvements.aqi >= 10 || loc.improvements.bortle >= 1) &&
        !(loc.improvements.aqi >= 20 && loc.improvements.bortle >= 2)
      ),
      similar: locationsWithScores.filter(loc => 
        loc.improvements.aqi < 10 && loc.improvements.bortle < 1
      )
    };
    
    return {
      total: locationsWithScores.length,
      locations: locationsWithScores.slice(0, 10), // Return top 10
      categorized: {
        excellent: categorized.excellent.slice(0, 3),
        better: categorized.better.slice(0, 5),
        similar: categorized.similar.slice(0, 3)
      },
      searchRadius: radiusKm,
      centerPoint: { lat, lon }
    };
    
  } catch (error) {
    console.error('Error finding nearby locations:', error);
    throw new Error('Failed to find nearby locations');
  }
};

/**
 * Sample array to get a representative subset
 * @param {Array} array - Array to sample
 * @param {number} size - Desired sample size
 * @returns {Array} Sampled array
 */
const sampleArray = (array, size) => {
  if (array.length <= size) return array;
  
  const step = Math.floor(array.length / size);
  const sampled = [];
  
  for (let i = 0; i < array.length && sampled.length < size; i += step) {
    sampled.push(array[i]);
  }
  
  return sampled;
};

/**
 * Get direction description
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} targetLat - Target latitude
 * @param {number} targetLon - Target longitude
 * @returns {string} Direction description
 */
export const getDirection = (lat, lon, targetLat, targetLon) => {
  const dLat = targetLat - lat;
  const dLon = targetLon - lon;
  
  const angle = Math.atan2(dLon, dLat) * 180 / Math.PI;
  
  // Convert to compass direction
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((angle + 360) % 360) / 45) % 8;
  
  return directions[index];
};

/**
 * Format location summary for display
 * @param {Object} location - Location data
 * @returns {Object} Formatted summary
 */
export const formatLocationSummary = (location) => {
  const dir = location.direction || getDirection(
    location.centerLat,
    location.centerLon,
    location.lat,
    location.lon
  );
  
  return {
    distance: `${location.distance.toFixed(1)} km ${dir}`,
    conditions: `AQI: ${location.aqi}, Bortle: ${location.bortleClass}`,
    improvement: getImprovementText(location.improvements)
  };
};

/**
 * Get improvement text for display
 * @param {Object} improvements - Improvements object
 * @returns {string} Improvement description
 */
const getImprovementText = (improvements) => {
  const parts = [];
  
  if (improvements.aqi > 0) {
    parts.push(`${improvements.aqi} better AQI`);
  }
  if (improvements.bortle > 0) {
    parts.push(`${improvements.bortle} darker sky`);
  }
  
  if (parts.length === 0) return 'Similar conditions';
  return parts.join(', ');
};

/**
 * Get color indicator based on improvement
 * @param {Object} improvements - Improvements object
 * @returns {string} Color code
 */
export const getImprovementColor = (improvements) => {
  if (improvements.aqi >= 20 || improvements.bortle >= 2) {
    return '#4CAF50'; // Green - Excellent improvement
  }
  if (improvements.aqi >= 10 || improvements.bortle >= 1) {
    return '#8BC34A'; // Light green - Good improvement
  }
  return '#CDDC39'; // Yellow - Minor improvement
};
