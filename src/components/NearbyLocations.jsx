import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { findNearbyLocations, formatLocationSummary, getImprovementColor } from '../services/nearbyLocationsService';
import './NearbyLocations.css';

function NearbyLocations({ location, visible, onClose, onLocationSelect }) {
  const [nearbyData, setNearbyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchRadius, setSearchRadius] = useState(10);

  const fetchNearbyLocations = useCallback(async () => {
    if (!location || !location.position) return;

    setLoading(true);
    setError(null);

    try {
      const [lat, lon] = location.position;
      // Ensure AQI is a number, handle 'N/A' and string numbers
      const currentAQI = location.aqi === 'N/A' || !location.aqi ? 999 : Number(location.aqi);
      const currentBortle = location.pollutionIndex || 5;

      const data = await findNearbyLocations(lat, lon, currentAQI, currentBortle, searchRadius);
      setNearbyData(data);
    } catch (err) {
      console.error('Error fetching nearby locations:', err);
      setError('Unable to find nearby locations');
    } finally {
      setLoading(false);
    }
  }, [location, searchRadius]);

  useEffect(() => {
    if (location && visible) {
      fetchNearbyLocations();
    }
  }, [location, visible, fetchNearbyLocations]);

  const handleLocationClick = (nearbyLocation) => {
    if (onLocationSelect) {
      onLocationSelect(nearbyLocation.lat, nearbyLocation.lon);
    }
  };

  if (!visible) return null;

  return (
    <div className="nearby-locations-panel">
      <div className="nearby-locations-header">
        <h3>Nearby Better Locations</h3>
        <button className="close-button" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      <div className="nearby-locations-content">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching for better locations...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={fetchNearbyLocations} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && nearbyData && (
          <>
            <div className="current-location-info">
              <h4>Current Location</h4>
              <div className="current-stats">
                <span className="stat-item">AQI: {location.aqi}</span>
                <span className="stat-item">Bortle: {location.pollutionIndex || 5}</span>
              </div>
            </div>

            <div className="search-controls">
              <label>Search Radius:</label>
              <select 
                value={searchRadius} 
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="radius-select"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
                <option value={50}>50 km</option>
              </select>
            </div>

            {nearbyData.total === 0 ? (
              <div className="no-results">
                <p>😔 No nearby locations found with better conditions</p>
                <p className="suggestion">Try increasing the search radius</p>
              </div>
            ) : (
              <>
                <div className="results-summary">
                  Found {nearbyData.total} location{nearbyData.total !== 1 ? 's' : ''} with equal or better conditions
                </div>

                {/* Excellent Locations */}
                {nearbyData.categorized.excellent.length > 0 && (
                  <div className="location-category">
                    <h4 className="category-title excellent">
                      🌟 Significantly Better
                    </h4>
                    {nearbyData.categorized.excellent.map((loc, index) => (
                      <LocationCard 
                        key={index} 
                        location={loc} 
                        onClick={() => handleLocationClick(loc)}
                      />
                    ))}
                  </div>
                )}

                {/* Better Locations */}
                {nearbyData.categorized.better.length > 0 && (
                  <div className="location-category">
                    <h4 className="category-title better">
                      ✨ Better
                    </h4>
                    {nearbyData.categorized.better.map((loc, index) => (
                      <LocationCard 
                        key={index} 
                        location={loc} 
                        onClick={() => handleLocationClick(loc)}
                      />
                    ))}
                  </div>
                )}

                {/* Similar Locations */}
                {nearbyData.categorized.similar.length > 0 && (
                  <div className="location-category">
                    <h4 className="category-title similar">
                      💫 Similar
                    </h4>
                    {nearbyData.categorized.similar.map((loc, index) => (
                      <LocationCard 
                        key={index} 
                        location={loc} 
                        onClick={() => handleLocationClick(loc)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LocationCard({ location, onClick }) {
  const summary = formatLocationSummary(location);
  const improvementColor = getImprovementColor(location.improvements);

  const handleNavigate = (e) => {
    e.stopPropagation();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lon}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="location-card" 
      onClick={onClick}
      style={{ borderLeftColor: improvementColor }}
    >
      <div className="location-header">
        <span className="location-distance">{summary.distance}</span>
        <button 
          className="navigate-button" 
          onClick={handleNavigate}
          title="Navigate to location"
        >
          🧭
        </button>
      </div>
      
      <div className="location-stats">
        <div className="stat-row">
          <span className="stat-label">AQI:</span>
          <span className="stat-value">{location.aqi}</span>
          {location.improvements.aqi > 0 && (
            <span className="stat-improvement" style={{ color: improvementColor }}>
              ↓{location.improvements.aqi}
            </span>
          )}
        </div>
        <div className="stat-row">
          <span className="stat-label">Bortle:</span>
          <span className="stat-value">{location.bortleClass}</span>
          {location.improvements.bortle > 0 && (
            <span className="stat-improvement" style={{ color: improvementColor }}>
              ↓{location.improvements.bortle}
            </span>
          )}
        </div>
      </div>

      <div className="location-improvement">
        {summary.improvement}
      </div>

      <div className="location-coordinates">
        {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
      </div>
    </div>
  );
}

LocationCard.propTypes = {
  location: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lon: PropTypes.number.isRequired,
    distance: PropTypes.number.isRequired,
    aqi: PropTypes.number,
    bortleClass: PropTypes.number,
    improvements: PropTypes.shape({
      aqi: PropTypes.number,
      bortle: PropTypes.number
    })
  }).isRequired,
  onClick: PropTypes.func.isRequired
};

NearbyLocations.propTypes = {
  location: PropTypes.shape({
    name: PropTypes.string,
    position: PropTypes.arrayOf(PropTypes.number),
    aqi: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    pollutionIndex: PropTypes.number
  }),
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onLocationSelect: PropTypes.func
};

export default NearbyLocations;
