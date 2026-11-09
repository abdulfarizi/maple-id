/* M-ID · profile badges (v36-19: crown re-centred): window.dgBadgeHTML({verified, crown}) → the tick and/or crown shown beside a name on every card style.
 * Badges are given by the site owner only (Menu → Badges); the card just displays what the server sends. */
(function () {
  'use strict';
  var TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8l2.5 1.9 3.1-.2 1 3 2.6 1.8-.9 3 .9 3-2.6 1.8-1 3-3.1-.2-2.5 1.9-2.5-1.9-3.1.2-1-3-2.6-1.8.9-3-.9-3 2.6-1.8 1-3 3.1.2z"/><path fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M8 12.3l2.7 2.7 5.3-5.6"/></svg>';
  var CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8l2.5 1.9 3.1-.2 1 3 2.6 1.8-.9 3 .9 3-2.6 1.8-1 3-3.1-.2-2.5 1.9-2.5-1.9-3.1.2-1-3-2.6-1.8.9-3-.9-3 2.6-1.8 1-3 3.1.2z"/><g transform="translate(12 12) scale(.5) translate(-12 -12.9)"><path fill="#fff" d="M3 8l4.5 3.6L12 4l4.5 7.6L21 8l-1.8 10.2a1 1 0 0 1-1 .8H5.8a1 1 0 0 1-1-.8z"/><rect x="5.2" y="20" width="13.6" height="1.8" rx=".9" fill="#fff"/></g></svg>';
  var MUSIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 1.8l2.5 1.9 3.1-.2 1 3 2.6 1.8-.9 3 .9 3-2.6 1.8-1 3-3.1-.2-2.5 1.9-2.5-1.9-3.1.2-1-3-2.6-1.8.9-3-.9-3 2.6-1.8 1-3 3.1.2z"/><g transform="translate(12 12) scale(.5) translate(-12 -11.5)"><path fill="#fff" d="M9 17.5a3 3 0 1 1-2-2.8V5.1l12-2.6v12.4a3 3 0 1 1-2-2.8V6.3L9 8z"/></g></svg>';
  window.dgBadgeHTML = function (b) {
    if (!b || (!b.verified && !b.crown && !b.musicArtist)) return '';
    return '<span class="mid-vbs">'
      + (b.verified ? '<span class="mid-vb mid-vb-tick" title="Verified" role="img" aria-label="Verified">' + TICK + '</span>' : '')
      + (b.crown ? '<span class="mid-vb mid-vb-crown" title="Special honor" role="img" aria-label="Special honor">' + CROWN + '</span>' : '')
      + (b.musicArtist ? '<span class="mid-vb mid-vb-music" title="Music artist" role="img" aria-label="Music artist">' + MUSIC + '</span>' : '')
      + '</span>';
  };
})();
