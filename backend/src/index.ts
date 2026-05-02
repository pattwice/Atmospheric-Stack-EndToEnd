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
  .get('/api/weather/latest', async () => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT ON (city) * 
        FROM weather_analytics 
        ORDER BY city, ingested_at DESC
      `);
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Database query error:', error);
      return { success: false, error: 'Failed to fetch latest weather data.' };
    }
  })
  .get('/api/weather/history', async ({ query }) => {
    try {
      const city = query.city as string | undefined;
      let sql = 'SELECT * FROM weather_analytics ORDER BY ingested_at DESC LIMIT 200';
      let values: any[] = [];
      
      if (city && city.trim() !== '') {
        sql = 'SELECT * FROM weather_analytics WHERE city ILIKE $1 ORDER BY ingested_at DESC LIMIT 200';
        values = [`%${city.trim()}%`];
      }
      
      const result = await pool.query(sql, values);
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Database query error:', error);
      return { success: false, error: 'Failed to fetch historical data.' };
    }
  })
  .get('/api/weather/insights', async () => {
    try {
      // Get highest temp recorded per city
      const result = await pool.query(`
        SELECT city, MAX(temperature) as max_temp, MIN(temperature) as min_temp, AVG(humidity) as avg_humidity
        FROM weather_analytics 
        GROUP BY city
        ORDER BY max_temp DESC
      `);
      return { success: true, data: result.rows };
    } catch (error) {
      console.error('Database query error:', error);
      return { success: false, error: 'Failed to fetch insights.' };
    }
  })
  .listen(8000);

console.log(`🦊 Elysia API is running at ${app.server?.hostname}:${app.server?.port}`);
