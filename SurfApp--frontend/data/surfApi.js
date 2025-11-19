import { Platform } from 'react-native';

const HOST = Platform.select({ android: '10.0.2.2', default: '127.0.0.1' });
const API_BASE_URL = `http://${HOST}:3000/api`;
const REQUEST_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 2;

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
 * @returns {Array<Object>} An array of spot data with forecast and suitability.
 */
export async function getSpotsData(preferences) { 
  try {
    // Validate preferences
    if (!preferences || typeof preferences !== 'object') {
      console.warn('Invalid preferences provided to getSpotsData');
      return [];
    }

    // Convert preferences object into URL query string
    const queryString = new URLSearchParams(preferences).toString(); 
    
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

    return data.spots.filter(spot => 
      spot && 
      spot.id && 
      spot.name && 
      typeof spot.suitability === 'number'
    );

  } catch (error) {
    console.error("Error fetching spots from API:", error.message);
    // Return empty array on error - UI will handle showing appropriate message
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
 * Static spot data used primarily for the Mapbox marker coordinates.
 */
export const surfSpots = [
  { id: '1', name: 'Arugam Bay', region: 'East Coast', coords: [81.829, 6.843] },
  { id: '2', name: 'Weligama', region: 'South Coast', coords: [80.426, 5.972] },
  { id: '3', name: 'Midigama', region: 'South Coast', coords: [80.383, 5.961] },
  { id: '4', name: 'Hiriketiya', region: 'South Coast', coords: [80.686, 5.976] },
  { id: '5', 'name': 'Okanda', region: 'East Coast', coords: [81.657, 6.660] },
];