import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir  = join(__dirname, '..', 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

// Ko'k fon + ikkita gilam rulon tasviri
const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2563eb"/>
  <!-- Gilam rulon 1 -->
  <ellipse cx="182" cy="268" rx="58" ry="118" fill="white" opacity="0.95"/>
  <ellipse cx="182" cy="268" rx="38" ry="98"  fill="#2563eb"/>
  <ellipse cx="182" cy="268" rx="20" ry="80"  fill="white" opacity="0.65"/>
  <!-- Gilam rulon 2 -->
  <ellipse cx="330" cy="268" rx="58" ry="118" fill="white" opacity="0.95"/>
  <ellipse cx="330" cy="268" rx="38" ry="98"  fill="#2563eb"/>
  <ellipse cx="330" cy="268" rx="20" ry="80"  fill="white" opacity="0.65"/>
  <!-- Yuqori chiziq (shelf) -->
  <rect x="100" y="138" width="312" height="24" rx="12" fill="white" opacity="0.85"/>
</svg>
`);

await sharp(svg).resize(192, 192).png().toFile(join(iconsDir, 'icon-192.png'));
await sharp(svg).resize(512, 512).png().toFile(join(iconsDir, 'icon-512.png'));

console.log('✅  public/icons/icon-192.png');
console.log('✅  public/icons/icon-512.png');
