/* M-ID · site header + slide-out menu.
 *
 * The header stays clean: [☰ menu] [brand]  ……  [private messages] [Studio] [light/dark].
 * Every other link lives in the slide-out menu that opens from the hamburger.
 *
 * It reads what the app already renders into #nav-actions (Studio link = signed in, "My card" link, the
 * Log in / Get your ID buttons) and builds the controls around it, so the app code itself is untouched.
 * The unread counts come from the forum (maple:forum events). */
(function () {
  'use strict';
  var S = { in: false, card: '', dm: 0, unread: 0, mod: false };
  var tb, end, burger, pm, drawer, scrim, lastFocus = null, isOpen = false;

  var ICON_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h10"/></g></svg>';
  var ICON_MAIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m4.5 8 7.5 5.2L19.5 8"/></g></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></g></svg>';

  function h(tag, attrs, html) {
    var e = document.createElement(tag), k;
    for (k in (attrs || {})) { if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]); }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ───── read the app's header state ───── */
  function readNav() {
    var a = document.getElementById('nav-actions'); if (!a) return;
    S.in = !!a.querySelector('a[href="/studio"]');
    var mc = a.querySelector('a.nav-link[data-link]:not([href="/maple"])');
    S.card = mc ? mc.getAttribute('href') : '';
  }

  /* ───── header ───── */
  function ensureEnd() {
    tb = document.querySelector('.topbar'); if (!tb) return false;
    end = tb.querySelector('.tb-end');
    if (!end) { end = h('div', { class: 'tb-end' }); tb.appendChild(end); var acts = document.getElementById('nav-actions'); if (acts) end.appendChild(acts); }
    return true;
  }
  function buildHeader() {
    if (!ensureEnd()) return;
    if (!burger || !burger.isConnected) {
      burger = h('button', { type: 'button', id: 'sh-burger', class: 'sh-burger', 'aria-label': 'Open menu', 'aria-expanded': 'false', 'aria-controls': 'sh-drawer' }, ICON_MENU + '<i class="sh-pip" hidden></i>');
      burger.addEventListener('click', function () { isOpen ? closeDrawer() : openDrawer(); });
      tb.insertBefore(burger, tb.firstChild);
    }
    if (S.in) {
      if (!pm || !pm.isConnected) {
        pm = h('button', { type: 'button', id: 'pm-btn', class: 'pm-btn', 'aria-label': 'Private messages', title: 'Messages' }, ICON_MAIL + '<b class="pm-badge" hidden></b>');
        pm.addEventListener('click', function () { openForum('inbox'); });
        end.insertBefore(pm, end.firstChild);
      }
    } else if (pm) { pm.remove(); pm = null; }
    paintBadges();
  }
  /* On the homepage there is one header icon: Messages carries the alerts count too, and the bell is hidden. */
  function onHome() { var p = document.body.dataset.page; return !p || p === 'home'; }
  function paintBadges() {
    if (pm) {
      var b = pm.querySelector('.pm-badge'), n = S.dm + (onHome() ? S.unread : 0);
      b.hidden = !(n > 0); b.textContent = n > 9 ? '9+' : String(n);
      pm.setAttribute('aria-label', n > 0 ? 'Private messages, ' + n + ' unread' : 'Private messages');
    }
    if (burger) { var pip = burger.querySelector('.sh-pip'); pip.hidden = !(S.in && S.unread > 0); }
    if (drawer) {
      var ab = drawer.querySelector('[data-badge="alerts"]'); if (ab) { ab.hidden = !(S.unread > 0); ab.textContent = S.unread > 99 ? '99+' : String(S.unread); }
    }
  }

  /* ───── drawer ───── */
  function here() {
    var p = location.pathname.replace(/\/+$/, '') || '/';
    return { path: p, hash: location.hash };
  }
  function curMode() { return window.mapleMode ? window.mapleMode.get() : 'dark'; }
  function modeLabel() { return curMode() === 'dark' ? 'Light mode' : 'Dark mode'; }
  function modeIcon() { return curMode() === 'dark' ? 'fa-sun' : 'fa-moon'; }
  function paintMode() {
    var b = drawer && drawer.querySelector('[data-act="mode"]'); if (!b) return;
    b.querySelector('i').className = 'fa-solid ' + modeIcon(); b.querySelector('span').textContent = modeLabel();
  }
  window.addEventListener('maple:modepaint', paintMode);
  function entries() {
    var L = [], n = here(), forum = window.dgForum && S.in;
    L.push({ sec: 'Browse' });
    L.push({ t: S.in ? 'Feed' : 'Home', i: 'fa-house', href: '/', on: n.path === '/' && n.hash !== '#explore' });
    L.push({ t: 'Explore', i: 'fa-compass', href: '/#explore', on: n.path === '/' && n.hash === '#explore' });
    if (S.in) {
      L.push({ sec: 'You' });
      if (S.card) L.push({ t: 'My card', i: 'fa-id-card', href: S.card, on: n.path === S.card });
      L.push({ t: 'Profile', i: 'fa-user', href: '/profile', on: n.path === '/profile' });
      L.push({ t: 'Studio', i: 'fa-pen-ruler', href: '/studio', on: n.path === '/studio' });
      if (forum) {
        L.push({ t: 'Alerts', i: 'fa-bell', act: 'alerts', badge: 'alerts' });
        if (S.mod) { L.push({ t: 'Reports', i: 'fa-flag', act: 'reports' }); L.push({ t: 'Badges', i: 'fa-circle-check', act: 'badges' }); }   // owner only
      }
    }
    L.push({ sec: 'More' });
    L.push({ t: modeLabel(), i: modeIcon(), act: 'mode', id: 'mode' });
    L.push({ t: 'Owner', i: 'fa-crown', href: '/maple', on: n.path === '/maple' });
    return L;
  }
  function renderDrawer() {
    if (!drawer) return;
    var nav = drawer.querySelector('.sh-nav'), foot = drawer.querySelector('.sh-foot');
    nav.innerHTML = entries().map(function (e) {
      if (e.sec) return '<p class="sh-sec">' + esc(e.sec) + '</p>';
      var inner = '<i class="fa-solid ' + e.i + '" aria-hidden="true"></i><span>' + esc(e.t) + '</span>' + (e.badge ? '<b class="sh-badge" data-badge="' + e.badge + '" hidden></b>' : '');
      return e.href
        ? '<a class="sh-item' + (e.on ? ' on' : '') + '" href="' + esc(e.href) + '" data-link' + (e.on ? ' aria-current="page"' : '') + '>' + inner + '</a>'
        : '<button type="button" class="sh-item" data-act="' + e.act + '">' + inner + '</button>';
    }).join('');
    foot.innerHTML = S.in
      ? '<button type="button" class="sh-item sh-out" data-act="logout"><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i><span>Log out</span></button>'
      : '<button type="button" class="btn btn-sm wide" data-act="login">Log in</button><button type="button" class="btn btn-sm btn-accent wide" data-act="signup">Get your ID</button>';
    paintBadges();
  }

  /* ───── owner-only badge manager: pick any profile and give or take the tick (verified) and crown (special honor) ───── */
  var bdEl = null;
  function badgeDialog() {
    if (!S.mod) return;
    if (bdEl) bdEl.remove();
    var cur = null;
    bdEl = h('div', { class: 'sh-bd', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Manage badges' },
      '<div class="sh-bd-card"><div class="sh-bd-h"><b>Badges</b><button type="button" class="sh-x" data-x aria-label="Close">' + ICON_X + '</button></div>'
      + '<p class="sh-bd-p">Give a <b>tick</b> (verified), a <b>crown</b> (special honor) or a <b>music artist</b> badge to any profile. Only you, the owner, can see this.</p>'
      + '<form class="sh-bd-f"><input name="slug" placeholder="Profile name, e.g. maple" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Profile name" maxlength="30"><button class="btn btn-sm btn-accent" type="submit">Find</button></form>'
      + '<p class="sh-bd-m" data-m></p><div class="sh-bd-t" data-t hidden>'
      + '<button type="button" data-k="verified" aria-pressed="false"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Verified tick</button>'
      + '<button type="button" data-k="crown" aria-pressed="false"><i class="fa-solid fa-crown" aria-hidden="true"></i> Crown</button>'
      + '<button type="button" data-k="musicArtist" aria-pressed="false"><i class="fa-solid fa-music" aria-hidden="true"></i> Music artist</button></div></div>');
    document.body.appendChild(bdEl);
    var f = bdEl.querySelector('form'), m = bdEl.querySelector('[data-m]'), t = bdEl.querySelector('[data-t]');
    function paint() { t.querySelectorAll('[data-k]').forEach(function (b) { b.setAttribute('aria-pressed', String(!!(cur && cur.b[b.dataset.k]))); }); }
    function say(x) { m.textContent = x || ''; }
    function close() { if (bdEl) { bdEl.remove(); bdEl = null; } document.removeEventListener('keydown', esc2); }
    function esc2(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', esc2);
    bdEl.addEventListener('click', function (e) { if (e.target === bdEl || e.target.closest('[data-x]')) close(); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var slug = f.elements.slug.value.trim().toLowerCase().replace(/^@/, '');
      if (!/^[a-z0-9-]{1,30}$/.test(slug)) { say('Type the profile name (letters, numbers, dashes).'); return; }
      say('Looking…'); t.hidden = true; cur = null;
      fetch('/api/profiles/' + encodeURIComponent(slug) + '?preview=1').then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (r) {
          if (!r.ok) { say('No profile called "' + slug + '".'); return; }
          cur = { slug: slug, b: r.d.badges || {} }; say((r.d.name || slug) + '  ·  /' + slug); t.hidden = false; paint();
        }, function () { say('Could not reach the server.'); });
    });
    t.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k]'); if (!b || !cur) return;
      var next = { verified: !!cur.b.verified, crown: !!cur.b.crown, musicArtist: !!cur.b.musicArtist }; next[b.dataset.k] = !next[b.dataset.k];
      b.disabled = true;
      fetch('/api/badges/' + encodeURIComponent(cur.slug), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (r) { b.disabled = false; if (!r.ok) { say(r.d.error || 'Could not save.'); return; } cur.b = { verified: !!r.d.verified, crown: !!r.d.crown, musicArtist: !!r.d.musicArtist }; paint(); say('Saved.'); }, function () { b.disabled = false; say('Could not reach the server.'); });
    });
    setTimeout(function () { f.elements.slug.focus(); }, 30);
  }

  function buildDrawer() {
    if (drawer) return;
    scrim = h('div', { id: 'sh-scrim', class: 'sh-scrim', 'aria-hidden': 'true' });
    drawer = h('aside', { id: 'sh-drawer', class: 'sh-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu', 'aria-hidden': 'true' },
      '<div class="sh-head"><a href="/" data-link class="brand sh-brand" aria-label="M-ID home"><img class="leaf-ico leaf-img" src="/icon-192.png?v=2" alt="" aria-hidden="true" width="38" height="38"/><span class="brand-lockup"><span class="brand-word">M<span class="brand-hyphen">-</span>ID</span><span class="brand-caption">YOUR DIGITAL ID</span></span></a>'
      + '<button type="button" class="sh-x" aria-label="Close menu">' + ICON_X + '</button></div>'
      + '<nav class="sh-nav" aria-label="Main"></nav><div class="sh-foot"></div>');
    drawer.inert = true;
    document.body.appendChild(scrim); document.body.appendChild(drawer);
    scrim.addEventListener('click', closeDrawer);
    drawer.querySelector('.sh-x').addEventListener('click', closeDrawer);
    drawer.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-link]'), b = e.target.closest('[data-act]');
      if (a) { closeDrawer(true); return; }                       // the app's router handles the link
      if (!b) return;
      var act = b.dataset.act;
      if (act === 'mode') { var r = b.getBoundingClientRect(); window.mapleMode && window.mapleMode.toggle({ x: r.left + 34, y: r.top + r.height / 2 }); return; }   // stays open: the circle grows from the row
      closeDrawer(true);
      if (act === 'badges') { badgeDialog(); return; }
      if (act === 'alerts' || act === 'reports') openForum(act);
      else if (act === 'logout') { if (window.dgLogout) window.dgLogout(); }
      else if (act === 'login' || act === 'signup') { var t = document.querySelector('#nav-actions [data-auth="' + act + '"]'); if (t) t.click(); }
    });
    drawer.addEventListener('keydown', function (e) {           // keep Tab inside while open
      if (e.key !== 'Tab') return;
      var f = drawer.querySelectorAll('a[href],button:not([disabled])'); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    /* swipe left to close */
    var sx = 0, sy = 0, dx = 0, drag = false;
    drawer.addEventListener('touchstart', function (e) { var t = e.touches[0]; sx = t.clientX; sy = t.clientY; dx = 0; drag = true; drawer.classList.add('dragging'); }, { passive: true });
    drawer.addEventListener('touchmove', function (e) {
      if (!drag) return; var t = e.touches[0]; dx = t.clientX - sx;
      if (Math.abs(t.clientY - sy) > Math.abs(dx)) return;
      if (dx < 0) drawer.style.transform = 'translate3d(' + dx + 'px,0,0)';
    }, { passive: true });
    drawer.addEventListener('touchend', function () {
      drag = false; drawer.classList.remove('dragging'); drawer.style.transform = '';
      if (dx < -70) closeDrawer();
    });
  }
  function openDrawer() {
    if (isOpen) return; buildDrawer(); renderDrawer();
    isOpen = true; lastFocus = document.activeElement;
    drawer.inert = false; drawer.setAttribute('aria-hidden', 'false'); scrim.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('sh-open');
    if (burger) burger.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(function () { drawer.classList.add('open'); scrim.classList.add('open'); });
    setTimeout(function () { var f = drawer.querySelector('.sh-item.on') || drawer.querySelector('.sh-item'); if (f && isOpen) f.focus({ preventScroll: true }); }, 60);
  }
  function closeDrawer(keepFocus) {
    if (!isOpen) return; isOpen = false;
    drawer.classList.remove('open'); scrim.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true'); scrim.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('sh-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    var d = drawer; setTimeout(function () { if (!isOpen) d.inert = true; }, 320);
    if (keepFocus !== true && lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) { e.preventDefault(); closeDrawer(); } });
  window.addEventListener('popstate', function () { closeDrawer(true); });

  /* ───── private messages / alerts / reports live in the forum ───── */
  function openForum(view) {
    closeDrawer(true);
    if (window.dgForum && window.dgForum.open) window.dgForum.open(view);
    else if (window.dgNavigate) window.dgNavigate('/');
    else location.href = '/?pm=1';
  }
  window.mapleShell = { openMessages: function () { openForum('inbox'); }, open: openDrawer, close: closeDrawer };

  /* the owner card (an iframe) asks for the inbox */
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.maple === 'pm') openForum('inbox');
  });
  /* /?pm=1 opens the inbox straight away (used when the card is opened on its own page) */
  function deepLink() {
    if (!/[?&]pm=1\b/.test(location.search)) return;
    try { history.replaceState(history.state, '', location.pathname + location.hash); } catch (e) {}
    var tries = 0, t = setInterval(function () {
      if (window.dgForum && window.dgForum.open && S.in) { clearInterval(t); window.dgForum.open('inbox'); }
      else if (++tries > 60) clearInterval(t);
    }, 150);
  }

  window.addEventListener('maple:forum', function (e) {
    var d = e.detail || {}; S.dm = d.dm || 0; S.unread = d.unread || 0;
    var modChanged = !!d.mod !== S.mod; S.mod = !!d.mod;
    paintBadges(); if (modChanged && isOpen) renderDrawer();
  });

  /* ───── keep in step with the app's header ───── */
  var raf = 0;
  function sync() { raf = 0; readNav(); buildHeader(); if (isOpen) renderDrawer(); }
  function queue() { if (!raf) raf = requestAnimationFrame(sync); }
  function boot() {
    if (window.__forumBadges) { S.dm = window.__forumBadges.dm || 0; S.unread = window.__forumBadges.unread || 0; S.mod = !!window.__forumBadges.mod; }
    sync();
    var a = document.getElementById('nav-actions');
    if (a && window.MutationObserver) new MutationObserver(queue).observe(a, { childList: true });
    var t = document.querySelector('.topbar');
    if (t && window.MutationObserver) new MutationObserver(function () { if (!burger || !burger.isConnected) queue(); }).observe(t, { childList: true });
    window.addEventListener('popstate', queue);
    deepLink();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
