import { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import PropTypes from 'prop-types';
import LayerSwitcher from '../components/LayerSwitcher';
import SkyInfoPanel from '../components/SkyInfoPanel';
import AQIView from '../components/AQIView';
import LightPollutionView from '../components/LightPollutionView';
import UltimateView from '../components/UltimateView';
import ViewToggle from '../components/ViewToggle';
import AutocompleteInput from '../components/AutocompleteInput';
import SearchResults from '../components/SearchResults';
import Board from '../components/Board';
import { searchLocations, parseCoordinates } from '../services/searchService';
import { getAQI, getAQICategory } from '../services/aqiService';
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
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [currentView, setCurrentView] = useState('ultimate');
  const [showBoard, setShowBoard] = useState(false);

  const mapRef = useRef();

  // Handle tile loading errors
  const handleTileError = () => {
    setTileError(true);
    // Auto-hide error message after 5 seconds
    setTimeout(() => setTileError(false), 5000);
  };

  // Helper function to fetch AQI data for a location
  const fetchLocationAQI = async (lat, lon) => {
    try {
      return await getAQI(lat, lon);
    } catch (error) {
      console.error('AQI fetch error:', error);
      return null;
    }
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
          if (response.results.length === 1) {
            // Only one result, add marker directly
            const location = response.results[0];
            await addMarker(location.lat, location.lon, location.name);
            setSearchInput('');
          } else {
            // Multiple results, show results panel
            setSearchResults(response.results);
            setShowSearchResults(true);
          }
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

  // Function to add a marker and fetch AQI
  const addMarker = async (lat, lon, name) => {
    try {
      const aqiData = await fetchLocationAQI(lat, lon);

      const newMarker = {
        id: Date.now(),
        position: [lat, lon],
        name: name,
        aqi: aqiData ? aqiData.aqi : 'N/A',
        aqiCategory: aqiData ? getAQICategory(aqiData.aqi) : null
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

  const handleSearchResultSelect = async (result) => {
    await addMarker(result.lat, result.lon, result.name);
    setShowSearchResults(false);
    setSearchInput('');
  };

  // Handle map click to pin a location
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;
    await pinLocation(lat, lng, `Pinned Location ${pinnedLocations.length + 1}`);
  };

  // Pin a location
  const pinLocation = async (lat, lon, name) => {
    try {
      const aqiData = await fetchLocationAQI(lat, lon);

      const newPin = {
        id: Date.now(),
        position: [lat, lon],
        name: name,
        aqi: aqiData ? aqiData.aqi : 'N/A',
        aqiCategory: aqiData ? getAQICategory(aqiData.aqi) : null,
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

  // Toggle pin status of a marker
  const togglePinMarker = (marker) => {
    if (marker.isPinned) {
      removePinnedLocation(marker.id);
    } else {
      // Convert marker to pinned location
      const pinnedMarker = { ...marker, isPinned: true };
      setPinnedLocations(prev => [...prev, pinnedMarker]);
      // Remove from regular markers
      setMarkers(prev => prev.filter(m => m.id !== marker.id));
    }
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

  return (
    <div className="map-page-container">
      <div className="map-controls">
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
        </div>
        
        <div className="controls-row">
          <ViewToggle 
            currentView={currentView}
            onViewChange={handleViewChange}
          />
          
          <button 
            className="board-toggle-button"
            onClick={() => setShowBoard(!showBoard)}
            title="Toggle Pinned Locations Board"
          >
            📌 Board ({pinnedLocations.length})
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
            </Marker>
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
        </MapContainer>
      </div>

      <SearchResults
        results={searchResults}
        onSelectResult={handleSearchResultSelect}
        visible={showSearchResults}
        onClose={() => setShowSearchResults(false)}
      />

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

      {currentView === 'ultimate' && (
        <UltimateView
          location={selectedLocation}
          visible={showSkyInfo}
          onClose={() => setShowSkyInfo(false)}
        />
      )}
    </div>
  );
}

export default MapPage;
