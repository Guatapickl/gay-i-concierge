// Local-only gallery review: node scripts/preview-open-seat.mjs
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  resolve: { alias: { '@': root }, dedupe: ['react', 'react-dom'] },
  server: { host: '127.0.0.1', port: 4178, strictPort: true },
  plugins: [{
    name: 'open-seat-preview',
    configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        if (request.url !== '/') { next(); return; }
        try {
          const html = await vite.transformIndexHtml('/', `<!doctype html>
            <html lang="en" data-theme="dark"><head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>The Open Seat — gallery review</title></head>
            <body><div id="root"></div><script type="module" src="/scripts/open-seat-preview.tsx"></script></body></html>`);
          response.setHeader('Content-Type', 'text/html');
          response.end(html);
        } catch (error) { next(error); }
      });
    },
  }],
});
await server.listen();
process.stdout.write('Open Seat preview: http://127.0.0.1:4178/\n');
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => { await server.close(); process.exit(0); });
}
