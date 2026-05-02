import subprocess
import os
from dagster import asset, get_dagster_logger, ScheduleDefinition, define_asset_job

logger = get_dagster_logger()

# We need the absolute path to the scripts to avoid working directory issues
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PRODUCER_SCRIPT = os.path.join(PROJECT_ROOT, "streaming", "producer.py")

@asset(description="Fetch data from OpenWeatherMap API and produce to Kafka topic")
def raw_weather_kafka_stream():
    """Runs the Kafka producer script to ingest weather data as a batch operation."""
    logger.info("Triggering the Kafka producer script...")
    
    try:
        # We invoke the producer script using subprocess
        # Since we refactored it to not use a 'while True' loop, it will run once and exit.
        process = subprocess.run(
            ["python", PRODUCER_SCRIPT], 
            capture_output=True,
            text=True,
            check=True # Raises an exception if the script fails
        )
            
        logger.info(f"Producer output: {process.stdout}")
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Producer failed with error: {e.stderr}")
        raise Exception(f"Producer script failed: {e.stderr}")

# Define a job that materializes the Kafka producer asset
weather_ingestion_job = define_asset_job("weather_ingestion_job", selection="raw_weather_kafka_stream")

# Define a schedule to run the producer job every 5 minutes
weather_ingestion_schedule = ScheduleDefinition(
    job=weather_ingestion_job,
    cron_schedule="*/5 * * * *", # Every 5 minutes
)
