/**
 * Secure Media Service
 * Handles fetching and decrypting AES-256-GCM encrypted images from the backend
 */

import React from 'react';

const AES_ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a CryptoKey from the secret using SHA-256 (matching backend)
 */
async function deriveKey(secretKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Use a fixed salt for consistency (backend uses SHA-256 of secret)
  const salt = encoder.encode('secure-media-salt');

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 1,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: AES_ALGORITHM, length: 256 },
    false,
    ['decrypt']
  );
}

/**
 * Decrypts base64 encrypted data using AES-256-GCM
 * Backend format: IV (12 bytes) + Auth Tag (16 bytes) + Encrypted Data
 */
export async function decryptSecureMedia(
  base64Data: string,
  secretKey: string
): Promise<ArrayBuffer> {
  try {
    const encryptedBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted data: too short');
    }

    const iv = encryptedBuffer.slice(0, IV_LENGTH);
    const authTag = encryptedBuffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedData = encryptedBuffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    // Combine encrypted data with auth tag for WebCrypto
    const combined = new Uint8Array(encryptedData.length + authTag.length);
    combined.set(encryptedData);
    combined.set(authTag, encryptedData.length);

    const key = await deriveKey(secretKey);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: AES_ALGORITHM,
        iv: iv as BufferSource,
      },
      key,
      combined
    );

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt secure media');
  }
}

export interface SecureMediaOptions {
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
}

/**
 * Fetches, decrypts, and renders a secure image onto a canvas
 */
export async function renderSecureImage(
  imageName: string,
  canvas: HTMLCanvasElement,
  options: SecureMediaOptions = {}
): Promise<void> {
  const {
    width = canvas.width,
    height = canvas.height,
    alt = 'Secure Image',
    className = '',
  } = options;

  const secretKey = process.env.NEXT_PUBLIC_AES_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('AES secret key not configured. Set NEXT_PUBLIC_AES_SECRET_KEY in environment.');
  }

  try {
    const response = await fetch(`/api/v1/secure-media/${encodeURIComponent(imageName)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}: Failed to fetch secure media`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error('Invalid response format from server');
    }

    const decryptedBuffer = await decryptSecureMedia(result.data, secretKey);
    const blob = new Blob([decryptedBuffer], { type: 'image/png' });
    const objectUrl = URL.createObjectURL(blob);

    const img = new Image();
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = width || img.width;
        canvas.height = height || img.height;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Clean up
        URL.revokeObjectURL(objectUrl);
        
        resolve();
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load decrypted image'));
      };
      
      img.src = objectUrl;
    });
  } catch (error) {
    console.error('Error rendering secure image:', error);
    throw error;
  }
}

/**
 * React hook for secure image rendering
 */
export function useSecureImage() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadImage = async (imageName: string, options?: SecureMediaOptions) => {
    if (!canvasRef.current) {
      throw new Error('Canvas element not found');
    }

    setIsLoading(true);
    setError(null);

    try {
      await renderSecureImage(imageName, canvasRef.current, options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    canvasRef,
    isLoading,
    error,
    loadImage,
  };
}