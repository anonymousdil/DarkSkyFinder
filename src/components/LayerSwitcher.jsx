import './LayerSwitcher.css';

function LayerSwitcher({ currentLayer, onLayerChange }) {
  const layers = [
    { id: 'standard', name: 'Standard Map', icon: '🗺️' },
    { id: 'terrain', name: 'Terrain Map', icon: '🏔️' },
    { id: 'satellite', name: 'Satellite View', icon: '🛰️' }
  ];

  return (
    <div className="layer-switcher">
      <div className="layer-switcher-title">Map Layers</div>
      <div className="layer-buttons">
        {layers.map((layer) => (
          <button
            key={layer.id}
            className={`layer-button ${currentLayer === layer.id ? 'active' : ''}`}
            onClick={() => onLayerChange(layer.id)}
            title={layer.name}
          >
            <span className="layer-icon">{layer.icon}</span>
            <span className="layer-name">{layer.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default LayerSwitcher;
