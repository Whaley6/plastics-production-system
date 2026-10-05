import pg from 'pg';
import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const { Pool } = pg;

// Try to load .env natively if present (Node.js 20.6+)
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath) && typeof (process as any).loadEnvFile === 'function') {
    (process as any).loadEnvFile(envPath);
  }
} catch {
  // Ignore
}

async function runTransfer() {
  console.log("=================================================");
  console.log("  TRANSFER DATABASE: SQLite -> PostgreSQL");
  console.log("=================================================");

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_URL;
  let poolConfig: pg.PoolConfig;

  if (connectionString) {
    const isCloudOrSsl = connectionString.includes('sslmode=require') || 
      connectionString.includes('neon.tech') || 
      connectionString.includes('supabase.co') || 
      connectionString.includes('aws') ||
      connectionString.includes('render.com') ||
      connectionString.includes('railway');

    console.log(`Connecting using connection string: ${connectionString.replace(/:([^:@]+)@/, ':****@')}`);
    poolConfig = {
      connectionString,
      ssl: isCloudOrSsl ? { rejectUnauthorized: false } : undefined,
    };
  } else if (process.env.PGHOST && process.env.PGDATABASE) {
    console.log(`Connecting to PostgreSQL host: ${process.env.PGHOST}, database: ${process.env.PGDATABASE}`);
    poolConfig = {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  } else {
    console.error(" ERROR: No PostgreSQL connection info found!");
    console.error("Please provide DATABASE_URL in your .env file or command line.");
    console.error("Example:");
    console.error("  DATABASE_URL=postgresql://postgres:password@localhost:5432/plastics");
    process.exit(1);
  }

  const sqlitePath = path.join(process.cwd(), "data", "database.sqlite");
  if (!fs.existsSync(sqlitePath)) {
    console.error(` ERROR: SQLite database file not found at: ${sqlitePath}`);
    process.exit(1);
  }

  console.log(` Reading source SQLite database: ${sqlitePath}`);
  const sqlite = new DatabaseSync(sqlitePath);

  console.log(" Connecting to PostgreSQL...");
  const pool = new Pool(poolConfig);

  try {
    const testRes = await pool.query("SELECT NOW() as now, current_database() as db");
    console.log(` Connected! Server time: ${testRes.rows[0].now}, Database: ${testRes.rows[0].db}`);

    // Create tables in PostgreSQL
    console.log(" Ensuring tables exist in PostgreSQL...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT,
        updated_at BIGINT
      );
      CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(255) PRIMARY KEY,
        password TEXT,
        role VARCHAR(100)
      );
    `);

    // Transfer Store Table
    console.log("\n--- Transferring 'store' table ---");
    const storeRows = sqlite.prepare("SELECT key, value, updated_at FROM store").all() as any[];
    console.log(`Found ${storeRows.length} entries in SQLite 'store'.`);

    let storeCount = 0;
    for (const row of storeRows) {
      const sizeBytes = Buffer.byteLength(row.value || '', 'utf8');
      console.log(`  Transferring key: "${row.key}" (${(sizeBytes / 1024).toFixed(1)} KB)`);
      await pool.query(
        `INSERT INTO store (key, value, updated_at) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (key) 
         DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
        [row.key, row.value, row.updated_at || Date.now()]
      );
      storeCount++;
    }

    // Transfer Users Table
    console.log("\n--- Transferring 'users' table ---");
    const userRows = sqlite.prepare("SELECT username, password, role FROM users").all() as any[];
    console.log(`Found ${userRows.length} users in SQLite 'users'.`);

    let userCount = 0;
    for (const row of userRows) {
      console.log(`  Transferring user: "${row.username}" (role: ${row.role})`);
      await pool.query(
        `INSERT INTO users (username, password, role) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (username) 
         DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role`,
        [row.username, row.password, row.role]
      );
      userCount++;
    }

    // Verification
    console.log("\n--- Verifying PostgreSQL counts ---");
    const verifyStore = await pool.query("SELECT COUNT(*) as count FROM store");
    const verifyUsers = await pool.query("SELECT COUNT(*) as count FROM users");
    console.log(`PostgreSQL 'store' row count: ${verifyStore.rows[0].count}`);
    console.log(`PostgreSQL 'users' row count: ${verifyUsers.rows[0].count}`);

    console.log("\n=================================================");
    console.log(" SUCCESS! Database transfer complete.");
    console.log(`  - Store entries transferred: ${storeCount}`);
    console.log(`  - User accounts transferred: ${userCount}`);
    console.log("=================================================\n");

  } catch (err: any) {
    console.error("\n Transfer Failed with error:", err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTransfer();
