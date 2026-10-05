const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const devMiddleware = `  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve("index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {`;

code = code.replace(/  if \(process\.env\.NODE_ENV !== "production"\) \{\n    const vite = await createViteServer\(\{\n      server: \{ middlewareMode: true \},\n      appType: "spa",\n    \}\);\n    app\.use\(vite\.middlewares\);\n  \} else \{/, devMiddleware);

fs.writeFileSync('server.ts', code);
