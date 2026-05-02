import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import './index.css'

// Kelvin to Celsius helper
const toCelsius = (k: number) => (k - 273.15).toFixed(1)

// Temperature badge class
const tempClass = (k: number) => {
  const c = k - 273.15
  if (c >= 30) return 'temp-hot'
  if (c >= 20) return 'temp-warm'
  if (c >= 10) return 'temp-cool'
  return 'temp-cold'
}

// Bar chart color palette
const CHART_COLORS = ['#f43f5e', '#f59e0b', '#22d3ee', '#6366f1', '#10b981', '#a78bfa', '#ec4899', '#14b8a6']

interface WeatherRow {
  city: string
  latitude: number
  longitude: number
  temperature: number
  humidity: number
  pressure: number
  weather_main: string
  weather_description: string
  ingested_at: string
}

interface InsightRow {
  city: string
  max_temp: number
  min_temp: number
  avg_humidity: number
}

export default function App() {
  const [latestData, setLatestData] = useState<WeatherRow[]>([])
  const [historyData, setHistoryData] = useState<WeatherRow[]>([])
  const [insightsData, setInsightsData] = useState<InsightRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Fetch all 3 endpoints in parallel
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/api/weather/latest').then(r => r.json()),
      fetch('http://localhost:8000/api/weather/history').then(r => r.json()),
      fetch('http://localhost:8000/api/weather/insights').then(r => r.json()),
    ])
      .then(([latest, history, insights]) => {
        if (latest.success) setLatestData(latest.data)
        if (history.success) setHistoryData(history.data)
        if (insights.success) setInsightsData(insights.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching data:', err)
        setLoading(false)
      })
  }, [])

  // Filter history by search
  const filteredHistory = useMemo(() => {
    if (!search.trim()) return historyData
    const q = search.toLowerCase()
    return historyData.filter(row => row.city.toLowerCase().includes(q))
  }, [search, historyData])

  // Chart data: temperature comparison (Celsius)
  const chartData = useMemo(() => {
    return insightsData.map(row => ({
      city: row.city,
      maxTemp: parseFloat(toCelsius(Number(row.max_temp))),
      minTemp: parseFloat(toCelsius(Number(row.min_temp))),
      avgHumidity: parseFloat(Number(row.avg_humidity).toFixed(0)),
    }))
  }, [insightsData])

  // Custom tooltip for chart
  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null
    return (
      <div style={{
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        padding: '12px 16px',
        fontSize: '0.8rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontWeight: 700, color: '#e8e8ed', marginBottom: 6 }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, padding: '2px 0' }}>
            <span style={{ color: p.color, fontWeight: 500 }}>{p.name}</span>
            <span style={{ color: '#e8e8ed', fontWeight: 600 }}>{p.value}{p.name.includes('Humidity') ? '%' : '°C'}</span>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <span className="loading-text">Connecting to the weather pipeline...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Atmospheric Stack</h1>
        <p>
          Real-time weather data ingested via <span className="tech-tag">Kafka</span>{' '}
          processed by <span className="tech-tag">Spark</span>{' '}
          orchestrated with <span className="tech-tag">Dagster</span>{' '}
          and served by <span className="tech-tag">ElysiaJS</span>
        </p>
      </header>

      {/* Search */}
      <div className="search-container">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search cities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="dashboard-grid">
        {/* Map Card */}
        <div className="card map-card">
          <div className="card-header">
            <div className="card-icon map-icon">🌍</div>
            <h2>Global Weather Map</h2>
            <span className="card-badge">{latestData.length} cities</span>
          </div>
          <div className="card-body">
            <div className="map-wrapper">
              <MapContainer center={[25, 30]} zoom={2} style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                {latestData.map((d, idx) => {
                  const c = d.temperature - 273.15
                  const color = c >= 30 ? '#f43f5e' : c >= 20 ? '#f59e0b' : c >= 10 ? '#22d3ee' : '#6366f1'
                  return (
                    <CircleMarker
                      key={idx}
                      center={[d.latitude, d.longitude]}
                      radius={10}
                      pathOptions={{
                        color: color,
                        fillColor: color,
                        fillOpacity: 0.7,
                        weight: 2,
                        opacity: 0.9
                      }}
                    >
                      <Popup>
                        <div className="popup-city">{d.city}</div>
                        <div className="popup-row"><span className="popup-label">Temperature</span><span className="popup-value">{toCelsius(d.temperature)}°C</span></div>
                        <div className="popup-row"><span className="popup-label">Humidity</span><span className="popup-value">{d.humidity}%</span></div>
                        <div className="popup-row"><span className="popup-label">Pressure</span><span className="popup-value">{d.pressure} hPa</span></div>
                        <div className="popup-row"><span className="popup-label">Condition</span><span className="popup-value">{d.weather_description}</span></div>
                        <div className="popup-time">⏱ {new Date(d.ingested_at).toLocaleString()}</div>
                      </Popup>
                    </CircleMarker>
                  )
                })}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Insights Chart Card */}
        <div className="card insights-card">
          <div className="card-header">
            <div className="card-icon chart-icon">📊</div>
            <h2>Temperature Insights</h2>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <div className="chart-legend">
                <div className="chart-legend-item">
                  <div className="chart-legend-dot" style={{ background: '#f43f5e' }}></div>
                  Max Temperature (°C)
                </div>
                <div className="chart-legend-item">
                  <div className="chart-legend-dot" style={{ background: '#6366f1' }}></div>
                  Min Temperature (°C)
                </div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="city"
                    tick={{ fill: '#8b8b9e', fontSize: 11, fontFamily: 'Inter' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8b8b9e', fontSize: 11, fontFamily: 'Inter' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                    tickLine={false}
                    unit="°"
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                  <Bar dataKey="maxTemp" name="Max Temp" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                  <Bar dataKey="minTemp" name="Min Temp" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.35} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* History Table Card */}
        <div className="card history-card">
          <div className="card-header">
            <div className="card-icon table-icon">📋</div>
            <h2>Ingestion History</h2>
            <span className="card-badge">{filteredHistory.length} records</span>
          </div>
          <div className="card-body">
            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <h3>No matching records</h3>
                <p>Try a different search term or trigger the pipeline again.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>City</th>
                      <th>Temperature</th>
                      <th>Humidity</th>
                      <th>Pressure</th>
                      <th>Condition</th>
                      <th>Coordinates</th>
                      <th>Ingested At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((row, idx) => (
                      <tr key={idx}>
                        <td className="city-cell">{row.city}</td>
                        <td><span className={`temp-badge ${tempClass(row.temperature)}`}>{toCelsius(row.temperature)}°C</span></td>
                        <td>{row.humidity}%</td>
                        <td>{row.pressure} hPa</td>
                        <td><span className="weather-tag">{row.weather_main}</span></td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{row.latitude?.toFixed(2)}, {row.longitude?.toFixed(2)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{new Date(row.ingested_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
