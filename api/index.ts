import express from "express";
import cors from "cors";
import pg from "pg";

const { Pool } = pg;

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb", strict: false }));

// Initialize connection pool to Neon PostgreSQL
let pool: pg.Pool | null = null;
let tablesInitialized = false;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PG_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set in environment variables");
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

async function ensureTables() {
  if (tablesInitialized) return;
  const p = getPool();
  await p.query(`
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
  tablesInitialized = true;
}

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await ensureTables();
    next();
  } catch (err: any) {
    console.error("Database connection/init error:", err.message);
    res.status(500).json({ error: "Database connection failed", details: err.message });
  }
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", dbType: "postgres" });
});

app.get("/api/data/:key", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  const key = req.params.key;
  try {
    const p = getPool();
    const result = await p.query("SELECT value FROM store WHERE key = $1", [key]);
    if (result.rows.length > 0 && result.rows[0].value) {
      res.json(JSON.parse(result.rows[0].value));
    } else {
      res.status(404).json({ error: "Not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/data/:key", async (req, res) => {
  const key = req.params.key;
  const value = JSON.stringify(req.body);
  const updatedAt = Date.now();
  try {
    const p = getPool();
    await p.query(
      `INSERT INTO store (key, value, updated_at) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (key) 
       DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [key, value, updatedAt]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Auth routes
app.post("/api/change-password", async (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  if (!username || !newPassword) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const p = getPool();
    if (currentPassword !== undefined && currentPassword !== null && currentPassword !== "") {
      const checkRes = await p.query(
        "SELECT username FROM users WHERE username = $1 AND password = $2",
        [username, currentPassword]
      );
      if (checkRes.rows.length === 0) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }
    await p.query("UPDATE users SET password = $1 WHERE username = $2", [newPassword, username]);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:username/password", async (req, res) => {
  const username = req.params.username;
  const { newPassword, currentPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ error: "New password is required" });
  }
  try {
    const p = getPool();
    if (currentPassword) {
      const checkRes = await p.query(
        "SELECT username FROM users WHERE username = $1 AND password = $2",
        [username, currentPassword]
      );
      if (checkRes.rows.length === 0) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }
    await p.query("UPDATE users SET password = $1 WHERE username = $2", [newPassword, username]);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const p = getPool();
    const result = await p.query(
      "SELECT username, role FROM users WHERE username = $1 AND password = $2",
      [username, password]
    );
    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const p = getPool();
    const result = await p.query("SELECT username, role FROM users ORDER BY username ASC");
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const p = getPool();
    await p.query(
      "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)",
      [username, password, role]
    );
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "23505" || err.message?.includes("UNIQUE") || err.message?.includes("duplicate")) {
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.delete("/api/users/:username", async (req, res) => {
  const username = req.params.username;
  if (username === "admin") {
    return res.status(400).json({ error: "Cannot delete admin account" });
  }
  try {
    const p = getPool();
    await p.query("DELETE FROM users WHERE username = $1", [username]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sync", async (req, res) => {
  try {
    const p = getPool();
    const result = await p.query("SELECT key, value FROM store");
    const data: Record<string, any> = {};
    for (const row of result.rows) {
      try {
        data[row.key] = JSON.parse(row.value);
      } catch {
        data[row.key] = row.value;
      }
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
