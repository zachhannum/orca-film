// Writes every format a release carries to dist/, from the render in
// orca.mp4 and from stills of the page.
//
//   node formats.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';

const OUT = 'dist';
const MASTER = 'orca.mp4';

// The stills a release carries, by the time the film holds them.
const POSTERS = [
  ['poster.png', 6.8],
  ['poster-design.png', 28.9],
];

if (!existsSync(MASTER)) throw new Error(`no ${MASTER}: run node render.mjs first`);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const ffmpeg = (...args) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });

// The master, as rendered: 1920 × 1080 at 60 fps.
copyFileSync(MASTER, `${OUT}/orca-1080p60.mp4`);

// For a web page: 1080p at 30 fps, smaller, and able to start playing
// before it has all arrived.
ffmpeg('-i', MASTER, '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', `${OUT}/orca-web.mp4`);

// A preview small enough to send.
ffmpeg('-i', MASTER, '-vf', 'scale=1280:720', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', `${OUT}/orca-720p.mp4`);

// The film without its score, for a page that plays it muted.
ffmpeg('-i', `${OUT}/orca-web.mp4`, '-an', '-c:v', 'copy', '-movflags', '+faststart', `${OUT}/orca-web-silent.mp4`);

// The score alone.
copyFileSync('build/score.wav', `${OUT}/orca-score.wav`);

// The posters.
execFileSync('node', ['stills.mjs', ...POSTERS.map(([, t]) => String(t))], { stdio: 'inherit' });
for (const [name, t] of POSTERS) {
  copyFileSync(`build/stills/t${t.toFixed(2).padStart(6, '0')}.png`, `${OUT}/${name}`);
}
