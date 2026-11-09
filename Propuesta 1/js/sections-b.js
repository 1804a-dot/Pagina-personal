/* =====================================================================
   Propuesta 1 · sections-b.js (Builder B)
   S8 El libro · S9 Valores · S10 Testimonios · S11 Conferencias/Medios
   S12 Contacto · S13 Footer
   Classic script (no modules). Runs after core.js. Uses window.VA
   (REDUCE, FINE, lenis, mm, t, onLang, scrollTo) + globals gsap,
   ScrollTrigger, SplitType. Every feature is guarded: a missing element
   or library never throws.
   ===================================================================== */
(function () {
  'use strict';

  var W = window;
  var D = document;
  var VA = W.VA || {};
  var G = W.gsap;
  var ST = W.ScrollTrigger;
  var HAS_GSAP = !!(G && ST);
  if (HAS_GSAP) { try { G.registerPlugin(ST); } catch (e) { /* already registered */ } }

  var REDUCE = (typeof VA.REDUCE === 'boolean')
    ? VA.REDUCE
    : !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var FINE = (typeof VA.FINE === 'boolean')
    ? VA.FINE
    : !!(W.matchMedia && W.matchMedia('(hover: hover) and (pointer: fine)').matches);

  /* ------------------------------------------------------------------ *
   * helpers
   * ------------------------------------------------------------------ */
  function qs(s, c) { return (c || D).querySelector(s); }
  function qsa(s, c) { return Array.prototype.slice.call((c || D).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function t(key, vars) {
    try { return typeof VA.t === 'function' ? VA.t(key, vars) : ''; } catch (e) { return ''; }
  }
  function onLang(cb) {
    try { if (typeof VA.onLang === 'function') VA.onLang(cb); } catch (e) { /* noop */ }
  }
  function debounce(fn, ms) {
    var id = 0;
    return function () {
      var a = arguments, self = this;
      clearTimeout(id);
      id = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  }
  function fontsReady(cb) {
    var p = (VA.fontsReady && typeof VA.fontsReady.then === 'function') ? VA.fontsReady
      : (D.fonts && D.fonts.ready && typeof D.fonts.ready.then === 'function' ? D.fonts.ready : null);
    if (p) p.then(cb, cb); else cb();
  }
  function safe(name, fn) {
    try { fn(); } catch (e) { if (W.console && console.warn) console.warn('[sections-b] ' + name + ' failed:', e); }
  }

  var _mm = null;
  /** gsap.matchMedia().add(cond, fn) on the shared instance (falls back to a local one). */
  function mmAdd(cond, fn) {
    if (!HAS_GSAP) return;
    var m = VA.mm;
    if (!m) {
      if (!_mm && typeof G.matchMedia === 'function') _mm = G.matchMedia();
      m = _mm;
    }
    if (m && typeof m.add === 'function') m.add(cond, fn);
    else if (W.matchMedia && W.matchMedia(cond).matches) fn();
  }

  function whenIn(el, cb, opts) {
    if (!el) return null;
    if (!('IntersectionObserver' in W)) { cb(true); return null; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { cb(e.isIntersecting); });
    }, opts || { threshold: 0 });
    io.observe(el);
    return io;
  }

  /**
   * Background videos: the file (data-src) is attached lazily when the band nears the viewport,
   * plays only while on screen, and is never loaded for reduced motion / Save-Data (poster only).
   */
  function bgVideo(v, scope) {
    if (!v) return;
    var save = false;
    try { save = !!(navigator.connection && navigator.connection.saveData); } catch (e) { /* noop */ }
    if (REDUCE || save) {
      v.removeAttribute('autoplay');
      v.removeAttribute('data-src');
      v.preload = 'none';
      return;
    }
    whenIn(scope || v, function (on) {
      try {
        if (on) {
          var src = v.getAttribute('data-src');
          if (src && !v.getAttribute('src')) { v.setAttribute('src', src); v.removeAttribute('data-src'); }
          var p = v.play();
          if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay blocked */ });
        } else if (v.getAttribute('src')) v.pause();
      } catch (e) { /* noop */ }
    }, { threshold: 0, rootMargin: '300px 0px' });
  }

  /** Marker highlight: add .is-in when the element reaches ~75% of the viewport. */
  function markOnView(el) {
    if (!el) return;
    if (REDUCE || !('IntersectionObserver' in W)) { el.classList.add('is-in'); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { el.classList.add('is-in'); io.unobserve(el); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -25% 0px' });
    io.observe(el);
  }

  /** Splits el's text into masked words/chars (own implementation: no horizontal clipping). */
  function charsify(el) {
    var text = (el.textContent || '').replace(/\s+/g, ' ').replace(/^\s|\s$/g, '');
    if (!text) return [];
    el.textContent = '';
    var sr = D.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    el.appendChild(sr);
    var chars = [];
    var words = text.split(' ');
    words.forEach(function (word, wi) {
      var w = D.createElement('span');
      w.className = 'b-w';
      w.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < word.length; i++) {
        var c = D.createElement('span');
        c.className = 'b-c';
        c.textContent = word.charAt(i);
        w.appendChild(c);
        chars.push(c);
      }
      el.appendChild(w);
      if (wi < words.length - 1) el.appendChild(D.createTextNode(' '));
    });
    return chars;
  }

  /** Char split + "rise" reveal on enter. Returns build() so callers can rebuild after a language swap. */
  function bindChars(el, o) {
    o = o || {};
    var state = { done: false, st: null };
    function build() {
      if (state.st) { try { state.st.kill(); } catch (e) { /* noop */ } state.st = null; }
      var chars = charsify(el);
      if (!chars.length || REDUCE || !HAS_GSAP || state.done) return;
      G.set(chars, { yPercent: 110 });
      state.st = ST.create({
        trigger: o.trigger || el,
        start: o.start || 'top 90%',
        once: true,
        onEnter: function () {
          state.done = true;
          G.to(chars, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: o.stagger || 0.03, delay: o.delay || 0, overwrite: true });
        }
      });
    }
    build();
    return build;
  }

  /* ------------------------------------------------------------------ *
   * links: "#" placeholders never jump to top; in-page anchors fall back
   * to VA.scrollTo when core.js did not handle the click itself.
   * ------------------------------------------------------------------ */
  function links() {
    D.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('#libro a, #valores a, #testimonios a, #conferencias a, #contacto a, #footer a') : null;
      if (!a) return;
      var h = a.getAttribute('href');
      if (h === '#') { e.preventDefault(); return; }
      if (h && h.length > 1 && h.charAt(0) === '#' && !e.defaultPrevented) {
        var target = null;
        try { target = D.querySelector(h); } catch (err) { target = null; }
        if (target) {
          e.preventDefault();
          if (typeof VA.scrollTo === 'function') VA.scrollTo(h);
          else target.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' });
        }
      }
    });
  }

  /** Select a request type in the contact form (used by the accordion links and the speaking CTA). */
  function selectType(value) {
    var input = qs('#contacto input[name="type"][value="' + value + '"]');
    if (!input) return;
    input.checked = true;
    try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) { /* noop */ }
  }

  /* ------------------------------------------------------------------ *
   * S8 · EL LIBRO
   * ------------------------------------------------------------------ */
  function libro() {
    var sec = qs('#libro');
    if (!sec) return;

    bgVideo(qs('.libro__video', sec), sec);
    qsa('.b-mark', sec).forEach(markOnView);

    var stage = qs('.libro__stage', sec);
    var book = qs('[data-book]', sec);
    if (!stage || !book) return;
    var ghost = qs('[data-ghost]', sec);
    var shadow = qs('[data-shadow]', sec);
    var sats = qsa('[data-depth]', sec).map(function (el) {
      return { el: el, d: parseFloat(el.getAttribute('data-depth')) || 0 };
    });

    // state: scroll-driven pose (s*), pointer target (t*) and lerped pointer (p*)
    var S = { sry: -14, srx: 2, sy: 0, p: 0.5, px: 0, py: 0, tx: 0, ty: 0 };
    var K = 80;
    var running = false;

    function paint(time) {
      var fl = 0, sway = 0;
      if (!REDUCE) {
        fl = Math.sin(time * Math.PI * 2 / 6) * 10;            // idle float: +-10px, 6s sine
        if (!FINE) sway = Math.sin(time * 0.9) * 4;            // touch: gentle auto sway (no gyro)
      }
      S.px += (S.tx - S.px) * 0.08;
      S.py += (S.ty - S.py) * 0.08;
      var ry = S.sry + S.px * 14 + sway;
      var rx = S.srx - S.py * 8;
      book.style.transform = 'translate3d(0,' + (S.sy + fl).toFixed(2) + 'px,0) rotateX(' + rx.toFixed(3) + 'deg) rotateY(' + ry.toFixed(3) + 'deg)';
      for (var i = 0; i < sats.length; i++) {
        var s = sats[i];
        var x = S.px * s.d * K;
        var y = S.py * s.d * K - (S.p - 0.5) * s.d * 120;
        s.el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)';
      }
      if (shadow) {
        shadow.style.transform = 'scale(' + (1 + (fl / 10) * 0.08).toFixed(3) + ')';
        shadow.style.opacity = (0.9 + (fl / 10) * 0.12).toFixed(2);
      }
    }
    function tick(time) { paint(time); }
    function run() { if (running || !HAS_GSAP) return; running = true; G.ticker.add(tick); }
    function halt() { if (!running) return; running = false; G.ticker.remove(tick); }

    paint(0);

    // pointer depth parallax (desktop only)
    if (FINE && !REDUCE) {
      stage.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = stage.getBoundingClientRect();
        if (!r.width || !r.height) return;
        S.tx = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
        S.ty = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
      }, { passive: true });
      stage.addEventListener('pointerleave', function () { S.tx = 0; S.ty = 0; });
    }

    mmAdd('(prefers-reduced-motion: no-preference)', function () {
      // scroll pose: rotateY 32 -> -12, rotateX 6 -> 0, y 60 -> -30 (scrub 1)
      G.fromTo(S, { sry: 32, srx: 6, sy: 60 }, {
        sry: -12, srx: 0, sy: -30, ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 1,
          onUpdate: function (self) { S.p = self.progress; }
        }
      });
      if (ghost) {
        G.fromTo(ghost, { yPercent: -15 }, {
          yPercent: 15, ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
      // only animate the 3D scene while it is on screen
      var io = whenIn(stage, function (on) { if (on) run(); else halt(); }, { threshold: 0, rootMargin: '80px 0px' });
      return function () {
        halt();
        if (io) io.disconnect();
        S.sry = -14; S.srx = 2; S.sy = 0; S.p = 0.5;
        paint(0);
      };
    });
  }

  /* ------------------------------------------------------------------ *
   * S9 · VALORES  (sticky stack: scale + brightness, image parallax)
   * ------------------------------------------------------------------ */
  function valores() {
    var cards = qsa('#valores .val');
    if (!cards.length || !HAS_GSAP) return;

    function stickyTop(el) {
      var v = parseFloat(W.getComputedStyle(el).top);
      return isNaN(v) ? 100 : v;
    }
    function build(desktop) {
      cards.forEach(function (card, i) {
        var next = cards[i + 1];
        var img = qs('.val__media img', card);
        if (next) {
          G.fromTo(card,
            { scale: 1, filter: 'brightness(1)' },
            {
              scale: desktop ? 0.94 : 0.96,
              filter: desktop ? 'brightness(0.55)' : 'brightness(1)',
              transformOrigin: '50% 0', ease: 'none',
              scrollTrigger: {
                trigger: next, start: 'top 86%',
                end: function () { return 'top ' + stickyTop(next) + 'px'; },
                scrub: true, invalidateOnRefresh: true
              }
            });
        }
        if (img) {
          G.fromTo(img, { yPercent: -6 }, {
            yPercent: 6, ease: 'none',
            scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true }
          });
        }
      });
    }
    mmAdd('(min-width: 769px) and (prefers-reduced-motion: no-preference)', function () { build(true); });
    mmAdd('(max-width: 768px) and (prefers-reduced-motion: no-preference)', function () { build(false); });
  }

  /* ------------------------------------------------------------------ *
   * S10 · TESTIMONIOS  (slider)
   * ------------------------------------------------------------------ */
  function testimonios() {
    var root = qs('#testimonios');
    var sl = root && qs('[data-tsl]', root);
    if (!sl) return;
    var slides = qsa('.tslide', sl);
    var n = slides.length;
    if (n < 2) return;

    var card = qs('.tsl__card', sl);
    var fill = qs('[data-tsl-fill]', sl);
    var curEl = qs('[data-tsl-cur]', sl);
    var totEl = qs('[data-tsl-tot]', sl);
    var status = qs('[data-tsl-status]', sl);
    var prevBtn = qs('[data-tsl-prev]', sl);
    var nextBtn = qs('[data-tsl-next]', sl);

    var DUR = 7;
    var AUTO = !REDUCE && HAS_GSAP;
    var HAS_SPLIT = typeof W.SplitType === 'function';
    var cur = 0, tl = null, prog = null;
    var inView = false, hover = false, focused = false, dragging = false, fontsOK = false, needReset = false;

    function pad(i) { return (i < 10 ? '0' : '') + i; }
    function first(s, sel) { return qs(sel, s); }

    function setUI() {
      if (curEl) curEl.textContent = pad(cur + 1);
      if (totEl) totEl.textContent = pad(n);
      slides.forEach(function (s, i) {
        s.setAttribute('aria-label', (i + 1) + ' / ' + n);
      });
    }
    function announce() {
      if (!status) return;
      var nameEl = first(slides[cur], '.tslide__name');
      var txt = t('a11y.carousel_status', { current: cur + 1, total: n });
      status.textContent = (txt ? txt : (cur + 1) + ' / ' + n) + (nameEl ? ' — ' + nameEl.textContent : '');
    }

    /* line-mask split, on demand (fonts must be ready) */
    function wrapLines(q) {
      qsa('.line', q).forEach(function (line) {
        var m = D.createElement('span');
        m.className = 'line-mask';   // shared mask primitive from base.css
        line.parentNode.insertBefore(m, line);
        m.appendChild(line);
      });
    }
    function splitSlide(s) {
      var q = first(s, '.tslide__q');
      if (!q || !HAS_SPLIT || !fontsOK) return [];
      if (!s._split) {
        try {
          s._split = new W.SplitType(q, { types: 'lines', tagName: 'span' });
          wrapLines(q);
        } catch (e) { s._split = null; return []; }
      }
      return qsa('.line', q);
    }
    function resetSplits() {
      slides.forEach(function (s) {
        if (s._split) { try { s._split.revert(); } catch (e) { /* noop */ } s._split = null; }
      });
    }
    function parts(s) {
      return {
        tag: first(s, '.tslide__tag'),
        who: first(s, '.tslide__who'),
        ph: first(s, '.tslide__ph')
      };
    }
    function clearAnim(s) {
      if (!HAS_GSAP) return;
      var p = parts(s);
      var els = [s, p.tag, p.who, p.ph].concat(qsa('.line', s)).filter(Boolean);
      if (els.length) G.set(els, { clearProps: 'transform,opacity,visibility' });
    }
    function finalize() {
      if (tl) { tl.kill(); tl = null; }
      slides.forEach(function (s, i) {
        s.classList.toggle('is-active', i === cur);
        clearAnim(s);
      });
      if (needReset) { needReset = false; resetSplits(); }
    }

    function go(to, user) {
      to = ((to % n) + n) % n;
      if (to === cur) return;
      finalize();                       // settle any running transition first
      var out = slides[cur];
      var inn = slides[to];
      cur = to;
      setUI();
      if (user) announce();

      if (!HAS_GSAP || REDUCE) {
        slides.forEach(function (s, i) { s.classList.toggle('is-active', i === cur); });
      } else {
        var outLines = splitSlide(out);
        var inLines = splitSlide(inn);
        var po = parts(out), pi = parts(inn);
        inn.classList.add('is-active');  // both stacked in the same grid cell while swapping
        tl = G.timeline({ onComplete: finalize });
        if (outLines.length && inLines.length) {
          G.set(inLines, { yPercent: 110 });
          G.set([pi.tag, pi.who], { autoAlpha: 0, y: 24 });
          G.set(pi.ph, { autoAlpha: 0, scale: 1.12 });
          tl.to(outLines, { yPercent: -110, duration: 0.6, ease: 'power3.in', stagger: 0.05 }, 0)
            .to([po.tag, po.who], { autoAlpha: 0, y: -14, duration: 0.45, ease: 'power2.in' }, 0)
            .to(po.ph, { autoAlpha: 0, duration: 0.5, ease: 'power1.in' }, 0)
            .to(pi.tag, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.5)
            .to(inLines, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.45)
            .to(pi.who, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.75)
            .to(pi.ph, { autoAlpha: 1, scale: 1, duration: 1.2, ease: 'expo.out' }, 0.55);
        } else {
          // fallback: plain cross-fade
          G.set(inn, { autoAlpha: 0 });
          tl.to(out, { autoAlpha: 0, duration: 0.45, ease: 'power1.in' }, 0)
            .to(inn, { autoAlpha: 1, duration: 0.6, ease: 'power1.out' }, 0.3);
        }
      }
      restartProgress();
    }
    function step(d, user) { go(cur + d, user); }

    /* autoplay + progress hairline */
    function shouldPlay() { return AUTO && inView && !hover && !focused && !dragging && !D.hidden; }
    function updatePlay() {
      if (!prog) return;
      if (shouldPlay()) prog.resume(); else prog.pause();
    }
    function restartProgress() {
      if (!prog) return;
      prog.pause(0);
      updatePlay();
    }
    if (AUTO && fill) {
      prog = G.fromTo(fill, { scaleX: 0 }, {
        scaleX: 1, duration: DUR, ease: 'none', paused: true,
        onComplete: function () { go(cur + 1, false); }
      });
    }

    /* controls */
    if (prevBtn) prevBtn.addEventListener('click', function () { step(-1, true); });
    if (nextBtn) nextBtn.addEventListener('click', function () { step(1, true); });
    sl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1, true); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1, true); }
    });
    sl.addEventListener('mouseenter', function () { hover = true; updatePlay(); });
    sl.addEventListener('mouseleave', function () { hover = false; updatePlay(); });
    sl.addEventListener('focusin', function () { focused = true; updatePlay(); });
    sl.addEventListener('focusout', function (e) {
      if (!e.relatedTarget || !sl.contains(e.relatedTarget)) { focused = false; updatePlay(); }
    });

    /* swipe / drag (pointer events, 40px threshold) */
    var drag = null;
    if (card) {
      card.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target.closest && e.target.closest('button, a')) return;
        drag = { x: e.clientX, y: e.clientY };
        dragging = true;
        updatePlay();
      });
      var endDrag = function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag = null;
        dragging = false;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1, true);
        else updatePlay();
      };
      W.addEventListener('pointerup', endDrag);
      W.addEventListener('pointercancel', function () { drag = null; dragging = false; updatePlay(); });
    }

    whenIn(root, function (on) { inView = on; updatePlay(); }, { threshold: 0.3 });
    D.addEventListener('visibilitychange', updatePlay);

    fontsReady(function () { fontsOK = true; });
    W.addEventListener('resize', debounce(function () {
      if (tl) needReset = true; else resetSplits();
    }, 250));

    onLang(function () {
      // text was swapped by core.js: split instances are stale (never revert them)
      if (tl) { tl.kill(); tl = null; }
      slides.forEach(function (s) { s._split = null; });
      finalize();
      setUI();
      if (status) status.textContent = '';
    });

    setUI();
  }

  /* ------------------------------------------------------------------ *
   * S11 · CONFERENCIAS / MEDIOS
   * ------------------------------------------------------------------ */
  function conferencias() {
    var sec = qs('#conferencias');
    if (!sec) return;
    var band = qs('.conf__band', sec);

    bgVideo(qs('.conf__video', sec), band);

    /* parallax on the stage media + outlined slogan marquee */
    mmAdd('(prefers-reduced-motion: no-preference)', function () {
      var media = qs('[data-conf-media]', sec);
      if (media && band) {
        G.fromTo(media, { yPercent: -10 }, {
          yPercent: 10, ease: 'none',
          scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
      var wrap = qs('[data-conf-marquee]', sec);
      var track = wrap && qs('.conf__track', wrap);
      if (!track) return;
      var tween = null;
      var onScroll = null;
      function buildMarquee() {
        if (tween) tween.kill();
        var total = track.scrollWidth;
        if (!total) return;
        // opposite direction to the figures marquee (moves to the right), ~70px/s
        tween = G.fromTo(track, { xPercent: -50 }, { xPercent: 0, ease: 'none', duration: (total / 2) / 70, repeat: -1 });
      }
      buildMarquee();
      fontsReady(buildMarquee);
      var onResize = debounce(buildMarquee, 250);
      W.addEventListener('resize', onResize);
      var io = whenIn(wrap, function (on) { if (tween) { if (on) tween.resume(); else tween.pause(); } }, { threshold: 0 });
      var lenis = VA.lenis;
      if (lenis && typeof lenis.on === 'function') {
        onScroll = function (e) {
          if (!tween) return;
          var v = Math.abs((e && e.velocity) || 0);
          tween.timeScale(1 + Math.min(v * 0.1, 3));
          G.to(tween, { timeScale: 1, duration: 0.8, overwrite: true });
        };
        lenis.on('scroll', onScroll);
      }
      return function () {
        if (tween) tween.kill();
        if (io) io.disconnect();
        W.removeEventListener('resize', onResize);
        if (lenis && onScroll && typeof lenis.off === 'function') lenis.off('scroll', onScroll);
      };
    });

    /* accordion of request types (one open at a time) */
    var acc = qs('[data-acc]', sec);
    if (acc) {
      var items = qsa('.acc__item', acc);
      var btns = items.map(function (it) { return qs('.acc__btn', it); });
      var setOpen = function (it, open) {
        it.classList.toggle('is-open', open);
        var b = qs('.acc__btn', it);
        if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      var refresh = debounce(function () { if (HAS_GSAP) ST.refresh(); }, 350);
      items.forEach(function (it, i) {
        var b = btns[i];
        if (!b) return;
        b.addEventListener('click', function () {
          var open = it.classList.contains('is-open');
          items.forEach(function (o) { setOpen(o, o === it ? !open : false); });
          refresh();
        });
        b.addEventListener('keydown', function (e) {
          var k = e.key, to = -1;
          if (k === 'ArrowDown') to = (i + 1) % items.length;
          else if (k === 'ArrowUp') to = (i - 1 + items.length) % items.length;
          else if (k === 'Home') to = 0;
          else if (k === 'End') to = items.length - 1;
          if (to > -1 && btns[to]) { e.preventDefault(); btns[to].focus(); }
        });
      });
    }

    /* "request" links/buttons: select the matching type in the form, then scroll (href="#contacto") */
    qsa('[data-type]', sec).forEach(function (a) {
      a.addEventListener('click', function (e) {
        selectType(a.getAttribute('data-type'));
        if (e.detail === 0) { // keyboard activation: move focus into the form after the scroll
          setTimeout(function () {
            var msg = qs('#cf-message');
            if (msg) { try { msg.focus({ preventScroll: true }); } catch (err) { /* noop */ } }
          }, 1500);
        }
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * S12 · CONTACTO
   * ------------------------------------------------------------------ */
  function contacto() {
    var sec = qs('#contacto');
    if (!sec) return;

    /* giant "Hablemos." rises char by char */
    var title0 = qs('[data-split-chars]', sec);
    var rebuildTitle = title0 ? bindChars(title0, { start: 'top 88%', stagger: 0.03 }) : null;

    /* WhatsApp link: base url + ?text=<prefill> */
    var wa = qs('[data-wa]', sec);
    function setWa() {
      if (!wa) return;
      var base = t('contact.whatsapp_url');
      var txt = t('contact.whatsapp_prefill');
      if (base && base.indexOf('http') === 0) wa.setAttribute('href', base + '?text=' + encodeURIComponent(txt || ''));
    }
    setWa();

    var form = qs('#cform', sec);

    /* ---------- form ---------- */
    var F = form ? {
      name: qs('#cf-name', form),
      email: qs('#cf-email', form),
      company: qs('#cf-company', form),
      message: qs('#cf-message', form)
    } : null;
    var typeInputs = form ? qsa('input[name="type"]', form) : [];
    var statusEl = form ? qs('[data-status]', form) : null;
    var submitBtn = form ? qs('button[type="submit"]', form) : null;
    var submitLbl = submitBtn ? qs('.btn__label', submitBtn) : null;
    var errors = {};          // field -> i18n key
    var attempted = false;
    var sending = false;
    var result = null;        // { ok:boolean, name:string }
    var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function getType() {
      for (var i = 0; i < typeInputs.length; i++) if (typeInputs[i].checked) return typeInputs[i];
      return null;
    }
    function wrapOf(name) { return form ? qs('[data-field="' + name + '"]', form) : null; }
    function showErr(name, key) {
      var wrap = wrapOf(name);
      if (!wrap) return;
      var p = qs('.field__err', wrap);
      var inputs = name === 'type' ? typeInputs : qsa('input, textarea', wrap);
      if (key) {
        errors[name] = key;
        if (p) p.textContent = t(key);
        wrap.setAttribute('data-invalid', 'true');
        inputs.forEach(function (i) { i.setAttribute('aria-invalid', 'true'); });
      } else {
        delete errors[name];
        if (p) p.textContent = '';
        wrap.removeAttribute('data-invalid');
        inputs.forEach(function (i) { i.removeAttribute('aria-invalid'); });
      }
    }
    function check(name) {
      var v;
      if (name === 'name') {
        v = F.name.value.trim();
        if (!v) return 'contact.validation.required';
        if (v.length < 2) return 'contact.validation.name_short';
      } else if (name === 'email') {
        v = F.email.value.trim();
        if (!v) return 'contact.validation.required';
        if (!RE_EMAIL.test(v)) return 'contact.validation.email_invalid';
      } else if (name === 'type') {
        if (!getType()) return 'contact.validation.type_required';
      } else if (name === 'message') {
        v = F.message.value.trim();
        if (!v) return 'contact.validation.required';
        if (v.length < 20) return 'contact.validation.message_short';
      }
      return null;
    }
    function validateAll() {
      var firstBad = null;
      ['name', 'email', 'type', 'message'].forEach(function (n) {
        var k = check(n);
        showErr(n, k);
        if (k && !firstBad) firstBad = n;
      });
      return firstBad;
    }
    function renderErrors() {
      Object.keys(errors).forEach(function (n) { showErr(n, errors[n]); });
    }
    function renderStatus() {
      if (!statusEl) return;
      statusEl.textContent = '';
      if (!result) return;
      var box = D.createElement('div');
      box.className = 'cform__ok' + (result.ok ? '' : ' cform__ok--err');
      var h = D.createElement('p');
      h.className = 'cform__ok-t';
      h.textContent = t(result.ok ? 'contact.messages.success_title' : 'contact.messages.error_title');
      var p = D.createElement('p');
      p.className = 'cform__ok-p';
      p.textContent = t(result.ok ? 'contact.messages.success_text' : 'contact.messages.error_text', { name: result.name });
      box.appendChild(h);
      box.appendChild(p);
      statusEl.appendChild(box);
    }
    function setBusy(on) {
      sending = on;
      if (!submitBtn) return;
      submitBtn.disabled = on;
      submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
      if (submitLbl) submitLbl.textContent = t(on ? 'contact.form.sending' : 'contact.form.submit');
    }
    function buildMailto() {
      var typeEl = getType();
      var typeLabel = typeEl && typeEl.nextElementSibling ? typeEl.nextElementSibling.textContent.trim() : (typeEl ? typeEl.value : '');
      var vars = {
        name: F.name.value.trim(),
        email: F.email.value.trim(),
        company: F.company.value.trim() || '—',
        type: typeLabel,
        message: F.message.value.trim().slice(0, 1800)
      };
      var subject = t('contact.form.mailto_subject', vars);
      var body = t('contact.form.mailto_body', vars).replace(/\r?\n/g, '\r\n');
      return 'mailto:' + t('contact.email') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }
    function send() {
      var name = F.name.value.trim();
      var href;
      try { href = buildMailto(); } catch (e) { href = null; }
      setBusy(true);
      result = null;
      renderStatus();
      setTimeout(function () {
        try {
          if (!href) throw new Error('mailto');
          W.location.href = href;
          result = { ok: true, name: name };
        } catch (e) {
          result = { ok: false, name: name };
        }
        setBusy(false);
        renderStatus();
      }, 650);
    }

    if (form && F && F.name && F.email && F.message) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (sending) return;
        attempted = true;
        var bad = validateAll();
        if (bad) {
          var target = bad === 'type' ? typeInputs[0] : F[bad];
          if (target && target.focus) target.focus();
          return;
        }
        send();
      });
      ['name', 'email', 'message'].forEach(function (n) {
        var el = F[n];
        el.addEventListener('blur', function () { if (attempted || el.value.trim()) showErr(n, check(n)); });
        el.addEventListener('input', function () { if (attempted || errors[n]) showErr(n, check(n)); });
      });
      typeInputs.forEach(function (i) {
        i.addEventListener('change', function () { if (attempted || errors.type) showErr('type', check('type')); });
      });
    }

    onLang(function () {
      setWa();
      if (rebuildTitle) rebuildTitle();
      renderErrors();
      renderStatus();
      if (submitLbl && !sending) submitLbl.textContent = t('contact.form.submit');
    });
  }

  /* ------------------------------------------------------------------ *
   * S13 · FOOTER
   * ------------------------------------------------------------------ */
  function footer() {
    var f = qs('#footer');
    if (!f) return;
    var name = qs('[data-foot-name]', f);
    var fit = name && qs('.foot__fit', name);

    if (name && fit) {
      var lines = qsa('.foot__l', fit);
      lines.forEach(function (l, i) { bindChars(l, { trigger: name, start: 'top 90%', stagger: 0.02, delay: i * 0.12 }); });

      var doFit = function () {
        name.style.fontSize = '100px';
        var w = fit.getBoundingClientRect().width;
        var avail = name.clientWidth;
        if (w > 0 && avail > 0) name.style.fontSize = (Math.floor((avail / w) * 1000) / 10) + 'px';
        else name.style.fontSize = '';
      };
      doFit();
      fontsReady(doFit);
      W.addEventListener('resize', debounce(doFit, 120));
      W.addEventListener('load', doFit);
      onLang(doFit);
    }

    var top = qs('[data-top]', f);
    if (top) {
      top.addEventListener('click', function () {
        if (typeof VA.scrollTo === 'function') VA.scrollTo(0, { duration: 1.8 });
        else W.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' });
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * boot
   * ------------------------------------------------------------------ */
  function init() {
    safe('links', links);
    safe('libro', libro);
    safe('valores', valores);
    safe('testimonios', testimonios);
    safe('conferencias', conferencias);
    safe('contacto', contacto);
    safe('footer', footer);
    if (HAS_GSAP) {
      W.addEventListener('load', function () { try { ST.refresh(); } catch (e) { /* noop */ } });
    }
  }
  init();
})();
