/* M-ID · Studio (new layout) — organizing layer, loaded only by /studio-new.
 * The Studio itself (fields, saving, music, frames, builder) is the existing one and is not touched.
 * This reshapes what it rendered: the sections are moved into the new groups in a fixed order,
 * collapsible sections, tips behind an info button, expand/collapse all, and the badge display option (Extras).
 * The address bar is left alone: the app routes on /studio, so rewriting the URL here sent people back to the home page. */
(function () {
  'use strict';
  var KEY = 'st2:open';
  // sections that start open; everything else starts collapsed (a click opens it)
  var DEFAULT_OPEN = ['identity', 'photos', 'card details', 'socials', 'game ids', 'card layout', 'theme', 'sounds', 'card features', 'seller shop', 'support', 'bottom music player', 'badge display'];
  var saved = {};
  try { var s0 = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (s0 && typeof s0 === 'object') saved = s0; } catch (e) {}

  // New groups, in the order they appear on the page. "take" lists the sections in the order they show inside each group.
  // Section names are lowercase, as shown in the legend.
  var GROUPS = [
    { key: 'profile', label: 'Profile', icon: 'fa-regular fa-user',
      take: ['identity', 'photos', 'card details', 'gear', 'online hours', 'contact', 'community'] },
    { key: 'links', label: 'Links & Donations', icon: 'fa-solid fa-link',
      take: ['socials & channels', 'game ids', 'support & donations'] },
    { key: 'look', label: 'Look & Theme', icon: 'fa-solid fa-palette',
      take: ['card layout', 'qr code symbol', 'theme', 'card frame', 'glass slides background', 'free canvas', 'star look', 'card features'] },
    { key: 'media', label: 'Music & Sounds', icon: 'fa-solid fa-compact-disc',
      take: ['bottom music player', 'music i like', 'anime', 'sounds'] },
    { key: 'extras', label: 'Extras', icon: 'fa-solid fa-wand-magic-sparkles',
      take: ['visitor controls', 'badge display'] },
    { key: 'shop', label: 'Shop & Payments', icon: 'fa-solid fa-bag-shopping',
      take: ['seller shop'] }
  ];

  // Card-details fields that live inside Star look but belong to the Profile section
  var PROFILE_FIELDS = ['cardTag', 'statusText', 'statusMode', 'footerText', 'avatarShape', 'bannerGray', 'bannerDim', 'specsText'];

  var BADGE_SPEED_DEFAULT = 2.6;

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

  // ----- Badge display (Extras): all at once, or one by one with a timing slider -----
  function makeBadgeSection() {
    var f = document.createElement('fieldset');
    f.setAttribute('data-badge-display', '');
    f.innerHTML =
      '<legend>Badge display</legend>' +
      '<p class="hint">When someone has more than one badge (tick, seller, crown, music artist), choose how they show on your card.</p>' +
      '<div class="field"><label>Show the badges</label>' +
        '<label class="toggle"><input type="radio" name="badgeMode" value="all" checked><span>All at once, side by side</span></label>' +
        '<label class="toggle"><input type="radio" name="badgeMode" value="cycle"><span>One by one, taking turns in one spot</span></label>' +
      '</div>' +
      '<div class="field"><label>Time between badges <small data-badge-speed-out>' + BADGE_SPEED_DEFAULT + ' s</small></label>' +
        '<input type="range" name="badgeSpeed" min="1" max="8" step="0.5" value="' + BADGE_SPEED_DEFAULT + '" aria-label="Seconds between badges">' +
      '</div>';
    var slider = f.querySelector('input[name=badgeSpeed]');
    var out = f.querySelector('[data-badge-speed-out]');
    slider.addEventListener('input', function () { out.textContent = Number(slider.value) + ' s'; });
    return f;
  }

  // read the two values from the Studio form (null if the Studio isn't on screen)
  function readBadgeValues() {
    var form = document.getElementById('editor');
    if (!form) return null;
    var mode = form.querySelector('input[name=badgeMode]:checked');
    var speed = form.querySelector('input[name=badgeSpeed]');
    if (!mode || !speed) return null;
    return { mode: mode.value === 'cycle' ? 'cycle' : 'all', speed: Math.min(8, Math.max(1, Number(speed.value) || BADGE_SPEED_DEFAULT)) };
  }

  // when the Studio saves the profile, add the two badge settings to the same save
  var origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : ((input && input.url) || '');
      var method = String((init && init.method) || 'GET').toUpperCase();
      if (method === 'PUT' && /\/api\/me(\?|$)/.test(url) && init && typeof init.body === 'string') {
        var vals = readBadgeValues();
        if (vals) {
          var body = JSON.parse(init.body);
          body.badgeMode = vals.mode;
          body.badgeSpeed = vals.speed;
          init = Object.assign({}, init, { body: JSON.stringify(body) });
        }
      }
    } catch (e) {}
    return origFetch.call(this, input, init);
  };

  // show the saved choice when the Studio opens
  function loadBadgeValues(form) {
    origFetch('/api/me').then(function (r) { return r.json(); }).then(function (d) {
      var p = d && d.profile;
      if (!p) return;
      var mode = form.querySelector('input[name=badgeMode][value="' + (p.badgeMode === 'cycle' ? 'cycle' : 'all') + '"]');
      if (mode) mode.checked = true;
      var speed = form.querySelector('input[name=badgeSpeed]');
      if (speed && p.badgeSpeed) {
        speed.value = Math.min(8, Math.max(1, Number(p.badgeSpeed) || BADGE_SPEED_DEFAULT));
        var out = form.querySelector('[data-badge-speed-out]');
        if (out) out.textContent = Number(speed.value) + ' s';
      }
    }).catch(function () {});
  }

  // Move every section into its new group in the order set above, rebuild the tab bar, and drop the old tabs.
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

    // Card details: the Star look fields that describe the card itself become their own section (Profile)
    var named = {};
    fieldsets.forEach(function (f) {
      var name = label(f.querySelector(':scope > legend'));
      (named[name] = named[name] || []).push(f);
    });
    var starLook = (named['star look'] || [])[0];
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
      if (details.querySelector('.field')) named['card details'] = [details];
    }

    // Badge display goes in Extras
    named['badge display'] = [makeBadgeSection()];

    // Place every section in its group, in the order listed in GROUPS
    var byKey = {};
    GROUPS.forEach(function (g) {
      byKey[g.key] = [];
      g.take.forEach(function (name) {
        (named[name] || []).forEach(function (f) {
          if (f.__placed) return;
          f.__placed = true;
          byKey[g.key].push(f);
        });
      });
    });
    // anything not listed keeps its place in Profile
    fieldsets.forEach(function (f) {
      if (f.__placed) return;
      console.warn('[studio-new] section not in any group, kept in Profile:', label(f.querySelector(':scope > legend')));
      f.__placed = true;
      byKey.profile.push(f);
    });

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

    loadBadgeValues(form);
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
