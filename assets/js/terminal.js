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
const HOME = '/home/guest';
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
  let cwd = HOME, prevDir = HOME;
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
  function inputRows() { return wrap([{ t: prompt(), c: 'acc' }, { t: input, c: 'ink' }]); }
  function maxScroll() { return Math.max(0, allRows().length - Math.max(1, rows - inputRows().length)); }

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
    const inRows = inputRows();
    const avail = Math.max(1, rows - inRows.length);
    scroll = Math.max(0, Math.min(scroll, maxScroll()));
    const start = Math.max(0, all.length - avail - scroll);
    let y = PAD_Y;
    all.slice(start, start + avail).forEach((r) => { drawRow(r, y); y += LH; });

    if (scroll > 0) {
      ctx.fillStyle = palette.dim; ctx.shadowColor = palette.dim;
      ctx.fillText('-- scrolled ' + scroll + ' lines · PgDn / type to return --', PAD_X, y);
    } else if (booted) {
      let x = PAD_X;
      inRows.forEach((r, i) => { x = drawRow(r, y); if (i < inRows.length - 1) y += LH; });
      const ghost = suggestion().slice(0, Math.max(0, cols - Math.round((x - PAD_X) / charW)));
      if (ghost) { ctx.fillStyle = palette.dim; ctx.shadowColor = palette.dim; ctx.fillText(ghost, x, y); }
      if (caretOn) {
        ctx.shadowColor = palette.acc;
        if (focused || demoActive) {
          ctx.fillStyle = palette.acc; ctx.fillRect(x, y + 2, charW, LH - 6);
          if (ghost) { ctx.fillStyle = palette.bg; ctx.fillText(ghost[0], x, y); }
        }
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
  function printPlain(text) { String(text).split('\n').forEach((l) => pushRaw([{ t: l, c: 'ink' }])); }
  const strip = (s) => String(s).replace(/<\/?(acc|dim|err|ink)>/g, '');

  const TXT = {
    about: 'Data engineer with 3+ years designing, building and supporting enterprise data platforms on AWS & Databricks. Configuration-driven ETL, multi-source ingestion, Customer 360, MDM, SCD, data quality and performance tuning with Python, PySpark and SQL.\n<dim>BASc, University of Toronto — Software Engineering, minor in AI.</dim>',
    agents: [
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
    ].join('\n'),
    contact: [
      '<acc>email</acc>     321756623tu@gmail.com',
      '<acc>phone</acc>     +1 604-404-6680',
      '<acc>linkedin</acc>  linkedin.com/in/jiaqitu',
      '<acc>github</acc>    github.com/tujiaqi2002',
      '<dim>tip: open email | open linkedin | open github</dim>'
    ].join('\n'),
    quests: table(['status', 'quest', 'when'], [
      ['IN PROGRESS', 'Data Engineer @ 407 ETR', 'May 2023 - now'],
      ['CLEARED', 'BASc, University of Toronto', '2021 - 2025'],
      ['CLEARED', 'Academic Tutor @ Easy Group', 'Jul - Dec 2022']
    ])
  };

  /* ---------- tiny read-only filesystem ---------- */
  // Directories are plain objects; files are strings (text) or { kind: 'url' | 'bin' }.
  const link = (url) => ({ kind: 'url', url });
  const projectFiles = { 'README.md': 'side projects. <acc>open <name></acc> launches one, e.g. open teemo' };
  Object.keys(PROJECTS).forEach((k) => { projectFiles[k + '.url'] = link(PROJECTS[k]); });
  const FS = {
    bin: {},
    etc: {
      hostname: 'jiaqi-tu',
      motd: "welcome to jiaqi.os. type 'help' to look around.",
      'os-release': 'NAME="JiaqiOS"\nVERSION="2026.10"\nID=jiaqi\nPRETTY_NAME="JiaqiOS 2026.10 (Medallion)"'
    },
    home: {
      guest: {
        'about.txt': TXT.about,
        'agents.md': TXT.agents,
        'contact.txt': TXT.contact,
        'quests.log': TXT.quests,
        'skills.sql': 'SELECT * FROM skills;  <dim>-- try running it</dim>',
        'resume.pdf': link(LINKS.resume),
        '.plan': 'ship clean data. automate the boring parts. touch grass on weekends.',
        projects: projectFiles
      }
    },
    tmp: {},
    var: { log: { 'pipeline.log': '[bronze] ingest 12 sources ......... ok\n[silver] conform + dedupe .......... ok\n[gold]   publish customer_360 ..... ok' } }
  };
  const isDir = (n) => !!n && typeof n === 'object' && !n.kind;
  function resolve(p) {
    if (!p || p === '~') return HOME;
    if (p.indexOf('~/') === 0) p = HOME + p.slice(1);
    else if (p[0] !== '/') p = cwd + '/' + p;
    const out = [];
    p.split('/').forEach((s) => { if (!s || s === '.') return; if (s === '..') out.pop(); else out.push(s); });
    return '/' + out.join('/');
  }
  function nodeAt(path) {
    let n = FS;
    for (const s of path.split('/').filter(Boolean)) {
      if (!isDir(n) || !Object.prototype.hasOwnProperty.call(n, s)) return undefined;
      n = n[s];
    }
    return n;
  }
  const disp = (path) => (path === HOME ? '~' : path.indexOf(HOME + '/') === 0 ? '~' + path.slice(HOME.length) : path);
  function prompt() { return 'guest@jiaqi-tu:' + disp(cwd) + '$ '; }
  const fileText = (n) => (typeof n === 'string' ? n : '');
  function flags(a) {
    const f = {}, rest = [];
    a.forEach((x) => { if (/^-[a-z]+$/i.test(x)) x.slice(1).split('').forEach((c) => { f[c] = true; }); else rest.push(x); });
    return { f, rest };
  }
  // Shared lookup for cat/head/tail/grep/wc: returns the node or prints the error and returns null
  function needFile(cmd, p) {
    if (!p) { err(cmd + ': missing file operand'); return null; }
    const n = nodeAt(resolve(p));
    if (n === undefined) { err(cmd + ': ' + p + ': No such file or directory'); return null; }
    if (isDir(n)) { err(cmd + ': ' + p + ': Is a directory'); return null; }
    return n;
  }
  function stamp() {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'short' }) + ' ' + String(d.getDate()).padStart(2) + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  const readOnly = (cmd) => (a) => {
    const target = a.filter((x) => x[0] !== '-').pop() || '';
    if (cmd === 'rm' && /r/.test(a.join(' ')) && /^(\/|~|\*|\/\*)$/.test(target)) {
      return print('<acc>nice try.</acc> production data is protected by IAM.');
    }
    err(cmd + ": cannot modify '" + (target || '.') + "': Read-only file system");
  };
  const say = (msg) => () => print(msg);

  const MAN = {
    ls: 'list directory contents  <dim>ls [-a] [-l] [path]</dim>',
    cd: 'change directory  <dim>cd [path] | cd .. | cd ~ | cd -</dim>',
    pwd: 'print the working directory',
    cat: 'print a file  <dim>cat <file></dim>',
    tree: 'show the directory tree  <dim>tree [path]</dim>',
    grep: 'search text  <dim>grep [-i] [-r] <pattern> <file|dir></dim>',
    head: 'first lines of a file  <dim>head [-n N] <file></dim>',
    tail: 'last lines of a file  <dim>tail [-n N] <file></dim>',
    find: 'find files  <dim>find [path] [-name <glob>]</dim>',
    wc: 'count lines, words and characters  <dim>wc <file></dim>',
    echo: 'print text  <dim>echo $USER</dim>',
    open: 'launch a project, link or .url file  <dim>open teemo | open projects/2048.url</dim>',
    select: 'query the skills table  <dim>SELECT * FROM skills WHERE category=cloud;</dim>',
    man: 'this manual  <dim>man <command></dim>'
  };
  const FORTUNES = [
    'Idempotent jobs sleep better at night.',
    'There are 2 hard problems in computer science: cache invalidation, naming things, and off-by-one errors.',
    'SELECT * is a lifestyle, not a query.',
    'It works on my machine. — everyone, before containers',
    'Data is the new oil: valuable, messy, and occasionally on fire.',
    'A pipeline without data quality checks is just a very fast way to be wrong.'
  ];

  // Lay items out in aligned columns so a long listing never breaks a name across lines
  function columns(items) {
    if (!items.length) return;
    const colW = Math.max(...items.map((it) => it.t.length)) + 2;
    const fitsOneLine = items.reduce((n, it) => n + it.t.length + 2, -2) <= cols;
    const perRow = fitsOneLine ? items.length : Math.max(1, Math.floor((cols + 2) / colW));
    for (let i = 0; i < items.length; i += perRow) {
      const segs = [];
      items.slice(i, i + perRow).forEach((it, j, row) => {
        segs.push(it);
        if (j < row.length - 1) segs.push({ t: ' '.repeat(fitsOneLine ? 2 : colW - it.t.length), c: 'ink' });
      });
      pushRaw(segs);
    }
  }

  function sliceLines(cmd, a) {
    let num = 10;
    const rest = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] === '-n') num = parseInt(a[++i], 10) || 10;
      else if (/^-\d+$/.test(a[i])) num = parseInt(a[i].slice(1), 10);
      else rest.push(a[i]);
    }
    const n = needFile(cmd, rest[0]);
    if (!n) return;
    const lines = fileText(n).split('\n');
    print((cmd === 'head' ? lines.slice(0, num) : lines.slice(-num)).join('\n'));
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
        '  ls cd cat pwd    shell basics <dim>(+ tree grep head tail find wc man)</dim>',
        '  clear | exit',
        '<dim>tab or → autocompletes · ↑ ↓ history</dim>'
      ].join('\n'));
    },
    whoami() { print('jiaqi tu — data engineer @ 407 ETR · toronto, on'); },
    about() { print(TXT.about); },
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
    agents() { print(TXT.agents); },

    /* --- shell basics --- */
    pwd() { print(cwd); },
    cd(a) {
      const p = a[0];
      const target = p === '-' ? prevDir : resolve(p);
      const n = nodeAt(target);
      if (n === undefined) return err('cd: no such file or directory: ' + p);
      if (!isDir(n)) return err('cd: not a directory: ' + p);
      prevDir = cwd; cwd = target;
      if (p === '-') print(disp(cwd));
    },
    ls(a) {
      const { f, rest } = flags(a);
      const p = rest[0] || '.';
      const n = nodeAt(resolve(p));
      if (n === undefined) return err("ls: cannot access '" + p + "': No such file or directory");
      if (!isDir(n)) return print(p);
      let names = Object.keys(n).sort();
      if (!f.a) names = names.filter((x) => x[0] !== '.');
      else names = ['.', '..'].concat(names);
      if (!names.length) return;
      if (f.l) {
        const when = stamp();
        print('<dim>total ' + names.length + '</dim>');
        names.forEach((x) => {
          const c = x === '.' || x === '..' ? {} : n[x];
          const dir = isDir(c);
          const size = dir ? 4096 : c.kind === 'url' ? c.url.length : c.kind === 'bin' ? 16384 : strip(c).length;
          const meta = (dir ? 'drwxr-xr-x' : '-rw-r--r--') + '  guest guest ' + String(size).padStart(6) + ' ' + when + ' ';
          pushRaw([{ t: meta, c: 'dim' }, { t: dir ? x + '/' : x, c: dir ? 'acc' : 'ink' }]);
        });
        return;
      }
      const items = names.map((x) => {
        const dir = x === '.' || x === '..' || isDir(n[x]);
        return { t: dir ? x + '/' : x, c: dir ? 'acc' : 'ink' };
      });
      columns(items);
    },
    cat(a) {
      if (!a.length) return err('cat: missing file operand');
      a.forEach((p) => {
        const n = needFile('cat', p);
        if (!n) return;
        if (n.kind === 'url') {
          if (/\.pdf$/.test(p)) print('<dim>%PDF-1.7 ... binary file. try: open resume</dim>');
          else print(n.url + '  <dim>(open ' + p.split('/').pop() + ')</dim>');
        } else if (n.kind === 'bin') print('<dim>binary file. try running it: ' + p.split('/').pop() + '</dim>');
        else print(n);
      });
    },
    tree(a) {
      const p = a[0] || '.';
      const n = nodeAt(resolve(p));
      if (n === undefined) return err(p + ' [error opening dir]');
      if (!isDir(n)) return print(p);
      let dirs = 0, files = 0;
      pushRaw([{ t: p, c: 'acc' }]);
      (function walk(d, pre) {
        const names = Object.keys(d).filter((x) => x[0] !== '.').sort();
        names.forEach((x, i) => {
          const last = i === names.length - 1, dir = isDir(d[x]);
          pushRaw([{ t: pre + (last ? '└── ' : '├── '), c: 'dim' }, { t: dir ? x + '/' : x, c: dir ? 'acc' : 'ink' }]);
          if (dir) { dirs++; walk(d[x], pre + (last ? '    ' : '│   ')); } else files++;
        });
      })(n, '');
      print('<dim>' + dirs + (dirs === 1 ? ' directory, ' : ' directories, ') + files + (files === 1 ? ' file' : ' files') + '</dim>');
    },
    head(a) { sliceLines('head', a); },
    tail(a) { sliceLines('tail', a); },
    wc(a) {
      const p = flags(a).rest[0];
      const n = needFile('wc', p);
      if (!n) return;
      const t = strip(fileText(n));
      print('  ' + t.split('\n').length + '  ' + (t.match(/\S+/g) || []).length + '  ' + t.length + ' ' + p);
    },
    grep(a) {
      const { f, rest } = flags(a);
      const pat = rest[0], targets = rest.slice(1);
      if (!pat || !targets.length) return err('usage: grep [-i] [-r] <pattern> <file|dir>');
      let re;
      try { re = new RegExp(pat.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'), f.i ? 'gi' : 'g'); }
      catch (e) { return err('grep: bad pattern'); }
      const files = [];
      targets.forEach((t) => {
        const n = nodeAt(resolve(t));
        if (n === undefined) return err('grep: ' + t + ': No such file or directory');
        if (isDir(n)) {
          if (!f.r) return err('grep: ' + t + ': Is a directory');
          (function walk(d, base) {
            Object.keys(d).sort().forEach((x) => { if (isDir(d[x])) walk(d[x], base + x + '/'); else files.push([base + x, d[x]]); });
          })(n, t.replace(/\/?$/, '/'));
        } else files.push([t, n]);
      });
      let hits = 0;
      files.forEach(([name, n]) => {
        strip(fileText(n)).split('\n').forEach((line) => {
          re.lastIndex = 0;
          if (!re.test(line)) return;
          hits++;
          const segs = files.length > 1 ? [{ t: name + ':', c: 'dim' }] : [];
          let last = 0, m;
          re.lastIndex = 0;
          while ((m = re.exec(line)) && m[0]) {
            if (m.index > last) segs.push({ t: line.slice(last, m.index), c: 'ink' });
            segs.push({ t: m[0], c: 'acc' });
            last = m.index + m[0].length;
          }
          if (last < line.length) segs.push({ t: line.slice(last), c: 'ink' });
          pushRaw(segs);
        });
      });
      if (!hits && files.length) print('<dim>(no matches)</dim>');
    },
    find(a) {
      let start = '.', name = null;
      for (let i = 0; i < a.length; i++) {
        if (a[i] === '-name' || a[i] === '-iname') name = a[++i];
        else if (a[i][0] !== '-') start = a[i];
      }
      const n = nodeAt(resolve(start));
      if (n === undefined) return err("find: '" + start + "': No such file or directory");
      const re = name ? new RegExp('^' + name.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i') : null;
      const out = [];
      const base = start.replace(/\/$/, '') || '/';
      if (!re) out.push(base);
      (function walk(d, path) {
        if (!isDir(d)) return;
        Object.keys(d).sort().forEach((x) => {
          const full = (path === '/' ? '' : path) + '/' + x;
          if (!re || re.test(x)) out.push(full);
          walk(d[x], full);
        });
      })(n, base);
      print(out.join('\n'));
    },
    echo(a, raw) {
      const env = { USER: 'guest', HOME, PWD: cwd, SHELL: '/bin/jsh', HOSTNAME: 'jiaqi-tu', LANG: 'en_CA.UTF-8' };
      const text = raw.replace(/^echo\s?/i, '').replace(/^(['"])(.*)\1$/, '$2').replace(/\$\{?(\w+)\}?/g, (m, k) => (k in env ? env[k] : ''));
      if (/(^|[^\\])>/.test(text)) return err('jsh: read-only file system');
      pushRaw([{ t: text, c: 'ink' }]);
    },
    env() { print(['USER=guest', 'HOME=' + HOME, 'PWD=' + cwd, 'SHELL=/bin/jsh', 'HOSTNAME=jiaqi-tu', 'LANG=en_CA.UTF-8', 'EDITOR=vim  <dim># bold choice</dim>'].join('\n')); },
    uname(a) { print(a.join('').indexOf('a') >= 0 ? 'JiaqiOS jiaqi-tu 2026.10 #1 SMP x86_64 GNU/Linux' : 'JiaqiOS'); },
    hostname() { print('jiaqi-tu'); },
    uptime() {
      const d = Math.floor((Date.now() - CAREER_START) / 864e5);
      const t = new Date().toTimeString().slice(0, 8);
      print(' ' + t + ' up ' + d + ' days, 1 user, load average: 0.42, 0.37, 0.33  <dim>(' + years() + ' yrs in production)</dim>');
    },
    id() { print('uid=1000(guest) gid=1000(guest) groups=1000(guest),100(visitors)'); },
    groups() { print('guest visitors'); },
    who() { print('guest    tty1    ' + stamp()); },
    which(a) {
      if (!a.length) return;
      a.forEach((c) => { if (cmds[c.toLowerCase()]) print('/bin/' + c.toLowerCase()); else err(c + ' not found'); });
    },
    man(a) {
      const c = (a[0] || '').toLowerCase();
      if (!c) { print('<dim>what manual page do you want? e.g. man ls</dim>'); return cmds.help(); }
      if (MAN[c]) return print('<acc>' + c + '</acc> - ' + MAN[c]);
      if (cmds[c]) return print('<acc>' + c + '</acc> - built-in. see <acc>help</acc>');
      err('No manual entry for ' + c);
    },
    ps() {
      printPlain([
        '  PID TTY          TIME CMD',
        '    1 ?        00:00:01 init',
        '   42 tty1     00:13:37 pyspark',
        '   77 tty1     00:00:42 agent-orchestrator',
        '  101 tty1     00:00:00 jsh',
        '  108 tty1     00:00:00 ps'
      ].join('\n'));
    },
    kill(a) { err('kill: (' + (a.filter((x) => x[0] !== '-')[0] || '?') + ') - Operation not permitted'); },
    df() {
      printPlain('Filesystem       Size  Used Avail Use% Mounted on\ns3://portfolio   5.0P  1.2T  5.0P   1% /\ntmpfs            512M     0  512M   0% /tmp');
    },
    du(a) { print('42K\t' + (flags(a).rest[0] || '.')); },
    free() {
      printPlain('               total        used        free\nMem:            16Gi       3.1Gi        12Gi\nSwap:          2.0Gi          0B       2.0Gi');
    },
    ping(a) {
      const h = flags(a).rest[0];
      if (!h) return err('ping: usage error: destination address required');
      print('PING ' + h + ': 56 data bytes');
      for (let i = 0; i < 3; i++) print('64 bytes from ' + h + ': icmp_seq=' + i + ' ttl=57 time=' + (8 + Math.random() * 9).toFixed(1) + ' ms');
      print('<dim>--- ' + h + ' ping statistics --- 3 packets transmitted, 3 received, 0% packet loss</dim>');
    },
    curl() { print('<dim>network is sandboxed here. try: open github</dim>'); },
    ssh(a) { err('ssh: connect to host ' + (flags(a).rest[0] || 'localhost') + ' port 22: Connection refused'); },
    git(a) {
      const sub = a[0] || '';
      if (sub === 'status') return print("On branch main\nYour branch is up to date with 'origin/main'.\n\nnothing to commit, working tree clean");
      if (sub === 'log') {
        return print([
          '<acc>commit 9f3c2e1</acc> (HEAD -> main)', 'Author: Jiaqi Tu', '    feat: config-driven ingestion for 12 sources', '',
          '<acc>commit 4b7d0a8</acc>', 'Author: Jiaqi Tu', '    fix: make SCD2 merge idempotent', '',
          '<acc>commit 1e9a6f2</acc>', 'Author: Jiaqi Tu', '    chore: let the review agent nitpick first'
        ].join('\n'));
      }
      if (sub === 'branch') return print('* <acc>main</acc>');
      print('<dim>usage: git status | git log | git branch</dim>');
    },
    python() { print('<dim>interactive interpreters are disabled here. try: SELECT * FROM skills;</dim>'); },
    vim() { print("<dim>this is a read-only system (and you might never get out). try: cat about.txt</dim>"); },
    apt() { err('permission denied: all dependencies are vendored. nothing to install.'); },
    fortune() { print(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]); },
    cowsay(a, raw) {
      const text = raw.replace(/^cowsay\s?/i, '') || 'moo. hire jiaqi.';
      printPlain([
        ' ' + '_'.repeat(text.length + 2),
        '< ' + text + ' >',
        ' ' + '-'.repeat(text.length + 2),
        '        \\   ^__^',
        '         \\  (oo)\\_______',
        '            (__)\\       )\\/\\',
        '                ||----w |',
        '                ||     ||'
      ].join('\n'));
    },
    reboot() { cmds.clear(); cwd = HOME; boot(); },

    /* --- portfolio --- */
    skills() { cmds.select(['*', 'from', 'skills']); },
    select(a) {
      const q = a.join(' ').toLowerCase().replace(/;\s*$/, '');
      if (!/from\s+skills/.test(q)) return err('ERROR: relation does not exist. hint: SELECT * FROM skills;');
      let body = SKILLS.slice();
      const m = q.match(/where\s+category\s*=\s*'?(\w+)'?/);
      if (m) body = body.filter((r) => r[0] === m[1]);
      printPlain(table(['category', 'skill'], body));
      print('<dim>(' + body.length + ' rows)</dim>');
    },
    quests() { printPlain(TXT.quests); },
    projects() {
      Object.keys(PROJECTS).forEach((k) => pushRaw([{ t: '  ' + k.padEnd(11), c: 'acc' }, { t: PROJECTS[k].replace('https://', ''), c: 'dim' }]));
      print('<dim>usage: open <name></dim>');
    },
    open(a) {
      const raw = a[0] || '';
      const k = raw.toLowerCase();
      let url = PROJECTS[k] || LINKS[k], label = k;
      if (!url && raw) {
        const n = nodeAt(resolve(raw));
        if (n && n.kind === 'url') { url = n.url; label = raw.split('/').pop(); }
      }
      if (!url) return err('open: unknown target "' + raw + '". try: projects');
      print('launching ' + label + ' ...');
      openUrl(url);
    },
    contact() { print(TXT.contact); },
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
  const alias = (names, fn) => names.split(' ').forEach((n) => { cmds[n] = fn; });
  alias('experience', cmds.quests);
  alias('work', cmds.projects);
  alias('ai', cmds.agents);
  alias('dir', cmds.ls);
  alias('ll', (a) => cmds.ls(['-la'].concat(a)));
  alias('la', (a) => cmds.ls(['-a'].concat(a)));
  alias('less more bat', cmds.cat);
  alias('cls', cmds.clear);
  alias('logout', cmds.exit);
  alias('top htop', cmds.ps);
  alias('printenv', cmds.env);
  alias('whereis type', cmds.which);
  alias('w', cmds.who);
  alias('wget', cmds.curl);
  alias('python3 node pyspark java irb', cmds.python);
  alias('vi nano emacs code', cmds.vim);
  alias('apt-get brew pip pip3 npm yarn yum', cmds.apt);
  const NOOPS = 'export true false alias unalias source set unset';
  alias(NOOPS, () => {});
  alias('shutdown poweroff halt', cmds.exit);
  'mkdir touch rm rmdir mv cp chmod chown ln'.split(' ').forEach((c) => { cmds[c] = readOnly(c); });
  alias('lolcat sl', say('<dim>choo choo. (not installed)</dim>'));
  Object.keys(cmds).forEach((c) => { FS.bin[c] = { kind: 'bin' }; });

  function tokens(line) {
    return (line.match(/"[^"]*"|'[^']*'|\S+/g) || []).map((t) => t.replace(/^(['"])([\s\S]*)\1$/, '$2'));
  }

  function run(raw) {
    const line = raw.trim();
    pushRaw([{ t: prompt(), c: 'acc' }, { t: raw, c: 'ink' }]);
    if (!line) return;
    hist.push(line); hi = hist.length;
    const parts = tokens(line);
    const name = parts[0].toLowerCase();
    const fn = Object.prototype.hasOwnProperty.call(cmds, name) ? cmds[name] : null;
    capture = [];
    if (fn) fn(parts.slice(1), line);
    else if (parts[0].indexOf('/') >= 0) {
      // Paths: /bin/<cmd> runs the built-in, anything else is a missing or non-executable file
      const path = resolve(parts[0]), n = nodeAt(path), base = path.split('/').pop();
      if (n && n.kind === 'bin' && cmds[base]) cmds[base](parts.slice(1), base + line.slice(parts[0].length));
      else if (n === undefined) err('jsh: no such file or directory: ' + parts[0]);
      else err('jsh: permission denied: ' + parts[0]);
    }
    else err('command not found: ' + parts[0] + ". type 'help'");
    if (live) live.textContent = capture.join('\n');
    capture = null;
    emit('run', line);
  }

  /* ---------- completion ---------- */
  // Silent no-op builtins still run, but would only clutter suggestions
  const completable = () => Object.keys(cmds).filter((c) => NOOPS.split(' ').indexOf(c) < 0);
  const PRIMARY = ['help', 'whoami', 'about', 'neofetch', 'agents', 'skills', 'quests', 'projects', 'open', 'contact', 'resume', 'theme', 'ls', 'cd', 'cat', 'pwd', 'tree', 'grep', 'man', 'clear', 'exit'];
  const commonPrefix = (list) => list.reduce((p, s) => { let i = 0; while (i < p.length && p[i] === s[i]) i++; return p.slice(0, i); });
  // Candidates for the last word of the line, aware of what each command takes: { head, base, list: [{ t, end }] }
  function candidates(v) {
    const pick = (head, base, names) => ({ head, base, list: names.filter((n) => n.indexOf(base) === 0).sort().map((n) => ({ t: n, end: ' ' })) });
    const sp = v.lastIndexOf(' ');
    if (sp < 0) return pick('', v.toLowerCase(), completable());
    const before = tokens(v.slice(0, sp));
    const cmd = (before[0] || '').toLowerCase(), argN = before.length;
    const head = v.slice(0, sp + 1), word = v.slice(sp + 1);
    if (/^(man|which|whereis|type)$/.test(cmd)) return pick(head, word.toLowerCase(), completable());
    if (cmd === 'theme' && argN === 1) return pick(head, word, ['light', 'dark']);
    if (cmd === 'git' && argN === 1) return pick(head, word, ['status', 'log', 'branch']);
    if (cmd === 'sudo' && argN === 1) return pick(head, word, ['hire-me']);
    if (cmd === 'open' && word.indexOf('/') < 0) {
      const named = pick(head, word.toLowerCase(), Object.keys(PROJECTS).concat(Object.keys(LINKS)));
      if (named.list.length) return named;
    }
    const slash = word.lastIndexOf('/');
    const dirPart = slash >= 0 ? word.slice(0, slash + 1) : '';
    const base = word.slice(dirPart.length);
    const d = nodeAt(resolve(dirPart || '.'));
    if (!isDir(d)) return null;
    let names = Object.keys(d).filter((n) => base[0] === '.' || n[0] !== '.');
    if (cmd === 'cd') names = names.filter((n) => isDir(d[n]));
    const r = pick(head + dirPart, base, names);
    r.list.forEach((it) => { if (isDir(d[it.t])) it.end = '/'; });
    return r;
  }
  function historyHint(v) {
    for (let i = hist.length - 1; i >= 0; i--) if (hist[i].length > v.length && hist[i].indexOf(v) === 0) return hist[i].slice(v.length);
    return '';
  }
  // Fish-style ghost text after the cursor: a unique/common completion, else the latest matching history line
  function suggestion() {
    if (!focused || !input) return '';
    const c = candidates(input);
    let full = '';
    if (c && c.list.length === 1) full = c.head + c.list[0].t + (c.list[0].end === '/' ? '/' : '');
    else if (c && c.list.length > 1) full = c.head + commonPrefix(c.list.map((it) => it.t));
    if (full.length > input.length && full.toLowerCase().indexOf(input.toLowerCase()) === 0) return full.slice(input.length);
    return historyHint(input);
  }
  function complete(el) {
    const v = el.value;
    const set = (s) => { el.value = input = s; dirty(); };
    const show = (list) => { pushRaw([{ t: prompt(), c: 'acc' }, { t: v, c: 'ink' }]); columns(list.map((t) => ({ t, c: 'dim' }))); };
    if (!v.trim()) return show(PRIMARY);
    const c = candidates(v);
    if (c && c.list.length === 1) return set(c.head + c.list[0].t + c.list[0].end);
    if (c && c.list.length > 1) {
      const pre = commonPrefix(c.list.map((it) => it.t));
      if (pre.length > c.base.length) return set(c.head + pre);
    }
    const h = historyHint(v);
    if (h) return set(v + h);
    if (c && c.list.length > 1) show(c.list.map((it) => it.t + (it.end === '/' ? '/' : '')));
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
        complete(el);
      } else if (e.key === 'ArrowRight' && el.selectionStart === el.value.length) {
        const g = suggestion();
        if (g) { e.preventDefault(); el.value = input = input + g; dirty(); }
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

  // Returns false when already at the end, so callers can let the page scroll instead
  function scrollBy(n) {
    const next = Math.max(0, Math.min(scroll + n, maxScroll()));
    if (next === scroll) return false;
    scroll = next; dirty();
    return true;
  }
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
