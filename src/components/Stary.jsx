import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { processQuery, getGreeting } from '../services/staryService';
import './Stary.css';

function Stary({ onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize with greeting
  useEffect(() => {
    const greeting = getGreeting();
    setMessages([{
      id: Date.now(),
      type: 'bot',
      content: greeting.message,
      data: greeting
    }]);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message
    const userMsgId = Date.now();
    setMessages(prev => [...prev, {
      id: userMsgId,
      type: 'user',
      content: userMessage
    }]);

    try {
      // Process query
      const response = await processQuery(userMessage);
      
      // Add bot response
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: response.message,
        data: response
      }]);
    } catch (error) {
      console.error('Stary error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: '⚠️ Something went wrong. Please try again!',
        data: { type: 'error' }
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExploreLocation = (lat, lon) => {
    if (onNavigate) {
      onNavigate(lat, lon);
    }
  };

  const renderMessage = (message) => {
    const { type, content, data } = message;

    return (
      <div key={message.id} className={`stary-message ${type}`}>
        <div className="message-bubble">
          {/* Render markdown-style content */}
          <div className="message-text" dangerouslySetInnerHTML={{ 
            __html: formatMessageContent(content) 
          }} />

          {/* Render additional data for analysis responses */}
          {data && data.type === 'analysis' && (
            <div className="analysis-details">
              {/* Suitability Score */}
              {data.data.suitability && (
                <div className="suitability-card">
                  <div className="suitability-header">
                    <span className="suitability-emoji">{data.data.suitability.emoji}</span>
                    <span className="suitability-score">
                      Score: {data.data.suitability.score}/10
                    </span>
                  </div>
                </div>
              )}

              {/* Action Button */}
              {data.location && (
                <button 
                  className="explore-button"
                  onClick={() => handleExploreLocation(data.location.lat, data.location.lon)}
                >
                  🗺️ Explore on Map
                </button>
              )}

              {/* Alternatives */}
              {data.alternatives && data.alternatives.length > 0 && (
                <div className="alternatives-section">
                  <h4>💡 Better alternatives nearby:</h4>
                  <ul>
                    {data.alternatives.map((alt, idx) => (
                      <li key={idx}>
                        <strong>{alt.name}</strong> - {alt.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Render suggestions for errors/not found */}
          {data && (data.type === 'error' || data.type === 'not_found') && data.suggestions && (
            <div className="suggestions">
              <p><strong>Suggestions:</strong></p>
              <ul>
                {data.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Render examples for greeting */}
          {data && data.type === 'greeting' && data.examples && (
            <div className="examples">
              <p><strong>Try these examples:</strong></p>
              {data.examples.map((example, idx) => (
                <button
                  key={idx}
                  className="example-button"
                  onClick={() => setInputValue(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const formatMessageContent = (content) => {
    // Convert markdown-style formatting to HTML
    return content
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className={`stary-container ${isMinimized ? 'minimized' : ''}`}>
      <div className="stary-header" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="header-content">
          <span className="stary-icon">🌟</span>
          <h3>Stary</h3>
          <span className="subtitle">Your Stargazing Companion</span>
        </div>
        <button className="minimize-button" aria-label={isMinimized ? 'Expand' : 'Minimize'}>
          {isMinimized ? '▲' : '▼'}
        </button>
      </div>

      {!isMinimized && (
        <>
          <div className="stary-messages">
            {messages.map(renderMessage)}
            
            {isLoading && (
              <div className="stary-message bot">
                <div className="message-bubble">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <form className="stary-input-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="stary-input"
              placeholder="Enter location or coordinates..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="stary-send-button"
              disabled={isLoading || !inputValue.trim()}
              aria-label="Send message"
            >
              ✨
            </button>
          </form>
        </>
      )}
    </div>
  );
}

Stary.propTypes = {
  onNavigate: PropTypes.func
};

export default Stary;
