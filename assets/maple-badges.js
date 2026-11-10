/* M-ID · profile badges: tick (verified), seller, crown (special honor), music artist.
 * All four share one rounded-square badge (a squircle, not a circle or a star), each in its own colour, with one white symbol drawn in the same 24-unit box.
 * window.dgBadgeHTML({verified, crown, musicArtist, seller, badgeMode, badgeSpeed}) → the badges beside a name on every card style.
 *  · badgeMode "all" (default): every badge shows side by side at once.
 *  · badgeMode "cycle": the badges share one slot and take turns, changing every badgeSpeed seconds (1 to 8, default 2.6).
 * Badges are given by the site owner only (Menu → Badges); the card just displays what the server sends. */
(function () {
  'use strict';
  // the rounded-square badge shape, the same for every badge
  var SHAPE = 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z';

  // every symbol is drawn in the same 24-unit box and placed the same way: scaled to 50%, centred
  function badge(symbol) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="' + SHAPE + '"/>'
      + '<g transform="translate(12 12) scale(.5) translate(-12 -12)">' + symbol + '</g></svg>';
  }

  // tick: a bold check
  var TICK = badge('<path fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" d="M4 12.6l5.2 5.2L20 6.6"/>');
  // seller: a shop front with an awning and a door
  var SELLER = badge(
    '<path fill="#fff" d="M3 8.5L4.6 3.5h14.8L21 8.5z"/>'
    + '<path fill="#fff" d="M3 8.5h18v1.6a2.9 2.9 0 0 1-5.9 0 2.9 2.9 0 0 1-5.9 0 2.9 2.9 0 0 1-5.9 0 2.9 2.9 0 0 1-1.3 2.4z"/>'
    + '<path fill="#fff" d="M5 13.2h14V21H5z"/>'
    + '<path fill="currentColor" d="M10 15.6h4V21h-4z"/>');
  // crown: a crown
  var CROWN = badge('<path fill="#fff" d="M3 8l4.5 3.6L12 4l4.5 7.6L21 8l-1.8 10.2a1 1 0 0 1-1 .8H5.8a1 1 0 0 1-1-.8z"/><rect x="5.2" y="20" width="13.6" height="1.8" rx=".9" fill="#fff"/>');
  // music artist: a note
  var MUSIC = badge('<path fill="#fff" d="M9 17.5a3 3 0 1 1-2-2.8V5.1l12-2.6v12.4a3 3 0 1 1-2-2.8V6.3L9 8z"/>');

  // order the badges are shown in when someone has several
  var DEF = [
    { k: 'verified', cls: 'mid-vb-tick', t: 'Verified', svg: TICK },
    { k: 'seller', cls: 'mid-vb-seller', t: 'Seller', svg: SELLER },
    { k: 'crown', cls: 'mid-vb-crown', t: 'Special honor', svg: CROWN },
    { k: 'musicArtist', cls: 'mid-vb-music', t: 'Music artist', svg: MUSIC }
  ];

  function speedOf(v) {
    var n = Number(v);
    if (!isFinite(n) || n <= 0) n = 2.6;
    return Math.min(8, Math.max(1, n));
  }

  window.dgBadgeHTML = function (b) {
    if (!b) return '';
    var on = DEF.filter(function (d) { return !!b[d.k]; });
    if (!on.length) return '';
    var cycle = b.badgeMode === 'cycle' && on.length > 1;
    var speed = speedOf(b.badgeSpeed);
    var layers = on.map(function (d, i) {
      var active = !cycle || i === 0;
      return '<span class="mid-vb ' + d.cls + (active ? ' on' : '') + '" title="' + d.t + '" role="img" aria-label="' + d.t + '">' + d.svg + '</span>';
    }).join('');
    return '<span class="mid-vbs' + (cycle ? ' is-cycle' : '') + '"' + (cycle ? ' data-bcycle data-speed="' + speed + '"' : '') + '>' + layers + '</span>';
  };

  // Cycling slots: each one moves on after its own speed. One shared timer for the page.
  // People who prefer reduced motion see the first badge only.
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  setInterval(function () {
    var now = Date.now();
    var slots = document.querySelectorAll('.mid-vbs[data-bcycle]');
    for (var s = 0; s < slots.length; s++) {
      var el = slots[s], L = el.children, n = L.length;
      if (n < 2) continue;
      var ms = speedOf(el.getAttribute('data-speed')) * 1000;
      if (!el.__t) el.__t = now;
      if (now - el.__t < ms) continue;
      el.__t = now;
      var cur = el.__cur || 0;
      if (L[cur]) L[cur].classList.remove('on');
      cur = (cur + 1) % n;
      if (L[cur]) L[cur].classList.add('on');
      el.__cur = cur;
    }
  }, 200);
})();
