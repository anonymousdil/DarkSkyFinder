import { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import LayerSwitcher from '../components/LayerSwitcher';
import SkyInfoPanel from '../components/SkyInfoPanel';
import AutocompleteInput from '../components/AutocompleteInput';
import SearchResults from '../components/SearchResults';
import { searchLocations, parseCoordinates } from '../services/searchService';
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
  const [tileError, setTileError] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const mapRef = useRef();

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

  const handleLayerChange = (layerId) => {
    setCurrentLayer(layerId);
  };

  const handleMarkerClick = (marker) => {
    setSelectedLocation(marker);
    setShowSkyInfo(true);
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

      <SearchResults
        results={searchResults}
        onSelectResult={handleSearchResultSelect}
        visible={showSearchResults}
        onClose={() => setShowSearchResults(false)}
      />

      <SkyInfoPanel
        location={selectedLocation}
        visible={showSkyInfo}
        onClose={() => setShowSkyInfo(false)}
      />
    </div>
  );
}

export default MapPage;
