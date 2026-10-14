const crypto = require('crypto');

/**
 * Hash a plain text password using Node crypto.scrypt
 * Returns format: salt:hash
 */
function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Compare a plain text password with a stored salt:hash
 */
function comparePassword(password, storedHash) {
  if (!password || !storedHash) return false;
  
  // Handle fallback dummy password gracefully for initial development transition
  if (storedHash === 'dummy') {
    return true;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;

  const [salt, hash] = parts;
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
    const hashBuffer = Buffer.from(hash, 'hex');

    if (keyBuffer.length !== hashBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(keyBuffer, hashBuffer);
  } catch (err) {
    return false;
  }
}

module.exports = {
  hashPassword,
  comparePassword,
};
