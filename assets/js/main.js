(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var LINKS = {
    email: 'mailto:321756623tu@gmail.com',
    phone: 'tel:+16044046680',
    linkedin: 'https://www.linkedin.com/in/jiaqitu/',
    github: 'https://github.com/tujiaqi2002',
    resume: 'assets/Jiaqi_Tu_Resume.pdf'
  };
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
      c.classList.toggle('is-hidden', !!(e.target.closest && e.target.closest('#landscape, .term')));
    }, { passive: true });
    document.addEventListener('mouseleave', function () { c.classList.add('is-hidden'); });
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

  /* ---------------- Terminal ---------------- */
  function initTerminal() {
    var term = $('.term'), out = $('[data-term-out]'), form = $('[data-term-form]'), input = $('[data-term-input]');
    if (!term) return;
    var hist = [], hi = 0, lastFocus = null, greeted = false;

    function print(html, cls) {
      var div = document.createElement('div');
      if (cls) div.className = cls;
      div.innerHTML = html;
      out.appendChild(div);
      out.scrollTop = out.scrollHeight;
    }
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function table(cols, rows) {
      var w = cols.map(function (c, i) { return Math.max(c.length, Math.max.apply(null, rows.map(function (r) { return String(r[i]).length; }))); });
      var line = '+' + w.map(function (n) { return '-'.repeat(n + 2); }).join('+') + '+';
      var row = function (r) { return '| ' + r.map(function (v, i) { return String(v).padEnd(w[i]); }).join(' | ') + ' |'; };
      return [line, row(cols), line].concat(rows.map(row), [line]).join('\n');
    }

    var SKILLS = [
      ['cloud', 'AWS — 20+ services (S3, Glue, Redshift, Lambda, Step Functions, …)'],
      ['cloud', 'Databricks'],
      ['language', 'Python'], ['language', 'PySpark'], ['language', 'SQL'],
      ['language', 'Bash'], ['language', 'C++'], ['language', 'C'],
      ['data_eng', 'ETL/ELT · SCD 1/2 · MDM · Customer 360'],
      ['database', 'Redshift · SQL Server · PostgreSQL · DynamoDB'],
      ['delivery', 'Git · Jenkins · CI/CD · REST APIs']
    ];
    var PROJECTS = {
      badminton: 'https://tujiaqi2002.github.io/badminton/',
      teemo: 'https://tujiaqi2002.github.io/Teemo/',
      traffic: 'https://github.com/tujiaqi2002/traffic_light_optimizer',
      klotski: 'https://github.com/tujiaqi2002/klotski_Hua-Rong-Dao',
      colors: 'https://tujiaqi2002.github.io/color_picker/',
      '2048': 'https://tujiaqi2002.github.io/2048/',
      snake: 'https://tujiaqi2002.github.io/Snake/',
      take: 'https://github.com/tujiaqi2002/Take'
    };

    var cmds = {
      help: function () {
        print([
          '<span class="t-acc">available commands</span>',
          '  whoami            who is this guy',
          '  about             short bio',
          '  skills            loadout (or try: SELECT * FROM skills;)',
          '  quests            work & education',
          '  projects          list projects',
          '  open &lt;project&gt;    launch a project',
          '  contact           ways to reach me',
          '  resume            open resume.pdf',
          '  theme [dark|light]',
          '  arcade            toggle arcade mode',
          '  clear · exit'
        ].join('\n'));
      },
      whoami: function () { print('jiaqi tu — data engineer @ 407 ETR · toronto, on'); },
      about: function () {
        print('Data engineer with 3+ years designing, building and supporting enterprise data platforms on AWS & Databricks.\nConfiguration-driven ETL, multi-source ingestion, Customer 360, MDM, SCD, data quality & performance tuning\nwith Python, PySpark and SQL. BASc, University of Toronto (Software Eng., Minor AI).');
      },
      ls: function () { print('about.txt  skills.sql  quests.log  <span class="t-acc">projects/</span>  resume.pdf'); },
      cat: function (a) {
        if (a[0] === 'about.txt') return cmds.about();
        if (a[0] === 'skills.sql') return print('SELECT * FROM skills;  <span class="t-dim">-- try running it</span>');
        if (a[0] === 'quests.log') return cmds.quests();
        print('cat: ' + esc(a[0] || '') + ': No such file', 't-err');
      },
      skills: function () { cmds.select(['*', 'from', 'skills']); },
      select: function (a) {
        var q = a.join(' ').toLowerCase().replace(/;$/, '');
        if (!/from\s+skills/.test(q)) return print('ERROR: relation does not exist. hint: SELECT * FROM skills;', 't-err');
        var rows = SKILLS.slice();
        var m = q.match(/where\s+category\s*=\s*'?(\w+)'?/);
        if (m) rows = rows.filter(function (r) { return r[0] === m[1]; });
        print(esc(table(['category', 'skill'], rows)) + '\n<span class="t-dim">(' + rows.length + ' rows)</span>');
      },
      quests: function () {
        print(esc(table(['status', 'quest', 'when'], [
          ['IN PROGRESS', 'Data Engineer · 407 ETR', 'May 2023 – now'],
          ['CLEARED', 'BASc · University of Toronto', '2021 – 2025'],
          ['CLEARED', 'Academic Tutor · Easy Group', 'Jul – Dec 2022']
        ])));
      },
      projects: function () {
        print(Object.keys(PROJECTS).map(function (k) { return '  <span class="t-acc">' + k.padEnd(10) + '</span> ' + PROJECTS[k]; }).join('\n') + '\n<span class="t-dim">usage: open &lt;project&gt;</span>');
      },
      open: function (a) {
        var k = (a[0] || '').toLowerCase();
        var url = PROJECTS[k] || LINKS[k];
        if (!url) return print('open: unknown target "' + esc(k) + '". try: projects', 't-err');
        print('launching ' + esc(k) + ' …');
        if (url.indexOf('http') === 0) window.open(url, '_blank', 'noopener');
        else location.href = url;
      },
      contact: function () {
        print([
          'email     <a href="' + LINKS.email + '">321756623tu@gmail.com</a>',
          'phone     <a href="' + LINKS.phone + '">+1 604-404-6680</a>',
          'linkedin  <a href="' + LINKS.linkedin + '" target="_blank" rel="noopener">in/jiaqitu</a>',
          'github    <a href="' + LINKS.github + '" target="_blank" rel="noopener">@tujiaqi2002</a>'
        ].join('\n'));
      },
      resume: function () { print('opening resume.pdf …'); window.open(LINKS.resume, '_blank', 'noopener'); },
      theme: function (a) {
        var t = a[0] === 'light' || a[0] === 'dark' ? a[0] : (root.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
        setTheme(t); print('theme → ' + t);
      },
      arcade: function () {
        var on = !body.classList.contains('arcade');
        setArcade(on); print('arcade mode ' + (on ? 'ON' : 'OFF'));
      },
      sudo: function (a) {
        if (/hire/.test(a.join(' '))) {
          print('[sudo] password for guest: ********\n<span class="t-acc">permission granted.</span> drafting an email to jiaqi …');
          setTimeout(function () { location.href = LINKS.email + '?subject=' + encodeURIComponent("Let's build something data-driven"); }, 900);
        } else print('guest is not in the sudoers file. this incident will be reported. (try: sudo hire-me)', 't-err');
      },
      clear: function () { out.innerHTML = ''; },
      exit: function () { close(); }
    };
    cmds.experience = cmds.quests;
    cmds.work = cmds.projects;

    function run(raw) {
      var line = raw.trim();
      print('<span class="t-acc">guest@jiaqi-tu:~$</span> ' + esc(line));
      if (!line) return;
      hist.push(line); hi = hist.length;
      var parts = line.split(/\s+/);
      var name = parts[0].toLowerCase();
      var fn = cmds[name];
      if (fn) fn(parts.slice(1));
      else print('command not found: ' + esc(parts[0]) + ". type 'help'", 't-err');
    }

    function open() {
      if (!term.hidden) return;
      lastFocus = document.activeElement;
      term.hidden = false;
      body.style.overflow = 'hidden';
      if (!greeted) {
        greeted = true;
        print('<span class="t-acc">jiaqi.os</span> v2026.10 — tty1\n<span class="t-dim">type \'help\' to see what you can do. esc to close.</span>');
      }
      setTimeout(function () { input.focus(); }, 30);
    }
    function close() {
      input.blur();
      term.hidden = true;
      body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); run(input.value); input.value = ''; });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) input.value = hist[--hi]; }
      if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
      if (e.key === 'Tab') {
        e.preventDefault();
        var v = input.value.toLowerCase();
        var hit = Object.keys(cmds).filter(function (c) { return c.indexOf(v) === 0; });
        if (hit.length === 1) input.value = hit[0] + ' ';
      }
    });
    $$('[data-term-open]').forEach(function (b) { b.addEventListener('click', open); });
    $$('[data-term-close]').forEach(function (b) { b.addEventListener('click', close); });
    term.addEventListener('click', function (e) { if (e.target === term) close(); });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !term.hidden) { e.preventDefault(); close(); return; }
      if (isTyping(e)) return;
      if (e.key === '`' || e.key === '~') { e.preventDefault(); term.hidden ? open() : close(); }
    });
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

  /* ---------------- Init ---------------- */
  initClock();
  initXP();
  initGitHub();
  initCarousel();
  initLog();
  initKonami();
  initTerminal();
  initCursor();
  initNav();
  boot(function () {
    initReveal();
    initCounters();
  });
})();
