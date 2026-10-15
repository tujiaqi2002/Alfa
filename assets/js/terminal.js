/* Canvas-rendered terminal. Drawn onto the 3D CRT (or shown flat as a fallback). */

const LINKS = {
  email: 'mailto:321756623tu@gmail.com',
  phone: 'tel:+16044046680',
  linkedin: 'https://www.linkedin.com/in/jiaqitu/',
  github: 'https://github.com/tujiaqi2002',
  resume: 'assets/Jiaqi_Tu_Resume.pdf'
};
const PROJECTS = {
  badminton: 'https://tujiaqi2002.github.io/badminton/',
  teemo: 'https://tujiaqi2002.github.io/Teemo/',
  traffic: 'https://github.com/tujiaqi2002/traffic_light_optimizer',
  klotski: 'https://github.com/tujiaqi2002/klotski_Hua-Rong-Dao',
  colors: 'https://tujiaqi2002.github.io/color_picker/',
  '2048': 'https://tujiaqi2002.github.io/2048/',
  snake: 'https://tujiaqi2002.github.io/Snake/',
  take: 'https://github.com/tujiaqi2002/Take'
};
const SKILLS = [
  ['cloud', 'AWS (20+ services)'],
  ['cloud', 'Databricks'],
  ['language', 'Python'], ['language', 'PySpark'], ['language', 'SQL'],
  ['language', 'Bash'], ['language', 'C++'], ['language', 'C'],
  ['data_eng', 'ETL/ELT, SCD 1/2, MDM, Customer 360'],
  ['database', 'Redshift, SQL Server, PostgreSQL'],
  ['delivery', 'Git, Jenkins, CI/CD']
];
const CAREER_START = new Date('2023-05-01T00:00:00-04:00');

