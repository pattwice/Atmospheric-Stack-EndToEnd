import { Elysia } from 'elysia'
import pkg from 'pg';
const { Pool } = pkg;

// PostgreSQL connection configuration
// We use environment variables so this can run both locally and inside Docker
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin_password',
  database: process.env.DB_NAME || 'weather_db',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Helper: safely query a table that may not exist yet
async function safeQuery(sql: string, values: any[] = []) {
  try {
    return await pool.query(sql, values);
  } catch (error: any) {
    // Table doesn't exist yet — return empty result
    if (error.code === '42P01') {
      return { rows: [] };
    }
    throw error;
  }
}

const app = new Elysia()
  // Enable CORS so our React frontend can query this API
  .onRequest(({ set }) => {
    set.headers['Access-Control-Allow-Origin'] = '*'
  })
  .get('/', () => 'Weather ELT Backend is running!')

  // Latest weather per city — reads from pre-computed weather_current table
  .get('/api/weather/latest', async () => {
    try {
      const result = await safeQuery('SELECT * FROM weather_current ORDER BY city');
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Database query error:', error);
      return { success: false, error: 'Failed to fetch latest weather data.' };
    }
  })

  // Historical ingestion feed with optional city filter
  .get('/api/weather/history', async ({ query }) => {
    try {
      const city = query.city as string | undefined;
      let sql = 'SELECT * FROM weather_analytics ORDER BY ingested_at DESC LIMIT 500';
      let values: any[] = [];
      
      if (city && city.trim() !== '') {
        sql = 'SELECT * FROM weather_analytics WHERE city ILIKE $1 ORDER BY ingested_at DESC LIMIT 500';
        values = [`%${city.trim()}%`];
      }
      
      const result = await safeQuery(sql, values);
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Database query error:', error);
      return { success: false, error: 'Failed to fetch historical data.' };
    }
  })

  // Pre-aggregated insights per city from weather_summary
  .get('/api/weather/insights', async () => {
    try {
      const result = await safeQuery(`
        SELECT city, max_temp, min_temp, avg_humidity, avg_temp, record_count, last_updated
        FROM weather_summary
        ORDER BY max_temp DESC
      `);
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Database query error:', error);
      return { success: false, error: 'Failed to fetch insights.' };
    }
  })

  // Global summary stats — powered by weather_summary + weather_current
  .get('/api/weather/summary', async () => {
    try {
      // Global extremes from the pre-aggregated summary table
      const extremes = await safeQuery(`
        SELECT
          (SELECT city FROM weather_current ORDER BY temperature DESC LIMIT 1) as hottest_city,
          (SELECT temperature FROM weather_current ORDER BY temperature DESC LIMIT 1) as hottest_temp,
          (SELECT city FROM weather_current ORDER BY temperature ASC LIMIT 1) as coldest_city,
          (SELECT temperature FROM weather_current ORDER BY temperature ASC LIMIT 1) as coldest_temp,
          (SELECT city FROM weather_current ORDER BY humidity DESC LIMIT 1) as most_humid_city,
          (SELECT humidity FROM weather_current ORDER BY humidity DESC LIMIT 1) as most_humid_value,
          (SELECT COUNT(DISTINCT city) FROM weather_current) as city_count,
          (SELECT COUNT(*) FROM weather_analytics) as total_records,
          (SELECT MAX(ingested_at) FROM weather_current) as last_updated
      `);

      return { success: true, data: extremes.rows[0] || {} };
    } catch (error) {
      console.error('Database query error:', error);
      return { success: false, error: 'Failed to fetch summary.' };
    }
  })

  .listen(8000);

console.log(`🦊 Elysia API is running at ${app.server?.hostname}:${app.server?.port}`);
