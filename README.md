# Atmospheric Stack: Real-Time Weather ELT Pipeline

A robust, end-to-end data engineering pipeline and monitoring dashboard that ingests real-time weather data for global cities, processes it through a streaming engine, and visualizes it on a premium dark-themed dashboard.

## 🏗️ Architecture

The project follows a modern ELT (Extract, Load, Transform) pattern:

1.  **Ingestion**: A Python producer (orchestrated by **Dagster**) fetches data from the OpenWeatherMap API and streams it into **Apache Kafka**.
2.  **Processing**: **Apache Spark Structured Streaming** consumes the raw JSON from Kafka, flattens the schema, extracts coordinates, and performs real-time transformations.
3.  **Storage**: The processed data is sinked into a **PostgreSQL** data warehouse.
4.  **API**: An **ElysiaJS (Bun)** backend provides high-performance endpoints for latest data, historical logs, and aggregated insights.
5.  **Visualization**: A **React (Vite)** dashboard features a dark-mode **Leaflet** map, **Recharts** analytics, and a searchable ingestion history.

## 🚀 Key Features

*   **Global Monitoring**: Tracking weather across multiple continents (Bangkok, London, New York, Tokyo, etc.).
*   **Premium Dashboard**: Glassmorphism UI with a minimal "Dark Matter" map and black ocean styling.
*   **Real-Time Analytics**: Insights bar chart comparing temperature extremes across cities.
*   **Searchable History**: Full tabular view of ingested records with city-based filtering.
*   **Full Orchestration**: Integrated Dagster environment for monitoring asset health and execution logs.

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Orchestration** | Dagster |
| **Message Broker** | Apache Kafka (Confluent) |
| **Stream Processing** | Apache Spark (Structured Streaming) |
| **Database** | PostgreSQL 15 |
| **Backend API** | Bun + ElysiaJS |
| **Frontend** | React 18 + Vite + Leaflet + Recharts |
| **Infrastructure** | Docker Compose |

## 📁 Project Structure

*   `orchestration/`: Dagster code, assets, and definitions.
*   `streaming/`: Kafka producer scripts for API data ingestion.
*   `processing/`: Spark streaming jobs for data transformation.
*   `backend/`: TypeScript backend served with Bun.
*   `frontend/`: Modern React dashboard source code.
*   `docker-compose.yml`: Full stack orchestration for all 9 services.

## 🚦 Getting Started

### 1. Prerequisites
*   [Docker](https://www.docker.com/get-started) & Docker Compose
*   [OpenWeatherMap API Key](https://openweathermap.org/api) (Free Tier)

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
OPENWEATHER_API_KEY=your_api_key_here
```

### 3. Spin up the Infrastructure
```bash
docker-compose up -d
```

### 4. Trigger the Pipeline
1.  Open **Dagster UI** (Port 3000).
2.  Navigate to **Assets**.
3.  Click **Materialize All** to fetch the latest weather data for all cities.
4.  The Spark job (running in the background) will automatically detect the Kafka messages and populate the database.

## 🔗 Port Mapping

| Service | URL |
| :--- | :--- |
| **Frontend Dashboard** | [http://localhost:5173](http://localhost:5173) |
| **Dagster UI** | [http://localhost:3000](http://localhost:3000) |
| **Backend API** | [http://localhost:8000](http://localhost:8000) |
| **Spark Master UI** | [http://localhost:8080](http://localhost:8080) |
| **Spark Worker UI** | [http://localhost:8081](http://localhost:8081) |
| **PostgreSQL** | `localhost:5432` |
