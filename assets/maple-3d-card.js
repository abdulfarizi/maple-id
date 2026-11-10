/* M-ID · 3D profile card: tilts the .idcard toward the pointer (desktop only, reduced motion off). */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduce || !fine) return;

  function bind(card) {
    if (card.__tilt) return;
    card.__tilt = true;
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', (x * 12).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (-y * 10).toFixed(2) + 'deg');
    });
    card.addEventListener('pointerleave', function () {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }

  function scan() { document.querySelectorAll('.idcard').forEach(bind); }
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  scan();
})();
