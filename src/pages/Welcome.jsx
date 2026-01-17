import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Stary from '../components/Stary';
import './Welcome.css';

function Welcome() {
  const navigate = useNavigate();
  const [isStaryVisible, setIsStaryVisible] = useState(false);

  const handleDiveIn = () => {
    navigate('/map');
  };

  const handleStaryNavigate = (lat, lon) => {
    // Navigate to map page with location
    navigate(`/map?lat=${lat}&lon=${lon}`);
  };

  return (
    <div className="welcome-container">
      <div className="hero-section">
        <div className="hero-overlay">
          <h1 className="hero-title">DarkSkyFinder</h1>
          <p className="hero-subtitle">The Ultimate Stargazing Companion</p>
          <button className="dive-in-button" onClick={handleDiveIn}>
            Dive In
          </button>
        </div>
      </div>
      
      <div className="about-section">
        <h2>About Stargazing</h2>
        <div className="about-content">
          <p>
            Stargazing is the ancient practice of observing celestial objects in the night sky. 
            It connects us with the cosmos and offers a profound sense of wonder and perspective.
          </p>
          <p>
            The key to exceptional stargazing is finding locations with minimal light pollution. 
            Dark skies reveal thousands of stars, planets, nebulae, and galaxies that are hidden 
            from view in light-polluted areas.
          </p>
          <p>
            With DarkSkyFinder, you can discover the best stargazing locations near you by 
            checking air quality and light pollution levels. Find your perfect dark sky sanctuary 
            and witness the majesty of the universe.
          </p>
        </div>
      </div>

      {/* Open Chat Button */}
      {!isStaryVisible && (
        <button 
          className="open-chat-button"
          onClick={() => setIsStaryVisible(true)}
          aria-label="Open Stary Chat"
        >
          <span className="chat-icon">💬</span>
          <span className="chat-text">Open Stary Chat</span>
        </button>
      )}

      {/* Stary Chatbot */}
      <Stary 
        onNavigate={handleStaryNavigate} 
        isVisible={isStaryVisible}
        onClose={() => setIsStaryVisible(false)}
      />
    </div>
  );
}

export default Welcome;
