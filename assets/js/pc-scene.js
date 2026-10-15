/* Retro desk scene: a beige all-in-one PC whose CRT shows the live terminal. */
import * as THREE from '../vendor/three.module.min.js';

const V3 = THREE.Vector3;

function roundRect(path, w, h, r) {
  const x = -w / 2, y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

function roundedBox(w, h, d, r) {
  const iw = w - 2 * r, ih = h - 2 * r;
  const shape = roundRect(new THREE.Shape(), iw, ih, Math.min(r, iw / 2, ih / 2) * 0.8);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, d - 2 * r), bevelEnabled: true,
    bevelThickness: r, bevelSize: r, bevelSegments: 4, curveSegments: 8
  });
  g.center();
  return g;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function woodTexture() {
  return canvasTexture(1024, 512, (x, w, h) => {
    x.fillStyle = '#3b2a1c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y = Math.random() * h, a = Math.random() * 0.12;
      x.strokeStyle = Math.random() > 0.5 ? `rgba(20,12,6,${a})` : `rgba(120,86,55,${a})`;
      x.lineWidth = 0.5 + Math.random() * 2.5;
      x.beginPath(); x.moveTo(0, y);
      for (let px = 0; px <= w; px += 64) x.lineTo(px, y + Math.sin(px * 0.004 + i) * 5);
      x.stroke();
    }
  });
}

function glowTexture() {
  return canvasTexture(128, 128, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
}

function noteTexture() {
  return canvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = '#e8ff86'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(0,0,0,0.06)'; x.fillRect(0, 0, w, 34);
    x.fillStyle = '#1d2410';
    x.font = 'italic 500 40px "Inter Tight", "Helvetica Neue", Arial, sans-serif';
    x.fillText('type', 30, 100);
    x.font = '600 46px "JetBrains Mono", Menlo, monospace';
    x.fillText('help', 30, 160);
    x.font = 'italic 400 26px "Inter Tight", Arial, sans-serif';
    x.fillText('or: agents :)', 30, 214);
  });
}

function cardTexture() {
  const W = 1024, H = 1134;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const SANS = '"Inter Tight", "Helvetica Neue", Arial, sans-serif';
  const MONO = '"JetBrains Mono", Menlo, monospace';
  const P = 78;
  const draw = () => {
    x.fillStyle = '#f1ede3'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#16190f';
    x.font = '500 34px ' + MONO;
    x.fillText('README.TXT', P, 104);
    x.textAlign = 'right'; x.fillText('01 / 01', W - P, 104); x.textAlign = 'left';
    x.fillRect(P, 132, W - 2 * P, 3);
    x.fillStyle = '#c8ff2e'; x.fillRect(P, 186, 26, 26);
    x.fillStyle = '#16190f';
    x.font = '500 104px ' + SANS;
    x.fillText('Hi there,', P, 300);
    x.font = '400 54px ' + SANS;
    let y = 386, line = '';
    "it looks like you've spawned in my corner of the internet.".split(' ').forEach((w) => {
      const t = line ? line + ' ' + w : w;
      if (x.measureText(t).width > W - 2 * P && line) { x.fillText(line, P, y); y += 70; line = w; } else line = t;
    });
    if (line) { x.fillText(line, P, y); y += 70; }
    y += 34;
    x.fillStyle = 'rgba(22,25,15,0.25)'; x.fillRect(P, y, W - 2 * P, 2);
    y += 86;
    x.font = '500 46px ' + MONO;
    [['01', 'click the screen'], ['02', 'type  help'], ['03', 'esc to step back']].forEach((r) => {
      x.fillStyle = 'rgba(22,25,15,0.45)'; x.fillText(r[0], P, y);
      x.fillStyle = '#16190f'; x.fillText(r[1], P + 110, y);
      y += 74;
    });
    x.font = 'italic 500 48px ' + SANS;
    x.textAlign = 'right'; x.fillText('— Jiaqi', W - P, H - 70); x.textAlign = 'left';
    tex.needsUpdate = true;
  };
  draw();
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('500 104px "Inter Tight"'), document.fonts.load('400 54px "Inter Tight"'), document.fonts.load('500 46px "JetBrains Mono"')]).then(draw).catch(() => {});
  }
  return tex;
}

function rod(a, b, r, mat) {
  const dir = new V3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.normalize());
  return m;
}

