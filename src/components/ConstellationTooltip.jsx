import { useState } from 'react';
import PropTypes from 'prop-types';
import './ConstellationTooltip.css';

/**
 * ConstellationTooltip Component
 * Displays a constellation name with a question mark icon.
 * Shows a tooltip with the constellation image on hover.
 * 
 * @param {string} name - The constellation name (e.g., "Ursa Major")
 * @param {string} abbr - The constellation abbreviation (e.g., "UMa")
 */
function ConstellationTooltip({ name, abbr }) {
  const [imageError, setImageError] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Convert constellation name to filename format
  // "Ursa Major" -> "Ursa-Major.svg"
  const imageFilename = name.replace(/\s+/g, '-') + '.svg';
  const imagePath = `/constellations/${imageFilename}`;

  const handleImageError = () => {
    setImageError(true);
  };

  const handleMouseEnter = () => {
    setTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setTooltipVisible(false);
  };

  return (
    <span className="constellation-name-wrapper">
      <span className="constellation-name-text">{name}</span>
      <span 
        className="constellation-help-icon"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        tabIndex="0"
        role="button"
        aria-label={`View ${name} constellation image`}
      >
        ?
        {tooltipVisible && (
          <span className="constellation-tooltip" role="tooltip">
            {!imageError ? (
              <>
                <img 
                  src={imagePath} 
                  alt={`${name} constellation pattern`}
                  className="constellation-image"
                  onError={handleImageError}
                  loading="lazy"
                />
                <span className="constellation-tooltip-label">
                  {name} ({abbr})
                </span>
              </>
            ) : (
              <span className="constellation-tooltip-fallback">
                <span className="fallback-icon">⭐</span>
                <span className="fallback-text">
                  {name} ({abbr})
                </span>
                <span className="fallback-message">
                  Image not available
                </span>
              </span>
            )}
          </span>
        )}
      </span>
    </span>
  );
}

ConstellationTooltip.propTypes = {
  name: PropTypes.string.isRequired,
  abbr: PropTypes.string.isRequired,
};

export default ConstellationTooltip;
