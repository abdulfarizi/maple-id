/* Maple ID · swipe pager + page layer.
 *
 * Home / Explore / Profile live side by side in one horizontally-snapping strip that is built ONCE
 * and kept alive. Public cards (/name) and the Studio (/studio) open as a "layer" on top of that
 * same strip, so the bottom dock never has to tear a page down or re-render anything:
 *   - tap a dock item while a layer is open  -> the strip is positioned underneath, the layer slides away
 *   - open a card / the Studio from any page -> the layer slides in over the strip
 * Every movement uses the same JS tween, so it animates the same on every browser (iOS Safari < 15.4 has
 * no native smooth scrolling, and native smooth scroll fights scroll-snap in Chrome). */
(function () {
  'use strict';
  var NAMES = ['home', 'explore', 'profile'];
  var URLS = ['/', '/#explore', '/profile'];
  var TITLES = ['Maple ID · one link for every handle', 'Explore · Maple ID', 'Profile · Maple ID'];
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  var root, track, appEl, footEl, panes = {}, sections = [];
  var isOn = false, cur = -1, raf = 0, settleT = 0, dragging = false, swallow = false, ro = null;
  var layer, layerMain, layerKind = '', layerTimer = 0;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var width = function () { return track ? track.clientWidth || 1 : 1; };
  var prog = function () { return track ? track.scrollLeft / width() : 0; };
  var dockEl = function () { return document.querySelector('.dock'); };
  var reduced = function () { return !!(REDUCE && REDUCE.matches); };

  /* ───── one tween for every horizontal move (no native smooth scroll, no snap fighting) ───── */
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var anim = null;
  function stopAnim() { if (anim) { cancelAnimationFrame(anim.id); anim.el.style.scrollSnapType = ''; anim = null; } }
  function tweenLeft(el, to, ms, done) {
    stopAnim();
    var from = el.scrollLeft, dist = to - from;
    if (reduced() || Math.abs(dist) < 1 || ms <= 0) { el.scrollLeft = to; if (done) done(); return; }
    el.style.scrollSnapType = 'none';
    var t0 = 0, a = anim = { el: el, id: 0 };
    function step(now) {
      if (anim !== a) return;
      if (!t0) t0 = now;
      var u = Math.min(1, (now - t0) / ms);
      el.scrollLeft = from + dist * easeOut(u);
      if (u < 1) a.id = requestAnimationFrame(step);
      else { anim = null; el.style.scrollSnapType = ''; el.scrollLeft = to; if (done) done(); }
    }
    a.id = requestAnimationFrame(step);
  }
  // a finger on the strip always wins over a running tween
  ['touchstart', 'wheel', 'pointerdown'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (anim && e.target && e.target.closest && e.target.closest('.pager-track') ) stopAnim(); }, { passive: true, capture: true });
  });
  window.dgTween = tweenLeft;

  function ensure() {
    if (root) return;
    appEl = document.getElementById('app');
    footEl = document.querySelector('footer.foot');
    root = document.createElement('div'); root.id = 'pager'; root.className = 'pager'; root.hidden = true;
    track = document.createElement('div'); track.className = 'pager-track';
    NAMES.forEach(function (n, i) {
      var sec = document.createElement('section'); sec.className = 'pg'; sec.dataset.pg = n;
      sec.setAttribute('aria-label', n);
      var m = document.createElement('main'); m.className = 'pg-main'; m.id = 'pg-' + n;
      sec.appendChild(m); track.appendChild(sec); panes[n] = m; sections[i] = sec;
    });
    root.appendChild(track);
    document.body.insertBefore(root, appEl);
    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { if (isOn && cur >= 0) track.scrollLeft = cur * width(); });
    var tb = document.querySelector('.topbar');
    var setTb = function () { if (tb) document.documentElement.style.setProperty('--tb-h', tb.offsetHeight + 'px'); };
    setTb(); if (window.ResizeObserver && tb) { ro = new ResizeObserver(setTb); ro.observe(tb); }
  }

  function ensureLayer() {
    if (layer) return;
    ensure();
    layer = document.createElement('div'); layer.id = 'pg-layer'; layer.className = 'pg-layer'; layer.hidden = true;
    layerMain = document.createElement('main'); layerMain.className = 'pg-layer-main'; layerMain.id = 'pg-layer-main';
    layer.appendChild(layerMain);
    root.parentNode.insertBefore(layer, root.nextSibling);
  }

  /* ───── dock highlight ───── */
  function items() { var d = dockEl(); return d ? d.querySelectorAll('.dock-i') : []; }
  function moveInd(p) {
    var d = dockEl(), ind = d && d.querySelector('.dock-ind'), it = items();
    if (!ind || !it.length) return;
    var a = clamp(Math.floor(p), 0, it.length - 1), b = Math.min(a + 1, it.length - 1), f = clamp(p - a, 0, 1);
    var A = it[a], B = it[b];
    var x = lerp(A.offsetLeft, B.offsetLeft, f), w = lerp(A.offsetWidth, B.offsetWidth, f), s = Math.sin(Math.PI * f);
    ind.style.width = w + 'px';
    ind.style.transform = 'translate3d(' + x + 'px,0,0) scale(' + (1 + 0.14 * s).toFixed(3) + ',' + (1 - 0.06 * s).toFixed(3) + ')';
  }
  // which dock tab is lit: the strip's own page, or (while a layer is open) the Studio -> Profile, a card -> none
  function shownIndex() { return layerKind === 'studio' ? 2 : layerKind ? -1 : cur; }
  function paint() {
    var idx = shownIndex(), d = dockEl(), ind = d && d.querySelector('.dock-ind');
    items().forEach(function (a) {
      var on = idx >= 0 && a.dataset.dock === NAMES[idx];
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (ind) { ind.style.opacity = idx < 0 ? '0' : ''; if (idx >= 0 && layerKind) moveInd(idx); }
    document.body.dataset.page = layerKind === 'studio' ? 'profile' : layerKind ? 'card' : NAMES[Math.max(cur, 0)];
  }
  function mark(r) { cur = r; paint(); }
  function decorate() {
    var d = dockEl();
    if (!d) return;
    var ind = d.querySelector('.dock-ind');
    if (!isOn) { if (ind) ind.remove(); return; }
    if (!ind) { ind = document.createElement('i'); ind.className = 'dock-ind'; ind.setAttribute('aria-hidden', 'true'); d.insertBefore(ind, d.firstChild); }
    if (cur < 0) cur = 0;
    paint(); moveInd(layerKind ? Math.max(shownIndex(), 0) : (track ? prog() : cur));
  }

  /* ───── scroll → progress ───── */
  function update() {
    raf = 0;
    var p = prog();
    if (!layerKind) moveInd(p);
    var r = clamp(Math.round(p), 0, NAMES.length - 1);
    if (r !== cur) { cur = r; if (!layerKind) paint(); }
    sections.forEach(function (s, i) { s.style.setProperty('--d', clamp(Math.abs(p - i), 0, 1).toFixed(3)); });
  }
  function onScroll() {
    if (!raf) raf = requestAnimationFrame(update);
    clearTimeout(settleT); settleT = setTimeout(settle, 120);
  }
  function settle() {
    if (dragging || !isOn || layerKind || anim) return;
    var r = clamp(Math.round(prog()), 0, NAMES.length - 1);
    if (r !== cur) mark(r);
    document.title = TITLES[r];
    var want = URLS[r], have = location.pathname + location.hash;
    if (want !== have && !(r === 0 && location.pathname === '/' && !location.hash)) { try { history.replaceState(history.state, '', want); } catch (e) {} }
  }

  function go(i, instant) {
    ensure(); i = clamp(i, 0, NAMES.length - 1);
    var left = i * width();
    if (instant) {
      stopAnim();
      track.style.scrollSnapType = 'none'; track.scrollLeft = left;
      requestAnimationFrame(function () { track.style.scrollSnapType = ''; update(); settle(); });
      mark(i); moveInd(i);
    } else {
      cur = i; if (!layerKind) paint();
      tweenLeft(track, left, 340, function () { update(); settle(); });
    }
  }

  /* ───── the layer (public card / Studio) ───── */
  function hideLayerNow() {
    clearTimeout(layerTimer);
    if (!layer) return;
    layer.classList.remove('in', 'out', 'swap');
    layer.hidden = true; layerMain.replaceChildren();
    document.body.classList.remove('has-layer');
  }
  function openLayer(kind) {
    ensureLayer();
    var wasOn = isOn, was = layerKind;
    api.enter();
    clearTimeout(layerTimer);
    layerKind = kind;
    layerMain.replaceChildren();
    layer.hidden = false; layer.scrollTop = 0;
    layer.classList.remove('in', 'out', 'swap');
    document.body.classList.add('has-layer');
    if (!reduced()) {
      if (was) { void layer.offsetWidth; layer.classList.add('swap'); }          // layer -> layer: quick cross-fade
      else if (wasOn) { void layer.offsetWidth; layer.classList.add('in'); }     // from the strip: slide in
    }                                                                              // cold landing: no animation, the card has its own intro
    layerTimer = setTimeout(function () { if (layer) layer.classList.remove('in', 'swap'); }, 420);
    paint(); moveInd(Math.max(shownIndex(), 0));
    return layerMain;
  }
  // close the layer; `idx` is the strip page to reveal (the strip is positioned first, so nothing re-renders)
  function closeLayer(idx) {
    if (!layerKind || !layer) return false;
    var i = idx == null ? Math.max(cur, 0) : clamp(idx, 0, NAMES.length - 1);
    stopAnim();
    track.style.scrollSnapType = 'none'; track.scrollLeft = i * width();
    requestAnimationFrame(function () { track.style.scrollSnapType = ''; });
    layerKind = ''; cur = i; paint(); moveInd(i); update();
    document.title = TITLES[i];
    clearTimeout(layerTimer);
    if (reduced()) { hideLayerNow(); return true; }
    layer.classList.remove('in', 'swap'); void layer.offsetWidth; layer.classList.add('out');
    layerTimer = setTimeout(hideLayerNow, 300);
    return true;
  }

  /* ───── dragging a finger across the dock ───── */
  var ds = null;
  function posToProg(x) {
    var it = items(); if (it.length < 2) return 0;
    var r0 = it[0].getBoundingClientRect(), r1 = it[it.length - 1].getBoundingClientRect();
    var c0 = r0.left + r0.width / 2, c1 = r1.left + r1.width / 2;
    return clamp((x - c0) / (c1 - c0), 0, 1) * (it.length - 1);
  }
  document.addEventListener('pointerdown', function (e) {
    if (!isOn || !e.target.closest) return;
    var d = e.target.closest('.dock'); if (!d) return;
    ds = { x: e.clientX, id: e.pointerId, moved: false, d: d };
  }, true);
  document.addEventListener('pointermove', function (e) {
    if (!ds || e.pointerId !== ds.id) return;
    if (!ds.moved) {
      if (Math.abs(e.clientX - ds.x) < 8) return;
      ds.moved = true; dragging = true; stopAnim(); track.classList.add('is-dragging');
      try { ds.d.setPointerCapture(ds.id); } catch (x) {}
      ds.d.classList.add('dragging');
    }
    var p = posToProg(e.clientX);
    if (layerKind) { moveInd(p); ds.p = p; }
    else track.scrollLeft = p * width();
    e.preventDefault();
  }, { passive: false });
  function endDrag(e) {
    if (!ds || (e && e.pointerId !== ds.id)) return;
    var moved = ds.moved, p = ds.p; ds.d.classList.remove('dragging'); ds = null;
    if (!moved) return;
    swallow = true; setTimeout(function () { swallow = false; }, 350);
    dragging = false; track.classList.remove('is-dragging');
    var target = clamp(Math.round(layerKind && p != null ? p : prog()), 0, NAMES.length - 1);
    if (layerKind) { navigate(target); } else go(target);
  }
  document.addEventListener('pointerup', endDrag, true);
  document.addEventListener('pointercancel', endDrag, true);

  // dock navigation: from a layer the URL changes with a real history entry (Back returns to the card)
  function navigate(i) {
    var want = URLS[i];
    if (layerKind) {
      if (window.dgNavigate) window.dgNavigate(want);            // the router: builds/refreshes the page, then closes the layer
      else { closeLayer(i); try { history.pushState(null, '', want); } catch (e) {} }
    } else go(i);
  }

  /* dock taps switch pages without a route change; tapping the current tab scrolls it back to the top */
  document.addEventListener('click', function (e) {
    if (swallow) { e.preventDefault(); e.stopImmediatePropagation(); swallow = false; return; }
    if (!isOn || !e.target.closest) return;
    var a = e.target.closest('.dock-i'); if (!a) return;
    var i = NAMES.indexOf(a.dataset.dock); if (i < 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (layerKind) navigate(i);
    else if (i === cur) sections[i].scrollTo({ top: 0, behavior: 'smooth' });
    else go(i);
  }, true);

  document.addEventListener('keydown', function (e) {
    if (!isOn || layerKind || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target; if (t && t.matches && t.matches('input,textarea,select,[contenteditable]')) return;
    if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1);
  });

  var api = window.dgPager = {
    built: false, sig: '',
    panes: function () { ensure(); return panes; },
    active: function () { return isOn; },
    index: function () { return cur; },
    layered: function () { return !!layerKind; },
    layerKind: function () { return layerKind; },
    layerOpen: openLayer,
    layerClose: closeLayer,
    go: go,
    decorate: decorate,
    enter: function () {
      ensure();
      if (!isOn) {
        isOn = true; root.hidden = false; appEl.hidden = true; appEl.replaceChildren();
        document.body.classList.add('pager-on');
        if (footEl && footEl.parentNode !== sections[0]) sections[0].appendChild(footEl);
        if (cur >= 0) track.scrollLeft = cur * width();
      }
      decorate();
    },
    leave: function () {
      if (!isOn) return;
      isOn = false; layerKind = ''; hideLayerNow(); if (root) root.hidden = true; appEl.hidden = false;
      document.body.classList.remove('pager-on'); document.body.removeAttribute('data-page');
      var onStudio = location.pathname.replace(/\/+$/, '') === '/studio';
      items().forEach(function (a) { var on = onStudio && a.dataset.dock === 'profile'; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      if (footEl && appEl.nextSibling !== footEl) appEl.parentNode.insertBefore(footEl, appEl.nextSibling);
      decorate();
    }
  };
})();
