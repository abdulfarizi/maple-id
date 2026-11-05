/* Maple ID \u00b7 Forum: the home page for signed-in members.
   Posts, categories, likes, comments, pinned posts, reports, alerts and private messages. */
(function () {
  'use strict';
  var CATS = [['all', 'All'], ['general', 'General'], ['gaming', 'Gaming'], ['showcase', 'Showcase'], ['help', 'Help']];
  var CAT_NAME = { general: 'General', gaming: 'Gaming', showcase: 'Showcase', help: 'Help' };
  var S = { view: 'feed', cat: 'all', sort: 'new', q: '', posts: [], pinned: [], more: false, mod: false, busy: false, err: '', dm: 0, unread: 0, off: false };
  var sec = null, viewEl = null, navEl = null, listEl = null, moreEl = null, statEl = null, st = null, nav = {}, poll = null, threadTimer = null;

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
  function who(p) {
    var name = p.name || 'Member';
    return [avatar(name, p.slug), okSlug(p.slug) ? h('a', { class: 'fm-name', href: '/' + p.slug, 'data-link': '', text: name }) : h('span', { class: 'fm-name', text: name })];
  }
  function btn(text, cls, fn, extra) { var b = h('button', Object.assign({ type: 'button', class: 'fm-btn' + (cls ? ' ' + cls : ''), text: text }, extra || {})); if (fn) b.addEventListener('click', fn); return b; }
  function css() {
    if (st) return; st = document.createElement('style');
    st.textContent = '.fm{max-width:760px;margin:0 auto;padding:clamp(18px,4vw,34px) 14px 110px;color:var(--text,#ededf0)}'
      + '.fm *{box-sizing:border-box}.fm-eyebrow{font:500 11px var(--mono,monospace);letter-spacing:.16em;text-transform:uppercase;color:var(--accent,#ff7a1a);margin:0 0 6px}'
      + '.fm h1{margin:0 0 6px;font-size:clamp(28px,6vw,40px);line-height:1.1}.fm h2{margin:0 0 12px;font-size:22px}.fm-sub{margin:0 0 14px;color:var(--muted,#9a9aa6)}'
      + '.fm-card{background:var(--panel,#ffffff0a);border:1px solid var(--line,#ffffff1f);border-radius:18px;padding:14px;margin-bottom:12px}.fm-card.pin{border-color:var(--accent,#ff7a1a)}'
      + '.fm-start{width:100%;text-align:left;font:inherit;color:var(--muted,#9a9aa6);background:var(--panel,#ffffff0a);border:1px dashed var(--line,#ffffff33);border-radius:18px;padding:14px 16px;cursor:pointer;margin-bottom:14px}'
      + '.fm input,.fm textarea,.fm select{width:100%;font:inherit;color:var(--text,#ededf0);background:var(--bg,#0000004d);border:1px solid var(--line,#ffffff26);border-radius:12px;padding:10px 12px;margin-top:8px}'
      + '.fm textarea{min-height:110px;resize:vertical}.fm :focus-visible{outline:2px solid var(--accent,#ff7a1a);outline-offset:2px}'
      + '.fm-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'
      + '.fm-btn{font:500 12px var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--text,#ededf0);background:var(--panel,#ffffff0a);border:1px solid var(--line,#ffffff33);border-radius:999px;padding:9px 15px;cursor:pointer}'
      + '.fm-btn.pri{background:var(--accent,#ff7a1a);border-color:transparent;color:#fff}.fm-btn[disabled]{opacity:.5;cursor:default}.fm-btn.on{border-color:var(--accent,#ff7a1a);color:var(--accent,#ff7a1a)}.fm-btn.sm{padding:6px 11px;font-size:11px}'
      + '.fm-nav{display:flex;gap:8px;overflow-x:auto;padding:2px 0 14px;scrollbar-width:none}.fm-nav::-webkit-scrollbar{display:none}.fm-nav .fm-btn{white-space:nowrap}'
      + '.fm-dot{display:inline-block;min-width:18px;padding:1px 6px;margin-left:6px;border-radius:999px;background:var(--accent,#ff7a1a);color:#fff;font-size:10px;text-align:center}'
      + '.fm-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}.fm-chips::-webkit-scrollbar{display:none}.fm-chips .fm-btn{white-space:nowrap}'
      + '.fm-av{width:34px;height:34px;border-radius:50%;display:inline-grid;place-items:center;font-weight:700;color:#fff;flex:none}'
      + '.fm-name{font-weight:600;color:var(--text,#ededf0);text-decoration:none}.fm-meta{color:var(--muted,#9a9aa6);font-size:12px}'
      + '.fm-tag{font:500 10px var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;border:1px solid var(--line,#ffffff33);border-radius:999px;padding:3px 9px;color:var(--accent,#ff7a1a)}'
      + '.fm-post h3{margin:10px 0 6px;font-size:18px;line-height:1.25;word-break:break-word}.fm-body{margin:0 0 10px;white-space:pre-wrap;word-break:break-word;color:var(--text,#ededf0);opacity:.88}'
      + '.fm-img{display:block;max-width:100%;max-height:420px;border-radius:12px;margin:0 0 10px;object-fit:cover}'
      + '.fm-act{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fm-act .fm-btn{padding:7px 12px}.fm-com{border-top:1px solid var(--line,#ffffff1f);margin-top:12px;padding-top:10px}'
      + '.fm-c{display:flex;gap:10px;padding:8px 0;align-items:flex-start}.fm-c .fm-av{width:26px;height:26px;font-size:12px}.fm-c p{margin:2px 0 0;white-space:pre-wrap;word-break:break-word}'
      + '.fm-thr{display:flex;gap:12px;align-items:center;width:100%;text-align:left;font:inherit;color:inherit;background:var(--panel,#ffffff0a);border:1px solid var(--line,#ffffff1f);border-radius:16px;padding:12px;margin-bottom:10px;cursor:pointer}'
      + '.fm-thr .tx{flex:1;min-width:0}.fm-thr .ls{color:var(--muted,#9a9aa6);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.fm-chat{display:flex;flex-direction:column;gap:8px;margin:12px 0;max-height:52vh;overflow-y:auto;padding:4px}'
      + '.fm-b{max-width:82%;padding:9px 13px;border-radius:16px;background:var(--panel,#ffffff12);border:1px solid var(--line,#ffffff1f);white-space:pre-wrap;word-break:break-word;align-self:flex-start}'
      + '.fm-b.me{align-self:flex-end;background:var(--accent,#ff7a1a);border-color:transparent;color:#fff}.fm-b small{display:block;opacity:.7;font-size:10px;margin-top:3px}'
      + '.fm-n{display:flex;gap:10px;padding:11px 12px;border:1px solid var(--line,#ffffff1f);border-radius:14px;margin-bottom:8px;background:var(--panel,#ffffff0a)}.fm-n.new{border-color:var(--accent,#ff7a1a)}'
      + '.fm-more{display:block;margin:6px auto}.fm-more[hidden]{display:none}.fm-err{color:#ff8a80;margin:8px 0 0;font-size:13px}.fm-empty{text-align:center;color:var(--muted,#9a9aa6);padding:36px 10px}';
    document.head.appendChild(st);
  }

  /* ---------- feed ---------- */
  function load(reset) {
    if (S.busy) return; S.busy = true; S.err = '';
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
  function card(p) {
    var el = h('article', { class: 'fm-card fm-post' + (p.pinned ? ' pin' : '') }), cm = null, cmBtn, likeBtn;
    var tags = [h('span', { class: 'fm-meta', text: '\u00b7 ' + ago(p.at) })];
    if (p.pinned) tags.push(h('span', { class: 'fm-tag', text: '\ud83d\udccc Pinned' }));
    tags.push(h('span', { class: 'fm-tag', style: 'margin-left:auto', text: CAT_NAME[p.cat] || 'General' }));
    el.appendChild(h('div', { class: 'fm-row' }, who(p).concat(tags)));
    el.appendChild(h('h3', { text: p.title }));
    if (p.body) el.appendChild(h('p', { class: 'fm-body', text: p.body }));
    if (p.image && /^https:\/\//i.test(p.image)) el.appendChild(h('img', { class: 'fm-img', src: p.image, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }));
    likeBtn = btn('\u2665 ' + p.likes, p.liked ? 'on' : '', null, { 'aria-pressed': String(!!p.liked), 'aria-label': 'Like' });
    likeBtn.addEventListener('click', function () {
      var on = !p.liked; p.liked = on; p.likes += on ? 1 : -1; likeBtn.textContent = '\u2665 ' + p.likes; likeBtn.classList.toggle('on', on); likeBtn.setAttribute('aria-pressed', String(on));
      api('posts/' + p.id + '/like', { method: on ? 'POST' : 'DELETE' }).then(function (r) { if (!r.ok) { p.liked = !on; p.likes += on ? -1 : 1; likeBtn.textContent = '\u2665 ' + p.likes; likeBtn.classList.toggle('on', p.liked); } });
    });
    cmBtn = btn('\ud83d\udcac ' + p.comments, '', function () {
      if (cm) { cm.remove(); cm = null; cmBtn.setAttribute('aria-expanded', 'false'); return; }
      cm = h('div', { class: 'fm-com' }); el.appendChild(cm); cmBtn.setAttribute('aria-expanded', 'true'); comments(p, cm, cmBtn);
    }, { 'aria-expanded': 'false', 'aria-label': 'Comments' });
    var act = h('div', { class: 'fm-act' }, [likeBtn, cmBtn]), right = h('div', { class: 'fm-act', style: 'margin-left:auto' });
    if (!p.mine && okSlug(p.slug)) right.appendChild(btn('\u2709 Message', 'sm', function () { go('thread', p.slug); }));
    if (!p.mine) right.appendChild(btn('Report', 'sm', function () { report('post', p.id); }));
    if (S.mod) right.appendChild(btn(p.pinned ? 'Unpin' : 'Pin', 'sm', function () { api('posts/' + p.id + '/pin', { method: 'POST', body: { pinned: !p.pinned } }).then(function (r) { if (r.ok) load(true); else alert((r.j && r.j.error) || 'Could not pin. Has the part-2 SQL been run?'); }); }));
    if (p.mine || S.mod) right.appendChild(btn('Delete', 'sm', function () { if (!confirm('Delete this post?')) return; api('posts/' + p.id, { method: 'DELETE' }).then(function (r) { if (r.ok) { S.posts = S.posts.filter(function (x) { return x.id !== p.id; }); S.pinned = S.pinned.filter(function (x) { return x.id !== p.id; }); draw(); } else alert('Could not delete it.'); }); }));
    act.appendChild(right); el.appendChild(act); return el;
  }
  function comments(p, box, cmBtn) {
    box.textContent = 'Loading\u2026';
    api('posts/' + p.id + '/comments').then(function (r) {
      box.textContent = ''; if (!r.ok) { box.appendChild(h('p', { class: 'fm-err', text: (r.j && r.j.error) || 'Could not load comments.' })); return; }
      var mod = !!r.j.mod, list = h('div'); box.appendChild(list);
      (r.j.comments || []).forEach(function (c) { list.appendChild(cItem(c, mod, p, cmBtn)); });
      var inp = h('input', { type: 'text', maxlength: '500', placeholder: 'Write a comment\u2026', 'aria-label': 'Comment' }), err = h('p', { class: 'fm-err', hidden: true });
      var send = btn('Reply', 'pri');
      var go2 = function () {
        var t = inp.value.trim(); if (!t) return; send.disabled = true;
        api('posts/' + p.id + '/comments', { method: 'POST', body: { body: t } }).then(function (x) {
          send.disabled = false;
          if (!x.ok) { err.hidden = false; err.textContent = (x.j && x.j.error) || 'Could not comment.'; return; }
          err.hidden = true; inp.value = ''; p.comments++; cmBtn.textContent = '\ud83d\udcac ' + p.comments; comments(p, box, cmBtn);
        });
      };
      send.addEventListener('click', go2); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go2(); });
      box.appendChild(h('div', { class: 'fm-row', style: 'margin-top:6px' }, [h('div', { style: 'flex:1;min-width:160px' }, [inp]), send])); box.appendChild(err);
    });
  }
  function cItem(c, mod, p, cmBtn) {
    var parts = who(c), row = h('div', { class: 'fm-c' }), body = h('div', { style: 'flex:1;min-width:0' });
    body.appendChild(h('div', {}, [parts[1], h('span', { class: 'fm-meta', text: ' \u00b7 ' + ago(c.at) })])); body.appendChild(h('p', { text: c.body }));
    row.appendChild(parts[0]); row.appendChild(body);
    if (!c.mine) row.appendChild(btn('Report', 'sm', function () { report('comment', c.id); }));
    if (c.mine || mod) row.appendChild(btn('\u2715', 'sm', function () { api('comments/' + c.id, { method: 'DELETE' }).then(function (r) { if (r.ok) { p.comments = Math.max(0, p.comments - 1); cmBtn.textContent = '\ud83d\udcac ' + p.comments; row.remove(); } }); }, { 'aria-label': 'Delete comment' }));
    return row;
  }
  function composer() {
    var wrap = h('div');
    var start = h('button', { type: 'button', class: 'fm-start', text: 'Start a post\u2026' });
    var form = h('div', { class: 'fm-card', hidden: true });
    var cat = h('select', { 'aria-label': 'Category' }, CATS.slice(1).map(function (c) { return h('option', { value: c[0], text: c[1] }); }));
    var title = h('input', { type: 'text', maxlength: '120', placeholder: 'Title', 'aria-label': 'Title' });
    var body = h('textarea', { maxlength: '2000', placeholder: 'Share something with the community\u2026', 'aria-label': 'Post text' });
    var img = h('input', { type: 'text', maxlength: '500', placeholder: 'Image or GIF link (https://\u2026), optional', 'aria-label': 'Image link' });
    var err = h('p', { class: 'fm-err', role: 'alert', hidden: true }), post = btn('Post', 'pri'), cancel = btn('Cancel');
    [cat, title, body, img, err].forEach(function (x) { form.appendChild(x); });
    form.appendChild(h('div', { class: 'fm-row', style: 'margin-top:10px' }, [post, cancel]));
    var toggle = function (v) { form.hidden = !v; start.hidden = v; if (v) title.focus(); };
    start.addEventListener('click', function () { toggle(true); }); cancel.addEventListener('click', function () { toggle(false); });
    post.addEventListener('click', function () {
      err.hidden = true; if (!title.value.trim()) { err.hidden = false; err.textContent = 'Give your post a title.'; return; }
      post.disabled = true;
      api('posts', { method: 'POST', body: { category: cat.value, title: title.value.trim(), body: body.value.trim(), image: img.value.trim() } }).then(function (r) {
        post.disabled = false;
        if (!r.ok) { err.hidden = false; err.textContent = (r.j && r.j.error) || 'Could not post.'; return; }
        title.value = body.value = img.value = ''; toggle(false); load(true);
      });
    });
    wrap.appendChild(start); wrap.appendChild(form); return wrap;
  }
  function feedView() {
    viewEl.appendChild(composer());
    var chips = h('div', { class: 'fm-chips', role: 'tablist', 'aria-label': 'Categories' });
    CATS.forEach(function (c) { var b = btn(c[0] === 'all' ? 'All' : c[1], c[0] === S.cat ? 'on' : '', null, { role: 'tab', 'aria-selected': String(c[0] === S.cat) });
      b.addEventListener('click', function () { S.cat = c[0]; Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); }); b.classList.add('on'); b.setAttribute('aria-selected', 'true'); load(true); }); chips.appendChild(b); });
    viewEl.appendChild(chips);
    var q = h('input', { type: 'search', placeholder: 'Search posts\u2026', 'aria-label': 'Search posts', maxlength: '40', value: S.q, style: 'flex:1;min-width:150px;margin:0' }), t;
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { S.q = q.value.trim(); load(true); }, 350); });
    var sort = btn(S.sort === 'new' ? 'Latest' : 'Top', '', function () { S.sort = S.sort === 'new' ? 'top' : 'new'; sort.textContent = S.sort === 'new' ? 'Latest' : 'Top'; draw(); });
    viewEl.appendChild(h('div', { class: 'fm-row', style: 'margin:4px 0 14px' }, [q, sort]));
    statEl = h('div', { 'aria-live': 'polite' }); listEl = h('div'); moreEl = btn('Show more', 'fm-more', function () { load(false); }, { hidden: true });
    viewEl.appendChild(statEl); viewEl.appendChild(listEl); viewEl.appendChild(moreEl); load(true);
  }

  /* ---------- alerts ---------- */
  function alertsView() {
    viewEl.appendChild(h('h2', { text: 'Alerts' }));
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
  function inboxView() {
    viewEl.appendChild(h('h2', { text: 'Messages' }));
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
      if (!(r.j.threads || []).length) { box.appendChild(h('div', { class: 'fm-empty', text: 'No conversations yet. Use \u201c\u2709 Message\u201d on a post, or type a card link above.' })); return; }
      r.j.threads.forEach(function (t) {
        var row = h('button', { type: 'button', class: 'fm-thr' }, [avatar(t.name, t.slug), h('div', { class: 'tx' }, [h('div', {}, [h('strong', { text: t.name || t.slug }), h('span', { class: 'fm-meta', text: ' \u00b7 ' + ago(t.at) })]), h('div', { class: 'ls', text: (t.mine ? 'You: ' : '') + t.last })]), t.unread ? h('span', { class: 'fm-dot', text: String(t.unread) }) : null]);
        row.addEventListener('click', function () { go('thread', t.slug); }); box.appendChild(row);
      });
    });
  }
  function threadView(slug) {
    var head = h('div', { class: 'fm-row' }, [btn('\u2190 Back', 'sm', function () { go('inbox'); })]), title = h('h2', { text: slug, style: 'margin:0' }); head.appendChild(title);
    var chat = h('div', { class: 'fm-chat', 'aria-live': 'polite' }), err = h('p', { class: 'fm-err', hidden: true });
    var inp = h('input', { type: 'text', maxlength: '1000', placeholder: 'Write a message\u2026', 'aria-label': 'Message', style: 'margin:0' }), send = btn('Send', 'pri');
    viewEl.appendChild(head); viewEl.appendChild(chat); viewEl.appendChild(err); viewEl.appendChild(h('div', { class: 'fm-row' }, [h('div', { style: 'flex:1;min-width:160px' }, [inp]), send]));
    var count = -1;
    var refresh = function (first) {
      api('dms/' + encodeURIComponent(slug)).then(function (r) {
        if (S.view !== 'thread') return;
        if (!r.ok) { err.hidden = false; err.textContent = (r.j && r.j.error) || 'Could not load the conversation.'; chat.textContent = ''; return; }
        err.hidden = true; if (r.j.with) title.textContent = r.j.with.name;
        var ms = r.j.messages || []; if (ms.length === count) return; count = ms.length; chat.textContent = '';
        if (!ms.length) chat.appendChild(h('div', { class: 'fm-empty', text: 'Say hello \ud83d\udc4b' }));
        ms.forEach(function (m) { chat.appendChild(h('div', { class: 'fm-b' + (m.mine ? ' me' : '') }, [m.body, h('small', { text: ago(m.at) })])); });
        chat.scrollTop = chat.scrollHeight; if (first) updateBadges();
      });
    };
    var go2 = function () {
      var t = inp.value.trim(); if (!t) return; send.disabled = true;
      api('dms/' + encodeURIComponent(slug), { method: 'POST', body: { body: t } }).then(function (r) {
        send.disabled = false; if (!r.ok) { err.hidden = false; err.textContent = (r.j && r.j.error) || 'Could not send.'; return; }
        err.hidden = true; inp.value = ''; count = -1; refresh();
      });
    };
    send.addEventListener('click', go2); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go2(); });
    refresh(true); threadTimer = setInterval(function () { if (!document.hidden) refresh(); }, 15000);
  }

  /* ---------- reports (admin) ---------- */
  function reportsView() {
    viewEl.appendChild(h('h2', { text: 'Reports' }));
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
  function drawNav() {
    if (!navEl) return;
    var label = { feed: 'Feed', inbox: 'Messages', alerts: 'Alerts', reports: 'Reports' }, cnt = { inbox: S.dm, alerts: S.unread };
    Object.keys(nav).forEach(function (k) {
      var b = nav[k]; b.textContent = label[k]; if (cnt[k] > 0) b.appendChild(h('span', { class: 'fm-dot', text: String(cnt[k]) }));
      b.classList.toggle('on', k === (S.view === 'thread' ? 'inbox' : S.view)); b.hidden = k === 'reports' && !S.mod;
    });
  }
  function updateBadges() {
    api('notifications').then(function (r) {
      if (!r.ok) return; S.dm = r.j.dm || 0; S.unread = r.j.unread || 0; S.off = !!r.j.off; if (r.j.mod) S.mod = true; drawNav();
    });
  }
  function go(view, arg) {
    clearInterval(threadTimer); threadTimer = null; S.view = view; viewEl.textContent = ''; listEl = moreEl = statEl = null;
    if (view === 'feed') feedView(); else if (view === 'alerts') alertsView(); else if (view === 'inbox') inboxView(); else if (view === 'thread') threadView(arg); else if (view === 'reports') reportsView();
    drawNav(); if (view !== 'feed') window.scrollTo && sec && sec.scrollIntoView && sec.scrollIntoView({ block: 'start' });
  }
  function mount(pane) {
    if (!pane || pane.querySelector('#forum')) return; css();
    // hide the default landing sections (the creator directory stays, so it can still move to the Explore tab)
    Array.prototype.forEach.call(pane.children, function (c) { if (c.id !== 'explore') c.hidden = true; });
    document.title = 'Maple ID \u00b7 Community';
    sec = h('section', { class: 'fm', id: 'forum', 'aria-label': 'Community forum' });
    sec.appendChild(h('p', { class: 'fm-eyebrow', text: 'Community' })); sec.appendChild(h('h1', { text: 'Forum' }));
    sec.appendChild(h('p', { class: 'fm-sub', text: 'Ask questions, show off your card, and meet other creators and gamers.' }));
    navEl = h('div', { class: 'fm-nav', role: 'navigation', 'aria-label': 'Forum sections' }); nav = {};
    ['feed', 'inbox', 'alerts', 'reports'].forEach(function (k) { nav[k] = btn(k, '', function () { go(k); }); navEl.appendChild(nav[k]); });
    sec.appendChild(navEl); viewEl = h('div'); sec.appendChild(viewEl);
    pane.insertBefore(sec, pane.firstChild);
    S.view = 'feed'; go('feed'); updateBadges();
    clearInterval(poll); poll = setInterval(function () { if (!document.body.contains(sec)) { clearInterval(poll); clearInterval(threadTimer); return; } if (!document.hidden) updateBadges(); }, 60000);
  }
  window.dgForum = { mount: mount };
})();