const W = 1024, H = 768;
const FONT_PX = 20, LH = 27, PAD_X = 64, PAD_Y = 56;
const FONT = FONT_PX + 'px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const PROMPT = 'guest@jiaqi-tu:~$ ';
const MAX_LINES = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function createTerminal() {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  let charW = 12, cols = 74, rows = 24;
  let logical = [];
  let wrapped = null;
  let input = '', caretOn = true, focused = false, scroll = 0;
  let power = 0, booted = false, demoToken = 0, demoActive = false;
  let capture = null, live = null;
  let palette = readPalette();
  const hist = []; let hi = 0;
  const subs = {};
  let raf = 0;

  const scan = (() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 3;
    const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(0, 2, 4, 1);
    return ctx.createPattern(c, 'repeat');
  })();

  function readPalette() {
    const acc = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#c8ff2e';
    return { bg: '#050906', ink: '#cfe8c2', dim: '#5f7659', acc: acc, err: '#ff6b6b' };
  }

  function on(evt, fn) { (subs[evt] = subs[evt] || []).push(fn); }
  function emit(evt, a) { (subs[evt] || []).forEach((fn) => fn(a)); }

  function measure() {
    ctx.font = FONT;
    charW = ctx.measureText('MMMMMMMMMM').width / 10;
    cols = Math.floor((W - PAD_X * 2) / charW);
    rows = Math.floor((H - PAD_Y * 2) / LH);
    wrapped = null;
  }

  /* ---------- buffer ---------- */
  function parse(str, base) {
    const out = [], re = /<(acc|dim|err|ink)>([\s\S]*?)<\/\1>/g;
    let last = 0, m;
    while ((m = re.exec(str))) {
      if (m.index > last) out.push({ t: str.slice(last, m.index), c: base });
      out.push({ t: m[2], c: m[1] });
      last = re.lastIndex;
    }
    if (last < str.length) out.push({ t: str.slice(last), c: base });
    if (!out.length) out.push({ t: '', c: base });
    return out;
  }
  function pushRaw(segs) {
    logical.push(segs);
    if (logical.length > MAX_LINES) logical = logical.slice(-MAX_LINES);
    wrapped = null; scroll = 0;
    if (capture) capture.push(segs.map((s) => s.t).join(''));
    dirty();
  }
  function print(str, cls) {
    String(str).split('\n').forEach((line) => pushRaw(parse(line, cls || 'ink')));
  }
  function err(text) { pushRaw([{ t: text, c: 'err' }]); }

  function wrap(segs) {
    const out = []; let row = [], used = 0;
    segs.forEach((s) => {
      let t = s.t;
      while (t.length) {
        const room = cols - used;
        if (room <= 0) { out.push(row); row = []; used = 0; continue; }
        const part = t.slice(0, room);
        row.push({ t: part, c: s.c }); used += part.length; t = t.slice(room);
      }
    });
    out.push(row);
    return out;
  }
  function allRows() {
    if (!wrapped) {
      wrapped = [];
      logical.forEach((l) => { wrapped.push.apply(wrapped, wrap(l)); });
    }
    return wrapped;
  }

  /* ---------- render ---------- */
  function dirty() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; render(); });
  }

  function drawRow(row, y) {
    let x = PAD_X;
    row.forEach((s) => {
      if (!s.t) return;
      const col = palette[s.c] || palette.ink;
      ctx.fillStyle = col; ctx.shadowColor = col;
      ctx.fillText(s.t, x, y);
      x += s.t.length * charW;
    });
    return x;
  }

  function drawContent() {
    ctx.font = FONT; ctx.textBaseline = 'top';
    ctx.shadowBlur = 9;
    const all = allRows();
    const inRows = wrap([{ t: PROMPT, c: 'acc' }, { t: input, c: 'ink' }]);
    const avail = Math.max(1, rows - inRows.length);
    const maxScroll = Math.max(0, all.length - avail);
    scroll = Math.max(0, Math.min(scroll, maxScroll));
    const start = Math.max(0, all.length - avail - scroll);
    let y = PAD_Y;
    all.slice(start, start + avail).forEach((r) => { drawRow(r, y); y += LH; });

    if (scroll > 0) {
      ctx.fillStyle = palette.dim; ctx.shadowColor = palette.dim;
      ctx.fillText('-- scrolled ' + scroll + ' lines · PgDn / type to return --', PAD_X, y);
    } else if (booted) {
      let x = PAD_X;
      inRows.forEach((r, i) => { x = drawRow(r, y); if (i < inRows.length - 1) y += LH; });
      if (caretOn) {
        ctx.shadowColor = palette.acc;
        if (focused || demoActive) { ctx.fillStyle = palette.acc; ctx.fillRect(x, y + 2, charW, LH - 6); }
        else { ctx.strokeStyle = palette.acc; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 3, charW - 2, LH - 8); }
      }
    }
    ctx.shadowBlur = 0;
  }

  function post() {
    ctx.fillStyle = scan; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, W * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const s = ctx.createLinearGradient(0, 0, W, H);
    s.addColorStop(0, 'rgba(255,255,255,0.05)'); s.addColorStop(0.35, 'rgba(255,255,255,0)');
    ctx.fillStyle = s; ctx.fillRect(0, 0, W, H);
  }

  function render() {
    ctx.shadowBlur = 0;
    ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, W, H);
    if (power <= 0) { post(); emit('change'); return; }
    if (power < 1) {
      const p = power;
      if (p < 0.35) {
        const w = W * (1 - Math.pow(1 - p / 0.35, 3));
        ctx.fillStyle = '#eaffd0'; ctx.shadowColor = palette.acc; ctx.shadowBlur = 30;
        ctx.fillRect((W - w) / 2, H / 2 - 2, w, 4);
        ctx.shadowBlur = 0;
      } else {
        const q = (p - 0.35) / 0.65;
        drawContent();
        const band = H * q;
        ctx.fillStyle = palette.bg;
        ctx.fillRect(0, 0, W, (H - band) / 2);
        ctx.fillRect(0, (H + band) / 2, W, (H - band) / 2);
        ctx.fillStyle = 'rgba(234,255,208,' + (0.55 * (1 - q)).toFixed(3) + ')';
        ctx.fillRect(0, (H - band) / 2, W, band);
      }
    } else {
      drawContent();
    }
    post();
    emit('change');
  }

  /* ---------- power ---------- */
  function powerOn() {
    if (power > 0) return Promise.resolve();
    return new Promise((resolve) => {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const dur = reduce ? 1 : 900, t0 = performance.now();
      emit('power', true);
      (function step(now) {
        power = Math.min(1, (now - t0) / dur);
        render();
        if (power < 1) requestAnimationFrame(step);
        else resolve();
      })(t0);
      boot();
    });
  }
  function boot() {
    print('<acc>JIAQI.OS</acc> v2026.10  <dim>(c) Jiaqi Tu · tty1</dim>');
    print('<dim>bios ........................ ok</dim>');
    print('<dim>mount s3://portfolio ........ ok</dim>');
    print('<dim>spark session ............... ok</dim>');
    print('');
    print("type <acc>help</acc> to list commands.");
    print('');
    booted = true;
  }
  function getPower() { return power; }

  /* ---------- commands ---------- */
  function table(head, body) {
    const w = head.map((h, i) => Math.max(h.length, ...body.map((r) => String(r[i]).length)));
    const line = '+' + w.map((n) => '-'.repeat(n + 2)).join('+') + '+';
    const row = (r) => '| ' + r.map((v, i) => String(v).padEnd(w[i])).join(' | ') + ' |';
    return [line, row(head), line].concat(body.map(row), [line]).join('\n');
  }
  function years() { return ((Date.now() - CAREER_START) / (365.25 * 864e5)).toFixed(2); }
  function openUrl(url) {
    if (/^https?:/.test(url)) window.open(url, '_blank', 'noopener');
    else location.href = url;
  }

  const cmds = {
    help() {
      print([
        '<acc>commands</acc>',
        '  whoami           who is this',
        '  about            short bio',
        '  neofetch         system info',
        '  agents           my AI agent network',
        '  skills           loadout <dim>(or: SELECT * FROM skills;)</dim>',
        '  quests           work & education',
        '  projects         list projects',
        '  open <name>      launch a project or link',
        '  contact          ways to reach me',
        '  resume           open resume.pdf',
        '  theme | arcade   change the vibe',
        '  clear | exit'
      ].join('\n'));
    },
    whoami() { print('jiaqi tu — data engineer @ 407 ETR · toronto, on'); },
    about() {
      print('Data engineer with 3+ years designing, building and supporting enterprise data platforms on AWS & Databricks. Configuration-driven ETL, multi-source ingestion, Customer 360, MDM, SCD, data quality and performance tuning with Python, PySpark and SQL.');
      print('<dim>BASc, University of Toronto — Software Engineering, minor in AI.</dim>');
    },
    neofetch() {
      const art = [
        '    .--------.  ',
        '   /        /|  ',
        '  /________/ |  ',
        '  |        | |  ',
        '  |  J.T.  | |  ',
        '  |        | /  ',
        '  |________|/   ',
        '                ',
        '                '
      ];
      const info = [
        '<acc>guest@jiaqi-tu</acc>',
        '<dim>--------------</dim>',
        '<acc>os</acc>      jiaqi.os 2026.10',
        '<acc>host</acc>    407 ETR, Toronto',
        '<acc>uptime</acc>  ' + years() + ' yrs in production',
        '<acc>shell</acc>   pyspark',
        '<acc>stack</acc>   AWS (20+), Databricks, SQL',
        '<acc>edu</acc>     BASc UofT (SE, minor AI)',
        '<acc>ai</acc>      multi-provider agent network'
      ];
      art.forEach((a, i) => print('<dim>' + a + '</dim>' + (info[i] || '')));
    },
    agents() {
      print([
        '<acc>personal AI agent network</acc> <dim>-- multi-provider, human in the loop</dim>',
        '',
        '  [ jiaqi ] orchestrator   <dim>sets goals, reviews, ships</dim>',
        '     |',
        '     +-- research agent    <dim>reads docs, compares approaches</dim>',
        '     +-- code agent        <dim>drafts pipelines & refactors</dim>',
        '     +-- review agent      <dim>second opinion on every diff</dim>',
        '     +-- data agent        <dim>SQL / PySpark exploration</dim>',
        '     +-- docs agent        <dim>specs, READMEs, runbooks</dim>',
        '',
        '<acc>providers</acc>  GitHub Copilot, OpenAI Codex + more, routed per task',
        '<acc>result</acc>     parallel work past one-person productivity limits'
      ].join('\n'));
    },
    ls() { print('about.txt  skills.sql  quests.log  <acc>projects/</acc>  resume.pdf'); },
    cat(a) {
      const f = a[0] || '';
      if (f === 'about.txt') return cmds.about();
      if (f === 'skills.sql') return print('SELECT * FROM skills;  <dim>-- try running it</dim>');
      if (f === 'quests.log') return cmds.quests();
      err('cat: ' + f + ': No such file');
    },
    skills() { cmds.select(['*', 'from', 'skills']); },
    select(a) {
      const q = a.join(' ').toLowerCase().replace(/;\s*$/, '');
      if (!/from\s+skills/.test(q)) return err('ERROR: relation does not exist. hint: SELECT * FROM skills;');
      let body = SKILLS.slice();
      const m = q.match(/where\s+category\s*=\s*'?(\w+)'?/);
      if (m) body = body.filter((r) => r[0] === m[1]);
      table(['category', 'skill'], body).split('\n').forEach((l) => pushRaw([{ t: l, c: 'ink' }]));
      print('<dim>(' + body.length + ' rows)</dim>');
    },
    quests() {
      table(['status', 'quest', 'when'], [
        ['IN PROGRESS', 'Data Engineer @ 407 ETR', 'May 2023 - now'],
        ['CLEARED', 'BASc, University of Toronto', '2021 - 2025'],
        ['CLEARED', 'Academic Tutor @ Easy Group', 'Jul - Dec 2022']
      ]).split('\n').forEach((l) => pushRaw([{ t: l, c: 'ink' }]));
    },
    projects() {
      Object.keys(PROJECTS).forEach((k) => pushRaw([{ t: '  ' + k.padEnd(11), c: 'acc' }, { t: PROJECTS[k].replace('https://', ''), c: 'dim' }]));
      print('<dim>usage: open <name></dim>');
    },
    open(a) {
      const k = (a[0] || '').toLowerCase();
      const url = PROJECTS[k] || LINKS[k];
      if (!url) return err('open: unknown target "' + k + '". try: projects');
      print('launching ' + k + ' ...');
      openUrl(url);
    },
    contact() {
      print([
        '<acc>email</acc>     321756623tu@gmail.com',
        '<acc>phone</acc>     +1 604-404-6680',
        '<acc>linkedin</acc>  linkedin.com/in/jiaqitu',
        '<acc>github</acc>    github.com/tujiaqi2002',
        '<dim>tip: open email | open linkedin | open github</dim>'
      ].join('\n'));
    },
    resume() { print('opening resume.pdf ...'); openUrl(LINKS.resume); },
    theme(a) {
      const cur = document.documentElement.getAttribute('data-theme');
      const t = a[0] === 'light' || a[0] === 'dark' ? a[0] : (cur === 'light' ? 'dark' : 'light');
      if (window.JT) window.JT.setTheme(t);
      print('theme -> ' + t);
    },
    arcade() {
      const on = !document.body.classList.contains('arcade');
      if (window.JT) window.JT.setArcade(on);
      print('arcade mode ' + (on ? 'ON' : 'OFF'));
    },
    date() {
      let s;
      try { s = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto', dateStyle: 'full', timeStyle: 'long' }); }
      catch (e) { s = new Date().toString(); }
      print(s);
    },
    echo(a, raw) { pushRaw([{ t: raw.replace(/^echo\s?/i, ''), c: 'ink' }]); },
    history() { hist.forEach((h, i) => pushRaw([{ t: String(i + 1).padStart(4) + '  ', c: 'dim' }, { t: h, c: 'ink' }])); },
    sudo(a) {
      if (/hire/.test(a.join(' '))) {
        print('[sudo] password for guest: ********');
        print('<acc>permission granted.</acc> drafting an email to jiaqi ...');
        setTimeout(() => openUrl(LINKS.email + '?subject=' + encodeURIComponent("Let's build something data-driven")), 900);
      } else err('guest is not in the sudoers file. this incident will be reported. (try: sudo hire-me)');
    },
    clear() { logical = []; wrapped = null; dirty(); },
    exit() { print('<dim>bye. click the screen to come back.</dim>'); emit('exit'); }
  };
  cmds.experience = cmds.quests;
  cmds.work = cmds.projects;
  cmds.man = cmds.help;
  cmds.ai = cmds.agents;

  function run(raw) {
    const line = raw.trim();
    pushRaw([{ t: PROMPT, c: 'acc' }, { t: raw, c: 'ink' }]);
    if (!line) return;
    hist.push(line); hi = hist.length;
    const parts = line.split(/\s+/);
    const fn = cmds[parts[0].toLowerCase()];
    capture = [];
    if (fn) fn(parts.slice(1), line);
    else err('command not found: ' + parts[0] + ". type 'help'");
    if (live) live.textContent = capture.join('\n');
    capture = null;
    emit('run', line);
  }

  /* ---------- demo / scripted typing ---------- */
  async function typeAndRun(cmd, speed) {
    const token = ++demoToken;
    demoActive = true; input = ''; dirty();
    for (const ch of cmd) {
      if (token !== demoToken) return false;
      input += ch; emit('key', ch); dirty();
      await sleep(speed ? speed() : 40);
    }
    if (token !== demoToken) return false;
    await sleep(220);
    emit('key', 'Enter');
    const v = input; input = ''; run(v);
    demoActive = false; dirty();
    return true;
  }
  async function demo(list) {
    const token = ++demoToken;
    for (const c of list) {
      await sleep(900);
      if (token !== demoToken) return;
      demoToken = token - 1;
      const ok = await typeAndRun(c, () => 60 + Math.random() * 110);
      if (!ok) return;
      demoToken = token;
    }
    print("<dim>-- your turn: click the screen and type 'help' --</dim>");
  }
  function cancelDemo() {
    demoToken++;
    if (demoActive) { demoActive = false; input = ''; dirty(); }
  }

  /* ---------- input binding ---------- */
  function bindInput(el) {
    el.addEventListener('focus', () => { focused = true; cancelDemo(); el.value = input; dirty(); });
    el.addEventListener('blur', () => { focused = false; dirty(); });
    el.addEventListener('input', (e) => {
      input = el.value; scroll = 0;
      if (e.data) for (const ch of e.data) emit('key', ch);
      else if (e.inputType && e.inputType.indexOf('delete') === 0) emit('key', 'Backspace');
      caretOn = true; dirty();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); emit('key', 'Enter');
        const v = el.value; el.value = ''; input = ''; run(v);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); if (hi > 0) { el.value = input = hist[--hi]; dirty(); }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault(); hi = Math.min(hist.length, hi + 1); el.value = input = hist[hi] || ''; dirty();
      } else if (e.key === 'Tab') {
        e.preventDefault(); emit('key', 'Tab');
        const v = el.value.toLowerCase();
        const hit = Object.keys(cmds).filter((c) => c.indexOf(v) === 0);
        if (v && hit.length === 1) { el.value = input = hit[0] + ' '; dirty(); }
        else if (v && hit.length > 1) { pushRaw([{ t: PROMPT, c: 'acc' }, { t: el.value, c: 'ink' }]); print('<dim>' + hit.join('  ') + '</dim>'); }
      } else if (e.key === 'Escape') {
        e.preventDefault(); emit('exit');
      } else if (e.key === 'PageUp') {
        e.preventDefault(); scrollBy(rows - 2);
      } else if (e.key === 'PageDown') {
        e.preventDefault(); scrollBy(-(rows - 2));
      } else if (e.key === 'Shift') {
        emit('key', 'Shift');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault(); cmds.clear();
      }
    });
  }

  function scrollBy(n) { scroll += n; dirty(); }
  function setLive(el) { live = el; }

  document.addEventListener('jt:theme', () => { palette = readPalette(); dirty(); });
  setInterval(() => { if (power >= 1) { caretOn = !caretOn; dirty(); } }, 530);

  measure();
  if (document.fonts && document.fonts.load) {
    document.fonts.load(FONT).then(() => { measure(); dirty(); }).catch(() => {});
  }
  render();

  return { canvas, on, bindInput, powerOn, getPower, isBooted: () => booted, run, typeAndRun, demo, cancelDemo, scrollBy, setLive, print };
}
