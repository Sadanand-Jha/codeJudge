import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Request } from "express";

const SAFE_EXTENSION = /^\.[a-z0-9]{1,16}$/i;

export const randomUploadName = (originalName: string): string => {
  const extension = path.extname(originalName).toLowerCase();
  return `${randomUUID()}${SAFE_EXTENSION.test(extension) ? extension : ""}`;
};

export const randomizeUploadFilename = (
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile?: boolean) => void
): void => {
  file.originalname = randomUploadName(file.originalname);
  callback(null, true);
};
