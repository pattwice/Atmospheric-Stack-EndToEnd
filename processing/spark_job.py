import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, current_timestamp, max as spark_max, min as spark_min, avg as spark_avg, count as spark_count
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, ArrayType

# PostgreSQL Configuration
POSTGRES_URL = os.getenv("DB_JDBC_URL", "jdbc:postgresql://localhost:5432/weather_db")
POSTGRES_USER = os.getenv("DB_USER", "admin")
POSTGRES_PASSWORD = os.getenv("DB_PASSWORD", "admin_password")

# Kafka Configuration
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:29092")
TOPIC_NAME = "weather_raw"

# JDBC properties reused across writers
JDBC_PROPS = {
    "url": POSTGRES_URL,
    "user": POSTGRES_USER,
    "password": POSTGRES_PASSWORD,
    "driver": "org.postgresql.Driver",
}

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

    # 3. Write Stream to PostgreSQL using foreachBatch
    # Each micro-batch writes to three tables:
    #   - weather_analytics: append-only historical log
    #   - weather_current: latest reading per city (overwrite)
    #   - weather_summary: pre-aggregated stats per city
    def write_batch(batch_df, batch_id):
        if len(batch_df.head(1)) == 0:
            return
        
        # Cache the batch since we use it multiple times
        batch_df.cache()
        
        # --- Table 1: weather_analytics (append-only history) ---
        print(f"[Batch {batch_id}] Writing {batch_df.count()} rows to weather_analytics...")
        batch_df.write \
            .format("jdbc") \
            .option("url", JDBC_PROPS["url"]) \
            .option("dbtable", "weather_analytics") \
            .option("user", JDBC_PROPS["user"]) \
            .option("password", JDBC_PROPS["password"]) \
            .option("driver", JDBC_PROPS["driver"]) \
            .mode("append") \
            .save()

        # --- Table 2: weather_current (latest per city, full overwrite) ---
        # We read the full current table from Postgres, union with the new batch,
        # then deduplicate keeping only the latest row per city.
        try:
            existing_current = spark.read \
                .format("jdbc") \
                .option("url", JDBC_PROPS["url"]) \
                .option("dbtable", "weather_current") \
                .option("user", JDBC_PROPS["user"]) \
                .option("password", JDBC_PROPS["password"]) \
                .option("driver", JDBC_PROPS["driver"]) \
                .load()
            merged = existing_current.union(batch_df)
        except Exception:
            # Table doesn't exist yet on first run
            merged = batch_df

        from pyspark.sql.window import Window
        from pyspark.sql.functions import row_number, desc
        
        window = Window.partitionBy("city").orderBy(desc("ingested_at"))
        latest_per_city = merged.withColumn("rn", row_number().over(window)) \
            .filter(col("rn") == 1) \
            .drop("rn")

        print(f"[Batch {batch_id}] Updating weather_current with {latest_per_city.count()} cities...")
        latest_per_city.write \
            .format("jdbc") \
            .option("url", JDBC_PROPS["url"]) \
            .option("dbtable", "weather_current") \
            .option("user", JDBC_PROPS["user"]) \
            .option("password", JDBC_PROPS["password"]) \
            .option("driver", JDBC_PROPS["driver"]) \
            .option("truncate", "true") \
            .mode("overwrite") \
            .save()

        # --- Table 3: weather_summary (pre-aggregated stats) ---
        # Read all historical data and compute aggregates
        try:
            all_analytics = spark.read \
                .format("jdbc") \
                .option("url", JDBC_PROPS["url"]) \
                .option("dbtable", "weather_analytics") \
                .option("user", JDBC_PROPS["user"]) \
                .option("password", JDBC_PROPS["password"]) \
                .option("driver", JDBC_PROPS["driver"]) \
                .load()

            summary_df = all_analytics.groupBy("city").agg(
                spark_max("temperature").alias("max_temp"),
                spark_min("temperature").alias("min_temp"),
                spark_avg("humidity").alias("avg_humidity"),
                spark_avg("temperature").alias("avg_temp"),
                spark_count("*").alias("record_count"),
                spark_max("ingested_at").alias("last_updated")
            )

            print(f"[Batch {batch_id}] Refreshing weather_summary...")
            summary_df.write \
                .format("jdbc") \
                .option("url", JDBC_PROPS["url"]) \
                .option("dbtable", "weather_summary") \
                .option("user", JDBC_PROPS["user"]) \
                .option("password", JDBC_PROPS["password"]) \
                .option("driver", JDBC_PROPS["driver"]) \
                .option("truncate", "true") \
                .mode("overwrite") \
                .save()
        except Exception as e:
            print(f"[Batch {batch_id}] Warning: Could not compute summary: {e}")

        batch_df.unpersist()
            
    print("Starting streaming write to PostgreSQL (3 tables)...")
    query = transformed_df.writeStream \
        .foreachBatch(write_batch) \
        .outputMode("append") \
        .start()

    query.awaitTermination()

if __name__ == "__main__":
    spark = create_spark_session()
    # Suppress verbose logging
    spark.sparkContext.setLogLevel("WARN")
    process_data(spark)
