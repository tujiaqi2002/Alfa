/* Console section: wires the terminal to the 3D desk scene (or a flat CRT fallback). */
import { createTerminal } from './terminal.js';

const stage = document.querySelector('[data-pc]');
if (stage) init(stage);

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

function init(stage) {
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

  function activate() {
    input.focus({ preventScroll: true });
    ensurePower();
  }

  input.addEventListener('focus', () => {
    stage.classList.add('is-active');
    if (hint) hint.textContent = 'Esc to step back';
    if (scene) scene.setZoom(true);
  });
  input.addEventListener('blur', () => {
    stage.classList.remove('is-active');
    if (hint) hint.textContent = 'Click the screen to type';
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
    loadP = import('./pc-scene.js')
      .then((m) => {
        scene = m.mountScene(stage, term, { reduce, onActivate: activate });
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
    e.preventDefault();
    term.scrollBy(e.deltaY > 0 ? -3 : 3);
  }, { passive: false });

  function goTo() {
    activate();
    stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
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
  } else {
    ensurePower();
  }
}
