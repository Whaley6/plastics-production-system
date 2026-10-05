const fs = require('fs');
let content = fs.readFileSync('/app/applet/server.ts', 'utf8');

const devMiddleware = `  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {`;

// We just replace the entire if block
content = content.replace(/  if \(process\.env\.NODE_ENV !== "production"\) \{[\s\S]*?  \} else \{/, devMiddleware);
fs.writeFileSync('/app/applet/server.ts', content);
