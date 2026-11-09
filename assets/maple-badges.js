/* M-ID · profile badges: tick (verified), crown (special honor), music artist, and seller.
 * window.dgBadgeHTML({verified, crown, musicArtist, seller}) → the badges shown beside a name on every card style.
 * If a person has more than one, they share one slot and take turns (the slot is the width of the widest badge).
 * Badges are given by the site owner only (Menu → Badges); the card just displays what the server sends. */
(function () {
  'use strict';
  var defs = '<defs><linearGradient id="mid-tick-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cc4ff"/><stop offset=".55" stop-color="#2f9bff"/><stop offset="1" stop-color="#1b6fe0"/></linearGradient>' +
    '<linearGradient id="mid-seller-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ef0b4"/><stop offset=".55" stop-color="#22c55e"/><stop offset="1" stop-color="#15803d"/></linearGradient></defs>';
  var TICK = '<svg viewBox="0 0 24 24" aria-hidden="true">' + defs + '<circle cx="12" cy="12" r="10.4" fill="url(#mid-tick-g)"/><ellipse cx="9" cy="6.6" rx="5.2" ry="2.6" fill="#fff" opacity=".22"/><path fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" d="M7.6 12.4l2.9 2.9 5.9-6.1"/></svg>';
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

  window.dgBadgeHTML = function (b) {
    if (!b) return '';
    var on = DEF.filter(function (d) { return !!b[d.k]; });
    if (!on.length) return '';
    var layers = on.map(function (d, i) {
      return '<span class="mid-vb ' + d.cls + (i === 0 ? ' on' : '') + '" title="' + d.t + '" role="img" aria-label="' + d.t + '">' + d.svg + '</span>';
    }).join('');
    var cycle = on.length > 1 ? ' data-bcycle' : '';
    return '<span class="mid-vbs"' + cycle + '>' + layers + '</span>';
  };

  // Several badges share one slot: every few seconds the next one takes its place.
  // One shared timer for the whole page; people who prefer reduced motion see the first badge only.
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  setInterval(function () {
    var slots = document.querySelectorAll('.mid-vbs[data-bcycle]');
    for (var s = 0; s < slots.length; s++) {
      var el = slots[s], L = el.children, n = L.length;
      if (n < 2) continue;
      var cur = el.__cur || 0;
      if (L[cur]) L[cur].classList.remove('on');
      cur = (cur + 1) % n;
      if (L[cur]) L[cur].classList.add('on');
      el.__cur = cur;
    }
  }, 2600);
})();
