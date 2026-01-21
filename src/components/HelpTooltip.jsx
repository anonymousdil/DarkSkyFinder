import { useState } from 'react';
import './HelpTooltip.css';

const TUTORIAL_CONTENT = `
Welcome to DarkSkyFinder! 🌟

🔍 SEARCH & EXPLORE:
• Enter a location name or coordinates (lat, lon) in the search bar
• Click on the map to pin locations for comparison
• Use the zoom controls to navigate

🌈 VIEW MODES:
• AQI: View air quality index and its impact on stargazing
• Light: Check light pollution levels (Bortle scale)
• Ultimate: See comprehensive stargazing conditions
• Layers: Toggle between Standard, Terrain, and Satellite map views

📌 PINNED LOCATIONS:
• Click on the map to pin locations
• View all pinned locations in the Board
• Compare conditions across multiple spots

🧭 NEARBY LOCATIONS:
• Select a location and click "Nearby" to find better stargazing spots
• Adjust search radius to explore different distances

💬 STARY CHATBOT:
• Ask questions about stargazing, locations, and astronomy
• Get personalized recommendations

🗺️ MAP LAYERS:
• Click the Layers button to switch between map types
• Choose Standard, Terrain, or Satellite views
`;

function HelpTooltip() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="help-tooltip-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="help-icon">?</div>
      {isHovered && (
        <div className="help-content">
          <div className="help-header">
            <h3>DarkSkyFinder Tutorial</h3>
          </div>
          <div className="help-body">
            <pre>{TUTORIAL_CONTENT}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default HelpTooltip;
