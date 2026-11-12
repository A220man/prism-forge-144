
/**
 * Local file server for serving HTML and assets during inspection.
 */

import http from 'node:http';
import { createReadStream } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/**
 * Create a simple HTTP server for serving files from a root directory.
 * @param {string} root - Root directory to serve files from
 * @param {number} port - Port to listen on (0 for random)
 * @returns {Promise<{server: http.Server, url: string, close: () => Promise<void>>>}
 */
export function createFileServer(root, port = 0) {
  const resolvedRoot = resolve(root);

  return new Promise((resolvePromise, reject) => {
    const server = http.createServer((req, res) => {
      // Parse URL path
      const urlPath = new URL(req.url, `http://localhost`).pathname;
      const filePath = join(resolvedRoot, urlPath.slice(1));

      // Security: prevent directory traversal
      const resolvedFilePath = resolve(filePath);
      if (!resolvedFilePath.startsWith(resolvedRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      // Try to read the file
      import('node:fs/promises')
        .then((fs) => fs.stat(resolvedFilePath))
        .then((stats) => {
          if (stats.isDirectory()) {
            // Try index.html
            const indexPath = join(resolvedFilePath, 'index.html');
            return import('node:fs/promises')
              .then((fs) => fs.stat(indexPath))
              .then(() => indexPath)
              .catch(() => null);
          }
          return resolvedFilePath;
        })
        .then((filePath) => {
          if (!filePath) {
            res.writeHead(404);
            res.end('Not Found');
            return;
          }

          const ext = extname(filePath).toLowerCase();
          const mime = MIME_TYPES[ext] || 'application/octet-stream';

          res.writeHead(200, { 'Content-Type': mime });
          createReadStream(filePath).pipe(res);
        })
        .catch(() => {
          res.writeHead(404);
          res.end('Not Found');
        });
    });

    server.listen(port, '127.0.0.1', () => {
      const address = server.address();
      const actualPort = address.port;
      const url = `http://127.0.0.1:${actualPort}`;
      resolvePromise({
        server,
        url,
        close: () =>
          new Promise((resolveClose, rejectClose) => {
            server.close((err) => (err ? rejectClose(err) : resolveClose()));
          }),
      });
    });

    server.on('error', reject);
  });
}

/**
 * Determine the serve root for a given file path.
 * If the file is inside the current working directory, serve from the file's directory.
 * If a custom root is provided via --root flag, use that.
 * Otherwise, serve from the file's directory (for files outside cwd).
 * @param {string} filePath - Path to the HTML file
 * @param {string} [customRoot] - Optional custom root from --root flag
 * @param {string} [cwd] - Current working directory (default: process.cwd())
 * @returns {string} Directory to serve as web root
 */
export function getServeRoot(filePath, customRoot, cwd = process.cwd()) {
  if (customRoot) {
    return resolve(cwd, customRoot);
  }

  const resolvedFile = resolve(filePath);
  const resolvedCwd = resolve(cwd);

  // Serve from file's directory by default
  // This ensures root-relative assets resolve correctly for builds in any directory
  return dirname(resolvedFile);
}

import { dirname } from 'node:path';
