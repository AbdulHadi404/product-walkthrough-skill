// import-shots.mjs — registers screenshots taken outside puppeteer (an
// emulator via adb, a desktop screenshot of a third-party dashboard) in the
// same manifest the capture kit writes, so build.mjs treats them like any
// other shot. PNGs are re-encoded as JPEG because the builder embeds JPEG.
//
//   import { importShot } from './import-shots.mjs';
//   await importShot({ name: 'app-home', from: 'raw/home.png' });
//   await importShot({ name: 'appflow-build', from: 'raw/build.png', crop: [0, 80, 1920, 1000],
//                      callouts: [{ n: 1, x: 1500, y: 120, w: 160, h: 40 }] });
//
// Callout boxes are in pixels of the *cropped* image. Reruns replace the
// entry by name, exactly like kit.shot.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// sharp comes from this folder's package.json; SHARP_PATH points at another
// copy (an app's node_modules) when installing a native module here is unwanted.
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PATH ? path.resolve(process.env.SHARP_PATH) : 'sharp');

const WORK = path.resolve(process.env.WALKTHROUGH_WORK ?? '.work');
const SHOTS = path.join(WORK, 'shots');
const MANIFEST = path.join(SHOTS, 'manifest.json');

export async function importShot({ name, from, crop, callouts = [], quality = 92 }) {
  fs.mkdirSync(SHOTS, { recursive: true });
  let img = sharp(from);
  if (crop) {
    const [left, top, width, height] = crop;
    img = img.extract({ left, top, width, height });
  }
  const file = `${name}.jpg`;
  const info = await img.jpeg({ quality }).toFile(path.join(SHOTS, file));
  const entry = { name, file, w: info.width, h: info.height, callouts };
  const current = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : [];
  const i = current.findIndex((m) => m.name === name);
  if (i >= 0) current[i] = entry;
  else current.push(entry);
  fs.writeFileSync(MANIFEST, JSON.stringify(current, null, 2));
  console.log('imported', name, `${info.width}x${info.height}`, callouts.length ? `(${callouts.length} callouts)` : '');
  return entry;
}

// CLI: node import-shots.mjs <spec.json>  — an array of importShot arguments.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  for (const s of spec) await importShot(s);
}
