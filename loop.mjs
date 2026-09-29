// Renders the loop on the site's landing page, once per scheme, and
// encodes each for the web: MP4 for Safari, WebM for the rest.
//
//   node loop.mjs [--into ../obsidian-orca/site/src/shots]
//
// --into copies the clips there, and leaves a clip that looks the same
// as the one already there in place, so a run on another machine does
// not rewrite a file nobody could tell apart.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';

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
const OUT = 'dist/loop';
mkdirSync(OUT, { recursive: true });

const ffmpeg = (...a) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });

// How alike two clips are, from 0 to 1, or 0 when they differ in length.
function likeness(a, b) {
  const frames = (f) => execFileSync('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'v:0',
    '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', f]).toString().trim();
  if (frames(a) !== frames(b)) return 0;
  const log = execFileSync('ffmpeg', ['-i', a, '-i', b, '-lavfi', 'ssim', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] }).toString();
  const all = log.match(/All:([\d.]+)/);
  return all ? +all[1] : 0;
}

for (const [scheme, ui] of Object.entries(SCHEMES)) {
  const master = `build/loop-${scheme}.mp4`;
  execFileSync('node', ['render.mjs', '--page', 'loop.html', '--query', `ui=${ui}`, '--fps', String(FPS), '--sub', '1', '--silent',
    '--width', String(SIZE.width), '--height', String(SIZE.height), '--scale', String(SIZE.scale), '--out', master], { stdio: 'inherit' });

  const mp4 = `${OUT}/loop-${scheme}.mp4`;
  const webm = `${OUT}/loop-${scheme}.webm`;
  ffmpeg('-i', master, '-an', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryslow', '-crf', '28', '-pix_fmt', 'yuv420p',
    '-g', String(FPS * 2), '-movflags', '+faststart', mp4);
  ffmpeg('-i', master, '-an', '-c:v', 'libvpx-vp9', '-crf', '36', '-b:v', '0', '-row-mt', '1', '-g', String(FPS * 2), webm);

  for (const file of [mp4, webm]) {
    const size = statSync(file).size;
    console.log(`${file}  ${(size / 1024 / 1024).toFixed(2)} MB`);
    if (size > MOST) throw new Error(`${file} is over ${MOST / 1024 / 1024} MB`);
    if (into === undefined) continue;
    const there = path.join(into, path.basename(file));
    if (existsSync(there) && likeness(there, file) >= SAME) {
      console.log(`${there} looks the same, and stays`);
      continue;
    }
    copyFileSync(file, there);
    console.log(`wrote ${there}`);
  }
}
