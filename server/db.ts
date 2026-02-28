import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

let db: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;

async function initializeDatabase(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('No DATABASE_URL found, using memory storage');
    return false;
  }

  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    db = drizzle(pool, { schema });

    await pool.query('SELECT 1');
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.warn('Database connection failed:', error instanceof Error ? error.message : String(error));
    db = null;
    pool = null;
    return false;
  }
}

export { pool, db, initializeDatabase };
