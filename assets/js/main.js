(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var CAREER_START = new Date('2023-05-01T00:00:00-04:00');

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ---------------- Boot loader ---------------- */
  function boot(done) {
    var loader = $('#loader');
    if (!loader || root.classList.contains('booted') || reduce) {
      if (loader) loader.remove();
      done();
      return;
    }
    var pct = $('[data-pct]', loader), bar = $('.loader__bar i', loader), lines = $$('.loader__log p', loader);
    var dur = 1300, start = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      pct.textContent = String(Math.round(eased * 100)).padStart(3, '0');
      bar.style.width = eased * 100 + '%';
      lines.forEach(function (l, i) { if (p > i / lines.length) l.classList.add('is-on'); });
      if (p < 1) return requestAnimationFrame(tick);
      setTimeout(function () {
        loader.classList.add('is-done');
        try { sessionStorage.setItem('jt-booted', '1'); } catch (e) {}
        done();
        setTimeout(function () { loader.remove(); }, 1000);
      }, 180);
    }
    requestAnimationFrame(tick);
    loader.addEventListener('click', function () { start = -dur; });
  }

  /* ---------------- Theme ---------------- */
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    store('jt-theme', t);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#f3f3ef' : '#0b0d0c');
    document.dispatchEvent(new CustomEvent('jt:theme'));
  }
  $$('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      setTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    });
  });

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    var els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach(function (e) { e.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------------- Count-up stats ---------------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = target + suffix; return; }
    var from = target > 1000 ? target - 40 : 0;
    var dur = 1400, s = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - s) / dur);
      var v = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 4)));
      el.textContent = v + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(s);
  }
  function initCounters() {
    var els = $$('[data-count]');
    if (!('IntersectionObserver' in window)) { els.forEach(countUp); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------------- Live GitHub stat ---------------- */
  function initGitHub() {
    var el = $('[data-gh="public_repos"]');
    if (!el || !window.fetch) return;
    fetch('https://api.github.com/users/tujiaqi2002', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || typeof d.public_repos !== 'number') return;
        el.setAttribute('data-count', d.public_repos);
        if (el.textContent !== '0') el.textContent = d.public_repos;
      })
      .catch(function () {});
  }

  /* ---------------- XP / level ---------------- */
  function initXP() {
    var now = new Date();
    var years = (now - CAREER_START) / (365.25 * 864e5);
    var level = Math.floor(years);
    var frac = years - level;
    var nextDays = Math.ceil((1 - frac) * 365.25);
    var lvl = $('[data-xp-level]'), lab = $('[data-xp-label]'), bar = $('[data-xp-bar]'), next = $('[data-xp-next]');
    if (lvl) lvl.textContent = level;
    if (lab) lab.textContent = years.toFixed(2) + ' yrs in production';
    if (next) next.textContent = nextDays;
    if (bar) {
      var fill = function () { bar.style.width = (frac * 100).toFixed(1) + '%'; };
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { fill(); io.disconnect(); } }, { threshold: 0.5 });
        io.observe(bar);
      } else fill();
    }
  }

  /* ---------------- Active nav ---------------- */
  function initNav() {
    var links = $$('.nav a');
    if (!('IntersectionObserver' in window)) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (a && en.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-active'); });
          a.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------------- Custom cursor ---------------- */
  function initCursor() {
    var c = $('.cursor');
    if (!c || !window.matchMedia('(pointer: fine)').matches) return;
    var label = $('.cursor__label', c);
    var x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      var t = e.target.closest ? e.target.closest('[data-cursor]') : null;
      var link = e.target.closest ? e.target.closest('a, button, summary') : null;
      var txt = t && !link ? t.getAttribute('data-cursor') : '';
      if (txt) { label.textContent = txt; c.classList.add('has-label'); }
      else c.classList.remove('has-label');
      c.classList.toggle('is-hidden', !!(e.target.closest && e.target.closest('#landscape')));
    }, { passive: true });
    document.addEventListener('mouseleave', function () { c.classList.add('is-hidden'); });
    // Lets canvas scenes refresh the label when it changes without a pointer move
    document.addEventListener('jt:cursor', function (e) {
      var txt = e.detail || '';
      if (txt) { label.textContent = txt; c.classList.add('has-label'); }
      else c.classList.remove('has-label');
    });
    (function loop() {
      cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
      c.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------- Carousel ---------------- */
  function initCarousel() {
    var car = $('[data-carousel]');
    if (!car) return;
    var slides = $$('.slide', car);
    var nowEl = $('[data-slide-now]'), totalEl = $('[data-slide-total]');
    if (totalEl) totalEl.textContent = String(slides.length).padStart(2, '0');

    var down = false, moved = false, sx = 0, sl = 0, pid = null;
    car.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = car.scrollLeft; pid = e.pointerId;
    });
    addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        car.classList.add('is-dragging');
        try { car.setPointerCapture(pid); } catch (err) {}
      }
      if (moved) car.scrollLeft = sl - dx;
    });
    addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (moved) {
        var cur = car.scrollLeft;
        car.classList.remove('is-dragging');
        car.scrollLeft = cur;
        snapTo(nearest());
      }
    });
    car.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

    function nearest() {
      var best = 0, bd = Infinity, pad = parseFloat(getComputedStyle(car).paddingLeft) || 0;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft - pad - car.scrollLeft);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function snapTo(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      var pad = parseFloat(getComputedStyle(car).paddingLeft) || 0;
      car.scrollTo({ left: slides[i].offsetLeft - pad, behavior: reduce ? 'auto' : 'smooth' });
    }
    $$('[data-slide]').forEach(function (b) {
      b.addEventListener('click', function () { snapTo(nearest() + parseInt(b.getAttribute('data-slide'), 10)); });
    });
    car.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); snapTo(nearest() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); snapTo(nearest() - 1); }
    });
    var raf;
    car.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        if (nowEl) nowEl.textContent = String(nearest() + 1).padStart(2, '0');
      });
    }, { passive: true });
  }

  /* ---------------- Simulated run log ---------------- */
  function initLog() {
    var log = $('[data-log]');
    if (!log) return;
    var r = function (a, b) { return Math.floor(a + Math.random() * (b - a)); };
    var fmt = function (n) { return n.toLocaleString('en-US'); };
    var steps = [
      function () { return ['ingest', 'appflow → crm.customer', fmt(r(8000, 16000)) + ' rows']; },
      function () { return ['ingest', 'sftp → billing.trips', fmt(r(120000, 480000)) + ' rows']; },
      function () { return ['bronze', 'write parquet  s3://lake/bronze', r(80, 420) + ' MB']; },
      function () { return ['silver', 'dq.not_null(customer_id, email)', '0 violations']; },
      function () { return ['silver', 'dq.unique(customer_id)', 'passed']; },
      function () { return ['silver', 'scd2.merge  dim_customer', '+' + fmt(r(300, 1800)) + ' / ~' + r(20, 140)]; },
      function () { return ['gold', 'build customer_360', r(4, 18) + ' sources']; },
      function () { return ['gold', 'mdm.match_and_merge', fmt(r(200, 900)) + ' golden recs']; },
      function () { return ['serve', 'redshift COPY analytics.dim_customer', (Math.random() * 3 + 0.8).toFixed(1) + 's']; },
      function () { return ['orch', 'step_functions: run complete', r(3, 9) + 'm ' + r(10, 59) + 's']; }
    ];
    var i = 0, max = 18;
    function push() {
      var d = new Date();
      var ts = [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return String(n).padStart(2, '0'); }).join(':');
      var s = steps[i % steps.length]();
      var li = document.createElement('li');
      li.className = 'ok';
      [ts, s[0], s[1], s[2]].forEach(function (txt) { var sp = document.createElement('span'); sp.textContent = txt; li.appendChild(sp); });
      log.appendChild(li);
      while (log.children.length > max) log.removeChild(log.firstChild);
      i++;
    }
    for (var k = 0; k < 16; k++) push();
    if (reduce) return;
    var timer = null;
    var run = function () { if (!timer) timer = setInterval(push, 1400); };
    var halt = function () { clearInterval(timer); timer = null; };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { en[0].isIntersecting ? run() : halt(); }).observe(log);
    } else run();
  }

  /* ---------------- Toast ---------------- */
  var toastEl = $('.toast'), toastTimer;
  function toast(icon, title, sub) {
    if (!toastEl) return;
    toastEl.innerHTML = '';
    var i = document.createElement('span'); i.className = 'toast__icon'; i.textContent = icon;
    var t = document.createElement('span'); t.className = 'toast__txt';
    var sm = document.createElement('small'); sm.textContent = sub;
    var b = document.createElement('span'); b.textContent = title;
    t.appendChild(sm); t.appendChild(b);
    toastEl.appendChild(i); toastEl.appendChild(t);
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3600);
  }

  /* ---------------- Arcade mode (Konami) ---------------- */
  function setArcade(on) {
    body.classList.toggle('arcade', on);
    document.dispatchEvent(new CustomEvent('jt:theme'));
  }
  function initKonami() {
    var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var pos = 0;
    addEventListener('keydown', function (e) {
      if (isTyping(e)) return;
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = k === seq[pos] ? pos + 1 : (k === seq[0] ? 1 : 0);
      if (pos === seq.length) {
        pos = 0;
        var on = !body.classList.contains('arcade');
        setArcade(on);
        if (on) toast('▲', 'Arcade mode on', 'Konami code accepted');
      }
    });
  }
  function isTyping(e) {
    var t = e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  /* ---------------- Clock & year ---------------- */
  function initClock() {
    var el = $('[data-clock]'), yr = $('[data-year]');
    if (yr) yr.textContent = new Date().getFullYear();
    if (!el) return;
    var f;
    try {
      f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short' });
    } catch (e) { return; }
    var tick = function () { el.textContent = f.format(new Date()); };
    tick(); setInterval(tick, 1000);
  }

  /* ---------------- Shared API (used by the console module) ---------------- */
  window.JT = { setTheme: setTheme, setArcade: setArcade, toast: toast };

  /* ---------------- Init ---------------- */
  initClock();
  initXP();
  initGitHub();
  initCarousel();
  initLog();
  initKonami();
  initCursor();
  initNav();
  boot(function () {
    initReveal();
    initCounters();
  });
})();
