// Лёгкое вращающееся кольцо с десертами (three.js). Нет WebGL/библиотеки - остаётся картинка .ring__fallback.
// Экономия: рисуем только когда кольцо видно и вкладка активна, не чаще ~30 кадров/с, без антиалиасинга, текстуры 256 px.
(() => {
  const box = document.getElementById("ring");
  const T = window.THREE;
  const SL = window.RING;
  if (!box || !T || !SL) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" }); } catch (_) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const canvas = renderer.domElement;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Вращающееся кольцо с десертами Кули");
  box.appendChild(canvas);

  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(34, 1, 0.1, 50);
  const N = SL.length, W = 1.15, H = 1.5;
  const R = W / 2 / Math.tan(Math.PI / N) + 0.06;
  const ring = new T.Group();
  scene.add(ring);
  const geo = new T.PlaneGeometry(W, H);
  const mats = SL.map(() => new T.MeshBasicMaterial({ color: 0xf1dfc3, side: T.DoubleSide }));
  SL.forEach((s, i) => {
    const a = (i / N) * Math.PI * 2;
    const m = new T.Mesh(geo, mats[i]);
    m.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    m.rotation.y = a;
    ring.add(m);
    const img = new Image();
    img.onload = () => {
      const cw = 256, ch = Math.round(cw * H / W);
      const c = document.createElement("canvas"); c.width = cw; c.height = ch;
      const g = c.getContext("2d");
      const k = Math.max(cw / img.width, ch / img.height);
      const dw = img.width * k, dh = img.height * k;
      g.drawImage(img, -(dw - cw) * (s.fx ?? 0.5), -(dh - ch) * (s.fy ?? 0.5), dw, dh);
      const tx = new T.CanvasTexture(c);
      mats[i].map = tx; mats[i].color.set(0xffffff); mats[i].needsUpdate = true;
      dirty = true;
    };
    img.src = s.src;
  });

  function resize() {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    // камера отодвигается так, чтобы кольцо помещалось по ширине
    const dist = Math.max(R + 2.7, (R + W / 2 + 0.1) / (Math.tan((cam.fov * Math.PI) / 360) * Math.min(cam.aspect, 1.6)));
    cam.position.set(0, 0.15, dist);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    dirty = true;
  }

  let dirty = true, visible = false, last = 0, vel = 0, drag = false, lx = 0, moved = 0;
  let held = false, tween = null, resumeT = null;
  const ray = new T.Raycaster();
  function hold() { held = true; clearTimeout(resumeT); }
  function release(ms) { clearTimeout(resumeT); resumeT = setTimeout(() => { held = false; dirty = true; }, ms); }
  /* повернуть кольцо так, чтобы фото i встало прямо к зрителю (кратчайшим путём) */
  function faceTo(i, done) {
    const TAU = Math.PI * 2, a = (i / N) * TAU;
    let target = -a, d = (target - ring.rotation.y) % TAU;
    if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
    tween = { from: ring.rotation.y, to: ring.rotation.y + d, t0: performance.now(), dur: reduce ? 1 : 480, done };
    vel = 0; dirty = true;
  }
  const speed = 0.35; // рад/с
  function frame(t) {
    requestAnimationFrame(frame);
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.t0) / tween.dur), e = 1 - Math.pow(1 - k, 3);
      ring.rotation.y = tween.from + (tween.to - tween.from) * e; dirty = true;
      renderer.render(scene, cam);
      if (k >= 1) { const f = tween.done; tween = null; f && f(); }
      return;
    }
    if (!visible || document.hidden) return;
    if (t - last < 33) return;
    const dt = Math.min((t - last) / 1000, 0.1);
    last = t;
    if (!drag) {
      if (!reduce && !held) ring.rotation.y += speed * dt + vel;
      else ring.rotation.y += vel;
      vel *= 0.92;
      if (Math.abs(vel) < 1e-4) vel = 0;
      dirty = dirty || !reduce || vel !== 0;
    }
    if (dirty) { renderer.render(scene, cam); dirty = reduce ? false : true; }
  }

  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) dirty = true; }, { threshold: 0.05 }).observe(box);
  new ResizeObserver(resize).observe(box);

  box.addEventListener("pointerdown", (e) => { clearTimeout(resumeT); if (!held) { /* обычный захват */ } tween = null; drag = true; lx = e.clientX; moved = 0; box.classList.add("is-drag"); box.setPointerCapture(e.pointerId); });
  box.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - lx; lx = e.clientX; moved += Math.abs(dx);
    ring.rotation.y += dx * 0.008; vel = dx * 0.0015; dirty = true;
  });
  const end = () => { drag = false; box.classList.remove("is-drag"); };
  box.addEventListener("pointerup", (e) => {
    end();
    if (moved >= 6) { held = false; return; }          /* это было вращение рукой */
    const r = box.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
    ring.updateMatrixWorld(true);
    const hit = ray.intersectObjects(ring.children, false)[0];
    if (!hit) return;
    const i = ring.children.indexOf(hit.object);
    if (i < 0) return;
    hold();                                             /* кольцо стоит на выбранном фото */
    faceTo(i, () => { if (window.openPhotos) window.openPhotos(SL, i); });
    release(9000);                                      /* если ничего не делать, снова поедет через 9 секунд */
  });
  document.addEventListener("lb:closed", () => release(2500));
  box.addEventListener("pointercancel", end);

  box.classList.add("is-ready");
  resize();
  requestAnimationFrame(frame);
})();
