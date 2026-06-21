// Generates app icons/splash/favicon from the FocusFlow brand mark.
// Run: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets', 'images');
mkdirSync(out, { recursive: true });

const INDIGO = '#152473';
const TEAL = '#00a896';

// Progress-ring "focus" mark. `scale` shrinks the mark within the canvas.
function mark(size, color, scale = 1) {
  const c = size / 2;
  const r = (size * 0.225) * scale;
  const sw = (size * 0.082) * scale;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.74; // ~266° arc
  const dotR = (size * 0.057) * scale;
  const dotCy = c - r;
  return `
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}"
      stroke-width="${sw}" stroke-linecap="round"
      stroke-dasharray="${arc} ${circ}" transform="rotate(-90 ${c} ${c})"/>
    <circle cx="${c}" cy="${dotCy}" r="${dotR}" fill="${color}"/>
  `;
}

function gradientIcon(size) {
  const radius = size * 0.22;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${INDIGO}"/>
        <stop offset="1" stop-color="${TEAL}"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#g)"/>
    ${mark(size, '#ffffff', 1)}
  </svg>`;
}

function transparentMark(size, scale, color = '#ffffff') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${mark(size, color, scale)}
  </svg>`;
}

const png = (svg) => sharp(Buffer.from(svg)).png();

await png(gradientIcon(1024)).toFile(join(out, 'icon.png'));
await png(gradientIcon(196)).toFile(join(out, 'favicon.png'));
// Splash mark: white ring on transparent (shown on indigo splash background).
await png(transparentMark(512, 1)).toFile(join(out, 'splash-icon.png'));
// Android adaptive foreground: mark inset to the safe zone on transparent.
await png(transparentMark(1024, 0.62)).toFile(join(out, 'android-icon-foreground.png'));
// Android monochrome (themed icons): same mark, single color, transparent.
await png(transparentMark(1024, 0.62)).toFile(join(out, 'android-icon-monochrome.png'));

console.log('Generated: icon, favicon, splash-icon, android foreground + monochrome');
