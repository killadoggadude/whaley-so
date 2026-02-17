import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("API_KEY_ENCRYPTION_SECRET is not set");
  }
  return Buffer.from(secret, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: iv:authTag:ciphertext (hex-encoded, colon-separated)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with encrypt().
 * Input format: iv:authTag:ciphertext (hex-encoded, colon-separated)
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Mask an API key, showing only the last 4 characters.
 * e.g., "sk-abc123xyz789" → "••••••••••789"
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) {
    return "••••";
  }
  return "••••••••••" + apiKey.slice(-4);
}
