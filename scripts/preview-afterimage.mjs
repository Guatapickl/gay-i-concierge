// Local-only gallery review for Afterimage (Praxis · Cooperative Council · 2026-09-09): node scripts/preview-afterimage.mjs
// Query parameters: ?theme=light|dark  ?layout=gallery|detail|solo  ?pin=1 (activates the artwork's click state)
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PREVIEW_PORT ?? 4180);
const server = await createServer({
  root,
  configFile: false,
  resolve: { alias: { '@': root }, dedupe: ['react', 'react-dom'] },
  server: { host: '127.0.0.1', port, strictPort: true },
  plugins: [{
    name: 'afterimage-preview',
    configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://127.0.0.1');
        if (url.pathname !== '/') { next(); return; }
        const theme = url.searchParams.get('theme') === 'light' ? 'light' : 'dark';
        try {
          const html = await vite.transformIndexHtml('/', `<!doctype html>
            <html lang="en" data-theme="${theme}"><head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>Flagship Showcase — local review</title></head>
            <body><div id="root"></div><script type="module" src="/scripts/afterimage-preview.tsx"></script></body></html>`);
          response.setHeader('Content-Type', 'text/html');
          response.end(html);
        } catch (error) { next(error); }
      });
    },
  }],
});
await server.listen();
process.stdout.write(`Showcase preview: http://127.0.0.1:${port}/\n`);
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => { await server.close(); process.exit(0); });
}
