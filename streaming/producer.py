import os
import json
import time
import requests
import sys
from confluent_kafka import Producer
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OpenWeatherMap API Configuration
# Get your free API key at https://openweathermap.org/
API_KEY = os.getenv("OPENWEATHER_API_KEY")
if not API_KEY or API_KEY == "your_real_key_here":
    raise ValueError("OPENWEATHER_API_KEY is missing or invalid in .env")

CITIES = [
    # Americas (20%)
    'New York', 'Los Angeles', 'Chicago', 'Toronto', 'Mexico City',
    'Sao Paulo', 'Buenos Aires', 'Lima', 'Bogota', 'Havana',
    # Europe & Africa (30%)
    'London', 'Paris', 'Berlin', 'Madrid', 'Rome',
    'Moscow', 'Istanbul', 'Cairo', 'Lagos', 'Nairobi',
    'Cape Town', 'Stockholm', 'Warsaw', 'Athens', 'Casablanca',
    # Asia & Oceania (30%)
    'Tokyo', 'Bangkok', 'Beijing', 'Mumbai', 'Dubai',
    'Singapore', 'Seoul', 'Sydney', 'Jakarta', 'Manila',
    'Kuala Lumpur', 'Ho Chi Minh City', 'Taipei', 'Auckland', 'Osaka',
    # Extreme Locations (20%)
    'Reykjavik', 'Yakutsk', 'Murmansk', 'Norilsk', 'Kuwait City',
    'Djibouti', 'Alice Springs', 'Ulaanbaatar', 'Lhasa', 'Riyadh',
]

# Kafka Configuration
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:29092")
TOPIC_NAME = "weather_raw"

# Track delivery errors so the script can fail properly
delivery_error = False

def delivery_report(err, msg):
    global delivery_error
    if err is not None:
        print(f"Message delivery failed: {err}")
        delivery_error = True
    else:
        print(f"Message delivered to {msg.topic()} [{msg.partition()}]")

def fetch_weather_data(city):
    """Fetches real-time weather data from the OpenWeatherMap API."""
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}"
    try:
        response = requests.get(url)
        response.raise_for_status() # Raises an exception for HTTP errors
        return response.json()
    except Exception as e:
        print(f"Error fetching data for {city}: {e}")
        return None

def main():
    # Initialize the Kafka Producer
    conf = {
        'bootstrap.servers': KAFKA_BROKER,
        'message.timeout.ms': 10000 # 10 seconds timeout to fail fast if broker is unreachable
    }
    producer = Producer(conf)

    print("Starting Weather Data Producer (Batch run)...")
    
    # In a Dagster orchestrated pipeline, we run this once per schedule
    for city in CITIES:
        data = fetch_weather_data(city)
        
        if data:
            # Convert JSON dict to string
            message = json.dumps(data)
            
            # Produce the message to the Kafka topic
            producer.produce(TOPIC_NAME, message.encode('utf-8'), callback=delivery_report)
            producer.poll(0)
        
    # Flush ensures all messages are sent before the script exits
    # It returns the number of messages still in queue
    remaining = producer.flush(15) # Wait up to 15 seconds to flush
    
    if remaining > 0 or delivery_error:
        print("Producer failed to deliver one or more messages.")
        sys.exit(1)
        
    print("Producer finished successfully.")

if __name__ == "__main__":
    main()
