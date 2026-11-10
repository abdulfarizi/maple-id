/* M-ID · profile badges: tick (verified), seller, crown (special honor), music artist.
 * window.dgBadgeHTML({verified, crown, musicArtist, seller, badgeMode, badgeSpeed}) → the badges beside a name on every card style.
 *  · badgeMode "all" (default): every badge shows side by side at once.
 *  · badgeMode "cycle": the badges share one slot and take turns, changing every badgeSpeed seconds (1 to 8, default 2.6).
 * Badges are given by the site owner only (Menu → Badges); the card just displays what the server sends. */
(function () {
  'use strict';
  var defs = '<defs><linearGradient id="mid-seller-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ef0b4"/><stop offset=".55" stop-color="#22c55e"/><stop offset="1" stop-color="#15803d"/></linearGradient></defs>';
  // the verified tick: the original flat seal
  var TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8l2.5 1.9 3.1-.2 1 3 2.6 1.8-.9 3 .9 3-2.6 1.8-1 3-3.1-.2-2.5 1.9-2.5-1.9-3.1.2-1-3-2.6-1.8.9-3-.9-3 2.6-1.8 1-3 3.1.2z"/><path fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M8 12.3l2.7 2.7 5.3-5.6"/></svg>';
  var SELLER = '<svg viewBox="0 0 24 24" aria-hidden="true">' + defs + '<circle cx="12" cy="12" r="10.4" fill="url(#mid-seller-g)"/><ellipse cx="9" cy="6.6" rx="5.2" ry="2.6" fill="#fff" opacity=".22"/><path fill="#fff" d="M6.2 8.2h11.6l1.1 3.1a2.2 2.2 0 0 1-4.1 1 2.2 2.2 0 0 1-4.1 0 2.2 2.2 0 0 1-4.1 0 2.2 2.2 0 0 1-.4-1z"/><path fill="#fff" d="M7 13.2h10v4.4a.6.6 0 0 1-.6.6H7.6a.6.6 0 0 1-.6-.6z" opacity=".95"/><path fill="#15803d" d="M10.4 15h3.2v3h-3.2z" opacity=".55"/></svg>';
  var CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8l2.5 1.9 3.1-.2 1 3 2.6 1.8-.9 3 .9 3-2.6 1.8-1 3-3.1-.2-2.5 1.9-2.5-1.9-3.1.2-1-3-2.6-1.8.9-3-.9-3 2.6-1.8 1-3 3.1.2z"/><g transform="translate(12 12) scale(.5) translate(-12 -12.9)"><path fill="#fff" d="M3 8l4.5 3.6L12 4l4.5 7.6L21 8l-1.8 10.2a1 1 0 0 1-1 .8H5.8a1 1 0 0 1-1-.8z"/><rect x="5.2" y="20" width="13.6" height="1.8" rx=".9" fill="#fff"/></g></svg>';
  var MUSIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8l2.5 1.9 3.1-.2 1 3 2.6 1.8-.9 3 .9 3-2.6 1.8-1 3-3.1-.2-2.5 1.9-2.5-1.9-3.1.2-1-3-2.6-1.8.9-3-.9-3 2.6-1.8 1-3 3.1.2z"/><g transform="translate(12 12) scale(.5) translate(-12 -11.5)"><path fill="#fff" d="M9 17.5a3 3 0 1 1-2-2.8V5.1l12-2.6v12.4a3 3 0 1 1-2-2.8V6.3L9 8z"/></g></svg>';

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
