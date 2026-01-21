import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { getAQI, getAQICategory } from '../services/aqiService';
import { getLightPollution } from '../services/lightPollutionService';
import { getSkyViewability, getStargazingQuality } from '../services/skyViewabilityService';
import { getSunTimes, formatTime } from '../services/sunCalculationService';
import { getBestStargazingTimes } from '../services/stargazingTimeService';
import './UltimateView.css';

function UltimateView({ location, visible, onClose }) {
  const [aqiData, setAqiData] = useState(null);
  const [lightData, setLightData] = useState(null);
  const [skyData, setSkyData] = useState(null);
  const [sunData, setSunData] = useState(null);
  const [stargazingTimes, setStargazingTimes] = useState(null);
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
      
      // Calculate sun times
      const sun = getSunTimes(lat, lon);
      setSunData(sun);
      
      // Calculate best stargazing times
      const stargazing = getBestStargazingTimes(lat, lon, sky, light);
      setStargazingTimes(stargazing);
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

  const getFactorColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#8BC34A';
    if (score >= 40) return '#FFC107';
    if (score >= 20) return '#FF9800';
    return '#F44336';
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

          {/* Sunrise & Sunset Times */}
          {sunData && (
            <div className="sun-times-section">
              <div className="section-title">
                <span className="section-icon">☀️</span>
                Sunrise & Sunset
              </div>
              <div className="sun-times-grid">
                <div className="sun-time-card">
                  <div className="sun-time-label">🌅 Sunrise</div>
                  <div className="sun-time-value">{formatTime(sunData.sunrise)}</div>
                </div>
                <div className="sun-time-card">
                  <div className="sun-time-label">🌇 Sunset</div>
                  <div className="sun-time-value">{formatTime(sunData.sunset)}</div>
                </div>
                <div className="sun-time-card">
                  <div className="sun-time-label">🌌 Astro Dusk</div>
                  <div className="sun-time-value">{formatTime(sunData.astronomicalTwilight.dusk)}</div>
                </div>
                <div className="sun-time-card">
                  <div className="sun-time-label">🌄 Astro Dawn</div>
                  <div className="sun-time-value">{formatTime(sunData.astronomicalTwilight.dawn)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Best Stargazing Times */}
          {stargazingTimes && (
            <div className="stargazing-times-section">
              <div className="section-title">
                <span className="section-icon">🔭</span>
                Best Time for Stargazing
              </div>
              
              <div className="quality-indicator" style={{ 
                borderLeft: `4px solid ${stargazingTimes.qualityCategory.color}` 
              }}>
                <div className="quality-emoji">{stargazingTimes.qualityCategory.emoji}</div>
                <div className="quality-info">
                  <div className="quality-level" style={{ color: stargazingTimes.qualityCategory.color }}>
                    {stargazingTimes.qualityCategory.level}
                  </div>
                  <div className="quality-description">
                    {stargazingTimes.qualityCategory.description}
                  </div>
                  <div className="quality-score">
                    Viewing Quality: {stargazingTimes.overallQuality}/100
                  </div>
                </div>
              </div>

              {stargazingTimes.timeWindows.optimal && (
                <div className="optimal-time-window">
                  <h5>⭐ Optimal Viewing Window</h5>
                  <div className="time-window-details">
                    <div className="window-time">
                      {formatTime(stargazingTimes.timeWindows.optimal.start)} - {formatTime(stargazingTimes.timeWindows.optimal.end)}
                    </div>
                    <div className="window-duration">
                      Duration: {stargazingTimes.timeWindows.optimal.duration}
                    </div>
                    <div className="window-description">
                      {stargazingTimes.timeWindows.optimal.description}
                    </div>
                  </div>
                </div>
              )}

              {/* Quality Factors */}
              <div className="quality-factors">
                <h5>Conditions Breakdown</h5>
                <div className="factor-item">
                  <span className="factor-label">☁️ Cloud Cover</span>
                  <div className="factor-bar-container">
                    <div 
                      className="factor-bar" 
                      style={{ 
                        width: `${stargazingTimes.scores.cloudCover}%`,
                        backgroundColor: getFactorColor(stargazingTimes.scores.cloudCover)
                      }}
                    ></div>
                  </div>
                  <span className="factor-value">{stargazingTimes.scores.cloudCover}/100</span>
                </div>
                <div className="factor-item">
                  <span className="factor-label">🌌 Light Pollution</span>
                  <div className="factor-bar-container">
                    <div 
                      className="factor-bar" 
                      style={{ 
                        width: `${stargazingTimes.scores.lightPollution}%`,
                        backgroundColor: getFactorColor(stargazingTimes.scores.lightPollution)
                      }}
                    ></div>
                  </div>
                  <span className="factor-value">{stargazingTimes.scores.lightPollution}/100</span>
                </div>
                <div className="factor-item">
                  <span className="factor-label">💧 Humidity</span>
                  <div className="factor-bar-container">
                    <div 
                      className="factor-bar" 
                      style={{ 
                        width: `${stargazingTimes.scores.humidity}%`,
                        backgroundColor: getFactorColor(stargazingTimes.scores.humidity)
                      }}
                    ></div>
                  </div>
                  <span className="factor-value">{stargazingTimes.scores.humidity}/100</span>
                </div>
                <div className="factor-item">
                  <span className="factor-label">🔍 Transparency</span>
                  <div className="factor-bar-container">
                    <div 
                      className="factor-bar" 
                      style={{ 
                        width: `${stargazingTimes.scores.transparency}%`,
                        backgroundColor: getFactorColor(stargazingTimes.scores.transparency)
                      }}
                    ></div>
                  </div>
                  <span className="factor-value">{stargazingTimes.scores.transparency}/100</span>
                </div>
              </div>

              {/* Recommendations */}
              {stargazingTimes.recommendations && stargazingTimes.recommendations.length > 0 && (
                <div className="stargazing-recommendations">
                  <h5>💡 Recommendations</h5>
                  <ul>
                    {stargazingTimes.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

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
