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

const app = new Elysia()
  // Enable CORS so our React frontend can query this API
  .onRequest(({ set }) => {
    set.headers['Access-Control-Allow-Origin'] = '*'
  })
  .get('/', () => 'Weather ELT Backend is running!')
  .get('/api/weather', async () => {
    try {
      // Query the table created by our Spark streaming job
      // We fetch the most recent data
      const result = await pool.query('SELECT * FROM weather_analytics ORDER BY ingested_at DESC LIMIT 50');
      
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      console.error('Database query error:', error);
      return {
        success: false,
        error: 'Failed to fetch weather data from PostgreSQL. Have you started the Spark job yet?'
      };
    }
  })
  .listen(8000);

console.log(`🦊 Elysia API is running at ${app.server?.hostname}:${app.server?.port}`);
