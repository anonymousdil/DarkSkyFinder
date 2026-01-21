import PropTypes from 'prop-types';
import './Board.css';

/**
 * Board Component
 * Displays and manages pinned locations
 */
function Board({ pinnedLocations, onSelectLocation, onRemovePin, visible, onClose }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="board-panel">
      <div className="board-header">
        <h3>📌 Pinned Locations Board</h3>
        <button className="close-button" onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      <div className="board-content">
        {pinnedLocations.length === 0 ? (
          <div className="empty-board">
            <div className="empty-icon">📍</div>
            <p>No pinned locations yet</p>
            <p className="empty-hint">
              Click on the map or pin markers from the popup to add locations to your board
            </p>
          </div>
        ) : (
          <div className="pinned-list">
            <div className="board-info">
              {pinnedLocations.length} location{pinnedLocations.length !== 1 ? 's' : ''} pinned
            </div>
            {pinnedLocations.map((location) => (
              <div key={location.id} className="pinned-item">
                <div className="pinned-icon">📌</div>
                <div className="pinned-info">
                  <div className="pinned-name">{location.name}</div>
                  <div className="pinned-details">
                    <span className="pinned-coords">
                      {location.position[0].toFixed(4)}°, {location.position[1].toFixed(4)}°
                    </span>
                    {location.lightPollution && location.pollutionIndex != null && (
                      <>
                        <span className="pinned-separator">•</span>
                        <span className="pinned-light">
                          Bortle: {location.pollutionIndex}
                        </span>
                      </>
                    )}
                    {location.aqiCategory && (
                      <>
                        <span className="pinned-separator">•</span>
                        <span 
                          className="pinned-aqi"
                          style={{ color: location.aqiCategory.color }}
                        >
                          AQI: {location.aqi}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="pinned-actions">
                  <button
                    className="navigate-button"
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${location.position[0]},${location.position[1]}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    title="Navigate with Google Maps"
                  >
                    🧭
                  </button>
                  <button
                    className="view-button"
                    onClick={() => onSelectLocation(location)}
                    title="View on map"
                  >
                    🗺️
                  </button>
                  <button
                    className="remove-button"
                    onClick={() => onRemovePin(location.id)}
                    title="Remove pin"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Board.propTypes = {
  pinnedLocations: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    position: PropTypes.arrayOf(PropTypes.number).isRequired,
    name: PropTypes.string.isRequired,
    aqi: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    aqiCategory: PropTypes.object,
    lightPollution: PropTypes.object,
    pollutionIndex: PropTypes.number,
    isPinned: PropTypes.bool
  })).isRequired,
  onSelectLocation: PropTypes.func.isRequired,
  onRemovePin: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default Board;
