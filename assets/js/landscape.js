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

  var W = 0, H = 0, dpr = 1, N = 22, tw = 40, th = 20, ox = 0, oy = 0, maxH = 80;
  var heights = new Float32Array(0);
  var mouse = { x: -9999, y: -9999, inside: false };
  var ripples = [];
  var colors = {};
  var running = false, visible = true, rafId = 0;
  var t0 = performance.now(), last = t0, frames = 0, fpsT = t0;
  var hovered = -1;

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

    N = W < 600 ? 14 : W < 1000 ? 18 : 24;
    tw = Math.max(26, (W * (W < 600 ? 1.6 : 1.02)) / N);
    th = tw / 2;
    maxH = Math.min(H * 0.26, tw * 2.6);
    ox = W / 2;
    oy = H * 0.5 - (N * th) / 2 + maxH * 0.35;
    if (heights.length !== N * N) heights = new Float32Array(N * N);
    if (!running) draw(performance.now());
  }

  function field(i, j, t) {
    var x = i / N, y = j / N;
    var v = 0.42
      + 0.22 * Math.sin((x * 2.6 + t * 0.18) * Math.PI) * Math.cos((y * 2.1 - t * 0.13) * Math.PI)
      + 0.12 * Math.sin((x + y) * 9 + t * 0.7)
      + 0.08 * Math.cos((x - y) * 13 - t * 0.5);
    return v;
  }

  function project(i, j) {
    return [ox + (i - j) * tw / 2, oy + (i + j) * th / 2];
  }

  function draw(now) {
    var t = (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);

    var arcade = document.body.classList.contains('arcade');
    var gap = 0.8;
    var hw = (tw / 2) * gap, hh = (th / 2) * gap;
    var sigma = tw * 2.4;

    // Autopilot cursor for touch / idle so the world still breathes
    var mx = mouse.x, my = mouse.y;
    if (!mouse.inside) {
      mx = W / 2 + Math.cos(t * 0.45) * W * 0.28;
      my = H * 0.52 + Math.sin(t * 0.7) * H * 0.12;
    }

    var bestD = Infinity, best = -1;

    for (var s = 0; s <= 2 * (N - 1); s++) {
      for (var i = Math.max(0, s - N + 1); i <= Math.min(s, N - 1); i++) {
        var j = s - i;
        var k = i * N + j;
        var p = project(i, j);
        var bx = p[0], by = p[1];

        var v = field(i, j, reduce ? 0 : t);

        var dx = bx - mx, dy = (by - my) * 1.6;
        var d2 = dx * dx + dy * dy;
        v += 0.55 * Math.exp(-d2 / (2 * sigma * sigma));

        for (var r = 0; r < ripples.length; r++) {
          var rp = ripples[r];
          var age = (now - rp.t) / 1000;
          var dist = Math.hypot(i - rp.i, j - rp.j);
          var front = age * 9;
          var w = Math.exp(-Math.pow(dist - front, 2) / 2.2) * Math.max(0, 1 - age / 2.2);
          v += 0.6 * w;
        }

        v = Math.max(0.04, v);
        heights[k] += (v - heights[k]) * (reduce ? 1 : 0.18);
        var hv = heights[k];
        var h = 3 + hv * maxH;

        var ty = by - h;

        if (mouse.inside) {
          var ddx = bx - mouse.x, ddy = ty - mouse.y;
          var dd = ddx * ddx + ddy * ddy;
          if (dd < bestD && dd < tw * tw) { bestD = dd; best = k; }
        }

        var hot = hv > 0.92;
        var isHover = k === hovered;

        // Left face
        ctx.beginPath();
        ctx.moveTo(bx - hw, ty);
        ctx.lineTo(bx, ty + hh);
        ctx.lineTo(bx, by + hh);
        ctx.lineTo(bx - hw, by);
        ctx.closePath();
        ctx.fillStyle = colors.left;
        ctx.fill();

        // Right face
        ctx.beginPath();
        ctx.moveTo(bx + hw, ty);
        ctx.lineTo(bx, ty + hh);
        ctx.lineTo(bx, by + hh);
        ctx.lineTo(bx + hw, by);
        ctx.closePath();
        ctx.fillStyle = colors.right;
        ctx.fill();
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Top face
        ctx.beginPath();
        ctx.moveTo(bx, ty - hh);
        ctx.lineTo(bx + hw, ty);
        ctx.lineTo(bx, ty + hh);
        ctx.lineTo(bx - hw, ty);
        ctx.closePath();
        if (arcade) {
          ctx.fillStyle = 'hsl(' + ((i * 9 + j * 6 + t * 40) % 360) + ',90%,' + (hot ? 62 : 22 + hv * 22) + '%)';
          ctx.fill();
        } else {
          ctx.fillStyle = isHover ? colors.accent : colors.top;
          ctx.fill();
          // Glow ramps in smoothly with height instead of a hard threshold
          var glow = Math.min(1, Math.max(0, (hv - 0.78) / 0.42));
          if (glow > 0 && !isHover) {
            ctx.globalAlpha = glow * glow * 0.95;
            ctx.fillStyle = colors.accent;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
        ctx.strokeStyle = isHover ? colors.ink : colors.stroke;
        ctx.stroke();
      }
    }

    hovered = best;
    if (hud.cell) {
      if (best >= 0) {
        var bi = Math.floor(best / N), bj = best % N;
        hud.cell.textContent = pad2(bi) + '·' + pad2(bj);
        hud.val.textContent = heights[best].toFixed(3);
      }
    }

    // Prune ripples
    ripples = ripples.filter(function (rp) { return now - rp.t < 2400; });
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
    last = now;
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduce || !visible || document.hidden) return;
    running = true;
    fpsT = performance.now(); frames = 0;
    rafId = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  canvas.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.inside = true;
    if (reduce) draw(performance.now());
  });
  canvas.addEventListener('pointerleave', function () { mouse.inside = false; hovered = -1; });
  canvas.addEventListener('pointerdown', function (e) {
    var r = canvas.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    // Inverse iso projection (ground plane, nudged up for column height)
    var a = (x - ox) / (tw / 2), b = (y + maxH * 0.4 - oy) / (th / 2);
    var i = (a + b) / 2, j = (b - a) / 2;
    ripples.push({ i: i, j: j, t: performance.now() });
    if (ripples.length > 6) ripples.shift();
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
