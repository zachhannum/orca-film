// Renders the loop on the site's landing page, once per scheme, and
// encodes each as an H.264 MP4, which every browser plays. Beside each
// clip goes its poster: the loop's first frame, which the page shows
// until the clip plays.
//
//   node loop.mjs [--into ../obsidian-orca/site/src/shots] [--posters]
//
// --into copies the clips there, and leaves a clip that looks the same
// as the one already there in place, so a run on another machine does
// not rewrite a file nobody could tell apart.
//
// --posters takes the posters alone, which takes seconds, not minutes.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const SCHEMES = { dark: 'ui', light: 'ui-light' };
// The hero is 1200 CSS pixels at its widest. At 1.6 times that the text
// stays sharp and each clip stays near 3 MB.
const SIZE = { width: 1200, height: 750, scale: 1.6 };
const FPS = 30;
// A clip over this is a mistake in the encode, not a bigger window.
const MOST = 4 * 1024 * 1024;
// Above this likeness, two clips are the same picture.
const SAME = 0.995;

const arg = (k) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const into = arg('into');
const postersOnly = process.argv.includes('--posters');
const OUT = 'dist/loop';
mkdirSync(OUT, { recursive: true });

const ffmpeg = (...a) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });

// How alike two clips are, from 0 to 1, or 0 when they differ in length
// or in the color they are labelled with.
function likeness(a, b) {
  const kind = (f) => execFileSync('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'v:0',
    '-show_entries', 'stream=nb_read_packets,color_transfer,color_space', '-of', 'csv=p=0', f]).toString().trim();
  if (kind(a) !== kind(b)) return 0;
  const log = spawnSync('ffmpeg', ['-i', a, '-i', b, '-lavfi', 'ssim', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const all = log.match(/All:([\d.]+)/);
  return all ? +all[1] : 0;
}

// Copies a file into the folder --into names, unless the one there is
// the same.
function keep(file, same) {
  if (into === undefined) return;
  const there = path.join(into, path.basename(file));
  if (existsSync(there) && same(there, file)) {
    console.log(`${there} is the same, and stays`);
    return;
  }
  copyFileSync(file, there);
  console.log(`wrote ${there}`);
}

// The poster is the page at the loop's first moment, at the size the
// clip is rendered at.
const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--force-color-profile=srgb'] });
for (const [scheme, ui] of Object.entries(SCHEMES)) {
  const page = await browser.newPage({ viewport: { width: SIZE.width, height: SIZE.height }, deviceScaleFactor: SIZE.scale });
  await page.goto(pathToFileURL('loop.html').href + `?render=1&ui=${ui}&fps=${FPS}`);
  await page.evaluate(() => O.ready);
  await page.evaluate(() => O.seek(0));
  const poster = `${OUT}/loop-${scheme}.png`;
  await page.screenshot({ path: poster });
  await page.close();
  keep(poster, (a, b) => readFileSync(a).equals(readFileSync(b)));
}
await browser.close();
if (postersOnly) process.exit(0);

for (const [scheme, ui] of Object.entries(SCHEMES)) {
  const master = `build/loop-${scheme}.mp4`;
  execFileSync('node', ['render.mjs', '--page', 'loop.html', '--query', `ui=${ui}`, '--fps', String(FPS), '--sub', '1', '--silent',
    '--width', String(SIZE.width), '--height', String(SIZE.height), '--scale', String(SIZE.scale), '--out', master], { stdio: 'inherit' });

  const mp4 = `${OUT}/loop-${scheme}.mp4`;
  // The frames are sRGB. A browser reads a clip labelled with BT.709's
  // own curve darker in the shadows than the page around it, so the
  // clip is labelled with the sRGB curve to match the pictures.
  ffmpeg('-i', master, '-an', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryslow', '-crf', '28', '-pix_fmt', 'yuv420p',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1',
    '-g', String(FPS * 2), '-movflags', '+faststart', mp4);
  const size = statSync(mp4).size;
  console.log(`${mp4}  ${(size / 1024 / 1024).toFixed(2)} MB`);
  if (size > MOST) throw new Error(`${mp4} is over ${MOST / 1024 / 1024} MB`);
  keep(mp4, (a, b) => likeness(a, b) >= SAME);
}
