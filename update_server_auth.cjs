const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const tables = `  db.exec(
    \`CREATE TABLE IF NOT EXISTS store (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER
    )\`
  );
  db.exec(
    \`CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT,
      role TEXT
    )\`
  );
  
  // Seed admin user if it doesn't exist
  const stmt = db.prepare("SELECT username FROM users WHERE username = 'admin'");
  if (!stmt.get()) {
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('admin', 'admin', 'super-admin');
  }
`;

code = code.replace(/db\.exec\(\s*`CREATE TABLE IF NOT EXISTS store \([\s\S]*?`\s*\);/, tables);

const authRoutes = `  // Auth routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    try {
      const stmt = db.prepare("SELECT username, role FROM users WHERE username = ? AND password = ?");
      const user = stmt.get(username, password);
      if (user) {
        res.json({ success: true, user });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/users", (req, res) => {
    try {
      const stmt = db.prepare("SELECT username, role FROM users");
      const users = stmt.all();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/users", (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    try {
      const stmt = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
      stmt.run(username, password, role);
      res.json({ success: true });
    } catch (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        res.status(400).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  app.delete("/api/users/:username", (req, res) => {
    const username = req.params.username;
    if (username === 'admin') {
      return res.status(400).json({ error: "Cannot delete admin account" });
    }
    try {
      const stmt = db.prepare("DELETE FROM users WHERE username = ?");
      stmt.run(username);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/sync",`;

code = code.replace(/app\.get\("\/api\/sync",/, authRoutes);

fs.writeFileSync('server.ts', code);
