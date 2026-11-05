/* Maple ID · light / dark mode.
 * Loaded first in <head>, so the right palette is on the page before anything paints (no flash).
 * Choice order: the person's saved pick → the device setting. A toggle is added to the top bar. */
(function () {
  'use strict';
  var KEY = 'maple-mode', root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var COLORS = { dark: '#0f0d0e', light: '#faf6f2' };

  /* "lite" = only when the device asks for less motion (reduced-motion or data-saver); the falling leaves run everywhere else */
  var nav = navigator, conn = nav.connection || {};
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.__mapleLite = !!(reduce || conn.saveData);
  if (window.__mapleLite) root.setAttribute('data-lite', '');

  function read() { try { var s = localStorage.getItem(KEY); return s === 'light' || s === 'dark' ? s : ''; } catch (e) { return ''; } }
  function current() { return read() || (mq && mq.matches ? 'dark' : 'light'); }

  function paint(mode) {
    root.setAttribute('data-mode', mode);
    root.style.colorScheme = mode;
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m && document.head) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    if (m) m.setAttribute('content', COLORS[mode]);
    var b = document.getElementById('mode-btn');
    if (b) { b.setAttribute('aria-pressed', String(mode === 'dark')); b.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); b.title = mode === 'dark' ? 'Light mode' : 'Dark mode'; }
  }
  function set(mode, save) {
    root.classList.add('mode-anim');
    paint(mode);
    if (save) { try { localStorage.setItem(KEY, mode); } catch (e) {} }
    clearTimeout(set.t); set.t = setTimeout(function () { root.classList.remove('mode-anim'); }, 320);
    try { window.dispatchEvent(new CustomEvent('maple:mode', { detail: mode })); } catch (e) {}
  }
  paint(current());

  window.mapleMode = { get: function () { return root.getAttribute('data-mode'); }, set: function (m) { set(m === 'dark' ? 'dark' : 'light', true); }, toggle: function () { set(root.getAttribute('data-mode') === 'dark' ? 'light' : 'dark', true); } };

  /* follow the device until the person picks one; follow other tabs and the card/owner iframes */
  if (mq) { var f = function () { if (!read()) set(mq.matches ? 'dark' : 'light', false); }; mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f); }
  window.addEventListener('storage', function (e) { if (e.key === KEY) set(current(), false); });

  /* the toggle button */
  var ICON = '<svg class="ms-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></g></svg>'
    + '<svg class="ms-moon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a.7.7 0 0 0-.9-.9A9.6 9.6 0 1 0 21.1 15.5a.7.7 0 0 0-.9-.9z"/></svg>';
  function makeBtn(cls) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'mode-switch ' + (cls || ''); b.innerHTML = ICON;
    b.addEventListener('click', function () { window.mapleMode.toggle(); }); return b;
  }
  function mount() {
    var tb = document.querySelector('.topbar');
    if (tb && !document.getElementById('mode-btn')) {
      var acts = document.getElementById('nav-actions'), end = tb.querySelector('.tb-end');
      if (!end) { end = document.createElement('div'); end.className = 'tb-end'; tb.appendChild(end); if (acts) end.appendChild(acts); }
      var b = makeBtn(); b.id = 'mode-btn'; end.appendChild(b); paint(current());
    }
  }
  function ready() {
    mount();
    var tb = document.querySelector('.topbar');
    if (tb && window.MutationObserver) new MutationObserver(function () { if (!document.getElementById('mode-btn')) mount(); }).observe(tb, { childList: true, subtree: true });
    if (!tb) { /* iframe pages (owner card): a small floating switch, only when asked */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
