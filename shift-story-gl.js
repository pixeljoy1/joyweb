(function () {
  'use strict';

  var container = document.getElementById('visualCanvas');
  if (!container || typeof THREE === 'undefined') return;

  /* ── constants ─────────────────────────────────────────────────── */
  var N        = 1200;                  // total particles
  var STRAND_N = Math.floor(N / 3);    // 400 per strand; remainder = rung particles

  var LERP_POS  = 0.055;
  var LERP_XFRM = 0.04;
  var CONN_DIST = 0.36;
  var CONN_MAX  = 1000;

  var COL_STATE1 = new THREE.Color(0x2D2926);
  var COL_STATE2 = new THREE.Color(0x918A7E);
  var COL_STATE3 = new THREE.Color(0xC4410C);
  var COL_LINE   = new THREE.Color(0xC4410C);

  /* ── per-step config ────────────────────────────────────────────── */
  var STEP_CFG = [
    { posX: 1.2, scale: 1.00, ptSize: 0.036, rotSpeedY: 0.100, rotZ: 0           },  // cloud
    { posX: 0.8, scale: 1.30, ptSize: 0.058, rotSpeedY: 0.115, rotZ: 0           },  // network
    { posX: 1.2, scale: 1.00, ptSize: 0.033, rotSpeedY: 0.070, rotZ: Math.PI / 5 },  // DNA helix
  ];

  var targetPosX   = STEP_CFG[0].posX;
  var targetScale  = STEP_CFG[0].scale;
  var targetPtSize = STEP_CFG[0].ptSize;
  var targetRotSpY = STEP_CFG[0].rotSpeedY;
  var targetRotZ   = STEP_CFG[0].rotZ;
  var liveRotSpY   = STEP_CFG[0].rotSpeedY;
  var accBaseY     = 0;
  var lastT        = 0;

  /* ── context tooltip ────────────────────────────────────────────── */
  var STEP_LABELS = [
    'Navigating raw complexity of disjointed multi-cloud enterprise systems.',
    'AI as the connective tissue; leveraging visceral tools (pencil) and advanced models to bridge gaps.',
    'Tangible, cohesive UX structure shipped; systemic complexity simplified.'
  ];

  var dotEl     = document.getElementById('context-label-dot');
  var tooltipEl = document.getElementById('context-tooltip');

  function updateLabelContent(idx) {
    if (tooltipEl) tooltipEl.textContent = STEP_LABELS[idx] || '';
  }
  updateLabelContent(0);

  /* ── renderer ───────────────────────────────────────────────────── */
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

  /* ── particle targets ───────────────────────────────────────────── */
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

  /* ─────────────────────────────────────────────────────────────────
     DNA double helix — mathematically accurate:
       • Strand 1 (indices 0…STRAND_N-1):   cos(t), heightScale*t, sin(t)
       • Strand 2 (indices STRAND_N…2N/3-1): offset by π, antiparallel
       • Base-pair rungs (indices 2N/3…N-1): interpolated bridges,
         50 rungs × 8 particles each = 400 rung particles
     Scale multiplier 1.3 makes the form 30 % larger than the previous
     iteration's 1.2 radius / 0.18 heightScale.
  ───────────────────────────────────────────────────────────────── */
  function buildHelix() {
    var SCALE        = 1.3;
    var arr          = new Float32Array(N * 3);
    var radius       = 1.4  * SCALE;           // 1.82
    var turns        = 5;
    var tMax         = turns * Math.PI * 2;
    var heightScale  = 0.20 * SCALE;           // 0.26
    var jitAmp       = 0.04 * SCALE;           // 0.052

    /* Strand 1 ─ indices 0 … STRAND_N-1 */
    for (var i = 0; i < STRAND_N; i++) {
      var t   = (i / (STRAND_N - 1)) * tMax;
      var jit = (Math.random() - 0.5) * jitAmp;
      arr[i * 3]     = Math.cos(t) * radius + jit;
      arr[i * 3 + 1] = (t - tMax * 0.5) * heightScale + jit;
      arr[i * 3 + 2] = Math.sin(t) * radius + jit;
    }

    /* Strand 2 ─ indices STRAND_N … 2×STRAND_N-1, phase = π */
    for (var i = 0; i < STRAND_N; i++) {
      var b   = STRAND_N + i;
      var t   = (i / (STRAND_N - 1)) * tMax;
      var jit = (Math.random() - 0.5) * jitAmp;
      arr[b * 3]     = Math.cos(t + Math.PI) * radius + jit;
      arr[b * 3 + 1] = (t - tMax * 0.5) * heightScale + jit;
      arr[b * 3 + 2] = Math.sin(t + Math.PI) * radius + jit;
    }

    /* Base-pair rungs ─ indices 2×STRAND_N … N-1
       50 rung positions × 8 interpolated particles each */
    var RUNG_COUNT = 50;
    var PER_RUNG   = Math.floor((N - 2 * STRAND_N) / RUNG_COUNT);  // 8
    for (var ri = 0; ri < RUNG_COUNT; ri++) {
      var sIdx   = Math.round((ri / (RUNG_COUNT - 1)) * (STRAND_N - 1));
      var t      = (sIdx / (STRAND_N - 1)) * tMax;
      var yLevel = (t - tMax * 0.5) * heightScale;
      var x1 = Math.cos(t)            * radius;
      var z1 = Math.sin(t)            * radius;
      var x2 = Math.cos(t + Math.PI) * radius;
      var z2 = Math.sin(t + Math.PI) * radius;

      for (var rp = 0; rp < PER_RUNG; rp++) {
        var pidx = 2 * STRAND_N + ri * PER_RUNG + rp;
        if (pidx >= N) break;
        var frac = (PER_RUNG > 1) ? rp / (PER_RUNG - 1) : 0.5;
        var jit  = (Math.random() - 0.5) * 0.028;
        arr[pidx * 3]     = x1 + (x2 - x1) * frac + jit;
        arr[pidx * 3 + 1] = yLevel + jit * 0.4;
        arr[pidx * 3 + 2] = z1 + (z2 - z1) * frac + jit;
      }
    }
    return arr;
  }

  var targets = [buildCloud(), buildNetwork(), buildHelix()];

  /* ── particle geometry ──────────────────────────────────────────── */
  var ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(targets[0].slice(), 3));

  var ptMat = new THREE.PointsMaterial({
    size: STEP_CFG[0].ptSize,
    color: COL_STATE1,
    transparent: true,
    opacity: 0.88,
    sizeAttenuation: true,
    depthWrite: false
  });

  var points = new THREE.Points(ptGeo, ptMat);

  /* ── network connection lines ───────────────────────────────────── */
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
    color: COL_LINE, transparent: true, opacity: 0, depthWrite: false
  });

  var lines = new THREE.LineSegments(lineGeo, lineMat);

  /* ── DNA backbone rung lines (strand1↔strand2 connectors) ──────── */
  var RUNG_STEP = 10;                      // visual rung every 10 strand particles
  var rungPairs = [];
  for (var ri = 0; ri < STRAND_N; ri += RUNG_STEP) {
    rungPairs.push(ri, STRAND_N + ri);     // strand1[i] ↔ strand2[i]
  }
  var rungCount = rungPairs.length / 2;   // 40 rung lines
  var rungPos   = new Float32Array(rungCount * 6);

  var rungGeo = new THREE.BufferGeometry();
  rungGeo.setAttribute('position', new THREE.BufferAttribute(rungPos, 3));

  var rungMat = new THREE.LineBasicMaterial({
    color: COL_LINE, transparent: true, opacity: 0, depthWrite: false
  });

  var rungLines = new THREE.LineSegments(rungGeo, rungMat);

  /* ── scene group ────────────────────────────────────────────────── */
  var sceneGroup = new THREE.Group();
  sceneGroup.add(points);
  sceneGroup.add(lines);
  sceneGroup.add(rungLines);
  sceneGroup.position.x = STEP_CFG[0].posX;
  scene.add(sceneGroup);

  /* ── step state ─────────────────────────────────────────────────── */
  var currentTargetIndex = 0;
  var targetOpacityLine  = 0;
  var targetOpacityRung  = 0;
  var currentColor       = COL_STATE1.clone();
  var targetColor        = COL_STATE1.clone();

  function setStep(n) {
    var idx = Math.max(0, Math.min(2, n - 1));
    if (idx === currentTargetIndex) return;
    currentTargetIndex = idx;

    updateLabelContent(idx);
    updateNavActive(idx);

    var cfg      = STEP_CFG[idx];
    targetPosX   = cfg.posX;
    targetScale  = cfg.scale;
    targetPtSize = cfg.ptSize;
    targetRotSpY = cfg.rotSpeedY;
    targetRotZ   = cfg.rotZ;

    if (idx === 0) {
      targetColor.copy(COL_STATE1);
      targetOpacityLine = 0;
      targetOpacityRung = 0;
    } else if (idx === 1) {
      targetColor.copy(COL_STATE2);
      targetOpacityLine = 0.45;
      targetOpacityRung = 0;
    } else {
      targetColor.copy(COL_STATE3);
      targetOpacityLine = 0;
      targetOpacityRung = 0.42;
    }
  }

  /* ── drag / inertia ─────────────────────────────────────────────── */
  var isDragging = false;
  var prevMouse  = { x: 0, y: 0 };
  var dragVel    = { x: 0, y: 0 };
  var dragRot    = { x: 0, y: 0 };
  var DRAG_SENS  = 0.004;
  var DRAG_DECAY = 0.95;

  renderer.domElement.addEventListener('mousedown', function (e) {
    isDragging  = true;
    prevMouse.x = e.clientX;
    prevMouse.y = e.clientY;
    dragVel.x = dragVel.y = 0;
  });

  window.addEventListener('mousemove', function (e) {
    if (isDragging) {
      var dx = e.clientX - prevMouse.x;
      var dy = e.clientY - prevMouse.y;
      dragVel.y   = dx * DRAG_SENS;
      dragVel.x   = dy * DRAG_SENS;
      dragRot.y  += dragVel.y;
      dragRot.x  += dragVel.x;
      prevMouse.x = e.clientX;
      prevMouse.y = e.clientY;
    }
    var rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    if (dotEl)     { dotEl.style.left     = (e.clientX + 18) + 'px';
                     dotEl.style.top      = (e.clientY - 18) + 'px'; }
    if (tooltipEl) { tooltipEl.style.left = (e.clientX + 24) + 'px';
                     tooltipEl.style.top  = (e.clientY - 10) + 'px'; }
  });

  window.addEventListener('mouseup', function () { isDragging = false; });

  renderer.domElement.addEventListener('mouseenter', function () {
    if (dotEl) dotEl.classList.add('is-visible');
  });
  renderer.domElement.addEventListener('mouseleave', function () {
    if (dotEl)     dotEl.classList.remove('is-visible', 'is-glowing');
    if (tooltipEl) tooltipEl.classList.remove('is-visible');
    mouseNDC.x = 9; mouseNDC.y = 9;
    isDragging = false;
  });

  renderer.domElement.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    isDragging  = true;
    prevMouse.x = e.touches[0].clientX;
    prevMouse.y = e.touches[0].clientY;
    dragVel.x = dragVel.y = 0;
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (!isDragging || e.touches.length !== 1) return;
    var dx = e.touches[0].clientX - prevMouse.x;
    var dy = e.touches[0].clientY - prevMouse.y;
    dragVel.y   = dx * DRAG_SENS;
    dragVel.x   = dy * DRAG_SENS;
    dragRot.y  += dragVel.y;
    dragRot.x  += dragVel.x;
    prevMouse.x = e.touches[0].clientX;
    prevMouse.y = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', function () { isDragging = false; });

  /* ── raycaster ──────────────────────────────────────────────────── */
  var raycaster  = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 0.28 };
  var mouseNDC   = { x: 9, y: 9 };
  var isHovering = false;

  /* ── 3-step pill navigator ──────────────────────────────────────── */
  var navEl = document.createElement('div');
  navEl.id  = 'step-nav';
  navEl.setAttribute('aria-label', 'Approach section navigator');
  navEl.innerHTML =
    '<button class="step-nav__node is-active" data-nav-step="1" aria-label="Step 1: Cloud"></button>' +
    '<button class="step-nav__node" data-nav-step="2" aria-label="Step 2: Network"></button>' +
    '<button class="step-nav__node" data-nav-step="3" aria-label="Step 3: DNA Helix"></button>';
  document.body.appendChild(navEl);

  var navNodes   = navEl.querySelectorAll('.step-nav__node');
  var storySteps = document.querySelectorAll('.story-step');

  function updateNavActive(idx) {
    navNodes.forEach(function (node, i) {
      node.classList.toggle('is-active', i === idx);
    });
  }

  navNodes.forEach(function (node) {
    node.addEventListener('click', function () {
      var s = parseInt(node.getAttribute('data-nav-step'), 10) - 1;
      if (storySteps[s]) storySteps[s].scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  /* ── navigator visibility observers ────────────────────────────── */
  var step1El = storySteps[0];
  var step3El = storySteps[2];

  if (step1El) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        navEl.classList.remove('is-fading');
        navEl.classList.add('is-visible');
      }
    }, { threshold: 0.65 }).observe(step1El);
  }

  if (step3El) {
    new IntersectionObserver(function (entries) {
      var entry = entries[0];
      if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
        navEl.classList.add('is-fading');
        navEl.classList.remove('is-visible');
      } else if (entry.isIntersecting) {
        navEl.classList.remove('is-fading');
        navEl.classList.add('is-visible');
      }
    }, { threshold: 0.1 }).observe(step3El);
  }

  /* ── theme color sync ───────────────────────────────────────────── */
  window.onThemeChange = function () {
    requestAnimationFrame(function () {
      var cs     = getComputedStyle(document.documentElement);
      var s1     = (cs.getPropertyValue('--gl-s1')  || '').trim() || '#2D2926';
      var s2     = (cs.getPropertyValue('--gl-s2')  || '').trim() || '#918A7E';
      var accent = (cs.getPropertyValue('--sienna') || '').trim() || '#C4410C';

      COL_STATE1.set(s1);
      COL_STATE2.set(s2);
      COL_STATE3.set(accent);
      COL_LINE.set(accent);
      lineMat.color.set(accent);
      rungMat.color.set(accent);

      if (currentTargetIndex === 0)      targetColor.copy(COL_STATE1);
      else if (currentTargetIndex === 1) targetColor.copy(COL_STATE2);
      else                               targetColor.copy(COL_STATE3);
    });
  };

  /* ── resize ─────────────────────────────────────────────────────── */
  var resizeTO = null;
  function onResize() {
    clearTimeout(resizeTO);
    resizeTO = setTimeout(function () {
      W = container.clientWidth;
      H = window.innerHeight;
      if (W < 1 || H < 1) return;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    }, 60);
  }
  window.addEventListener('resize', onResize);

  /* ── animation loop ─────────────────────────────────────────────── */
  var t0 = performance.now();

  function animate(ts) {
    requestAnimationFrame(animate);

    var t  = (ts - t0) * 0.001;
    var dt = t - lastT;
    lastT  = t;

    /* active step from scrollytelling */
    var raw  = container.getAttribute('data-active-step');
    var step = parseInt(raw, 10) || 1;
    setStep(step);

    /* lerp particles toward morph target */
    var target  = targets[currentTargetIndex];
    var posAttr = ptGeo.attributes.position;
    for (var i = 0; i < N; i++) {
      var b = i * 3;
      posAttr.array[b]     += (target[b]     - posAttr.array[b])     * LERP_POS;
      posAttr.array[b + 1] += (target[b + 1] - posAttr.array[b + 1]) * LERP_POS;
      posAttr.array[b + 2] += (target[b + 2] - posAttr.array[b + 2]) * LERP_POS;
    }
    posAttr.needsUpdate = true;

    /* update network edge endpoints from live positions */
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

    /* update DNA backbone rung endpoints */
    var rungAttr = rungGeo.attributes.position;
    for (var r = 0; r < rungCount; r++) {
      var ra = rungPairs[r * 2];
      var rb = rungPairs[r * 2 + 1];
      var rl = r * 6;
      rungAttr.array[rl]     = posAttr.array[ra * 3];
      rungAttr.array[rl + 1] = posAttr.array[ra * 3 + 1];
      rungAttr.array[rl + 2] = posAttr.array[ra * 3 + 2];
      rungAttr.array[rl + 3] = posAttr.array[rb * 3];
      rungAttr.array[rl + 4] = posAttr.array[rb * 3 + 1];
      rungAttr.array[rl + 5] = posAttr.array[rb * 3 + 2];
    }
    rungAttr.needsUpdate = true;

    /* colour + opacity lerps */
    currentColor.lerp(targetColor, 0.06);
    ptMat.color.copy(currentColor);
    lineMat.opacity += (targetOpacityLine - lineMat.opacity) * 0.06;
    rungMat.opacity += (targetOpacityRung - rungMat.opacity) * 0.06;

    /* spatial lerps */
    sceneGroup.position.x += (targetPosX - sceneGroup.position.x) * LERP_XFRM;
    var newScale = sceneGroup.scale.x + (targetScale - sceneGroup.scale.x) * LERP_XFRM;
    sceneGroup.scale.setScalar(newScale);
    ptMat.size += (targetPtSize - ptMat.size) * 0.06;

    /* drag deceleration */
    if (!isDragging) {
      dragVel.x *= DRAG_DECAY;
      dragVel.y *= DRAG_DECAY;
      dragRot.x += dragVel.x;
      dragRot.y += dragVel.y;
    }

    /* auto-rotation (speed lerps per step) */
    liveRotSpY += (targetRotSpY - liveRotSpY) * 0.03;
    accBaseY   += liveRotSpY * Math.min(dt, 0.05);

    var baseX = Math.sin(t * 0.07) * 0.3;
    var baseY = accBaseY;

    sceneGroup.rotation.x += (baseX + dragRot.x - sceneGroup.rotation.x) * 0.1;
    sceneGroup.rotation.y += (baseY + dragRot.y - sceneGroup.rotation.y) * 0.1;
    sceneGroup.rotation.z += (targetRotZ - sceneGroup.rotation.z) * LERP_XFRM;

    renderer.render(scene, camera);

    /* raycaster hover */
    raycaster.setFromCamera(mouseNDC, camera);
    var newHover = raycaster.intersectObject(points).length > 0;
    if (newHover !== isHovering) {
      isHovering = newHover;
      if (dotEl)     dotEl.classList.toggle('is-glowing', isHovering);
      if (tooltipEl) tooltipEl.classList.toggle('is-visible', isHovering);
    }
  }

  requestAnimationFrame(animate);
})();
