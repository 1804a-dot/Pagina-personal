/* ==========================================================================
   Propuesta 1 - core.js (Builder A)
   Lenis + ScrollTrigger sync · i18n engine · window.VA API · reveal primitives ·
   custom cursor · nav / fullscreen menu / contact tab · preloader · anchors
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!window.gsap || !window.ScrollTrigger) {
    root.classList.remove('js', 'is-loading');
    if (window.console) console.warn('[VA] GSAP / ScrollTrigger not found - running without animations.');
    return;
  }

  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: 'power3.out', duration: 1 });
  ScrollTrigger.config({ ignoreMobileResize: true });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var stripTags = function (s) { return String(s).replace(/<[^>]+>/g, ''); };
  var safe = function (fn) { try { return fn(); } catch (e) { if (window.console) console.error(e); } };

  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ------------------------------------------------------------------ Lenis */
  var lenis = null;
  if (!REDUCE && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.5
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ------------------------------------------------------------------- i18n */
  var DICT = window.VA_I18N || {};
  var STORE_KEY = 'va-lang';
  var lang = 'es';
  try { var stored = localStorage.getItem(STORE_KEY); if (stored === 'en' || stored === 'es') lang = stored; } catch (e) {}

  function walk(obj, key) {
    var o = obj, parts = String(key).split('.');
    for (var i = 0; i < parts.length; i++) { if (o == null) return undefined; o = o[parts[i]]; }
    return o;
  }
  function getRaw(key, l) {
    var cur = l || lang, v = walk(DICT[cur], key);
    if (v === undefined && cur !== 'es') v = walk(DICT.es, key);
    return v;
  }
  function t(key, vars) {
    var v = getRaw(key);
    if (v == null) return '';
    v = String(v);
    if (vars) v = v.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return v;
  }

  function applyI18n(scope) {
    scope = scope || document;
    var nodes = scope.querySelectorAll ? $$('[data-i18n]', scope) : [];
    if (scope.matches && scope.matches('[data-i18n]')) nodes.unshift(scope);
    nodes.forEach(function (el) {
      var v = getRaw(el.getAttribute('data-i18n'));
      if (typeof v === 'number') v = String(v);
      if (typeof v === 'string' && el.innerHTML !== v) el.innerHTML = v;
    });
    var an = scope.querySelectorAll ? $$('[data-i18n-attr]', scope) : [];
    if (scope.matches && scope.matches('[data-i18n-attr]')) an.unshift(scope);
    an.forEach(function (el) {
      el.getAttribute('data-i18n-attr').split('|').forEach(function (pair) {
        var i = pair.indexOf(':'); if (i < 1) return;
        var a = pair.slice(0, i).trim(), k = pair.slice(i + 1).trim(), v = getRaw(k);
        if (typeof v === 'string') el.setAttribute(a, stripTags(v));
      });
    });
  }
  function setMeta(sel, val) { var m = $(sel); if (m && val != null) m.setAttribute('content', val); }
  function applyMeta() {
    var m = DICT[lang] && DICT[lang].meta;
    if (m) {
      root.setAttribute('lang', m.lang);
      document.title = stripTags(m.title);
      setMeta('meta[name="description"]', m.description);
      setMeta('meta[property="og:title"]', m.og_title);
      setMeta('meta[property="og:description"]', m.og_description);
      setMeta('meta[property="og:locale"]', m.locale);
      setMeta('meta[property="og:site_name"]', m.site_name);
      setMeta('meta[property="og:image:alt"]', m.og_image_alt);
      setMeta('meta[name="twitter:title"]', m.og_title);
      setMeta('meta[name="twitter:description"]', m.og_description);
    }
    $$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false'); });
  }

  /* -------------------------------------------------------------- SplitType */
  var splits = new Set();
  var fontsOK = false;
  var fontsReady = new Promise(function (res) {
    var done = function () { fontsOK = true; res(); };
    if (!document.fonts || !document.fonts.load) { done(); return; }
    var loads = [
      document.fonts.load('500 64px "Cormorant Garamond"'),
      document.fonts.load('300 64px "Cormorant Garamond"'),
      document.fonts.load('italic 400 32px "Cormorant Garamond"'),
      document.fonts.load('400 16px "Manrope"'),
      document.fonts.load('600 12px "Manrope"')
    ];
    Promise.race([
      Promise.all(loads).then(function () { return document.fonts.ready; }),
      new Promise(function (r) { setTimeout(r, 3000); })
    ]).then(done, done);
  });

  function wrapLines(inst) {
    (inst.lines || []).forEach(function (l) {
      var p = l.parentNode;
      if (!p || (p.classList && p.classList.contains('line-mask'))) return;
      var m = document.createElement('span');
      m.className = 'line-mask';
      p.insertBefore(m, l);
      m.appendChild(l);
    });
  }

  function split(el, types, opts) {
    opts = opts || {};
    types = types || 'lines';
    var rec = { el: el, types: types, inst: null, cbs: [], alive: true };
    rec.revert = function () {
      if (rec.inst) { safe(function () { rec.inst.revert(); }); rec.inst = null; }
    };
    rec.run = function () {
      if (!rec.alive) return;
      rec.revert();
      if (opts.prepare) safe(function () { opts.prepare(el); });
      try {
        rec.inst = new window.SplitType(el, { types: types, tagName: 'span', lineClass: 'line', wordClass: 'word', charClass: 'char' });
        wrapLines(rec.inst);
      } catch (e) { rec.inst = null; if (window.console) console.error('[VA] split failed', e); }
      el.classList.add('is-split');
      rec.cbs.forEach(function (cb) { safe(function () { cb(rec.inst); }); });
    };
    var api = {
      get instance() { return rec.inst; },
      onSplit: function (cb) { rec.cbs.push(cb); if (rec.inst) safe(function () { cb(rec.inst); }); return api; },
      revert: function () { rec.alive = false; rec.revert(); splits.delete(rec); }
    };
    splits.add(rec);
    if (!window.SplitType) { el.classList.add('is-split'); return api; }
    if (fontsOK) rec.run(); else fontsReady.then(function () { if (rec.alive && !rec.inst) rec.run(); });
    return api;
  }

  var lastW = window.innerWidth, rzT = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () {
      var w = window.innerWidth;
      if (w === lastW) return;
      lastW = w;
      splits.forEach(function (r) { if (/lines/.test(r.types) && r.inst) r.run(); });
      ScrollTrigger.refresh();
    }, 250);
  });

  /* ---------------------------------------------------------- language swap */
  var langCbs = [];
  var pendingLang = null;
  function swapNow(next) {
    lang = next;
    splits.forEach(function (r) { r.revert(); });
    applyI18n(document);
    applyMeta();
    splits.forEach(function (r) { r.run(); });
    langCbs.forEach(function (cb) { safe(function () { cb(lang); }); });
    syncBurger();
    ScrollTrigger.refresh();
  }
  function setLang(next, o) {
    if (!DICT[next]) return;
    var initial = !!(o && o.initial);
    if (!initial && next === lang && !pendingLang) return;
    try { localStorage.setItem(STORE_KEY, next); } catch (e) {}
    if (initial || REDUCE) { swapNow(next); return; }
    if (pendingLang) { pendingLang = next; return; }
    pendingLang = next;
    root.classList.add('lang-swap');
    setTimeout(function () {
      var n = pendingLang; pendingLang = null;
      if (n !== lang) swapNow(n);
      setTimeout(function () { root.classList.remove('lang-swap'); }, 60);
    }, 200);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lang]');
    if (b) { e.preventDefault(); setLang(b.getAttribute('data-lang')); }
  });

  /* ------------------------------------------------------------ nav / menu */
  var nav = $('#nav'), menu = $('#menu'), burger = $('.burger');
  var menuOpen = false, lastFocus = null;

  function navH() { return nav ? nav.offsetHeight : 0; }
  function syncBurger() {
    if (burger) burger.setAttribute('aria-label', t(menuOpen ? 'a11y.menu_close' : 'a11y.menu_open'));
  }
  function focusables() {
    return $$('a[href],button:not([disabled])', menu).filter(function (el) { return el.getClientRects().length > 0; });
  }
  function openMenu() {
    if (menuOpen || !menu) return;
    menuOpen = true; lastFocus = document.activeElement;
    menu.removeAttribute('inert'); menu.setAttribute('aria-hidden', 'false'); menu.classList.add('is-open');
    burger.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true');
    root.classList.add('menu-open');
    if (lenis) lenis.stop();
    syncBurger();
    if (!REDUCE) {
      gsap.fromTo($$('.menu__item, .menu__bottom', menu), { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: .8, ease: 'expo.out', stagger: .06, delay: .45, overwrite: true, clearProps: 'transform,opacity' });
    }
    setTimeout(function () { var c = $('.menu__close', menu); if (c && menuOpen) c.focus({ preventScroll: true }); }, 120);
  }
  function closeMenu(o) {
    if (!menuOpen || !menu) return;
    menuOpen = false;
    menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true'); menu.setAttribute('inert', '');
    burger.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false');
    root.classList.remove('menu-open');
    if (lenis && !root.classList.contains('is-loading')) lenis.start();
    syncBurger();
    if (!(o && o.noFocus) && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  if (burger) burger.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });
  var closeBtn = $('.menu__close'); if (closeBtn) closeBtn.addEventListener('click', function () { closeMenu(); });
  document.addEventListener('keydown', function (e) {
    if (!menuOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(); if (!f.length) return;
    var first = f[0], last = f[f.length - 1], ae = document.activeElement;
    if (!menu.contains(ae)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && ae === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && ae === last) { e.preventDefault(); first.focus(); }
  });
  matchMedia('(min-width:1101px)').addEventListener('change', function (e) { if (e.matches) closeMenu({ noFocus: true }); });

  /* nav scrolled state, scroll progress, contact tab */
  var progI = $('.nav__progress i'), tab = $('.contact-tab'), contactIn = false;
  function onScroll() {
    var y = window.pageYOffset || root.scrollTop || 0;
    if (nav) nav.classList.toggle('is-scrolled', y > 80);
    if (progI) {
      var max = root.scrollHeight - window.innerHeight;
      progI.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0).toFixed(4) + ')';
    }
    if (tab) tab.classList.toggle('is-on', y > window.innerHeight * 0.85 && !contactIn);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------------------------------------------------------- scroll to / anchors */
  function scrollTo(target, opts) {
    opts = opts || {};
    var el = null, y = null;
    if (typeof target === 'number') y = target;
    else { el = typeof target === 'string' ? document.querySelector(target) : target; if (!el) return; }
    var anchorEl = el;
    if (el && el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('pin-spacer')) el = el.parentNode;
    var offset = opts.offset;
    if (offset == null) {
      if (y != null) offset = 0;
      else offset = anchorEl.hasAttribute && anchorEl.hasAttribute('data-anchor-offset') ? (parseFloat(anchorEl.getAttribute('data-anchor-offset')) || 0) : -navH() + 1;
    }
    var dur = opts.duration != null ? opts.duration : 1.6;
    if (lenis) {
      lenis.scrollTo(y != null ? y : el, { offset: offset, duration: dur, immediate: !!opts.immediate, lock: false, onComplete: opts.onComplete });
    } else {
      var top = (y != null ? y : el.getBoundingClientRect().top + window.pageYOffset) + offset;
      window.scrollTo({ top: top, behavior: opts.immediate ? 'auto' : 'smooth' });
      if (opts.onComplete) setTimeout(opts.onComplete, 800);
    }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    var h = a.getAttribute('href');
    if (!h || h.length < 2) return;
    var el = null; try { el = document.querySelector(h); } catch (er) { return; }
    if (!el) return;
    e.preventDefault();
    closeMenu({ noFocus: true });
    scrollTo(el);
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  });

  /* ------------------------------------------------------------ custom cursor */
  var CURSOR_MAP = { ver: 'view', view: 'view', arrastra: 'drag', drag: 'drag', leer: 'read', read: 'read', abrir: 'open', open: 'open' };
  function cursorLabel(raw) { var k = CURSOR_MAP[String(raw).toLowerCase()]; return k ? t('cursor.' + k) : raw; }
  function initCursor() {
    if (!FINE) return;
    var c = $('.cursor'); if (!c) return;
    var dot = $('[data-cursor-dot]', c), ring = $('[data-cursor-ring]', c), label = $('.cursor__label', c);
    root.classList.add('has-cursor');
    c.classList.add('is-hidden');
    var mx = innerWidth / 2, my = innerHeight / 2, dx = mx, dy = my, rx = mx, ry = my, seen = false;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!seen) { seen = true; dx = rx = mx; dy = ry = my; c.classList.remove('is-hidden'); }
    }, { passive: true });
    root.addEventListener('mouseleave', function () { c.classList.add('is-hidden'); });
    root.addEventListener('mouseenter', function () { if (seen) c.classList.remove('is-hidden'); });
    window.addEventListener('pointerdown', function () { c.classList.add('is-down'); });
    window.addEventListener('pointerup', function () { c.classList.remove('is-down'); });
    gsap.ticker.add(function () {
      var kd = REDUCE ? 1 : 0.55, kr = REDUCE ? 1 : 0.18;
      dx += (mx - dx) * kd; dy += (my - dy) * kd; rx += (mx - rx) * kr; ry += (my - ry) * kr;
      dot.style.transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0)';
      ring.style.transform = 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0)';
    });
    var SEL = 'a,button,[role="button"],.btn,[data-cursor],label,summary,select';
    document.addEventListener('pointerover', function (e) {
      var tg = e.target; if (!(tg instanceof Element)) return;
      var input = tg.closest('input,textarea,[contenteditable="true"]');
      c.classList.toggle('is-hidden', !!input || !seen);
      c.classList.toggle('is-link', !!tg.closest(SEL));
      var lab = tg.closest('[data-cursor]'), raw = lab && lab.getAttribute('data-cursor');
      if (raw) { label.textContent = cursorLabel(raw); c.classList.add('has-label'); } else c.classList.remove('has-label');
      root.classList.toggle('cursor-light', !!tg.closest('.section--cream'));
    });
  }

  /* ------------------------------------------------ reveal primitives */
  function initReveals() {
    if (REDUCE) return;
    var rev = $$('[data-reveal]');
    if (rev.length) {
      ScrollTrigger.batch(rev, {
        start: 'top 88%', once: true,
        onEnter: function (batch) {
          batch.forEach(function (el, i) {
            gsap.to(el, {
              opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
              delay: i * 0.08 + (parseFloat(el.getAttribute('data-reveal-delay')) || 0),
              onComplete: function () { el.classList.add('is-revealed'); gsap.set(el, { clearProps: 'opacity,transform' }); }
            });
          });
        }
      });
    }
    $$('[data-stagger]').forEach(function (c) {
      var kids = Array.prototype.slice.call(c.children);
      ScrollTrigger.create({
        trigger: c, start: 'top 85%', once: true,
        onEnter: function () {
          gsap.to(kids, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, ease: 'power3.out',
            onComplete: function () { c.classList.add('is-staggered'); gsap.set(kids, { clearProps: 'opacity,transform' }); } });
        }
      });
    });
    $$('[data-line]').forEach(function (el) {
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: function () {
          gsap.to(el, { scaleX: 1, transformOrigin: '0% 50%', duration: 1.2, ease: 'power3.inOut',
            onComplete: function () { el.classList.add('is-drawn'); gsap.set(el, { clearProps: 'transform' }); } });
        }
      });
    });
    $$('[data-lines]').forEach(function (el) {
      function build(lines) {
        if (el.__lt) { el.__lt.kill(); el.__lt = null; }
        if (!lines || !lines.length) return;
        if (el.__shown) { gsap.set(lines, { yPercent: 0 }); return; }
        gsap.set(lines, { yPercent: 110 });
        el.__lt = ScrollTrigger.create({
          trigger: el, start: 'top 88%', once: true,
          onEnter: function () { el.__shown = true; gsap.to(lines, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09 }); }
        });
      }
      var manual = $$('.line', el);
      if (manual.length) {
        manual.forEach(function (l) {
          if (l.parentNode.classList.contains('line-mask')) return;
          var m = document.createElement('span'); m.className = 'line-mask'; l.parentNode.insertBefore(m, l); m.appendChild(l);
        });
        el.classList.add('is-split');
        build(manual);
      } else {
        split(el, 'lines').onSplit(function (inst) { build(inst && inst.lines); });
      }
    });
  }

  function initActiveNav() {
    var links = $$('.nav__links a');
    links.forEach(function (a) {
      var id = a.getAttribute('href'); if (!id || id.length < 2) return;
      var sec = document.querySelector(id); if (!sec) return;
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        // created before the timeline pin exists: refresh after pins so pin spacing is counted
        refreshPriority: -10,
        onToggle: function (self) {
          if (self.isActive) links.forEach(function (l) { l.classList.toggle('is-active', l === a); });
          else a.classList.remove('is-active');
        }
      });
    });
    var c = document.getElementById('contacto');
    if (c && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { contactIn = es[0].isIntersecting; onScroll(); }, { threshold: 0.15 }).observe(c);
    }
  }

  /* ------------------------------------------------------------- preloader */
  var exited = false, readyCbs = [];
  function ready(cb) {
    if (exited) safe(cb); else readyCbs.push(cb);
  }
  function markExited() {
    if (exited) return;
    exited = true;
    root.classList.add('pre-done'); root.classList.remove('is-loading');
    if (lenis && !menuOpen) lenis.start();
    readyCbs.splice(0).forEach(function (cb) { safe(cb); });
  }

  function initPreloader() {
    var pre = $('#preloader');
    if (!pre || REDUCE) { if (pre) pre.style.display = 'none'; markExited(); return; }
    if (lenis) lenis.stop();
    window.scrollTo(0, 0);

    var letters = $$('.pre__ch > span', pre), words = $$('.pre__w > span', pre);
    var num = $('.pre__num', pre), line = $('.pre__line i', pre), count = $('.pre__count', pre), lineWrap = $('.pre__line', pre);
    var halfT = $('.pre__half--top', pre), halfB = $('.pre__half--bottom', pre);
    var seenPre = false;
    try { seenPre = sessionStorage.getItem('va-pre') === '1'; sessionStorage.setItem('va-pre', '1'); } catch (e) {}

    var heroImg = $('.hero__poster img'), heroVid = $('.hero__video');
    var heroReady = new Promise(function (res) {
      var ok = function () { res(); };
      if (heroImg && !(heroImg.complete && heroImg.naturalWidth)) {
        heroImg.addEventListener('load', ok); heroImg.addEventListener('error', ok);
      } else ok();
      if (heroVid) heroVid.addEventListener('canplay', ok, { once: true });
    });
    var hard = new Promise(function (r) { setTimeout(r, 4000); });
    var hide = function () { pre.style.display = 'none'; };

    if (seenPre) {
      Promise.race([Promise.all([fontsReady, heroReady]), hard]).then(function () {
        gsap.to(pre, { opacity: 0, duration: 0.6, ease: 'power1.out', onComplete: hide });
        gsap.delayedCall(0.2, markExited);
      });
      return;
    }

    gsap.set(letters, { yPercent: 110 });
    gsap.set(words, { yPercent: 110 });
    var counter = { v: 0 };
    var tl = gsap.timeline();
    tl.to(letters, { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.12 }, 0.05);
    tl.to(counter, { v: 100, duration: 1.9, ease: 'power2.inOut', onUpdate: function () { num.textContent = String(Math.round(counter.v)).padStart(3, '0'); } }, 0);
    tl.to(line, { scaleX: 1, duration: 1.9, ease: 'power2.inOut' }, 0);
    words.forEach(function (w, i) {
      var at = 0.3 + i * 0.55;
      tl.to(w, { yPercent: 0, duration: 0.5, ease: 'expo.out' }, at);
      if (i < words.length - 1) tl.to(w, { yPercent: -110, duration: 0.4, ease: 'power3.in' }, at + 0.5);
    });
    var tlDone = new Promise(function (res) { tl.eventCallback('onComplete', res); });
    var minDelay = new Promise(function (r) { setTimeout(r, 1900); });
    var exitStarted = false;
    function exit() {
      if (exitStarted) return; exitStarted = true;
      var x = gsap.timeline();
      x.to(letters, { yPercent: -110, duration: 0.6, ease: 'power3.in' }, 0);
      x.to(words, { yPercent: -110, duration: 0.5, ease: 'power3.in' }, 0);
      x.to([count, lineWrap], { opacity: 0, duration: 0.4, ease: 'power1.out' }, 0.2);
      x.to(halfT, { yPercent: -100, duration: 0.95, ease: 'power4.inOut' }, 0.75);
      x.to(halfB, { yPercent: 100, duration: 0.95, ease: 'power4.inOut' }, 0.75);
      x.add(markExited, 1.2);
      x.add(hide, 1.72);
    }
    Promise.race([
      Promise.all([fontsReady, heroReady, tlDone, minDelay]),
      hard.then(function () { tl.progress(1); })
    ]).then(function () { setTimeout(exit, 150); });
  }

  /* ----------------------------------------------------------------- VA API */
  var refreshT = 0;
  var VA = {
    REDUCE: REDUCE,
    FINE: FINE,
    lenis: lenis,
    mm: gsap.matchMedia(),
    get lang() { return lang; },
    t: t,
    get: getRaw,
    apply: applyI18n,
    setLang: setLang,
    onLang: function (cb) { langCbs.push(cb); },
    scrollTo: scrollTo,
    split: split,
    ready: ready,
    fontsReady: fontsReady,
    navH: navH,
    refresh: function () { clearTimeout(refreshT); refreshT = setTimeout(function () { ScrollTrigger.refresh(); }, 60); }
  };
  window.VA = VA;

  setLang(lang, { initial: true });
  initCursor();
  onScroll();
  ready(function () {
    var h = location.hash;
    if (!h || h.length < 2) return;
    var tEl = null; try { tEl = document.querySelector(h); } catch (e) {}
    if (tEl) setTimeout(function () { scrollTo(tEl, { immediate: true }); }, 150);
  });
  initPreloader();
  fontsReady.then(function () {
    initReveals();
    initActiveNav();
    ScrollTrigger.refresh();
    onScroll();
  });
  window.addEventListener('load', function () { setTimeout(function () { ScrollTrigger.refresh(); }, 80); });
})();
