import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getLightPollution, getStargazingRecommendations } from '../services/lightPollutionService';
import './LightPollutionView.css';

function LightPollutionView({ location, visible, onClose }) {
  const [lightData, setLightData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showBortleInfo, setShowBortleInfo] = useState(false);

  const fetchLightData = useCallback(async () => {
    if (!location || !location.position) return;

    setLoading(true);
    setError(null);

    try {
      const [lat, lon] = location.position;
      const data = await getLightPollution(lat, lon);
      setLightData(data);
    } catch (err) {
      console.error('Error fetching light pollution data:', err);
      setError('Unable to fetch light pollution data');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (location && visible) {
      fetchLightData();
    }
  }, [location, visible, fetchLightData]);

  if (!visible) return null;

  const recommendations = lightData ? getStargazingRecommendations(lightData.bortleClass) : null;

  return (
    <div className="light-pollution-panel">
      <div className="light-pollution-header">
        <h3>Light Pollution Map</h3>
        <button className="close-button" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading light pollution data...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchLightData} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && lightData && (
        <div className="light-pollution-content">
          <div className="location-info">
            <h4>{location.name}</h4>
            <p className="coordinates">
              {location.position[0].toFixed(4)}°, {location.position[1].toFixed(4)}°
            </p>
          </div>

          {/* Bortle Scale Display */}
          <div className="bortle-main-display" style={{ 
            backgroundColor: lightData.color,
            color: lightData.bortleClass <= 3 ? '#ffffff' : '#000000'
          }}>
            <div className="bortle-icon">
              {lightData.bortleClass <= 3 ? '✨' : lightData.bortleClass <= 5 ? '🌙' : '🏙️'}
            </div>
            <div className="bortle-class">
              Class {lightData.bortleClass}
            </div>
            <div className="bortle-name">
              {lightData.name}
            </div>
            <button 
              className="info-button"
              onClick={() => setShowBortleInfo(!showBortleInfo)}
              title="Learn about Bortle Scale"
            >
              ℹ️ What is Bortle Scale?
            </button>
          </div>

          {/* Bortle Scale Info Modal */}
          {showBortleInfo && (
            <div className="bortle-info-modal">
              <div className="bortle-info-header">
                <h4>Understanding the Bortle Scale</h4>
                <button onClick={() => setShowBortleInfo(false)}>✕</button>
              </div>
              <div className="bortle-info-content">
                <p>
                  The Bortle Dark-Sky Scale is a nine-level numeric scale that measures 
                  the night sky's brightness at a particular location. It quantifies the 
                  astronomical observability of celestial objects and the interference 
                  caused by light pollution.
                </p>
                <ul>
                  <li><strong>Class 1-3:</strong> Excellent dark skies, ideal for astronomy</li>
                  <li><strong>Class 4-5:</strong> Rural/suburban transition, limited by light domes</li>
                  <li><strong>Class 6-7:</strong> Suburban skies, significant light pollution</li>
                  <li><strong>Class 8-9:</strong> City skies, severe light pollution</li>
                </ul>
              </div>
            </div>
          )}

          {/* Sky Quality Metrics */}
          <div className="sky-quality-metrics">
            <div className="section-title">
              <span className="section-icon">📊</span>
              Sky Quality Measurements
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">SQM Reading</div>
                <div className="metric-value">{lightData.sqm}</div>
                <div className="metric-unit">mag/arcsec²</div>
                <div className="metric-description">Sky brightness measurement</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">NELM</div>
                <div className="metric-value">{lightData.nelm}</div>
                <div className="metric-unit">magnitude</div>
                <div className="metric-description">Naked eye limiting magnitude</div>
              </div>

              <div className="metric-card">
                <div className="metric-label">MPSAS</div>
                <div className="metric-value">{lightData.mpsas}</div>
                <div className="metric-unit">mag/arcsec²</div>
                <div className="metric-description">Magnitudes per square arcsecond</div>
              </div>
            </div>
          </div>

          {/* Detailed Bortle Information */}
          <div className="bortle-details">
            <div className="section-title">
              <span className="section-icon">🌌</span>
              Sky Conditions
            </div>

            <div className="detail-item">
              <div className="detail-label">Visible Stars</div>
              <div className="detail-value">{lightData.visibleStars}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Milky Way</div>
              <div className="detail-value">{lightData.milkyWay}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Zodiacal Light</div>
              <div className="detail-value">{lightData.zodiacalLight}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Airglow</div>
              <div className="detail-value">{lightData.airglow}</div>
            </div>

            <div className="detail-item">
              <div className="detail-label">Overall Quality</div>
              <div className="detail-value highlight">{lightData.stargazingQuality}</div>
            </div>
          </div>

          {/* Examples */}
          <div className="location-examples">
            <div className="section-title">
              <span className="section-icon">📍</span>
              Typical Locations
            </div>
            <p className="examples-text">{lightData.examples}</p>
          </div>

          {/* Stargazing Recommendations */}
          {recommendations && (
            <div className="stargazing-recommendations">
              <div className="section-title">
                <span className="section-icon">🔭</span>
                Stargazing Recommendations
              </div>

              <div className="recommendation-status" style={{
                backgroundColor: recommendations.recommended 
                  ? 'rgba(76, 175, 80, 0.2)' 
                  : 'rgba(255, 152, 0, 0.2)',
                borderColor: recommendations.recommended 
                  ? 'rgba(76, 175, 80, 0.5)' 
                  : 'rgba(255, 152, 0, 0.5)'
              }}>
                {recommendations.recommended 
                  ? '✅ Recommended for stargazing' 
                  : '⚠️ Limited stargazing conditions'}
              </div>

              <div className="activities-section">
                <strong>Suitable Activities:</strong>
                <ul>
                  {recommendations.activities.map((activity, index) => (
                    <li key={index}>{activity}</li>
                  ))}
                </ul>
              </div>

              <div className="timing-section">
                <strong>Best Time:</strong>
                <p>{recommendations.bestTime}</p>
              </div>

              <div className="equipment-section">
                <strong>Equipment:</strong>
                <p>{recommendations.equipment}</p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="location-description">
            <div className="section-title">
              <span className="section-icon">📝</span>
              Description
            </div>
            <p className="description-text">{lightData.description}</p>
          </div>

          <div className="data-source">
            <small>Data source: {lightData.source}</small>
          </div>

          <button onClick={fetchLightData} className="refresh-button">
            🔄 Refresh Data
          </button>
        </div>
      )}
    </div>
  );
}

LightPollutionView.propTypes = {
  location: PropTypes.shape({
    name: PropTypes.string,
    position: PropTypes.arrayOf(PropTypes.number)
  }),
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default LightPollutionView;
