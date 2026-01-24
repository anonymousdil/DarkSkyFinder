import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getAQI, getAQICategory, getPollutantInfo } from '../services/aqiService';
import './AQIView.css';

function AQIView({ location, visible, onClose }) {
  const [aqiData, setAqiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAQIData = useCallback(async (forceFresh = false) => {
    if (!location || !location.position) return;

    setLoading(true);
    setError(null);

    try {
      const [lat, lon] = location.position;
      const data = await getAQI(lat, lon, { forceFresh });
      setAqiData(data);
    } catch (err) {
      console.error('Error fetching AQI data:', err);
      setError('Unable to fetch AQI data');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (location && visible) {
      fetchAQIData();
    }
  }, [location, visible, fetchAQIData]);

  if (!visible) return null;

  const category = aqiData ? getAQICategory(aqiData.aqi) : null;
  const dominantPollutant = aqiData ? getPollutantInfo(aqiData.dominant) : null;

  return (
    <div className="aqi-view-panel">
      <div className="aqi-view-header">
        <h3>Air Quality Index</h3>
        <button className="close-button" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading AQI data...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchAQIData} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && aqiData && category && (
        <div className="aqi-view-content">
          {aqiData.isMockData && (
            <div className="mock-data-warning" style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#856404',
              fontSize: '14px'
            }}>
              <strong>⚠️ Notice:</strong> Real-time AQI data is currently unavailable. 
              Displaying estimated fallback data. For accurate air quality information, 
              please configure the AQICN API token in your .env file.
            </div>
          )}
          {!aqiData.isMockData && aqiData.isStale && (
            <div className="stale-data-warning" style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#856404',
              fontSize: '14px'
            }}>
              <strong>⚠️ Notice:</strong> The displayed AQI data may be outdated (older than 3 hours). 
              Consider refreshing for more current information.
            </div>
          )}
          <div className="location-info">
            <h4>{location.name}</h4>
            <p className="coordinates">
              {location.position[0].toFixed(4)}°, {location.position[1].toFixed(4)}°
            </p>
            {aqiData.station && (
              <p className="station-name">Station: {aqiData.station}</p>
            )}
            <button
              className="navigate-button"
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${location.position[0]},${location.position[1]}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              title="Navigate with Google Maps"
              style={{ marginTop: '8px' }}
            >
              🧭 Navigate
            </button>
          </div>

          {/* Main AQI Display */}
          <div className="aqi-main-display" style={{ borderColor: category.color }}>
            <div className="aqi-icon">🌫️</div>
            <div className="aqi-value" style={{ color: category.color }}>
              {aqiData.aqi}
            </div>
            <div className="aqi-level" style={{ color: category.color }}>
              {category.level}
            </div>
            <div className="aqi-description">
              {category.description}
            </div>
          </div>

          {/* Breathing Quality Indicator */}
          <div className="breathing-quality">
            <div className="section-title">
              <span className="section-icon">🫁</span>
              Breathing Quality
            </div>
            <div className="breathing-indicator">
              <div className="breathing-value" style={{ color: category.color }}>
                {category.breathingQuality}
              </div>
              <div className="breathing-description">
                {category.healthImplications}
              </div>
            </div>
          </div>

          {/* Stargazing Impact */}
          <div className="stargazing-impact">
            <div className="section-title">
              <span className="section-icon">🔭</span>
              Impact on Stargazing
            </div>
            <div className="impact-description">
              {category.stargazingImpact}
            </div>
          </div>

          {/* Pollutant Details */}
          <div className="pollutant-details">
            <div className="section-title">
              <span className="section-icon">⚗️</span>
              Air Quality Breakdown
            </div>
            
            {dominantPollutant && (
              <div className="dominant-pollutant">
                <strong>Main Contributor:</strong> {dominantPollutant.fullName} ({dominantPollutant.name})
              </div>
            )}

            <div className="pollutant-grid">
              {aqiData.pm25 !== null && (
                <div className="pollutant-card">
                  <div className="pollutant-name">PM2.5</div>
                  <div className="pollutant-value">{aqiData.pm25.toFixed(1)}</div>
                  <div className="pollutant-unit">µg/m³</div>
                </div>
              )}

              {aqiData.pm10 !== null && (
                <div className="pollutant-card">
                  <div className="pollutant-name">PM10</div>
                  <div className="pollutant-value">{aqiData.pm10.toFixed(1)}</div>
                  <div className="pollutant-unit">µg/m³</div>
                </div>
              )}

              {aqiData.o3 !== null && (
                <div className="pollutant-card">
                  <div className="pollutant-name">O₃</div>
                  <div className="pollutant-value">{aqiData.o3.toFixed(1)}</div>
                  <div className="pollutant-unit">µg/m³</div>
                </div>
              )}

              {aqiData.no2 !== null && (
                <div className="pollutant-card">
                  <div className="pollutant-name">NO₂</div>
                  <div className="pollutant-value">{aqiData.no2.toFixed(1)}</div>
                  <div className="pollutant-unit">µg/m³</div>
                </div>
              )}

              {aqiData.so2 !== null && (
                <div className="pollutant-card">
                  <div className="pollutant-name">SO₂</div>
                  <div className="pollutant-value">{aqiData.so2.toFixed(1)}</div>
                  <div className="pollutant-unit">µg/m³</div>
                </div>
              )}

              {aqiData.co !== null && (
                <div className="pollutant-card">
                  <div className="pollutant-name">CO</div>
                  <div className="pollutant-value">{aqiData.co.toFixed(1)}</div>
                  <div className="pollutant-unit">µg/m³</div>
                </div>
              )}
            </div>
          </div>

          {/* Health Recommendations */}
          <div className="health-recommendations">
            <div className="section-title">
              <span className="section-icon">💡</span>
              Recommendations
            </div>
            <div className="recommendations-content">
              {aqiData.aqi <= 50 && (
                <ul>
                  <li>Perfect conditions for outdoor activities</li>
                  <li>Excellent visibility for stargazing</li>
                  <li>No health precautions needed</li>
                </ul>
              )}
              {aqiData.aqi > 50 && aqiData.aqi <= 100 && (
                <ul>
                  <li>Generally safe for most people</li>
                  <li>Sensitive individuals should monitor symptoms</li>
                  <li>Good visibility for stargazing</li>
                </ul>
              )}
              {aqiData.aqi > 100 && aqiData.aqi <= 150 && (
                <ul>
                  <li>Sensitive groups should reduce prolonged outdoor activities</li>
                  <li>May experience reduced visibility</li>
                  <li>Consider indoor observations if sensitive</li>
                </ul>
              )}
              {aqiData.aqi > 150 && (
                <ul>
                  <li>Everyone should limit outdoor activities</li>
                  <li>Significantly reduced visibility expected</li>
                  <li>Stargazing not recommended</li>
                  <li>Stay indoors if possible</li>
                </ul>
              )}
            </div>
          </div>

          {/* Pollution Reduction Measures */}
          <div className="pollution-reduction">
            <div className="section-title">
              <span className="section-icon">🌍</span>
              Pollution Reduction Measures
            </div>
            <div className="reduction-content">
              {aqiData.aqi <= 50 && (
                <ul>
                  <li>Maintain clean air habits like using public transport and reducing waste.</li>
                  <li>Encourage community tree planting programs.</li>
                </ul>
              )}
              {aqiData.aqi > 50 && aqiData.aqi <= 100 && (
                <ul>
                  <li>Use public transportation, carpool, or bike when possible.</li>
                  <li>Conserve energy at home by using LED bulbs and efficient appliances.</li>
                  <li>Support local clean air initiatives.</li>
                </ul>
              )}
              {aqiData.aqi > 100 && aqiData.aqi <= 150 && (
                <ul>
                  <li>Reduce vehicle trips and avoid idling your car.</li>
                  <li>Limit use of gas-powered equipment like lawn mowers.</li>
                  <li>Switch to renewable energy sources when possible.</li>
                </ul>
              )}
              {aqiData.aqi > 150 && aqiData.aqi <= 200 && (
                <ul>
                  <li>Avoid open-burning activities (e.g., burning leaves or trash).</li>
                  <li>Use energy-efficient appliances and turn off devices when not in use.</li>
                  <li>Advocate for better public transportation infrastructure.</li>
                </ul>
              )}
              {aqiData.aqi > 200 && (
                <ul>
                  <li>Advocate for stricter pollution control on industries.</li>
                  <li>Encourage widespread adoption of electric vehicles and renewable energy sources.</li>
                  <li>Support policies that reduce industrial emissions.</li>
                </ul>
              )}
            </div>
          </div>

          <div className="data-source">
            <small>
              <strong>Data source:</strong> {aqiData.source}
              {aqiData.isMockData && (
                <span style={{ color: '#ff7e00', fontWeight: 'bold' }}>
                  {' '}⚠️ Mock data - Real-time data unavailable
                </span>
              )}
              {!aqiData.isMockData && aqiData.isStale && (
                <span style={{ color: '#ff7e00', fontWeight: 'bold' }}>
                  {' '}⚠️ Data may be outdated
                </span>
              )}
            </small>
          </div>

          <button onClick={() => fetchAQIData(true)} className="refresh-button">
            🔄 Refresh Data
          </button>
        </div>
      )}
    </div>
  );
}

AQIView.propTypes = {
  location: PropTypes.shape({
    name: PropTypes.string,
    position: PropTypes.arrayOf(PropTypes.number)
  }),
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default AQIView;
