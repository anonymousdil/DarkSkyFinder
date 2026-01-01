import { useNavigate } from 'react-router-dom';
import './Welcome.css';

function Welcome() {
  const navigate = useNavigate();

  const handleDiveIn = () => {
    navigate('/map');
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
    </div>
  );
}

export default Welcome;
