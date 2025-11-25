import { Platform } from 'react-native';
import { addDistanceToSpots } from './locationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For Android emulator: 10.0.2.2 maps to host machine's localhost
// For physical device: use your computer's IP on the network (e.g., 192.168.1.x)
const HOST = Platform.select({ 
  android: '10.0.2.2',  // Android emulator special IP for host localhost
  default: '127.0.0.1' 
});
const API_BASE_URL = `http://${HOST}:3000/api`;
const REQUEST_TIMEOUT = 30000; // 30 seconds (increased for 31 spots)
const MAX_RETRIES = 2;

// Local cache configuration
const CACHE_KEY = 'surf_spots_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Sanitize spot data to remove NaN, Infinity, and undefined values
 * This ensures JSON.stringify works properly for navigation params
 */
export const sanitizeSpotData = (spot) => {
  // Deep clone and sanitize in one pass using JSON parse/stringify with custom replacer
  const jsonString = JSON.stringify(spot, (key, value) => {
    // Handle NaN and Infinity
    if (typeof value === 'number') {
      if (isNaN(value) || !isFinite(value)) {
        console.warn(`Sanitizing invalid number at key: ${key}`);
        return 0;
      }
    }
    // Handle undefined
    if (value === undefined) {
      return null;
    }
    return value;
  });
  
  return JSON.parse(jsonString);
};

/**
 * Safe JSON stringify for navigation params
 * Handles NaN, Infinity, and undefined values
 */
export const stringifyForNav = (obj) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
      return 0;
    }
    if (value === undefined) {
      return null;
    }
    return value;
  });
};

/**
 * Safe JSON parse for navigation params
 * Handles strings with NaN or Infinity values
 */
export const parseFromNav = (jsonString) => {
  if (!jsonString) return null;
  
  try {
    // Replace literal NaN and Infinity strings before parsing
    // Also handle NaN in arrays and various formats
    const sanitized = jsonString
      .replace(/:\s*NaN\b/g, ':0')
      .replace(/,\s*NaN\b/g, ',0')
      .replace(/\[\s*NaN\b/g, '[0')
      .replace(/\s+NaN\s+/g, ' 0 ')
      .replace(/:\s*Infinity\b/g, ':0')
      .replace(/:\s*-Infinity\b/g, ':0')
      .replace(/,\s*Infinity\b/g, ',0')
      .replace(/,\s*-Infinity\b/g, ',0');
    
    console.log('Parsing navigation param, original length:', jsonString.length);
    if (jsonString.includes('NaN')) {
      console.warn('Found NaN in navigation params, sanitizing...');
    }
    
    return JSON.parse(sanitized);
  } catch (error) {
    console.error('Failed to parse navigation param:', error.message);
    console.error('String sample:', jsonString?.substring(0, 200));
    return null;
  }
};

/**
 * Fetch with timeout
 */
const fetchWithTimeout = async (url, options = {}, timeout = REQUEST_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Retry wrapper for fetch operations
 */
const fetchWithRetry = async (url, options = {}, retries = MAX_RETRIES) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      if (i === retries) throw error;
      console.log(`Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
};

/**
 * Fetches the list of surf spots, ranked by suitability based on the user's preferences.
 * @param {Object} preferences - The full user preferences object from UserContext.
 * @param {Object} userLocation - Optional user location {latitude, longitude}
 * @returns {Array<Object>} An array of spot data with forecast and suitability.
 */
export async function getSpotsData(preferences, userLocation = null) { 
  try {
    // Validate preferences
    if (!preferences || typeof preferences !== 'object') {
      console.warn('Invalid preferences provided to getSpotsData');
      return [];
    }

    // Try to get cached data first
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { data: cachedSpots, timestamp } = JSON.parse(cachedData);
        const cacheAge = Date.now() - timestamp;
        
        // Check if cached data has NaN values (corrupted cache)
        const hasNaN = JSON.stringify(cachedSpots).includes('NaN');
        if (hasNaN) {
          console.log('Cache contains NaN values, clearing and fetching fresh data');
          await AsyncStorage.removeItem(CACHE_KEY);
        } else {
          // Validate cache structure - ensure it has the enhanced scoring data
          const isValidCache = cachedSpots && 
            cachedSpots.length > 0 && 
            cachedSpots[0].breakdown && 
            cachedSpots[0].recommendations &&
            cachedSpots[0].score !== undefined;
          
          if (!isValidCache) {
            console.log('Cache invalid (old structure), fetching fresh data');
          } else if (cacheAge < CACHE_DURATION) {
            console.log(`Using cached spot data (age: ${Math.round(cacheAge / 1000)}s)`);
            // Sanitize cached data to ensure no NaN values and recalculate distance
            const sanitizedSpots = cachedSpots.map(spot => sanitizeSpotData(spot));
            return addDistanceToSpots(sanitizedSpots, userLocation);
          } else {
            console.log('Cache expired, fetching fresh data');
          }
        }
      }
    } catch (cacheError) {
      console.warn('Cache read error:', cacheError.message);
    }

    // Convert preferences object into URL query string
    const queryString = new URLSearchParams(preferences).toString(); 
    
    const apiUrl = `${API_BASE_URL}/spots?${queryString}`;
    console.log('Fetching spots from API:', apiUrl);
    const response = await fetchWithRetry(apiUrl); 
    
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Received ${data.spots?.length || 0} spots from API`);
    
    // Validate response structure
    if (!data || !Array.isArray(data.spots)) {
      console.error('Invalid response structure from API');
      return [];
    }

    const validSpots = data.spots.filter(spot => 
      spot && 
      spot.id && 
      spot.name && 
      spot.score !== undefined &&  // Changed from suitability (string) to score (number)
      spot.coords && 
      Array.isArray(spot.coords)
    ).map(spot => {
      // First ensure all required fields exist
      const spotWithDefaults = {
        ...spot,
        // Ensure breakdown exists
        breakdown: spot.breakdown || {},
        // Ensure recommendations array exists
        recommendations: spot.recommendations || [],
        // Ensure weights exists
        weights: spot.weights || {},
        // Ensure warnings array exists (from safety check)
        warnings: spot.warnings || [],
        // Ensure canSurf boolean exists
        canSurf: spot.canSurf !== undefined ? spot.canSurf : true
      };
      
      // Then sanitize all NaN and Infinity values to prevent JSON serialization issues
      return sanitizeSpotData(spotWithDefaults);
    });

    console.log(`Validated ${validSpots.length} spots with proper structure`);

    // Cache the fresh data
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        data: validSpots,
        timestamp: Date.now()
      }));
      console.log(`✅ Cached ${validSpots.length} spots`);
    } catch (cacheError) {
      console.warn('Cache write error:', cacheError.message);
    }

    // Add distance information if user location is available
    const spotsWithDistance = addDistanceToSpots(validSpots, userLocation);
    
    console.log(`Returning ${spotsWithDistance.length} spots with distance info`);
    return spotsWithDistance;

  } catch (error) {
    console.error("Error fetching spots from API:", error.message);
    
    // Try to return stale cache as fallback
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { data: cachedSpots } = JSON.parse(cachedData);
        console.log('Returning stale cache due to API error');
        // Sanitize stale cache data
        const sanitizedSpots = cachedSpots.map(spot => sanitizeSpotData(spot));
        return addDistanceToSpots(sanitizedSpots, userLocation);
      }
    } catch (fallbackError) {
      console.warn('Fallback cache error:', fallbackError.message);
    }
    
    // Return empty array if all else fails
    return [];
  }
}

