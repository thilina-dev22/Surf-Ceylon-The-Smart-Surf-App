import { Platform } from 'react-native';
import { addDistanceToSpots } from './locationUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HOST = Platform.select({ android: '10.0.2.2', default: '127.0.0.1' });
const API_BASE_URL = `http://${HOST}:3000/api`;
const REQUEST_TIMEOUT = 30000; // 30 seconds (increased for 31 spots)
const MAX_RETRIES = 2;

// Local cache configuration
const CACHE_KEY = 'surf_spots_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

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
        
        if (cacheAge < CACHE_DURATION) {
          console.log(`Using cached spot data (age: ${Math.round(cacheAge / 1000)}s)`);
          // Recalculate suitability and distance with current preferences/location
          return addDistanceToSpots(cachedSpots, userLocation);
        } else {
          console.log('Cache expired, fetching fresh data');
        }
      }
    } catch (cacheError) {
      console.warn('Cache read error:', cacheError.message);
    }

    // Convert preferences object into URL query string
    const queryString = new URLSearchParams(preferences).toString(); 
    
    console.log('Fetching spots from API...');
    const response = await fetchWithRetry(`${API_BASE_URL}/spots?${queryString}`); 
    
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate response structure
    if (!data || !Array.isArray(data.spots)) {
      console.error('Invalid response structure from API');
      return [];
    }

    const validSpots = data.spots.filter(spot => 
      spot && 
      spot.id && 
      spot.name && 
      typeof spot.suitability === 'number'
    );

    // Cache the fresh data
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        data: validSpots,
        timestamp: Date.now()
      }));
      console.log(`Cached ${validSpots.length} spots`);
    } catch (cacheError) {
      console.warn('Cache write error:', cacheError.message);
    }

    // Add distance information if user location is available
    const spotsWithDistance = addDistanceToSpots(validSpots, userLocation);
    
    return spotsWithDistance;

  } catch (error) {
    console.error("Error fetching spots from API:", error.message);
    
    // Try to return stale cache as fallback
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { data: cachedSpots } = JSON.parse(cachedData);
        console.log('Returning stale cache due to API error');
        return addDistanceToSpots(cachedSpots, userLocation);
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