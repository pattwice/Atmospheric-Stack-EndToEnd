# Weather ELT Pipeline & Web App

This is an end-to-end Data Engineering and Web App project to ingest, process, store, and display weather data from the OpenWeatherMap API.

## Architecture

*   **Streaming Ingestion**: Apache Kafka
*   **Data Processing**: Apache Spark
*   **Orchestration**: Dagster
*   **Database**: PostgreSQL
*   **Backend**: Bun + ElysiaJS
*   **Frontend**: React (Vite) + Leaflet.js

## Project Structure

*   `streaming/`: Kafka producers for API data.
*   `processing/`: Spark jobs for data transformation.
*   `orchestration/`: Dagster assets and schedules.
*   `backend/`: ElysiaJS backend API.
*   `frontend/`: React application.
*   `docker/`: Custom docker configurations.

## Running the project

(Instructions will be added as the infrastructure is built).
