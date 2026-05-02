import os
import json
import time
import requests
from confluent_kafka import Producer
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OpenWeatherMap API Configuration
# Get your free API key at https://openweathermap.org/
API_KEY = os.getenv("OPENWEATHER_API_KEY")
if not API_KEY or API_KEY == "your_real_key_here":
    raise ValueError("OPENWEATHER_API_KEY is missing or invalid in .env")
CITY = "London" 
URL = f"https://api.openweathermap.org/data/2.5/weather?q={CITY}&appid={API_KEY}"

# Kafka Configuration
# We connect to localhost:29092 because we exposed this port in our docker-compose for host machine access
KAFKA_BROKER = "localhost:29092"
TOPIC_NAME = "weather_raw"

# Delivery callback to verify if the message was sent successfully
def delivery_report(err, msg):
    if err is not None:
        print(f"Message delivery failed: {err}")
    else:
        print(f"Message delivered to {msg.topic()} [{msg.partition()}]")

def fetch_weather_data():
    """Fetches real-time weather data from the OpenWeatherMap API."""
    try:
        response = requests.get(URL)
        response.raise_for_status() # Raises an exception for HTTP errors
        return response.json()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None

def main():
    # Initialize the Kafka Producer
    # The producer needs to know where the broker is located
    conf = {'bootstrap.servers': KAFKA_BROKER}
    producer = Producer(conf)

    print("Starting Weather Data Producer (Batch run)...")
    
    # In a Dagster orchestrated pipeline, we run this once per schedule (e.g., every 5 mins)
    # instead of an infinite loop.
    data = fetch_weather_data()
    
    if data:
        # Convert JSON dict to string
        message = json.dumps(data)
        
        # Produce the message to the Kafka topic
        producer.produce(TOPIC_NAME, message.encode('utf-8'), callback=delivery_report)
        producer.poll(0)
        
    # Flush ensures all messages are sent before the script exits
    producer.flush()
    print("Producer finished.")

if __name__ == "__main__":
    main()
