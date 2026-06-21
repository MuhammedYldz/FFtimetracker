// Generates Google Play store graphics. Run: node scripts/generate-play-assets.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'store-assets');
mkdirSync(out, { recursive: true });

const INDIGO = '#152473';
const TEAL = '#00a896';

function ring(cx, cy, size, color, scale = 1) {
  const r = size * 0.225 * scale;
  const sw = size * 0.082 * scale;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.74;
  const dotR = size * 0.057 * scale;
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}"
      stroke-width="${sw}" stroke-linecap="round"
      stroke-dasharray="${arc} ${circ}" transform="rotate(-90 ${cx} ${cy})"/>
    <circle cx="${cx}" cy="${cy - r}" r="${dotR}" fill="${color}"/>`;
}

// 512x512 store icon (gradient squircle + white mark).
const icon512 = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${INDIGO}"/><stop offset="1" stop-color="${TEAL}"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="112" ry="112" fill="url(#g)"/>
  ${ring(256, 256, 512, '#ffffff', 1)}
</svg>`;

// 1024x500 feature graphic.
const feature = `<svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0f1a52"/><stop offset="0.55" stop-color="${INDIGO}"/><stop offset="1" stop-color="#017f72"/>
  </linearGradient></defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  ${ring(250, 250, 360, '#ffffff', 1)}
  <text x="470" y="235" font-family="Helvetica, Arial, sans-serif" font-size="92" font-weight="700" fill="#ffffff">FocusFlow</text>
  <text x="474" y="300" font-family="Helvetica, Arial, sans-serif" font-size="36" font-weight="400" fill="#bcd9d4">Track your focused time.</text>
</svg>`;

await sharp(Buffer.from(icon512)).png().toFile(join(out, 'play-icon-512.png'));
await sharp(Buffer.from(feature)).png().toFile(join(out, 'feature-graphic-1024x500.png'));
console.log('Generated play-icon-512.png and feature-graphic-1024x500.png in store-assets/');
