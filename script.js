/* ============================================================
   Joydeep Mitra — pixeljoyDesigns_
   Interaction engine: preloader · smooth scroll · custom cursor ·
   magnetic · scroll reveals · word illumination · horizontal work ·
   arc progress · rotating hero quote.  Vanilla, dependency-light.
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TIMER1_ = 5000;
  var isTouch = window.matchMedia("(hover: none)").matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp  = function (a, b, n) { return a + (b - a) * n; };

  /* ============================================================
     ROTATING HERO QUOTE  (a different line each load)
     ============================================================ */
  var QUOTES = [
    { t: "The best design work is invisible to the user.", u: "invisible", by: "Joydeep Mitra", role: "Associate Director, UX Design · Kyndryl" },
    { t: "Design is not just how it looks — it is how it works.", u: "how it works", by: "Steve Jobs", role: "Co-founder, Apple" },
    { t: "The best interface is no interface at all.", u: "no interface", by: "Golden Krishna", role: "Designer & author" },
    { t: "Good design is as little design as possible.", u: "as little design", by: "Dieter Rams", role: "Industrial designer" },
    { t: "Simplicity is the ultimate sophistication.", u: "Simplicity", by: "Leonardo da Vinci", role: "via Apple, 1977" },
    { t: "AI is the most profound technology humanity is working on.", u: "most profound", by: "Sundar Pichai", role: "CEO, Google" },
    { t: "Powerful AI could be the most important tool we ever build.", u: "most important tool", by: "Dario Amodei", role: "CEO, Anthropic" },
    { t: "Any sufficiently advanced technology is indistinguishable from magic.", u: "indistinguishable from magic", by: "Arthur C. Clarke", role: "Author & futurist" },
    { t: "We shape our tools, and thereafter our tools shape us.", u: "our tools shape us", by: "John Culkin", role: "on Marshall McLuhan" },
    { t: "People ignore design that ignores people.", u: "ignores people", by: "Frank Chimero", role: "Designer & writer" },
    { t: "The details are not the details; they make the design.", u: "make the design", by: "Charles Eames", role: "Designer" },
    { t: "AI will be the defining technology of our generation.", u: "defining technology", by: "Fei-Fei Li", role: "Computer scientist, Stanford" },
    { t: "Creativity is intelligence having fun.", u: "intelligence having fun", by: "Attributed to Albert Einstein", role: "Physicist" },
    { t: "The future is already here — it is just not evenly distributed.", u: "not evenly distributed", by: "William Gibson", role: "Author" },
    { t: "The best way to predict the future is to invent it.", u: "invent it", by: "Alan Kay", role: "Computer scientist" },
    { t: "A designer knows perfection when there is nothing left to take away.", u: "nothing left to take away", by: "Antoine de Saint-Exupéry", role: "Writer & aviator" }
  ];

  /* ============================================================
     BUILD VERSION  — bump this each compile
     ============================================================ */
  var BUILD_VERSION = "2.3";

  /* ============================================================
     ROTATING HERO QUOTE  — auto-cycles every 10 s via timer dot
     ============================================================ */
  var qHost = $("#heroQuote"), qAttr = $("#heroAttr"), qTimerTO = null;

  function renderQuote() {
    if (!qHost) return;
    var KEY = "jm_quote_seen", seen = [];
    try { seen = JSON.parse(sessionStorage.getItem(KEY) || "[]"); } catch (e) { seen = []; }
    if (!Array.isArray(seen) || seen.length >= QUOTES.length) seen = [];
    var pool = [];
    for (var i = 0; i < QUOTES.length; i++) if (seen.indexOf(i) === -1) pool.push(i);
    var pick = pool[Math.floor(Math.random() * pool.length)];
    seen.push(pick);
    try { sessionStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {}

    var q = QUOTES[pick];
    function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    function mark(line) {
      var sl = esc(line), sp = esc(q.u);
      if (sp && sl.indexOf(sp) !== -1) return sl.replace(sp, '<em class="underline">' + sp + "</em>");
      return sl;
    }
    // Strip trailing period — replaced by animated timer dot
    var words = q.t.replace(/\.$/, "").split(" "), mid = Math.ceil(words.length / 2);
    var l1 = words.slice(0, mid).join(" "), l2 = words.slice(mid).join(" ");
    if (q.u && l2 && l1.indexOf(q.u) !== -1 && l1.lastIndexOf(q.u) + q.u.length > l1.length - 1) {
      l1 = words.slice(0, mid + 1).join(" "); l2 = words.slice(mid + 1).join(" ");
    }
    var C = (2 * Math.PI * 10).toFixed(2); // circle circumference ≈ 62.83
    var dotHtml = '<span class="q-dot" id="qDot">' +
      '<svg class="q-dot__svg" viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10" fill="none" class="q-dot__track"/>' +
      '<circle cx="12" cy="12" r="10" fill="none" class="q-dot__arc"' +
      ' stroke-dasharray="' + C + '" stroke-dashoffset="0"/>' +
      '</svg><span class="q-dot__pip"></span></span>';
    qHost.innerHTML =
      '<span class="line-clip"><span>' + mark(l1) + "</span></span>" +
      '<span class="line-clip"><span>' + (l2 ? mark(l2) : "") + dotHtml + "</span></span>";
    if (qAttr) qAttr.innerHTML = '<span class="dash">&mdash;</span> ' + esc(q.by) +
      '<span class="role">' + esc(q.role) + "</span>";

    var bb = $("#buildBadge");
    if (bb) bb.textContent = "v" + BUILD_VERSION;
  }

  function startQuoteTimer() {
    if (reduce) return; // respect reduced-motion preference
    clearTimeout(qTimerTO);
    var dot = $("#qDot");
    if (dot) dot.classList.add("go");
    qTimerTO = setTimeout(function () {
      if (!qHost) return;
      qHost.style.transition = "opacity .4s ease";
      qHost.style.opacity = "0";
      setTimeout(function () {
        qHost.classList.remove("is-in");
        qHost.style.transition = "";
        qHost.style.opacity = "";
        renderQuote();
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { qHost.classList.add("is-in"); startQuoteTimer(); });
        });
      }, 400);
    }, TIMER1_);
  }

  renderQuote();

  /* ============================================================
     PRELOADER  → reveals the hero
     ============================================================ */
  (function preloader() {
    var loader = $("#loader");
    var countEl = $("#loaderCount");
    var barEl = $("#loaderBar");
    function reveal() {
      document.body.classList.add("is-loaded");
      if (qHost) qHost.classList.add("is-in");
      startQuoteTimer();
    }
    if (!loader) { reveal(); return; }
    if (reduce) {
      loader.classList.add("done"); reveal();
      setTimeout(function () { loader.style.display = "none"; }, 200);
      return;
    }
    var n = 0, dur = 1300, t0 = performance.now();
    (function step(now) {
      var p = clamp((now - t0) / dur, 0, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      n = Math.round(eased * 100);
      if (countEl) countEl.textContent = n;
      if (barEl) barEl.style.width = n + "%";
      if (p < 1) requestAnimationFrame(step);
      else {
        loader.classList.add("done");
        reveal();
        setTimeout(function () { loader.style.display = "none"; }, 1400);
      }
    })(t0);
  })();

  /* ============================================================
     LENIS SMOOTH SCROLL  (graceful fallback to native)
     ============================================================ */
  var lenis = null;
  if (window.Lenis && !reduce && !isTouch) {
    try {
      lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    } catch (e) { lenis = null; }
  }
  function scrollToEl(el) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.2 });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length < 2) return;
      var t = $(id);
      if (!t) return;
      e.preventDefault();
      if (id === "#top") { lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: "smooth" }); }
      else scrollToEl(t);
    });
  });
  var toTop = $("#toTop");
  if (toTop) toTop.addEventListener("click", function () { lenis ? lenis.scrollTo(0, { duration: 1.2 }) : window.scrollTo({ top: 0, behavior: "smooth" }); });

  /* ============================================================
     CUSTOM CURSOR  + magnetic
     ============================================================ */
  (function cursor() {
    if (isTouch) return;
    var cur = $("#cursor");
    var dot = $(".cursor__dot", cur);
    var ring = $(".cursor__ring", cur);
    var label = $(".cursor__label", cur);
    if (!cur) return;
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function loop() {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      if (dot) dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
      if (ring) ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();

    function bind(sel, label2) {
      $$(sel).forEach(function (el) {
        el.addEventListener("mouseenter", function () {
          var lbl = el.getAttribute("data-cursor-label") || label2;
          if (lbl) { cur.classList.add("is-label"); if (label) label.textContent = lbl; }
          else cur.classList.add("is-hover");
        });
        el.addEventListener("mouseleave", function () {
          cur.classList.remove("is-hover", "is-label");
          if (label) label.textContent = "";
        });
      });
    }
    bind("a, button, [data-cursor], .arc__node");
    bind("[data-cursor-label]");

    // magnetic pull
    $$("[data-magnetic]").forEach(function (el) {
      var strength = 0.32;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * strength;
        var y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  })();

  /* ============================================================
     SCROLL REVEALS  (IntersectionObserver)
     ============================================================ */
  (function reveals() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  })();

  /* ============================================================
     WORD-BY-WORD ILLUMINATION  (manifesto, contact line)
     ============================================================ */
  (function words() {
    function split(el) {
      var nodes = Array.prototype.slice.call(el.childNodes);
      el.innerHTML = "";
      var out = [];
      nodes.forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (tok) {
            if (tok === "" ) return;
            if (/^\s+$/.test(tok)) { el.appendChild(document.createTextNode(tok)); return; }
            var s = document.createElement("span"); s.className = "word"; s.textContent = tok;
            el.appendChild(s); out.push(s);
          });
        } else {
          node.classList && node.classList.add("word");
          el.appendChild(node); out.push(node);
        }
      });
      return out;
    }
    $$("[data-words]").forEach(function (el) {
      var ws = split(el);
      if (reduce) { ws.forEach(function (w) { w.classList.add("lit"); }); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          ws.forEach(function (w, i) { setTimeout(function () { w.classList.add("lit"); }, i * 42); });
          io.unobserve(en.target);
        });
      }, { threshold: 0.4 });
      io.observe(el);
    });
  })();

  /* ============================================================
     HORIZONTAL PINNED WORK  +  ARC FILL  +  NAV  +  SCROLLBAR
     all driven from one scroll handler
     ============================================================ */
  var workSec = $(".work");
  var track = $("#workTrack");
  var workExtra = 0, workLeadIn = 0, workTravel = 0;
  function sizeWork() {
    if (!workSec || !track) return;
    if (innerWidth <= 800) { workSec.style.height = ""; track.style.transform = ""; workExtra = 0; return; }
    workExtra = Math.max(0, track.scrollWidth - innerWidth);
    workLeadIn = innerHeight * 0.45;          // hold still on entry before sliding
    var leadOut = innerHeight * 1.5;          // hold at the end before releasing
    workTravel = workExtra * 2;               // stretch the distance → slower, gentler
    workSec.style.height = (innerHeight + workLeadIn + workTravel + leadOut) + "px";
  }

  var nav = $("#nav");
  var fill = $("#scrollbarFill");
  var arcSec = $(".arc");
  var arcFill = $("#arcFill");
  var arcNodes = $$(".arc__node");
  var lastY = 0;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var max = document.documentElement.scrollHeight - innerHeight || 1;

    // progress bar
    if (fill) fill.style.width = clamp(y / max, 0, 1) * 100 + "%";

    // nav hide/show + solid
    if (nav) {
      nav.classList.toggle("solid", y > 40);
      if (y > lastY && y > 300) nav.classList.add("hidden");
      else nav.classList.remove("hidden");
    }
    lastY = y;

    // horizontal work — eased, with lead-in / lead-out relief
    if (workSec && track && workExtra > 0) {
      var top = workSec.offsetTop;
      var raw = clamp((y - top - workLeadIn) / workTravel, 0, 1);
      var eased = raw * raw * (3 - 2 * raw);   // smoothstep: gentle in, gentle out
      track.style.transform = "translateX(" + (-workExtra * eased) + "px)";
    }

    // arc fill + node lighting
    if (arcSec && arcFill) {
      var r = arcSec.getBoundingClientRect();
      var ap = clamp((innerHeight * 0.78 - r.top) / (r.height * 0.55), 0, 1);
      arcFill.style.width = ap * 100 + "%";
      arcNodes.forEach(function (n) {
        var at = (parseFloat(n.style.getPropertyValue("--at")) || 0) / 100;
        n.classList.toggle("lit", at <= ap);
      });
    }
  }

  var ticking = false;
  function requestScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { onScroll(); ticking = false; }); } }
  window.addEventListener("scroll", requestScroll, { passive: true });
  if (lenis) lenis.on("scroll", requestScroll);
  window.addEventListener("resize", function () { sizeWork(); requestScroll(); });
  window.addEventListener("load", function () { sizeWork(); requestScroll(); });
  sizeWork();
  onScroll();

  /* ============================================================
     HOME MEGAMENU  — hover-intent open, tiles smooth-scroll to section
     ============================================================ */
  (function megamenu() {
    var wrap = $("#megamenu"), trigger = $("#megaTrigger"), panel = $("#megaPanel");
    if (!wrap || !trigger || !panel) return;
    var open = false, timer = null;

    function set(v) {
      open = v;
      wrap.classList.toggle("open", v);
      trigger.setAttribute("aria-expanded", v ? "true" : "false");
    }
    function openNow() { clearTimeout(timer); set(true); }
    function closeSoon() { clearTimeout(timer); timer = setTimeout(function () { set(false); }, 200); }

    if (!isTouch) {
      wrap.addEventListener("mouseenter", openNow);
      wrap.addEventListener("mouseleave", closeSoon);
      panel.addEventListener("mouseenter", openNow);
      panel.addEventListener("mouseleave", closeSoon);
    }
    trigger.addEventListener("click", function (e) { e.preventDefault(); set(!open); });

    // selecting a tile closes the menu (the existing anchor handler does the scroll)
    $$(".mtile", panel).forEach(function (t) {
      t.addEventListener("click", function () { clearTimeout(timer); set(false); });
    });

    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) set(false); });
    document.addEventListener("click", function (e) { if (open && !wrap.contains(e.target)) set(false); });
    var closeOnScroll = function () { if (open) set(false); };
    window.addEventListener("scroll", closeOnScroll, { passive: true });
    if (lenis) lenis.on("scroll", closeOnScroll);
  })();

  /* ============================================================
     LIVE CLOCK  (IST — Bangalore)
     ============================================================ */
  (function clock() {
    var el = $("#clock");
    if (!el) return;
    function tick() {
      try {
        el.textContent = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false });
      } catch (e) {
        el.textContent = new Date().toLocaleTimeString("en-GB", { hour12: false });
      }
    }
    tick(); setInterval(tick, 1000);
  })();

  /* ============================================================
     PDF RÉSUMÉ MODAL
     ============================================================ */
  (function resumeModal() {
    var modal    = $("#pdfModal");
    var backdrop = $("#pdfBackdrop");
    var closeBtn = $("#pdfClose");
    var frame    = $("#pdfFrame");
    if (!modal || !frame) return;

    var PDF_SRC = "resume/JoydeepMitra_resume_2025_v1.6_.pdf";
    var loaded  = false;

    function open() {
      if (!loaded) { frame.setAttribute("src", PDF_SRC); loaded = true; }
      modal.classList.add("open");
      modal.removeAttribute("aria-hidden");
      document.body.style.overflow = "hidden";
    }
    function close() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    ["#resumeBtn", "#navResumeBtn"].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener("click", open);
    });
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("open")) close();
    });
  })();

  /* ============================================================
     SHIFT STORY — scrollytelling IntersectionObserver
     ============================================================ */
  (function shiftStory() {
    var section = $("#approach");
    var canvas  = $("#visualCanvas");
    var steps   = document.querySelectorAll(".story-step");
    if (!canvas || !steps.length) return;

    function activate(n) {
      steps.forEach(function (s) {
        s.classList.toggle("is-active", parseInt(s.getAttribute("data-step"), 10) === n);
      });
      canvas.setAttribute("data-active-step", String(n));
    }

    /* Per-step observer — triggers in a 25%-to-45% viewport band */
    var stepObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          activate(parseInt(e.target.getAttribute("data-step"), 10));
        }
      });
    }, { rootMargin: "-25% 0px -50% 0px", threshold: 0 });

    /* Section entry observer — fires state 1 when section first arrives,
       then hands off to per-step observer */
    var sectionObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        activate(1);
        sectionObs.disconnect();
        steps.forEach(function (s) { stepObs.observe(s); });
      }
    }, { rootMargin: "0px 0px -45% 0px", threshold: 0 });

    if (section) sectionObs.observe(section);
  })();

  /* ============================================================
     SETTINGS — Theme & Mode switcher
     ============================================================ */
  (function settingsSwitcher() {
    var btn   = $("settingsBtn") || document.getElementById("settingsBtn");
    var panel = document.getElementById("settingsPanel");
    if (!btn || !panel) return;

    var root = document.documentElement;
    var mq   = window.matchMedia("(prefers-color-scheme: dark)");

    function notify() {
      if (typeof window.onThemeChange === "function") window.onThemeChange();
    }

    function applyMode(mode) {
      var effective = (mode === "system") ? (mq.matches ? "dark" : "light") : mode;
      root.setAttribute("data-theme", effective);
      localStorage.setItem("jm-mode", mode);
      panel.querySelectorAll("[data-set-mode]").forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-set-mode") === mode);
      });
      notify();
    }

    function applyColor(color) {
      if (color === "orange") {
        root.removeAttribute("data-color");
      } else {
        root.setAttribute("data-color", color);
      }
      localStorage.setItem("jm-color", color);
      panel.querySelectorAll("[data-set-color]").forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-set-color") === color);
      });
      notify();
    }

    /* Restore saved prefs on load */
    applyMode(localStorage.getItem("jm-mode") || "system");
    applyColor(localStorage.getItem("jm-color") || "orange");

    /* Track OS preference changes */
    mq.addEventListener("change", function () {
      if ((localStorage.getItem("jm-mode") || "system") === "system") applyMode("system");
    });

    /* Toggle panel open/close */
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var opening = !panel.classList.contains("is-open");
      panel.classList.toggle("is-open", opening);
      panel.setAttribute("aria-hidden", opening ? "false" : "true");
      btn.setAttribute("aria-expanded", opening ? "true" : "false");
    });

    document.addEventListener("click", function (e) {
      if (!panel.contains(e.target) && e.target !== btn) {
        panel.classList.remove("is-open");
        panel.setAttribute("aria-hidden", "true");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("is-open")) {
        panel.classList.remove("is-open");
        panel.setAttribute("aria-hidden", "true");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    panel.querySelectorAll("[data-set-mode]").forEach(function (b) {
      b.addEventListener("click", function () { applyMode(b.getAttribute("data-set-mode")); });
    });

    panel.querySelectorAll("[data-set-color]").forEach(function (b) {
      b.addEventListener("click", function () { applyColor(b.getAttribute("data-set-color")); });
    });
  })();

})();
