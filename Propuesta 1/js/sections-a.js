/* ==========================================================================
   Propuesta 1 - sections-a.js (Builder A)
   hero intro + scroll · marquee · bio · impacto counters · trayectoria (pinned horizontal)
   ========================================================================== */
(function () {
  'use strict';

  var VA = window.VA;
  if (!VA || !window.gsap || !window.ScrollTrigger) return;
  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  var REDUCE = VA.REDUCE, FINE = VA.FINE, mm = VA.mm, lenis = VA.lenis;
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = gsap.utils.clamp;
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };

  /* ======================================================================= HERO */
  function initHero() {
    var hero = $('#inicio'); if (!hero) return;
    var media = $('.hero__media', hero), mediaIn = $('.hero__media-in', hero), vid = $('.hero__video', hero);
    var content = $('.hero__content', hero), rule = $('.hero__rule', hero), tag = $('.hero__tag', hero);
    var nameLines = $$('.hero__name .line', hero);
    var mqMobile = matchMedia('(max-width:767px)');

    /* accessible name of the portrait: mobile crop has its own alt */
    function syncAlt() {
      media.setAttribute('data-i18n-attr', 'aria-label:' + (mqMobile.matches ? 'alt.hero_portrait_mobile' : 'alt.hero_portrait'));
      VA.apply(media);
    }
    syncAlt();
    mqMobile.addEventListener('change', syncAlt);

    /* background video: poster stays underneath; poster only for reduced motion / Save-Data */
    var inView = true;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (vid && !REDUCE && !saveData) {
      var src = mqMobile.matches ? (vid.getAttribute('data-src-m') || vid.getAttribute('data-src')) : vid.getAttribute('data-src');
      vid.muted = true; vid.defaultMuted = true; vid.loop = true; vid.playsInline = true;
      vid.setAttribute('muted', ''); vid.setAttribute('playsinline', '');
      vid.addEventListener('playing', function () { vid.classList.add('is-playing'); });
      vid.addEventListener('error', function () { vid.classList.remove('is-playing'); });
      vid.preload = 'auto';
      vid.src = src;
      var play = function () { var p = vid.play(); if (p && p.catch) p.catch(function () {}); };
      play();
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          inView = es[0].isIntersecting;
          if (inView && !document.hidden) play(); else vid.pause();
        }, { threshold: 0.05 }).observe(hero);
      }
      document.addEventListener('visibilitychange', function () { if (document.hidden) vid.pause(); else if (inView) play(); });
      vid.addEventListener('loadedmetadata', function () { VA.refresh(); });
    }

    if (REDUCE) return;

    /* initial states (the preloader is covering the page) */
    // introStarted (not introDone): a language swap mid-intro re-splits into fresh nodes the
    // running timeline no longer targets, so they must start visible or they stay hidden
    var introDone = false, introStarted = false;
    var nameApis = nameLines.map(function (line) {
      var api = VA.split(line, 'words,chars');
      api.onSplit(function (inst) { if (inst) gsap.set(inst.chars, { yPercent: introStarted ? 0 : 110 }); });
      return api;
    });
    var tagApi = VA.split(tag, 'words');
    tagApi.onSplit(function (inst) { if (inst) gsap.set(inst.words, introStarted ? { y: 0, opacity: 1 } : { y: 24, opacity: 0 }); });
    gsap.set(mediaIn, { scale: 1.15 });

    var eyebrowT = $('.hero__eyebrow [data-intro]', hero);
    var sub = $('.hero__sub', hero);
    var tail = $$('.hero__ctas, .hero__badges, .hero__scroll', hero);
    gsap.set(eyebrowT, { y: 12 });
    gsap.set(sub, { y: 16 });
    gsap.set(tail, { y: 16 });

    VA.ready(function () {
      introStarted = true;
      var chars = [];
      nameApis.forEach(function (a) { if (a.instance) chars = chars.concat(a.instance.chars); });
      var words = tagApi.instance ? tagApi.instance.words : [];
      var all = [eyebrowT, sub].concat(tail);
      var tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
        onComplete: function () {
          introDone = true;
          hero.classList.add('is-in');
          all.forEach(function (el) { el.classList.add('is-shown'); });
          rule.classList.add('is-shown');
          gsap.set(all.concat(rule), { clearProps: 'opacity,transform' });
        }
      });
      tl.to(mediaIn, { scale: 1, duration: 2.4, ease: 'power2.out' }, 0);
      tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0% 50%', duration: 0.9, ease: 'power3.out' }, 0.1);
      tl.to(eyebrowT, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0.15);
      if (chars.length) tl.to(chars, { yPercent: 0, duration: 1.2, stagger: 0.035 }, 0.2);
      if (words.length) tl.to(words, { y: 0, opacity: 1, duration: 1, stagger: 0.06, ease: 'power3.out' }, 0.5);
      tl.to(sub, { y: 0, opacity: 1, duration: 1.2, ease: 'power3.out' }, 0.8);
      tl.to(tail, { y: 0, opacity: 1, duration: 1.2, stagger: 0.12, ease: 'power3.out' }, 0.95);
    });

    /* scroll: video parallax + content fade-out */
    gsap.to(media, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
      .to(content, { y: -60, ease: 'none', duration: 1 }, 0)
      .to(content, { opacity: 0, ease: 'none', duration: 0.6 }, 0);
  }

  /* ===================================================================== MARQUEE */
  function initMarquee() {
    var band = $('.marq'); if (!band) return;
    var track = $('.marq__track', band), groups = $$('.marq__group', band);

    /* gold non-italic figure inside each item ("USD 1.2 mil millones", "38", "250,000+" ...) */
    function decorate() {
      $$('.marq__item span', band).forEach(function (s) {
        var txt = s.textContent;
        var m = txt.match(/(USD\s)?\d[\d.,]*\+?(\s(?:mil millones|billion))?/);
        if (m) s.innerHTML = esc(txt.slice(0, m.index)) + '<b>' + esc(m[0]) + '</b>' + esc(txt.slice(m.index + m[0].length));
      });
    }
    decorate();
    if (REDUCE) { VA.onLang(decorate); return; }

    var W = 0, x = 0, dir = 1, boost = 0, hold = false, active = false, cur = 1;
    var setX = gsap.quickSetter(track, 'x', 'px');
    var measure = function () { W = groups[0].offsetWidth; };
    measure();
    VA.fontsReady.then(measure);
    ScrollTrigger.addEventListener('refresh', measure);
    VA.onLang(function () { decorate(); measure(); });

    if (lenis) lenis.on('scroll', function (e) {
      if (e.direction) dir = e.direction > 0 ? 1 : -1;
      boost = Math.min(Math.abs(e.velocity) * 0.12, 4);
    });
    ScrollTrigger.create({ trigger: band, start: 'top bottom', end: 'bottom top', onToggle: function (s) { active = s.isActive; } });
    if (FINE) {
      band.addEventListener('pointerenter', function () { hold = true; });
      band.addEventListener('pointerleave', function () { hold = false; });
    }
    gsap.ticker.add(function (time, dtMs) {
      if (!active || !W) return;
      boost *= 0.94;
      cur += ((hold ? 0 : 1 + boost) - cur) * 0.1;
      var speed = window.innerWidth < 768 ? 60 : 90;
      x -= dir * speed * cur * (dtMs / 1000);
      if (x <= -W) x += W; else if (x > 0) x -= W;
      setX(x);
    });
  }

  /* ======================================================================== BIO */
  function initBio() {
    var sec = $('#biografia'); if (!sec) return;
    var manifesto = $('#bio-manifesto', sec);

    /* marker phrase inside the manifesto (language specific, idempotent) */
    var MARKS = { es: /es la paciencia/, en: /It[’']s patience/ };
    function prepare(el) {
      if (el.querySelector('.mark')) return;
      var re = MARKS[VA.lang]; if (!re) return;
      el.innerHTML = el.innerHTML.replace(re, function (m) { return '<mark class="mark">' + m + '</mark>'; });
    }
    if (REDUCE) { prepare(manifesto); VA.onLang(function () { prepare(manifesto); }); return; }

    var wordTween = null, markSTs = [], markDone = false;
    VA.split(manifesto, 'words', { prepare: prepare }).onSplit(function (inst) {
      if (wordTween) { if (wordTween.scrollTrigger) wordTween.scrollTrigger.kill(); wordTween.kill(); wordTween = null; }
      markSTs.forEach(function (s) { s.kill(); }); markSTs = [];
      if (!inst) return;
      gsap.set(inst.words, { opacity: 0.16 });
      wordTween = gsap.to(inst.words, {
        opacity: 1, stagger: 0.05, ease: 'none',
        scrollTrigger: { trigger: manifesto, start: 'top 80%', end: 'bottom 42%', scrub: 0.6 }
      });
      $$('.mark', manifesto).forEach(function (m) {
        if (markDone) { m.classList.add('is-on'); return; }
        markSTs.push(ScrollTrigger.create({ trigger: m, start: 'top 78%', once: true, onEnter: function () { markDone = true; m.classList.add('is-on'); } }));
      });
    });

    var frame = $('.bio__frame', sec), reveal = $('.bio__reveal', sec), img = $('.bio__reveal img', sec);
    var detail = $('.bio__detail', sec), card = $('.bio__card', sec);
    gsap.fromTo(reveal, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: frame, start: 'top 82%', once: true } });
    gsap.fromTo(img, { yPercent: -9 }, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } });
    if (detail) gsap.fromTo(detail, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, delay: 0.3, ease: 'power3.out', scrollTrigger: { trigger: frame, start: 'top 68%', once: true } });
    if (card) gsap.fromTo(card, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, delay: 0.2, ease: 'power3.out', scrollTrigger: { trigger: frame, start: 'top 62%', once: true } });

    /* signature line-draw */
    var paths = $$('.sig path', sec);
    if (paths.length) {
      ScrollTrigger.create({
        trigger: $('.bio__sig', sec), start: 'top 85%', once: true,
        onEnter: function () {
          var s = gsap.timeline();
          s.to(paths[0], { strokeDashoffset: 0, duration: 1.7, ease: 'none' });
          if (paths[1]) s.to(paths[1], { strokeDashoffset: 0, duration: 0.7, ease: 'power1.out' }, '-=0.1');
        }
      });
    }
  }

  /* ===================================================================== IMPACT */
  function initImpact() {
    var sec = $('#impacto'); if (!sec) return;
    var nf = {};
    var fmt = function (v, d) {
      var k = d || 0;
      if (!nf[k]) nf[k] = new Intl.NumberFormat('en-US', { minimumFractionDigits: k, maximumFractionDigits: k });
      return nf[k].format(v);
    };

    $$('[data-count]', sec).forEach(function (el, idx) {
      var key = el.getAttribute('data-count'), played = false, tw = null;
      var info = function () { return { n: parseFloat(VA.get(key + '.number')) || 0, d: parseInt(VA.get(key + '.decimals'), 10) || 0 }; };
      var paint = function (v) { el.textContent = fmt(v, info().d); };
      if (REDUCE) { paint(info().n); VA.onLang(function () { paint(info().n); }); return; }
      paint(0);
      ScrollTrigger.create({
        trigger: el.closest('.stat'), start: 'top 75%', once: true,
        onEnter: function () {
          played = true;
          var o = { v: 0 };
          tw = gsap.to(o, {
            v: info().n, duration: 2, ease: 'power2.out', delay: idx > 0 ? ((idx - 1) % 2) * 0.12 : 0,
            onUpdate: function () { paint(o.v); }, onComplete: function () { paint(info().n); }
          });
        }
      });
      VA.onLang(function () { if (tw) tw.kill(); paint(played ? info().n : 0); });
    });

    var ghost = $('.impact__ghost', sec);
    if (ghost && !REDUCE) gsap.fromTo(ghost, { yPercent: -12 }, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ================================================================ TRAYECTORIA */
  function initTimeline() {
    var sec = $('#trayectoria'); if (!sec) return;
    var track = $('.tl__track', sec);
    var panels = $$('.tl__panel--year', sec);
    if (REDUCE) { panels.forEach(function (p) { p.classList.add('is-on'); }); return; }
    var ticks = $$('.tl__tick', sec);
    var ghost = $('.tl__ghost', sec), fill = $('.tl__fill', sec), curEl = $('.tl__cur', sec);

    /* ---- desktop: pinned horizontal scroll ---- */
    mm.add('(min-width:1025px) and (hover:hover)', function () {
      root.classList.add('tl-h');
      var tween = null, st = null, meas = [], tickPos = [], curIdx = -1;
      var vw = function () { return root.clientWidth; };
      var dist = function () { return Math.max(0, track.scrollWidth - vw()); };
      panels.forEach(function (p) {
        var img = $('.tl__img img', p);
        meas.push({ el: p, left: 0, w: 0, setX: img ? gsap.quickSetter(img, 'xPercent') : null });
      });

      function measure() {
        var d = dist(), w = vw();
        meas.forEach(function (m, i) {
          m.left = m.el.offsetLeft; m.w = m.el.offsetWidth;
          var c = m.left + m.w / 2 - w / 2;
          tickPos[i] = clamp(0, 1, d ? c / d : 0);
          if (ticks[i]) ticks[i].style.left = (tickPos[i] * 100).toFixed(3) + '%';
        });
      }
      function update() {
        if (!tween || !st) return;
        var p = tween.progress(), w = vw(), x = -p * dist();
        var active = st.isActive || st.progress > 0;
        if (ghost) {
          var gw = ghost.offsetWidth, gs = w * 0.04, ge = w - gw - w * 0.04;
          ghost.style.transform = 'translate3d(' + (gs + (ge - gs) * p).toFixed(1) + 'px,-52%,0)';
        }
        var best = 0, bestD = 1e9;
        meas.forEach(function (m, i) {
          var sl = m.left + x, sc = sl + m.w / 2;
          m.el.classList.toggle('is-in', active && sl < w * 0.82);
          m.el.classList.toggle('is-on', active && sl < w * 0.55 && sl + m.w > w * 0.45);
          var d = Math.abs(sc - w / 2);
          if (d < bestD) { bestD = d; best = i; }
          if (m.setX) m.setX(-8 * clamp(-1, 1, (sc - w / 2) / (w / 2 + m.w / 2)));
        });
        if (best !== curIdx) {
          curIdx = best;
          if (curEl) curEl.textContent = String(best + 1).padStart(2, '0');
          ticks.forEach(function (tk, i) { tk.classList.toggle('is-active', i === best); });
        }
        ticks.forEach(function (tk, i) { tk.classList.toggle('is-past', p >= tickPos[i] - 0.002); });
        if (fill) fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      }

      tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none', onUpdate: update,
        scrollTrigger: {
          trigger: sec, pin: true, scrub: 1, start: 'top top',
          end: function () { return '+=' + dist(); },
          invalidateOnRefresh: true, anticipatePin: 1, refreshPriority: 1,
          onToggle: update,
          onRefresh: function () { measure(); update(); }
        }
      });
      st = tween.scrollTrigger;
      measure(); update();

      var offs = ticks.map(function (tk, i) {
        var fn = function () { VA.scrollTo(st.start + (st.end - st.start) * tickPos[i], { duration: 1.8 }); };
        tk.addEventListener('click', fn);
        return function () { tk.removeEventListener('click', fn); };
      });

      /* keyboard focus inside the clipped track must scroll the page (progress), never the overflow container */
      var pinEl = $('.tl__pin', sec);
      var resetScroll = function () { sec.scrollLeft = 0; if (pinEl) pinEl.scrollLeft = 0; };
      var onFocusIn = function (e) {
        var panel = e.target.closest && e.target.closest('.tl__panel'); if (!panel) return;
        resetScroll();
        var i = panels.indexOf(panel);
        var pos = i >= 0 ? tickPos[i] : (panel.classList.contains('tl__panel--outro') ? 1 : 0);
        VA.scrollTo(st.start + (st.end - st.start) * pos, { duration: 0.9 });
      };
      sec.addEventListener('focusin', onFocusIn);
      sec.addEventListener('scroll', resetScroll);
      if (pinEl) pinEl.addEventListener('scroll', resetScroll);
      offs.push(function () {
        sec.removeEventListener('focusin', onFocusIn); sec.removeEventListener('scroll', resetScroll);
        if (pinEl) pinEl.removeEventListener('scroll', resetScroll);
      });

      return function () {
        offs.forEach(function (f) { f(); });
        root.classList.remove('tl-h');
        panels.forEach(function (p) { p.classList.remove('is-in', 'is-on'); var im = $('.tl__img img', p); if (im) gsap.set(im, { clearProps: 'transform' }); });
        ticks.forEach(function (tk) { tk.classList.remove('is-active', 'is-past'); tk.style.left = ''; });
        if (ghost) ghost.style.transform = '';
        if (fill) fill.style.transform = '';
        if (curEl) curEl.textContent = '01';
        gsap.set(track, { clearProps: 'transform' });
      };
    });

    /* ---- tablet / mobile / touch: stacked list with progress rail ---- */
    mm.add('(max-width:1024px), (hover:none)', function () {
      var rail = $('.tl__rail i', sec);
      if (rail) gsap.to(rail, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: track, start: 'top 60%', end: 'bottom 60%', scrub: true } });
      panels.forEach(function (p) {
        gsap.from($$('.tl__img, .tl__year, .tl__title, .tl__text p:not(.tl__year)', p), {
          y: 36, opacity: 0, duration: 1.1, stagger: 0.1, ease: 'power3.out',
          scrollTrigger: { trigger: p, start: 'top 82%', once: true }
        });
        ScrollTrigger.create({ trigger: p, start: 'top 60%', end: 'bottom 40%', onToggle: function (s) { p.classList.toggle('is-on', s.isActive); } });
      });
      return function () { panels.forEach(function (p) { p.classList.remove('is-on'); }); };
    });
  }

  [initHero, initMarquee, initBio, initImpact, initTimeline].forEach(function (fn) {
    try { fn(); } catch (e) { if (window.console) console.error('[VA:A] ' + fn.name + ' failed', e); }
  });
})();
