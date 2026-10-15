const path = require('path');
const http = require('http');
const fs = require('fs');

// 1. Immediately normalize HOST and PORT for Hostinger / cloud containers
const SYSTEM_PORT = process.env.PORT;
const PORT = parseInt(SYSTEM_PORT || process.env.APP_PORT || '3000', 10);
const HOST = '0.0.0.0';

// Ensure child processes and libraries bind to 0.0.0.0
process.env.PORT = String(PORT);
process.env.HOSTNAME = HOST;
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

console.log(`[*] Initializing LawyerComparison unified server on ${HOST}:${PORT} (NODE_ENV=${process.env.NODE_ENV})...`);

// 2. Load Express backend app & HTTP server
const { app, server } = require('./backend/server');

// 3. Ultra-fast Health Check Route (responds immediately with 200 OK for Hostinger probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    port: PORT,
    host: HOST,
    nextReady
  });
});

// 4. LISTEN IMMEDIATELY ON 0.0.0.0
// This ensures Hostinger's edge reverse proxy connects instantly without ECONNREFUSED (503)
server.listen(PORT, HOST, () => {
  console.log(`[🚀] LawyerComparison unified server active and listening on http://${HOST}:${PORT}`);
});

// 5. Next.js Integration (Prepare asynchronously without blocking port listening)
let nextApp = null;
let nextHandle = null;
let nextReady = false;
let nextError = null;

async function initNext() {
  try {
    let next;
    try {
      next = require('next');
    } catch (e1) {
      try {
        next = require(path.resolve(__dirname, 'frontend/node_modules/next'));
      } catch (e2) {
        next = require(path.resolve(__dirname, 'node_modules/next'));
      }
    }

    // Determine correct Next.js app directory
    const candidateDirs = [
      path.resolve(__dirname, 'frontend'),
      path.resolve(__dirname)
    ];

    let nextDir = candidateDirs.find(d => fs.existsSync(path.join(d, '.next', 'BUILD_ID')))
      || candidateDirs.find(d => fs.existsSync(path.join(d, '.next')))
      || path.resolve(__dirname, 'frontend');

    const hasBuildId = fs.existsSync(path.join(nextDir, '.next', 'BUILD_ID'));
    // If running in production but BUILD_ID is missing, fallback to dev to avoid fatal throw
    const dev = process.env.NODE_ENV === 'development' || !hasBuildId;

    console.log(`[*] Booting Next.js engine from: ${nextDir} (dev=${dev}, hasBuildId=${hasBuildId})`);
    nextApp = next({ dev, dir: nextDir, hostname: HOST, port: PORT });
    nextHandle = nextApp.getRequestHandler();

    await nextApp.prepare();
    nextReady = true;
    console.log('[+] Next.js engine successfully initialized and serving traffic');
  } catch (err) {
    console.error('[-] Next.js initialization error:', err.stack || err.message);
    nextError = err;
  }
}

// Start Next.js initialization in background
initNext();

// 5.5 Direct Static Asset Handling (Ultra-fast bypass, correct MIME types, no SSR overhead)
const candidateStaticDirs = [
  path.resolve(__dirname, '.next', 'static'),
  path.resolve(__dirname, 'frontend', '.next', 'static'),
];

for (const staticDir of candidateStaticDirs) {
  if (fs.existsSync(staticDir)) {
    console.log(`[+] Direct static mapping: /_next/static -> ${staticDir}`);
    app.use('/_next/static', express.static(staticDir, {
      maxAge: '365d',
      immutable: true,
      fallthrough: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=UTF-8');
        } else if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
        }
      }
    }));
    break;
  }
}

// Direct Public Assets Mapping (/logo.jpg, /icon.jpg, etc.)
const candidatePublicDirs = [
  path.resolve(__dirname, 'public'),
  path.resolve(__dirname, 'frontend', 'public'),
];

for (const pubDir of candidatePublicDirs) {
  if (fs.existsSync(pubDir)) {
    console.log(`[+] Direct public mapping: / -> ${pubDir}`);
    app.use(express.static(pubDir, { maxAge: '7d', fallthrough: true }));
    break;
  }
}

// 6. Handle all frontend web traffic (Express 5 compatible fallback)
app.use((req, res) => {
  // If Next.js is ready, pass through directly
  if (nextReady && nextHandle) {
    return nextHandle(req, res);
  }

  // CRITICAL: Never return HTML fallback for static asset requests!
  // If browser receives HTML for a CSS or JS request, it refuses to apply it and poisons cache.
  if (req.path.startsWith('/_next/') || /\.(css|js|map|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(req.path)) {
    if (req.path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
      return res.status(503).send('/* Stylesheet initializing */');
    }
    if (req.path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      return res.status(503).send('/* Script initializing */');
    }
    return res.status(404).end();
  }

  // If Next.js encountered an initialization error, show readable diagnostic with auto-retry
  if (nextError) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>LawyerComparison Platform</title>
  <meta http-equiv="refresh" content="3">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0b1329; color: #f8fafc; text-align: center; padding: 20px; box-sizing: border-box; }
    .card { background: #16203a; padding: 2.5rem; border-radius: 1rem; border: 1px solid #1e293b; max-width: 600px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
    h1 { color: #38bdf8; margin: 15px 0 10px 0; font-size: 1.5rem; }
    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
    .spinner { border: 3px solid rgba(56, 189, 248, 0.2); border-top-color: #38bdf8; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>LawyerComparison Starting</h1>
    <p>Application engine is preparing. This page refreshes automatically in 3 seconds...</p>
    <p style="font-size:0.8rem;color:#64748b;margin-top:1.5rem;">${nextError.message || 'Preparing routes'}</p>
  </div>
</body>
</html>`);
  }

  // Next.js is preparing: show sleek loading screen with 2-second auto-refresh (200 OK avoids 503)
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>LawyerComparison Platform</title>
  <meta http-equiv="refresh" content="2">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0b1329; color: #f8fafc; text-align: center; padding: 20px; box-sizing: border-box; }
    .card { background: #16203a; padding: 2.5rem; border-radius: 1rem; border: 1px solid #1e293b; max-width: 500px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
    h1 { color: #38bdf8; margin: 15px 0 10px 0; font-size: 1.5rem; }
    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
    .spinner { border: 3px solid rgba(56, 189, 248, 0.2); border-top-color: #38bdf8; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>LawyerComparison Platform</h1>
    <p>Loading legal network resources... Initializing application.</p>
  </div>
</body>
</html>`);
});
