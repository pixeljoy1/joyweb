(function () {
  'use strict';

  var container = document.getElementById('visualCanvas');
  if (!container || typeof THREE === 'undefined') return;

  /* ── constants ─────────────────────────────────────────────────── */
  var N          = 800;
  var LERP_POS   = 0.055;
  var CONN_DIST  = 0.38;
  var CONN_MAX   = 1000;

  var COL_STATE1 = new THREE.Color(0x2D2926);
  var COL_STATE2 = new THREE.Color(0x918A7E);
  var COL_STATE3 = new THREE.Color(0xC4410C);
  var COL_LINE   = new THREE.Color(0xC4410C);

  /* ── label copy per step ────────────────────────────────────────── */
  var STEP_LABELS = [
    'Navigating raw complexity of disjointed multi-cloud enterprise systems.',
    'AI as the connective tissue; leveraging visceral tools (pencil) and advanced models to bridge gaps.',
    'Tangible, cohesive UX structure shipped; systemic complexity simplified.'
  ];

  /* ── tooltip + dot refs ─────────────────────────────────────────── */
  var dotEl     = document.getElementById('context-label-dot');
  var tooltipEl = document.getElementById('context-tooltip');

  function updateLabelContent(idx) {
    if (tooltipEl) tooltipEl.textContent = STEP_LABELS[idx] || '';
  }
  updateLabelContent(0);

  /* ── renderer ───────────────────────────────────────────────────── */
  /* Width from container (70% of full-bleed stage ≈ 70vw).          */
  /* Height fixed to viewport — canvas is position:sticky 100vh.     */
  var W = container.clientWidth;
  var H = window.innerHeight;

  var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  camera.position.z = 8;

  /* ── particle target positions ──────────────────────────────────── */
  function buildCloud() {
    var arr = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var r     = 2.0 + Math.random() * 1.5;
      var theta = Math.acos(2 * Math.random() - 1);
      var phi   = Math.random() * Math.PI * 2;
      arr[i * 3]     = r * Math.sin(theta) * Math.cos(phi);
      arr[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      arr[i * 3 + 2] = r * Math.cos(theta);
    }
    return arr;
  }

  function buildNetwork() {
    var arr = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var r     = 2.2 * Math.pow(Math.random(), 0.6);
      var theta = Math.acos(2 * Math.random() - 1);
      var phi   = Math.random() * Math.PI * 2;
      arr[i * 3]     = r * Math.sin(theta) * Math.cos(phi);
      arr[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      arr[i * 3 + 2] = r * Math.cos(theta);
    }
    return arr;
  }

  function buildKnot() {
    var arr = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var t   = (i / N) * Math.PI * 2;
      var jit = (Math.random() - 0.5) * 0.18;
      var r   = Math.cos(3 * t) + 2.2;
      arr[i * 3]     = r * Math.cos(2 * t) * 0.9 + jit;
      arr[i * 3 + 1] = r * Math.sin(2 * t) * 0.9 + jit;
      arr[i * 3 + 2] = -Math.sin(3 * t) * 2.0    + jit;
    }
    return arr;
  }

  var targets = [buildCloud(), buildNetwork(), buildKnot()];

  /* ── particle geometry ──────────────────────────────────────────── */
  var ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(targets[0].slice(), 3));

  var ptMat = new THREE.PointsMaterial({
    size: 0.065,
    color: COL_STATE1,
    transparent: true,
    opacity: 0.88,
    sizeAttenuation: true,
    depthWrite: false
  });

  var points = new THREE.Points(ptGeo, ptMat);

  /* ── connection lines ───────────────────────────────────────────── */
  function computeConnections(posArr) {
    var pairs = [];
    outer: for (var i = 0; i < N; i++) {
      for (var j = i + 1; j < N; j++) {
        var dx = posArr[i * 3]     - posArr[j * 3];
        var dy = posArr[i * 3 + 1] - posArr[j * 3 + 1];
        var dz = posArr[i * 3 + 2] - posArr[j * 3 + 2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < CONN_DIST) {
          pairs.push(i, j);
          if (pairs.length / 2 >= CONN_MAX) break outer;
        }
      }
    }
    return pairs;
  }

  var connPairs = computeConnections(targets[1]);
  var lineCount = connPairs.length / 2;
  var linePos   = new Float32Array(lineCount * 6);

  var lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));

  var lineMat = new THREE.LineBasicMaterial({
    color: COL_LINE,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });

  var lines = new THREE.LineSegments(lineGeo, lineMat);

  /* ── scene group (rotates as one) ───────────────────────────────── */
  var sceneGroup = new THREE.Group();
  sceneGroup.add(points);
  sceneGroup.add(lines);
  scene.add(sceneGroup);

  /* ── state ──────────────────────────────────────────────────────── */
  var currentTargetIndex = 0;
  var targetOpacityLine  = 0;
  var currentColor       = COL_STATE1.clone();
  var targetColor        = COL_STATE1.clone();

  function setStep(n) {
    var idx = Math.max(0, Math.min(2, n - 1));
    if (idx === currentTargetIndex) return;
    currentTargetIndex = idx;
    updateLabelContent(idx);

    if (idx === 0) {
      targetColor.copy(COL_STATE1);
      targetOpacityLine = 0;
    } else if (idx === 1) {
      targetColor.copy(COL_STATE2);
      targetOpacityLine = 0.45;
    } else {
      targetColor.copy(COL_STATE3);
      targetOpacityLine = 0;
    }
  }

  /* ── drag / inertia state ───────────────────────────────────────── */
  var isDragging  = false;
  var prevMouse   = { x: 0, y: 0 };
  var dragVel     = { x: 0, y: 0 };
  var dragRot     = { x: 0, y: 0 };
  var DRAG_SENS   = 0.004;
  var DRAG_DECAY  = 0.95;

  /* Mouse drag — starts on the canvas so scroll is never hijacked */
  renderer.domElement.addEventListener('mousedown', function (e) {
    isDragging  = true;
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;
    dragVel.x   = 0;
    dragVel.y   = 0;
  });

  window.addEventListener('mousemove', function (e) {
    /* drag */
    if (isDragging) {
      var dx  = e.clientX - prevMouse.x;
      var dy  = e.clientY - prevMouse.y;
      dragVel.y   = dx * DRAG_SENS;
      dragVel.x   = dy * DRAG_SENS;
      dragRot.y  += dragVel.y;
      dragRot.x  += dragVel.x;
      prevMouse.x = e.clientX;
      prevMouse.y = e.clientY;
    }

    /* mouse NDC for raycaster (relative to canvas rect) */
    var rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x =  ((e.clientX - rect.left)  / rect.width)  * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top)   / rect.height) * 2 + 1;

    /* position dot + tooltip */
    if (dotEl) {
      dotEl.style.left = (e.clientX + 18) + 'px';
      dotEl.style.top  = (e.clientY - 18) + 'px';
    }
    if (tooltipEl) {
      tooltipEl.style.left = (e.clientX + 24) + 'px';
      tooltipEl.style.top  = (e.clientY - 10) + 'px';
    }
  });

  window.addEventListener('mouseup', function () { isDragging = false; });

  /* Show / hide dot when entering/leaving canvas */
  renderer.domElement.addEventListener('mouseenter', function () {
    if (dotEl) dotEl.classList.add('is-visible');
  });
  renderer.domElement.addEventListener('mouseleave', function () {
    if (dotEl)     { dotEl.classList.remove('is-visible', 'is-glowing'); }
    if (tooltipEl) { tooltipEl.classList.remove('is-visible'); }
    mouseNDC.x = 9; mouseNDC.y = 9; /* move ray off-screen */
    isDragging = false;
  });

  /* Touch drag */
  renderer.domElement.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    isDragging  = true;
    prevMouse.x = e.touches[0].clientX;
    prevMouse.y = e.touches[0].clientY;
    dragVel.x   = 0;
    dragVel.y   = 0;
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (!isDragging || e.touches.length !== 1) return;
    var dx  = e.touches[0].clientX - prevMouse.x;
    var dy  = e.touches[0].clientY - prevMouse.y;
    dragVel.y   = dx * DRAG_SENS;
    dragVel.x   = dy * DRAG_SENS;
    dragRot.y  += dragVel.y;
    dragRot.x  += dragVel.x;
    prevMouse.x = e.touches[0].clientX;
    prevMouse.y = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', function () { isDragging = false; });

  /* ── raycaster ──────────────────────────────────────────────────── */
  var raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 0.28 };
  var mouseNDC  = { x: 9, y: 9 }; /* start off-screen */
  var isHovering = false;

  /* ── resize ─────────────────────────────────────────────────────── */
  function onResize() {
    W = container.clientWidth;
    H = window.innerHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }
  window.addEventListener('resize', onResize);

  /* ── animation loop ─────────────────────────────────────────────── */
  var t0 = performance.now();

  function animate(ts) {
    requestAnimationFrame(animate);

    var t = (ts - t0) * 0.001;

    /* scroll state → target morph */
    var raw  = container.getAttribute('data-active-step');
    var step = parseInt(raw, 10) || 1;
    setStep(step);

    /* lerp particles */
    var target  = targets[currentTargetIndex];
    var posAttr = ptGeo.attributes.position;
    for (var i = 0; i < N; i++) {
      var b = i * 3;
      posAttr.array[b]     += (target[b]     - posAttr.array[b])     * LERP_POS;
      posAttr.array[b + 1] += (target[b + 1] - posAttr.array[b + 1]) * LERP_POS;
      posAttr.array[b + 2] += (target[b + 2] - posAttr.array[b + 2]) * LERP_POS;
    }
    posAttr.needsUpdate = true;

    /* update line endpoints from live particle positions */
    var lineAttr = lineGeo.attributes.position;
    for (var k = 0; k < lineCount; k++) {
      var ia = connPairs[k * 2];
      var ib = connPairs[k * 2 + 1];
      var lb = k * 6;
      lineAttr.array[lb]     = posAttr.array[ia * 3];
      lineAttr.array[lb + 1] = posAttr.array[ia * 3 + 1];
      lineAttr.array[lb + 2] = posAttr.array[ia * 3 + 2];
      lineAttr.array[lb + 3] = posAttr.array[ib * 3];
      lineAttr.array[lb + 4] = posAttr.array[ib * 3 + 1];
      lineAttr.array[lb + 5] = posAttr.array[ib * 3 + 2];
    }
    lineAttr.needsUpdate = true;

    /* lerp colour + line opacity */
    currentColor.lerp(targetColor, 0.06);
    ptMat.color.copy(currentColor);
    lineMat.opacity += (targetOpacityLine - lineMat.opacity) * 0.06;

    /* drag deceleration */
    if (!isDragging) {
      dragVel.x *= DRAG_DECAY;
      dragVel.y *= DRAG_DECAY;
      dragRot.x += dragVel.x;
      dragRot.y += dragVel.y;
    }

    /* base auto-rotation targets */
    var baseX = Math.sin(t * 0.07) * 0.3;
    var baseY = t * 0.10;

    /* lerp scene group toward base + user drag */
    sceneGroup.rotation.x += (baseX + dragRot.x - sceneGroup.rotation.x) * 0.1;
    sceneGroup.rotation.y += (baseY + dragRot.y - sceneGroup.rotation.y) * 0.1;

    renderer.render(scene, camera);

    /* raycaster hover — run after render so geometry is fresh */
    raycaster.setFromCamera(mouseNDC, camera);
    var hits    = raycaster.intersectObject(points);
    var newHover = hits.length > 0;
    if (newHover !== isHovering) {
      isHovering = newHover;
      if (dotEl)     dotEl.classList.toggle('is-glowing', isHovering);
      if (tooltipEl) tooltipEl.classList.toggle('is-visible', isHovering);
    }
  }

  requestAnimationFrame(animate);
})();
