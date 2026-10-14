const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const frontendNext = path.join(rootDir, 'frontend', '.next');
const rootNext = path.join(rootDir, '.next');
const frontendPublic = path.join(rootDir, 'frontend', 'public');
const rootPublic = path.join(rootDir, 'public');
const backendDir = path.join(rootDir, 'backend');

console.log('[*] Running postbuild artifact sync for Hostinger Next.js...');

function copyDirSafe(src, dest) {
  if (fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true, force: true });
    console.log(`[+] Copied: ${src} -> ${dest}`);
  }
}

try {
  // 1. Copy regular .next to root .next
  copyDirSafe(frontendNext, rootNext);

  // 2. Copy public directory to root public
  copyDirSafe(frontendPublic, rootPublic);

  // 3. Handle Next.js Standalone build
  const frontendStandalone = path.join(frontendNext, 'standalone');
  const rootStandalone = path.join(rootNext, 'standalone');

  if (fs.existsSync(frontendStandalone)) {
    console.log('[+] Found standalone build at:', frontendStandalone);
    copyDirSafe(frontendStandalone, rootStandalone);

    // Also copy backend to standalone directory so API can run
    copyDirSafe(backendDir, path.join(rootStandalone, 'backend'));

    // Check where server.js was created in standalone
    let standaloneServer = path.join(rootStandalone, 'server.js');
    const nestedServer = path.join(rootStandalone, 'frontend', 'server.js');

    if (!fs.existsSync(standaloneServer) && fs.existsSync(nestedServer)) {
      console.log('[+] Promoting nested standalone/frontend/server.js to standalone/server.js');
      fs.copyFileSync(nestedServer, standaloneServer);
    }

    // Copy static assets into standalone so Next.js standalone server can serve CSS/JS
    const frontendStatic = path.join(frontendNext, 'static');
    copyDirSafe(frontendStatic, path.join(rootStandalone, 'frontend', '.next', 'static'));
    copyDirSafe(frontendStatic, path.join(rootStandalone, '.next', 'static'));

    // Copy public into standalone
    copyDirSafe(frontendPublic, path.join(rootStandalone, 'frontend', 'public'));
    copyDirSafe(frontendPublic, path.join(rootStandalone, 'public'));

    // Inject Express backend autostarter at top of standalone server.js
    if (fs.existsSync(standaloneServer)) {
      console.log('[+] Injecting Express backend auto-launcher into standalone/server.js...');
      const originalCode = fs.readFileSync(standaloneServer, 'utf8');
      
      const backendLauncher = `
// --- Hostinger Backend Auto-Launcher (LawyerComparison) ---
try {
  const { spawn } = require('child_process');
  const path = require('path');
  const fs = require('fs');

  const possibleBackendPaths = [
    path.join(__dirname, 'backend', 'server.js'),
    path.join(__dirname, '..', '..', 'backend', 'server.js'),
    path.resolve('backend/server.js')
  ];

  const backendEntry = possibleBackendPaths.find(p => fs.existsSync(p));
  if (backendEntry) {
    console.log('[+] Standalone starter: Booting Express backend from ' + backendEntry);
    const backendProcess = spawn(process.execPath, [backendEntry], {
      stdio: 'inherit',
      env: { ...process.env, PORT: '3001', BACKEND_PORT: '3001' }
    });
    backendProcess.on('error', (err) => console.error('[-] Backend launch error:', err));
  } else {
    console.warn('[-] Could not locate backend/server.js for auto-boot');
  }
} catch (e) {
  console.error('[-] Standalone backend launch exception:', e);
}
// ----------------------------------------------------------
`;
      if (!originalCode.includes('Hostinger Backend Auto-Launcher')) {
        fs.writeFileSync(standaloneServer, backendLauncher + '\n' + originalCode, 'utf8');
        console.log('[+] Successfully injected backend auto-launcher into standalone/server.js');
      }
    }
  } else {
    console.warn('[!] Standalone build folder not found at', frontendStandalone);
  }

  console.log('[✓] Postbuild artifact sync completed successfully.');
} catch (err) {
  console.error('[-] Postbuild error:', err);
}
