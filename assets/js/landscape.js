/* Isometric "data landscape" — part 3D bar chart, part voxel world. */
(function () {
  'use strict';

  var canvas = document.getElementById('landscape');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hud = {
    cell: document.querySelector('[data-hud="cell"]'),
    val: document.querySelector('[data-hud="val"]'),
    fps: document.querySelector('[data-hud="fps"]')
  };

  var TRAIL_FADE = 1.25;     // trail intensity lost per second (~0.8s fade)
  var WAVE_SPEED = 0.5;      // grid widths per second
  var WAVE_WIDTH = 0.08;     // gaussian width, in grid widths
  var WAVE_LIFE = 3;         // seconds
  var WAVE_AMP = 0.42;

  var W = 0, H = 0, dpr = 1, N = 24, tw = 40, th = 20, ox = 0, oy = 0, maxH = 80;
  var heights = new Float32Array(0), trail = new Float32Array(0), tops = new Float32Array(0);
  var mouse = { x: 0, y: 0, inside: false };
  var ripples = [];
  var colors = {};
  var running = false, visible = true, rafId = 0;
  var t0 = performance.now(), last = t0, frames = 0, fpsT = t0;
  var hovered = -1, prevCell = -1;
  var rowK = new Int32Array(0), rowBX = new Float32Array(0), rowBY = new Float32Array(0), rowTY = new Float32Array(0), rowTint = new Float32Array(0);

  function readColors() {
    var cs = getComputedStyle(document.body);
    colors.top = cs.getPropertyValue('--iso-top').trim() || '#1b201c';
    colors.left = cs.getPropertyValue('--iso-left').trim() || '#121513';
    colors.right = cs.getPropertyValue('--iso-right').trim() || '#0e110f';
    colors.stroke = cs.getPropertyValue('--iso-stroke').trim() || 'rgba(236,238,232,.09)';
    colors.accent = cs.getPropertyValue('--accent').trim() || '#c8ff2e';
    colors.ink = cs.getPropertyValue('--ink').trim() || '#eceee8';
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    N = W < 600 ? 28 : W < 1000 ? 40 : 54;
    tw = (W * (W < 600 ? 1.6 : 1.02)) / N;
    th = tw / 2;
    maxH = Math.min(H * 0.2, N * tw * 0.11);
    ox = W / 2;
    oy = H * 0.5 - (N * th) / 2 + maxH * 0.35;
    if (heights.length !== N * N) {
      heights = new Float32Array(N * N);
      trail = new Float32Array(N * N);
      tops = new Float32Array(N * N * 2);
      rowK = new Int32Array(N); rowBX = new Float32Array(N); rowBY = new Float32Array(N); rowTY = new Float32Array(N); rowTint = new Float32Array(N);
      hovered = prevCell = -1;
    }
    if (!running) draw(performance.now());
  }

  function field(i, j, t) {
    var x = i / N, y = j / N;
    return 0.42
      + 0.22 * Math.sin((x * 2.6 + t * 0.3) * Math.PI) * Math.cos((y * 2.1 - t * 0.22) * Math.PI)
      + 0.1 * Math.sin((x + y) * 9 + t * 1.1)
      + 0.06 * Math.cos((x - y) * 13 - t * 0.8);
  }

  // Light every cell on the grid line between two cells so fast moves leave a continuous trail
  function paintLine(a, b) {
    var ai = Math.floor(a / N), aj = a % N, bi = Math.floor(b / N), bj = b % N;
    var steps = Math.max(Math.abs(bi - ai), Math.abs(bj - aj));
    for (var s = 0; s <= steps; s++) {
      var f = steps ? s / steps : 0;
      var i = Math.round(ai + (bi - ai) * f), j = Math.round(aj + (bj - aj) * f);
      trail[i * N + j] = 1;
    }
  }

  function pickCell(mx, my) {
    // Nearest top-face centre (uses last frame's tops; front-most wins ties)
    var best = -1, bestD = (tw * 0.55) * (tw * 0.55);
    for (var k = 0; k < N * N; k++) {
      var dx = tops[k * 2] - mx, dy = (tops[k * 2 + 1] - my) * 2;
      var d = dx * dx + dy * dy;
      if (d <= bestD) { bestD = d; best = k; }
    }
    return best;
  }

  function topPath(bx, ty, hw, hh) {
    ctx.moveTo(bx, ty - hh); ctx.lineTo(bx + hw, ty); ctx.lineTo(bx, ty + hh); ctx.lineTo(bx - hw, ty); ctx.closePath();
  }

  function smoothstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  function draw(now) {
    var t = (now - t0) / 1000;
    var dt = Math.min(0.05, (now - last) / 1000);
    ctx.clearRect(0, 0, W, H);

    var arcade = document.body.classList.contains('arcade');
    var gap = 0.86;
    var hw = (tw / 2) * gap, hh = (th / 2) * gap;
    var fade = TRAIL_FADE * dt;
    var lw = tw < 24 ? 0.6 : 1;

    // Columns on the same diagonal never overlap, so each diagonal is drawn as
    // one batched path per face type (back-to-front across diagonals).
    for (var s = 0; s <= 2 * (N - 1); s++) {
      var i0 = Math.max(0, s - N + 1), i1 = Math.min(s, N - 1), n = 0;
      for (var i = i0; i <= i1; i++) {
        var j = s - i;
        var k = i * N + j;
        var bx = ox + (i - j) * tw / 2, by = oy + (i + j) * th / 2;

        var v = field(i, j, reduce ? 0 : t);
        var waveV = 0;
        for (var r = 0; r < ripples.length; r++) {
          var rp = ripples[r];
          var age = (now - rp.t) / 1000;
          var dist = Math.hypot(i - rp.i, j - rp.j) / N;
          var x = (dist - age * WAVE_SPEED) / WAVE_WIDTH;
          var env = smoothstep(0, 0.2, age) * Math.pow(Math.max(0, 1 - age / WAVE_LIFE), 2);
          waveV += WAVE_AMP * Math.exp(-0.5 * x * x) * env;
        }
        v = Math.max(0.04, v + waveV);
        heights[k] += (v - heights[k]) * (reduce ? 1 : 0.22);
        var ty = by - (2 + heights[k] * maxH);
        tops[k * 2] = bx; tops[k * 2 + 1] = ty;
        if (trail[k] > 0) trail[k] = Math.max(0, trail[k] - fade);

        rowK[n] = k; rowBX[n] = bx; rowBY[n] = by; rowTY[n] = ty;
        rowTint[n] = Math.max(trail[k], Math.min(1, waveV * 1.2));
        n++;
      }

      var m;
      ctx.beginPath();
      for (m = 0; m < n; m++) {
        ctx.moveTo(rowBX[m] - hw, rowTY[m]); ctx.lineTo(rowBX[m], rowTY[m] + hh);
        ctx.lineTo(rowBX[m], rowBY[m] + hh); ctx.lineTo(rowBX[m] - hw, rowBY[m]); ctx.closePath();
      }
      ctx.fillStyle = colors.left; ctx.fill();

      ctx.beginPath();
      for (m = 0; m < n; m++) {
        ctx.moveTo(rowBX[m] + hw, rowTY[m]); ctx.lineTo(rowBX[m], rowTY[m] + hh);
        ctx.lineTo(rowBX[m], rowBY[m] + hh); ctx.lineTo(rowBX[m] + hw, rowBY[m]); ctx.closePath();
      }
      ctx.fillStyle = colors.right; ctx.fill();
      ctx.strokeStyle = colors.stroke; ctx.lineWidth = lw; ctx.stroke();

      ctx.beginPath();
      for (m = 0; m < n; m++) topPath(rowBX[m], rowTY[m], hw, hh);
      ctx.fillStyle = colors.top; ctx.fill();
      ctx.stroke();

      for (m = 0; m < n; m++) {
        var kk = rowK[m], tint = rowTint[m], hov = kk === hovered;
        if (arcade) {
          var ci = Math.floor(kk / N), cj = kk % N;
          ctx.beginPath(); topPath(rowBX[m], rowTY[m], hw, hh);
          ctx.fillStyle = 'hsl(' + ((ci * 5 + cj * 3 + t * 30) % 360) + ',90%,' + (22 + heights[kk] * 22 + tint * 30) + '%)';
          ctx.fill();
        } else if (hov || tint > 0.01) {
          ctx.beginPath(); topPath(rowBX[m], rowTY[m], hw, hh);
          ctx.globalAlpha = hov ? 1 : tint * tint * 0.95;
          ctx.fillStyle = colors.accent; ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (hov) { ctx.strokeStyle = colors.ink; ctx.stroke(); ctx.strokeStyle = colors.stroke; }
      }
    }

    if (hud.cell && hovered >= 0) {
      hud.cell.textContent = pad2(Math.floor(hovered / N)) + '·' + pad2(hovered % N);
      hud.val.textContent = heights[hovered].toFixed(3);
    }

    ripples = ripples.filter(function (rp) { return now - rp.t < WAVE_LIFE * 1000; });
    last = now;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function loop(now) {
    if (!running) return;
    draw(now);
    frames++;
    if (now - fpsT > 500) {
      if (hud.fps) hud.fps.textContent = Math.round((frames * 1000) / (now - fpsT));
      frames = 0; fpsT = now;
    }
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduce || !visible || document.hidden) return;
    running = true;
    last = fpsT = performance.now(); frames = 0;
    rafId = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  canvas.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.inside = true;
    var c = pickCell(mouse.x, mouse.y);
    if (c >= 0) {
      if (prevCell >= 0) paintLine(prevCell, c); else trail[c] = 1;
      prevCell = c;
    }
    hovered = c;
    if (!running) draw(performance.now());
  });
  canvas.addEventListener('pointerleave', function () { mouse.inside = false; hovered = -1; prevCell = -1; });
  canvas.addEventListener('pointerdown', function (e) {
    var r = canvas.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    var c = pickCell(x, y), i, j;
    if (c >= 0) { i = Math.floor(c / N); j = c % N; }
    else {
      var a = (x - ox) / (tw / 2), b = (y + maxH * 0.4 - oy) / (th / 2);
      i = (a + b) / 2; j = (b - a) / 2;
    }
    ripples.push({ i: i, j: j, t: performance.now() });
    if (ripples.length > 5) ripples.shift();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      visible ? start() : stop();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 120); });
  document.addEventListener('jt:theme', function () { readColors(); if (!running) draw(performance.now()); });

  readColors();
  resize();
  start();
  if (reduce) draw(performance.now());
})();
