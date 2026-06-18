const crypto = require('crypto');

const ALGORITHM  = 'aes-256-gcm';
const KEY_BUFFER = Buffer.from(process.env.ENCRYPTION_KEY || '0'.repeat(64), 'hex');

/**
 * Encrypt plaintext with AES-256-GCM
 * @param {string} plaintext
 * @returns {{ ciphertext: string, iv: string, authTag: string }}
 */
const encrypt = (plaintext) => {
  const iv     = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);
  const enc1   = cipher.update(plaintext, 'utf8', 'base64');
  const enc2   = cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: enc1 + enc2,
    iv:      iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
};

/**
 * Decrypt ciphertext with AES-256-GCM
 * @param {string} ciphertext - base64
 * @param {string} iv         - base64
 * @param {string} authTag    - base64
 * @returns {string} plaintext
 */
const decrypt = (ciphertext, iv, authTag) => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY_BUFFER,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const dec1 = decipher.update(ciphertext, 'base64', 'utf8');
  const dec2 = decipher.final('utf8');
  return dec1 + dec2;
};

module.exports = { encrypt, decrypt };
