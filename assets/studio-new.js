/* M-ID · Studio (new layout) — organizing layer, loaded only by /studio-new.
 * The Studio itself (fields, saving, music, frames, builder) is the existing one and is not touched.
 * This only reshapes what it rendered: collapsible sections, tips behind an info button, expand/collapse all. */
(function () {
  'use strict';
  var KEY = 'st2:open';
  // sections that start open; everything else starts collapsed (a click opens it)
  var DEFAULT_OPEN = ['identity', 'photos', 'socials', 'game ids', 'card layout', 'theme', 'sounds', 'card features', 'seller shop', 'support', 'bottom music player'];
  var saved = {};
  try { var s0 = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (s0 && typeof s0 === 'object') saved = s0; } catch (e) {}

  document.documentElement.classList.add('studio-new');

  function pathNow() { return location.pathname.replace(/\/+$/, '') || '/'; }

  function label(legend) {
    var n = legend.firstChild;
    var t = (n && n.nodeType === 3 ? n.textContent : legend.textContent) || '';
    return t.replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function startsOpen(f, name) {
    if (Object.prototype.hasOwnProperty.call(saved, name)) return !!saved[name];
    if (f.hasAttribute('data-deck-only') || f.hasAttribute('data-builder-only') || f.hasAttribute('data-star-only')) return true;
    return DEFAULT_OPEN.some(function (d) { return name.indexOf(d) === 0; });
  }
  function setOpen(f, on, persist) {
    f.classList.toggle('st2-open', on);
    var lg = f.querySelector(':scope > legend');
    if (lg) lg.setAttribute('aria-expanded', String(on));
    if (persist && f.__st2name) {
      saved[f.__st2name] = on;
      try { sessionStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
    }
  }

  // The address bar should say /studio-new, while the app itself routes on /studio.
  function fixUrl() {
    try { if (pathNow() === '/studio' && document.querySelector('.studio')) history.replaceState(null, '', '/studio-new'); } catch (e) {}
  }
  // The app's own unsaved-changes warning only fires on /studio, so repeat it for this address.
  function setGuard() {
    window.onbeforeunload = function () { return (window.dgStudioDirty && window.dgStudioDirty()) ? true : null; };
  }
  // Back/forward onto /studio-new: let the app route it as /studio.
  window.addEventListener('popstate', function () {
    try { if (pathNow() === '/studio-new') { history.replaceState(null, '', '/studio'); setTimeout(fixUrl, 80); } } catch (e) {}
  }, true);

  function enhance(st) {
    if (st.__st2) return;
    var form = st.querySelector('#editor');
    if (!form) return;
    st.__st2 = true;
    st.classList.add('studio-v2');

    Array.prototype.forEach.call(form.querySelectorAll('.tab-panel'), function (panel) {
      var sections = Array.prototype.filter.call(panel.children, function (c) { return c.tagName === 'FIELDSET'; });
      sections.forEach(function (f) {
        var lg = f.querySelector(':scope > legend');
        if (!lg) return;
        f.__st2name = label(lg);
        f.classList.add('st2-acc');
        lg.setAttribute('role', 'button');
        lg.tabIndex = 0;
        if (f.querySelector(':scope > p.hint:not(.media-status)')) {
          var info = document.createElement('button');
          info.type = 'button'; info.className = 'st2-info';
          info.setAttribute('aria-label', 'Show tips for this section');
          info.innerHTML = '<i class="fa-solid fa-circle-info" aria-hidden="true"></i>';
          lg.appendChild(info);
        }
        var chev = document.createElement('i');
        chev.className = 'fa-solid fa-chevron-down st2-chev'; chev.setAttribute('aria-hidden', 'true');
        lg.appendChild(chev);
        setOpen(f, startsOpen(f, f.__st2name), false);
      });
      if (sections.length > 2) {
        var tools = document.createElement('div');
        tools.className = 'st2-tools';
        tools.innerHTML = '<button type="button" data-st2="open">Expand all</button><button type="button" data-st2="close">Collapse all</button>';
        panel.insertBefore(tools, panel.firstChild);
      }
    });

    var act = st.querySelector('.linkbar-actions');
    if (act && !act.querySelector('.st2-badge')) {
      var badge = document.createElement('span');
      badge.className = 'st2-badge'; badge.textContent = 'New layout';
      act.insertBefore(badge, act.firstChild);
      var classic = document.createElement('a');   // plain link on purpose: a full page load opens the classic Studio
      classic.className = 'btn btn-sm'; classic.href = '/studio';
      classic.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> Classic';
      act.appendChild(classic);
    }

    st.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var info = t.closest('.st2-info');
      if (info) {
        e.preventDefault();
        var fi = info.closest('fieldset');
        if (fi) { fi.classList.toggle('st2-hints'); info.setAttribute('aria-pressed', String(fi.classList.contains('st2-hints'))); }
        return;
      }
      var lg = t.closest('fieldset.st2-acc > legend');
      if (lg) { var f = lg.parentNode; setOpen(f, !f.classList.contains('st2-open'), true); return; }
      var b = t.closest('[data-st2]');
      if (b) {
        var on = b.getAttribute('data-st2') === 'open';
        var panel = b.closest('.tab-panel');
        if (panel) Array.prototype.forEach.call(panel.querySelectorAll('fieldset.st2-acc'), function (f2) { setOpen(f2, on, true); });
      }
    });
    st.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('fieldset.st2-acc > legend')) {
        e.preventDefault(); e.target.click();
      }
    });

    fixUrl();
    setGuard();
    setTimeout(setGuard, 400);
    setTimeout(setGuard, 1500);
  }

  function scan(root) {
    var s = root.querySelector ? root.querySelector('.studio') : null;
    if (s) enhance(s);
  }
  new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      for (var j = 0; j < list[i].addedNodes.length; j++) {
        var n = list[i].addedNodes[j];
        if (n.nodeType !== 1) continue;
        if (n.classList && n.classList.contains('studio')) enhance(n); else scan(n);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  scan(document);
})();
