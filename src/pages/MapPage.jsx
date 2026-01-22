import { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { useSearchParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import PropTypes from 'prop-types';
import LayerSwitcher from '../components/LayerSwitcher';
import ZoomControl from '../components/ZoomControl';
import SkyInfoPanel from '../components/SkyInfoPanel';
import AQIView from '../components/AQIView';
import LightPollutionView from '../components/LightPollutionView';
import ConstellationView from '../components/ConstellationView';
import UltimateView from '../components/UltimateView';
import ViewToggle from '../components/ViewToggle';
import AutocompleteInput from '../components/AutocompleteInput';
import Board from '../components/Board';
import LightPollutionOverlay from '../components/LightPollutionOverlay';
import Stary from '../components/Stary';
import NearbyLocations from '../components/NearbyLocations';
import HelpTooltip from '../components/HelpTooltip';
import { searchLocations, parseCoordinates } from '../services/searchService';
import { getAQI, getAQICategory } from '../services/aqiService';
import { getLightPollution } from '../services/lightPollutionService';
import './MapPage.css';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Pinned location icon (star icon)
const pinnedIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0ZGRDcwMCIgd2lkdGg9IjM2cHgiIGhlaWdodD0iMzZweCI+PHBhdGggZD0iTTEyIDJsMyA3aDdsLTUuNSA0LjVMMTkgMjFsLTctNS03IDUtMi41LTcuNUwyIDlsNy0xek0xMiA1LjVMOS41IDEwSDVsNC41IDMuNS0xLjUgNS41TDEyIDE2bDMuNSAzIDEuNS01LjVMNSAxMGgzLjVMMTIgNS41eiIvPjwvc3ZnPg==',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [12, 41]
});

// Default Bortle class when light pollution data is unavailable (middle of scale)
const DEFAULT_BORTLE_CLASS = 5;

/**
 * Function to determine marker color based on pollution index (Bortle class)
 * @param {number} index - Light pollution index (Bortle class 1-10+)
 * @returns {string} Color for the marker
 */
const getColorByPollutionIndex = (index) => {
  if (index <= 3) return "green"; // Low pollution
  if (index <= 6) return "yellow"; // Medium pollution
  if (index <= 9) return "orange"; // High pollution
  return "red"; // Extreme pollution (10+)
};

// Component to handle map clicks for pinning
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: onMapClick,
  });
  return null;
}

MapClickHandler.propTypes = {
  onMapClick: PropTypes.func.isRequired
};

// Component to change map view
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

ChangeView.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number).isRequired,
  zoom: PropTypes.number.isRequired
};

function MapPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [center, setCenter] = useState([20, 0]);
  const [zoom, setZoom] = useState(2);
  const [markers, setMarkers] = useState([]);
  const [pinnedLocations, setPinnedLocations] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [currentLayer, setCurrentLayer] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showSkyInfo, setShowSkyInfo] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [currentView, setCurrentView] = useState('ultimate');
  const [showBoard, setShowBoard] = useState(false);
  const [overlayCenter, setOverlayCenter] = useState(null); // Center for light pollution overlay
  const [showMobileControls, setShowMobileControls] = useState(false); // Mobile controls visibility
  const [isStaryVisible, setIsStaryVisible] = useState(false); // Stary chatbot visibility
  const [showNearbyLocations, setShowNearbyLocations] = useState(false); // Nearby locations visibility
  const [showLayerSwitcher, setShowLayerSwitcher] = useState(false); // Layer switcher visibility

  const mapRef = useRef();

  /**
   * Helper function to fetch AQI data for a location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Promise<Object|null>} AQI data object or null if fetch fails
   */
  const fetchLocationAQI = async (lat, lon) => {
    try {
      return await getAQI(lat, lon);
    } catch (error) {
      console.error('AQI fetch error:', error);
      return null;
    }
  };

  // Function to add a marker and fetch AQI and light pollution data
  const addMarker = useCallback(async (lat, lon, name) => {
    try {
      const aqiData = await fetchLocationAQI(lat, lon);
      const lightData = await getLightPollution(lat, lon);

      const newMarker = {
        id: Date.now(),
        position: [lat, lon],
        name: name,
        aqi: aqiData ? aqiData.aqi : 50, // Default to "Good" AQI (exact numeric value)
        aqiCategory: aqiData ? getAQICategory(aqiData.aqi) : null,
        lightPollution: lightData,
        pollutionIndex: lightData ? lightData.bortleClass : DEFAULT_BORTLE_CLASS
      };

      setMarkers(prev => [...prev, newMarker]);
      setCenter([lat, lon]);
      setZoom(10);
      setOverlayCenter([lat, lon]); // Set overlay center for light pollution overlay
      setSearchInput('');
    } catch (err) {
      console.error('Error adding marker:', err);
      setError('Error adding marker to map');
    }
  }, []);

  // Handle navigation from Stary chatbot
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    
    if (lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      
      // Validate coordinate ranges
      if (!isNaN(latitude) && !isNaN(longitude) && 
          latitude >= -90 && latitude <= 90 && 
          longitude >= -180 && longitude <= 180) {
        addMarker(latitude, longitude, `Location: ${latitude}, ${longitude}`);
      }
    }
  }, [searchParams, addMarker]);

  // Handle tile loading errors
  const handleTileError = () => {
    setTileError(true);
    // Auto-hide error message after 5 seconds
    setTimeout(() => setTileError(false), 5000);
  };

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
      const coords = parseCoordinates(searchInput);

      if (coords) {
        // Input is coordinates
        await addMarker(coords.lat, coords.lon, `Coordinates: ${coords.lat}, ${coords.lon}`);
        setSearchInput('');
      } else {
        // Input is a location name - use enhanced search service
        const response = await searchLocations(searchInput, {
          limit: 10,
          includeMetadata: true
        });

        if (response.success && response.results.length > 0) {
          // Always navigate directly to the first/best result
          const location = response.results[0];
          await addMarker(location.lat, location.lon, location.name);
          setSearchInput('');
        } else {
          setError(response.error || 'Location not found. Please try a different search.');
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLayerChange = (layerId) => {
    setCurrentLayer(layerId);
  };

  const handleMarkerClick = (marker) => {
    setSelectedLocation(marker);
    setShowSkyInfo(true);
  };

  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
    // If a location is selected, keep the panel open with the new view
    if (selectedLocation) {
      setShowSkyInfo(true);
    }
  };

  const handleAutocompleteSelect = async (suggestion) => {
    await addMarker(suggestion.lat, suggestion.lon, suggestion.name);
    setSearchInput('');
  };

  // Handle map click to pin a location
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    // Calculate location number based on current state
    const locationNumber = pinnedLocations.length + 1;
    await pinLocation(lat, lng, `Pinned Location ${locationNumber}`);
  };

  // Pin a location
  const pinLocation = async (lat, lon, name) => {
    try {
      const aqiData = await fetchLocationAQI(lat, lon);
      const lightData = await getLightPollution(lat, lon);

      const newPin = {
        id: Date.now(),
        position: [lat, lon],
        name: name,
        aqi: aqiData ? aqiData.aqi : 50, // Default to "Good" AQI (exact numeric value)
        aqiCategory: aqiData ? getAQICategory(aqiData.aqi) : null,
        lightPollution: lightData,
        pollutionIndex: lightData ? lightData.bortleClass : DEFAULT_BORTLE_CLASS,
        isPinned: true
      };

      setPinnedLocations(prev => [...prev, newPin]);
    } catch (err) {
      console.error('Error pinning location:', err);
      setError('Error pinning location');
    }
  };

  // Remove a pinned location
  const removePinnedLocation = (id) => {
    setPinnedLocations(prev => prev.filter(pin => pin.id !== id));
    // If the removed pin was selected, close the info panel
    if (selectedLocation && selectedLocation.id === id) {
      setShowSkyInfo(false);
      setSelectedLocation(null);
    }
  };

  // Convert a search marker to a pinned location
  const togglePinMarker = (marker) => {
    // Search markers don't have isPinned property, so convert them to pinned
    const pinnedMarker = { ...marker, isPinned: true };
    setPinnedLocations(prev => [...prev, pinnedMarker]);
    // Remove from regular markers
    setMarkers(prev => prev.filter(m => m.id !== marker.id));
  };

  // Handle board location selection
  const handleBoardLocationSelect = (location) => {
    // Navigate to the location
    setCenter(location.position);
    setZoom(10);
    // Select the location
    setSelectedLocation(location);
    setShowSkyInfo(true);
  };

  // Handle Stary navigation
  const handleStaryNavigate = (lat, lon) => {
    addMarker(lat, lon, `Location: ${lat}, ${lon}`);
  };

  // Handle nearby location selection
  const handleNearbyLocationSelect = async (lat, lon) => {
    await addMarker(lat, lon, `Nearby Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    setShowNearbyLocations(false);
  };

  return (
    <div className="map-page-container">
      {/* Home Button */}
      <button 
        className="home-button"
        onClick={() => navigate('/')}
        title="Go to Home"
        aria-label="Go to Home"
      >
        🏠 Home
      </button>

      {/* Help Tooltip */}
      <HelpTooltip />

      {/* Mobile Controls Toggle Button */}
      <button 
        className="mobile-controls-toggle"
        onClick={() => setShowMobileControls(!showMobileControls)}
        title={showMobileControls ? 'Hide Controls' : 'Show Controls'}
        aria-label={showMobileControls ? 'Hide Controls' : 'Show Controls'}
      >
        {showMobileControls ? '✕' : '☰'}
      </button>

      <div className={`map-controls ${showMobileControls ? 'visible' : ''}`}>
        <div className="search-container">
          <AutocompleteInput
            value={searchInput}
            onChange={setSearchInput}
            onSelect={handleAutocompleteSelect}
            onSearch={handleSearch}
            placeholder="Search location or enter coordinates (lat, lon)"
            disabled={loading}
          />
          <button 
            className="search-button" 
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <ViewToggle 
            currentView={currentView}
            onViewChange={handleViewChange}
            onLayersToggle={() => setShowLayerSwitcher(!showLayerSwitcher)}
          />
        </div>
        
        <div className="controls-row">
          <button 
            className="board-toggle-button"
            onClick={() => setShowBoard(!showBoard)}
            title="Toggle Pinned Locations Board"
          >
            📌 Board ({pinnedLocations.length})
          </button>
          
          <button 
            className="nearby-toggle-button"
            onClick={() => setShowNearbyLocations(!showNearbyLocations)}
            title="Find Nearby Better Locations"
            disabled={!selectedLocation}
          >
            🔍 Nearby
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {tileError && (
          <div className="error-message tile-error">
            Map tiles are currently unavailable. The map may appear blank, but all functionality continues to work.
          </div>
        )}
      </div>

      <div className="map-container">
        {showLayerSwitcher && (
          <div className="layer-switcher-container">
            <LayerSwitcher
              currentLayer={currentLayer}
              onLayerChange={handleLayerChange}
            />
          </div>
        )}

        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
          scrollWheelZoom={true}
          wheelPxPerZoomLevel={120}
          zoomControl={false}
        >
          <ChangeView center={center} zoom={zoom} />
          
          {currentLayer === 'standard' && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              eventHandlers={{
                tileerror: handleTileError,
              }}
            />
          )}

          {currentLayer === 'satellite' && (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
              eventHandlers={{
                tileerror: handleTileError,
              }}
            />
          )}
          
          {currentLayer === 'terrain' && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
              eventHandlers={{
                tileerror: handleTileError,
              }}
            />
          )}

          <MapClickHandler onMapClick={handleMapClick} />

          {/* Zoom Control Component */}
          <ZoomControl />

          {markers.map((marker) => (
            <CircleMarker 
              key={marker.id} 
              center={marker.position}
              radius={8}
              pathOptions={{
                fillColor: getColorByPollutionIndex(marker.pollutionIndex),
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
              }}
              eventHandlers={{
                click: () => handleMarkerClick(marker),
              }}
            >
              <Popup>
                <div className="popup-content">
                  <h3>{marker.name}</h3>
                  {marker.lightPollution && marker.pollutionIndex != null && (
                    <p><strong>Light Pollution Index:</strong> {marker.pollutionIndex} (Bortle Class)</p>
                  )}
                  <p><strong>AQI:</strong> {marker.aqi}</p>
                  {marker.aqiCategory && (
                    <p className="aqi-description" style={{ color: marker.aqiCategory.color }}>
                      {marker.aqiCategory.level}
                    </p>
                  )}
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
                  <button 
                    className="pin-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinMarker(marker);
                    }}
                  >
                    📌 Pin Location
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {pinnedLocations.map((pin) => (
            <Marker 
              key={pin.id} 
              position={pin.position}
              icon={pinnedIcon}
              eventHandlers={{
                click: () => handleMarkerClick(pin),
              }}
            >
              <Popup>
                <div className="popup-content">
                  <h3>{pin.name}</h3>
                  <p className="pinned-badge">📌 Pinned Location</p>
                  {pin.lightPollution && pin.pollutionIndex != null && (
                    <p><strong>Light Pollution Index:</strong> {pin.pollutionIndex} (Bortle Class)</p>
                  )}
                  <p><strong>AQI:</strong> {pin.aqi}</p>
                  {pin.aqiCategory && (
                    <p className="aqi-description" style={{ color: pin.aqiCategory.color }}>
                      {pin.aqiCategory.level}
                    </p>
                  )}
                  <p className="coordinates">
                    Coordinates: {pin.position[0].toFixed(4)}, {pin.position[1].toFixed(4)}
                  </p>
                  <button 
                    className="view-sky-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkerClick(pin);
                    }}
                  >
                    View Sky Conditions
                  </button>
                  <button 
                    className="unpin-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePinnedLocation(pin.id);
                    }}
                  >
                    🗑️ Remove Pin
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Light Pollution Overlay - only visible in light view mode */}
          <LightPollutionOverlay
            center={overlayCenter}
            radius={1000}
            visible={currentView === 'light' && overlayCenter !== null}
          />
        </MapContainer>
      </div>

      <Board
        pinnedLocations={pinnedLocations}
        onSelectLocation={handleBoardLocationSelect}
        onRemovePin={removePinnedLocation}
        visible={showBoard}
        onClose={() => setShowBoard(false)}
      />

      {currentView === 'sky' && (
        <SkyInfoPanel
          location={selectedLocation}
          visible={showSkyInfo}
          onClose={() => setShowSkyInfo(false)}
        />
      )}

      {currentView === 'aqi' && (
        <AQIView
          location={selectedLocation}
          visible={showSkyInfo}
          onClose={() => setShowSkyInfo(false)}
        />
      )}

      {currentView === 'light' && (
        <LightPollutionView
          location={selectedLocation}
          visible={showSkyInfo}
          onClose={() => setShowSkyInfo(false)}
        />
      )}

      {currentView === 'constellation' && (
        <ConstellationView
          location={selectedLocation}
          visible={showSkyInfo}
          onClose={() => setShowSkyInfo(false)}
        />
      )}

      {currentView === 'ultimate' && (
        <UltimateView
          location={selectedLocation}
          visible={showSkyInfo}
          onClose={() => setShowSkyInfo(false)}
        />
      )}

      {/* Starry Chat Button - Overlay on Map */}
      {!isStaryVisible && (
        <button 
          className="starry-chat-button"
          onClick={() => setIsStaryVisible(true)}
          title="Open Starry Chat"
          aria-label="Open Starry Chat"
        >
          <span className="chat-icon">💬</span>
          <span className="chat-text">Stary</span>
        </button>
      )}

      {/* Stary Chatbot */}
      <Stary 
        onNavigate={handleStaryNavigate} 
        isVisible={isStaryVisible}
        onClose={() => setIsStaryVisible(false)}
      />

      {/* Nearby Locations Panel */}
      <NearbyLocations
        location={selectedLocation}
        visible={showNearbyLocations}
        onClose={() => setShowNearbyLocations(false)}
        onLocationSelect={handleNearbyLocationSelect}
      />
    </div>
  );
}

export default MapPage;
