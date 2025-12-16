"""API Keys Configuration and Rotation Logic"""
import os

# Multiple API keys for rotation (19 free-tier keys with 10 requests/day each = 190 requests/day)
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

# Global index to track which API key to use next (rotates through all keys)
current_api_key_index = 0

# Legacy support: check .env file for single key (will be added to rotation)
try:
    from dotenv import load_dotenv
    load_dotenv()
    STORMGLASS_API_KEY = os.getenv("STORMGLASS_API_KEY")
    if STORMGLASS_API_KEY and STORMGLASS_API_KEY != 'your_api_key_here':
        # Add .env key to rotation if not already present
        if STORMGLASS_API_KEY not in API_KEYS:
            API_KEYS.insert(0, STORMGLASS_API_KEY)
except ImportError:
    pass  # dotenv not installed, skip

def get_next_api_key():
    """
    Get the next API key in rotation (round-robin).
    Returns: Current API key string
    """
    global current_api_key_index
    key = API_KEYS[current_api_key_index]
    return key

def rotate_to_next_key():
    """
    Manually rotate to the next API key in the pool.
    Called when current key hits rate limit (402/429 errors).
    """
    global current_api_key_index
    current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
    return API_KEYS[current_api_key_index]

def get_total_keys():
    """Get total number of API keys available"""
    return len(API_KEYS)
