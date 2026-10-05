import { createServer } from 'vite';
async function run() {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  console.log(vite.middlewares.stack.map(m => m.handle.name || m.route));
  process.exit(0);
}
run();
