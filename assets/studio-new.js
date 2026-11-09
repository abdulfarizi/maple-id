/* M-ID · Studio (new layout) — organizing layer, loaded only by /studio-new.
 * The Studio itself (fields, saving, music, frames, builder) is the existing one and is not touched.
 * This reshapes what it rendered: the sections are moved into the new groups, collapsible sections, tips behind an info button, expand/collapse all.
 * The address bar is left alone: the app routes on /studio, so rewriting the URL here sent people back to the home page. */
(function () {
  'use strict';
  var KEY = 'st2:open';
  // sections that start open; everything else starts collapsed (a click opens it)
  var DEFAULT_OPEN = ['identity', 'photos', 'socials', 'game ids', 'card layout', 'theme', 'sounds', 'card features', 'seller shop', 'support', 'bottom music player'];
  var saved = {};
  try { var s0 = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (s0 && typeof s0 === 'object') saved = s0; } catch (e) {}

  // New groups. "take" lists the section names (lowercase, as shown in the legend) that go in each group.
  var GROUPS = [
    { key: 'profile', label: 'Profile', icon: 'fa-regular fa-user',
      take: ['identity', 'photos', 'contact', 'community', 'online hours', 'gear'] },
    { key: 'links', label: 'Links & Donations', icon: 'fa-solid fa-link',
      take: ['socials & channels', 'game ids', 'support & donations'] },
    { key: 'look', label: 'Look & Theme', icon: 'fa-solid fa-palette',
      take: ['card layout', 'qr code symbol', 'card frame', 'theme', 'star look', 'glass slides background', 'free canvas', 'card features'] },
    { key: 'media', label: 'Music & Sounds', icon: 'fa-solid fa-compact-disc',
      take: ['sounds', 'bottom music player', 'music i like', 'anime'] },
    { key: 'extras', label: 'Extras', icon: 'fa-solid fa-wand-magic-sparkles',
      take: ['visitor controls'] },
    { key: 'shop', label: 'Shop & Payments', icon: 'fa-solid fa-bag-shopping',
      take: ['seller shop'] }
  ];

  // Card-details fields that live inside Star look but belong to the Profile section
  var PROFILE_FIELDS = ['cardTag', 'statusText', 'statusMode', 'footerText', 'avatarShape', 'bannerGray', 'bannerDim', 'specsText'];

  document.documentElement.classList.add('studio-new');

  function label(legend) {
    if (!legend) return '';
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

  // The app's own unsaved-changes warning only fires on /studio, so repeat it for this address.
  function setGuard() {
    window.onbeforeunload = function () { return (window.dgStudioDirty && window.dgStudioDirty()) ? true : null; };
  }

  // Move every section into its new group, rebuild the tab bar, and drop the old tabs.
  function regroup(form) {
    if (form.__regrouped) return;
    form.__regrouped = true;

    var oldPanels = Array.prototype.slice.call(form.querySelectorAll(':scope > .tab-panel'));
    if (!oldPanels.length) return;
    var fieldsets = [];
    oldPanels.forEach(function (p) {
      Array.prototype.forEach.call(p.children, function (c) { if (c.tagName === 'FIELDSET') fieldsets.push(c); });
    });
    var hints = {};
    oldPanels.forEach(function (p) {
      Array.prototype.forEach.call(p.children, function (c) {
        if (c.tagName === 'P' && c.classList.contains('panel-hint')) hints[p.dataset.panel] = c;
      });
    });
    var notes = [];
    oldPanels.forEach(function (p) {
      Array.prototype.forEach.call(p.children, function (c) { if (c.classList && c.classList.contains('note-card')) notes.push(c); });
    });

    var byKey = {};
    GROUPS.forEach(function (g) { byKey[g.key] = []; });
    fieldsets.forEach(function (f) {
      var name = label(f.querySelector(':scope > legend'));
      var g = GROUPS.filter(function (x) { return x.take.indexOf(name) !== -1; })[0];
      if (!g) { console.warn('[studio-new] section not in any group, kept in Profile:', name); g = GROUPS[0]; }
      byKey[g.key].push(f);
    });

    // Card details: the Star look fields that describe the card itself move into a Profile section.
    // The new section keeps the same Star-only visibility, so it still appears only on the Star layout.
    var starLook = byKey.look.filter(function (f) { return label(f.querySelector(':scope > legend')) === 'star look'; })[0];
    if (starLook) {
      var details = document.createElement('fieldset');
      details.setAttribute('data-star-only', '');
      details.hidden = starLook.hidden;
      details.innerHTML = '<legend>Card details</legend>';
      PROFILE_FIELDS.forEach(function (n) {
        var input = starLook.querySelector('[name="' + n + '"]');
        var field = input && input.closest('.field');
        if (field) details.appendChild(field);
      });
      if (details.querySelector('.field')) byKey.profile.push(details);
    }

    var anchor = form.querySelector('.savebar');
    GROUPS.forEach(function (g) {
      var panel = document.createElement('div');
      panel.className = 'tab-panel';
      panel.setAttribute('data-panel', g.key);
      panel.hidden = true;
      if (hints[g.key]) panel.appendChild(hints[g.key]);
      if (g.key === 'look') notes.forEach(function (n) { panel.appendChild(n); });
      byKey[g.key].forEach(function (f) { panel.appendChild(f); });
      form.insertBefore(panel, anchor);
    });
    oldPanels.forEach(function (p) { p.remove(); });

    var nav = form.querySelector('nav.tabs');
    if (nav) {
      nav.innerHTML = GROUPS.map(function (g) {
        return '<button type="button" role="tab" class="tab" data-tab="' + g.key + '"><i class="' + g.icon + '"></i> ' + g.label + '</button>';
      }).join('');
    }

    // show the last tab the person used if it still exists, otherwise Profile
    var start = 'profile';
    try { var t = sessionStorage.getItem('dg-tab'); if (t && GROUPS.some(function (g) { return g.key === t; })) start = t; } catch (e) {}
    if (typeof form.__tab === 'function') form.__tab(start);
  }

  function enhance(st) {
    if (st.__st2) return;
    var form = st.querySelector('#editor');
    if (!form) return;
    st.__st2 = true;
    st.classList.add('studio-v2');

    regroup(form);

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
