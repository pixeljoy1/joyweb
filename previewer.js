/* previewer.js — global image lightbox · JoyWeb2.1 · v3
   Features: keyboard ← → nav, touch swipe, gallery counter, awwards-grade UX.
   Trigger: any element with [data-preview] attribute.
   For <img data-preview>, uses img.src. For wrappers, data-preview-src.
   Caption: data-preview-alt || alt || title.
   Gallery: all [data-preview] within the nearest .csr-gallery / .case-gallery / section.
*/
(function () {
  'use strict';

  /* ── state ─────────────────────────────────────────────────────── */
  var gallery    = [];
  var idx        = 0;
  var isOpen     = false;
  var prevFocus  = null;
  var touchX0    = 0;
  var touchY0    = 0;
  var isSwiping  = false;

  /* ── CSS ────────────────────────────────────────────────────────── */
  var css = [

    /* backdrop */
    '.pvr{position:fixed;inset:0;z-index:9990;',
    'background:rgba(10,8,6,.97);',
    'display:flex;align-items:center;justify-content:center;',
    'opacity:0;pointer-events:none;',
    'transition:opacity .4s cubic-bezier(.4,0,.2,1);}',
    '.pvr.pvr--open{opacity:1;pointer-events:auto;}',

    /* frame: spring entrance */
    '.pvr__frame{position:relative;cursor:default;',
    'display:flex;flex-direction:column;align-items:center;',
    'will-change:transform;',
    'transform:translateY(22px) scale(.96);',
    'transition:transform .6s cubic-bezier(.16,1,.3,1);}',
    '.pvr--open .pvr__frame{transform:translateY(0) scale(1);}',

    /* image */
    '.pvr__img{display:block;',
    'max-width:min(88vw,1280px);max-height:78vh;',
    'object-fit:contain;border-radius:3px;',
    'box-shadow:0 48px 140px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.04);',
    'transition:opacity .22s ease;user-select:none;pointer-events:none;}',
    '.pvr__img.pvr--fade{opacity:0;}',

    /* bottom bar */
    '.pvr__bar{display:flex;align-items:center;',
    'padding:14px 0 0;gap:0;width:100%;',
    'max-width:min(88vw,1280px);}',

    /* counter — left */
    '.pvr__counter{',
    'font-family:"DM Mono",ui-monospace,monospace;',
    'font-size:9px;letter-spacing:.18em;text-transform:uppercase;',
    'color:rgba(245,240,232,.22);white-space:nowrap;flex-shrink:0;',
    'min-width:54px;}',

    /* caption — center */
    '.pvr__caption{',
    'font-family:"DM Mono",ui-monospace,monospace;',
    'font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;',
    'color:rgba(245,240,232,.35);',
    'flex:1;text-align:center;',
    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
    'padding:0 12px;}',

    /* close — right */
    '.pvr__close{background:none;border:none;',
    'color:rgba(245,240,232,.35);',
    'font-family:"DM Mono",ui-monospace,monospace;',
    'font-size:9px;letter-spacing:.14em;text-transform:uppercase;',
    'cursor:pointer;padding:0;white-space:nowrap;flex-shrink:0;',
    'display:inline-flex;align-items:center;gap:8px;',
    'transition:color .2s ease;min-width:54px;justify-content:flex-end;}',
    '.pvr__close:hover,.pvr__close:focus-visible{color:rgba(245,240,232,.95);}',
    '.pvr__close::before{content:"";display:block;width:14px;height:1px;',
    'background:currentColor;flex-shrink:0;}',

    /* nav arrows — fixed sides of viewport */
    '.pvr__nav{position:fixed;top:50%;transform:translateY(-50%);',
    'background:rgba(245,240,232,.07);',
    'border:1px solid rgba(245,240,232,.10);',
    'color:rgba(245,240,232,.6);cursor:pointer;',
    'width:48px;height:48px;border-radius:50%;',
    'display:flex;align-items:center;justify-content:center;',
    'font-size:18px;line-height:1;',
    'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
    'transition:background .2s ease,color .2s ease,border-color .2s ease,opacity .25s ease;',
    'z-index:9991;}',
    '.pvr__nav:hover{background:rgba(245,240,232,.16);color:#fff;border-color:rgba(245,240,232,.25);}',
    '.pvr__nav:focus-visible{outline:1px solid rgba(245,240,232,.4);}',
    '.pvr__nav--prev{left:28px;}',
    '.pvr__nav--next{right:28px;}',
    '.pvr__nav[disabled]{opacity:.12;pointer-events:none;}',

    /* hide arrows when gallery is single image */
    '.pvr--single .pvr__nav{display:none;}',

    /* mobile: smaller arrows, lower placement */
    '@media(max-width:600px){',
    '.pvr__nav{width:38px;height:38px;font-size:14px;top:auto;transform:none;',
    'bottom:72px;}',
    '.pvr__nav--prev{left:20px;}',
    '.pvr__nav--next{right:20px;}}',

    /* mobile swipe hint */
    '.pvr__hint{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);',
    'font-family:"DM Mono",ui-monospace,monospace;',
    'font-size:9px;letter-spacing:.18em;text-transform:uppercase;',
    'color:rgba(245,240,232,.22);pointer-events:none;',
    'opacity:0;transition:opacity .5s ease .5s;white-space:nowrap;z-index:9992;}',
    '.pvr--open .pvr__hint{opacity:1;}',
    '@media(hover:hover){.pvr__hint{display:none;}}',

    /* trigger cursor */
    '[data-preview]{cursor:pointer;}',

    /* shared gallery grid */
    '.case-gallery{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:36px;}',
    '.case-gallery__item{display:block;overflow:hidden;border-radius:2px;position:relative;background:#E8E2D8;}',
    '.case-gallery__item:first-child{grid-column:1/-1;}',
    '.case-gallery__item img{width:100%;height:100%;object-fit:cover;display:block;aspect-ratio:16/10;',
    'transition:transform .6s cubic-bezier(.2,.8,.2,1),opacity .3s ease;}',
    '.case-gallery__item:first-child img{aspect-ratio:21/9;}',
    '.case-gallery__item:hover img{transform:scale(1.025);opacity:.88;}',
    '@media(max-width:720px){',
    '.case-gallery{grid-template-columns:1fr;}',
    '.case-gallery__item:first-child{grid-column:auto;}',
    '.case-gallery__item img,.case-gallery__item:first-child img{aspect-ratio:16/10;}}'

  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── build overlay DOM ──────────────────────────────────────────── */
  var pvr = document.createElement('div');
  pvr.className = 'pvr';
  pvr.setAttribute('role', 'dialog');
  pvr.setAttribute('aria-modal', 'true');
  pvr.setAttribute('aria-label', 'Image preview');

  pvr.innerHTML =
    '<button class="pvr__nav pvr__nav--prev" aria-label="Previous image" tabindex="-1">&#8592;</button>' +
    '<button class="pvr__nav pvr__nav--next" aria-label="Next image"     tabindex="-1">&#8594;</button>' +
    '<div class="pvr__frame">' +
      '<img class="pvr__img" src="" alt="" />' +
      '<div class="pvr__bar">' +
        '<span class="pvr__counter"></span>' +
        '<span class="pvr__caption"></span>' +
        '<button class="pvr__close" aria-label="Close">Close &times;</button>' +
      '</div>' +
    '</div>' +
    '<div class="pvr__hint">Swipe to navigate &nbsp;&middot;&nbsp; Tap to close</div>';

  document.body.appendChild(pvr);

  var pvrImg     = pvr.querySelector('.pvr__img');
  var pvrCaption = pvr.querySelector('.pvr__caption');
  var pvrCounter = pvr.querySelector('.pvr__counter');
  var pvrClose   = pvr.querySelector('.pvr__close');
  var pvrFrame   = pvr.querySelector('.pvr__frame');
  var pvrPrev    = pvr.querySelector('.pvr__nav--prev');
  var pvrNext    = pvr.querySelector('.pvr__nav--next');

  /* ── helpers ────────────────────────────────────────────────────── */
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function syncNav() {
    var n = gallery.length;
    if (n > 1) {
      pvrCounter.textContent = pad(idx + 1) + ' / ' + pad(n);
      pvr.classList.remove('pvr--single');
    } else {
      pvrCounter.textContent = '';
      pvr.classList.add('pvr--single');
    }
    pvrPrev.disabled = (idx === 0);
    pvrNext.disabled = (idx === n - 1);
  }

  function resolveItem(el) {
    var src = el.dataset.previewSrc
           || (el.tagName === 'IMG' ? el.src  : '')
           || (el.tagName === 'A'   ? el.href : '')
           || '';
    var alt = el.dataset.previewAlt
           || el.getAttribute('alt')
           || el.getAttribute('title')
           || '';
    return { src: src, alt: alt };
  }

  function buildGallery(trigger) {
    var scope = trigger.closest('.csr-gallery, .case-gallery, .pvr-group, section');
    var nodes = scope
      ? scope.querySelectorAll('[data-preview]')
      : [trigger];
    var items = [];
    var startIdx = 0;
    nodes.forEach(function (el) {
      var item = resolveItem(el);
      if (!item.src) return;
      if (el === trigger) startIdx = items.length;
      items.push(item);
    });
    return { items: items, startIdx: startIdx };
  }

  /* ── open / navigate / close ────────────────────────────────────── */
  function open(items, startIdx) {
    gallery   = items;
    idx       = startIdx;
    prevFocus = document.activeElement;

    pvrImg.src = gallery[idx].src;
    pvrImg.alt = gallery[idx].alt || '';
    pvrCaption.textContent = gallery[idx].alt || '';
    syncNav();

    pvr.classList.add('pvr--open');
    document.body.style.overflow = 'hidden';
    isOpen = true;
    setTimeout(function () { pvrClose.focus(); }, 80);
  }

  function navigate(delta) {
    var next = idx + delta;
    if (next < 0 || next >= gallery.length) return;
    idx = next;
    pvrImg.classList.add('pvr--fade');
    setTimeout(function () {
      pvrImg.src = gallery[idx].src;
      pvrImg.alt = gallery[idx].alt || '';
      pvrCaption.textContent = gallery[idx].alt || '';
      syncNav();
      pvrImg.classList.remove('pvr--fade');
    }, 200);
  }

  function close() {
    if (!isOpen) return;
    pvr.classList.remove('pvr--open');
    document.body.style.overflow = '';
    isOpen = false;
    if (prevFocus) { try { prevFocus.focus(); } catch (_) {} }
    setTimeout(function () {
      pvrImg.src = '';
      pvrCaption.textContent = '';
      pvrCounter.textContent = '';
      gallery = [];
    }, 440);
  }

  /* ── event wiring ───────────────────────────────────────────────── */

  /* backdrop click → close */
  pvr.addEventListener('click', close);
  /* frame: stop backdrop close */
  pvrFrame.addEventListener('click', function (e) { e.stopPropagation(); });
  /* nav arrows: stop backdrop close */
  pvrPrev.addEventListener('click', function (e) { e.stopPropagation(); navigate(-1); });
  pvrNext.addEventListener('click', function (e) { e.stopPropagation(); navigate(+1); });
  /* close button */
  pvrClose.addEventListener('click', function (e) { e.stopPropagation(); close(); });

  /* keyboard */
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape' || e.key === 'Esc')  { close(); return; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); navigate(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); navigate(+1); }
  });

  /* touch swipe — horizontal wins over vertical, 48px threshold */
  pvr.addEventListener('touchstart', function (e) {
    touchX0   = e.changedTouches[0].clientX;
    touchY0   = e.changedTouches[0].clientY;
    isSwiping = false;
  }, { passive: true });

  pvr.addEventListener('touchmove', function (e) {
    var dx = e.changedTouches[0].clientX - touchX0;
    var dy = e.changedTouches[0].clientY - touchY0;
    if (!isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isSwiping = true;
    }
  }, { passive: true });

  pvr.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - touchX0;
    var dy = e.changedTouches[0].clientY - touchY0;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
      e.stopPropagation();
      if (dx < 0) navigate(+1);
      else        navigate(-1);
    }
    isSwiping = false;
  }, { passive: false });

  /* delegation: open on any [data-preview] click */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-preview]');
    if (!t) return;
    e.preventDefault();
    var g = buildGallery(t);
    if (g.items.length) open(g.items, g.startIdx);
  });

})();
