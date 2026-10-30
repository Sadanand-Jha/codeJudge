import { v2 as cloudinary } from "cloudinary";

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

let configuredCredentials: CloudinaryCredentials | null = null;

/**
 * Read the Cloudinary credentials once and configure the SDK lazily. Keeping
 * this explicit avoids booting the SDK with empty credentials in local tests.
 */
export function getCloudinaryCredentials(): CloudinaryCredentials {
  if (configuredCredentials) return configuredCredentials;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configuredCredentials = { cloudName, apiKey, apiSecret };
  return configuredCredentials;
}

export { cloudinary };
