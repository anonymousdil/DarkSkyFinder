import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getVisibleConstellations, getBestViewingTime, getVisiblePlanets } from '../services/constellationService';
import { getSkyViewability, interpretCloudCover } from '../services/skyViewabilityService';
import './ConstellationView.css';

function ConstellationView({ location, visible, onClose }) {
  const [constellationData, setConstellationData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [bestTimes, setBestTimes] = useState(null);
  const [planets, setPlanets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showOnlyVisible, setShowOnlyVisible] = useState(true);

  const fetchConstellationData = useCallback(async () => {
    if (!location || !location.position) return;

    setLoading(true);
    setError(null);

    try {
      const [lat, lon] = location.position;
      
      // Fetch all data in parallel
      const [constData, skyData, timesData] = await Promise.all([
        getVisibleConstellations(lat, lon, selectedDate),
        getSkyViewability(lat, lon),
        getBestViewingTime(lat, lon, selectedDate)
      ]);
      
      setConstellationData(constData);
      setWeatherData(skyData);
      setBestTimes(timesData);
      
      // Get visible planets
      try {
        const planetData = getVisiblePlanets(lat, lon, selectedDate);
        setPlanets(planetData);
      } catch (err) {
        console.warn('Planet data unavailable:', err);
        setPlanets([]);
      }
    } catch (err) {
      console.error('Error fetching constellation data:', err);
      setError('Unable to fetch constellation data');
    } finally {
      setLoading(false);
    }
  }, [location, selectedDate]);

  useEffect(() => {
    if (location && visible) {
      fetchConstellationData();
    }
  }, [location, visible, fetchConstellationData]);

  if (!visible) return null;

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
  };

  const handleTimeChange = (e) => {
    const [hours, minutes] = e.target.value.split(':');
    const newDate = new Date(selectedDate);
    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    setSelectedDate(newDate);
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const visibleConstellations = constellationData?.constellations.filter(c => c.isVisible) || [];
  const displayedConstellations = showOnlyVisible 
    ? visibleConstellations 
    : (constellationData?.constellations || []);

  const cloudCoverInfo = weatherData ? interpretCloudCover(weatherData.cloudCover) : null;

  return (
    <div className="constellation-panel">
      <div className="constellation-header">
        <h3>🌟 Constellation Viewer</h3>
        <button className="close-button" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      <div className="datetime-selector">
        <div className="datetime-input-group">
          <label htmlFor="obs-date">📅 Date:</label>
          <input
            id="obs-date"
            type="date"
            value={selectedDate.toISOString().slice(0, 10)}
            onChange={handleDateChange}
            className="date-input"
          />
        </div>
        <div className="datetime-input-group">
          <label htmlFor="obs-time">🕐 Time:</label>
          <input
            id="obs-time"
            type="time"
            value={selectedDate.toTimeString().slice(0, 5)}
            onChange={handleTimeChange}
            className="time-input"
          />
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Calculating constellation positions...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchConstellationData} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && constellationData && (
        <div className="constellation-content">
          <div className="location-info">
            <h4>{location.name}</h4>
            <p className="coordinates">
              {location.position[0].toFixed(4)}°, {location.position[1].toFixed(4)}°
            </p>
          </div>

          <div className="observation-info">
            <div className="info-card">
              <div className="info-label">Time of Day</div>
              <div className={`info-value time-${constellationData.timeOfDay.toLowerCase().replace(/\s+/g, '-')}`}>
                {constellationData.timeOfDay}
              </div>
            </div>
            <div className="info-card">
              <div className="info-label">Visible Constellations</div>
              <div className="info-value">
                {constellationData.visibleCount} / {constellationData.totalCount}
              </div>
            </div>
            {weatherData && (
              <div className="info-card">
                <div className="info-label">Cloud Cover</div>
                <div className="info-value" style={{ color: cloudCoverInfo?.color }}>
                  {cloudCoverInfo?.quality}
                </div>
              </div>
            )}
          </div>

          {!constellationData.bestViewing && (
            <div className="viewing-warning">
              ⚠️ Best viewing is during astronomical night (sun below -18°)
            </div>
          )}

          {weatherData && weatherData.cloudCover > 5 && (
            <div className="weather-warning">
              ☁️ Cloud cover may affect visibility ({cloudCoverInfo?.text})
            </div>
          )}

          {constellationData.moonIllumination > 50 && (
            <div className="moon-warning">
              🌕 Moon is {constellationData.moonIllumination}% illuminated - may reduce visibility of faint objects
            </div>
          )}

          {bestTimes && (
            <div className="best-times">
              <h4>🌙 Tonight&apos;s Schedule</h4>
              <div className="times-grid">
                <div className="time-item">
                  <span className="time-label">Sunset:</span>
                  <span className="time-value">{formatTime(bestTimes.sunset)}</span>
                </div>
                <div className="time-item">
                  <span className="time-label">Night Starts:</span>
                  <span className="time-value">{formatTime(bestTimes.astronomicalNightStart)}</span>
                </div>
                <div className="time-item">
                  <span className="time-label">Best Time:</span>
                  <span className="time-value highlight">{formatTime(bestTimes.bestTime)}</span>
                </div>
                <div className="time-item">
                  <span className="time-label">Night Ends:</span>
                  <span className="time-value">{formatTime(bestTimes.astronomicalNightEnd)}</span>
                </div>
                <div className="time-item">
                  <span className="time-label">Sunrise:</span>
                  <span className="time-value">{formatTime(bestTimes.sunrise)}</span>
                </div>
              </div>
            </div>
          )}

          {planets && planets.length > 0 && (
            <div className="planets-section">
              <h4>🪐 Visible Planets</h4>
              <div className="planet-list">
                {planets.map((planet, idx) => (
                  <div key={idx} className="planet-item">
                    <span className="planet-name">{planet.name}</span>
                    <span className="planet-direction">{planet.direction}</span>
                    <span className="planet-altitude">{planet.altitude.toFixed(1)}°</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="constellation-controls">
            <label className="filter-toggle">
              <input
                type="checkbox"
                checked={showOnlyVisible}
                onChange={(e) => setShowOnlyVisible(e.target.checked)}
              />
              <span>Show only visible constellations</span>
            </label>
          </div>

          <div className="constellation-list">
            <h4>
              {showOnlyVisible ? 'Visible Constellations' : 'All Constellations'} 
              ({displayedConstellations.length})
            </h4>
            {displayedConstellations.length === 0 ? (
              <p className="no-constellations">No constellations currently visible at this location and time.</p>
            ) : (
              <div className="constellation-grid">
                {displayedConstellations.map((constellation, idx) => (
                  <div 
                    key={idx} 
                    className={`constellation-card ${constellation.isVisible ? 'visible' : 'hidden'}`}
                  >
                    <div className="constellation-header-card">
                      <h5>{constellation.name}</h5>
                      <span className="constellation-abbr">{constellation.abbr}</span>
                    </div>
                    <div className="constellation-details">
                      {constellation.isVisible ? (
                        <>
                          <div className="detail-row">
                            <span className="detail-label">Direction:</span>
                            <span className="detail-value">{constellation.direction} ({constellation.azimuth.toFixed(1)}°)</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Altitude:</span>
                            <span className="detail-value">{constellation.altitude.toFixed(1)}°</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Status:</span>
                            <span className={`visibility-badge score-${constellation.visibilityScore}`}>
                              {constellation.visibility}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Season:</span>
                            <span className="detail-value">{constellation.season}</span>
                          </div>
                        </>
                      ) : (
                        <div className="below-horizon">
                          <span>Below horizon</span>
                          <span className="season-hint">Best in {constellation.season}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

ConstellationView.propTypes = {
  location: PropTypes.shape({
    name: PropTypes.string,
    position: PropTypes.arrayOf(PropTypes.number)
  }),
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default ConstellationView;
