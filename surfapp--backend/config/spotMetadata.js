const fs = require('fs');
const path = require('path');

let SPOT_METADATA = {};

const loadSpotMetadata = () => {
    try {
        const spotsPath = path.join(__dirname, '..', '..', 'SurfApp--frontend', 'data', 'surf_spots.json');
        const spotsData = JSON.parse(fs.readFileSync(spotsPath, 'utf8'));
        
        // Create a lookup map by spot name
        spotsData.forEach(spot => {
            SPOT_METADATA[spot.name] = {
                bottomType: spot.bottomType,
                accessibility: spot.accessibility,
                region: spot.region
            };
        });
        console.log(`✅ Loaded metadata for ${Object.keys(SPOT_METADATA).length} spots from shared JSON`);
        return SPOT_METADATA;
    } catch (error) {
        console.error('❌ Error loading shared spots JSON:', error.message);
        // Fallback to hardcoded if JSON load fails
        SPOT_METADATA = {
            'Arugam Bay': { bottomType: 'Sand', accessibility: 'Medium', region: 'East Coast' },
            'Weligama': { bottomType: 'Sand', accessibility: 'High', region: 'South Coast' },
            'Hikkaduwa': { bottomType: 'Reef', accessibility: 'High', region: 'South Coast' },
            'Midigama': { bottomType: 'Reef', accessibility: 'Medium', region: 'South Coast' },
            'Hiriketiya': { bottomType: 'Sand', accessibility: 'Medium', region: 'South Coast' },
            'Okanda': { bottomType: 'Reef', accessibility: 'Low', region: 'East Coast' },
            'Pottuvil Point': { bottomType: 'Reef', accessibility: 'Low', region: 'East Coast' },
            'Whiskey Point': { bottomType: 'Reef', accessibility: 'Low', region: 'East Coast' },
            'Lazy Left': { bottomType: 'Reef', accessibility: 'Medium', region: 'East Coast' },
            'Lazy Right': { bottomType: 'Reef', accessibility: 'Medium', region: 'East Coast' }
        };
        return SPOT_METADATA;
    }
};

const getSpotMetadata = () => SPOT_METADATA;

module.exports = {
    loadSpotMetadata,
    getSpotMetadata
};
