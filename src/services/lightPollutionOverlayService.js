/**
 * Service for generating light pollution overlay data
 * Creates a grid of light pollution data points within a specified radius
 */

import { getLightPollution } from './lightPollutionService';

/**
 * Generate a grid of light pollution data points around a center location
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radiusKm - Radius in kilometers (default: 1000)
 * @param {number} gridSize - Number of grid points per side (default: 15, use lower values for better performance)
 * @returns {Promise<Array>} Array of grid points with light pollution data
 */
export const generateLightPollutionGrid = async (centerLat, centerLon, radiusKm = 1000, gridSize = 15) => {
  const gridPoints = [];
  
  // Convert radius from km to degrees (approximate)
  // 1 degree of latitude ≈ 111 km
  // 1 degree of longitude varies by latitude
  const latDegrees = radiusKm / 111;
  const lonDegrees = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));
  
  // Calculate bounds
  const minLat = centerLat - latDegrees;
  const maxLat = centerLat + latDegrees;
  const minLon = centerLon - lonDegrees;
  const maxLon = centerLon + lonDegrees;
  
  // Generate grid points
  const latStep = (maxLat - minLat) / (gridSize - 1);
  const lonStep = (maxLon - minLon) / (gridSize - 1);
  
  // Create array of promises to fetch data in parallel (but limited batches)
  const batchSize = 25; // Process 25 points at a time to avoid overwhelming
  const allPromises = [];
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = minLat + (i * latStep);
      const lon = minLon + (j * lonStep);
      
      // Check if point is within circular radius (not just square bounds)
      const distance = calculateDistance(centerLat, centerLon, lat, lon);
      if (distance <= radiusKm) {
        allPromises.push({ lat, lon, distance });
      }
    }
  }
  
  // Fetch data in batches
  for (let i = 0; i < allPromises.length; i += batchSize) {
    const batch = allPromises.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async ({ lat, lon, distance }) => {
        const lightData = await getLightPollution(lat, lon);
        return {
          lat,
          lon,
          distance,
          bortleClass: lightData.bortleClass,
          color: getOverlayColor(lightData.bortleClass),
          intensity: getIntensity(lightData.bortleClass)
        };
      })
    );
    gridPoints.push(...batchResults);
  }
  
  return gridPoints;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * centralAngle;
};

/**
 * Get overlay color based on Bortle class
 * Higher severity = warmer colors (reds, oranges)
 * Lower severity = cooler colors (blues, greens)
 * @param {number} bortleClass - Bortle class (1-9)
 * @returns {string} RGB color string
 */
const getOverlayColor = (bortleClass) => {
  const colors = {
    1: 'rgb(0, 0, 139)',      // Dark blue - Excellent dark sky
    2: 'rgb(0, 100, 200)',    // Blue - Truly dark sky
    3: 'rgb(0, 150, 100)',    // Blue-green - Rural sky
    4: 'rgb(50, 200, 50)',    // Green - Rural/Suburban transition
    5: 'rgb(200, 200, 0)',    // Yellow - Suburban sky
    6: 'rgb(255, 150, 0)',    // Orange - Bright suburban
    7: 'rgb(255, 100, 0)',    // Orange-red - Suburban/Urban transition
    8: 'rgb(255, 50, 0)',     // Red - City sky
    9: 'rgb(200, 0, 0)'       // Dark red - Inner city
  };
  return colors[bortleClass] || colors[5];
};

/**
 * Get opacity intensity based on Bortle class
 * Higher pollution = higher opacity
 * @param {number} bortleClass - Bortle class (1-9)
 * @returns {number} Opacity value (0-1)
 */
const getIntensity = (bortleClass) => {
  // Scale opacity from 0.2 (class 1) to 0.7 (class 9)
  return 0.2 + ((bortleClass - 1) / 8) * 0.5;
};

/**
 * Create simplified grid for faster initial rendering
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} radiusKm - Radius in kilometers (default: 1000)
 * @returns {Promise<Array>} Array of grid points with light pollution data
 */
export const generateSimplifiedGrid = async (centerLat, centerLon, radiusKm = 1000) => {
  // Use smaller grid for better performance (7x7 = ~49 points in circle)
  return generateLightPollutionGrid(centerLat, centerLon, radiusKm, 7);
};
