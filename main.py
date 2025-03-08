from fastapi import FastAPI, Query
import requests
import datetime
import time
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, you can restrict to specific domains
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Google API Key (Replace with your valid key)
API_KEY = ""
API_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"

# Carbon emission factor (kg CO2 per km for an average car)
CARBON_EMISSION_FACTOR = 0.120  # Adjust as needed

def get_commute_duration(origin, destination, departure_time):
    """Fetch commute duration from Google Distance Matrix API."""
    params = {
        "origins": origin,
        "destinations": destination,
        "departure_time": int(departure_time),
        "key": API_KEY,
    }
    response = requests.get(API_URL, params=params).json()
    
    # Log the response for debugging
    print("Google Maps API Response:", response)
    
    try:
        duration_seconds = response["rows"][0]["elements"][0]["duration_in_traffic"]["value"]
        distance_meters = response["rows"][0]["elements"][0]["distance"]["value"]
        return duration_seconds / 60, distance_meters / 1000  # Convert to minutes and km
    except (KeyError, IndexError):
        return None, None

@app.get("/commute")
def get_commute_data(
    origin: str, 
    destination: str, 
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
):
    """Returns commute durations for morning and evening, including return journey."""

    morning_times = [(7,0), (7, 30), (8, 0), (8, 30), (9, 0)]  # Example morning slots
    evening_times = [(17,0), (17, 30), (18, 0), (18, 30), (19, 0)]  # Evening slots

    date_obj = datetime.datetime.strptime(date, "%Y-%m-%d")

    morning_data = []
    evening_data = []
    return_data = []
    total_distance = 0

    for hour, minute in morning_times:
        departure_time = date_obj.replace(hour=hour, minute=minute)
        unix_time = time.mktime(departure_time.timetuple())

        duration, distance = get_commute_duration(origin, destination, unix_time)
        
        if duration and distance:
            total_distance = distance
            morning_data.append({"time": f"{hour}:{minute}", "duration": duration})

    for hour, minute in evening_times:
        departure_time = date_obj.replace(hour=hour, minute=minute)
        unix_time = time.mktime(departure_time.timetuple())

        duration, distance = get_commute_duration(destination, origin, unix_time)  # Return journey
        if duration:
            evening_data.append({"time": f"{hour}:{minute}", "duration": duration})
            return_data.append({"time": f"{hour}:{minute}", "duration": duration})

    if not morning_data or not evening_data:
        return {"error": "Could not retrieve commute data. Check API key and locations."}

    avg_daily_commute = sum([d["duration"] for d in morning_data + return_data]) / len(morning_data + return_data)
    yearly_commute_hours = (avg_daily_commute * 2 * 250) / 60  # 250 workdays

    carbon_emission = total_distance * CARBON_EMISSION_FACTOR * 2 * 250  # Round trip * workdays

    return {
        "morning_commute": morning_data,
        "evening_commute": evening_data,
        "return_commute": return_data,  # Added return commute
        "average_daily_commute": round(avg_daily_commute, 2),
        "yearly_commute_hours": round(yearly_commute_hours, 2),
        "carbon_emission_kg": round(carbon_emission, 2)
    }
