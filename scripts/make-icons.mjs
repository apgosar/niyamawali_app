// Generates PWA icons from the original logo.  Run: npm run icons
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "logo.jpeg";
const OUT = "public/icons";
const CREAM = { r: 251, g: 246, b: 236, alpha: 1 };

mkdirSync(OUT, { recursive: true });

async function plain(size, name) {
  await sharp(SRC).resize(size, size, { fit: "cover" }).png().toFile(`${OUT}/${name}`);
}

// Maskable icons need the artwork inside the central 80% "safe zone".
async function maskable(size, name) {
  const inner = Math.round(size * 0.78);
  const art = await sharp(SRC).resize(inner, inner, { fit: "cover" }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: CREAM } })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toFile(`${OUT}/${name}`);
}

await plain(192, "icon-192.png");
await plain(512, "icon-512.png");
await plain(180, "apple-touch-icon.png");
await maskable(512, "icon-maskable-512.png");
await plain(64, "favicon-64.png");
// A smaller logo used in headers.
await sharp(SRC).resize(256, 256, { fit: "cover" }).webp({ quality: 85 }).toFile(`${OUT}/logo-256.webp`);
console.log("Icons written to", OUT);
