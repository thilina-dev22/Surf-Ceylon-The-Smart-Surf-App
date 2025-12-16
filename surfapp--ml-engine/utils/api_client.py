"""StormGlass API Client with Multi-Key Rotation"""
import sys
from config import get_next_api_key, rotate_to_next_key, get_total_keys, API_TIMEOUT
from .data_processor import process_stormglass_api_response

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("Warning: requests library not available. API calls will fail.", file=sys.stderr)


def fetch_weather_data_with_rotation(lat, lng, hours_ahead=48, feature_names=None):
    """
    Fetch future weather data from StormGlass API with intelligent key rotation.
    Tries all available API keys in sequence until one succeeds.
    
    Args:
        lat: Latitude
        lng: Longitude
        hours_ahead: Number of hours to forecast (default 48 for 2-day forecast)
        feature_names: List of feature names to fetch
    
    Returns:
        tuple: (features_dict, is_valid)
               features_dict: Dictionary of weather parameters
               is_valid: True if real API data, False if failed
    """
    if not REQUESTS_AVAILABLE:
        print("  requests library not available", file=sys.stderr)
        return {}, False
    
    if not feature_names:
        feature_names = ['swellHeight', 'swellPeriod', 'swellDirection',
                        'windSpeed', 'windDirection', 'seaLevel', 'gust',
                        'secondarySwellHeight', 'secondarySwellPeriod',
                        'secondarySwellDirection']
    
    from datetime import datetime, timedelta, timezone
    
    start_time = datetime.now(timezone.utc)
    end_time = start_time + timedelta(hours=hours_ahead)
    
    url = "https://api.stormglass.io/v2/weather/point"
    params = {
        'lat': lat,
        'lng': lng,
        'start': int(start_time.timestamp()),
        'end': int(end_time.timestamp()),
        'params': ','.join(feature_names)
    }
    
    # Try all API keys in rotation
    total_keys = get_total_keys()
    keys_tried = 0
    
    while keys_tried < total_keys:
        api_key = get_next_api_key()
        key_number = keys_tried + 1
        
        headers = {'Authorization': api_key}
        
        try:
            print(f"  Fetching {hours_ahead}h forecast using API Key #{key_number}/{total_keys}...", file=sys.stderr)
            response = requests.get(url, params=params, headers=headers, timeout=API_TIMEOUT)
            
            if response.status_code == 200:
                print(f"  ✅ Success with API Key #{key_number}", file=sys.stderr)
                data = response.json()
                
                # Process response into feature dictionary
                hours = data.get('hours', [])
                if hours:
                    first_hour = hours[0]
                    from .data_processor import get_average_from_sources
                    
                    features = {}
                    for feature in feature_names:
                        features[feature] = get_average_from_sources(
                            first_hour.get(feature, {}),
                            default=0.0
                        )
                    
                    # Rotate to next key for future requests
                    rotate_to_next_key()
                    return features, True
                else:
                    print(f"  ⚠️  API response has no data. Trying next key...", file=sys.stderr)
                    rotate_to_next_key()
                    keys_tried += 1
                    continue
            
            elif response.status_code in [402, 429]:
                error_name = "Payment Required" if response.status_code == 402 else "Rate Limit"
                print(f"  ⚠️  API Key #{key_number}: {error_name} ({response.status_code}). Trying next key...", file=sys.stderr)
                rotate_to_next_key()
                keys_tried += 1
                continue
            
            else:
                print(f"  ⚠️  API Key #{key_number}: Error {response.status_code}. Trying next key...", file=sys.stderr)
                rotate_to_next_key()
                keys_tried += 1
                continue
        
        except requests.exceptions.Timeout:
            print(f"  ⚠️  API Key #{key_number}: Timeout. Trying next key...", file=sys.stderr)
            rotate_to_next_key()
            keys_tried += 1
            continue
        
        except Exception as e:
            print(f"  ⚠️  API Key #{key_number}: Error ({e}). Trying next key...", file=sys.stderr)
            rotate_to_next_key()
            keys_tried += 1
            continue
    
    # All keys exhausted
    print(f"  ❌ All {total_keys} API keys exhausted.", file=sys.stderr)
    return {}, False


def fetch_historical_data_with_rotation(lat, lng, hours=168, feature_names=None):
    """
    Fetch historical weather data from StormGlass API with key rotation.
    Used for LSTM model that needs recent time-series data.
    
    Args:
        lat: Latitude
        lng: Longitude
        hours: Number of past hours to fetch (default 168 = 7 days)
        feature_names: List of feature names to fetch
    
    Returns:
        np.array or None: 2D array of shape (time_steps, num_features) or None if failed
    """
    if not REQUESTS_AVAILABLE:
        return None
    
    if not feature_names:
        feature_names = ['waveHeight', 'swellHeight', 'swellPeriod',
                        'windSpeed', 'windDirection', 'seaLevel']
    
    from datetime import datetime, timedelta, timezone
    
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(hours=hours)
    
    url = "https://api.stormglass.io/v2/weather/point"
    params = {
        'lat': lat,
        'lng': lng,
        'start': int(start_time.timestamp()),
        'end': int(end_time.timestamp()),
        'params': ','.join(feature_names)
    }
    
    total_keys = get_total_keys()
    keys_tried = 0
    
    while keys_tried < total_keys:
        api_key = get_next_api_key()
        key_number = keys_tried + 1
        
        headers = {'Authorization': api_key}
        
        try:
            print(f"  Fetching {hours}h historical data using API Key #{key_number}/{total_keys}...", file=sys.stderr)
            response = requests.get(url, params=params, headers=headers, timeout=API_TIMEOUT)
            
            if response.status_code == 200:
                print(f"  ✅ Success with API Key #{key_number}", file=sys.stderr)
                data = response.json()
                result = process_stormglass_api_response(data, feature_names)
                
                if result is not None:
                    rotate_to_next_key()
                    return result
                else:
                    print(f"  ⚠️  Failed to process response. Trying next key...", file=sys.stderr)
                    rotate_to_next_key()
                    keys_tried += 1
                    continue
            
            elif response.status_code in [402, 429]:
                error_name = "Payment Required" if response.status_code == 402 else "Rate Limit"
                print(f"  ⚠️  API Key #{key_number}: {error_name}. Trying next key...", file=sys.stderr)
                rotate_to_next_key()
                keys_tried += 1
                continue
            
            else:
                print(f"  ⚠️  API Key #{key_number}: Error {response.status_code}. Trying next key...", file=sys.stderr)
                rotate_to_next_key()
                keys_tried += 1
                continue
        
        except Exception as e:
            print(f"  ⚠️  API Key #{key_number}: Error ({e}). Trying next key...", file=sys.stderr)
            rotate_to_next_key()
            keys_tried += 1
            continue
    
    print(f"  ❌ All {total_keys} API keys exhausted.", file=sys.stderr)
    return None
