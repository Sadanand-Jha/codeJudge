/**
 * Avatar Processor
 *
 * Slices the composite avatar image (avatars.png) into 21 individual
 * square avatar images (1.png through 21.png).
 *
 * Grid Layout: 7 Columns x 3 Rows (21 total avatars)
 *
 * Slicing Bounds (percentage-based):
 *   - Header Offset: Skip top 14% of image height (Y_start = height * 0.14)
 *   - Footer Offset: Ignore bottom 17% of image height (Y_end = height * 0.83)
 *   - Horizontal Margin: Skip left 2% and right 2% (X_start = width * 0.02, X_end = width * 0.98)
 *
 * Calculation Logic:
 *   - Grid Width  = width * 0.96
 *   - Grid Height = height * 0.69
 *   - Cell Width  = Grid Width / 7
 *   - Cell Height = Grid Height / 3
 *
 * Loop through row (0..2) and col (0..6):
 *   - X = (width * 0.02) + (col * Cell Width)
 *   - Y = (height * 0.14) + (row * Cell Height)
 *   - Crop box: (X, Y, Cell Width, Cell Height)
 *   - Save slice as avatar_{index}.png (index 1 to 21)
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const BACKEND_ROOT = path.resolve(__dirname, "../..");
const SOURCE_IMAGE = path.join(BACKEND_ROOT, "avatars.png");
const OUTPUT_DIR = path.join(BACKEND_ROOT, "public", "avatars");

// Grid configuration
const COLS = 7;
const ROWS = 3;
const TOTAL_AVATARS = COLS * ROWS; // 21

// Slicing bounds (percentages)
const HEADER_OFFSET = 0.14; // Skip top 14%
const FOOTER_OFFSET = 0.83; // Ignore bottom 17% (Y_end = 0.83)
const HORIZONTAL_MARGIN = 0.02; // Skip left/right 2%

/**
 * Ensure the output directory exists.
 */
function ensureOutputDir(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Check if all 21 avatar slices already exist.
 */
export function avatarsExist(): boolean {
  if (!fs.existsSync(OUTPUT_DIR)) return false;
  for (let i = 1; i <= TOTAL_AVATARS; i++) {
    const file = path.join(OUTPUT_DIR, `${i}.png`);
    if (!fs.existsSync(file)) return false;
  }
  return true;
}

/**
 * Slice the composite avatar image into individual avatar files.
 */
export async function sliceAvatars(): Promise<string[]> {
  ensureOutputDir();

  const metadata = await sharp(SOURCE_IMAGE).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width === 0 || height === 0) {
    throw new Error("Failed to read avatar source image dimensions.");
  }

  // Calculate grid dimensions
  const gridWidth = width * 0.96;
  const gridHeight = height * 0.69;
  const cellWidth = gridWidth / COLS;
  const cellHeight = gridHeight / ROWS;

  const xStart = width * HORIZONTAL_MARGIN;
  const yStart = height * HEADER_OFFSET;

  const generatedFiles: string[] = [];

  let index = 1;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = Math.round(xStart + col * cellWidth);
      const y = Math.round(yStart + row * cellHeight);
      const w = Math.round(cellWidth);
      const h = Math.round(cellHeight);

      const outputFile = path.join(OUTPUT_DIR, `${index}.png`);

      await sharp(SOURCE_IMAGE)
        .extract({ left: x, top: y, width: w, height: h })
        .png()
        .toFile(outputFile);

      generatedFiles.push(outputFile);
      index++;
    }
  }

  return generatedFiles;
}

/**
 * Run the avatar slicing process.
 * If avatars already exist, they are not regenerated.
 */
export async function prepareAvatars(): Promise<{ generated: boolean; count: number }> {
  if (avatarsExist()) {
    return { generated: false, count: TOTAL_AVATARS };
  }

  const files = await sliceAvatars();
  return { generated: true, count: files.length };
}

// Allow running directly: `tsx src/utils/avatarProcessor.ts`
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  prepareAvatars()
    .then((result) => {
      console.log(
        result.generated
          ? `✅ Generated ${result.count} avatar slices in ${OUTPUT_DIR}`
          : `✅ Avatars already exist (${result.count} files) in ${OUTPUT_DIR}`
      );
    })
    .catch((err) => {
      console.error("❌ Failed to slice avatars:", err);
      process.exit(1);
    });
}