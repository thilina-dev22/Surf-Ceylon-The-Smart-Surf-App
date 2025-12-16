"""Date and Time Utilities"""
from datetime import datetime, timedelta, timezone

def generate_date_labels(days=7):
    """
    Generate date labels for forecast charts starting from today.
    Format: ["Today", "Tmrw", "Mon", "Tue", "Wed", "Thu", "Fri"]
    
    Args:
        days: Number of days to generate (default 7)
    
    Returns:
        list: Date label strings
    """
    day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    today = datetime.now()
    
    labels = []
    for i in range(days):
        forecast_date = today + timedelta(days=i)
        day_name = day_names[forecast_date.weekday()]
        
        if i == 0:
            labels.append("Today")
        elif i == 1:
            labels.append("Tmrw")
        else:
            labels.append(day_name)
    
    return labels


def aggregate_hourly_to_daily(hourly_data, hours_per_day=24):
    """
    Aggregate hourly forecast data into daily averages.
    
    Args:
        hourly_data: List of hourly forecast dictionaries
        hours_per_day: Number of hours per day (default 24)
    
    Returns:
        list: Daily forecast dictionaries (7 days)
    """
    daily_forecast = []
    
    for day in range(7):
        start_idx = day * hours_per_day
        end_idx = start_idx + hours_per_day
        day_hours = hourly_data[start_idx:end_idx]
        
        if not day_hours:
            # Fallback if insufficient data
            daily_forecast.append({
                'waveHeight': 1.0,
                'wavePeriod': 10.0,
                'swellHeight': 0.8,
                'swellPeriod': 12.0,
                'windSpeed': 15.0,
                'windDirection': 180.0
            })
            continue
        
        # Calculate daily averages
        daily_avg = {
            'waveHeight': round(sum(h['waveHeight'] for h in day_hours) / len(day_hours), 1),
            'wavePeriod': round(sum(h['wavePeriod'] for h in day_hours) / len(day_hours), 1),
            'swellHeight': round(sum(h['swellHeight'] for h in day_hours) / len(day_hours), 1),
            'swellPeriod': round(sum(h['swellPeriod'] for h in day_hours) / len(day_hours), 1),
            'windSpeed': round(sum(h['windSpeed'] for h in day_hours) / len(day_hours), 1),
            'windDirection': round(sum(h['windDirection'] for h in day_hours) / len(day_hours), 1)
        }
        
        daily_forecast.append(daily_avg)
    
    return daily_forecast


def get_current_timestamp_iso():
    """
    Get current timestamp in ISO 8601 format (UTC).
    Format: "2024-01-15T14:30:00Z"
    
    Returns:
        str: ISO formatted timestamp
    """
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
