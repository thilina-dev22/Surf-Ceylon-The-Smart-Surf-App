import { addDistanceToSpots } from './locationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL as API_BASE_URL } from './config';
import surfSpotsData from './surf_spots.json';

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
 * Fetches the comprehensive 7-day multi-output forecast data for a specific spot
 * Returns: Wave Height, Wave Period, Swell Height, Swell Period, Wind Speed, Wind Direction
 * @param {string} spotId - The spot ID to fetch forecast for
 */
export async function get7DayForecast(spotId = '2') {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/forecast-chart?spotId=${spotId}`);
    
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate multi-output forecast data structure
    if (!data || !data.labels || !data.waveHeight || !data.windSpeed) {
      throw new Error('Invalid forecast data structure');
    }
    
    return data;

  } catch (error) {
    console.error("Error fetching 7-day forecast from API:", error.message);
    // Return fallback mock data with all parameters
    return { 
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      waveHeight: [1.2, 1.4, 1.3, 1.6, 1.5, 1.4, 1.3],
      wavePeriod: [10, 11, 10, 12, 11, 10, 10],
      swellHeight: [1.0, 1.2, 1.1, 1.4, 1.3, 1.2, 1.1],
      swellPeriod: [12, 13, 12, 14, 13, 12, 12],
      windSpeed: [15, 14, 16, 13, 15, 14, 15],
      windDirection: [180, 190, 185, 200, 195, 180, 185],
      metadata: { dataSource: 'Mock', forecastMethod: 'Fallback' }
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
 * Comprehensive list of Sri Lankan surf spots.
 * Imported from shared JSON file.
 */
export const surfSpots = surfSpotsData;

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