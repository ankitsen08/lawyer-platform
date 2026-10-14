const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const frontendNext = path.join(frontendDir, '.next');
const rootNext = path.join(rootDir, '.next');
const frontendPublic = path.join(frontendDir, 'public');
const rootPublic = path.join(rootDir, 'public');

console.log('[*] Running ultra-fast artifact sync for Hostinger...');
const startTime = Date.now();

try {
  // 1. Create root .next directory
  fs.mkdirSync(rootNext, { recursive: true });

  // 2. Copy build manifests
  const manifestFiles = [
    'BUILD_ID',
    'build-manifest.json',
    'app-path-routes-manifest.json',
    'routes-manifest.json',
    'prerender-manifest.json',
    'required-server-files.json',
    'required-server-files.js',
    'images-manifest.json',
    'export-marker.json',
    'package.json'
  ];

  for (const file of manifestFiles) {
    const src = path.join(frontendNext, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(rootNext, file));
    }
  }

  // 3. Copy server and static directories safely
  const copyDirFast = (src, dest) => {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true, force: true });
  };

  copyDirFast(path.join(frontendNext, 'server'), path.join(rootNext, 'server'));
  copyDirFast(path.join(frontendNext, 'static'), path.join(rootNext, 'static'));
  copyDirFast(frontendPublic, rootPublic);

  // 4. Also copy static & public into frontend/.next/standalone so standalone server can serve assets
  const standaloneFrontend = path.join(frontendNext, 'standalone', 'frontend');
  if (fs.existsSync(standaloneFrontend)) {
    copyDirFast(path.join(frontendNext, 'static'), path.join(standaloneFrontend, '.next', 'static'));
    copyDirFast(frontendPublic, path.join(standaloneFrontend, 'public'));
  }

  // 5. Hostinger standalone server hook at .next/standalone/server.js
  const rootStandalone = path.join(rootNext, 'standalone');
  fs.mkdirSync(rootStandalone, { recursive: true });
  const standaloneServerPath = path.join(rootStandalone, 'server.js');

  const standaloneRunnerCode = `// Hostinger Unified Standalone Entrypoint
process.env.HOSTNAME = '0.0.0.0';
const path = require('path');
const fs = require('fs');

// Try unified root server first (which handles Express + Next.js together)
const rootServer = path.resolve(__dirname, '..', '..', 'server.js');
if (fs.existsSync(rootServer)) {
  console.log('[🚀] Standalone entrypoint: Booting unified root server from', rootServer);
  require(rootServer);
} else {
  // Fallback to standalone Next.js server
  const candidates = [
    path.resolve(__dirname, '..', '..', 'frontend', '.next', 'standalone', 'frontend', 'server.js'),
    path.resolve(__dirname, 'frontend', 'server.js')
  ];
  const target = candidates.find(p => fs.existsSync(p));
  if (target) {
    console.log('[🚀] Standalone entrypoint: Booting Next.js standalone runner from', target);
    require(target);
  } else {
    console.error('[-] Fatal: No server.js found in standalone directory');
    process.exit(1);
  }
}
`;

  fs.writeFileSync(standaloneServerPath, standaloneRunnerCode, 'utf8');
  console.log('[+] Created root standalone server hook at:', standaloneServerPath);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[✓] Ultra-fast artifact sync completed successfully in ${duration}s!`);
} catch (err) {
  console.error('[-] Postbuild sync error:', err);
  process.exit(1);
}
