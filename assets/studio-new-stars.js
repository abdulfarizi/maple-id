/* M-ID · Studio (new layout): a little star burst when a tick is turned on.
 * Loaded only by /studio-new. Purely visual: it doesn't change any value or setting.
 * Turned off for people who have reduced motion enabled in their system settings. */
(function () {
  'use strict';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.5 6.6-.8z" fill="currentColor"/></svg>';
  var STARS = 9;

  var css = '' +
    '.st2-burst{position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:9999}' +
    '.st2-star{position:absolute;left:-7px;top:-7px;width:14px;height:14px;color:var(--accent,#ff6a3d);opacity:0;' +
      'filter:drop-shadow(0 0 6px currentColor);animation:st2-fly .9s cubic-bezier(.16,1,.3,1) forwards}' +
    '.st2-star svg{width:100%;height:100%;display:block}' +
    '@keyframes st2-fly{' +
      '0%{opacity:0;transform:translate(0,0) scale(.2) rotate(0deg)}' +
      '15%{opacity:1}' +
      '70%{opacity:1}' +
      '100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.05) rotate(var(--rot))}' +
    '}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function burst(box) {
    var r = box.getBoundingClientRect();
    if (!r.width && !r.height) return;
    var host = document.createElement('div');
    host.className = 'st2-burst';
    host.style.left = (r.left + r.width / 2) + 'px';
    host.style.top = (r.top + r.height / 2) + 'px';
    host.style.color = getComputedStyle(box.closest('.studio-v2') || document.documentElement).getPropertyValue('--accent').trim() || '#ff6a3d';

    for (var i = 0; i < STARS; i++) {
      var s = document.createElement('span');
      s.className = 'st2-star';
      s.innerHTML = STAR;
      var angle = (Math.PI * 2 * i) / STARS + (Math.random() - 0.5) * 0.4;
      var dist = 34 + Math.random() * 22;
      var size = 9 + Math.random() * 6;
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.left = -size / 2 + 'px';
      s.style.top = -size / 2 + 'px';
      s.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      s.style.setProperty('--dy', (Math.sin(angle) * dist).toFixed(1) + 'px');
      s.style.setProperty('--rot', (Math.random() * 240 - 120).toFixed(0) + 'deg');
      s.style.animationDelay = (Math.random() * 60).toFixed(0) + 'ms';
      host.appendChild(s);
    }
    document.body.appendChild(host);
    setTimeout(function () { if (host.parentNode) host.parentNode.removeChild(host); }, 1100);
  }

  // Fires when a tick is turned on (from the box or its label). Turning it off does nothing.
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.type !== 'checkbox' || !t.checked) return;
    if (!t.closest || !t.closest('.studio-v2')) return;
    burst(t);
  }, true);
})();
