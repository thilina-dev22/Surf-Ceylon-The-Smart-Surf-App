# 🏄 Surf Ceylon - Quick Start Guide

## Prerequisites
- Node.js 18+ 
- Python 3.8+
- Android Studio or Xcode (for mobile development)
- Expo CLI (will be installed with dependencies)

## Setup Steps

### 1. Backend Server

```bash
cd surfapp--backend

# Install dependencies
npm install

# Create environment file
copy .env.example .env

# Start the server
npm start
```

The backend will run on `http://localhost:3000`

### 2. ML Engine (Python)

```bash
cd surfapp--ml-engine

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
copy .env.example .env

# (Optional) Train the model
python train_model.py
```

**Note:** You need a Stormglass API key. Get one at https://stormglass.io/
Add it to `.env` file: `STORMGLASS_API_KEY=your_key_here`

### 3. Frontend (React Native)

```bash
cd SurfApp--frontend

# Install dependencies
npm install

# Install expo-linear-gradient (required for new UI)
npx expo install expo-linear-gradient

# Start the development server
npm start

# Or run directly on Android
npm run android

# Or run on iOS
npm run ios
```

## Testing the Application

### 1. Test Backend Health
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-19T...",
  "cache": {
    "hasData": false,
    "age": null
  }
}
```

### 2. Test Spots Endpoint
```bash
curl "http://localhost:3000/api/spots?skillLevel=Beginner&minWaveHeight=0.5&maxWaveHeight=1.5"
```

### 3. Test Frontend
- Open Expo Go app on your phone
- Scan the QR code from terminal
- Or run on emulator/simulator

## Troubleshooting

### Backend Issues

**Problem:** Python script fails
- Check Python path in `server.js` (line 9)
- Verify Python is installed: `python --version`
- Check ML engine dependencies are installed

**Problem:** Port 3000 already in use
- Change PORT in `.env` file
- Or kill the process using port 3000

### Frontend Issues

**Problem:** Cannot connect to backend
- For Android emulator, backend should be at `10.0.2.2:3000`
- For iOS simulator, backend should be at `127.0.0.1:3000`
- For physical device, use your computer's IP address

**Problem:** Module not found errors
- Run `npm install` again
- Clear cache: `npx expo start -c`
- Delete `node_modules` and reinstall

**Problem:** Gradle build errors
- Update to JDK 21
- Or downgrade Gradle version in android files

### ML Engine Issues

**Problem:** No predictions, using mock data
- Verify STORMGLASS_API_KEY is set in `.env`
- Check API key is valid
- Train the model first: `python train_model.py`

**Problem:** Import errors
- Activate virtual environment
- Install requirements: `pip install -r requirements.txt`

## Environment Variables

### Backend (.env)
```env
PORT=3000
NODE_ENV=development
```

### ML Engine (.env)
```env
STORMGLASS_API_KEY=your_api_key_here
```

### Frontend
Create `.env` in SurfApp--frontend:
```env
EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

## Development Workflow

1. **Start Backend:** `cd surfapp--backend && npm start`
2. **Start Frontend:** `cd SurfApp--frontend && npm start`
3. **Make changes** to code
4. **Hot reload** will update the app automatically

## Building for Production

### Backend
```bash
cd surfapp--backend
# Set NODE_ENV=production in .env
npm start
```

### Frontend
```bash
cd SurfApp--frontend

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/spots` | GET | Get surf spots with suitability |
| `/api/forecast-chart` | GET | Get 7-day forecast data |

## Default User Preferences

```javascript
{
  skillLevel: 'Beginner',
  minWaveHeight: 0.5,
  maxWaveHeight: 1.5,
  tidePreference: 'Any',
  boardType: 'Soft-top'
}
```

## Tips

✅ **Keep backend running** while using the app
✅ **Use pull-to-refresh** to get latest data
✅ **Adjust preferences** in Profile screen for better recommendations
✅ **Check console logs** for debugging information
✅ **Use Expo Go app** for quick testing on physical devices

## Support

- Check `BUG_FIXES_AND_IMPROVEMENTS.md` for detailed changes
- Review console logs for error messages
- Ensure all services are running before testing

---

Happy Surfing! 🏄‍♂️🌊
