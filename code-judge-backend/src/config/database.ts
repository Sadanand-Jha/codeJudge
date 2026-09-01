import 'dotenv/config'; // Ye line sabse upar honi chahiye
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool();

// Session timezone → Asia/Kolkata so NOW()/timestamps use IST on every connection
pool.on("connect", (client) => {
  client.query("SET TIME ZONE 'Asia/Kolkata'").catch(() => {});
});

export async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW() AS current_time');
    console.log('Database connection successful!');
    console.log('DB Time:', res.rows[0].current_time);
  } catch (err: any) {
    console.error('Connection error:', err.message);
  } finally {
    await pool.end();
  }
}

testConnection();