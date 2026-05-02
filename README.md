# 🌌 Atmospheric Stack: End-to-End Weather Pipeline

A high-performance ELT (Extract, Load, Transform) pipeline and real-time dashboard that ingests global weather data, processes it with Spark, and visualizes it on a premium dark-themed dashboard.

![Dashboard Preview](https://via.placeholder.com/1200x600/0a0a0f/6366f1?text=Atmospheric+Stack+Dashboard+Preview)

## 🏗️ Architecture

This project demonstrates a modern data engineering stack combined with a high-performance web layer:

*   **Ingestion**: Python-based Kafka Producer fetching data from **OpenWeatherMap API**.
*   **Message Broker**: **Apache Kafka** handles the raw data stream.
*   **Stream Processing**: **Apache Spark** transforms JSON streams into a structured relational format, including coordinate flattening.
*   **Orchestration**: **Dagster** manages data assets and pipeline schedules.
*   **Storage**: **PostgreSQL** serves as the analytical data warehouse.
*   **Backend**: **Bun + ElysiaJS** providing high-concurrency API endpoints.
*   **Frontend**: **React (Vite)** with **Leaflet.js** (CartoDB Dark Matter) and **Recharts** for premium visualizations.

## 🚀 Key Features

*   **Real-Time Data Flow**: Stream data from API to Map in seconds.
*   **Premium Visuals**: Custom dark-themed map with colored marker intensity based on temperature.
*   **Advanced Analytics**: Comparative insights chart showing Max/Min temperatures across global cities.
*   **Global Search**: Instantly filter ingestion history by city name.
*   **Glassmorphic UI**: Modern, responsive dashboard design with interactive components.

## 📁 Project Structure

```text
├── orchestration/  # Dagster assets, jobs, and workspace configuration
├── streaming/      # Kafka producers and ingestion logic
├── processing/     # Spark Streaming jobs for data transformation
├── backend/        # ElysiaJS (Bun) API layer
├── frontend/       # React + Vite dashboard application
└── docker-compose.yml # Full stack infrastructure orchestration
```

## 🛠️ Setup & Installation

### Prerequisites
*   Docker & Docker Compose
*   OpenWeatherMap API Key ([Get one here](https://openweathermap.org/api))

### Step 1: Environment Configuration
Create a `.env` file in the root directory:
```env
OPENWEATHER_API_KEY=your_api_key_here
```

### Step 2: Launch the Stack
```bash
docker-compose up -d
```

### Step 3: Trigger Data Ingestion
1.  Open **Dagster UI** at [http://localhost:3000](http://localhost:3000).
2.  Navigate to the `raw_weather_kafka_stream` asset.
3.  Click **Materialize** to trigger the initial data fetch.

### Step 4: Explore the Dashboard
Open [http://localhost:5173](http://localhost:5173) to see the live weather data flowing through the pipeline.

## 📊 API Endpoints
*   `GET /api/weather/latest`: Returns the most recent reading for every city.
*   `GET /api/weather/history`: Returns the raw history of processed data (searchable).
*   `GET /api/weather/insights`: Returns temperature and humidity aggregates per city.

---
Built with 💙 by Antigravity.
