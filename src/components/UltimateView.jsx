import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getAQI, getAQICategory } from '../services/aqiService';
import { getLightPollution } from '../services/lightPollutionService';
import { getSkyViewability, getStargazingQuality } from '../services/skyViewabilityService';
import './UltimateView.css';

function UltimateView({ location, visible, onClose }) {
  const [aqiData, setAqiData] = useState(null);
  const [lightData, setLightData] = useState(null);
  const [skyData, setSkyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllData = useCallback(async () => {
    if (!location || !location.position) return;

    setLoading(true);
    setError(null);

    try {
      const [lat, lon] = location.position;
      
      // Fetch all data in parallel
      const [aqi, light, sky] = await Promise.all([
        getAQI(lat, lon),
        getLightPollution(lat, lon),
        getSkyViewability(lat, lon)
      ]);

      setAqiData(aqi);
      setLightData(light);
      setSkyData(sky);
    } catch (err) {
      console.error('Error fetching comprehensive data:', err);
      setError('Unable to fetch complete stargazing data');
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    if (location && visible) {
      fetchAllData();
    }
  }, [location, visible, fetchAllData]);

  // Calculate comprehensive stargazing score
  const calculateComprehensiveScore = () => {
    if (!aqiData || !lightData || !skyData) return null;

    const skyQuality = getStargazingQuality(skyData);

    // Scoring weights
    const weights = {
      lightPollution: 0.40,  // 40% - Most important for stargazing
      skyConditions: 0.35,   // 35% - Cloud cover, seeing, transparency
      airQuality: 0.25       // 25% - Impacts visibility
    };

    // Light pollution score (1-10, inverted Bortle scale)
    const lightScore = (10 - lightData.bortleClass) * 1.11; // Normalize to 0-10

    // Sky conditions score (based on stargazing quality rating)
    const skyScoreMap = {
      'Excellent': 10,
      'Very Good': 8.5,
      'Good': 7,
      'Fair': 5,
      'Poor': 3,
      'Very Poor': 1
    };
    const skyScore = skyScoreMap[skyQuality.rating] || 5;

    // Air quality score (inverted AQI, normalized)
    let aqiScore = 10;
    if (aqiData.aqi !== 'N/A') {
      if (aqiData.aqi <= 50) aqiScore = 10;
      else if (aqiData.aqi <= 100) aqiScore = 8;
      else if (aqiData.aqi <= 150) aqiScore = 5;
      else if (aqiData.aqi <= 200) aqiScore = 3;
      else aqiScore = 1;
    }

    // Calculate weighted score
    const totalScore = (
      lightScore * weights.lightPollution +
      skyScore * weights.skyConditions +
      aqiScore * weights.airQuality
    );

    return {
      total: totalScore.toFixed(1),
      lightScore: lightScore.toFixed(1),
      skyScore: skyScore.toFixed(1),
      aqiScore: aqiScore.toFixed(1),
      rating: getRating(totalScore),
      color: getScoreColor(totalScore),
      emoji: getScoreEmoji(totalScore)
    };
  };

  const getRating = (score) => {
    if (score >= 9) return 'Perfect';
    if (score >= 7.5) return 'Excellent';
    if (score >= 6) return 'Very Good';
    if (score >= 4.5) return 'Good';
    if (score >= 3) return 'Fair';
    if (score >= 1.5) return 'Poor';
    return 'Very Poor';
  };

  const getScoreColor = (score) => {
    if (score >= 9) return '#00e400';
    if (score >= 7.5) return '#4CAF50';
    if (score >= 6) return '#8BC34A';
    if (score >= 4.5) return '#FFEB3B';
    if (score >= 3) return '#FFC107';
    if (score >= 1.5) return '#FF9800';
    return '#F44336';
  };

  const getScoreEmoji = (score) => {
    if (score >= 9) return '🌟';
    if (score >= 7.5) return '⭐';
    if (score >= 6) return '✨';
    if (score >= 4.5) return '🌙';
    if (score >= 3) return '☁️';
    return '🌧️';
  };

  if (!visible) return null;

  const comprehensiveScore = calculateComprehensiveScore();
  const aqiCategory = aqiData ? getAQICategory(aqiData.aqi) : null;

  return (
    <div className="ultimate-view-panel">
      <div className="ultimate-view-header">
        <h3>Ultimate Stargazing Report</h3>
        <button className="close-button" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading comprehensive stargazing data...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchAllData} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && comprehensiveScore && (
        <div className="ultimate-view-content">
          <div className="location-info">
            <h4>{location.name}</h4>
            <p className="coordinates">
              {location.position[0].toFixed(4)}°, {location.position[1].toFixed(4)}°
            </p>
          </div>

          {/* Overall Stargazing Score */}
          <div className="ultimate-score-display" style={{ borderColor: comprehensiveScore.color }}>
            <div className="score-icon">{comprehensiveScore.emoji}</div>
            <div className="score-value" style={{ color: comprehensiveScore.color }}>
              {comprehensiveScore.total}
            </div>
            <div className="score-max">/10</div>
            <div className="score-rating" style={{ color: comprehensiveScore.color }}>
              {comprehensiveScore.rating}
            </div>
            <div className="score-description">
              Overall Stargazing Conditions
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="score-breakdown">
            <div className="section-title">
              <span className="section-icon">📊</span>
              Score Breakdown
            </div>

            <div className="breakdown-item">
              <div className="breakdown-label">
                <span className="breakdown-icon">🌌</span>
                Light Pollution
                <span className="weight-badge">40%</span>
              </div>
              <div className="breakdown-bar-container">
                <div 
                  className="breakdown-bar" 
                  style={{ 
                    width: `${comprehensiveScore.lightScore * 10}%`,
                    backgroundColor: getScoreColor(comprehensiveScore.lightScore)
                  }}
                ></div>
              </div>
              <div className="breakdown-value">{comprehensiveScore.lightScore}/10</div>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-label">
                <span className="breakdown-icon">☁️</span>
                Sky Conditions
                <span className="weight-badge">35%</span>
              </div>
              <div className="breakdown-bar-container">
                <div 
                  className="breakdown-bar" 
                  style={{ 
                    width: `${comprehensiveScore.skyScore * 10}%`,
                    backgroundColor: getScoreColor(comprehensiveScore.skyScore)
                  }}
                ></div>
              </div>
              <div className="breakdown-value">{comprehensiveScore.skyScore}/10</div>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-label">
                <span className="breakdown-icon">🌫️</span>
                Air Quality
                <span className="weight-badge">25%</span>
              </div>
              <div className="breakdown-bar-container">
                <div 
                  className="breakdown-bar" 
                  style={{ 
                    width: `${comprehensiveScore.aqiScore * 10}%`,
                    backgroundColor: getScoreColor(comprehensiveScore.aqiScore)
                  }}
                ></div>
              </div>
              <div className="breakdown-value">{comprehensiveScore.aqiScore}/10</div>
            </div>
          </div>

          {/* Quick Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-title">Light Pollution</div>
              <div className="summary-value">Class {lightData.bortleClass}</div>
              <div className="summary-detail">{lightData.name}</div>
            </div>

            <div className="summary-card">
              <div className="summary-title">Sky Quality</div>
              <div className="summary-value">{skyData.cloudCover <= 3 ? 'Clear' : 'Cloudy'}</div>
              <div className="summary-detail">{getStargazingQuality(skyData).rating}</div>
            </div>

            <div className="summary-card">
              <div className="summary-title">Air Quality</div>
              <div className="summary-value">{aqiData.aqi}</div>
              <div className="summary-detail">{aqiCategory.level}</div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="detailed-metrics">
            <div className="section-title">
              <span className="section-icon">🔍</span>
              Detailed Metrics
            </div>

            <div className="metrics-group">
              <h5>Sky Conditions</h5>
              <div className="metric-row">
                <span>Cloud Cover:</span>
                <span>{skyData.cloudCover}/9</span>
              </div>
              <div className="metric-row">
                <span>Seeing:</span>
                <span>{skyData.seeing}/8</span>
              </div>
              <div className="metric-row">
                <span>Transparency:</span>
                <span>{skyData.transparency}/8</span>
              </div>
            </div>

            <div className="metrics-group">
              <h5>Light Pollution</h5>
              <div className="metric-row">
                <span>SQM Reading:</span>
                <span>{lightData.sqm} mag/arcsec²</span>
              </div>
              <div className="metric-row">
                <span>NELM:</span>
                <span>{lightData.nelm} mag</span>
              </div>
              <div className="metric-row">
                <span>Milky Way:</span>
                <span>{lightData.milkyWay}</span>
              </div>
            </div>

            <div className="metrics-group">
              <h5>Air Quality</h5>
              <div className="metric-row">
                <span>AQI Level:</span>
                <span style={{ color: aqiCategory.color }}>{aqiCategory.level}</span>
              </div>
              <div className="metric-row">
                <span>Visibility Impact:</span>
                <span>{aqiCategory.stargazingImpact}</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="ultimate-recommendations">
            <div className="section-title">
              <span className="section-icon">💡</span>
              Recommendations
            </div>

            {comprehensiveScore.total >= 7 && (
              <div className="recommendation-box excellent">
                <strong>🌟 Excellent Conditions!</strong>
                <ul>
                  <li>Perfect for deep sky observation</li>
                  <li>Great for astrophotography</li>
                  <li>Ideal for meteor shower viewing</li>
                  <li>Milky Way should be clearly visible</li>
                </ul>
              </div>
            )}

            {comprehensiveScore.total >= 4.5 && comprehensiveScore.total < 7 && (
              <div className="recommendation-box good">
                <strong>✨ Good Conditions</strong>
                <ul>
                  <li>Suitable for most stargazing activities</li>
                  <li>Planetary observation recommended</li>
                  <li>Bright deep sky objects visible</li>
                  <li>Consider using light pollution filters</li>
                </ul>
              </div>
            )}

            {comprehensiveScore.total < 4.5 && (
              <div className="recommendation-box fair">
                <strong>⚠️ Limited Conditions</strong>
                <ul>
                  <li>Best for lunar and planetary observation</li>
                  <li>Deep sky objects may be challenging</li>
                  <li>Consider finding a darker location</li>
                  <li>Light pollution filters highly recommended</li>
                </ul>
              </div>
            )}
          </div>

          <div className="data-sources">
            <small>
              Data from: {aqiData.source} • {lightData.source} • {skyData.source}
            </small>
          </div>

          <button onClick={fetchAllData} className="refresh-button">
            🔄 Refresh All Data
          </button>
        </div>
      )}
    </div>
  );
}

UltimateView.propTypes = {
  location: PropTypes.shape({
    name: PropTypes.string,
    position: PropTypes.arrayOf(PropTypes.number)
  }),
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default UltimateView;
