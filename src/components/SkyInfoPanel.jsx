import { useState, useEffect } from 'react';
import {
  getSkyViewability,
  interpretCloudCover,
  interpretSeeing,
  interpretTransparency,
  getStargazingQuality
} from '../services/skyViewabilityService';
import './SkyInfoPanel.css';

function SkyInfoPanel({ location, visible, onClose }) {
  const [skyData, setSkyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location && visible) {
      fetchSkyData();
    }
  }, [location, visible]);

  const fetchSkyData = async () => {
    if (!location || !location.position) return;

    setLoading(true);
    setError(null);

    try {
      const [lat, lon] = location.position;
      const data = await getSkyViewability(lat, lon);
      setSkyData(data);
    } catch (err) {
      console.error('Error fetching sky data:', err);
      setError('Unable to fetch sky viewability data');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="sky-info-panel">
      <div className="sky-info-header">
        <h3>Sky Conditions</h3>
        <button className="close-button" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading sky conditions...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchSkyData} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && skyData && (
        <div className="sky-info-content">
          <div className="location-info">
            <h4>{location.name}</h4>
            <p className="coordinates">
              {location.position[0].toFixed(4)}°, {location.position[1].toFixed(4)}°
            </p>
          </div>

          <div className="overall-rating">
            <div className="rating-label">Stargazing Quality</div>
            <div 
              className="rating-value"
              style={{ color: getStargazingQuality(skyData).color }}
            >
              <span className="rating-emoji">{getStargazingQuality(skyData).emoji}</span>
              <span>{getStargazingQuality(skyData).rating}</span>
            </div>
          </div>

          <div className="sky-metrics">
            <div className="metric-card">
              <div className="metric-label">
                <span className="metric-icon">☁️</span>
                Cloud Cover
              </div>
              <div className="metric-value" style={{ color: interpretCloudCover(skyData.cloudCover).color }}>
                {interpretCloudCover(skyData.cloudCover).quality}
              </div>
              <div className="metric-detail">
                {interpretCloudCover(skyData.cloudCover).text}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">
                <span className="metric-icon">👁️</span>
                Seeing
              </div>
              <div className="metric-value">
                {interpretSeeing(skyData.seeing).quality}
              </div>
              <div className="metric-detail">
                {interpretSeeing(skyData.seeing).text}
              </div>
              <div className="metric-description">
                {interpretSeeing(skyData.seeing).description}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">
                <span className="metric-icon">🔭</span>
                Transparency
              </div>
              <div className="metric-value">
                {interpretTransparency(skyData.transparency).quality}
              </div>
              <div className="metric-detail">
                {interpretTransparency(skyData.transparency).text}
              </div>
              <div className="metric-description">
                {interpretTransparency(skyData.transparency).description}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">
                <span className="metric-icon">🌡️</span>
                Temperature
              </div>
              <div className="metric-value">
                {skyData.temp2m}°C
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">
                <span className="metric-icon">💧</span>
                Humidity
              </div>
              <div className="metric-value">
                {skyData.rh2m}%
              </div>
            </div>

            {skyData.wind10m && (
              <div className="metric-card">
                <div className="metric-label">
                  <span className="metric-icon">💨</span>
                  Wind
                </div>
                <div className="metric-value">
                  {skyData.wind10m.direction || 'N/A'}
                </div>
                <div className="metric-detail">
                  Speed: {skyData.wind10m.speed || 'N/A'} m/s
                </div>
              </div>
            )}
          </div>

          <div className="data-source">
            <small>Data source: {skyData.source}</small>
          </div>

          <button onClick={fetchSkyData} className="refresh-button">
            🔄 Refresh Data
          </button>
        </div>
      )}
    </div>
  );
}

export default SkyInfoPanel;
