import { useState } from 'react';
import PropTypes from 'prop-types';
import './SearchResults.css';

/**
 * Search Results Component
 * Displays multiple search results with ranking metadata
 */

/**
 * Sanitize and render fuzzy highlight safely
 * Only allows <b> tags from fuzzysort
 */
const renderFuzzyHighlight = (highlight) => {
  if (!highlight) return null;
  
  // Split by <b> and </b> tags and render as React elements
  const parts = highlight.split(/(<b>|<\/b>)/);
  const elements = [];
  let inBold = false;
  
  parts.forEach((part, index) => {
    if (part === '<b>') {
      inBold = true;
    } else if (part === '</b>') {
      inBold = false;
    } else if (part) {
      elements.push(
        inBold ? <b key={index}>{part}</b> : <span key={index}>{part}</span>
      );
    }
  });
  
  return <>{elements}</>;
};

function SearchResults({ results, onSelectResult, visible, onClose }) {
  const [expandedResults, setExpandedResults] = useState(new Set());

  if (!visible || !results || results.length === 0) {
    return null;
  }

  const toggleExpanded = (resultId) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#4a90e2'; // Default blue
  };

  const getScoreColor = (score) => {
    const scoreNum = parseFloat(score);
    if (scoreNum >= 0.8) return '#4CAF50'; // Green
    if (scoreNum >= 0.6) return '#8BC34A'; // Light green
    if (scoreNum >= 0.4) return '#FFC107'; // Yellow
    if (scoreNum >= 0.2) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const formatCoordinates = (lat, lon) => {
    return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  };

  return (
    <div className="search-results-overlay">
      <div className="search-results-panel">
        <div className="results-header">
          <h2>Search Results</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="results-content">
          <div className="results-info">
            Found {results.length} location{results.length !== 1 ? 's' : ''}
          </div>

          <div className="results-list">
            {results.map((result) => {
              const isExpanded = expandedResults.has(result.id);
              const metadata = result.metadata || {};

              return (
                <div key={result.id} className="result-item">
                  <div className="result-main">
                    <div className="result-rank-badge" style={{ backgroundColor: getRankBadgeColor(result.rank) }}>
                      #{result.rank}
                    </div>
                    
                    <div className="result-info">
                      <div className="result-name">
                        {result.name}
                      </div>
                      <div className="result-details">
                        <span className="result-type">{result.type}</span>
                        <span className="result-separator">•</span>
                        <span className="result-coords">
                          {formatCoordinates(result.lat, result.lon)}
                        </span>
                      </div>
                    </div>

                    <div className="result-actions">
                      <button
                        className="select-button"
                        onClick={() => onSelectResult(result)}
                      >
                        Select
                      </button>
                      <button
                        className="details-button"
                        onClick={() => toggleExpanded(result.id)}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && metadata && (
                    <div className="result-metadata">
                      <h4>Ranking Details</h4>
                      
                      <div className="metadata-grid">
                        <div className="metadata-item">
                          <span className="metadata-label">Overall Score:</span>
                          <span 
                            className="metadata-value score-badge"
                            style={{ backgroundColor: getScoreColor(metadata.rankingScore) }}
                          >
                            {metadata.rankingScore}
                          </span>
                        </div>

                        <div className="metadata-item">
                          <span className="metadata-label">Similarity:</span>
                          <span className="metadata-value">
                            {metadata.similarityScore}
                          </span>
                        </div>

                        <div className="metadata-item">
                          <span className="metadata-label">Importance:</span>
                          <span className="metadata-value">
                            {result.importance?.toFixed(3) || 'N/A'}
                          </span>
                        </div>

                        <div className="metadata-item">
                          <span className="metadata-label">Category:</span>
                          <span className="metadata-value">
                            {result.category}
                          </span>
                        </div>
                      </div>

                      {metadata.rankingReasons && metadata.rankingReasons.length > 0 && (
                        <div className="ranking-reasons">
                          <h5>Ranking Factors:</h5>
                          <ul>
                            {metadata.rankingReasons.map((reason, idx) => (
                              <li key={idx}>
                                <strong>{reason.factor.replace(/_/g, ' ')}:</strong> {reason.value}
                                {' '}(contribution: {reason.contribution})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {metadata.fuzzyHighlight && (
                        <div className="fuzzy-match">
                          <h5>Fuzzy Match Highlight:</h5>
                          <div className="fuzzy-highlight">
                            {renderFuzzyHighlight(metadata.fuzzyHighlight)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

SearchResults.propTypes = {
  results: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    lat: PropTypes.number.isRequired,
    lon: PropTypes.number.isRequired,
    type: PropTypes.string,
    category: PropTypes.string,
    rank: PropTypes.number,
    importance: PropTypes.number,
    metadata: PropTypes.object
  })),
  onSelectResult: PropTypes.func.isRequired,
  visible: PropTypes.bool,
  onClose: PropTypes.func.isRequired
};

SearchResults.defaultProps = {
  results: [],
  visible: false
};

export default SearchResults;
