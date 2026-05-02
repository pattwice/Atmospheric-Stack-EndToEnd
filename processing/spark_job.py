import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, current_timestamp
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, ArrayType

# PostgreSQL Configuration
POSTGRES_URL = os.getenv("DB_JDBC_URL", "jdbc:postgresql://localhost:5432/weather_db")
POSTGRES_USER = os.getenv("DB_USER", "admin")
POSTGRES_PASSWORD = os.getenv("DB_PASSWORD", "admin_password")

# Kafka Configuration
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:29092")
TOPIC_NAME = "weather_raw"

def create_spark_session():
    """
    Creates the SparkSession with Kafka and PostgreSQL dependencies.
    """
    return SparkSession.builder \
        .appName("WeatherDataProcessor") \
        .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.2.1,org.postgresql:postgresql:42.5.4") \
        .getOrCreate()

def process_data(spark):
    """Reads from Kafka, transforms the JSON, and writes to PostgreSQL."""
    
    # Define the schema of the incoming JSON from OpenWeatherMap
    weather_schema = StructType([
        StructField("name", StringType(), True), # City name
        StructField("coord", StructType([
            StructField("lat", DoubleType(), True),
            StructField("lon", DoubleType(), True)
        ]), True),
        StructField("main", StructType([
            StructField("temp", DoubleType(), True),
            StructField("humidity", IntegerType(), True),
            StructField("pressure", IntegerType(), True)
        ]), True),
        StructField("weather", ArrayType(
            StructType([
                StructField("main", StringType(), True),
                StructField("description", StringType(), True)
            ])
        ), True)
    ])

    # 1. Read Stream from Kafka
    print(f"Reading from Kafka topic: {TOPIC_NAME}...")
    raw_df = spark.readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BROKER) \
        .option("subscribe", TOPIC_NAME) \
        .option("startingOffsets", "earliest") \
        .load()

    # Kafka values are stored as raw bytes. We cast them to strings so we can parse the JSON.
    json_df = raw_df.selectExpr("CAST(value AS STRING) as json_string")

    # 2. Parse the JSON and Extract Columns
    parsed_df = json_df.withColumn("data", from_json(col("json_string"), weather_schema)).select("data.*")

    # Flatten the struct and array fields into a flat table structure
    transformed_df = parsed_df.select(
        col("name").alias("city"),
        col("coord.lat").alias("latitude"),
        col("coord.lon").alias("longitude"),
        col("main.temp").alias("temperature"),
        col("main.humidity").alias("humidity"),
        col("main.pressure").alias("pressure"),
        col("weather").getItem(0).getField("main").alias("weather_main"),
        col("weather").getItem(0).getField("description").alias("weather_description"),
        current_timestamp().alias("ingested_at")
    )

    # 3. Write Stream to PostgreSQL
    # Since Spark's default JDBC writer doesn't natively support streaming mode out-of-the-box,
    # we use 'foreachBatch' to write micro-batches to our database.
    def write_to_postgres(batch_df, batch_id):
        batch_df.write \
            .format("jdbc") \
            .option("url", POSTGRES_URL) \
            .option("dbtable", "weather_analytics") \
            .option("user", POSTGRES_USER) \
            .option("password", POSTGRES_PASSWORD) \
            .option("driver", "org.postgresql.Driver") \
            .mode("append") \
            .save()
            
    print("Writing stream to PostgreSQL table: weather_analytics...")
    query = transformed_df.writeStream \
        .foreachBatch(write_to_postgres) \
        .outputMode("append") \
        .start()

    query.awaitTermination()

if __name__ == "__main__":
    spark = create_spark_session()
    # Suppress verbose logging
    spark.sparkContext.setLogLevel("WARN")
    process_data(spark)
