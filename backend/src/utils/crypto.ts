import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET || "staysmart_secret_encryption_key_32_bytes";

// Retrieve a consistent 32-byte key
const getSecretKey = (): Buffer => {
  return crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
};

/**
 * Encrypts a plaintext string using AES-256-CBC
 */
export const encrypt = (text: string): { iv: string; encryptedData: string } => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", getSecretKey(), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return {
    iv: iv.toString("hex"),
    encryptedData: encrypted,
  };
};

/**
 * Decrypts a cipher text string using AES-256-CBC
 */
export const decrypt = (encryptedData: string, ivHex: string): string => {
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", getSecretKey(), iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

/**
 * Masks a bank account number showing only the last 4 digits
 */
export const maskAccountNumber = (accountNumber: string): string => {
  const trimmed = accountNumber.trim();
  if (trimmed.length <= 4) {
    return "X".repeat(trimmed.length);
  }
  return "X".repeat(trimmed.length - 4) + trimmed.slice(-4);
};
