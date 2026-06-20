(function () {
  'use strict';

  var container = document.getElementById('visualCanvas');
  if (!container || typeof THREE === 'undefined') return;

  /* ── constants ────────────────────────────────────────────────────── */
  var N          = 800;
  var LERP       = 0.055;
  var CONN_DIST  = 0.38;
  var CONN_MAX   = 1000;

  var COL_STATE1 = new THREE.Color(0x2D2926);
  var COL_STATE2 = new THREE.Color(0x918A7E);
  var COL_STATE3 = new THREE.Color(0xC4410C);
  var COL_LINE   = new THREE.Color(0xC4410C);

  /* ── scene setup ──────────────────────────────────────────────────── */
  var W = container.clientWidth;
  var H = container.clientHeight;

  var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  camera.position.z = 8;

  /* ── target position arrays ───────────────────────────────────────── */
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
      var t     = (i / N) * Math.PI * 2;
      var jit   = (Math.random() - 0.5) * 0.18;
      var r     = Math.cos(3 * t) + 2.2;
      arr[i * 3]     = (r * Math.cos(2 * t) * 0.9) + jit;
      arr[i * 3 + 1] = (r * Math.sin(2 * t) * 0.9) + jit;
      arr[i * 3 + 2] = (-Math.sin(3 * t) * 2.0) + jit;
    }
    return arr;
  }

  var targets = [buildCloud(), buildNetwork(), buildKnot()];

  /* ── live position buffer (starts at state 1) ─────────────────────── */
  var livePos = new Float32Array(targets[0]);

  /* ── particle geometry ────────────────────────────────────────────── */
  var ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(livePos.slice(), 3));

  var ptMat = new THREE.PointsMaterial({
    size: 0.06,
    color: COL_STATE1,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false
  });

  var points = new THREE.Points(ptGeo, ptMat);
  scene.add(points);

  /* ── connection lines ─────────────────────────────────────────────── */
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

  /* Use network target positions to compute fixed connection topology */
  var connPairs = computeConnections(targets[1]);
  var lineCount = connPairs.length / 2;

  var linePos = new Float32Array(lineCount * 6);

  var lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));

  var lineMat = new THREE.LineBasicMaterial({
    color: COL_LINE,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });

  var lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  /* ── state management ─────────────────────────────────────────────── */
  var currentTargetIndex = 0;
  var targetOpacityLine  = 0;
  var currentColorState  = COL_STATE1.clone();
  var targetColor        = COL_STATE1.clone();

  function setStep(n) {
    var idx = Math.max(0, Math.min(2, n - 1));
    if (idx === currentTargetIndex) return;
    currentTargetIndex = idx;

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

  /* ── resize ───────────────────────────────────────────────────────── */
  function onResize() {
    W = container.clientWidth;
    H = container.clientHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }
  window.addEventListener('resize', onResize);

  /* ── animation loop ───────────────────────────────────────────────── */
  var t0    = performance.now();
  var pivot = new THREE.Group();
  pivot.add(points);
  pivot.add(lines);
  scene.add(pivot);
  /* remove direct scene add so they rotate together */
  scene.remove(points);
  scene.remove(lines);

  function animate(ts) {
    requestAnimationFrame(animate);

    var t = (ts - t0) * 0.001;

    /* read scroll state */
    var raw  = container.getAttribute('data-active-step');
    var step = parseInt(raw, 10) || 1;
    setStep(step);

    /* lerp particles toward target */
    var target = targets[currentTargetIndex];
    var posAttr = ptGeo.attributes.position;
    for (var i = 0; i < N; i++) {
      var base = i * 3;
      posAttr.array[base]     += (target[base]     - posAttr.array[base])     * LERP;
      posAttr.array[base + 1] += (target[base + 1] - posAttr.array[base + 1]) * LERP;
      posAttr.array[base + 2] += (target[base + 2] - posAttr.array[base + 2]) * LERP;
    }
    posAttr.needsUpdate = true;

    /* update line endpoints from live particle positions */
    var lineAttr = lineGeo.attributes.position;
    for (var k = 0; k < lineCount; k++) {
      var ia = connPairs[k * 2];
      var ib = connPairs[k * 2 + 1];
      var lBase = k * 6;
      lineAttr.array[lBase]     = posAttr.array[ia * 3];
      lineAttr.array[lBase + 1] = posAttr.array[ia * 3 + 1];
      lineAttr.array[lBase + 2] = posAttr.array[ia * 3 + 2];
      lineAttr.array[lBase + 3] = posAttr.array[ib * 3];
      lineAttr.array[lBase + 4] = posAttr.array[ib * 3 + 1];
      lineAttr.array[lBase + 5] = posAttr.array[ib * 3 + 2];
    }
    lineAttr.needsUpdate = true;

    /* lerp particle color */
    currentColorState.lerp(targetColor, 0.06);
    ptMat.color.copy(currentColorState);

    /* lerp line opacity */
    lineMat.opacity += (targetOpacityLine - lineMat.opacity) * 0.06;

    /* continuous rotation */
    pivot.rotation.y = t * 0.10;
    pivot.rotation.x = Math.sin(t * 0.07) * 0.3;

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
})();
