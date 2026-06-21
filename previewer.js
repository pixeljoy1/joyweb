/* previewer.js — global image lightbox · JoyWeb2.1
   Trigger: any element with [data-preview] attribute.
   For <img data-preview>, uses img.src.
   For wrappers, uses data-preview-src attribute.
   Caption: data-preview-alt || alt || title.
*/
(function () {
  'use strict';

  /* ── inject CSS ──────────────────────────────────────────────── */
  var css = [
    /* backdrop */
    '.pvr{position:fixed;inset:0;z-index:9990;',
    'background:rgba(26,23,20,.93);',
    'display:flex;align-items:center;justify-content:center;',
    'opacity:0;pointer-events:none;transition:opacity .35s ease;cursor:pointer;}',
    '.pvr.pvr--open{opacity:1;pointer-events:auto;}',

    /* frame: scale-up reveal */
    '.pvr__frame{position:relative;cursor:default;',
    'transform:scale(.9) translateY(14px);',
    'transition:transform .5s cubic-bezier(.2,.8,.2,1);}',
    '.pvr--open .pvr__frame{transform:scale(1) translateY(0);}',

    /* image */
    '.pvr__img{display:block;',
    'max-width:min(92vw,1200px);',
    'max-height:82vh;',
    'object-fit:contain;',
    'border-radius:2px;',
    'box-shadow:0 32px 90px rgba(0,0,0,.6);',
    'pointer-events:none;}',

    /* bar below image: caption + close */
    '.pvr__bar{display:flex;align-items:center;justify-content:space-between;',
    'padding:10px 0 0;gap:24px;min-height:32px;}',

    '.pvr__caption{',
    'font-family:"DM Mono",ui-monospace,monospace;',
    'font-size:10px;letter-spacing:.08em;text-transform:uppercase;',
    'color:rgba(245,240,232,.38);',
    'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',

    '.pvr__close{background:none;border:none;color:rgba(245,240,232,.55);',
    'font-family:"DM Mono",ui-monospace,monospace;',
    'font-size:10px;letter-spacing:.12em;text-transform:uppercase;',
    'cursor:pointer;padding:0;white-space:nowrap;flex-shrink:0;',
    'display:inline-flex;align-items:center;gap:7px;',
    'transition:color .2s ease;}',
    '.pvr__close:hover,.pvr__close:focus-visible{color:rgba(245,240,232,1);}',
    '.pvr__close::before{content:"";display:block;width:16px;height:1px;',
    'background:currentColor;flex-shrink:0;}',

    /* mobile "tap anywhere" hint */
    '.pvr__hint{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);',
    'font-family:"DM Mono",ui-monospace,monospace;',
    'font-size:10px;letter-spacing:.18em;text-transform:uppercase;',
    'color:rgba(245,240,232,.3);pointer-events:none;',
    'opacity:0;transition:opacity .4s ease .35s;white-space:nowrap;}',
    '.pvr--open .pvr__hint{opacity:1;}',
    /* show only on touch devices */
    '@media(hover:hover){.pvr__hint{display:none;}}',

    /* trigger cursor */
    '[data-preview]{cursor:pointer;}',

    /* gallery grid used in case pages */
    '.case-gallery{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:36px;}',
    '.case-gallery__item{display:block;overflow:hidden;border-radius:2px;position:relative;',
    'background:#E8E2D8;}',
    '.case-gallery__item:first-child{grid-column:1/-1;}',
    '.case-gallery__item img{width:100%;height:100%;object-fit:cover;display:block;',
    'aspect-ratio:16/10;',
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

  /* ── build overlay DOM once ──────────────────────────────────── */
  var pvr = document.createElement('div');
  pvr.className = 'pvr';
  pvr.setAttribute('role', 'dialog');
  pvr.setAttribute('aria-modal', 'true');
  pvr.setAttribute('aria-label', 'Image preview');

  pvr.innerHTML =
    '<div class="pvr__frame">' +
      '<img class="pvr__img" src="" alt="" />' +
      '<div class="pvr__bar">' +
        '<span class="pvr__caption"></span>' +
        '<button class="pvr__close" aria-label="Close preview">Close &times;</button>' +
      '</div>' +
    '</div>' +
    '<div class="pvr__hint">Tap anywhere to close</div>';

  document.body.appendChild(pvr);

  var pvrImg     = pvr.querySelector('.pvr__img');
  var pvrCaption = pvr.querySelector('.pvr__caption');
  var pvrClose   = pvr.querySelector('.pvr__close');
  var pvrFrame   = pvr.querySelector('.pvr__frame');
  var isOpen     = false;
  var prevFocus  = null;

  /* ── open / close ─────────────────────────────────────────────  */
  function open(src, alt) {
    pvrImg.src = src;
    pvrImg.alt = alt || '';
    pvrCaption.textContent = alt || '';
    prevFocus = document.activeElement;
    pvr.classList.add('pvr--open');
    document.body.style.overflow = 'hidden';
    isOpen = true;
    setTimeout(function () { pvrClose.focus(); }, 60);
  }

  function close() {
    if (!isOpen) return;
    pvr.classList.remove('pvr--open');
    document.body.style.overflow = '';
    isOpen = false;
    if (prevFocus) { try { prevFocus.focus(); } catch (_) {} }
    setTimeout(function () { pvrImg.src = ''; pvrCaption.textContent = ''; }, 400);
  }

  /* ── event wiring ─────────────────────────────────────────────  */
  /* backdrop click → close */
  pvr.addEventListener('click', close);
  /* frame click → stop propagation (don't close) */
  pvrFrame.addEventListener('click', function (e) { e.stopPropagation(); });
  /* close button */
  pvrClose.addEventListener('click', function (e) { e.stopPropagation(); close(); });
  /* mobile hint tap */
  pvr.querySelector('.pvr__hint').addEventListener('click', function (e) { e.stopPropagation(); close(); });
  /* Escape key */
  document.addEventListener('keydown', function (e) {
    if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) close();
  });

  /* ── delegation: wire all [data-preview] elements ────────────── */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-preview]');
    if (!t) return;
    e.preventDefault();
    /* resolve image source */
    var src = t.dataset.previewSrc
           || (t.tagName === 'IMG'    ? t.src  : '')
           || (t.tagName === 'A'      ? t.href : '')
           || '';
    var alt = t.dataset.previewAlt
           || t.getAttribute('alt')
           || t.getAttribute('title')
           || '';
    if (src) open(src, alt);
  });
})();
