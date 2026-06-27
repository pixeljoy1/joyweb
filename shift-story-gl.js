(function () {
  'use strict';

  var container = document.getElementById('visualCanvas');
  if (!container || typeof THREE === 'undefined') return;

  /* ── constants ─────────────────────────────────────────────────── */
  var N        = 2800;

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
    { posX: 1.2, scale: 1.00, ptSize: 0.062, rotSpeedY: 0.100, rotZ: 0              },  // cloud
    { posX: 0.8, scale: 1.30, ptSize: 0.092, rotSpeedY: 0.115, rotZ: 0              },  // network
    { posX: 1.2, scale: 1.30, ptSize: 0.055, rotSpeedY: 0.055, rotZ: Math.PI / 4   },  // DNA helix
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

  /* True double helix with rungs.
     Strand 1 and Strand 2 spiral in opposite phase (offset by PI).
     Rung particles bridge the two strands horizontally at random heights. */
  function buildDNA() {
    var arr = new Float32Array(N * 3);
    var numTurns   = 6;
    var radius     = 1.15;
    var totalH     = 5.2;
    var jit        = 0.04;
    var s1Count    = Math.floor(N * 0.42);
    var s2Count    = Math.floor(N * 0.42);
    var rungCount  = N - s1Count - s2Count;
    var TWO_PI     = Math.PI * 2;

    // Strand 1
    for (var i = 0; i < s1Count; i++) {
      var t  = (i / s1Count) * numTurns * TWO_PI;
      var yf = (i / s1Count) - 0.5;
      arr[i * 3]     = Math.cos(t) * radius + (Math.random() - 0.5) * jit;
      arr[i * 3 + 1] = yf * totalH          + (Math.random() - 0.5) * jit;
      arr[i * 3 + 2] = Math.sin(t) * radius + (Math.random() - 0.5) * jit;
    }

    // Strand 2 (offset PI)
    for (var i2 = 0; i2 < s2Count; i2++) {
      var t2  = (i2 / s2Count) * numTurns * TWO_PI;
      var yf2 = (i2 / s2Count) - 0.5;
      var b   = (s1Count + i2) * 3;
      arr[b]     = Math.cos(t2 + Math.PI) * radius + (Math.random() - 0.5) * jit;
      arr[b + 1] = yf2 * totalH                    + (Math.random() - 0.5) * jit;
      arr[b + 2] = Math.sin(t2 + Math.PI) * radius + (Math.random() - 0.5) * jit;
    }

    // Rungs — horizontal bridges between the two strands
    for (var i3 = 0; i3 < rungCount; i3++) {
      var t3   = Math.random() * numTurns * TWO_PI;
      var frac = t3 / (numTurns * TWO_PI);
      var lf   = Math.random(); // lerp factor along rung
      var x1   = Math.cos(t3) * radius;
      var z1   = Math.sin(t3) * radius;
      var x2   = Math.cos(t3 + Math.PI) * radius;
      var z2   = Math.sin(t3 + Math.PI) * radius;
      var b3   = (s1Count + s2Count + i3) * 3;
      arr[b3]     = x1 + (x2 - x1) * lf + (Math.random() - 0.5) * jit;
      arr[b3 + 1] = (frac - 0.5) * totalH + (Math.random() - 0.5) * jit;
      arr[b3 + 2] = z1 + (z2 - z1) * lf + (Math.random() - 0.5) * jit;
    }

    return arr;
  }

  var targets = [buildCloud(), buildNetwork(), buildDNA()];

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

  /* ── scene group ────────────────────────────────────────────────── */
  var sceneGroup = new THREE.Group();
  sceneGroup.add(points);
  sceneGroup.add(lines);
  sceneGroup.position.x = STEP_CFG[0].posX;
  scene.add(sceneGroup);

  /* ── step state ─────────────────────────────────────────────────── */
  var currentTargetIndex = 0;
  var targetOpacityLine  = 0;
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
    } else if (idx === 1) {
      targetColor.copy(COL_STATE2);
      targetOpacityLine = 0.45;
    } else {
      targetColor.copy(COL_STATE3);
      targetOpacityLine = 0;
    }
  }

  /* ── drag / inertia ─────────────────────────────────────────────── */
  var isDragging = false;
  var prevMouse  = { x: 0, y: 0 };
  var dragVel    = { x: 0, y: 0 };
  var dragRot    = { x: 0, y: 0 };
  var DRAG_SENS  = 0.0018;
  var DRAG_DECAY = 0.93;

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

  /* ── shared step jump (keyboard + swipe) ─────────────────────────── */
  function goToStep(n) {
    var next = Math.max(0, Math.min(storySteps.length - 1, n));
    if (storySteps[next]) storySteps[next].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function storyNavActive() {
    return navEl.classList.contains('is-visible');
  }

  /* ── keyboard ← → navigation ─────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (!storyNavActive()) return;
    if (document.querySelector('.pvr.pvr--open')) return; /* lightbox has priority */
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      goToStep(currentTargetIndex + (e.key === 'ArrowRight' ? 1 : -1));
    }
  });

  /* ── touch swipe → step navigation (mobile) ──────────────────────── */
  var _swX = 0, _swY = 0;
  document.addEventListener('touchstart', function (e) {
    _swX = e.changedTouches[0].clientX;
    _swY = e.changedTouches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!storyNavActive()) return;
    var dx = e.changedTouches[0].clientX - _swX;
    var dy = e.changedTouches[0].clientY - _swY;
    /* require clear horizontal intent: ≥72px and horizontal > 1.5× vertical */
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    goToStep(currentTargetIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });

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

    /* colour + opacity lerps */
    currentColor.lerp(targetColor, 0.06);
    ptMat.color.copy(currentColor);
    lineMat.opacity += (targetOpacityLine - lineMat.opacity) * 0.06;

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
