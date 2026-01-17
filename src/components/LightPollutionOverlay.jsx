import { useState, useEffect } from 'react';
import { CircleMarker, useMap } from 'react-leaflet';
import PropTypes from 'prop-types';
import { generateSimplifiedGrid } from '../services/lightPollutionOverlayService';

/**
 * Component to render light pollution overlay on the map
 * Shows color-coded circles representing light pollution levels
 */
function LightPollutionOverlay({ center, radius = 1000, visible = true }) {
  const [gridData, setGridData] = useState([]);
  const [loading, setLoading] = useState(false);
  const map = useMap();

  useEffect(() => {
    if (!visible || !center) {
      setGridData([]);
      return;
    }

    const fetchGridData = async () => {
      setLoading(true);
      try {
        const [lat, lon] = center;
        const data = await generateSimplifiedGrid(lat, lon, radius);
        setGridData(data);
      } catch (error) {
        console.error('Error generating light pollution overlay:', error);
        setGridData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGridData();
  }, [center, radius, visible]);

  // Adjust circle size based on zoom level
  const zoom = map.getZoom();
  const radiusPixels = Math.max(30, 100 - zoom * 4); // Larger circles for better visibility

  if (!visible || gridData.length === 0) {
    return null;
  }

  return (
    <>
      {loading && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
          fontSize: '14px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          Loading light pollution overlay...
        </div>
      )}
      {gridData.map((point, index) => (
        <CircleMarker
          key={`overlay-${index}`}
          center={[point.lat, point.lon]}
          radius={radiusPixels}
          pathOptions={{
            fillColor: point.color,
            color: point.color,
            weight: 0,
            fillOpacity: point.intensity * 0.8, // Increased opacity for better visibility
            interactive: false // Don't interfere with map interactions
          }}
        />
      ))}
    </>
  );
}

LightPollutionOverlay.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number),
  radius: PropTypes.number,
  visible: PropTypes.bool
};

export default LightPollutionOverlay;
