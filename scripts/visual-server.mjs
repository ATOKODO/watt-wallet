import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '');
const port = Number(process.argv[3]);
if (!process.argv[2] || !Number.isInteger(port) || port < 1024 || port > 65535)
  throw Error('Usage: node scripts/visual-server.mjs <build-directory> <port>');
await stat(path.join(root, 'index.html'));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (
      url.pathname === '/__visual_shutdown__' &&
      request.method === 'POST' &&
      request.headers['x-watt-wallet-visual'] === 'shutdown'
    ) {
      response.writeHead(200).end('Visual server stopped');
      server.close(() => process.exit(0));
      server.closeIdleConnections();
      return;
    }
    // Same-origin setup document allows fixture seeding before Angular starts.
    if (url.pathname === '/__visual_setup__.html') {
      response.writeHead(200, { 'Content-Type': types['.html'], 'Cache-Control': 'no-store' });
      response.end('<!doctype html><html><body>Visual test setup</body></html>');
      return;
    }
    const file = path.resolve(
      root,
      '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
    );
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    const bytes = await readFile(file);
    response.writeHead(200, {
      'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(bytes);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log('Visual fixture server: http://127.0.0.1:' + port));
