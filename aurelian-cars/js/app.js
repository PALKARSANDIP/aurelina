/* AURELIAN: page behaviour.
   Plain JavaScript, GSAP + ScrollTrigger for scroll choreography, Lenis for smooth scrolling.
   Sections: setup, fitted type, frames + canvas, journey, hero, intro, design, photos, nav, carousel,
   configurator, form. */
(function () {
  'use strict';
  window.__aurReady = true;

  var CFG = window.AURELIAN || {};
  var F = CFG.frames || { dir: 'frames/', count: 0, ext: 'webp', pad: 3 };
  var J = CFG.journey || { startMinutes: 360, endMinutes: 1439, maxSpeed: 318 };
  var CAR = CFG.car || null;
  var root = document.documentElement;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!hasGsap) { root.classList.remove('js'); reduce = true; }
  if (reduce) { root.classList.add('reduce'); root.classList.remove('js'); }

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function smooth(x) { return x * x * (3 - 2 * x); }

  var lenis = null;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Car art ---------- */
  var models = $$('.model').map(function (m) {
    return {
      el: m, id: m.dataset.id, name: m.dataset.name, paint: m.dataset.paint, wheel: m.dataset.wheel,
      hp: m.dataset.hp, accel: m.dataset.accel, range: m.dataset.range
    };
  });

  /* Photographic car where configured, otherwise the drawn placeholder. */
  function carArt(paint, wheel, opts) {
    return CAR ? window.Car.photo(CAR, opts) : window.Car.svg({ paint: paint, wheel: wheel });
  }

  function paintCars() {
    var hero = $('#heroCarArt');
    hero.innerHTML = carArt(window.Car.PAINTS[0].hex, window.Car.WHEELS[0].id, { eager: true, label: CAR && CAR.name });
    if (!CAR) $$('.hs').forEach(function (b) { b.hidden = true; });
    /* Edition cards carry their own photographs; draw a car only where a card has none. */
    models.forEach(function (m) {
      var art = $('.model-art', m.el);
      if (!art.children.length) art.innerHTML = window.Car.svg({ paint: m.paint, wheel: m.wheel });
    });
  }

  /* ---------- Type fitted to the viewport width ---------- */
  function fitText(el, ratio) {
    el.style.fontSize = '100px';
    var range = document.createRange();
    range.selectNodeContents(el);
    var w = range.getBoundingClientRect().width;
    if (!w) return;
    el.style.fontSize = (window.innerWidth * ratio / w * 100).toFixed(2) + 'px';
  }
  /* The hero wordmark sits in the space between the intro text and the car's roof, with only its
     lower quarter tucked behind the car, so the name always reads. It is as wide as the screen
     unless that would make it too tall for the space (wide, short windows), then it shrinks.
     Offsets ignore GSAP transforms, so this is safe mid-animation. */
  var WORD_BEHIND = 0.26; /* share of the letter height hidden behind the roof */
  function fitHeroWord() {
    var word = $('#heroWord'), copy = $('#heroCopy'), car = $('#heroCar'), stage = $('.hero-stage');
    fitText(word, 0.94);
    var h = word.offsetHeight;
    if (!h) return;
    var clear = copy.offsetTop + copy.offsetHeight + Math.max(20, window.innerHeight * 0.03);
    var roof = car.offsetTop;
    var maxH = (roof - clear) / (1 - WORD_BEHIND);
    if (h > maxH) {
      word.style.fontSize = Math.max(parseFloat(word.style.fontSize) * maxH / h, 48).toFixed(2) + 'px';
      h = word.offsetHeight;
    }
    word.style.bottom = (stage.clientHeight - (roof + h * WORD_BEHIND)).toFixed(1) + 'px';
  }

  function fitAll() {
    fitHeroWord();
    fitText($('.footer-mark'), 0.92);
  }

  /* ---------- Frames + canvas ---------- */
  var frames = new Array(F.count);
  function frameUrl(i) {
    var n = String(i + 1);
    while (n.length < F.pad) n = '0' + n;
    return F.dir + n + '.' + F.ext;
  }

  /* Progressive loading. The loading screen waits only for a coarse pass (every COARSE-th frame),
     so the page opens quickly; the remaining frames stream in behind it, a few at a time, in passes
     that halve the gap each time. Until a frame arrives, draw() shows the nearest loaded one. */
  var COARSE = 8, PARALLEL = 6;
  function loadOrder() {
    var order = [], seen = {}, step = COARSE;
    while (step >= 1) {
      for (var i = 0; i < F.count; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); }
      step = step / 2;
    }
    if (!seen[F.count - 1]) order.splice(1, 0, F.count - 1);
    return order;
  }

  function preload(onProgress) {
    return new Promise(function (resolve) {
      var done = false;
      function finish() { if (!done) { done = true; resolve(); } }
      if (!F.count) { finish(); return; }
      var order = loadOrder(), next = 0, loaded = 0;
      var gate = Math.ceil(F.count / COARSE) + 1;  /* frames needed before the page opens */
      function pump() {
        if (next >= order.length) return;
        var k = order[next++];
        var im = new Image();
        im.decoding = 'async';
        im.onload = function () {
          var ready = im.decode ? im.decode() : Promise.resolve();
          ready.catch(function () {}).then(function () { frames[k] = im; after(); });
        };
        im.onerror = after;
        im.src = frameUrl(k);
      }
      function after() {
        loaded++;
        if (!done) onProgress(Math.min(loaded / gate, 1));
        if (loaded >= gate) finish();
        if (needsDraw) { needsDraw = false; redraw(); }
        pump();
      }
      for (var i = 0; i < PARALLEL; i++) pump();
      setTimeout(finish, 9000); /* never block the page on slow networks */
    });
  }

  var canvas = $('#journeyCanvas');
  var ctx = canvas.getContext('2d');
  var stripT = document.createElement('canvas'), stripB = document.createElement('canvas');
  stripT.width = stripB.width = 64; stripT.height = stripB.height = 1;
  var sctxT = stripT.getContext('2d'), sctxB = stripB.getContext('2d');
  sctxT.imageSmoothingQuality = sctxB.imageSmoothingQuality = 'high';
  var cw = 1, ch = 1, curPos = 0, needsDraw = false;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  function nearest(idx) {
    var im = frames[idx];
    if (im) return im;
    for (var d = 1; d < frames.length; d++) {
      im = frames[idx - d] || frames[idx + d];
      if (im) return im;
    }
    return null;
  }

  /* pos is a fractional frame position. Between two frames we cross-blend them, so scrolling
     moves the picture continuously instead of stepping from one still to the next. */
  function draw(pos) {
    var i = Math.floor(pos), t = pos - i;
    var a = frames[i], b = frames[i + 1];
    if (!a || (t > 0.02 && !b)) needsDraw = true;  /* repaint when the missing frame arrives */
    a = a || nearest(i);
    if (!a) { ctx.fillStyle = '#1d2224'; ctx.fillRect(0, 0, cw, ch); return; }
    ctx.globalAlpha = 1;
    paint(a);
    if (b && b !== a && t > 0.02) { ctx.globalAlpha = t; paint(b); ctx.globalAlpha = 1; }
  }
  function redraw() { draw(curPos); }

  function paint(im) {
    var iw = im.naturalWidth, ih = im.naturalHeight;
    var s, w, h, x, y;
    if (cw / ch < 0.9) {
      /* Portrait phones: keep the whole car in view and continue the sky and road above and below
         with a blurred copy of the frame's own top and bottom rows, so there is no visible seam. */
      s = cw / iw * 1.25; w = iw * s; h = ih * s; x = (cw - w) / 2; y = (ch - h) * 0.64;
      sctxT.drawImage(im, 0, 0, iw, 6, 0, 0, 64, 1);
      sctxB.drawImage(im, 0, ih - 6, iw, 6, 0, 0, 64, 1);
      if (y > 0) ctx.drawImage(stripT, x, 0, w, Math.ceil(y) + 1);
      if (y + h < ch) ctx.drawImage(stripB, x, Math.floor(y + h) - 1, w, ch - Math.floor(y + h) + 1);
    } else {
      s = Math.max(cw / iw, ch / ih); w = iw * s; h = ih * s; x = (cw - w) / 2; y = (ch - h) / 2;
    }
    ctx.drawImage(im, x, y, w, h);
  }

  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var r = canvas.getBoundingClientRect();
    cw = Math.max(1, Math.round(r.width * dpr));
    ch = Math.max(1, Math.round(r.height * dpr));
    canvas.width = cw; canvas.height = ch;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';  /* resizing the canvas resets these */
    draw(curPos);
  }

  /* ---------- Journey (pinned, scroll-scrubbed) ---------- */
  var hudClock = $('#hudClock'), hudSpeed = $('#hudSpeed'), railFill = $('#railFill'), fadeEl = $('#journeyFade');
  var sceneEls = $$('.scene');
  var activeScene = 0;

  /* The clock follows the footage. journey.keyTimes in js/config.js gives the time of day at each
     keyframe (the clips join at evenly spaced points), and the clock runs between them, so the city
     reads 20:45 when the city is on screen. Without keyTimes it runs evenly from start to end.
     A scene title appears as the scenery for its time arrives: SCENE_EARLY of a clip ahead of its
     keyframe, which is where the clips change from one place to the next. */
  var SCENE_EARLY = 0.6;
  function toMinutes(t) { var m = /(\d+):(\d+)/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : 0; }
  var KT = (J.keyTimes || []).map(toMinutes);
  function minutesAt(p) {
    if (KT.length < 2) return J.startMinutes + p * (J.endMinutes - J.startMinutes);
    var x = clamp(p, 0, 1) * (KT.length - 1), i = Math.min(Math.floor(x), KT.length - 2);
    return KT[i] + (KT[i + 1] - KT[i]) * (x - i);
  }
  function progressAt(m) {
    if (KT.length < 2) return (m - J.startMinutes) / (J.endMinutes - J.startMinutes);
    if (m <= KT[0]) return 0;
    for (var i = 0; i < KT.length - 1; i++) {
      if (m <= KT[i + 1]) return (i + (m - KT[i]) / (KT[i + 1] - KT[i])) / (KT.length - 1);
    }
    return 1 + (m - KT[KT.length - 1]) / 1440;  /* past the last keyframe */
  }
  var sceneAt = sceneEls.map(function (el, i) {
    if (!i) return -Infinity;
    var p = progressAt(toMinutes(el.dataset.time));
    return KT.length > 1 ? p - SCENE_EARLY / (KT.length - 1) : p - 0.06;
  });
  function placeRailTicks() {
    $$('.rail-tick').forEach(function (t) {
      var p = progressAt(toMinutes(t.dataset.time));
      t.style.setProperty('--p', clamp(p, 0, 1).toFixed(4));
      t.hidden = p > 1.001;
    });
  }
  placeRailTicks();

  function applyJourney(p) {
    var pos = F.count ? p * (F.count - 1) : 0;
    if (Math.abs(pos - curPos) > 0.004) { curPos = pos; draw(pos); }

    var minutes = minutesAt(p);
    hudClock.textContent = pad2(Math.floor(minutes / 60)) + ':' + pad2(Math.floor(minutes % 60));
    hudSpeed.textContent = Math.round(J.maxSpeed * smooth(clamp(p / 0.55, 0, 1)));
    railFill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    fadeEl.style.opacity = smooth(clamp((p - 0.9) / 0.1, 0, 1)).toFixed(3);

    var s = 0;
    for (var k = 1; k < sceneAt.length; k++) if (p >= sceneAt[k]) s = k;
    if (s !== activeScene) {
      sceneEls[activeScene].classList.remove('is-active');
      sceneEls[s].classList.add('is-active');
      activeScene = s;
    }
  }

  function initJourney() {
    if (reduce) {
      curPos = Math.round((F.count - 1) * 0.5);
      sizeCanvas();
      return;
    }
    /* Scroll length grows with the footage, so every frame gets roughly the same scroll distance
       whether there are 2 clips or 5 (about 45 frames per screen-height, between 3.5 and 7 screens). */
    function screens() {
      var n = clamp(F.count / 45, 3.5, 7);
      return window.innerWidth < 820 ? n * 0.8 : n;
    }
    var state = { target: 0, cur: 0 };
    ScrollTrigger.create({
      trigger: '#journey',
      start: 'top top',
      end: function () { return '+=' + Math.round(window.innerHeight * screens()); },
      pin: '#journeyPin',
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) { state.target = self.progress; }
    });
    /* One light layer of easing on top of Lenis, independent of the screen's refresh rate
       (the same feel at 60 Hz and 120 Hz), so the picture follows the scroll without trailing. */
    gsap.ticker.add(function (time, deltaMs) {
      var k = 1 - Math.pow(1 - 0.28, (deltaMs || 16.7) / 16.7);
      var d = state.target - state.cur;
      state.cur = Math.abs(d) < 0.00005 ? state.target : state.cur + d * k;
      applyJourney(state.cur);
    });
    sizeCanvas();
    applyJourney(0);
  }

  /* ---------- Hero ---------- */
  /* Degrees a hero wheel turns when the car moves `px` pixels, so it rolls without slipping. */
  function rollFor(px) {
    var wheelShare = CAR ? CAR.wheels[0].width / 100 : 82 / 800; /* drawn car: 82 px wheel in an 800 px drawing */
    var diameter = $('#heroCar').offsetWidth * wheelShare;
    return diameter ? px / (Math.PI * diameter) * 360 : 0;
  }

  function heroIntro() {
    gsap.set(['#heroWord', '#heroCar', '#heroCopy', '#heroNote'], { opacity: 1 });
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    var drive = window.innerWidth * 0.75;
    tl.fromTo('#heroWordIn', { yPercent: 38, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.4 }, 0)
      .fromTo('#heroCar', { x: -drive }, { x: 0, duration: 2.1, ease: 'power4.out' }, 0.15)
      .fromTo('#heroCarArt .roll', { rotation: -rollFor(drive) }, { rotation: 0, duration: 2.1, ease: 'power4.out' }, 0.15);
    if (CAR) {
      /* As it stops, the body dips onto the front wheels and settles back (the wheels stay put). */
      tl.to('#heroCarArt .car-body, #heroCarArt .car-tint, #heroCarArt .car-shade',
        { rotation: 0.22, transformOrigin: '18% 62%', duration: 0.32, ease: 'sine.out', yoyo: true, repeat: 1 }, 1.25);
    }
    tl.fromTo('#heroCopy', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9 }, 1.1)
      .fromTo('#heroNote', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.5);
  }

  /* Hero scroll scene, in two parts while the hero is held in place:
     1. DRIVE (the first DRIVE screen-heights of scrolling): the car rolls off slowly, gathers speed
        and leaves the frame. The wheels follow the same easing, so they turn exactly as far as it travels.
     2. CURTAIN (one screen-height): the intro statement, a deep-green panel, rises over the hero
        while the hero sinks back and dims, so the stage never sits empty.
     The intro's top margin equals DRIVE; that is what makes it arrive exactly as the car leaves.
     (The load-in animation uses x and .roll; this uses xPercent and .rim, so they never fight.) */
  var DRIVE = 0.6;
  function initHeroScroll() {
    var car = $('#heroCar'), intro = $('#intro');
    intro.classList.add('is-curtain');
    intro.style.marginTop = (DRIVE * 100) + 'svh';
    function exitPx() { return window.innerWidth - car.offsetLeft + 40; }  /* to fully past the right edge */
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: function () { return '+=' + Math.round(window.innerHeight * (DRIVE + 1)); },
        pin: true,
        pinSpacing: false,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onEnter: function () { $$('.hs').forEach(function (o) { o.setAttribute('aria-expanded', 'false'); }); }
      }
    });
    /* Timeline units are screen-heights of scrolling: 0..DRIVE drive, DRIVE..DRIVE+1 curtain. */
    tl.to('#heroCar', { xPercent: function () { return exitPx() / car.offsetWidth * 100; }, ease: 'power2.in', duration: DRIVE }, 0)
      .to('#heroCarArt .rim', { rotation: function () { return rollFor(exitPx()); }, ease: 'power2.in', duration: DRIVE }, 0)
      /* Fade the children, not #heroCopy / #heroNote themselves: the load-in animation owns their
         opacity, and two tweens on one property would fight if someone scrolls during the intro. */
      .fromTo('#heroCopy > *', { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: DRIVE * 0.35, stagger: 0.02, immediateRender: false }, 0)
      .fromTo(['#heroNote > span', '.hs'], { opacity: 1 }, { opacity: 0, duration: DRIVE * 0.15, immediateRender: false }, 0)
      .to('#heroWord', { yPercent: -6, duration: DRIVE * 0.5 }, DRIVE * 0.5)
      /* Curtain: the hero sinks back and dims as the panel covers it. */
      .to('.hero-stage', { scale: 0.92, yPercent: -6, duration: 1, ease: 'power1.in' }, DRIVE)
      .to('#heroDim', { opacity: 0.55, duration: 1, ease: 'power1.in' }, DRIVE);

    if (window.matchMedia('(hover: hover)').matches) {
      var carX = gsap.quickTo('#heroCarIn', 'x', { duration: 0.9, ease: 'power3' });
      var carY = gsap.quickTo('#heroCarIn', 'y', { duration: 0.9, ease: 'power3' });
      var wordX = gsap.quickTo('#heroWordIn', 'x', { duration: 1.2, ease: 'power3' });
      $('.hero-stage').addEventListener('pointermove', function (e) {
        var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
        carX(nx * 26); carY(ny * 10); wordX(nx * -14);
      });
    }
  }

  /* Hotspots: hover and focus are in CSS; tap toggles for touch screens. */
  function initHotspots() {
    var spots = $$('.hs');
    spots.forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') === 'true';
        spots.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') spots.forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---------- Intro statement ---------- */
  function initIntro() {
    var el = $('#introText');
    var words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    if (reduce) return;
    gsap.fromTo($$('.w', el), { opacity: 0.16 }, {
      opacity: 1, stagger: 0.15, ease: 'none',
      scrollTrigger: { trigger: '#intro', start: 'top 78%', end: 'bottom 62%', scrub: true }
    });
  }

  /* ---------- Design: pinned; the photograph and the text step through three details ---------- */
  function initDesign() {
    var sec = $('#design');
    if (!sec || reduce) return;
    var shots = $$('.design-shot', sec), steps = $$('.design-step', sec), bar = $('#designBar');
    var n = shots.length, active = 0;
    function show(i) {
      if (i === active) return;
      shots[active].classList.remove('is-active'); steps[active].classList.remove('is-active');
      shots[i].classList.add('is-active'); steps[i].classList.add('is-active');
      active = i;
    }
    ScrollTrigger.create({
      trigger: sec,
      start: 'top top',
      end: function () { return '+=' + Math.round(window.innerHeight * n * 0.85); },
      pin: '.design-pin',
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        show(Math.min(n - 1, Math.floor(self.progress * n * 0.999)));
        bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
      }
    });
  }

  /* ---------- Photographs: slow settle and soft reveal on scroll ---------- */
  function initPhotos() {
    if (reduce) return;
    /* Full-width photographs settle (slow zoom out) as they pass through the screen. */
    [['.interior-img', '.interior-band'], ['.book-media .band-img', '.book-band']].forEach(function (pair) {
      var img = $(pair[0]);
      if (!img) return;
      gsap.fromTo(img, { scale: 1.14 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: pair[1], start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    $$('.reveal').forEach(function (el) {
      gsap.fromTo(el, { clipPath: 'inset(9% 7% 9% 7% round 6px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 6px)', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 45%', scrub: true }
      });
      var img = $('img', el);
      if (img) gsap.fromTo(img, { scale: 1.16 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ---------- Commission timeline and the dimension drawing ---------- */
  function initCommission() {
    var steps = $$('.commission-steps li');
    var light = function (p) { steps.forEach(function (li, i) { li.classList.toggle('is-lit', p >= i / steps.length + 0.02); }); };
    if (reduce) { light(1); return; }
    /* The gold line fills as the steps pass through the middle of the screen; each dot lights as it is reached. */
    ScrollTrigger.create({
      trigger: '.commission-steps', start: 'top 80%', end: 'bottom 55%', scrub: 0.6,
      onUpdate: function (self) {
        $('#commissionFill').style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
        light(self.progress);
      }
    });
    var bp = $('.blueprint');
    if (bp && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { bp.classList.add('is-in'); io.disconnect(); }
      }, { threshold: 0.45 });
      io.observe(bp);
    } else if (bp) bp.classList.add('is-in');
  }

  /* ---------- Navigation + anchors ---------- */
  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { duration: 1.5 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  function initNav() {
    var nav = $('#nav'), toggle = $('#navToggle'), lastY = window.scrollY;
    function onScroll() {
      var y = window.scrollY;
      nav.classList.toggle('is-solid', y > 60);
      if (!nav.classList.contains('open')) nav.classList.toggle('is-hidden', y > lastY && y > 500);
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      if (lenis) open ? lenis.stop() : lenis.start();
    });

    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var target = id.length > 1 ? $(id) : null;
        if (!target && id !== '#top') return;
        e.preventDefault();
        if (nav.classList.contains('open')) {
          nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
          if (lenis) lenis.start();
        }
        scrollToTarget(id === '#top' ? document.body : target);
      });
    });
  }

  /* ---------- Collection carousel ---------- */
  /* Editions ring. With motion allowed, the section holds in place while you scroll and the cards,
     set on a 3D ring, turn one full 360 degrees with the scroll. The card at the front is large and
     bright; its details show in the caption panel below. When scrolling stops the ring settles with a
     card squarely at the front. Arrows turn it one card at a time. With reduced motion (or no GSAP) it
     stays a normal sideways-scrolling row and the arrows scroll that row. */
  var RING_SCREENS_PER_CARD = 0.34; /* scroll distance per card, in screen heights */

  function initCarousel() {
    var track = $('#track'), prev = $('#prev'), next = $('#next');
    var cards = Array.prototype.slice.call(track.children);
    function stepPx() { return cards[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0); }
    if (reduce) {
      prev.addEventListener('click', function () { track.scrollBy({ left: -stepPx() }); });
      next.addEventListener('click', function () { track.scrollBy({ left: stepPx() }); });
      return;
    }

    var N = cards.length, STEP = 360 / N;
    var section = $('#collection'), caption = $('#ringCaption'), cur = $('#ringCur');
    $('#ringTotal').textContent = pad2(N);

    var ring = document.createElement('div');
    ring.className = 'ring';
    cards.forEach(function (c) {
      ring.appendChild(c);
      var art = $('.model-art', c);
      if (art) art.classList.remove('reveal');               /* the ring does its own reveal */
      $$('button, a', c).forEach(function (b) { b.setAttribute('tabindex', '-1'); });  /* the caption carries the live button */
      $$('img', c).forEach(function (im) { im.loading = 'eager'; im.draggable = false; });
    });
    track.appendChild(ring);
    track.classList.add('is-ring');
    track.removeAttribute('tabindex');
    section.classList.add('has-ring');

    var R = 0, W = 0;
    function layout() {
      /* Card width from the room the ring has; the radius leaves generous air between the cards. */
      var mobile = window.innerWidth < 820;
      W = Math.min(640, window.innerWidth * (mobile ? 0.72 : 0.44), track.clientHeight * 1.42);
      track.style.setProperty('--card-w', W.toFixed(0) + 'px');
      R = (W / 2) / Math.tan(Math.PI / N) + W * (mobile ? 0.18 : 0.3);
      track.style.setProperty('--persp', Math.round(R * 2.3) + 'px');
      spin(rot);
    }

    /* Rotation. Each card fades by how far it has turned from the front; cards facing away are hidden. */
    var rot = 0, active = -1;
    function spin(deg) {
      rot = deg;
      ring.style.transform = 'translateZ(' + (-R).toFixed(1) + 'px) rotateY(' + deg.toFixed(3) + 'deg)';
      cards.forEach(function (c, i) {
        var rel = ((i * STEP + deg) % 360 + 540) % 360 - 180;   /* -180..180, 0 = front */
        var f = Math.cos(rel * Math.PI / 180);
        /* The card at the front steps forward out of the ring; the others sit back and dim. */
        var lift = W * 0.16 * Math.pow(Math.max(f, 0), 8);
        c.style.transform = 'translate(-50%,-50%) rotateY(' + (i * STEP) + 'deg) translateZ(' + (R + lift).toFixed(1) + 'px)';
        c.style.opacity = f > 0 ? (0.12 + 0.88 * Math.pow(f, 2.6)).toFixed(3) : 0;
        c.style.zIndex = Math.round(f * 100) + 100;
      });
      var a = ((Math.round(-deg / STEP) % N) + N) % N;
      if (a !== active) setActive(a);
    }

    function setActive(a) {
      if (active >= 0) cards[active].classList.remove('is-front');
      active = a;
      cards[a].classList.add('is-front');
      cur.textContent = pad2(a + 1);
      caption.classList.add('is-swapping');
      clearTimeout(setActive.t);
      setActive.t = setTimeout(function () {
        var src = cards[a], html = '';
        Array.prototype.forEach.call(src.children, function (el) {
          if (!el.classList.contains('model-art') && !el.classList.contains('model-cta')) html += el.outerHTML;
        });
        caption.innerHTML = html;
        var cta = $('.model-cta', src);
        if (cta) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'link model-cta'; b.textContent = cta.textContent;
          b.addEventListener('click', function () { cta.click(); });
          caption.appendChild(b);
        }
        caption.classList.remove('is-swapping');
      }, 160);
    }

    /* Scroll drives the ring: one full turn over the pinned distance, settling on a card. */
    var st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: function () { return '+=' + Math.round(window.innerHeight * RING_SCREENS_PER_CARD * N); },
      pin: true,
      scrub: 0.8,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: function (self) { spin(-self.progress * 360); },
      /* When the scroll comes to rest mid-turn, glide on to the nearest card (through Lenis, so the
         settle and the smooth scrolling never fight). */
      onScrubComplete: function (self) {
        if (!self.isActive) return;
        var y = self.start + Math.round(self.progress * N) / N * (self.end - self.start);
        if (Math.abs(y - self.scroll()) > 2) {
          if (lenis) lenis.scrollTo(y, { duration: 0.7 }); else window.scrollTo({ top: y, behavior: 'smooth' });
        }
      },
      onRefresh: layout
    });

    function goTo(index) {
      var p = clamp(index / N, 0, 1);
      var y = st.start + p * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { duration: 1.1 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }
    prev.addEventListener('click', function () { goTo(Math.round(st.progress * N) - 1); });
    next.addEventListener('click', function () { goTo(Math.round(st.progress * N) + 1); });

    window.addEventListener('resize', layout);
    layout();
    setActive(0);
  }

  /* ---------- Configurator ---------- */
  var cfg = { model: models[0], paint: models[0].paint, wheel: models[0].wheel };
  function paintName(hex) {
    var p = window.Car.PAINTS.filter(function (x) { return x.hex === hex; })[0];
    return p ? p.name : 'Custom colour';
  }
  function wheelName(id) {
    var w = window.Car.WHEELS.filter(function (x) { return x.id === id; })[0];
    return w ? w.name.toLowerCase() : id;
  }

  function renderCfg(opts) {
    opts = opts || {};
    var carEl = $('#cfgCar');
    if (CAR) {
      /* Photographic car: paint and wheel finish change in place (CSS transitions do the blend). */
      if (!$('.car-photo', carEl)) carEl.innerHTML = window.Car.photo(CAR, { label: cfg.model.name });
      $('.car-photo', carEl).setAttribute('aria-label', cfg.model.name + ' in ' + paintName(cfg.paint) + ', ' + wheelName(cfg.wheel) + ' wheels');
      window.Car.setPaint(carEl, cfg.paint);
      window.Car.setWheels(carEl, cfg.wheel);
      if (opts.rebuild) { carEl.classList.remove('is-swap'); void carEl.offsetWidth; carEl.classList.add('is-swap'); }
    } else if (opts.rebuild) {
      carEl.innerHTML = window.Car.svg({ paint: cfg.paint, wheel: cfg.wheel });
      carEl.classList.remove('is-swap'); void carEl.offsetWidth; carEl.classList.add('is-swap');
    } else {
      var body = $('.paint', carEl);
      if (body) body.style.fill = cfg.paint;
    }
    $('#cfgPaintName').textContent = paintName(cfg.paint);
    $$('.sw').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.hex === cfg.paint)); });
    $$('#wheelSeg button').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.id === cfg.wheel)); });
    $('#cfgModel').value = cfg.model.id;
    $('#cfgSpecs').innerHTML =
      '<div><dt>Power</dt><dd>' + cfg.model.hp + '</dd></div>' +
      '<div><dt>0 to 100 km/h</dt><dd>' + cfg.model.accel + '</dd></div>' +
      '<div><dt>Range</dt><dd>' + cfg.model.range + '</dd></div>';
    $('#cfgSummary').textContent = cfg.model.name + ' in ' + paintName(cfg.paint) + ' on ' + wheelName(cfg.wheel) + ' wheels.';
  }

  function initConfigurator() {
    var sel = $('#cfgModel');
    sel.innerHTML = models.map(function (m) { return '<option value="' + m.id + '">' + m.name + '</option>'; }).join('');

    $('#swatches').innerHTML = window.Car.PAINTS.map(function (p) {
      return '<button type="button" class="sw" role="radio" aria-checked="false" aria-label="' + p.name + '" title="' + p.name + '" data-hex="' + p.hex + '" style="--c:' + p.hex + '"></button>';
    }).join('');
    $('#wheelSeg').innerHTML = window.Car.WHEELS.map(function (w) {
      return '<button type="button" role="radio" aria-checked="false" data-id="' + w.id + '">' + w.name + '</button>';
    }).join('');

    sel.addEventListener('change', function () {
      cfg.model = models.filter(function (m) { return m.id === sel.value; })[0];
      cfg.paint = cfg.model.paint; cfg.wheel = cfg.model.wheel;
      renderCfg({ rebuild: true });
    });
    $('#swatches').addEventListener('click', function (e) {
      var b = e.target.closest('.sw'); if (!b) return;
      cfg.paint = b.dataset.hex; renderCfg();
    });
    $('#wheelSeg').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      cfg.wheel = b.dataset.id; renderCfg({ rebuild: !CAR });
    });

    models.forEach(function (m) {
      $('.model-cta', m.el).addEventListener('click', function () {
        cfg.model = m; cfg.paint = m.paint; cfg.wheel = m.wheel;
        renderCfg({ rebuild: true });
        scrollToTarget($('#configure'));
      });
    });

    $('#cfgRequest').addEventListener('click', function () {
      $('#fModel').value = cfg.model.id;
      var msg = $('#fMsg');
      msg.value = 'I would like to discuss a ' + cfg.model.name + ' in ' + paintName(cfg.paint) + ' on ' + wheelName(cfg.wheel) + ' wheels.';
      scrollToTarget($('#book'));
      setTimeout(function () { $('#fName').focus({ preventScroll: true }); }, reduce ? 0 : 1600);
    });

    renderCfg({ rebuild: true });
  }

  /* ---------- Booking form (front end only) ---------- */
  function initForm() {
    var form = $('#bookForm'), fModel = $('#fModel'), ok = $('#formOk');
    fModel.innerHTML = '<option value="">Choose a model</option>' +
      models.map(function (m) { return '<option value="' + m.id + '">' + m.name + '</option>'; }).join('') +
      '<option value="undecided">Not sure yet</option>';
    var today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    $('#fDate').min = today.toISOString().slice(0, 10);

    function setErr(inputId, errId, text) {
      var wrap = $('#' + inputId).closest('.field');
      $('#' + errId).textContent = text;
      wrap.classList.toggle('has-error', !!text);
      $('#' + inputId).setAttribute('aria-invalid', text ? 'true' : 'false');
      return !text;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#fName').value.trim(), email = $('#fEmail').value.trim();
      var good = [
        setErr('fName', 'eName', name ? '' : 'Enter your full name.'),
        setErr('fEmail', 'eEmail', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? '' : 'Enter an email address like name@example.com.'),
        setErr('fModel', 'eModel', fModel.value ? '' : 'Choose a model, or pick "Not sure yet".')
      ].every(Boolean);
      if (!good) { var first = $('.has-error input, .has-error select', form); if (first) first.focus(); return; }

      /* TODO: send the data to your backend or a form service here, for example:
         fetch('/api/viewing', { method: 'POST', body: new FormData(form) }) */
      ok.textContent = 'Request received. A client advisor will write to ' + email + ' within one working day.';
      ok.hidden = false;
      form.reset();
    });
  }

  /* ---------- Boot ---------- */
  function startLenis() {
    if (reduce || !window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function boot() {
    paintCars();
    fitAll();
    initConfigurator();
    initForm();
    initHotspots();
    startLenis();
    initNav();
    /* Pinned sections must be created in page order: hero, then design, then the journey. */
    if (!reduce) initHeroScroll();
    initIntro();
    initDesign();
    initJourney();
    initCarousel();  /* after the journey: its pin comes later on the page */
    initCommission();
    initPhotos();

    var plCount = $('#plCount'), plBar = $('#plBar'), pl = $('#preloader');
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

    preload(function (p) {
      plCount.textContent = Math.round(p * 100);
      plBar.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    }).then(function () { return fontsReady; }).then(function () {
      fitAll();
      sizeCanvas();
      if (hasGsap) ScrollTrigger.refresh();
      pl.classList.add('is-done');
      if (!reduce) heroIntro();
    });

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { fitAll(); sizeCanvas(); }, 120);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
