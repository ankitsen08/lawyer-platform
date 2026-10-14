const path = require('path');
const http = require('http');

async function bootstrap() {
  const { app, server } = require('./backend/server');

  // Health check endpoint to immediately verify Node server is active
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

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
    const fs = require('fs');
    const dev = process.env.NODE_ENV !== 'production';
    
    // Check whether .next is in frontend or root
    let nextDir = path.resolve(__dirname, 'frontend');
    if (!fs.existsSync(path.join(nextDir, '.next')) && fs.existsSync(path.resolve(__dirname, '.next'))) {
      nextDir = path.resolve(__dirname);
    }

    const nextApp = next({ dev, dir: nextDir });
    const handle = nextApp.getRequestHandler();

    console.log('[*] Preparing Next.js frontend engine at:', nextDir);
    await nextApp.prepare();
    console.log('[+] Next.js engine ready');

    // Forward all non-API web traffic to Next.js
    app.all('*', (req, res) => {
      return handle(req, res);
    });
  } catch (err) {
    console.error('[-] Next.js initialization error:', err.stack || err.message);
    app.all('*', (req, res) => {
      res.status(500).send(`<!DOCTYPE html><html><head><title>LawyerComparison Platform</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>LawyerComparison Server Running</h2><p>Frontend Initialization Issue:</p><pre style="background:#f4f4f4;padding:15px;display:inline-block;text-align:left;max-width:800px;overflow:auto;">${err.stack || err.message}</pre></body></html>`);
    });
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`[🚀] LawyerComparison unified server running on port ${PORT}`);
  });
}

bootstrap();
