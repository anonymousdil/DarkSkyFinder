# Quick Start Guide - LLM Integration

This guide will help you get the LLM-powered Starry chatbot up and running in minutes.

## Prerequisites

- Node.js v16 or higher
- npm or yarn
- Gemini API account with credits (optional, but recommended for full features)

## Step 1: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

## Step 2: Configure API Keys

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your API keys:

```bash
# Required for LLM conversational features
GEMINI_API_KEY=sk-proj-your-actual-key-here

# Optional for AQI data
VITE_AQICN_TOKEN=your_aqicn_token_here

# Backend configuration (optional, defaults shown)
BACKEND_PORT=3001
VITE_BACKEND_URL=http://localhost:3001
```

### Getting Your Gemini API Key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API key"
4. Copy the key and paste it in your `.env` file

**Cost**: Gemini 2.0 Flash is **FREE** for most use cases! Free tier includes 15 requests per minute and 1 million tokens per day.

## Step 3: Start the Application

### Option A: Start Everything at Once (Recommended)

```bash
npm run dev:full
```

This will start:
- Frontend (Vite) on http://localhost:5173
- Backend (Express) on http://localhost:3001

### Option B: Start Separately

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Backend:**
```bash
npm run dev:backend
```

## Step 4: Test the Chatbot

1. Open your browser to http://localhost:5173
2. Click "Dive In" on the welcome page
3. Click the chatbot icon (🌟 Stary) in the bottom right
4. Try these queries:

**Conversational (requires Gemini API key):**
- "What's the best time to see the Milky Way?"
- "How does light pollution affect stargazing?"
- "Tell me about the Northern Lights"

**Location-based (works without API key):**
- "Yellowstone National Park"
- "Death Valley"
- "44.4280, -110.5885"

## Troubleshooting

### "LLM backend not available"

**Problem**: Frontend can't connect to backend

**Solution**:
1. Make sure backend is running: `npm run dev:backend`
2. Check backend URL in `.env`: `VITE_BACKEND_URL=http://localhost:3001`
3. Verify backend is responding: `curl http://localhost:3001/api/health`

### "Gemini API key not configured"

**Problem**: Backend running but API key not set

**Solution**:
1. Check `.env` file has `GEMINI_API_KEY=sk-...`
2. Restart the backend after adding the key
3. The chatbot will still work for location queries without the key

### Backend won't start

**Problem**: Port 3001 already in use

**Solution**:
1. Find and kill the process using port 3001:
   ```bash
   # macOS/Linux
   lsof -i :3001
   kill <PID>
   
   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   ```
2. Or change the port in `.env`:
   ```bash
   BACKEND_PORT=3002
   VITE_BACKEND_URL=http://localhost:3002
   ```

## Features Overview

### Without Gemini API Key
- ✅ Location-based queries
- ✅ Detailed stargazing analysis
- ✅ Light pollution information
- ✅ Sky conditions
- ✅ AQI data (if configured)

### With Gemini API Key
All of the above, PLUS:
- ✅ Free-form conversational queries
- ✅ Astronomy questions and answers
- ✅ Stargazing tips and recommendations
- ✅ Natural language location extraction
- ✅ Context-aware responses

## Next Steps

1. **Explore the chatbot**: Try different types of queries
2. **Check the map**: Click "Explore on Map" buttons in chat responses
3. **Pin locations**: Click anywhere on the map to save locations
4. **Read the docs**: Check out `README.md` and `LLM_INTEGRATION_SUMMARY.md` for more details

## Getting Help

- **Troubleshooting**: See `README.md` troubleshooting section
- **Security**: See `SECURITY_SUMMARY.md` for security information
- **API Documentation**: See `LLM_INTEGRATION_SUMMARY.md` for technical details

## Development Notes

### Testing API Without Frontend

Use the test page at http://localhost:5173/test-llm-integration.html to:
- Check backend health
- Test API endpoints directly
- Verify query type detection

### Production Deployment

For production deployment instructions, see the "LLM Backend Deployment" section in `README.md`.

---

**Enjoy your AI-powered stargazing companion! 🌟✨**
