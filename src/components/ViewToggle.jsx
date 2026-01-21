import PropTypes from 'prop-types';
import './ViewToggle.css';

function ViewToggle({ currentView, onViewChange, onLayersToggle }) {
  const views = [
    { id: 'aqi', name: 'AQI', icon: '🌫️', description: 'Air Quality Index' },
    { id: 'light', name: 'Light', icon: '🌌', description: 'Light Pollution' },
    { id: 'ultimate', name: 'Ultimate', icon: '🌟', description: 'Complete Report' }
  ];

  return (
    <div className="view-toggle-container">
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
      <button
        className="view-toggle-btn layers-toggle"
        onClick={onLayersToggle}
        title="Toggle Map Layers"
      >
        <span className="view-icon">🗺️</span>
        <span className="view-name">Layers</span>
      </button>
    </div>
  );
}

ViewToggle.propTypes = {
  currentView: PropTypes.string.isRequired,
  onViewChange: PropTypes.func.isRequired,
  onLayersToggle: PropTypes.func.isRequired
};

export default ViewToggle;
