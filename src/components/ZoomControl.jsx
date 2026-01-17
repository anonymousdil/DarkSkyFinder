import { useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';
import './ZoomControl.css';

/**
 * ZoomControl Component
 * Provides a 0-100x zoom scale interface for the map
 * Maps the 0-100x scale to Leaflet's 0-18 zoom levels
 */
function ZoomControl() {
  const map = useMap();
  const [zoomScale, setZoomScale] = useState(0);

  // Leaflet zoom range: 0 (world view) to 18 (street level)
  const MIN_LEAFLET_ZOOM = 0;
  const MAX_LEAFLET_ZOOM = 18;
  
  // Custom zoom scale: 0x to 100x
  const MIN_SCALE = 0;
  const MAX_SCALE = 100;

  // Sync zoom scale with map zoom level
  useEffect(() => {
    /**
     * Convert Leaflet zoom level to 0-100x scale
     * @param {number} leafletZoom - Leaflet zoom level (0-18)
     * @returns {number} Zoom scale (0-100x)
     */
    const leafletToScale = (leafletZoom) => {
      return Math.round((leafletZoom / MAX_LEAFLET_ZOOM) * MAX_SCALE);
    };

    const updateZoomScale = () => {
      const currentZoom = map.getZoom();
      setZoomScale(leafletToScale(currentZoom));
    };

    // Initial update
    updateZoomScale();

    // Listen for zoom changes
    map.on('zoomend', updateZoomScale);

    return () => {
      map.off('zoomend', updateZoomScale);
    };
  }, [map, MAX_LEAFLET_ZOOM, MAX_SCALE]);

  /**
   * Convert 0-100x scale to Leaflet zoom level
   * @param {number} scale - Zoom scale (0-100x)
   * @returns {number} Leaflet zoom level (0-18)
   */
  const scaleToLeaflet = (scale) => {
    return Math.round((scale / MAX_SCALE) * MAX_LEAFLET_ZOOM);
  };

  const handleZoomIn = () => {
    const currentLeafletZoom = map.getZoom();
    if (currentLeafletZoom < MAX_LEAFLET_ZOOM) {
      map.setZoom(currentLeafletZoom + 1);
    }
  };

  const handleZoomOut = () => {
    const currentLeafletZoom = map.getZoom();
    if (currentLeafletZoom > MIN_LEAFLET_ZOOM) {
      map.setZoom(currentLeafletZoom - 1);
    }
  };

  const handleSliderChange = (e) => {
    const newScale = parseInt(e.target.value, 10);
    const newLeafletZoom = scaleToLeaflet(newScale);
    map.setZoom(newLeafletZoom);
  };

  return (
    <div className="zoom-control">
      <div className="zoom-control-title">Zoom Control</div>
      
      <div className="zoom-buttons">
        <button
          className="zoom-button"
          onClick={handleZoomOut}
          disabled={zoomScale <= MIN_SCALE}
          title="Zoom Out"
        >
          −
        </button>
        <button
          className="zoom-button"
          onClick={handleZoomIn}
          disabled={zoomScale >= MAX_SCALE}
          title="Zoom In"
        >
          +
        </button>
      </div>

      <div className="zoom-slider-container">
        <input
          type="range"
          min={MIN_SCALE}
          max={MAX_SCALE}
          value={zoomScale}
          onChange={handleSliderChange}
          className="zoom-slider"
          title={`Zoom: ${zoomScale}x`}
        />
      </div>

      <div className="zoom-display">
        <div className="zoom-level-indicator">{zoomScale}x</div>
        <div className="zoom-label">Zoom Level</div>
      </div>
    </div>
  );
}

export default ZoomControl;
