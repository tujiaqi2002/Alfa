/* Console section: wires the terminal to the 3D desk scene (or a flat CRT fallback). */

// Forward this module's ?v= cache-buster to the modules it loads
const VER = new URL(import.meta.url).search;
const stage = document.querySelector('[data-pc]');
if (stage) import('./terminal.js' + VER).then((m) => init(stage, m.createTerminal));

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

function init(stage, createTerminal) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const input = stage.querySelector('[data-pc-input]');
  const hint = stage.querySelector('[data-pc-hint]');
  const term = createTerminal();
  term.bindInput(input);
  term.setLive(stage.querySelector('[data-pc-live]'));

  let scene = null, loadP = null, powerP = null;
  const want3d = webglAvailable();
  if (want3d) document.documentElement.classList.add('has-pc3d');
  const focused = () => document.activeElement === input;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Bring the whole console into view so a zoomed-in screen is never half off the page
  let autoScroll = false, autoT = 0;
  function centerStage() {
    const r = stage.getBoundingClientRect();
    if (Math.abs(r.top + r.height / 2 - innerHeight / 2) < 24) return;
    autoScroll = true;
    clearTimeout(autoT);
    autoT = setTimeout(() => { autoScroll = false; }, 1600);
    stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }
  addEventListener('scrollend', () => { autoScroll = false; });

  function activate() {
    input.focus({ preventScroll: true });
    centerStage();
    ensurePower();
  }

  const HINTS = { wide: 'Click the screen to type', screen: 'Esc to step back', note: 'Click or Esc to step back' };
  function showHint(v) { if (hint) hint.textContent = HINTS[v] || HINTS.wide; }
  function onView(v) {
    showHint(v);
    if (v === 'note') centerStage();
  }

  input.addEventListener('focus', () => {
    stage.classList.add('is-active');
    showHint('screen');
    if (scene) scene.setZoom(true);
  });
  input.addEventListener('blur', () => {
    stage.classList.remove('is-active');
    showHint('wide');
    if (scene) scene.setZoom(false);
  });
  term.on('exit', () => input.blur());

  function flat() {
    document.documentElement.classList.remove('has-pc3d');
    stage.classList.add('pc--flat', 'is-ready');
    const frame = document.createElement('div');
    frame.className = 'pc__flat';
    term.canvas.className = 'pc__flatscreen';
    frame.appendChild(term.canvas);
    frame.addEventListener('click', activate);
    stage.insertBefore(frame, stage.firstChild);
  }

  function ensureScene() {
    if (loadP) return loadP;
    if (!want3d) { flat(); return (loadP = Promise.resolve()); }
    loadP = import('./pc-scene.js' + VER)
      .then((m) => {
        scene = m.mountScene(stage, term, { reduce, onActivate: activate, onView });
        stage.classList.add('is-ready');
        if (focused()) scene.setZoom(true);
      })
      .catch((err) => {
        console.warn('3D scene unavailable, using flat terminal.', err);
        flat();
      });
    return loadP;
  }

  function ensurePower() {
    if (powerP) return powerP;
    powerP = ensureScene()
      .then(() => term.powerOn())
      .then(() => { if (!reduce && !focused()) term.demo(['whoami', 'agents']); });
    return powerP;
  }

  stage.querySelectorAll('[data-cmd]').forEach((b) => {
    b.addEventListener('click', () => {
      ensurePower().then(() => { term.cancelDemo(); term.typeAndRun(b.getAttribute('data-cmd'), () => 26); });
    });
  });
  const focusBtn = stage.querySelector('[data-pc-focus]');
  if (focusBtn) focusBtn.addEventListener('click', activate);

  stage.addEventListener('wheel', (e) => {
    if (!focused()) return;
    // Scroll the terminal history; once it hits either end, let the page scroll as usual
    if (term.scrollBy(e.deltaY > 0 ? -3 : 3)) e.preventDefault();
  }, { passive: false });

  function goTo() {
    activate();
  }
  addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.key === '`' || e.key === '~') { e.preventDefault(); goTo(); }
  });
  document.querySelectorAll('[data-term-open]').forEach((b) => b.addEventListener('click', goTo));

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { if (en[0].isIntersecting) ensureScene(); }, { rootMargin: '700px 0px' }).observe(stage);
    new IntersectionObserver((en) => { if (en[0].isIntersecting) ensurePower(); }, { threshold: 0.45 }).observe(stage);
    // Scrolling the console mostly out of view steps back out of the screen / note zoom.
    // Touch devices are skipped: the on-screen keyboard shrinks the viewport while typing.
    new IntersectionObserver((en) => {
      if (autoScroll || en[0].intersectionRatio >= 0.5) return;
      if (focused() && finePointer) input.blur();
      if (scene) scene.stepBack();
    }, { threshold: [0, 0.25, 0.5] }).observe(stage);
  } else {
    ensurePower();
  }
}
