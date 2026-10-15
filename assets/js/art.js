/* Procedural SVG artwork for project cards (800 × 500 viewBox). */
(function () {
  'use strict';

  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }
  function rect(x, y, w, h, cls, rx, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 0) + '" class="' + cls + '"' + (extra || '') + '/>';
  }
  function text(x, y, s, cls, anchor, extra) {
    return '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : '') + (anchor ? ' text-anchor="' + anchor + '"' : '') + (extra || '') + '>' + s + '</text>';
  }
  function frame(label, right) {
    return text(32, 40, label) + text(768, 40, right || '', '', 'end') +
      '<line x1="32" y1="56" x2="768" y2="56" class="line-s"/>';
  }

  var arts = {
    badminton: function () {
      var r = rng(7), out = frame('COURT SCHEDULE · LIVE', 'SAT 14:00');
      var hours = 14, x0 = 110, y0 = 110, cw = 44, ch = 56, gx = 4, gy = 10;
      var courts = ['C1', 'C2', 'C3', 'C4', 'C5'];
      for (var h = 0; h < hours; h++) {
        if (h % 2 === 0) out += text(x0 + h * (cw + gx) + cw / 2, y0 - 16, (8 + h < 10 ? '0' : '') + (8 + h), '', 'middle', ' opacity="0.5"');
      }
      courts.forEach(function (c, ci) {
        var y = y0 + ci * (ch + gy);
        out += text(x0 - 28, y + ch / 2 + 4, c, '', 'end');
        var run = 0;
        for (var h = 0; h < hours; h++) {
          var x = x0 + h * (cw + gx);
          if (run <= 0 && r() > 0.62) run = 1 + Math.floor(r() * 3);
          if (run > 0) {
            out += rect(x, y, cw, ch, h === 6 && ci === 2 ? 'acc' : 'dim2', 4);
            run--;
          } else {
            out += rect(x + 0.5, y + 0.5, cw - 1, ch - 1, 'line-s', 4);
          }
        }
      });
      var nx = x0 + 6.5 * (cw + gx);
      out += '<line x1="' + nx + '" y1="' + (y0 - 6) + '" x2="' + nx + '" y2="' + (y0 + 5 * (ch + gy)) + '" class="acc-s" stroke-width="1.5"/>';
      out += rect(nx - 22, y0 + 5 * (ch + gy) + 4, 44, 20, 'acc', 10) + text(nx, y0 + 5 * (ch + gy) + 18, 'NOW', 'on-acc', 'middle');
      return out;
    },

    teemo: function () {
      var out = frame('SUMMONER LOOKUP', 'RIOT API');
      out += rect(32, 80, 460, 44, 'line-s', 22) + text(56, 107, 'Search summoner…') + '<circle cx="466" cy="102" r="7" class="ink-s" stroke-width="1.5"/><line x1="471" y1="107" x2="477" y2="113" class="ink-s" stroke-width="1.5"/>';
      var games = [['W', '7 / 2 / 9'], ['W', '11 / 4 / 6'], ['L', '3 / 6 / 12'], ['W', '9 / 1 / 7'], ['L', '5 / 7 / 4']];
      games.forEach(function (g, i) {
        var y = 150 + i * 62;
        var win = g[0] === 'W';
        out += rect(32, y, 460, 50, 'dim', 6) + rect(32, y, 4, 50, win ? 'acc' : 'dim2', 2);
        out += text(56, y + 30, win ? 'VICTORY' : 'DEFEAT') + text(200, y + 30, g[1]);
        for (var b = 0; b < 8; b++) {
          var bh = 6 + ((i * 7 + b * 5) % 24);
          out += rect(330 + b * 18, y + 38 - bh, 10, bh, win ? 'acc' : 'dim2', 1);
        }
      });
      // Rank emblem
      var cx = 640, cy = 260;
      function hex(rad) {
        var pts = [];
        for (var k = 0; k < 6; k++) { var a = Math.PI / 3 * k - Math.PI / 2; pts.push((cx + rad * Math.cos(a)).toFixed(1) + ',' + (cy + rad * Math.sin(a)).toFixed(1)); }
        return pts.join(' ');
      }
      out += '<polygon points="' + hex(110) + '" class="line-s" stroke-width="1"/>';
      out += '<polygon points="' + hex(84) + '" class="dim"/>';
      out += '<polygon points="' + hex(56) + '" class="acc float" style="transform-origin:640px 260px"/>';
      out += text(cx, cy + 9, 'IV', 'big on-acc', 'middle');
      out += text(cx, cy + 150, 'RANKED · SOLO / DUO', '', 'middle');
      return out;
    },

    traffic: function () {
      var out = frame('INTERSECTION · SIM', 'T+00:42');
      var cx = 400, cy = 280;
      out += rect(0, cy - 50, 800, 100, 'dim') + rect(cx - 50, 56, 100, 444, 'dim');
      out += '<line x1="0" y1="' + cy + '" x2="' + (cx - 60) + '" y2="' + cy + '" class="ink-s" stroke-dasharray="14 12" opacity="0.35"/>';
      out += '<line x1="' + (cx + 60) + '" y1="' + cy + '" x2="800" y2="' + cy + '" class="ink-s" stroke-dasharray="14 12" opacity="0.35"/>';
      out += '<line x1="' + cx + '" y1="60" x2="' + cx + '" y2="' + (cy - 60) + '" class="ink-s" stroke-dasharray="14 12" opacity="0.35"/>';
      out += '<line x1="' + cx + '" y1="' + (cy + 60) + '" x2="' + cx + '" y2="500" class="ink-s" stroke-dasharray="14 12" opacity="0.35"/>';
      for (var c = 0; c < 4; c++) out += rect(120 + c * 52, cy + 12, 40, 24, 'dim2', 4);
      for (var c2 = 0; c2 < 3; c2++) out += rect(cx - 36, 92 + c2 * 48, 24, 36, 'dim2', 4);
      out += rect(560, cy - 36, 40, 24, 'ink', 4, ' opacity="0.7"');
      function light(x, y, on) {
        var s = rect(x, y, 22, 62, 'bgf', 6) + rect(x + 0.5, y + 0.5, 21, 61, 'line-s', 6);
        for (var k = 0; k < 3; k++) s += '<circle cx="' + (x + 11) + '" cy="' + (y + 12 + k * 19) + '" r="6" class="' + (k === on ? 'acc' : 'dim2') + '"/>';
        return s;
      }
      out += light(cx - 92, cy - 132, 2) + light(cx + 70, cy + 70, 0) + light(cx + 70, cy - 132, 0) + light(cx - 92, cy + 70, 2);
      // Mini chart
      out += rect(600, 380, 168, 92, 'bgf', 8) + rect(600.5, 380.5, 167, 91, 'line-s', 8) + text(614, 402, 'AVG WAIT');
      var pts = [[614, 430], [638, 440], [662, 432], [686, 448], [710, 452], [734, 458], [754, 462]];
      out += '<polyline points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '" class="acc-s" stroke-width="2"/>';
      return out;
    },

    klotski: function () {
      var out = frame('华容道 · KLOTSKI', 'A* / DFS');
      var s = 76, g = 6, x0 = 400 - (4 * s + 3 * g) / 2 - 140, y0 = 74;
      function blk(c, r, w, h, cls, label) {
        var x = x0 + c * (s + g), y = y0 + r * (s + g);
        var W = w * s + (w - 1) * g, H = h * s + (h - 1) * g;
        return rect(x, y, W, H, cls, 8) + (label ? text(x + W / 2, y + H / 2 + 5, label, cls === 'acc' ? 'on-acc' : '', 'middle') : '');
      }
      out += rect(x0 - 10, y0 - 10, 4 * s + 3 * g + 20, 5 * s + 4 * g + 20, 'line-s', 12);
      out += blk(1, 0, 2, 2, 'acc', 'CAO CAO');
      out += blk(0, 0, 1, 2, 'dim2') + blk(3, 0, 1, 2, 'dim2') + blk(0, 2, 1, 2, 'dim2') + blk(3, 2, 1, 2, 'dim2');
      out += blk(1, 2, 2, 1, 'dim2');
      out += blk(1, 3, 1, 1, 'dim2') + blk(2, 3, 1, 1, 'dim2') + blk(0, 4, 1, 1, 'dim2') + blk(3, 4, 1, 1, 'dim2');
      var ex = x0 + (s + g), ew = 2 * s + g, ey = y0 + 5 * (s + g) + 4;
      out += '<line x1="' + ex + '" y1="' + ey + '" x2="' + (ex + ew) + '" y2="' + ey + '" class="acc-s" stroke-width="3"/>';
      out += text(ex + ew / 2, ey + 22, 'EXIT', '', 'middle');
      // Search tree
      var tx = 560, ty = 110;
      var nodes = [[tx + 90, ty], [tx + 30, ty + 90], [tx + 150, ty + 90], [tx, ty + 180], [tx + 60, ty + 180], [tx + 120, ty + 180], [tx + 180, ty + 180], [tx + 90, ty + 270]];
      var edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [5, 7]];
      edges.forEach(function (e) {
        var on = (e[0] === 0 && e[1] === 2) || (e[0] === 2 && e[1] === 5) || (e[0] === 5 && e[1] === 7);
        out += '<line x1="' + nodes[e[0]][0] + '" y1="' + nodes[e[0]][1] + '" x2="' + nodes[e[1]][0] + '" y2="' + nodes[e[1]][1] + '" class="' + (on ? 'acc-s' : 'line-s') + '" stroke-width="' + (on ? 2 : 1) + '"/>';
      });
      nodes.forEach(function (n, i) {
        var on = i === 0 || i === 2 || i === 5 || i === 7;
        out += '<circle cx="' + n[0] + '" cy="' + n[1] + '" r="9" class="' + (on ? 'acc' : 'dim2') + '"/>';
      });
      out += text(tx + 90, ty + 320, 'f(n) = g(n) + h(n)', '', 'middle');
      return out;
    },

    palette: function () {
      var out = frame('偏色 · HUE SHIFT', '12 SWATCHES');
      var cx = 270, cy = 280, R = 170, r0 = 92, n = 12, base = 78;
      for (var k = 0; k < n; k++) {
        var a0 = (k / n) * Math.PI * 2 - Math.PI / 2 + 0.02, a1 = ((k + 1) / n) * Math.PI * 2 - Math.PI / 2 - 0.02;
        var p = [
          [cx + R * Math.cos(a0), cy + R * Math.sin(a0)], [cx + R * Math.cos(a1), cy + R * Math.sin(a1)],
          [cx + r0 * Math.cos(a1), cy + r0 * Math.sin(a1)], [cx + r0 * Math.cos(a0), cy + r0 * Math.sin(a0)]
        ].map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); });
        var hue = (base + k * 30) % 360;
        out += '<path d="M' + p[0] + ' A' + R + ' ' + R + ' 0 0 1 ' + p[1] + ' L' + p[2] + ' A' + r0 + ' ' + r0 + ' 0 0 0 ' + p[3] + 'Z" fill="hsl(' + hue + ',78%,58%)"/>';
      }
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="62" class="bgf"/>' + text(cx, cy + 9, '+30°', 'big', 'middle', ' style="font-size:26px"');
      var picks = [78, 108, 138, 168, 198];
      picks.forEach(function (h, i) {
        var y = 96 + i * 72;
        out += rect(520, y, 64, 56, '', 8, ' fill="hsl(' + h + ',78%,58%)"');
        out += text(604, y + 24, 'HSL ' + h + '°') + text(604, y + 44, '78% · 58%', '', '', ' opacity="0.5"');
      });
      return out;
    },

    g2048: function () {
      var out = frame('2048', 'SCORE 20 480');
      var vals = [[2, 4, 8, 16], [4, 32, 64, 2], [8, 128, 256, 4], [2, 512, 1024, 2048]];
      var s = 86, g = 10, x0 = 400 - (4 * s + 3 * g) / 2, y0 = 80;
      out += rect(x0 - 12, y0 - 12, 4 * s + 3 * g + 24, 4 * s + 3 * g + 24, 'dim', 14);
      vals.forEach(function (row, r) {
        row.forEach(function (v, c) {
          var x = x0 + c * (s + g), y = y0 + r * (s + g);
          var big = v === 2048;
          var op = Math.min(0.08 + Math.log2(v) * 0.05, 0.6);
          out += big ? rect(x, y, s, s, 'acc', 10) : rect(x, y, s, s, 'ink', 10, ' fill-opacity="' + op.toFixed(2) + '"');
          out += text(x + s / 2, y + s / 2 + 8, v, 'big' + (big ? ' on-acc' : ''), 'middle', ' style="font-size:' + (v > 512 ? 22 : 26) + 'px"');
        });
      });
      return out;
    },

    snake: function () {
      var out = frame('SNAKE', 'SCORE 0420');
      var cols = 24, rows = 12, cs = 28, x0 = 400 - (cols * cs) / 2, y0 = 82;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) out += '<circle cx="' + (x0 + c * cs + cs / 2) + '" cy="' + (y0 + r * cs + cs / 2) + '" r="1.4" class="dim2"/>';
      var path = [[3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [7, 7], [7, 6], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [12, 6], [12, 7], [13, 7], [14, 7], [15, 7], [16, 7]];
      path.forEach(function (p, i) {
        var last = i === path.length - 1;
        out += rect(x0 + p[0] * cs + 2, y0 + p[1] * cs + 2, cs - 4, cs - 4, last ? 'acc' : 'ink', 4, last ? '' : ' fill-opacity="' + (0.25 + (i / path.length) * 0.6).toFixed(2) + '"');
      });
      out += rect(x0 + 19 * cs + 6, y0 + 7 * cs + 6, cs - 12, cs - 12, 'acc blink', 2);
      out += text(400, 468, 'PRESS ANY KEY', '', 'middle');
      return out;
    },

    take: function () {
      var out = frame('TAKE · BIU! BIU! BIU!', 'WAVE 03');
      var P = 8;
      var invader = ['00100000100', '00010001000', '00111111100', '01101110110', '11111111111', '10111111101', '10100000101', '00011011000'];
      var ship = ['00000100000', '00001110000', '00001110000', '01111111110', '11111111111', '11111111111'];
      function sprite(map, x, y, cls) {
        var s = '';
        map.forEach(function (row, r) {
          for (var c = 0; c < row.length; c++) if (row[c] === '1') s += rect(x + c * P, y + r * P, P, P, cls);
        });
        return s;
      }
      for (var k = 0; k < 5; k++) out += sprite(invader, 92 + k * 132, 90, k === 2 ? 'acc' : 'dim2');
      for (var k2 = 0; k2 < 4; k2++) out += sprite(invader, 158 + k2 * 132, 180, 'dim2');
      var sx = 400 - (11 * P) / 2;
      out += sprite(ship, sx, 410, 'ink');
      for (var b = 0; b < 4; b++) out += rect(398, 380 - b * 46, 4, 22, 'acc', 2);
      out += text(470, 330, 'biu!', 'big', '', ' opacity="0.55" style="font-size:24px"');
      return out;
    }
  };

  document.querySelectorAll('[data-art]').forEach(function (el) {
    var fn = arts[el.getAttribute('data-art')];
    if (!fn) return;
    el.innerHTML = '<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true">' + fn() + '</svg>';
  });
})();
