/* M-ID \u00b7 Forum: the home page for signed-in members.
   The page itself is just the Feed. Private messages, alerts and reports open from the header button and the
   side menu (maple-shell.js) through dgForum.open(view); each of those screens has a \u201cFeed\u201d button to come back. */
(function () {
  'use strict';
  var CATS = [['all', 'All'], ['general', 'General'], ['gaming', 'Gaming'], ['showcase', 'Showcase'], ['help', 'Help']];
  var CAT_NAME = { general: 'General', gaming: 'Gaming', showcase: 'Showcase', help: 'Help' };
  var S = { view: 'feed', cat: 'all', sort: 'new', q: '', posts: [], pinned: [], more: false, mod: false, busy: false, err: '', dm: 0, unread: 0, off: false };
  var sec = null, viewEl = null, listEl = null, moreEl = null, statEl = null, st = null, poll = null, threadTimer = null;

  function h(tag, a, kids) {
    var e = document.createElement(tag), k;
    for (k in (a || {})) {
      if (k === 'text') e.textContent = a[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), a[k]);
      else if (a[k] !== false && a[k] != null) e.setAttribute(k, a[k]);
    }
    [].concat(kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function api(path, opt) {
    opt = opt || {}; if (opt.body && typeof opt.body !== 'string') { opt.headers = { 'Content-Type': 'application/json' }; opt.body = JSON.stringify(opt.body); }
    return fetch('/api/forum/' + path, opt).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .catch(function () { return { ok: false, j: { error: 'No connection. Check your internet and try again.' } }; });
  }
  function ago(iso) {
    var s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return 'just now'; var m = Math.round(s / 60); if (m < 60) return m + ' min ago';
    var hr = Math.round(m / 60); if (hr < 24) return hr + ' h ago'; var d = Math.round(hr / 24); if (d < 30) return d + ' d ago';
    return new Date(iso).toLocaleDateString();
  }
  function hue(s) { var n = 0, i; for (i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 360; return n; }
  function okSlug(v) { return /^[a-z0-9_-]{1,40}$/i.test(v || ''); }
  /* Profile pictures: the feed only carries names and slugs, so pictures are fetched once per person
     (/api/forum/avatars), shrunk to a 96px thumbnail and remembered for 6 hours. Letter circle until it arrives. */
  var AV_KEY = 'maple-av-v1', AV_TTL = 6 * 3600 * 1000, AV = {}, AVQ = {}, avTimer = 0;
  try { AV = JSON.parse(localStorage.getItem(AV_KEY) || '{}') || {}; } catch (e) { AV = {}; }
  function avSave() {
    try {
      var keys = Object.keys(AV); if (keys.length > 80) { keys.sort(function (a, b) { return AV[a].t - AV[b].t; }).slice(0, keys.length - 80).forEach(function (k) { delete AV[k]; }); }
      localStorage.setItem(AV_KEY, JSON.stringify(AV));
    } catch (e) {}
  }
  function paintAv(el, u) {
    if (!u || el.querySelector('img')) return;
    var im = document.createElement('img'); im.alt = ''; im.decoding = 'async'; im.draggable = false;
    im.onload = function () { el.textContent = ''; el.appendChild(im); }; im.onerror = function () { /* keep the letter */ }; im.src = u;
  }
  function paintAll(slug) {
    var c = AV[slug]; if (!c || !c.u) return;
    [].forEach.call(document.querySelectorAll('.fm-av[data-av="' + slug + '"]'), function (el) { paintAv(el, c.u); });
  }
  function thumb(src) {
    return new Promise(function (res) {
      if (/^https?:/i.test(src)) return res(src);                       // remote picture: use as is (a canvas would be tainted)
      var im = new Image();
      im.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = c.height = 96; var x = c.getContext('2d'), m = Math.min(im.width, im.height);
          x.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, 96, 96); res(c.toDataURL('image/jpeg', 0.82));
        } catch (e) { res(src.length < 30000 ? src : ''); }
      };
      im.onerror = function () { res(''); }; im.src = src;
    });
  }
  function avFlush() {
    var list = Object.keys(AVQ).slice(0, 12); if (!list.length) return;
    list.forEach(function (k) { delete AVQ[k]; });
    api('avatars?slugs=' + list.join(',')).then(function (r) {
      var map = (r.ok && r.j && r.j.avatars) || {};
      return Promise.all(list.map(function (s) {
        return (map[s] ? thumb(map[s]) : Promise.resolve('')).then(function (u) { AV[s] = { u: u, t: Date.now() }; paintAll(s); });
      }));
    }).then(function () { avSave(); if (Object.keys(AVQ).length) avFlush(); });
  }
  function avatar(name, slug) {
    name = name || 'Member';
    var el = h('span', { class: 'fm-av', 'aria-hidden': 'true', text: (Array.from(name)[0] || 'M').toUpperCase(), style: 'background:hsl(' + hue(name) + ' 55% 38%)' });
    var k = okSlug(slug) ? String(slug).toLowerCase() : '';
    if (k) {
      el.setAttribute('data-av', k);
      var c = AV[k];
      if (c && c.u) paintAv(el, c.u);
      else if (!c || Date.now() - c.t > AV_TTL) { AVQ[k] = 1; clearTimeout(avTimer); avTimer = setTimeout(avFlush, 50); }
    }
    return el;
  }
  function badgeEl(p) { var s = h('span', { class: 'fm-badges' }); s.innerHTML = window.dgBadgeHTML ? window.dgBadgeHTML(p.badges) : ''; return s; }
  function who(p) {
    var name = p.name || 'Member';
    var nm = okSlug(p.slug) ? h('a', { class: 'fm-name', href: '/' + p.slug, 'data-link': '', text: name }) : h('span', { class: 'fm-name', text: name });
    return [avatar(name, p.slug), h('span', { class: 'fm-namewrap' }, [nm, badgeEl(p)])];
  }
  function btn(text, cls, fn, extra) { var b = h('button', Object.assign({ type: 'button', class: 'fm-btn' + (cls ? ' ' + cls : ''), text: text }, extra || {})); if (fn) b.addEventListener('click', fn); return b; }
  function css() {
    if (st) return; st = document.createElement('style');
    st.textContent = '.fm{max-width:680px;margin:0 auto;padding:clamp(14px,3vw,26px) 14px 120px;color:var(--text,#ededf0)}'
      + '.fm *{box-sizing:border-box}'
      + '.fm-top{display:flex;align-items:baseline;gap:10px;margin:2px 2px 14px}.fm-top h1{margin:0;font-size:clamp(26px,6vw,34px);line-height:1.1}.fm-top span{color:var(--muted,#9a9aa6);font-size:13px}'
      + '.fm h2{margin:0;font-size:22px}.fm-eyebrow{font:500 11px var(--mono,monospace);letter-spacing:.16em;text-transform:uppercase;color:var(--accent,#ff7a1a);margin:0 0 6px}'
      + '.fm-bar{display:flex;align-items:center;gap:10px;margin:2px 0 14px}.fm-bar .fm-back{flex:none}'
      + '.fm-card{background:var(--panel,#ffffff0a);border:1px solid var(--line,#ffffff1f);border-radius:20px;padding:14px;margin-bottom:12px}.fm-card.pin{border-color:var(--accent,#ff7a1a)}'
      + '.fm-start{display:flex;align-items:center;gap:12px;width:100%;text-align:left;font:inherit;color:var(--muted,#9a9aa6);background:var(--panel,#ffffff0a);border:1px solid var(--line,#ffffff33);border-radius:20px;padding:10px 10px 10px 16px;cursor:pointer;margin-bottom:12px}'
      + '.fm-start span{flex:1}.fm-start b{flex:none;font:600 12px var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--on-accent,#fff);background:var(--accent,#ff7a1a);border-radius:999px;padding:9px 15px}'
      + '.fm input,.fm textarea,.fm select{width:100%;font:inherit;color:var(--text,#ededf0);background:var(--bg,#0000004d);border:1px solid var(--line,#ffffff26);border-radius:12px;padding:10px 12px;margin-top:8px}'
      + '.fm textarea{min-height:110px;resize:vertical}.fm :focus-visible{outline:2px solid var(--accent,#ff7a1a);outline-offset:2px}'
      + '.fm-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'
      + '.fm-btn{font:500 12px var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--text,#ededf0);background:var(--panel,#ffffff0a);border:1px solid var(--line,#ffffff33);border-radius:999px;padding:9px 15px;cursor:pointer}'
      + '.fm-btn.pri{background:var(--accent,#ff7a1a);border-color:transparent;color:#fff}.fm-btn[disabled]{opacity:.5;cursor:default}.fm-btn.on{border-color:var(--accent,#ff7a1a);color:var(--accent,#ff7a1a)}.fm-btn.sm{padding:6px 11px;font-size:11px}'
      + '.fm-dot{display:inline-block;min-width:18px;padding:1px 6px;margin-left:6px;border-radius:999px;background:var(--accent,#ff7a1a);color:#fff;font-size:10px;text-align:center}'
      + '.fm-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}.fm-chips::-webkit-scrollbar{display:none}.fm-chips .fm-btn{white-space:nowrap}'
      + '.fm-av{width:38px;height:38px;border-radius:50%;display:inline-grid;place-items:center;font-weight:700;color:#fff;flex:none}'
      + '.fm-name{font-weight:600;color:var(--text,#ededf0);text-decoration:none}.fm-meta{color:var(--muted,#9a9aa6);font-size:12px}'
      + '.fm-who{display:flex;gap:10px;align-items:center;min-width:0;flex:1}.fm-who .tx{display:flex;flex-direction:column;min-width:0;line-height:1.25}.fm-who .fm-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.fm-tag{font:500 10px var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;border:1px solid var(--line,#ffffff33);border-radius:999px;padding:3px 9px;color:var(--accent,#ff7a1a);white-space:nowrap}'
      + '.fm-post h3{margin:12px 0 6px;font-size:18px;line-height:1.25;word-break:break-word}.fm-body{margin:0 0 10px;white-space:pre-wrap;word-break:break-word;color:var(--text,#ededf0);opacity:.88}'
      + '.fm-img{display:block;max-width:100%;max-height:420px;border-radius:14px;margin:0 0 10px;object-fit:cover}'
      + '.fm-act{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fm-act .fm-btn{padding:7px 12px}.fm-com{border-top:1px solid var(--line,#ffffff1f);margin-top:12px;padding-top:10px}'
      + '.fm-more-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line,#ffffff1f)}.fm-more-row[hidden]{display:none}'
      + '.fm-c{display:flex;gap:10px;padding:8px 0;align-items:flex-start}.fm-c .fm-av{width:28px;height:28px;font-size:12px}.fm-c p{margin:2px 0 0;white-space:pre-wrap;word-break:break-word}'
      + '.fm-thr{display:flex;gap:12px;align-items:center;width:100%;text-align:left;font:inherit;color:inherit;background:var(--panel,#ffffff0a);border:1px solid var(--line,#ffffff1f);border-radius:16px;padding:12px;margin-bottom:10px;cursor:pointer}'
      + '.fm-thr .tx{flex:1;min-width:0}.fm-thr .ls{color:var(--muted,#9a9aa6);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.fm-chat{display:flex;flex-direction:column;gap:8px;margin:12px 0;max-height:52vh;overflow-y:auto;padding:4px}.fm-chat.fm-th-chat{max-height:none;flex:1 1 0;min-height:0}'
      + '.fm-b{max-width:82%;padding:9px 13px;border-radius:16px;background:var(--panel,#ffffff12);border:1px solid var(--line,#ffffff1f);white-space:pre-wrap;word-break:break-word;align-self:flex-start}'
      + '.fm-b.me{align-self:flex-end;background:var(--accent,#ff7a1a);border-color:transparent;color:#fff}.fm-b small{display:block;opacity:.7;font-size:10px;margin-top:3px}'
      + '.fm-n{display:flex;gap:10px;padding:11px 12px;border:1px solid var(--line,#ffffff1f);border-radius:14px;margin-bottom:8px;background:var(--panel,#ffffff0a)}.fm-n.new{border-color:var(--accent,#ff7a1a)}'
      + '.fm-more{display:block;margin:6px auto}.fm-more[hidden]{display:none}.fm-err{color:#ff8a80;margin:8px 0 0;font-size:13px}.fm-empty{text-align:center;color:var(--muted,#9a9aa6);padding:36px 10px}'
      + '.dock-post{flex:none;width:48px;height:48px;margin:0 4px;padding:0;border:0;border-radius:50%;display:grid;place-items:center;background:var(--accent,#ff7a1a);color:var(--on-accent,#fff);font-size:18px;cursor:pointer;box-shadow:0 6px 18px color-mix(in srgb,var(--accent,#ff7a1a) 40%,transparent);touch-action:manipulation}'
      + '.dock-post:active{transform:scale(.92)}.dock-post:focus-visible{outline:2px solid var(--accent,#ff7a1a);outline-offset:3px}'
      + '.fm-new{position:fixed;inset:0;z-index:3550;max-width:none;padding:0;overflow:auto;background:var(--bg,#0b0b0d);-webkit-overflow-scrolling:touch}'
      + '.fm-new-in{max-width:620px;margin:0 auto;padding:calc(env(safe-area-inset-top,0px) + 12px) 14px 40px}'
      + '.fm-new-head{display:flex;align-items:center;gap:10px;margin:0 0 12px}.fm-new-head h2{flex:1;margin:0;font-size:17px;font-weight:600;text-align:center}'
      + '.fm-new-x{flex:none;width:40px;height:40px;padding:0;border:0;border-radius:50%;display:grid;place-items:center;background:var(--panel,#ffffff12);color:inherit;cursor:pointer}'
      + '.fm-new-x svg{width:20px;height:20px}.fm-new .fm-card{margin:0}.fm-new-head .fm-btn{min-width:72px}'
      + '.fm-prev{position:relative;margin:10px 0 0;border-radius:16px;overflow:hidden;background:#000}'
      + '.fm-prev img,.fm-prev video{display:block;width:100%;max-height:52vh;object-fit:contain}'
      + '.fm-prev .fm-new-x{position:absolute;top:8px;right:8px;background:#000a}'
      + '.fm-note{color:var(--muted,#9a9aa6);font-size:13px;margin:8px 0 0}'
      + '.fm-swipe{position:fixed;inset:0;z-index:80;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior:contain;background:#000;scrollbar-width:none;-webkit-overflow-scrolling:touch}'
      + '.fm-swipe::-webkit-scrollbar{display:none}'
      + '.fm-slide{position:relative;height:100%;scroll-snap-align:start;scroll-snap-stop:always;overflow:hidden;background:#000;color:#fff}'
      + '.fm-slide-media{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;background:transparent}'
      + '.fm-swipe-top .fm-chips .fm-btn{background:transparent!important;border-color:#fff6;text-shadow:0 1px 6px #000c}'
      + '.fm-swipe-top .fm-chips .fm-btn.on{background:transparent!important;border-color:#fff;color:#fff}'
      + '.fm-namewrap{display:inline-flex;align-items:center;flex-wrap:wrap;max-width:100%}'
      + '.fm-slide-shade{position:absolute;left:0;right:0;bottom:0;height:55%;background:linear-gradient(#0000,#000e);pointer-events:none}'
      + '.fm-slide-info{position:absolute;left:14px;right:84px;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);text-shadow:0 1px 8px #000a}'
      + '.fm-slide-info h3{margin:8px 0 4px;font-size:17px;line-height:1.25;color:#fff}'
      + '.fm-slide-info p{margin:0 0 6px;font-size:14px;line-height:1.4;color:#fffe;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'
      + '.fm-slide-info .fm-meta{color:#fffc;font-size:12px}'
      + '.fm-slide-who{display:flex;align-items:center;gap:8px}.fm-slide-who>*:first-child{flex:none;width:36px;height:36px;border-radius:50%}'
      + '.fm-slide-rail{position:absolute;right:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 96px);display:flex;flex-direction:column;align-items:center;gap:12px}'
      + '.fm-rail-btn{min-width:52px;min-height:52px;padding:0 10px;border:0;border-radius:26px;background:#0008;color:#fff;font:600 13px var(--sans,system-ui,sans-serif);display:grid;place-items:center;cursor:pointer;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}'
      + '.fm-rail-btn svg{width:22px;height:22px}.fm-rail-btn.on{color:var(--accent,#ff7a1a)}'
      + '.fm-swipe-top{position:fixed;left:0;right:0;top:0;z-index:85;padding:calc(env(safe-area-inset-top,0px) + 10px) 12px 26px;background:linear-gradient(#000d,#0000);pointer-events:none}'
      + '.fm-swipe-top .fm-chips{pointer-events:auto;padding:0}'
      + '.fm-slide-pin{position:absolute;left:14px;top:calc(env(safe-area-inset-top,0px) + 70px)}'
      + '.fm-slide-msg{height:100%;display:grid;place-items:center;padding:24px;text-align:center;color:#ddd;scroll-snap-align:start}'
      + 'body.fm-swipe-on .mpx-mini{display:none!important}';
    document.head.appendChild(st);
  }


  /* ---------- feed ---------- */
  function load(reset) {
    if (S.busy) return; S.busy = true; S.err = '';
    if (reset) resetSwipe();
    var before = !reset && S.posts.length ? S.posts[S.posts.length - 1].at : '';
    if (reset) { S.posts = []; S.pinned = []; if (statEl) statEl.textContent = 'Loading\u2026'; }
    var p = 'posts?cat=' + encodeURIComponent(S.cat) + (S.q ? '&q=' + encodeURIComponent(S.q) : '') + (before ? '&before=' + encodeURIComponent(before) : '');
    api(p).then(function (r) {
      S.busy = false; if (S.view !== 'feed') return;
      if (!r.ok) { S.err = (r.j && r.j.error) || 'Could not load the forum.'; draw(); return; }
      S.posts = S.posts.concat(r.j.posts || []); if (reset) S.pinned = r.j.pinned || []; S.more = !!r.j.more; S.mod = !!(r.j.me && r.j.me.mod); drawNav(); draw();
    });
  }
  function draw() {
    if (swipeEl) return drawSwipe();
    if (!listEl) return; listEl.textContent = ''; statEl.textContent = '';
    if (S.err) statEl.appendChild(h('p', { class: 'fm-err', role: 'alert', text: S.err }));
    var posts = S.posts.slice(); if (S.sort === 'top') posts.sort(function (a, b) { return (b.likes + b.comments) - (a.likes + a.comments); });
    if (!posts.length && !S.pinned.length && !S.err && !S.busy) listEl.appendChild(h('div', { class: 'fm-empty', text: S.q || S.cat !== 'all' ? 'No posts found here yet.' : 'No posts yet. Start the conversation!' }));
    S.pinned.concat(posts).forEach(function (p) { listEl.appendChild(card(p)); });
    moreEl.hidden = !S.more;
  }
  function report(kind, id) {
    var reason = prompt('Why are you reporting this? (optional)'); if (reason === null) return;
    api((kind === 'post' ? 'posts/' : 'comments/') + id + '/report', { method: 'POST', body: { reason: reason } }).then(function (r) {
      alert(r.ok ? 'Thanks. The admin will take a look.' : ((r.j && r.j.error) || 'Could not send the report.'));
    });
  }
  /* ---------- media: pictures, GIFs, video, voice notes ----------
     The file goes to /api/uploads; the returned https link rides at the end of the text as [[img|vid|aud:url]]. */
  var MEDIA_RE = /\n?\[\[(img|vid|aud):(https:\/\/[^\]\s]{4,400})\]\]\s*$/;
  var LIMIT = { img: 3 * 1048576, vid: 25 * 1048576, aud: 8 * 1048576 };
  var ICO = {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></g></svg>',
    msg: '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="m4.5 8 7.5 5.2L19.5 8"/></g></svg>',
    dots: '<svg viewBox="0 0 24 24"><g fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></g></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/></g></svg>'
  };
  function ico(svg, cls, label, fn) { var b = h('button', { type: 'button', class: cls, 'aria-label': label, title: label }); b.innerHTML = svg; if (fn) b.addEventListener('click', fn); return b; }
  function splitMedia(t) {
    var s = String(t || ''), m = MEDIA_RE.exec(s);
    if (m) return { text: s.slice(0, m.index), kind: m[1], url: m[2] };
    var d = /\n?\[\[(img|vid|aud):[^\]]*$/i.exec(s); /* cut-off or malformed token: show a label, never the raw text */
    if (d) return { text: s.slice(0, d.index), kind: d[1].toLowerCase(), url: '' };
    return { text: s, kind: '', url: '' };
  }
  function mediaEl(kind, url) {
    if (kind === 'img') return h('img', { class: 'fm-media', src: url, alt: 'Picture', loading: 'lazy', referrerpolicy: 'no-referrer' });
    if (kind === 'vid') return h('video', { class: 'fm-media', src: url, controls: '', playsinline: '', preload: 'metadata' });
    return h('audio', { class: 'fm-voice', src: url, controls: '', preload: 'metadata' });
  }
  function mediaLabel(kind) { return kind === 'img' ? 'Photo' : kind === 'vid' ? 'Video' : 'Voice note'; }
  function kindOf(f) { var t = (f && f.type) || ''; return /^image\//.test(t) ? 'img' : /^video\//.test(t) ? 'vid' : /^audio\//.test(t) ? 'aud' : ''; }
  function upload(file, kind) {
    return fetch('/api/uploads?kind=forum-' + kind, { method: 'POST', body: file }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.url) throw new Error(j.error || (kind === 'img' ? 'Could not upload the picture.' : 'Could not upload the ' + (kind === 'vid' ? 'video' : 'voice note') + '. The server may not accept this file type yet.'));
        return j.url;
      });
    }, function () { throw new Error('No connection. Check your internet and try again.'); });
  }
  function post(path, body) {
    return api(path, { method: 'POST', body: { body: body } }).then(function (r) { if (!r.ok) throw new Error((r.j && r.j.error) || 'Could not send.'); return r; });
  }

  /* the message bar shared by the comment widget and the chat: [+] [text] [send | mic] */
  function composerBar(o) {
    var wrap = h('div', { class: 'fm-cb' }), pend = h('div', { class: 'fm-pend', hidden: true }), err = h('p', { class: 'fm-err fm-cb-err', role: 'alert', hidden: true });
    var row = h('div', { class: 'fm-cb-row' }), file = h('input', { type: 'file', accept: 'image/*,video/*', hidden: true, tabindex: '-1', 'aria-hidden': 'true' });
    var inp = h('input', { type: 'text', class: 'fm-cb-in', maxlength: String(o.max), placeholder: o.placeholder, 'aria-label': o.label, autocomplete: 'off', enterkeyhint: 'send' });
    var plus = ico(ICO.plus, 'fm-ico fm-plus', 'Add a picture, GIF or video', function () { file.click(); });
    var act = ico(ICO.send, 'fm-ico fm-go', 'Send'), media = null, busy = false, rec = null;
    var recBar = h('div', { class: 'fm-rec', hidden: true }), timer = h('span', { class: 'fm-rec-t', text: '0:00' }), tick = 0;
    function setErr(t) { err.hidden = !t; err.textContent = t || ''; }
    function mode() { return (o.voice && !inp.value.trim() && !media) ? 'mic' : 'send'; }
    function sync() { var m = mode(); if (act.dataset.m === m) return; act.dataset.m = m; act.innerHTML = m === 'mic' ? ICO.mic : ICO.send; act.setAttribute('aria-label', m === 'mic' ? 'Record a voice note' : 'Send'); act.title = act.getAttribute('aria-label'); act.classList.toggle('mic', m === 'mic'); }
    function clearMedia() { if (media && media.url) URL.revokeObjectURL(media.url); media = null; pend.hidden = true; pend.textContent = ''; file.value = ''; sync(); }
    function send() {
      var t = inp.value.trim(); if ((!t && !media) || busy) return;
      setErr(''); busy = true; wrap.classList.add('busy');
      var up = media ? upload(media.file, media.kind).then(function (u) { return '[[' + media.kind + ':' + u + ']]'; }) : Promise.resolve('');
      up.then(function (tok) {
        var body = t + (tok ? (t ? '\n' : '') + tok : '');
        if (body.length > o.max) throw new Error('Too long. Shorten the text a little.');
        return o.onSend(body);
      }).then(function () { inp.value = ''; clearMedia(); })
        .catch(function (e) { setErr(e.message || 'Could not send.'); })
        .then(function () { busy = false; wrap.classList.remove('busy'); sync(); });
    }
    function recUI(on) { row.hidden = on; recBar.hidden = !on; if (!on) clearInterval(tick); }
    function stopRec(cancel) { if (!rec) return; rec.cancel = !!cancel; try { rec.mr.stop(); } catch (e) { recUI(false); rec = null; } }
    function startRec() {
      if (!navigator.mediaDevices || !window.MediaRecorder) { setErr('Voice notes are not supported in this browser.'); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var mt = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].filter(function (m) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m); })[0] || '';
        var chunks = [], t0 = Date.now(), mr = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined);
        rec = { mr: mr, cancel: false };
        mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        mr.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); }); var cancel = rec && rec.cancel; recUI(false); rec = null; if (cancel) return;
          var blob = new Blob(chunks, { type: (mr.mimeType || mt || 'audio/webm').split(';')[0] });
          if (blob.size < 800) { setErr('That was too short. Hold on a little longer.'); return; }
          media = { file: blob, kind: 'aud' }; send();
        };
        mr.start(); timer.textContent = '0:00'; recUI(true);
        tick = setInterval(function () { var s = Math.round((Date.now() - t0) / 1000); timer.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); if (s >= 120) stopRec(false); }, 500);
      }).catch(function () { setErr('Allow microphone access in your browser to send voice notes.'); });
    }
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; if (!f) return; var k = kindOf(f); setErr('');
      if (!k || k === 'aud') { setErr('Choose a picture, GIF or video.'); file.value = ''; return; }
      if (f.size > LIMIT[k]) { setErr(k === 'vid' ? 'Videos can be up to 25 MB.' : 'Pictures and GIFs can be up to 3 MB.'); file.value = ''; return; }
      clearMedia(); var u = URL.createObjectURL(f); media = { file: f, kind: k, url: u };
      pend.textContent = ''; pend.hidden = false;
      pend.appendChild(k === 'img' ? h('img', { src: u, alt: 'Selected picture' }) : h('video', { src: u, muted: '', playsinline: '', preload: 'metadata' }));
      pend.appendChild(ico(ICO.x, 'fm-pend-x', 'Remove', clearMedia)); sync();
    });
    act.addEventListener('click', function () { if (mode() === 'mic') startRec(); else send(); });
    inp.addEventListener('input', sync); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); if (mode() === 'send') send(); } });
    recBar.appendChild(ico(ICO.trash, 'fm-ico', 'Discard voice note', function () { stopRec(true); }));
    recBar.appendChild(h('span', { class: 'fm-rec-dot', 'aria-hidden': 'true' })); recBar.appendChild(timer);
    recBar.appendChild(ico(ICO.send, 'fm-ico fm-go', 'Send voice note', function () { stopRec(false); }));
    row.appendChild(plus); row.appendChild(inp); row.appendChild(act);
    [pend, err, row, recBar, file].forEach(function (x) { wrap.appendChild(x); }); sync();
    wrap.focusInput = function () { inp.focus({ preventScroll: true }); };
    return wrap;
  }

  /* ---------- a post ---------- */
  function menuButton(items, cls) {
    var pop = null, dots = null;
    function closePop() { if (!pop) return; pop.remove(); pop = null; dots.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', outside, true); document.removeEventListener('click', outside, true); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', closePop, true); window.removeEventListener('resize', closePop); }
    // The menu is a fixed layer on <body>, anchored to its button: it is never clipped by the card or covered by the dock/player.
    // Opens below the button, flips above it when there is no room, and stays inside the screen edges.
    function placePop() {
      var r = dots.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight, m = 8, gap = 6;
      var pw = pop.offsetWidth, ph = pop.offsetHeight;
      var left = Math.max(m, Math.min(r.right - pw, vw - pw - m));
      var top = r.bottom + gap;
      if (top + ph > vh - m) { var up = r.top - gap - ph; top = up >= m ? up : Math.max(m, vh - ph - m); }
      pop.style.left = left + 'px'; pop.style.top = top + 'px';
    }
    function outside(e) { if (pop && !pop.contains(e.target) && !dots.contains(e.target)) closePop(); }
    function esc(e) { if (e.key === 'Escape' && pop) { closePop(); dots.focus(); } }
    if (!items.length) return null;
    dots = ico(ICO.dots, cls || 'fm-ico', 'More actions', function () {
      if (pop) { closePop(); return; }
      pop = h('div', { class: 'fm-pop', role: 'menu' }, items.map(function (it) { return h('button', { type: 'button', role: 'menuitem', class: 'fm-pop-i' + (it[2] ? ' bad' : ''), text: it[0], onclick: function () { closePop(); it[1](); } }); }));
      pop.addEventListener('click', function (e) { e.stopPropagation(); });
      document.body.appendChild(pop); placePop(); dots.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', outside, true); document.addEventListener('click', outside, true); document.addEventListener('keydown', esc);
      window.addEventListener('scroll', closePop, true); window.addEventListener('resize', closePop);
      var f = pop.querySelector('button'); if (f) f.focus({ preventScroll: true });
    });
    dots.setAttribute('aria-haspopup', 'menu'); dots.setAttribute('aria-expanded', 'false');
    return dots;
  }
  /* remove a deleted post from the feed (the full-screen feed keeps its own list of slides, so drop that slide too) */
  function removePost(id) {
    S.posts = S.posts.filter(function (x) { return x.id !== id; }); S.pinned = S.pinned.filter(function (x) { return x.id !== id; });
    delete rendered[id];
    var el = swipeEl && swipeEl.querySelector('.fm-slide[data-id="' + id + '"]'); if (el) el.remove();
    draw();
  }
  function postItems(p) {
    var items = [];
    if (!p.mine) items.push(['Report', function () { report('post', p.id); }]);
    if (S.mod) items.push([p.pinned ? 'Unpin' : 'Pin', function () { api('posts/' + p.id + '/pin', { method: 'POST', body: { pinned: !p.pinned } }).then(function (r) { if (r.ok) load(true); else alert((r.j && r.j.error) || 'Could not pin. Has the part-2 SQL been run?'); }); }]);
    if (p.mine || S.mod) items.push(['Delete', function () { if (!confirm('Delete this post?')) return; api('posts/' + p.id, { method: 'DELETE' }).then(function (r) { if (r.ok) removePost(p.id); else alert('Could not delete it.'); }); }, true]);
    return items;
  }
  function card(p) {
    var el = h('article', { class: 'fm-card fm-post' + (p.pinned ? ' pin' : '') }), likeBtn, cmBtn, items = [];
    var parts = who(p), headAct = h('div', { class: 'fm-head-act' });
    var meta = h('span', { class: 'fm-meta' }, [ago(p.at), h('span', { class: 'fm-cat', text: CAT_NAME[p.cat] || 'General' })]);
    if (p.pinned) meta.appendChild(h('span', { class: 'fm-pinned', text: 'Pinned' }));
    if (!p.mine && okSlug(p.slug)) headAct.appendChild(ico(ICO.msg, 'fm-ico', 'Message ' + (p.name || 'this member'), function () { go('thread', p.slug); }));
    items = postItems(p);
    if (items.length) headAct.appendChild(menuButton(items));
    el.appendChild(h('div', { class: 'fm-head' }, [parts[0], h('div', { class: 'fm-who' }, [h('div', { class: 'tx' }, [parts[1], meta])]), headAct]));
    el.appendChild(h('h3', { text: p.title }));
    var pb = splitMedia(p.body);
    if (pb.text) el.appendChild(h('p', { class: 'fm-body', text: pb.text }));
    if (pb.kind && pb.url) el.appendChild(mediaEl(pb.kind, pb.url));
    if (p.image && /^https:\/\//i.test(p.image)) el.appendChild(h('img', { class: 'fm-img', src: p.image, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }));
    var heart = function () { return (p.liked ? '\u2665 ' : '\u2661 ') + p.likes; };
    likeBtn = btn(heart(), p.liked ? 'on' : '', null, { 'aria-pressed': String(!!p.liked), 'aria-label': 'Like' });
    likeBtn.addEventListener('click', function () {
      var on = !p.liked; p.liked = on; p.likes += on ? 1 : -1; likeBtn.textContent = heart(); likeBtn.classList.toggle('on', on); likeBtn.setAttribute('aria-pressed', String(on));
      api('posts/' + p.id + '/like', { method: on ? 'POST' : 'DELETE' }).then(function (r) { if (!r.ok) { p.liked = !on; p.likes += on ? -1 : 1; likeBtn.textContent = heart(); likeBtn.classList.toggle('on', p.liked); } });
    });
    cmBtn = btn('\ud83d\udcac ' + p.comments, '', function () { openSheet(p, cmBtn); }, { 'aria-haspopup': 'dialog', 'aria-label': 'Comments' });
    el.appendChild(h('div', { class: 'fm-act' }, [likeBtn, cmBtn])); return el;
  }

  /* ---------- the comment widget (opens from the comment button) ---------- */
  var sheetEl = null, sheetPrev = null;
  function sheetKey(e) { if (e.key === 'Escape') closeSheet(); }
  function fitSheet() {
    var vv = window.visualViewport; if (!sheetEl || !vv) return;
    sheetEl.style.setProperty('--fm-kb', Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)) + 'px');
    var pn = sheetEl.querySelector('.fm-sheet'); if (pn) pn.style.maxHeight = Math.floor(vv.height * 0.92) + 'px';
  }
  function closeSheet() {
    if (!sheetEl) return; var s = sheetEl; sheetEl = null; s.classList.remove('open'); document.removeEventListener('keydown', sheetKey);
    if (window.visualViewport) { window.visualViewport.removeEventListener('resize', fitSheet); window.visualViewport.removeEventListener('scroll', fitSheet); }
    if (!thEl) document.documentElement.classList.remove('fm-lock'); setTimeout(function () { s.remove(); }, 280);
    if (sheetPrev && sheetPrev.focus) { try { sheetPrev.focus({ preventScroll: true }); } catch (e) {} }
  }
  function openSheet(p, cmBtn) {
    closeSheet(); sheetPrev = document.activeElement;
    var title = h('h2', { id: 'fm-sheet-t' }), list = h('div', { class: 'fm-sheet-list', 'aria-live': 'polite' }), mod = false;
    var paint = function () { title.textContent = p.comments === 1 ? '1 comment' : p.comments + ' comments'; cmBtn.textContent = '\ud83d\udcac ' + p.comments; };
    var refresh = function (toEnd) {
      return api('posts/' + p.id + '/comments').then(function (r) {
        if (!sheetEl) return; list.textContent = '';
        if (!r.ok) { list.appendChild(h('p', { class: 'fm-err', text: (r.j && r.j.error) || 'Could not load comments.' })); return; }
        mod = !!r.j.mod; var cs = r.j.comments || []; if (cs.length !== p.comments) { p.comments = cs.length; paint(); }
        if (!cs.length) list.appendChild(h('div', { class: 'fm-empty', text: 'No comments yet. Be the first.' }));
        cs.forEach(function (c) { list.appendChild(cItem(c, mod, p, paint, refresh)); });
        if (toEnd) list.scrollTop = list.scrollHeight;
      });
    };
    var bar = composerBar({ label: 'Comment', placeholder: 'Add a comment\u2026', max: 500, voice: false, onSend: function (body) { return post('posts/' + p.id + '/comments', body).then(function () { p.comments++; paint(); return refresh(true); }); } });
    var panel = h('div', { class: 'fm-sheet' }, [h('div', { class: 'fm-sheet-head' }, [title, ico(ICO.x, 'fm-ico', 'Close comments', closeSheet)]), list, bar]);
    var scrim = h('div', { class: 'fm-scrim' }); scrim.addEventListener('click', closeSheet);
    sheetEl = h('div', { class: 'fm-sheet-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'fm-sheet-t' }, [scrim, panel]);
    document.body.appendChild(sheetEl); document.documentElement.classList.add('fm-lock'); document.addEventListener('keydown', sheetKey);
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', fitSheet); window.visualViewport.addEventListener('scroll', fitSheet); fitSheet(); }
    paint(); list.appendChild(h('div', { class: 'fm-empty', text: 'Loading\u2026' }));
    requestAnimationFrame(function () { if (sheetEl) sheetEl.classList.add('open'); });
    refresh(false); setTimeout(function () { if (sheetEl) bar.focusInput(); }, 320);
  }
  function cItem(c, mod, p, paint, refresh) {
    var parts = who(c), row = h('div', { class: 'fm-c' }), body = h('div', { class: 'fm-c-body' }), sp = splitMedia(c.body);
    body.appendChild(h('div', {}, [parts[1], h('span', { class: 'fm-meta', text: ' ' + ago(c.at) })]));
    if (sp.text) body.appendChild(h('p', { text: sp.text })); if (sp.kind) body.appendChild(sp.url ? mediaEl(sp.kind, sp.url) : h('p', { class: 'fm-meta', text: mediaLabel(sp.kind) }));
    var tools = h('div', { class: 'fm-c-tools' });
    if (!c.mine) tools.appendChild(h('button', { type: 'button', class: 'fm-lnk', text: 'Report', onclick: function () { report('comment', c.id); } }));
    if (c.mine || mod) tools.appendChild(h('button', { type: 'button', class: 'fm-lnk', text: 'Delete', onclick: function () { api('comments/' + c.id, { method: 'DELETE' }).then(function (r) { if (r.ok) { p.comments = Math.max(0, p.comments - 1); paint(); row.remove(); } }); } }));
    if (tools.children.length) body.appendChild(tools);
    row.appendChild(parts[0]); row.appendChild(body); return row;
  }

  /* ---------- new post: a full-screen page opened from the centre "+" ----------
     Photos and videos are compressed here to 576p (short side 576, like TikTok) before upload. */
  var MAX_SIDE = 576, MAX_VIDEO_SEC = 180, newPage = null;
  function fit(w, h) {
    var s = Math.min(w, h) > MAX_SIDE ? MAX_SIDE / Math.min(w, h) : 1;
    return { w: Math.max(2, 2 * Math.round(w * s / 2)), h: Math.max(2, 2 * Math.round(h * s / 2)) };
  }
  function compressImage(file) {
    if (/gif/i.test(file.type)) return Promise.resolve(file);   // keep GIFs animated
    return new Promise(function (ok, bad) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var d = fit(im.naturalWidth, im.naturalHeight), c = document.createElement('canvas');
        c.width = d.w; c.height = d.h; c.getContext('2d').drawImage(im, 0, 0, d.w, d.h); URL.revokeObjectURL(url);
        c.toBlob(function (b) { if (b) ok(b); else bad(new Error('Could not compress the picture.')); }, 'image/jpeg', 0.86);
      };
      im.onerror = function () { URL.revokeObjectURL(url); bad(new Error('Could not read that picture.')); };
      im.src = url;
    });
  }
  function compressVideo(file, onp) {
    return new Promise(function (ok, bad) {
      var v = document.createElement('video'), url = URL.createObjectURL(file), failed = false;
      v.playsInline = true; v.preload = 'auto'; v.volume = 0; v.src = url;   // the sound is captured, not played out loud
      v.onerror = function () { bad(new Error('Could not read that video.')); };
      var setup = function () {
        if (v.duration > MAX_VIDEO_SEC) return bad(new Error('Videos must be 3 minutes or shorter.'));
        var type = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].filter(function (t) { return window.MediaRecorder && MediaRecorder.isTypeSupported(t); })[0];
        if (!type) return bad(new Error('This browser cannot compress video. Try a photo instead.'));
        var d = fit(v.videoWidth, v.videoHeight), c = document.createElement('canvas'), x = c.getContext('2d');
        c.width = d.w; c.height = d.h;
        var stream = c.captureStream(30);
        try { var vs = v.captureStream ? v.captureStream() : null; if (vs && vs.getAudioTracks()[0]) stream.addTrack(vs.getAudioTracks()[0]); } catch (e) {}
        var rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 1000000, audioBitsPerSecond: 96000 }), parts = [];
        rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
        rec.onstop = function () { URL.revokeObjectURL(url); if (!failed) ok(new Blob(parts, { type: type.split(';')[0] })); };
        var draw = function () { if (v.paused || v.ended) return; x.drawImage(v, 0, 0, d.w, d.h); if (onp) onp(v.currentTime / v.duration); requestAnimationFrame(draw); };
        v.onplaying = draw;
        v.onended = function () { x.drawImage(v, 0, 0, d.w, d.h); setTimeout(function () { rec.stop(); }, 150); };
        rec.start(500);
        v.play().catch(function () { failed = true; try { rec.stop(); } catch (e) {} bad(new Error('Could not start compressing the video.')); });
      };
      v.onloadedmetadata = function () {
        if (isFinite(v.duration)) return setup();
        // some recordings (WebM from a camera or screen recorder) report no length until read to the end: seek there to find it
        v.ondurationchange = function () { if (!isFinite(v.duration)) return; v.ondurationchange = null; v.currentTime = 0; setup(); };
        v.currentTime = 1e101;
      };
      v.src = url;
    });
  }
  function openCreate() {
    if (newPage) return;
    if (window.MaplePlayer && MaplePlayer.pause) MaplePlayer.pause();   // writing a post stops the music
    var media = null, busy = false, pickFile = h('input', { type: 'file', accept: 'image/*,video/*', hidden: '' });
    var cat = h('select', { 'aria-label': 'Category' }, CATS.slice(1).map(function (c) { return h('option', { value: c[0], text: c[1] }); }));
    var title = h('input', { type: 'text', maxlength: '120', placeholder: 'Title', 'aria-label': 'Title' });
    var body = h('textarea', { maxlength: '2000', placeholder: 'What’s on your mind?', 'aria-label': 'Post text' });
    var prev = h('div', { class: 'fm-prev', hidden: '' }), note = h('p', { class: 'fm-note', role: 'status', hidden: '' });
    var err = h('p', { class: 'fm-err', role: 'alert', hidden: '' });
    var post = btn('Post', 'pri'), addMedia = btn('Add photo or video', '');
    var x = ico(ICO.x, 'fm-new-x', 'Close', function () { if (!busy) closeCreate(); });
    var page = h('div', { class: 'fm fm-new', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'New post' }, [
      h('div', { class: 'fm-new-in' }, [
        h('div', { class: 'fm-new-head' }, [x, h('h2', { text: 'New post' }), post]),
        h('div', { class: 'fm-card' }, [cat, title, body, prev, h('div', { class: 'fm-row', style: 'margin-top:10px' }, [addMedia]), note, err, pickFile])
      ])
    ]);
    function say(msg, bad) { note.hidden = !!bad; err.hidden = !bad; (bad ? err : note).textContent = msg; note.hidden = !!bad || !msg; }
    function clearMedia() { if (media && media.url) URL.revokeObjectURL(media.url); media = null; prev.hidden = true; prev.innerHTML = ''; }
    addMedia.addEventListener('click', function () { if (!busy) pickFile.click(); });
    pickFile.addEventListener('change', function () {
      var f = pickFile.files && pickFile.files[0]; pickFile.value = ''; if (!f) return;
      var k = kindOf(f); err.hidden = true;
      if (!k || k === 'aud') return say('Choose a photo or a video.', true);
      if (k === 'img' && f.size > 30 * 1048576) return say('That picture is too big (30 MB max).', true);
      if (k === 'vid' && f.size > 500 * 1048576) return say('That video is too big (500 MB max).', true);
      clearMedia(); var url = URL.createObjectURL(f); media = { file: f, kind: k, url: url };
      var el = k === 'img' ? h('img', { src: url, alt: '' }) : h('video', { src: url, controls: '', muted: '', playsinline: '', preload: 'metadata' });
      var rm = ico(ICO.x, 'fm-new-x', 'Remove', function () { clearMedia(); });
      prev.appendChild(el); prev.appendChild(rm); prev.hidden = false;
      say('');
    });
    post.addEventListener('click', function () {
      if (busy) return; err.hidden = true;
      if (!title.value.trim()) return say('Give your post a title.', true);
      busy = true; post.disabled = true;
      var imgUrl = '', text = body.value.trim();
      var prep = !media ? Promise.resolve()
        : media.kind === 'img'
          ? (say('Compressing picture…'), compressImage(media.file).then(function (b) { say('Uploading…'); return upload(b, 'img'); }).then(function (u) { imgUrl = u; }))
          : (say('Compressing video… 0%'), compressVideo(media.file, function (p) { say('Compressing video… ' + Math.round(p * 100) + '%'); })
              .then(function (b) { say('Uploading…'); return upload(b, 'vid'); })
              .then(function (u) { text = (text ? text + '\n' : '') + '[[vid:' + u + ']]'; }));
      prep.then(function () {
        say('Publishing…');
        return api('posts', { method: 'POST', body: { category: cat.value, title: title.value.trim(), body: text, image: imgUrl } });
      }).then(function (r) {
        if (!r.ok) throw new Error((r.j && r.j.error) || 'Could not post.');
        clearMedia(); closeCreate(); load(true);
      }).catch(function (e) { busy = false; post.disabled = false; say((e && e.message) || 'Could not post.', true); });
    });
    newPage = page; document.body.appendChild(page); title.focus();
    document.addEventListener('keydown', escNew);
  }
  function escNew(e) { if (e.key === 'Escape') closeCreate(); }
  function closeCreate() {
    if (!newPage) return;
    newPage.remove(); newPage = null; document.removeEventListener('keydown', escNew);
  }
  /* ---------- the feed: full-screen posts you swipe up and down (TikTok-style) ---------- */
  var swipeEl = null, swipeTop = null, swipeIO = null, vidIO = null, swipeMsg = null, rendered = {};
  function openSwipe() {
    if (swipeEl) return;
    swipeTop = h('div', { class: 'fm-swipe-top' }, [h('div', { class: 'fm-chips', role: 'tablist', 'aria-label': 'Categories' }, CATS.map(function (c) {
      var b = btn(c[0] === 'all' ? 'All' : c[1], c[0] === S.cat ? 'on' : '', null, { role: 'tab', 'aria-selected': String(c[0] === S.cat) });
      b.addEventListener('click', function () {
        S.cat = c[0];
        Array.prototype.forEach.call(swipeTop.querySelectorAll('.fm-chips button'), function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); });
        load(true);
      });
      return b;
    }))]);
    swipeEl = h('div', { class: 'fm-swipe', role: 'feed', 'aria-label': 'Posts' });
    swipeEl.addEventListener('scroll', function () { if (S.more && !S.busy && swipeEl.scrollTop + swipeEl.clientHeight > swipeEl.scrollHeight - swipeEl.clientHeight * 1.5) load(false); }, { passive: true });
    document.body.appendChild(swipeTop); document.body.appendChild(swipeEl);
    placeSwipe(); window.addEventListener('resize', placeSwipe);
    // the pager slides the panes sideways: only show the full-screen feed while its pane is on screen
    swipeIO = new IntersectionObserver(function (es) { var on = !!es[0] && es[0].isIntersecting && es[0].intersectionRect.width > 0; if (swipeEl) swipeEl.style.display = swipeTop.style.display = on ? '' : 'none'; if (on) playInView(); document.body.classList.toggle('fm-swipe-on', on); }, { threshold: [0, 1] });
    swipeIO.observe(sec);
    // videos play while their slide is mostly on screen, and pause when it scrolls away
    vidIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && e.intersectionRatio >= 0.6) v.play().catch(function () { v.muted = true; v.play().catch(function () {}); });
        else v.pause();
      });
    }, { threshold: [0, 0.6] });
    statEl = moreEl = listEl = null;
  }
  /* Feed videos have sound: stop them when the app goes to the background or loses focus (Android recents). */
  var resumeVids = [];
  function quietFeed() {
    if (!swipeEl) return;
    swipeEl.querySelectorAll('video').forEach(function (v) { if (!v.paused) { if (resumeVids.indexOf(v) < 0) resumeVids.push(v); try { v.pause(); } catch (e) {} } });
  }
  /* back in the app: play again the videos that were playing and are still on screen */
  function resumeFeed() {
    var list = resumeVids; resumeVids = [];
    if (!swipeEl || swipeEl.style.display === 'none') return;
    list.forEach(function (v) {
      if (!swipeEl.contains(v)) return;
      var r = v.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) v.play().catch(function () {});
    });
  }
  window.addEventListener('pagehide', quietFeed);
  window.addEventListener('blur', quietFeed);
  window.addEventListener('focus', resumeFeed);
  document.addEventListener('freeze', quietFeed);
  document.addEventListener('visibilitychange', function () { if (document.hidden) quietFeed(); else resumeFeed(); });
  /* coming back to the feed (e.g. from + or another page): play the slide that is on screen */
  function playInView() {
    if (!swipeEl) return;
    var box = swipeEl.getBoundingClientRect();
    swipeEl.querySelectorAll('.fm-slide').forEach(function (sl) {
      var v = sl.querySelector('video'); if (!v || !v.paused) return;
      var r = sl.getBoundingClientRect(), shown = Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top);
      if (shown >= r.height * 0.6) v.play().catch(function () {});
    });
  }
  function closeSwipe() {
    if (swipeIO) swipeIO.disconnect(); if (vidIO) vidIO.disconnect();
    if (swipeEl) swipeEl.remove(); if (swipeTop) swipeTop.remove();
    document.body.classList.remove('fm-swipe-on'); window.removeEventListener('resize', placeSwipe);
    swipeEl = swipeTop = swipeIO = vidIO = swipeMsg = null; rendered = {};
  }
  function placeSwipe() {
    if (!swipeEl) return;
    var hd = document.querySelector('.topbar'), top = hd ? Math.round(hd.getBoundingClientRect().bottom) : 0;
    swipeEl.style.top = swipeTop.style.top = top + 'px';
  }
  function resetSwipe() { rendered = {}; if (swipeEl) { swipeEl.textContent = ''; swipeEl.scrollTop = 0; } }
  function drawSwipe() {
    if (!swipeEl) return;
    if (swipeMsg) { swipeMsg.remove(); swipeMsg = null; }
    var list = S.pinned.concat(S.posts);
    list.forEach(function (p) { if (rendered[p.id]) return; rendered[p.id] = true; swipeEl.appendChild(slide(p)); });
    swipeEl.querySelectorAll('video').forEach(function (v) { if (!v.dataset.io) { v.dataset.io = '1'; vidIO.observe(v); } });
    if (S.err) { swipeMsg = h('div', { class: 'fm-slide-msg', role: 'alert', text: S.err }); swipeEl.appendChild(swipeMsg); }
    else if (!list.length && !S.busy) { swipeMsg = h('div', { class: 'fm-slide-msg', text: S.cat !== 'all' ? 'No posts in this category yet.' : 'No posts yet. Tap + to start the conversation!' }); swipeEl.appendChild(swipeMsg); }
  }
  function slide(p) {
    var el = h('section', { class: 'fm-slide', 'data-id': p.id, 'aria-label': p.title || 'Post' });
    var pb = splitMedia(p.body);
    if (pb.kind === 'vid' && pb.url) {
      var v = h('video', { class: 'fm-slide-media', src: pb.url, playsinline: '', loop: '', preload: 'metadata' });
      v.addEventListener('click', function () { if (v.paused) v.play().catch(function () {}); else v.pause(); });
      el.appendChild(v);
    } else if (pb.kind === 'img' && pb.url) el.appendChild(h('img', { class: 'fm-slide-media', src: pb.url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }));
    else if (p.image && /^https:\/\//i.test(p.image)) el.appendChild(h('img', { class: 'fm-slide-media', src: p.image, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }));
    el.appendChild(h('div', { class: 'fm-slide-shade' }));
    if (p.pinned) el.appendChild(h('span', { class: 'fm-pinned fm-slide-pin', text: 'Pinned' }));
    el.appendChild(h('div', { class: 'fm-slide-info' }, [
      h('div', { class: 'fm-slide-who' }, [avatar(p.name, p.slug), h('strong', { text: '@' + (p.slug || p.name || 'member') }), badgeEl(p)]),
      h('h3', { text: p.title }),
      pb.text ? h('p', { text: pb.text }) : null,
      h('div', { class: 'fm-meta', text: ago(p.at) + ' · ' + (CAT_NAME[p.cat] || 'General') })
    ]));
    var likeBtn = h('button', { type: 'button', class: 'fm-rail-btn' + (p.liked ? ' on' : ''), 'aria-label': 'Like', 'aria-pressed': String(!!p.liked), text: (p.liked ? '♥ ' : '♡ ') + p.likes });
    var heart = function () { return (p.liked ? '♥ ' : '♡ ') + p.likes; };
    likeBtn.addEventListener('click', function () {
      var on = !p.liked; p.liked = on; p.likes += on ? 1 : -1; likeBtn.textContent = heart(); likeBtn.classList.toggle('on', on); likeBtn.setAttribute('aria-pressed', String(on));
      api('posts/' + p.id + '/like', { method: on ? 'POST' : 'DELETE' }).then(function (r) { if (!r.ok) { p.liked = !on; p.likes += on ? -1 : 1; likeBtn.textContent = heart(); likeBtn.classList.toggle('on', p.liked); } });
    });
    var cmBtn = h('button', { type: 'button', class: 'fm-rail-btn', 'aria-label': 'Comments', 'aria-haspopup': 'dialog', text: '💬 ' + p.comments });
    cmBtn.addEventListener('click', function () { openSheet(p, cmBtn); });
    var rail = h('div', { class: 'fm-slide-rail' }, [likeBtn, cmBtn]);
    if (!p.mine && okSlug(p.slug)) rail.appendChild(ico(ICO.msg, 'fm-rail-btn', 'Message ' + (p.name || 'this member'), function () { go('thread', p.slug); }));
    var mb = menuButton(postItems(p), 'fm-rail-btn'); if (mb) rail.appendChild(mb);
    el.appendChild(rail);
    return el;
  }
  function feedView() { openSwipe(); load(true); }

  /* ---------- alerts ---------- */
  function alertsView() {
    viewEl.appendChild(topBar('Alerts'));
    var box = h('div', { text: 'Loading\u2026' }); viewEl.appendChild(box);
    api('notifications').then(function (r) {
      box.textContent = ''; if (S.view !== 'alerts') return;
      if (!r.ok) { box.appendChild(h('p', { class: 'fm-err', text: (r.j && r.j.error) || 'Could not load alerts.' })); return; }
      if (r.j.off) { box.appendChild(h('div', { class: 'fm-empty', text: 'Alerts are not set up yet. Run the part-2 SQL in Supabase.' })); return; }
      var items = r.j.items || [];
      if (!items.length) { box.appendChild(h('div', { class: 'fm-empty', text: 'Nothing yet. Likes and comments on your posts show up here.' })); return; }
      items.forEach(function (n) {
        var t = n.kind === 'like' ? ' liked your post \u201c' + n.title + '\u201d' : ' commented on \u201c' + n.title + '\u201d';
        var line = h('div', { class: 'tx', style: 'flex:1;min-width:0' }, [h('div', {}, [h('strong', { text: n.name || 'Someone' }), t]), n.snippet ? h('div', { class: 'fm-meta', text: n.snippet }) : null, h('div', { class: 'fm-meta', text: ago(n.at) })]);
        box.appendChild(h('div', { class: 'fm-n' + (n.read ? '' : ' new') }, [avatar(n.name, n.slug || n.actor_slug), line]));
      });
      if (r.j.unread) api('notifications/read', { method: 'POST' }).then(function () { S.unread = 0; drawNav(); });
    });
  }

  /* ---------- private messages ---------- */
  function topBar(title) {
    return h('div', { class: 'fm-bar' }, [btn('\u2190 Feed', 'sm fm-back', function () { go('feed'); }, { 'aria-label': 'Back to the feed' }), h('h2', { text: title })]);
  }
  function inboxView() {
    viewEl.appendChild(topBar('Messages'));
    var nm = h('div', { class: 'fm-card' }), inp = h('input', { type: 'text', placeholder: 'Card link of a member, e.g. aiman', maxlength: '40', 'aria-label': 'Member card link', style: 'margin:0' }), er = h('p', { class: 'fm-err', hidden: true });
    var go2 = function () { var v = inp.value.trim().replace(/^.*\//, '').toLowerCase(); if (!okSlug(v)) { er.hidden = false; er.textContent = 'Type the member\u2019s card link, like aiman.'; return; } go('thread', v); };
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go2(); });
    nm.appendChild(h('div', { class: 'fm-meta', text: 'New message' })); nm.appendChild(h('div', { class: 'fm-row', style: 'margin-top:8px' }, [h('div', { style: 'flex:1;min-width:160px' }, [inp]), btn('Start', 'pri', go2)])); nm.appendChild(er);
    viewEl.appendChild(nm);
    var box = h('div', { text: 'Loading\u2026' }); viewEl.appendChild(box);
    api('dms').then(function (r) {
      box.textContent = ''; if (S.view !== 'inbox') return;
      if (!r.ok) { box.appendChild(h('p', { class: 'fm-err', text: (r.j && r.j.error) || 'Could not load messages.' })); return; }
      if (r.j.off) { box.appendChild(h('div', { class: 'fm-empty', text: 'Messages are not set up yet. Run the part-2 SQL in Supabase.' })); return; }
      if (!(r.j.threads || []).length) { box.appendChild(h('div', { class: 'fm-empty', text: 'No conversations yet. Tap the envelope on a post, or type a card link above.' })); return; }
      r.j.threads.forEach(function (t) {
        var row = h('button', { type: 'button', class: 'fm-thr' }, [avatar(t.name, t.slug), h('div', { class: 'tx' }, [h('div', {}, [h('strong', { text: t.name || t.slug }), h('span', { class: 'fm-meta', text: ' \u00b7 ' + ago(t.at) })]), h('div', { class: 'ls', text: (t.mine ? 'You: ' : '') + (function (m) { return m.text || (m.kind ? mediaLabel(m.kind) : ''); })(splitMedia(t.last)) })]), t.unread ? h('span', { class: 'fm-dot', text: String(t.unread) }) : null]);
        row.addEventListener('click', function () { go('thread', t.slug); }); box.appendChild(row);
      });
    });
  }
  /* the conversation: full screen, with the message bar fixed to the bottom like a chat app */
  var thEl = null;
  function closeTh() { if (!thEl) return; thEl.remove(); thEl = null; if (!sheetEl) document.documentElement.classList.remove('fm-lock'); }
  window.addEventListener('popstate', function () { setTimeout(function () { if (thEl && !(sec && document.body.contains(sec))) closeTh(); }, 60); });
  function threadView(slug) {
    var title = h('h2', { text: slug }), count = -1;
    var chat = h('div', { class: 'fm-chat fm-th-chat', 'aria-live': 'polite' }), err = h('p', { class: 'fm-err fm-th-err', role: 'alert', hidden: true });
    var refresh = function (first) {
      api('dms/' + encodeURIComponent(slug)).then(function (r) {
        if (S.view !== 'thread' || !thEl) return;
        if (!r.ok) { err.hidden = false; err.textContent = (r.j && r.j.error) || 'Could not load the conversation.'; chat.textContent = ''; return; }
        err.hidden = true; if (r.j.with) title.textContent = r.j.with.name;
        var ms = r.j.messages || []; if (ms.length === count) return; count = ms.length; chat.textContent = '';
        if (!ms.length) chat.appendChild(h('div', { class: 'fm-empty', text: 'Say hello \ud83d\udc4b' }));
        ms.forEach(function (m) {
          var sp = splitMedia(m.body), kids = [];
          if (sp.kind) kids.push(sp.url ? mediaEl(sp.kind, sp.url) : h('span', { class: 'fm-t', text: mediaLabel(sp.kind) })); if (sp.text) kids.push(h('span', { class: 'fm-t', text: sp.text })); kids.push(h('small', { text: ago(m.at) }));
          chat.appendChild(h('div', { class: 'fm-b' + (m.mine ? ' me' : '') + (sp.kind ? ' has-media' : '') }, kids));
        });
        chat.scrollTop = chat.scrollHeight; if (first) updateBadges();
      });
    };
    var bar = composerBar({ label: 'Message', placeholder: 'Message', max: 1000, voice: true, onSend: function (body) { return post('dms/' + encodeURIComponent(slug), body).then(function () { count = -1; refresh(); }); } });
    var head = h('div', { class: 'fm-th-head' }, [ico(ICO.back, 'fm-ico', 'Back to messages', function () { go('inbox'); }), avatar(slug, slug), title]);
    thEl = h('div', { class: 'fm-th', role: 'dialog', 'aria-label': 'Conversation with ' + slug }, [head, chat, err, bar]);
    document.body.appendChild(thEl); document.documentElement.classList.add('fm-lock');
    refresh(true); threadTimer = setInterval(function () { if (!(sec && document.body.contains(sec))) { closeTh(); clearInterval(threadTimer); return; } if (!document.hidden) refresh(); }, 15000);
  }

  /* ---------- reports (admin) ---------- */
  function reportsView() {
    viewEl.appendChild(topBar('Reports'));
    var box = h('div', { text: 'Loading\u2026' }); viewEl.appendChild(box);
    api('reports').then(function (r) {
      box.textContent = ''; if (S.view !== 'reports') return;
      if (!r.ok) { box.appendChild(h('p', { class: 'fm-err', text: (r.j && r.j.error) || 'Could not load reports.' })); return; }
      if (!(r.j.items || []).length) { box.appendChild(h('div', { class: 'fm-empty', text: 'No reports. All quiet.' })); return; }
      r.j.items.forEach(function (it) {
        var row = h('div', { class: 'fm-card' });
        row.appendChild(h('div', { class: 'fm-row' }, [h('span', { class: 'fm-tag', text: it.kind }), h('span', { class: 'fm-meta', text: it.count + (it.count === 1 ? ' report' : ' reports') }), h('span', { class: 'fm-meta', text: it.name ? 'by ' + it.name : '' })]));
        row.appendChild(h('p', { class: 'fm-body', style: 'margin:8px 0', text: it.gone ? '(already deleted)' : it.text }));
        if (it.reasons.length) row.appendChild(h('p', { class: 'fm-meta', text: 'Reasons: ' + it.reasons.join(' / ') }));
        var acts = h('div', { class: 'fm-act' });
        acts.appendChild(btn('Dismiss', 'sm', function () { api('reports/' + it.kind + '/' + it.target, { method: 'DELETE' }).then(function (x) { if (x.ok) row.remove(); }); }));
        if (!it.gone) acts.appendChild(btn('Delete content', 'sm', function () { if (!confirm('Delete this ' + it.kind + '?')) return; api((it.kind === 'post' ? 'posts/' : 'comments/') + it.target, { method: 'DELETE' }).then(function () { api('reports/' + it.kind + '/' + it.target, { method: 'DELETE' }).then(function () { row.remove(); }); }); }));
        row.appendChild(acts); box.appendChild(row);
      });
    });
  }

  /* ---------- shell ---------- */
  /* the header message button and the side menu show these counts (maple-shell.js listens) */
  function drawNav() {
    var d = { dm: S.dm, unread: S.unread, mod: S.mod };
    window.__forumBadges = d;
    try { window.dispatchEvent(new CustomEvent('maple:forum', { detail: d })); } catch (e) {}
  }
  function updateBadges() {
    api('notifications').then(function (r) {
      if (!r.ok) return; S.dm = r.j.dm || 0; S.unread = r.j.unread || 0; S.off = !!r.j.off; if (r.j.mod) S.mod = true; drawNav();
    });
  }
  function go(view, arg) {
    var was = S.view;
    clearInterval(threadTimer); threadTimer = null; closeTh(); closeSheet(); if (view !== 'feed') closeSwipe(); S.view = view; viewEl.textContent = ''; listEl = moreEl = statEl = null;
    if (view === 'feed') feedView(); else if (view === 'alerts') alertsView(); else if (view === 'inbox') inboxView(); else if (view === 'thread') threadView(arg); else if (view === 'reports') reportsView();
    drawNav(); if ((view !== 'feed' || was !== 'feed') && sec && sec.scrollIntoView) sec.scrollIntoView({ block: 'start' });
  }
  /* a screen asked for by the header / side menu; honoured for a few seconds so it survives the page being (re)built */
  var want = null, VIEWS = { feed: 1, inbox: 1, alerts: 1, reports: 1, thread: 1 };
  function takeWant() {
    var w = want; want = null;
    return w && Date.now() - w.t < 4000 && VIEWS[w.v] ? w : null;
  }
  function open(view, arg) {
    if (!VIEWS[view]) view = 'feed';
    want = { v: view, a: arg, t: Date.now() };
    var P = window.dgPager, path = location.pathname.replace(/\/+$/, '') || '/';
    var onHome = P && P.active() && !P.layered() && path === '/' && !location.hash;
    if (sec && document.body.contains(sec)) { var w = takeWant(); if (w) go(w.v, w.a); }
    if (onHome) return;
    if (window.dgNavigate) window.dgNavigate('/');
    else location.href = '/?pm=1';
  }
  /* the centre "+" in the bottom dock: opens the post form on the feed */
  function compose() { openCreate(); }
  function dockPost() {
    var nav = document.querySelector('nav.dock'); if (!nav || nav.querySelector('.dock-post')) return;
    var b = h('button', { type: 'button', class: 'dock-post', 'aria-label': 'Create a post', title: 'Create a post' }, [h('i', { class: 'fa-solid fa-plus', 'aria-hidden': 'true' })]);
    b.addEventListener('click', compose);
    nav.insertBefore(b, nav.querySelector('.dock-i[data-dock="profile"]') || null);
  }
  // the dock is rebuilt on every page change (innerHTML), so put the "+" back whenever that happens
  var dockWatch = null;
  function watchDock() {
    if (dockWatch) return;
    dockWatch = setInterval(function () {
      var nav = document.querySelector('nav.dock'); if (!nav) return;
      clearInterval(dockWatch); dockWatch = 'on';
      new MutationObserver(dockPost).observe(nav, { childList: true });
      dockPost();
    }, 300);
  }
  function mount(pane) {
    if (!pane || pane.querySelector('#forum')) return; css();
    // hide the default landing sections (the creator directory stays, so it can still move to the Explore tab)
    Array.prototype.forEach.call(pane.children, function (c) { if (c.id !== 'explore') c.hidden = true; });
    document.title = 'M-ID · Community';
    sec = h('section', { class: 'fm', id: 'forum', 'aria-label': 'Feed' });
    viewEl = h('div'); sec.appendChild(viewEl);
    pane.insertBefore(sec, pane.firstChild);
    var w = takeWant(); S.view = 'feed'; go(w ? w.v : 'feed', w && w.a); updateBadges(); watchDock();
    clearInterval(poll); poll = setInterval(function () { if (!document.body.contains(sec)) { clearInterval(poll); clearInterval(threadTimer); return; } if (!document.hidden) updateBadges(); }, 60000);
  }
  window.dgForum = { mount: mount, open: open, view: function () { return S.view; }, badges: function () { return { dm: S.dm, unread: S.unread, mod: S.mod }; } };
})();
