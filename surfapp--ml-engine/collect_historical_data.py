import requests
import json
from datetime import datetime, timedelta, timezone
import time
import sys

# =======================================================================
# --- DAILY FRESH START CONFIGURATION ---
# This is the state for a clean, full 190-request collection when your 
# daily API limits have fully reset.
# =======================================================================

# Set to True to enable collection for that spot.
COLLECT_WELIGAMA = True 
COLLECT_ARUGAMBAY = True 

# Reset the request start number to 1 to start from the beginning.
WELIGAMA_START_REQUEST = 1 
# Set the resume date to None to start the date calculation from the current day (datetime.now()).
WELIGAMA_RESUME_DATE_END = None 


# =======================================================================
# --- API & Key Configuration (DO NOT CHANGE THESE) ---
# =======================================================================

# Coordinates for Weligama and Arugam Bay
SPOT_CONFIGS = [
    {"name": "Weligama", "lat": 5.972, "lng": 80.426},
    {"name": "Arugam Bay", "lat": 6.843, "lng": 81.829},
]

# List of your 19 unique API keys. Split: 10 for Weligama, 9 for Arugam Bay.
API_KEYS = [
    "2b9c359a-a5a8-11f0-8208-0242ac130006-2b9c3630-a5a8-11f0-8208-0242ac130006",
    "af1036a4-a5be-11f0-8208-0242ac130006-af10371c-a5be-11f0-8208-0242ac130006",
    "a3cc1756-a5c1-11f0-b808-0242ac130006-a3cc17ba-a5c1-11f0-b808-0242ac130006",
    "2c822782-a5c4-11f0-9727-0242ac130006-2c8227e6-a5c4-11f0-9727-0242ac130006",
    "68a5ab3a-a66e-11f0-a2a5-0242ac130006-68a5ac02-a66e-11f0-a2a5-0242ac130006",
    "943fd418-a679-11f0-a2a5-0242ac130006-943fd490-a679-11f0-a2a5-0242ac130006",
    "bb8f7ae8-c5cb-11f0-a8f4-0242ac130003-bb8f7b42-c5cb-11f0-a8f4-0242ac130003",
    "204f4594-c5cc-11f0-b4de-0242ac130003-204f463e-c5cc-11f0-b4de-0242ac130003",
    "3fd3b6ca-c5cc-11f0-b4de-0242ac130003-3fd3b72e-c5cc-11f0-b4de-0242ac130003",
    "fe940b6e-c5cc-11f0-bd1c-0242ac130003-fe940bfa-c5cc-11f0-bd1c-0242ac130003",
    # Keys 10 through 18 follow:
    "24c61764-c5cd-11f0-a8f4-0242ac130003-24c617f0-c5cd-11f0-a8f4-0242ac130003",
    "5c476b8e-c5cd-11f0-b5c3-0242ac130003-5c476c1a-c5cd-11f0-b5c3-0242ac130003",
    "7d79cf90-c5cd-11f0-b5c3-0242ac130003-7d79d328-c5cd-11f0-b5c3-0242ac130003",
    "9dc164de-c5cd-11f0-b5c3-0242ac130003-9dc16542-c5cd-11f0-b5c3-0242ac130003",
    "ee8d38a2-c5cd-11f0-a0d3-0242ac130003-ee8d391a-c5cd-11f0-a0d3-0242ac130003",
    "20a872ca-c5ce-11f0-a8f4-0242ac130003-20a87356-c5ce-11f0-a8f4-0242ac130003",
    "57df12bc-c5ce-11f0-b4de-0242ac130003-57df1334-c5ce-11f0-b4de-0242ac130003",
    "7b33f174-c5ce-11f0-a0d3-0242ac130003-7b33f200-c5ce-11f0-a0d3-0242ac130003",
    "964936d6-c5ce-11f0-a148-0242ac130003-9649376c-c5ce-11f0-a148-0242ac130003"
]

