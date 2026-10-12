// Express server — serves the static Reservista site and the /api/send-form
// endpoint. Runs on any Node.js host (EC2, Lightsail, App Runner, Elastic
// Beanstalk, ECS). Requires Node >= 20.
//
// Usage:
//   npm install
//   node server.js          # listens on PORT (default 3000)

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import sendFormHandler from './api/send-form.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// Form endpoint — wraps the existing Vercel-style handler.
app.post('/api/send-form', (req, res) => sendFormHandler(req, res));

// Permanent redirects from old slugs — must run BEFORE express.static, otherwise
// any stale /pms.html or /pos.html on disk would shadow the redirect.
app.get(['/pms', '/pms.html'], (req, res) =>
  res.redirect(308, '/hotel-management-software-assam')
);
app.get(['/pos', '/pos.html'], (req, res) =>
  res.redirect(308, '/hotel-pos-software-assam')
);

// Static files. `extensions: ['html']` lets /about resolve to /about.html.
app.use(express.static(__dirname, {
  extensions: ['html'],
  setHeaders(res, filepath) {
    if (/\.(png|jpe?g|webp|svg|ico|woff2?)$/i.test(filepath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\.(css|js)$/i.test(filepath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (/\.html?$/i.test(filepath)) {
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    }
  },
}));

app.use((req, res) => {
  res.status(404).type('html').send(
    '<!doctype html><meta charset="utf-8"><title>Not found</title>' +
    '<body style="font:16px/1.5 system-ui;padding:48px;color:#0F172A">' +
    '<h1 style="margin:0 0 8px">404 — Page not found</h1>' +
    '<p><a href="/" style="color:#2563EB">Back to home</a></p></body>'
  );
});

// Error handler — keeps bot/probe noise (malformed JSON bodies, bad Range
// headers) from spewing stack traces. Must be the LAST middleware.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  // Malformed/invalid request body from express.json()/urlencoded()
  if (err.type === 'entity.parse.failed' || err.status === 400) {
    return res.status(400).type('text').send('Bad Request');
  }
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).type('text').send('Payload Too Large');
  }
  // Invalid Range header on a static asset (send module)
  if (err.status === 416 || err.name === 'RangeNotSatisfiableError') {
    return res.status(416).end();
  }
  console.error('[reservista] unhandled error:', err && err.message);
  res.status(500).type('text').send('Internal Server Error');
});

// Process-level safety nets so a stray rejection can't take the box down.
process.on('unhandledRejection', (reason) => {
  console.error('[reservista] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[reservista] uncaughtException:', err && err.message);
  process.exit(1); // let PM2 restart from a clean state
});

app.listen(PORT, () => {
  console.log(`[reservista] listening on :${PORT}`);
});
