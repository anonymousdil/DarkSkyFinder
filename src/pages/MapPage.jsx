import { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import LayerSwitcher from '../components/LayerSwitcher';
import SkyInfoPanel from '../components/SkyInfoPanel';
import './MapPage.css';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to change map view
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

function MapPage() {
  const [center, setCenter] = useState([20, 0]);
  const [zoom, setZoom] = useState(2);
  const [markers, setMarkers] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [currentLayer, setCurrentLayer] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showSkyInfo, setShowSkyInfo] = useState(false);

  const mapRef = useRef();

  // Function to search location by name or coordinates
  const handleSearch = async () => {
    if (!searchInput.trim()) {
      setError('Please enter a location or coordinates');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if input is coordinates (lat, lon)
      const coordPattern = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
      const coordMatch = searchInput.match(coordPattern);

      if (coordMatch) {
        // Input is coordinates
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          await addMarker(lat, lon, `Coordinates: ${lat}, ${lon}`);
        } else {
          setError('Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
        }
      } else {
        // Input is a location name - use Nominatim API for geocoding
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}`
        );

        if (response.data && response.data.length > 0) {
          const location = response.data[0];
          const lat = parseFloat(location.lat);
          const lon = parseFloat(location.lon);
          await addMarker(lat, lon, location.display_name);
        } else {
          setError('Location not found. Please try a different search.');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to add a marker and fetch AQI
  const addMarker = async (lat, lon, name) => {
    try {
      // Fetch AQI data from OpenAQ API (or use a mock for demonstration)
      let aqi = 'N/A';
      try {
        // Note: OpenAQ API might have rate limits or require authentication
        // For demo purposes, we'll use a mock AQI value
        // In production, replace with actual API call
        aqi = Math.floor(Math.random() * 150) + 1; // Mock AQI between 1-150
      } catch (aqiError) {
        console.error('AQI fetch error:', aqiError);
      }

      const newMarker = {
        id: Date.now(),
        position: [lat, lon],
        name: name,
        aqi: aqi
      };

      setMarkers(prev => [...prev, newMarker]);
      setCenter([lat, lon]);
      setZoom(10);
      setSearchInput('');
    } catch (err) {
      console.error('Error adding marker:', err);
      setError('Error adding marker to map');
    }
  };

  const toggleMapType = () => {
    setIsLightPollutionMap(!isLightPollutionMap);
  };

  const handleLayerChange = (layerId) => {
    setCurrentLayer(layerId);
  };

  const handleMarkerClick = (marker) => {
    setSelectedLocation(marker);
    setShowSkyInfo(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="map-page-container">
      <div className="map-controls">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search location or enter coordinates (lat, lon)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button 
            className="search-button" 
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="map-container">
        <div className="layer-switcher-container">
          <LayerSwitcher
            currentLayer={currentLayer}
            onLayerChange={handleLayerChange}
          />
        </div>

        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <ChangeView center={center} zoom={zoom} />
          
          {currentLayer === 'standard' && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}
          
          {currentLayer === 'light-pollution' && (
            <TileLayer
              attribution='Light Pollution Map &copy; <a href="https://djlorenz.github.io/astronomy/lp2020/">DJ Lorenz</a>'
              url="https://tiles.lightpollutionmap.info/2020/{z}/{x}/{y}.png"
              maxZoom={18}
            />
          )}

          {currentLayer === 'satellite' && (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          )}

          {markers.map((marker) => (
            <Marker 
              key={marker.id} 
              position={marker.position}
              eventHandlers={{
                click: () => handleMarkerClick(marker),
              }}
            >
              <Popup>
                <div className="popup-content">
                  <h3>{marker.name}</h3>
                  <p><strong>AQI:</strong> {marker.aqi}</p>
                  <p className="aqi-description">
                    {marker.aqi !== 'N/A' && marker.aqi <= 50 && 'Good air quality'}
                    {marker.aqi !== 'N/A' && marker.aqi > 50 && marker.aqi <= 100 && 'Moderate air quality'}
                    {marker.aqi !== 'N/A' && marker.aqi > 100 && 'Unhealthy air quality'}
                  </p>
                  <p className="coordinates">
                    Coordinates: {marker.position[0].toFixed(4)}, {marker.position[1].toFixed(4)}
                  </p>
                  <button 
                    className="view-sky-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkerClick(marker);
                    }}
                  >
                    View Sky Conditions
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <SkyInfoPanel
        location={selectedLocation}
        visible={showSkyInfo}
        onClose={() => setShowSkyInfo(false)}
      />
    </div>
  );
}

export default MapPage;
