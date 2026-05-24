/**
 * Vite dev-server plugin: in-browser editor ↔ on-disk main.tf sync.
 *
 * Endpoints (only mounted in dev mode):
 *   POST /__sync/<slug>   — body becomes <repoRoot>/<slug>/main.tf
 *   GET  /__sync/<slug>   — returns the current <repoRoot>/<slug>/main.tf
 *
 * Slug must match /^[0-9]{2}-[a-z0-9-]+$/ and must already exist as a
 * directory at the repo root. Both checks are belt-and-braces against
 * a sloppy fetch path; the SPA only ever sends valid exercise slugs.
 *
 * The plugin is intentionally NOT active during `vite build` / preview
 * — there's no server to host the endpoint in a static deployment.
 * The SPA's disk-sync.ts handles the absence gracefully (fetch fails,
 * UI still persists to localStorage).
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Connect, Plugin } from 'vite';

const SLUG_RE = /^[0-9]{2}-[a-z0-9-]+$/;

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export interface SyncOptions {
  /**
   * Absolute path to the repo root that contains the `NN-name/main.tf`
   * files. Defaults to the parent of vite's `root` (usually `app/`),
   * which lines up with this repo's layout (`./app` is the SPA, repo
   * root is one level up).
   */
  repoRoot?: string;
}

export default function tutorialSyncPlugin(options: SyncOptions = {}): Plugin {
  let repoRoot: string;

  return {
    name: 'tutorial-sync',
    apply: 'serve',

    configResolved(cfg) {
      repoRoot = options.repoRoot ?? path.resolve(cfg.root, '..');
    },

    configureServer(server) {
      server.middlewares.use('/__sync', async (req, res, next) => {
        // req.url here is the path AFTER /__sync, e.g. "/01-hello-world"
        const slug = (req.url ?? '').replace(/^\//, '').split('?')[0];
        if (!slug || !SLUG_RE.test(slug)) {
          res.statusCode = 400;
          return res.end('invalid slug');
        }
        const dir = path.join(repoRoot, slug);
        const file = path.join(dir, 'main.tf');

        // Ensure the slug really is one of our tutorial directories and we
        // never escape the repo root via funny path components.
        if (!file.startsWith(repoRoot + path.sep)) {
          res.statusCode = 400;
          return res.end('path traversal');
        }
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
          res.statusCode = 404;
          return res.end('no such exercise directory');
        }

        try {
          if (req.method === 'POST' || req.method === 'PUT') {
            const body = await readBody(req);
            fs.writeFileSync(file, body, 'utf8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            return res.end('ok');
          }
          if (req.method === 'GET') {
            if (!fs.existsSync(file)) {
              res.statusCode = 404;
              return res.end('no such file');
            }
            const content = fs.readFileSync(file, 'utf8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            return res.end(content);
          }
          res.statusCode = 405;
          res.setHeader('Allow', 'GET, POST');
          return res.end('method not allowed');
        } catch (err) {
          // Log on the server side; respond with a generic 500.
          console.error('[tutorial-sync] error handling', req.method, req.url, err);
          res.statusCode = 500;
          return res.end('internal error');
        }

        next();
      });
    },
  };
}
