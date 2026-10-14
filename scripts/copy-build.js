const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const frontendNext = path.join(rootDir, 'frontend', '.next');
const rootNext = path.join(rootDir, '.next');
const frontendPublic = path.join(rootDir, 'frontend', 'public');
const rootPublic = path.join(rootDir, 'public');

console.log('[*] Running postbuild artifact sync for Hostinger...');

function copyDirSafe(src, dest) {
  if (fs.existsSync(src)) {
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true, force: true });
    console.log(`[+] Copied: ${src} -> ${dest}`);
  }
}

try {
  // 1. Copy full .next directory to root .next
  copyDirSafe(frontendNext, rootNext);

  // 2. Copy public directory to root public
  copyDirSafe(frontendPublic, rootPublic);

  // 3. Handle Next.js Standalone build structure
  const frontendStandalone = path.join(frontendNext, 'standalone');
  const rootStandalone = path.join(rootNext, 'standalone');

  if (fs.existsSync(frontendStandalone)) {
    console.log('[+] Found standalone build at:', frontendStandalone);
    copyDirSafe(frontendStandalone, rootStandalone);

    // Copy static assets into standalone directory
    const frontendStatic = path.join(frontendNext, 'static');
    copyDirSafe(frontendStatic, path.join(rootStandalone, 'frontend', '.next', 'static'));
    copyDirSafe(frontendStatic, path.join(rootStandalone, '.next', 'static'));

    // Copy public into standalone directory
    copyDirSafe(frontendPublic, path.join(rootStandalone, 'frontend', 'public'));
    copyDirSafe(frontendPublic, path.join(rootStandalone, 'public'));

    // Create / update .next/standalone/server.js
    const standaloneServer = path.join(rootStandalone, 'server.js');
    const nestedServer = path.join(rootStandalone, 'frontend', 'server.js');

    // Backup existing Next.js standalone runner if present
    if (fs.existsSync(standaloneServer) && !fs.existsSync(path.join(rootStandalone, 'server.next.js'))) {
      fs.copyFileSync(standaloneServer, path.join(rootStandalone, 'server.next.js'));
    } else if (fs.existsSync(nestedServer) && !fs.existsSync(path.join(rootStandalone, 'server.next.js'))) {
      fs.copyFileSync(nestedServer, path.join(rootStandalone, 'server.next.js'));
    }

    // Write Hostinger unified entrypoint at .next/standalone/server.js
    // This guarantees that if Hostinger boots node .next/standalone/server.js,
    // it executes the exact same unified Express + Next.js server on 0.0.0.0
    const unifiedStandaloneRunner = `// Hostinger Unified Web Entrypoint (LawyerComparison)
process.env.HOSTNAME = '0.0.0.0';
const path = require('path');
const fs = require('fs');

const rootServer = path.resolve(__dirname, '..', '..', 'server.js');
if (fs.existsSync(rootServer)) {
  console.log('[*] Standalone loader: Booting unified root server from', rootServer);
  require(rootServer);
} else {
  console.log('[*] Standalone loader: Root server not found, booting Next.js standalone runner...');
  const nextRunner = path.join(__dirname, 'server.next.js');
  const nestedRunner = path.join(__dirname, 'frontend', 'server.js');
  if (fs.existsSync(nextRunner)) {
    require(nextRunner);
  } else if (fs.existsSync(nestedRunner)) {
    require(nestedRunner);
  } else {
    console.error('[-] No valid runner found in standalone directory');
  }
}
`;
    fs.writeFileSync(standaloneServer, unifiedStandaloneRunner, 'utf8');
    console.log('[+] Written unified entrypoint to:', standaloneServer);
  } else {
    console.log('[*] Standalone folder not yet created in frontend/.next; creating placeholder standalone server for Hostinger check');
    fs.mkdirSync(rootStandalone, { recursive: true });
    const standaloneServer = path.join(rootStandalone, 'server.js');
    const unifiedStandaloneRunner = `// Hostinger Unified Web Entrypoint (LawyerComparison)
process.env.HOSTNAME = '0.0.0.0';
const path = require('path');
const fs = require('fs');
const rootServer = path.resolve(__dirname, '..', '..', 'server.js');
if (fs.existsSync(rootServer)) {
  require(rootServer);
}
`;
    fs.writeFileSync(standaloneServer, unifiedStandaloneRunner, 'utf8');
    console.log('[+] Created standalone server hook at:', standaloneServer);
  }

  console.log('[✓] Postbuild artifact sync completed successfully.');
} catch (err) {
  console.error('[-] Postbuild error:', err);
}
