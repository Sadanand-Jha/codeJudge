export type LetterheadFormat = "pdf" | "png" | "jpg" | "jpeg";

export type HeaderAlign = "left" | "center" | "right";

export interface HeaderConfig {
  cropTop: number;
  cropHeight: number;
  widthPct: number;
  offsetXmm: number;
  offsetYmm: number;
  align: HeaderAlign;
  repeatOnAllPages: boolean;
}

export interface LetterheadCloudinaryAsset {
  publicId: string;
  version: number;
  originalFormat: LetterheadFormat;
  width: number;
  height: number;
  bytes: number;
  secureUrl: string;
  pngUrl: string;
}

export interface Letterhead {
  id: number;
  name: string;
  cloudinary: LetterheadCloudinaryAsset;
  headerConfig: HeaderConfig;
  isDefault: boolean;
  locked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HeaderRect {
  x: number;
  y: number;
  w: number;
  h: number;
  bottom: number;
}

export interface HeaderPlacement {
  dataUrl: string;
  rect: HeaderRect;
  repeatOnAllPages: boolean;
  gapMm?: number;
}

export interface CloudinaryUploadAsset {
  publicId: string;
  version: number;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  pages?: number;
  originalFilename?: string;
  signature?: string;
  previewUrl?: string;
}

export interface HeaderUploadSignature {
  timestamp: number;
  folder: string;
  allowed_formats: string;
  tags: string;
  overwrite: string;
  signature: string;
  apiKey: string;
  cloudName: string;
}
