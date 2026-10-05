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
  // Ignore env loading errors
}

export type DbType = 'postgres' | 'sqlite';

let activeDbType: DbType = 'sqlite';
let pgPool: pg.Pool | null = null;
let sqliteDb: DatabaseSync | null = null;

// Determine connection config from environment
function getPgPoolConfig(): pg.PoolConfig | null {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_URL;
  if (connectionString) {
    const isCloudOrSsl = connectionString.includes('sslmode=require') || 
      connectionString.includes('neon.tech') || 
      connectionString.includes('supabase.co') || 
      connectionString.includes('aws') ||
      connectionString.includes('render.com') ||
      connectionString.includes('railway');

    return {
      connectionString,
      ssl: isCloudOrSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  // Alternatively check individual PG environment variables
  if (process.env.PGHOST && process.env.PGDATABASE) {
    return {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  return null;
}

// Fallback SQLite initialization
function initSqlite() {
  const dbDir = process.env.NODE_ENV === "production" ? "/tmp/data" : path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, "database.sqlite");
  sqliteDb = new DatabaseSync(dbPath);
  
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS store (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT,
      role TEXT
    );
  `);

  const stmt = sqliteDb.prepare("SELECT username FROM users WHERE username = 'admin'");
  if (!stmt.get()) {
    sqliteDb.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('admin', 'admin', 'super-admin');
  }
}

// Transfer data from SQLite to PostgreSQL
export async function transferSqliteToPostgres(pool: pg.Pool, customSqlitePath?: string) {
  const dbPath = customSqlitePath || path.join(process.cwd(), "data", "database.sqlite");
  if (!fs.existsSync(dbPath)) {
    return { success: false, message: `SQLite database file not found at ${dbPath}` };
  }

  console.log(`[Database Transfer] Reading existing data from SQLite: ${dbPath}`);
  const sourceDb = new DatabaseSync(dbPath);

  // 1. Ensure PostgreSQL tables exist
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

  // 2. Transfer store entries
  let storeRows: any[] = [];
  try {
    storeRows = sourceDb.prepare("SELECT key, value, updated_at FROM store").all() as any[];
  } catch (err: any) {
    console.warn(`[Database Transfer] Could not read store table from SQLite:`, err.message);
  }

  let storeTransferred = 0;
  for (const row of storeRows) {
    await pool.query(
      `INSERT INTO store (key, value, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) 
       DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [row.key, row.value, row.updated_at || Date.now()]
    );
    storeTransferred++;
  }

  // 3. Transfer users
  let userRows: any[] = [];
  try {
    userRows = sourceDb.prepare("SELECT username, password, role FROM users").all() as any[];
  } catch (err: any) {
    console.warn(`[Database Transfer] Could not read users table from SQLite:`, err.message);
  }

  let usersTransferred = 0;
  for (const row of userRows) {
    await pool.query(
      `INSERT INTO users (username, password, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) 
       DO UPDATE SET password = EXCLUDED.password, role = EXCLUDED.role`,
      [row.username, row.password, row.role]
    );
    usersTransferred++;
  }

  console.log(`[Database Transfer] Transferred ${storeTransferred} store rows and ${usersTransferred} users to PostgreSQL.`);
  return {
    success: true,
    storeCount: storeTransferred,
    usersCount: usersTransferred
  };
}

// Initialize database (PostgreSQL primary, SQLite fallback)
export async function initDatabase(): Promise<{ type: DbType, connected: boolean, error?: string }> {
  const pgConfig = getPgPoolConfig();

  if (pgConfig) {
    try {
      console.log("[Database] Connecting to PostgreSQL...");
      pgPool = new Pool(pgConfig);
      
      // Test connection
      await pgPool.query("SELECT NOW()");
      console.log(" Connected to PostgreSQL successfully!");
      activeDbType = 'postgres';

      // Create PostgreSQL tables
      await pgPool.query(`
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

      // Seed default admin if no users exist
      const userCountRes = await pgPool.query("SELECT COUNT(*) FROM users");
      if (parseInt(userCountRes.rows[0].count, 10) === 0) {
        await pgPool.query(
          "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING",
          ['admin', 'admin', 'super-admin']
        );
      }

      // Check if store is empty and SQLite database has records to automatically migrate
      const storeCountRes = await pgPool.query("SELECT COUNT(*) FROM store");
      const pgStoreCount = parseInt(storeCountRes.rows[0].count, 10);
      const sqlitePath = path.join(process.cwd(), "data", "database.sqlite");

      if (pgStoreCount === 0 && fs.existsSync(sqlitePath)) {
        console.log("[Database] PostgreSQL store is empty, auto-migrating existing data from SQLite...");
        try {
          await transferSqliteToPostgres(pgPool, sqlitePath);
          console.log("[Database] Auto-migration to PostgreSQL completed successfully!");
        } catch (migErr: any) {
          console.error("[Database] Auto-migration error:", migErr.message);
        }
      }

      return { type: 'postgres', connected: true };
    } catch (err: any) {
      console.error("[Database] Failed to connect to PostgreSQL:", err.message);
      console.warn("[Database] Falling back to SQLite so the application remains functional.");
      initSqlite();
      activeDbType = 'sqlite';
      return { type: 'sqlite', connected: true, error: err.message };
    }
  }

  // No PostgreSQL configured in environment
  console.log("[Database] No PostgreSQL credentials found in environment. Using SQLite database.");
  console.log("[Database] To use PostgreSQL, set DATABASE_URL in .env (e.g. postgresql://user:pass@localhost:5432/plastics)");
  initSqlite();
  activeDbType = 'sqlite';
  return { type: 'sqlite', connected: true };
}

export function getActiveDbType(): DbType {
  return activeDbType;
}

export function getPgPool(): pg.Pool | null {
  return pgPool;
}

// Unified CRUD Data Access Methods

export async function getStoreValue(key: string): Promise<string | null> {
  if (activeDbType === 'postgres' && pgPool) {
    const res = await pgPool.query("SELECT value FROM store WHERE key = $1", [key]);
    return res.rows[0]?.value ?? null;
  }
  if (sqliteDb) {
    const stmt = sqliteDb.prepare("SELECT value FROM store WHERE key = ?");
    const row = stmt.get(key) as any;
    return row?.value ?? null;
  }
  return null;
}

export async function setStoreValue(key: string, value: string, updatedAt: number): Promise<void> {
  if (activeDbType === 'postgres' && pgPool) {
    await pgPool.query(
      `INSERT INTO store (key, value, updated_at) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (key) 
       DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [key, value, updatedAt]
    );
    return;
  }
  if (sqliteDb) {
    const stmt = sqliteDb.prepare(
      "INSERT INTO store (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    );
    stmt.run(key, value, updatedAt);
  }
}

export async function getAllStoreValues(): Promise<Record<string, any>> {
  const data: Record<string, any> = {};
  if (activeDbType === 'postgres' && pgPool) {
    const res = await pgPool.query("SELECT key, value FROM store");
    for (const row of res.rows) {
      try {
        data[row.key] = JSON.parse(row.value);
      } catch {
        data[row.key] = row.value;
      }
    }
    return data;
  }
  if (sqliteDb) {
    const stmt = sqliteDb.prepare("SELECT key, value FROM store");
    const rows = stmt.all() as any[];
    for (const row of rows) {
      try {
        data[row.key] = JSON.parse(row.value);
      } catch {
        data[row.key] = row.value;
      }
    }
  }
  return data;
}

export async function getUser(username: string, password?: string): Promise<{ username: string, role: string } | null> {
  if (activeDbType === 'postgres' && pgPool) {
    if (password !== undefined) {
      const res = await pgPool.query("SELECT username, role FROM users WHERE username = $1 AND password = $2", [username, password]);
      return res.rows[0] ?? null;
    }
    const res = await pgPool.query("SELECT username, role FROM users WHERE username = $1", [username]);
    return res.rows[0] ?? null;
  }
  if (sqliteDb) {
    if (password !== undefined) {
      const stmt = sqliteDb.prepare("SELECT username, role FROM users WHERE username = ? AND password = ?");
      return (stmt.get(username, password) as any) ?? null;
    }
    const stmt = sqliteDb.prepare("SELECT username, role FROM users WHERE username = ?");
    return (stmt.get(username) as any) ?? null;
  }
  return null;
}

export async function getAllUsers(): Promise<Array<{ username: string, role: string }>> {
  if (activeDbType === 'postgres' && pgPool) {
    const res = await pgPool.query("SELECT username, role FROM users ORDER BY username ASC");
    return res.rows;
  }
  if (sqliteDb) {
    const stmt = sqliteDb.prepare("SELECT username, role FROM users ORDER BY username ASC");
    return (stmt.all() as any[]) ?? [];
  }
  return [];
}

export async function createUser(username: string, password: string, role: string): Promise<void> {
  if (activeDbType === 'postgres' && pgPool) {
    await pgPool.query("INSERT INTO users (username, password, role) VALUES ($1, $2, $3)", [username, password, role]);
    return;
  }
  if (sqliteDb) {
    const stmt = sqliteDb.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
    stmt.run(username, password, role);
  }
}

export async function updateUserPassword(username: string, newPassword: string): Promise<void> {
  if (activeDbType === 'postgres' && pgPool) {
    await pgPool.query("UPDATE users SET password = $1 WHERE username = $2", [newPassword, username]);
    return;
  }
  if (sqliteDb) {
    const stmt = sqliteDb.prepare("UPDATE users SET password = ? WHERE username = ?");
    stmt.run(newPassword, username);
  }
}

export async function deleteUser(username: string): Promise<void> {
  if (activeDbType === 'postgres' && pgPool) {
    await pgPool.query("DELETE FROM users WHERE username = $1", [username]);
    return;
  }
  if (sqliteDb) {
    const stmt = sqliteDb.prepare("DELETE FROM users WHERE username = ?");
    stmt.run(username);
  }
}
