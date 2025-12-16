const { getCachedData } = require('../config/cache');

const getHealth = (req, res) => {
    const cachedData = getCachedData();
    
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        cache: {
            hasData: !!cachedData,
            age: cachedData ? Date.now() - cachedData.timestamp : null
        }
    });
};

module.exports = {
    getHealth
};
