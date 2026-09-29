// The pointer and the ring a click leaves, which the film and the loop
// both draw over the window along O.cursorTracks.
(function () {
  const O = window.O, E = O.E;
  let cursor, ring;

  O.buildCursor = function (stage) {
    ring = O.h('<div class="ring"></div>');
    cursor = O.h(`<div id="cursor">
      <svg class="arrow" width="40" height="40" viewBox="0 0 40 40"><path d="M9 5 L9 31 L15.5 25 L20 35 L24.5 33 L20 23.5 L29 23.5 Z" fill="#fff" stroke="#0a0c0f" stroke-width="1.8" stroke-linejoin="round"/></svg>
      <svg class="cross" width="40" height="40" viewBox="0 0 40 40" style="left:-20px;top:-20px"><g stroke="#0a0c0f" stroke-width="5" stroke-linecap="round"><path d="M20 6v10M20 24v10M6 20h10M24 20h10"/></g><g stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M20 6v10M20 24v10M6 20h10M24 20h10"/></g></svg>
    </div>`);
    stage.appendChild(ring);
    stage.appendChild(cursor);
  };

  O.drawCursor = function (t) {
    const tr = O.cursorTracks.find((c) => t >= c.a && t <= c.b);
    if (!tr) {
      O.setVis(cursor, false);
      O.setVis(ring, false);
      return;
    }
    O.setVis(cursor, true);
    let [x, y] = O.keys(t, tr.frames, E.inOutCubic);
    if (tr.map) [x, y] = tr.map(t, [x, y]);
    const vis = O.env(t, tr.a, tr.b, 0.3, 0.3);
    let press = 1;
    let rk = -1;
    for (const c of tr.clicks) {
      const d = t - c;
      if (d > -0.08 && d < 0.14) press = Math.min(press, 1 - 0.18 * Math.sin(O.prog(d, -0.08, 0.14) * Math.PI));
      if (d >= 0 && d < 0.5) rk = d / 0.5;
    }
    const cross = (tr.cross || []).some(([a, b]) => t >= a && t < b);
    cursor.querySelector('.arrow').style.display = cross ? 'none' : '';
    cursor.querySelector('.cross').style.display = cross ? '' : 'none';
    cursor.style.transform = `translate3d(${cross ? x : x - 9}px,${cross ? y : y - 5}px,0) scale(${press})`;
    cursor.style.opacity = vis;
    O.setVis(ring, rk >= 0);
    if (rk >= 0) {
      ring.style.transform = `translate3d(${x}px,${y}px,0) scale(${0.3 + E.outCubic(rk) * 0.9})`;
      ring.style.opacity = (1 - rk) * 0.9;
    }
  };
})();
