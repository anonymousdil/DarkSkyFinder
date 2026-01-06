import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { getAutocompleteSuggestions } from '../services/searchService';
import './AutocompleteInput.css';

/**
 * Autocomplete Input Component
 * Provides real-time search suggestions as user types
 */
function AutocompleteInput({ 
  value, 
  onChange, 
  onSelect, 
  onSearch,
  placeholder, 
  disabled 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimer = useRef(null);

  // Fetch suggestions when input changes
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Only fetch if input is at least 2 characters
    if (value && value.trim().length >= 2) {
      // Debounce API calls
      debounceTimer.current = setTimeout(() => {
        setLoading(true);
        
        getAutocompleteSuggestions(value, 8)
          .then(results => {
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
            setLoading(false);
          })
          .catch(error => {
            console.error('Error fetching suggestions:', error);
            setSuggestions([]);
            setLoading(false);
          });
      }, 300); // 300ms debounce
    } else {
      // Clear suggestions when input is too short
      debounceTimer.current = setTimeout(() => {
        setSuggestions([]);
        setShowSuggestions(false);
        setLoading(false);
      }, 0);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [value]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    onChange(e.target.value);
    setSelectedIndex(-1);
  };

  const handleSuggestionClick = (suggestion) => {
    onSelect(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        onSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          onSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'amenity': '🏛️',
      'place': '📍',
      'boundary': '🗺️',
      'natural': '🌲',
      'tourism': '🏖️',
      'highway': '🛣️',
      'waterway': '💧',
      'building': '🏢'
    };
    return icons[category] || '📍';
  };

  const formatSuggestionName = (name) => {
    // Truncate long names
    if (name.length > 60) {
      return name.substring(0, 57) + '...';
    }
    return name;
  };

  return (
    <div className="autocomplete-container">
      <input
        ref={inputRef}
        type="text"
        className="autocomplete-input"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        disabled={disabled}
        autoComplete="off"
      />
      
      {loading && (
        <div className="autocomplete-loading">
          <div className="spinner"></div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="autocomplete-suggestions" ref={suggestionsRef}>
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.lat}-${suggestion.lon}-${index}`}
              className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="suggestion-icon">
                {getCategoryIcon(suggestion.category)}
              </span>
              <div className="suggestion-content">
                <div className="suggestion-name">
                  {formatSuggestionName(suggestion.name)}
                </div>
                <div className="suggestion-type">
                  {suggestion.type} • {suggestion.category}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

AutocompleteInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onSearch: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool
};

AutocompleteInput.defaultProps = {
  placeholder: 'Search location or enter coordinates (lat, lon)',
  disabled: false
};

export default AutocompleteInput;
