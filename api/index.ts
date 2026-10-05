import express from "express";
import cors from "cors";
import {
  initDatabase,
  getActiveDbType,
  getStoreValue,
  setStoreValue,
  getAllStoreValues,
  getUser,
  getAllUsers,
  createUser,
  updateUserPassword,
  deleteUser
} from "../db";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb", strict: false }));

// Lazy init database connection
let dbReady = false;
let dbInitPromise: Promise<any> | null = null;

const ensureDb = async () => {
  if (dbReady) return;
  if (!dbInitPromise) {
    dbInitPromise = initDatabase().then(() => {
      dbReady = true;
    });
  }
  await dbInitPromise;
};

app.use(async (req, res, next) => {
  try {
    await ensureDb();
    next();
  } catch (err: any) {
    console.error("Database initialization failed:", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", dbType: getActiveDbType() });
});

app.get("/api/data/:key", async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  const key = req.params.key;
  try {
    const val = await getStoreValue(key);
    if (val !== null && val !== undefined) {
      res.json(JSON.parse(val));
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
    await setStoreValue(key, value, updatedAt);
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
    if (currentPassword !== undefined && currentPassword !== null && currentPassword !== "") {
      const user = await getUser(username, currentPassword);
      if (!user) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }
    await updateUserPassword(username, newPassword);
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
    if (currentPassword) {
      const user = await getUser(username, currentPassword);
      if (!user) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }
    await updateUserPassword(username, newPassword);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await getUser(username, password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
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
    await createUser(username, password, role);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message?.includes("UNIQUE") || err.code === "23505" || err.message?.includes("duplicate")) {
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.delete("/api/users/:username", async (req, res) => {
  const username = req.params.username;
  if (username === 'admin') {
    return res.status(400).json({ error: "Cannot delete admin account" });
  }
  try {
    await deleteUser(username);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sync", async (req, res) => {
  try {
    const data = await getAllStoreValues();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
