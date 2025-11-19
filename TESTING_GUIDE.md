# Testing Guide - Location-Based Surf Spots

## Quick Test Checklist

### 1. **Test Location Permission**
- Open the app for the first time
- Should see location permission dialog
- Grant permission to test full functionality
- Deny permission to test fallback behavior

### 2. **Test Home Screen**
- **With Location**: Should show "📍 Showing X spots within 10km of your location"
- **Without Location**: Should show "We found X spots matching your preferences"
- Verify only nearby spots appear (within 10km if in a surf area)
- If not near any surf spots, should show "No spots nearby" message

### 3. **Test Map Screen**
- Should display ALL 31 surf spots across Sri Lanka
- Markers should be color-coded by suitability:
  - Green (>75): Excellent
  - Yellow (50-75): Good
  - Orange (25-50): Fair
  - Red (<25): Poor
- Each marker shows suitability score

### 4. **Test Spot Cards**
- Should display distance on each card (e.g., "• 2.3km away")
- Distance only appears when location is available
- Distance is shown in blue next to region name

### 5. **Test All Spots List**
- Navigate to "View All Spots"
- Should show all 31 spots with suitability scores
- Can filter by Excellent/Good/Fair
- Distance shown on each card

## Expected Surf Spots by Region

### South Coast (12)
Weligama, Midigama, Hiriketiya, Unawatuna, Hikkaduwa, Madiha, Mirissa, Ahangama, Kabalana, Dewata, Polhena, Talalla

### East Coast (10)
Arugam Bay, Pottuvil Point, Whiskey Point, Peanut Farm, Okanda, Lighthouse Point, Crocodile Rock, Panama, Kalmunai, Pasikudah

### West Coast (7)
Mount Lavinia, Wellawatte, Negombo, Bentota, Kalutara, Wadduwa, Beruwala

### North Coast (2)
Kalpitiya, Mannar

## Test Locations (GPS Coordinates)

Use these coordinates in emulator to test different scenarios:

**Weligama Area** (South Coast)
- Lat: 5.9721, Lon: 80.4264
- Expected nearby: Weligama, Mirissa, Polhena, Midigama, Ahangama

**Arugam Bay Area** (East Coast)
- Lat: 6.8434, Lon: 81.8293
- Expected nearby: Arugam Bay, Pottuvil Point, Whiskey Point, Peanut Farm

**Colombo Area** (West Coast)
- Lat: 6.9271, Lon: 79.8612
- Expected nearby: Mount Lavinia, Wellawatte

**Inland Location** (No spots nearby)
- Lat: 7.2906, Lon: 80.6337 (Kandy)
- Expected: "No spots nearby" message on home screen

## Testing in Android Emulator

1. Open emulator Extended Controls (... button)
2. Go to Location tab
3. Enter test coordinates above
4. Click "Send" to update location
5. Restart app or pull to refresh

## Testing on Physical Device

- App will use actual device GPS location
- Move between surf areas to test filtering
- Compare distances shown with actual distances

## Known Behavior

- Home screen filters to 10km radius
- Map shows all spots regardless of location
- Spots list shows all spots with distances
- Without location permission, shows all spots unfiltered
- Distance calculations are accurate using Haversine formula