# FINAL DEFINITIVE PARAMETER LIST (Copied from the API's successful list)
ALL_PARAMETERS = [
    # Core Atmospheric/Temperature
    "airTemperature", "cloudCover", "dewPointTemperature", "humidity", 
    "pressure", "visibility", 
    
    # Specialized Atmospheric Levels
    "airTemperature1000hpa", "airTemperature100m", "airTemperature200hpa", 
    "airTemperature500hpa", "airTemperature800hpa", "airTemperature80m", 
    
    # Core Wind/Gust
    "gust", "windSpeed", "windDirection", 
    
    # Specialized Wind Levels
    "windDirection1000hpa", "windDirection100m", "windDirection200hpa", "windDirection20m", 
    "windDirection30m", "windDirection40m", "windDirection500hpa", "windDirection50m", 
    "windDirection800hpa", "windDirection80m", 
    "windSpeed1000hpa", "windSpeed100m", "windSpeed200hpa", "windSpeed20m", 
    "windSpeed30m", "windSpeed40m", "windSpeed500hpa", "windSpeed50m", 
    "windSpeed800hpa", "windSpeed80m", 

    # Marine/Wave/Swell
    "currentDirection", "currentSpeed", 
    "seaLevel", "waterTemperature", 
    "waveDirection", "waveHeight", "wavePeriod",
    "swellDirection", "swellHeight", "swellPeriod", 
    "secondarySwellDirection", "secondarySwellHeight", "secondarySwellPeriod", 
    "windWaveDirection", "windWaveHeight", "windWavePeriod",

    # Other Phenomena
    "graupel", "precipitation", "rain", "snow", 
    "snowAlbedo", "snowDepth", "iceCover", "seaIceThickness"
]


# --- Helper Function to Fetch Data for a Single Spot ---