/* Keyboard layout, widths in key units. */
const ROWS = [
  [['`', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['=', 1], ['Backspace', 2, 'mod']],
  [['Tab', 1.5, 'mod'], ['q', 1], ['w', 1], ['e', 1], ['r', 1], ['t', 1], ['y', 1], ['u', 1], ['i', 1], ['o', 1], ['p', 1], ['[', 1], [']', 1], ['\\', 1.5]],
  [['CapsLock', 1.75, 'mod'], ['a', 1], ['s', 1], ['d', 1], ['f', 1], ['g', 1], ['h', 1], ['j', 1], ['k', 1], ['l', 1], [';', 1], ["'", 1], ['Enter', 2.25, 'acc']],
  [['Shift', 2.25, 'mod'], ['z', 1], ['x', 1], ['c', 1], ['v', 1], ['b', 1], ['n', 1], ['m', 1], [',', 1], ['.', 1], ['/', 1], ['ShiftR', 2.75, 'mod']],
  [['Control', 1.5, 'mod'], ['Alt', 1.5, 'mod'], [' ', 9], ['AltR', 1.5, 'mod'], ['ControlR', 1.5, 'mod']]
];
const SHIFTED = { '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=', '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/' };

export function mountScene(stage, term, opts) {
  opts = opts || {};
  const reduce = !!opts.reduce;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const el = renderer.domElement;
  el.className = 'pc__gl';
  el.setAttribute('aria-hidden', 'true');
  stage.insertBefore(el, stage.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
  scene.fog = new THREE.Fog(0x0b0d0c, 6, 13);

  const M = {
    beige: new THREE.MeshStandardMaterial({ color: 0xd9cfb8, roughness: 0.55 }),
    beigeDark: new THREE.MeshStandardMaterial({ color: 0xbdb19a, roughness: 0.6 }),
    keyLight: new THREE.MeshStandardMaterial({ color: 0xebe3d1, roughness: 0.5 }),
    keyMod: new THREE.MeshStandardMaterial({ color: 0xa79b84, roughness: 0.55 }),
    keyAcc: new THREE.MeshStandardMaterial({ color: 0xc8ff2e, roughness: 0.45, emissive: 0x88b000, emissiveIntensity: 0.35 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b1c1b, roughness: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x262827, roughness: 0.35, metalness: 0.75, side: THREE.DoubleSide }),
    cable: new THREE.MeshStandardMaterial({ color: 0x2b2b29, roughness: 0.85 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x141715, roughness: 1 }),
    led: new THREE.MeshBasicMaterial({ color: 0xc8ff2e }),
    ledOff: new THREE.MeshStandardMaterial({ color: 0x3a3a36, roughness: 0.4 }),
    hdd: new THREE.MeshBasicMaterial({ color: 0xffb547 })
  };

  /* ---------- room ---------- */
  const wood = woodTexture();
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  wood.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const desk = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.14, 3.4), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.75 }));
  desk.position.set(0, -0.07, 0.25);
  desk.receiveShadow = true;
  scene.add(desk);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(18, 10), M.wall);
  wall.position.set(0, 3.6, -1.45);
  wall.receiveShadow = true;
  scene.add(wall);

  /* ---------- computer ---------- */
  const pc = new THREE.Group();
  scene.add(pc);
  const add = (geo, mat, x, y, z, parent) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    (parent || pc).add(m); return m;
  };

  add(roundedBox(1.56, 0.2, 1.22, 0.035), M.beige, 0, 0.1, -0.22);
  const FRONT = 0.07;
  add(roundedBox(1.3, 1.0, 0.86, 0.06), M.beige, 0, 0.705, -0.36);
  add(roundedBox(0.92, 0.74, 0.5, 0.06), M.beigeDark, 0, 0.72, -1.0);

  // Vent grooves on the side of the housing
  for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.01, 0.012, 0.42), M.dark, 0.652, 1.02 - i * 0.045, -0.36);

  // Bezel ring around the CRT
  const SCR_W = 0.94, SCR_H = 0.705, SCR_Y = 0.735;
  const ring = roundRect(new THREE.Shape(), 1.12, 0.86, 0.07);
  ring.holes.push(roundRect(new THREE.Path(), SCR_W, SCR_H, 0.05));
  const bezel = add(new THREE.ExtrudeGeometry(ring, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 10 }), M.beigeDark, 0, SCR_Y, FRONT - 0.01);

  // Curved CRT glass carrying the terminal texture
  const screenTex = new THREE.CanvasTexture(term.canvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const sg = new THREE.PlaneGeometry(SCR_W, SCR_H, 32, 24);
  const pos = sg.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (SCR_W / 2), y = pos.getY(i) / (SCR_H / 2);
    pos.setZ(i, 0.028 * (1 - x * x) * (1 - y * y));
  }
  sg.computeVertexNormals();
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  const screen = new THREE.Mesh(sg, screenMat);
  screen.position.set(0, SCR_Y, FRONT + 0.004);
  pc.add(screen);

  // Fake bloom halo over the screen
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.25), new THREE.MeshBasicMaterial({
    map: glowTexture(), color: 0xc8ff2e, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  }));
  halo.position.set(0, SCR_Y, FRONT + 0.07);
  pc.add(halo);

  // Knob + LEDs on the left of the bezel
  const knob = add(new THREE.CylinderGeometry(0.024, 0.024, 0.025, 24), M.beigeDark, -0.607, 0.47, FRONT + 0.01);
  knob.rotation.x = Math.PI / 2;
  const ledPower = add(new THREE.SphereGeometry(0.01, 12, 8), M.ledOff, -0.607, 0.39, FRONT + 0.005);
  const ledHdd = add(new THREE.SphereGeometry(0.01, 12, 8), M.ledOff, -0.607, 0.355, FRONT + 0.005);

  // Base front: floppy drive, vents, brand stripe
  const BASE_FRONT = -0.22 + 0.61;
  add(new THREE.BoxGeometry(0.38, 0.03, 0.02), M.dark, 0.43, 0.1, BASE_FRONT + 0.002);
  add(new THREE.BoxGeometry(0.05, 0.02, 0.02), M.beigeDark, 0.67, 0.1, BASE_FRONT + 0.004);
  for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(0.008, 0.07, 0.01), M.dark, -0.2 + i * 0.03, 0.1, BASE_FRONT + 0.001);
  add(new THREE.BoxGeometry(0.14, 0.012, 0.01), M.led, -0.58, 0.1, BASE_FRONT + 0.003);

  // Sticky note
  const note = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), new THREE.MeshStandardMaterial({ map: noteTexture(), roughness: 0.9 }));
  note.position.set(0.6, 1.08, FRONT + 0.062);
  note.rotation.z = -0.14;
  note.castShadow = true;
  pc.add(note);

  const wideMQ = matchMedia('(min-width: 901px)');

  /* ---------- keyboard ---------- */
  const kb = new THREE.Group();
  kb.position.set(0, 0.016, 0.74);
  kb.rotation.x = 0.06;
  pc.add(kb);
  add(roundedBox(1.44, 0.075, 0.5, 0.022), M.beige, 0, 0.0375, 0, kb);
  add(new THREE.BoxGeometry(1.32, 0.01, 0.43), M.beigeDark, 0, 0.073, -0.02, kb);

  const U = 0.083, keyGeo = new THREE.BoxGeometry(1, 1, 1);
  const keys = {};
  const keyList = [];
  ROWS.forEach((row, r) => {
    const total = row.reduce((s, k) => s + k[1], 0);
    let x = -(total * U) / 2;
    row.forEach((k) => {
      const w = k[1] * U;
      const mat = k[2] === 'acc' ? M.keyAcc : k[2] === 'mod' ? M.keyMod : M.keyLight;
      const m = new THREE.Mesh(keyGeo, mat);
      m.scale.set(w - 0.013, 0.03, U - 0.014);
      m.position.set(x + w / 2, 0.093, -0.185 + r * U);
      m.castShadow = true; m.receiveShadow = true;
      m.userData = { baseY: 0.093, press: 0 };
      kb.add(m);
      keys[k[0]] = m; keyList.push(m);
      x += w;
    });
  });

  function press(key) {
    const names = [];
    if (key === 'Enter' || key === 'Backspace' || key === 'Tab' || key === 'Shift') names.push(key);
    else if (key === ' ') names.push(' ');
    else if (key.length === 1) {
      const lower = key.toLowerCase();
      if (keys[lower]) { names.push(lower); if (lower !== key) names.push('Shift'); }
      else if (SHIFTED[key]) { names.push(SHIFTED[key], 'Shift'); }
    }
    names.forEach((n) => { const k = keys[n]; if (k) k.userData.press = 1; });
    if (!names.length) keyList[Math.floor(Math.random() * keyList.length)].userData.press = 1;
  }
  term.on('key', press);

  // Coiled cable from keyboard to base
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new V3(-0.5, 0.04, 0.49), new V3(-0.6, 0.012, 0.45), new V3(-0.76, 0.012, 0.38),
    new V3(-0.86, 0.013, 0.12), new V3(-0.84, 0.02, -0.4), new V3(-0.7, 0.05, -0.75)
  ]), 64, 0.011, 8), M.cable);
  cable.castShadow = true;
  scene.add(cable);

  /* ---------- lamp ---------- */
  const lampBase = new V3(-1.78, 0, -0.42);
  const elbow = new V3(-1.56, 0.98, -0.6);
  const head = new V3(-1.05, 1.32, -0.18);
  const target = new V3(-0.45, 0, 0.5);
  const dir = new V3().subVectors(target, head).normalize();
  const lamp = new THREE.Group(); scene.add(lamp);
  const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.05, 40), M.metal);
  lb.position.copy(lampBase).setY(0.025); lb.castShadow = true; lb.receiveShadow = true; lamp.add(lb);
  [rod(new V3(lampBase.x, 0.05, lampBase.z), elbow, 0.017, M.metal), rod(elbow, head, 0.015, M.metal)].forEach((r) => { r.castShadow = true; lamp.add(r); });
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), M.metal); joint.position.copy(elbow); lamp.add(joint);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 40, 1, true), M.metal);
  shade.quaternion.setFromUnitVectors(new V3(0, -1, 0), dir);
  shade.position.copy(head).addScaledVector(dir, 0.1);
  lamp.add(shade);
  const capM = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), M.metal); capM.position.copy(head).addScaledVector(dir, -0.04); lamp.add(capM);
  const bulbPos = head.clone().addScaledVector(dir, 0.17);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe2b0, toneMapped: false }));
  bulb.position.copy(bulbPos); lamp.add(bulb);

  const spot = new THREE.SpotLight(0xffcf96, 26, 0, 0.72, 0.65, 2);
  spot.position.copy(bulbPos);
  spot.target.position.copy(target);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.camera.near = 0.1; spot.shadow.camera.far = 6;
  spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.02;
  scene.add(spot, spot.target);
  const lampFill = new THREE.PointLight(0xffc68a, 1.4, 3.5, 2);
  lampFill.position.copy(bulbPos).add(new V3(0, 0.15, -0.2));
  scene.add(lampFill);

  /* ---------- props ---------- */
  const book = (w, h, d, color, x, y, z, ry) => {
    const g = new THREE.Group();
    const cover = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
    const pages = new THREE.MeshStandardMaterial({ color: 0xe7dcc4, roughness: 0.95 });
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(w, 0.008, d), cover); c1.position.y = h / 2 - 0.004;
    const c2 = c1.clone(); c2.position.y = -h / 2 + 0.004;
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.01, h, d), cover); sp.position.x = -w / 2 + 0.005;
    const pg = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.016, d - 0.02), pages); pg.position.x = 0.005;
    [c1, c2, sp, pg].forEach((m) => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
    g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
  };
  book(0.64, 0.07, 0.46, 0x2c4541, 1.62, 0.035, -0.28, 0.08);
  book(0.6, 0.06, 0.43, 0x6a2d29, 1.6, 0.1, -0.26, -0.06);
  book(0.56, 0.08, 0.41, 0x8a7240, 1.63, 0.17, -0.29, 0.14);

  const mugMat = new THREE.MeshStandardMaterial({ color: 0xeee9de, roughness: 0.4 });
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.088, 0.21, 40), mugMat);
  mug.position.set(1.6, 0.105, 0.66); mug.castShadow = true; mug.receiveShadow = true; scene.add(mug);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.086, 32), new THREE.MeshStandardMaterial({ color: 0x2a170c, roughness: 0.2 }));
  coffee.rotation.x = -Math.PI / 2; coffee.position.set(1.6, 0.19, 0.66); scene.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 12, 24, Math.PI), mugMat);
  handle.position.set(1.695, 0.11, 0.66); handle.rotation.z = -Math.PI / 2; handle.castShadow = true; scene.add(handle);

  const steamTex = glowTexture();
  const steam = [];
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    s.userData.phase = i / 4; scene.add(s); steam.push(s);
  }

  const floppy = (color, x, z, ry, label) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.31), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
    body.castShadow = true; body.receiveShadow = true; g.add(body);
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.002, 0.1), new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.8, roughness: 0.3 }));
    shutter.position.set(0, 0.007, -0.1); g.add(shutter);
    const lab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.002, 0.13), new THREE.MeshStandardMaterial({ color: label, roughness: 0.8 }));
    lab.position.set(0, 0.007, 0.07); g.add(lab);
    g.position.set(x, 0.006, z); g.rotation.y = ry; scene.add(g);
    return g;
  };
  floppy(0x1c1d1c, 1.0, 0.95, 0.32, 0xc8ff2e);
  floppy(0x4a5866, 1.06, 0.9, -0.12, 0xf1ece0).position.y = 0.019;

  /* ---------- instruction card (folded tent card on the desk) ---------- */
  const card = new THREE.Group();
  const CW = 0.56, CH = 0.62, TILT = 0.24;
  const cardTex = cardTexture();
  const paper = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.9 });
  const face = new THREE.MeshStandardMaterial({ map: cardTex, emissiveMap: cardTex, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.85 });
  const panel = new THREE.BoxGeometry(CW, CH, 0.004);
  const front = new THREE.Mesh(panel, [paper, paper, paper, paper, face, paper]);
  front.position.set(0, (CH / 2) * Math.cos(TILT), (CH / 2) * Math.sin(TILT));
  front.rotation.x = -TILT;
  const back = new THREE.Mesh(panel, paper);
  back.position.set(0, (CH / 2) * Math.cos(TILT), -(CH / 2) * Math.sin(TILT));
  back.rotation.x = TILT;
  [front, back].forEach((m) => { m.castShadow = true; m.receiveShadow = true; card.add(m); });
  card.position.set(1.14, 0, 0.1);
  card.rotation.y = -0.24;
  scene.add(card);

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0x9fb4c8, 0x2a2018, 0.35);
  const rim = new THREE.DirectionalLight(0x7fa0c8, 1.1); rim.position.set(2.6, 3.2, -2.2);
  const fill = new THREE.DirectionalLight(0xfff1dc, 0.35); fill.position.set(0.5, 2, 4);
  const glow = new THREE.PointLight(0xc8ff2e, 0, 2.6, 2); glow.position.set(0, SCR_Y, 0.55);
  scene.add(hemi, rim, fill, glow);

  /* ---------- dust in the lamp beam ---------- */
  const DUST = reduce ? 0 : 140;
  const dustGeo = new THREE.BufferGeometry();
  const dp = new Float32Array(DUST * 3), seeds = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dp[i * 3] = -1.45 + Math.random() * 0.8; dp[i * 3 + 1] = 0.15 + Math.random() * 1.05; dp[i * 3 + 2] = -0.35 + Math.random() * 0.95;
    seeds[i] = Math.random() * 100;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dustBase = dp.slice();
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: glowTexture(), color: 0xffdcae, size: 0.016, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---------- theme ---------- */
  function applyTheme() {
    const cs = getComputedStyle(document.body);
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    const bg = cs.getPropertyValue('--bg').trim() || '#0b0d0c';
    const acc = cs.getPropertyValue('--accent').trim() || '#c8ff2e';
    scene.fog.color.set(bg);
    M.wall.color.set(light ? 0xd9d5ca : 0x141715);
    hemi.intensity = light ? 1.5 : 0.35;
    fill.intensity = light ? 0.9 : 0.35;
    glow.color.set(acc); halo.material.color.set(acc);
    M.keyAcc.color.set(acc); M.keyAcc.emissive.set(acc).multiplyScalar(0.6);
    M.led.color.set(acc);
  }
  applyTheme();
  document.addEventListener('jt:theme', applyTheme);

  term.on('change', () => { screenTex.needsUpdate = true; });
  term.on('power', () => { ledPower.material = M.led; });
  let hddUntil = 0;
  term.on('run', () => { hddUntil = performance.now() + 450; });

  /* ---------- camera rig ---------- */
  const look = new V3(0, 0.62, -0.1), lookZoom = new V3(0, SCR_Y, FRONT);
  const wideDir = new V3(0.12, 0.2, 1).normalize();
  const camPos = new V3(), camLook = new V3();
  const goalPos = new V3(), goalLook = new V3();
  let zoomed = false, pointer = { x: 0, y: 0 }, aspect = 1, first = true;

  function goals() {
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 2;
    const dWide = Math.max(3.55, 2.15 / (t * aspect));
    const dZoom = Math.max(1.72, 1.2 / (t * aspect));
    let scrollP = 0;
    if (!reduce) {
      const r = stage.getBoundingClientRect();
      scrollP = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
    }
    if (zoomed) {
      goalLook.copy(lookZoom);
      goalPos.set(pointer.x * 0.06, SCR_Y + pointer.y * 0.03, FRONT + dZoom);
    } else {
      goalLook.copy(look);
      if (aspect < 1) goalLook.y -= 0.45 * (1 - aspect);
      goalPos.copy(goalLook).addScaledVector(wideDir, dWide);
      goalPos.x += pointer.x * 0.35; goalPos.y += pointer.y * 0.16 + scrollP * 0.35;
    }
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    aspect = w / h;
    card.visible = wideMQ.matches;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    if (first) { goals(); camPos.copy(goalPos); camLook.copy(goalLook); first = false; }
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  if (!reduce) {
    addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      pointer.x = Math.max(-1, Math.min(1, pointer.x)); pointer.y = Math.max(-1, Math.min(1, pointer.y));
    }, { passive: true });
  }

  /* ---------- picking ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hitPC(e) {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects([pc, card], true).length > 0;
  }
  el.addEventListener('click', (e) => { if (hitPC(e) && opts.onActivate) opts.onActivate(); });
  let hoverTick = 0;
  el.addEventListener('pointermove', (e) => {
    if (++hoverTick % 3) return;
    const hit = hitPC(e);
    el.style.cursor = hit ? 'pointer' : '';
    if (hit && !zoomed) stage.setAttribute('data-cursor', 'Type'); else stage.removeAttribute('data-cursor');
  });

  /* ---------- loop ---------- */
  let running = false, last = performance.now(), raf = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    goals();
    const k = reduce ? 1 : 1 - Math.exp(-dt * 3.2);
    camPos.lerp(goalPos, k); camLook.lerp(goalLook, k);
    camera.position.copy(camPos); camera.lookAt(camLook);

    keyList.forEach((m) => {
      const u = m.userData;
      if (u.press > 0) { u.press = Math.max(0, u.press - dt * 9); }
      m.position.y = u.baseY - 0.013 * Math.sin(Math.min(1, u.press) * Math.PI / 2);
    });

    const p = term.getPower();
    glow.intensity = p * (0.16 + (reduce ? 0 : Math.sin(t * 60) * 0.008));
    halo.material.opacity = p * 0.03;
    screenMat.color.setScalar(p > 0 ? 0.97 + (reduce ? 0.03 : Math.random() * 0.03) : 1);
    ledHdd.material = now < hddUntil && Math.floor(now / 70) % 2 ? M.hdd : M.ledOff;

    for (let i = 0; i < DUST; i++) {
      const s = seeds[i];
      dp[i * 3] = dustBase[i * 3] + Math.sin(t * 0.21 + s) * 0.06;
      dp[i * 3 + 1] = dustBase[i * 3 + 1] + Math.sin(t * 0.13 + s * 2) * 0.08;
      dp[i * 3 + 2] = dustBase[i * 3 + 2] + Math.cos(t * 0.17 + s) * 0.05;
    }
    if (DUST) dustGeo.attributes.position.needsUpdate = true;

    steam.forEach((s) => {
      const ph = (t * 0.22 + s.userData.phase) % 1;
      s.position.set(1.6 + Math.sin(ph * 6 + s.userData.phase * 9) * 0.03, 0.22 + ph * 0.45, 0.66);
      s.scale.setScalar(0.08 + ph * 0.18);
      s.material.opacity = reduce ? 0 : Math.sin(ph * Math.PI) * 0.09;
    });

    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  let visible = false;
  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    visible && !document.hidden ? start() : stop();
  }, { rootMargin: '100px' }).observe(stage);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : (visible && start()); });
  frame(performance.now());

  return {
    setZoom(z) { zoomed = !!z; if (zoomed) stage.removeAttribute('data-cursor'); if (!running) frame(performance.now()); },
    renderOnce() { if (!running) frame(performance.now()); }
  };
}
