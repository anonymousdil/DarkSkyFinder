import PropTypes from 'prop-types';
import './ViewToggle.css';

function ViewToggle({ currentView, onViewChange }) {
  const views = [
    { id: 'aqi', name: 'AQI', icon: '🌫️', description: 'Air Quality Index' },
    { id: 'light', name: 'Light', icon: '🌌', description: 'Light Pollution' },
    { id: 'ultimate', name: 'Ultimate', icon: '🌟', description: 'Complete Report' }
  ];

  return (
    <div className="view-toggle-container">
      <div className="view-toggle-label">Select View:</div>
      <div className="view-toggle-buttons">
        {views.map((view) => (
          <button
            key={view.id}
            className={`view-toggle-btn ${currentView === view.id ? 'active' : ''}`}
            onClick={() => onViewChange(view.id)}
            title={view.description}
          >
            <span className="view-icon">{view.icon}</span>
            <span className="view-name">{view.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

ViewToggle.propTypes = {
  currentView: PropTypes.string.isRequired,
  onViewChange: PropTypes.func.isRequired
};

export default ViewToggle;