def fetch_data_for_spot(spot_name, lat, lng, api_keys_subset, start_request_num=1, resume_end_date_str=None):
    """Fetches historical data for a single spot using a subset of API keys."""
    base_url = 'https://api.stormglass.io/v2/weather/point'
    
    # Determine the starting date. If resuming, use the provided end date.
    if resume_end_date_str:
        # Convert the resumption date (which was the end of the last successful block)
        end_date = datetime.strptime(resume_end_date_str, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        print(f"  Resuming collection. Starting date calculation from: {end_date.date()}")
    else:
        # Start fresh from today (This is the default for a "fresh" run)
        end_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    spot_hours_data = []
    spot_requests_made = 0
    max_requests_for_spot = len(api_keys_subset) * 10
    
    # --- Check for Skip Mode ---
    if not COLLECT_WELIGAMA and spot_name == "Weligama":
         return { "spot_name": spot_name, "hours": [], "requests_used": 0, "total_hours": 0, "lat": lat, "lng": lng }
    if not COLLECT_ARUGAMBAY and spot_name == "Arugam Bay":
         return { "spot_name": spot_name, "hours": [], "requests_used": 0, "total_hours": 0, "lat": lat, "lng": lng }
    # --- End Skip Mode Check ---

    print(f"\n--- Starting Collection for {spot_name} ---")
    print(f"  Allocated Keys: {len(api_keys_subset)} | Max Requests: {max_requests_for_spot}")
    
    # Adjust loop range to resume from the specified request number (start_request_num is 1-indexed)
    for request_index in range(start_request_num - 1, max_requests_for_spot):
        
        key_index_in_subset = request_index // 10
        
        if key_index_in_subset >= len(api_keys_subset):
             print(f"  STOPPED: Exhausted allocated API keys for {spot_name}.")
             break

        current_key = api_keys_subset[key_index_in_subset]
        
        # Calculate 10-day window backwards
        start_date = end_date - timedelta(days=10)
        start_ts = int(start_date.timestamp())
        end_ts = int(end_date.timestamp())

        params = {
            'lat': lat,
            'lng': lng,
            'params': ",".join(ALL_PARAMETERS),
            'start': start_ts,
            'end': end_ts,
            'source': 'noaa,sg,ecmwf'
        }
        
        headers = {'Authorization': current_key}
        
        print(f"  {spot_name} Request {request_index + 1}/{max_requests_for_spot} | Key Index: {key_index_in_subset + 1} | Dates: {start_date.date()} to {end_date.date()}")
        
        # --- API Request with Exponential Backoff for Robustness ---
        retries = 0
        max_retries = 3
        
        success = False
        response = None
        while retries < max_retries:
            try:
                # Use requests.Session or increase the connection pool size for many requests, 
                # but for simplicity, we rely on the retries here.
                response = requests.get(base_url, params=params, headers=headers, timeout=10) 
                
                if response.status_code == 429: # Rate Limit Hit
                    print(f"  Rate Limit hit for Key #{key_index_in_subset + 1}. Moving to the next key block.")
                    raise requests.exceptions.HTTPError(response=response)

                response.raise_for_status() 
                
                # Successful response
                data = response.json()
                
                if 'hours' in data and data['hours']:
                    # Update data and counters outside the retry loop structure
                    spot_hours_data = data['hours'] + spot_hours_data
                    spot_requests_made += 1
                    end_date = start_date # Move the end_date back 10 days
                    
                    print(f"  SUCCESS. Collected {len(data['hours'])} hourly entries. Total: {len(spot_hours_data)} hours.")
                    success = True
                    break # Exit retry loop
                else:
                    print(f"  WARNING: API returned success but no 'hours' data for this period. Stopping collection for {spot_name}.")
                    break 

            except requests.exceptions.HTTPError as e:
                if response and response.status_code == 422:
                    error_details = response.json().get('errors', 'No details provided.')
                    print(f"  CRITICAL ERROR (422 Unprocessable Entity): Parameters rejected by API. Details: {error_details}. Stopping.")
                    # Fatal error, stop entirely.
                    sys.exit(1)
                
                elif response and response.status_code == 429:
                    break # Break out of the while loop to allow the main loop to switch keys.
                    
                else:
                    retries += 1
                    wait_time = 2 ** retries
                    print(f"  ERROR: {e}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
            
            except requests.exceptions.RequestException as e:
                # This catches the ConnectTimeoutError and other connection issues
                retries += 1
                wait_time = 2 ** retries
                print(f"  CRITICAL CONNECTION ERROR: {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
        
        if not success:
            # If the while loop finishes without success, break the main for loop.
            if response is None or response.status_code != 429: 
                break
        
        # If 429 was hit, the main for loop continues to the next request which uses the next key.

    # Return the collected data up to the point of failure
    return {
        "spot_name": spot_name,
        "hours": spot_hours_data,
        "requests_used": spot_requests_made,
        "total_hours": len(spot_hours_data),
        "lat": lat,
        "lng": lng,
    }


# --- Main Execution Logic ---

def collect_historical_data():
    
    # Split the 19 API keys: 10 for spot 1, 9 for spot 2
    split_point = 10
    weligama_keys = API_KEYS[:split_point]
    arugambay_keys = API_KEYS[split_point:]

    print(f"Total API keys available: {len(API_KEYS)}")
    print(f"Weligama key budget: {len(weligama_keys)} keys (Max 100 requests)")
    print(f"Arugam Bay key budget: {len(arugambay_keys)} keys (Max 90 requests)")

    # 1. Collect data for Weligama 
    weligama_result = fetch_data_for_spot(
        spot_name=SPOT_CONFIGS[0]['name'],
        lat=SPOT_CONFIGS[0]['lat'],
        lng=SPOT_CONFIGS[0]['lng'],
        api_keys_subset=weligama_keys,
        start_request_num=WELIGAMA_START_REQUEST,
        resume_end_date_str=WELIGAMA_RESUME_DATE_END
    )

    # 2. Collect data for Arugam Bay 
    arugambay_result = fetch_data_for_spot(
        spot_name=SPOT_CONFIGS[1]['name'],
        lat=SPOT_CONFIGS[1]['lat'],
        lng=SPOT_CONFIGS[1]['lng'],
        api_keys_subset=arugambay_keys
    )

    # --- Final Processing and Saving ---
    
    final_results = [weligama_result, arugambay_result]
    
    for result in final_results:
        output_filename = f"{result['spot_name'].lower().replace(' ', '_')}_historical_data_fixed.json"
        
        # --- Load Logic: Check if we successfully collected data in this run ---
        if not result['hours']:
            # If the current run collected no data (e.g., due to a skip or early failure),
            # attempt to load the previously saved large file to ensure it's preserved.
            try:
                with open(output_filename, 'r') as f:
                    data = json.load(f)
                    result['hours'] = data['hours']
                    result['total_hours'] = len(result['hours'])
                    # Estimate requests used from the loaded file for accurate final metadata
                    result['requests_used'] = result['total_hours'] // 24 
            except FileNotFoundError:
                print(f"WARNING: Previous data file {output_filename} not found. Saving metadata only.")
            except json.JSONDecodeError:
                 print(f"WARNING: Could not decode JSON from {output_filename}. Saving metadata only.")

        # --- Final Metadata Calculation ---
        if result['hours']:
            result['hours'].sort(key=lambda x: x['time'])
            earliest_data_point = result['hours'][0]['time']
        else:
            earliest_data_point = None
        
        # Requests used should be equal to days collected (since 1 req = 10 days, 10 reqs = 100 days)
        total_days_collected = result['total_hours'] // 24 if result['total_hours'] else 0

        output_json = {
            "metadata": {
                "spot": result['spot_name'],
                "latitude": result['lat'],
                "longitude": result['lng'],
                "requests_used": total_days_collected // 10, # 1 request per 10 days
                "total_hours": result['total_hours'],
                "total_days_collected": total_days_collected,
                "date_collected": datetime.now(timezone.utc).isoformat(),
                "earliest_data_point": earliest_data_point
            },
            "hours": result['hours']
        }
        
        # --- Save ---
        with open(output_filename, 'w') as f:
            json.dump(output_json, f, indent=4)
        
        print(f"\n--- Saved {result['spot_name']} Data ---")
        print(f"  Requests Used (Estimated): {output_json['metadata']['requests_used']}")
        print(f"  Total Days Collected: {total_days_collected}")
        print(f"  File: {output_filename}")


if __name__ == "__main__":
    collect_historical_data()