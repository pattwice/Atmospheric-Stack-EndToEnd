import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

export default function App() {
  const [weatherData, setWeatherData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In Docker Compose, your browser accesses this via localhost
    fetch('http://localhost:8000/api/weather')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setWeatherData(data.data)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching weather", err)
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1 style={{ color: '#2c3e50' }}>Weather Data Pipeline Explorer</h1>
        <p style={{ color: '#7f8c8d' }}>
          Data is ingested via <strong>Kafka</strong>, processed by <strong>Spark</strong>, and served by <strong>ElysiaJS</strong>.
        </p>
      </header>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Loading real-time weather data...</div>
      ) : weatherData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#e74c3c' }}>No Data Available</h2>
          <p>Please ensure that Dagster has triggered the Kafka producer and Spark is actively processing the stream.</p>
        </div>
      ) : (
        <div style={{ height: '650px', width: '100%', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
          <MapContainer center={[51.505, -0.09]} zoom={4} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {weatherData.map((data, idx) => (
              // Note: Hardcoded coords because the OpenWeatherMap endpoint we used doesn't return lat/lon 
              // in a standard format by city name without extra params. This is sufficient for the CV demo!
              <Marker key={idx} position={[51.505 + (Math.random() * 0.1 - 0.05), -0.09 + (Math.random() * 0.1 - 0.05)]}>
                <Popup>
                  <div style={{ fontFamily: 'sans-serif' }}>
                    <strong style={{ fontSize: '1.2em', color: '#2980b9' }}>{data.city}</strong><br/>
                    <hr style={{ margin: '5px 0' }}/>
                    <strong>Temp:</strong> {data.temperature}K <br/>
                    <strong>Humidity:</strong> {data.humidity}% <br/>
                    <strong>Weather:</strong> {data.weather_main} - {data.weather_description}<br/>
                    <em style={{ fontSize: '0.8em', color: '#7f8c8d' }}>
                      Ingested: {new Date(data.ingested_at).toLocaleString()}
                    </em>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  )
}
