import React, { useState } from "react";
import { Autocomplete, LoadScript } from "@react-google-maps/api";
import { Line } from "react-chartjs-2";
import "chart.js/auto"; // Required for Chart.js v3+

const GOOGLE_MAPS_API_KEY = " ";
const BACKEND_URL = "http://127.0.0.1:8000"; // Adjust if needed

const App = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [commuteData, setCommuteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [originRef, setOriginRef] = useState(null);
  const [destinationRef, setDestinationRef] = useState(null);

  const handleOriginSelect = () => {
    if (originRef) {
      const place = originRef.getPlace();
      if (place) setOrigin(place.formatted_address);
    }
  };

  const handleDestinationSelect = () => {
    if (destinationRef) {
      const place = destinationRef.getPlace();
      if (place) setDestination(place.formatted_address);
    }
  };

  const fetchCommuteData = async () => {
    if (!origin || !destination || !date) {
      alert("Please enter origin, destination, and date.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/commute?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${date}`
      );
      const data = await response.json();
      setCommuteData(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to fetch commute data.");
    }
    setLoading(false);
  };

  const morningChartData = commuteData
    ? {
        labels: commuteData.morning_commute.map((d) => d.time),
        datasets: [
          {
            label: "Morning Commute (To Work)",
            data: commuteData.morning_commute.map((d) => d.duration),
            borderColor: "blue",
            backgroundColor: "rgba(0, 0, 255, 0.3)",
            fill: true,
          },
        ],
      }
    : null;

  const eveningChartData = commuteData
    ? {
        labels: commuteData.evening_commute.map((d) => d.time),
        datasets: [
          {
            label: "Evening Commute (To Home)",
            data: commuteData.evening_commute.map((d) => d.duration),
            borderColor: "red",
            backgroundColor: "rgba(255, 0, 0, 0.3)",
            fill: true,
          },
        ],
      }
    : null;

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      <div style={{ padding: "20px", maxWidth: "600px", margin: "auto" }}>
        <h1>Commute App</h1>

        {/* Origin Input */}
        <label>Origin:</label>
        <Autocomplete onLoad={setOriginRef} onPlaceChanged={handleOriginSelect}>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)} // Allow typing
            placeholder="Enter origin"
          />
        </Autocomplete>

        {/* Destination Input */}
        <label>Destination:</label>
        <Autocomplete onLoad={setDestinationRef} onPlaceChanged={handleDestinationSelect}>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)} // Allow typing
            placeholder="Enter destination"
          />
        </Autocomplete>

        {/* Date Selection */}
        <label>Date:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <button onClick={fetchCommuteData}>{loading ? "Fetching..." : "Get Commute Data"}</button>

        {/* Display Results */}
        {commuteData && (
          <>
            <p><strong>Average Daily Commute:</strong> {commuteData.average_daily_commute} minutes</p>
            <p><strong>Yearly Commute Hours:</strong> {commuteData.yearly_commute_hours} hours</p>
            <p><strong>Carbon Emission:</strong> {commuteData.carbon_emission_kg} kg CO₂</p>

            <h2>Morning Commute (To Work)</h2>
            <Line data={morningChartData} />

            <h2>Evening Commute (To Home)</h2>
            <Line data={eveningChartData} />
          </>
        )}
      </div>
    </LoadScript>
  );
};

export default App;
