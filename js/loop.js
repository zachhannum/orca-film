// The loop on the site's landing page: the Obsidian window alone, from
// the notes to the export, with no sea, captions or camera. It runs on
// the film's clock so the scenes keep their times, and it leaves out the
// spans where the film's camera moved and the window stood still.
(function () {
  const O = window.O;
  const q = new URLSearchParams(location.search);
  O.loop = true;
  O.UI = 'assets/' + (q.get('ui') || 'ui');
  O.FPS = +(q.get('fps') || 30);
  // How long the last frame takes to fade into the first.
  O.SEAM = 0.8;
  document.documentElement.classList.add('loop');
  if (q.has('render')) document.documentElement.classList.add('render');

  // The spans of film time the loop plays, in order.
  const KEEP = [[12.5, 21.0], [22.2, 36.0], [37.2, 42.0]];
  const L = KEEP.reduce((n, [a, b]) => n + b - a, 0);
  O.T = {
    total: L,
    notes: [12.5, 15],
    write: [15, 22.5],
    design: [22.5, 30],
    css: [30, 37.5],
    export: [37.5, 41.25],
    last: KEEP[KEEP.length - 1][1],
  };
  O.scenes = [];
  O.cursorTracks = [];
  O.caption = () => null;

  // Loop time to film time.
  const film = (u) => {
    for (const [a, b] of KEEP) {
      if (u < b - a) return a + u;
      u -= b - a;
    }
    return O.T.last;
  };

  O.seek = (u) => {
    const t = film(Math.max(0, Math.min(L - 1e-6, u)));
    for (const s of O.scenes) {
      const on = t >= s.a - (s.pre || 0) && t < s.b + (s.post || 0);
      O.setVis(s.el, on);
      if (on) s.update(t);
    }
    O.drawCursor(t);
  };

  O.ready = new Promise((r) => addEventListener('DOMContentLoaded', r)).then(async () => {
    const stage = document.getElementById('stage');
    const root = document.documentElement.style;
    root.setProperty('--cover', window.FRAMES.paint.cover);
    root.setProperty('--caret', window.FRAMES.paint.caret);
    const scenes = O.h('<div class="layer" id="scenes"></div>');
    stage.appendChild(scenes);
    for (const s of O.scenes) {
      s.el = O.h(`<div class="scene" id="sc-${s.id}"></div>`);
      scenes.appendChild(s.el);
      s.el.style.display = 'none';
      s.init();
    }
    O.buildCursor(stage);
    await Promise.all(Array.from(document.images).map((im) => im.decode().catch(() => null)));
    O.seek(0);
    if (!q.has('render')) {
      const t0 = performance.now();
      const play = () => {
        O.seek(((performance.now() - t0) / 1000) % L);
        requestAnimationFrame(play);
      };
      requestAnimationFrame(play);
    }
    return true;
  });
})();
