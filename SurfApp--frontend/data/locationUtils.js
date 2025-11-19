/**
 * Calculate distance between two geographic points using the Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in km
}

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Filter surf spots within a certain radius of user's location
 * @param {Array} spots - Array of surf spots with coords [longitude, latitude]
 * @param {Object} userLocation - User's location {latitude, longitude}
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Array} Filtered array of spots within radius
 */
export function filterSpotsByRadius(spots, userLocation, radiusKm = 10) {
  if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
    return spots; // Return all spots if no location available
  }

  return spots.filter(spot => {
    if (!spot.coords || spot.coords.length !== 2) {
      return false;
    }

    const [spotLon, spotLat] = spot.coords;
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      spotLat,
      spotLon
    );

    return distance <= radiusKm;
  });
}

/**
 * Add distance information to each spot
 * @param {Array} spots - Array of surf spots
 * @param {Object} userLocation - User's location {latitude, longitude}
 * @returns {Array} Spots with distance property added
 */
export function addDistanceToSpots(spots, userLocation) {
  if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
    return spots;
  }

  return spots.map(spot => {
    if (!spot.coords || spot.coords.length !== 2) {
      return { ...spot, distance: null };
    }

    const [spotLon, spotLat] = spot.coords;
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      spotLat,
      spotLon
    );

    return {
      ...spot,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
    };
  });
}
