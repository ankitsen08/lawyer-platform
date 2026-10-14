const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const frontendNext = path.join(rootDir, 'frontend', '.next');
const rootNext = path.join(rootDir, '.next');
const frontendPublic = path.join(rootDir, 'frontend', 'public');
const rootPublic = path.join(rootDir, 'public');

console.log('[*] Copying build artifacts for Hostinger compatibility...');

try {
  if (fs.existsSync(frontendNext)) {
    console.log(`[+] Copying ${frontendNext} -> ${rootNext}`);
    fs.cpSync(frontendNext, rootNext, { recursive: true, force: true });
    console.log('[+] Root .next directory ready.');
  } else {
    console.warn('[!] frontend/.next does not exist yet.');
  }

  if (fs.existsSync(frontendPublic)) {
    console.log(`[+] Copying ${frontendPublic} -> ${rootPublic}`);
    fs.cpSync(frontendPublic, rootPublic, { recursive: true, force: true });
    console.log('[+] Root public directory ready.');
  }
} catch (err) {
  console.error('[-] Error copying build artifacts:', err.message);
}
