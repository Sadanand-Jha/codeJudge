// Secure media encryption/decryption service. Encrypts image data using AES-256-GCM
// for at-rest protection and provides decrypt functionality for serving.
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

export class SecureMediaService {
  private key: Buffer;

  constructor() {
    const secretKey = process.env.AES_SECRET_KEY;
    if (!secretKey) {
      throw new Error('AES_SECRET_KEY environment variable is not set');
    }

    // Derive a 32-byte key from the secret using SHA-256
    this.key = crypto.createHash('sha256').update(secretKey).digest();
  }

  /**
   * Encrypts image data using AES-256-GCM
   * @param imageData - The image buffer to encrypt
   * @returns Encrypted data with IV and auth tag prepended
   */
  encrypt(imageData: Buffer): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(imageData),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Return: IV (12 bytes) + Auth Tag (16 bytes) + Encrypted Data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypts AES-256-GCM encrypted data
   * @param encryptedData - Buffer containing IV + auth tag + encrypted data
   * @returns Decrypted image buffer
   */
  decrypt(encryptedData: Buffer): Buffer {
    if (encryptedData.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted data: too short');
    }

    const iv = encryptedData.subarray(0, IV_LENGTH);
    const authTag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Reads and encrypts an image file
   * @param filePath - Path to the image file
   * @returns Base64 encoded encrypted data
   */
  async encryptImageFile(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(filePath);
      
      // Security: Ensure the path is within the secure directory
      const secureDir = path.resolve(process.env.SECURE_MEDIA_DIR || './secure-media');
      if (!absolutePath.startsWith(secureDir)) {
        throw new Error('Access denied: File is outside secure directory');
      }

      const imageData = await fs.readFile(absolutePath);
      const encryptedData = this.encrypt(imageData);
      
      return encryptedData.toString('base64');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('Image file not found');
      }
      throw error;
    }
  }

  /**
   * Decrypts base64 encoded encrypted data
   * @param base64Data - Base64 encoded encrypted data
   * @returns Decrypted image buffer
   */
  decryptBase64(base64Data: string): Buffer {
    try {
      const encryptedData = Buffer.from(base64Data, 'base64');
      return this.decrypt(encryptedData);
    } catch (error) {
      throw new Error('Decryption failed: Invalid encrypted data');
    }
  }
}