// Cache configuration for spot data
const cache = {
    data: null,
    timestamp: null,
    // Cache data for 5 minutes to reduce ML engine load and improve performance
    CACHE_DURATION_MS: 5 * 60 * 1000,
};

const getCachedData = () => {
    if (!cache.data || !cache.timestamp) {
        return null;
    }
    
    const now = Date.now();
    const age = now - cache.timestamp;
    
    if (age > cache.CACHE_DURATION_MS) {
        cache.data = null;
        cache.timestamp = null;
        return null;
    }
    
    return cache.data;
};

const setCachedData = (data) => {
    cache.data = data;
    cache.timestamp = Date.now();
};

const clearCache = () => {
    cache.data = null;
    cache.timestamp = null;
};

module.exports = {
    getCachedData,
    setCachedData,
    clearCache
};