/**
 * Fetches the 7-day wave forecast data for the chart.
 * This is currently a mock endpoint on the Node.js server.
 */
export async function get7DayForecast() {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/forecast-chart`);
    
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate chart data structure
    if (!data || !data.labels || !data.datasets || !Array.isArray(data.datasets)) {
      throw new Error('Invalid chart data structure');
    }
    
    return data;

  } catch (error) {
    console.error("Error fetching chart data from API:", error.message);
    // Return fallback mock data
    return { 
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], 
      datasets: [{ data: [1.0, 1.2, 1.1, 1.5, 1.4, 1.3, 1.2] }] 
    };
  }
}

/**
 * Check API health
 */
export async function checkApiHealth() {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 5000);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('API health check failed:', error.message);
    return false;
  }
}

/**
 * Session Tracking APIs - Phase 2
 */

/**
 * Start a new surf session
 * @param {string} userId - User ID
 * @param {string} spotId - Spot ID
 * @param {string} spotName - Spot name
 * @param {Object} conditions - Current conditions (waveHeight, windSpeed, etc.)
 * @returns {Object} Session start response with sessionId
 */
export async function startSession(userId, spotId, spotName, conditions) {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        spotId,
        spotName,
        spotRegion: conditions.region || 'Unknown',
        conditions: {
          waveHeight: conditions.waveHeight,
          wavePeriod: conditions.wavePeriod,
          windSpeed: conditions.windSpeed,
          windDirection: conditions.windDirection,
          tide: conditions.tide,
          crowdLevel: conditions.crowdLevel || 'Medium'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to start session: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
}

/**
 * End a surf session
 * @param {string} sessionId - Session ID
 * @param {number} rating - Rating 1-5
 * @param {boolean} wouldReturn - Would return to spot
 * @param {string} comments - Optional comments
 * @returns {Object} Session end response
 */
export async function endSession(sessionId, rating, wouldReturn, comments = '') {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/sessions/${sessionId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, wouldReturn, comments })
    });

    if (!response.ok) {
      throw new Error(`Failed to end session: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error ending session:', error);
    throw error;
  }
}

/**
 * Get user's session history
 * @param {string} userId - User ID
 * @param {number} limit - Number of sessions to retrieve
 * @returns {Object} Sessions array and total count
 */
