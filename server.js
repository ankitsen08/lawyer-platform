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
    const dev = process.env.NODE_ENV !== 'production';
    const nextApp = next({ dev, dir: path.resolve(__dirname, 'frontend') });
    const handle = nextApp.getRequestHandler();

    console.log('[*] Preparing Next.js frontend engine...');
    await nextApp.prepare();
    console.log('[+] Next.js engine ready');

    // Forward all non-API web traffic to Next.js
    app.all('*', (req, res) => {
      return handle(req, res);
    });
  } catch (err) {
    console.error('[-] Next.js initialization warning:', err.message);
    app.get('/', (req, res) => {
      res.status(200).send('<!DOCTYPE html><html><head><title>LawyerComparison Platform</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>LawyerComparison Server Running</h2><p>Initializing frontend application...</p></body></html>');
    });
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`[🚀] LawyerComparison unified server running on port ${PORT}`);
  });
}

bootstrap();
