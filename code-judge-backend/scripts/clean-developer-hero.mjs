import sharp from "sharp";
import { fileURLToPath } from "node:url";

const input = fileURLToPath(new URL("../public/me/developer-ai-hero-v1.png", import.meta.url));
const pngOutput = fileURLToPath(new URL("../public/me/developer-ai-hero-v3.png", import.meta.url));
const webpOutput = fileURLToPath(new URL("../public/me/developer-ai-hero-v3.webp", import.meta.url));

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const pixelCount = width * height;
const distance = new Uint8Array(pixelCount);
distance.fill(255);

for (let index = 0; index < pixelCount; index += 1) {
  if (data[index * channels + 3] <= 8) distance[index] = 0;
}

const relax = (x, y, nx, ny, cost) => {
  if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
  const index = y * width + x;
  const neighbour = ny * width + nx;
  distance[index] = Math.min(distance[index], distance[neighbour] + cost);
};

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    relax(x, y, x - 1, y, 1);
    relax(x, y, x, y - 1, 1);
    relax(x, y, x - 1, y - 1, 1);
    relax(x, y, x + 1, y - 1, 1);
  }
}

for (let y = height - 1; y >= 0; y -= 1) {
  for (let x = width - 1; x >= 0; x -= 1) {
    relax(x, y, x + 1, y, 1);
    relax(x, y, x, y + 1, 1);
    relax(x, y, x + 1, y + 1, 1);
    relax(x, y, x - 1, y + 1, 1);
  }
}

let removedPixels = 0;
for (let index = 0; index < pixelCount; index += 1) {
  const offset = index * channels;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const alpha = data[offset + 3];
  const edgeDistance = distance[index];
  const matteDistance = Math.hypot(r - 186, g - 185, b - 186);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const brightness = max / 255;

  let nextAlpha = alpha;
  if (alpha <= 24) {
    nextAlpha = 0;
  } else if (edgeDistance <= 12 && matteDistance < 20) {
    nextAlpha = 0;
  } else if (edgeDistance <= 8 && matteDistance < 45) {
    nextAlpha = Math.round(alpha * Math.max(0, (edgeDistance - 2) / 8));
  } else if (edgeDistance <= 5 && saturation < 0.1 && brightness > 0.35 && brightness < 0.9) {
    nextAlpha = Math.round(alpha * Math.max(0, (edgeDistance - 1) / 5));
  }

  if (nextAlpha < alpha) removedPixels += 1;
  data[offset + 3] = nextAlpha;
}

const cleaned = sharp(data, { raw: { width, height, channels } });
await cleaned.clone().png({ compressionLevel: 9 }).toFile(pngOutput);
await cleaned.clone().webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(webpOutput);

console.log(JSON.stringify({ width, height, removedPixels }));