export async function getUserSessions(userId, limit = 20) {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/sessions/user/${userId}?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Failed to get sessions: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return { sessions: [], total: 0 };
  }
}

/**
 * Get user insights from session history
 * @param {string} userId - User ID
 * @returns {Object} Insights including favorite spots, preferred conditions
 */
export async function getUserInsights(userId) {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/sessions/user/${userId}/insights`);

    if (!response.ok) {
      throw new Error(`Failed to get insights: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting user insights:', error);
    return null;
  }
}

/**
 * Get personalized recommendations for a spot
 * @param {string} userId - User ID
 * @param {string} spotId - Spot ID
 * @returns {Object} Personalized insights and recommendations
 */
export async function getPersonalizedRecommendations(userId, spotId) {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/personalization/recommendations/${userId}/${spotId}`);

    if (!response.ok) {
      throw new Error(`Failed to get recommendations: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return null;
  }
}

/**
 * Comprehensive list of Sri Lankan surf spots.
 * These coordinates are used for map markers and distance calculations.
 * Format: [longitude, latitude]
 */
export const surfSpots = [
  // South Coast - Best November to April
  { id: '1', name: 'Weligama', region: 'South Coast', coords: [80.4264, 5.9721] },
  { id: '2', name: 'Midigama', region: 'South Coast', coords: [80.3833, 5.9611] },
  { id: '3', name: 'Hiriketiya', region: 'South Coast', coords: [80.6863, 5.9758] },
  { id: '4', name: 'Unawatuna', region: 'South Coast', coords: [80.2505, 6.0093] },
  { id: '5', name: 'Hikkaduwa', region: 'South Coast', coords: [80.0998, 6.1376] },
  { id: '6', name: 'Madiha', region: 'South Coast', coords: [80.5833, 5.9833] },
  { id: '7', name: 'Mirissa', region: 'South Coast', coords: [80.4611, 5.9461] },
  { id: '8', name: 'Ahangama', region: 'South Coast', coords: [80.3667, 5.9667] },
  { id: '9', name: 'Kabalana', region: 'South Coast', coords: [80.1167, 6.1333] },
  { id: '10', name: 'Dewata', region: 'South Coast', coords: [80.2833, 5.9833] },
  { id: '11', name: 'Polhena', region: 'South Coast', coords: [80.3500, 5.9500] },
  { id: '12', name: 'Talalla', region: 'South Coast', coords: [80.5667, 5.9667] },
  
  // East Coast - Best April to October
  { id: '13', name: 'Arugam Bay', region: 'East Coast', coords: [81.8293, 6.8434] },
  { id: '14', name: 'Pottuvil Point', region: 'East Coast', coords: [81.8333, 6.8667] },
  { id: '15', name: 'Whiskey Point', region: 'East Coast', coords: [81.8250, 6.8333] },
  { id: '16', name: 'Peanut Farm', region: 'East Coast', coords: [81.8167, 6.8167] },
  { id: '17', name: 'Okanda', region: 'East Coast', coords: [81.6574, 6.6604] },
  { id: '18', name: 'Lighthouse Point', region: 'East Coast', coords: [81.8400, 6.8500] },
  { id: '19', name: 'Crocodile Rock', region: 'East Coast', coords: [81.8100, 6.8100] },
  { id: '20', name: 'Panama', region: 'East Coast', coords: [81.7833, 6.7667] },
  { id: '21', name: 'Kalmunai', region: 'East Coast', coords: [81.8222, 7.4089] },
  { id: '22', name: 'Pasikudah', region: 'East Coast', coords: [81.5581, 7.9286] },
  
  // West Coast - Variable conditions
  { id: '23', name: 'Mount Lavinia', region: 'West Coast', coords: [79.8633, 6.8400] },
  { id: '24', name: 'Wellawatte', region: 'West Coast', coords: [79.8589, 6.8667] },
  { id: '25', name: 'Negombo', region: 'West Coast', coords: [79.8358, 7.2083] },
  { id: '26', name: 'Bentota', region: 'West Coast', coords: [79.9958, 6.4258] },
  { id: '27', name: 'Kalutara', region: 'West Coast', coords: [79.9589, 6.5844] },
  { id: '28', name: 'Wadduwa', region: 'West Coast', coords: [79.9292, 6.6667] },
  { id: '29', name: 'Beruwala', region: 'West Coast', coords: [79.9831, 6.4786] },
  
  // North and North-West Coast
  { id: '30', name: 'Kalpitiya', region: 'North-West Coast', coords: [79.7667, 8.2333] },
  { id: '31', name: 'Mannar', region: 'North Coast', coords: [79.9042, 8.9811] },
];

/**
 * Clear the cached spot data
 * Useful for debugging or forcing fresh data
 */
export async function clearSpotsCache() {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    console.log('Spot cache cleared');
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}