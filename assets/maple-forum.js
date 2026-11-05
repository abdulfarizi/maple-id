/* Maple ID \u00b7 Forum: the home page for signed-in members. Posts, categories, likes and comments. */
(function () {
  'use strict';
  var CATS = [['all', 'All'], ['general', 'General'], ['gaming', 'Gaming'], ['showcase', 'Showcase'], ['help', 'Help']];
  var CAT_NAME = { general: 'General', gaming: 'Gaming', showcase: 'Showcase', help: 'Help' };
  var S = { cat: 'all', sort: 'new', q: '', posts: [], more: false, mod: false, busy: false, err: '' };
  var root = null, listEl = null, moreEl = null, statEl = null, st = null;

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
  function who(p) {
    var name = p.name || 'Member', ok = /^[a-z0-9_-]{1,40}$/i.test(p.slug || '');
    var av = h('span', { class: 'fm-av', 'aria-hidden': 'true', text: (Array.from(name)[0] || 'M').toUpperCase(), style: 'background:hsl(' + hue(name) + ' 55% 38%)' });
    var nm = ok ? h('a', { class: 'fm-name', href: '/' + p.slug, 'data-link': '', text: name }) : h('span', { class: 'fm-name', text: name });
    return [av, nm];
  }
  function css() {
    if (st) return; st = document.createElement('style');
    st.textContent = '.fm{max-width:760px;margin:0 auto;padding:clamp(18px,4vw,34px) 14px 110px;color:var(--text,#ededf0)}'
      + '.fm *{box-sizing:border-box}.fm-eyebrow{font:500 11px var(--mono,monospace);letter-spacing:.16em;text-transform:uppercase;color:var(--accent,#ff7a1a);margin:0 0 6px}'
      + '.fm h1{margin:0 0 6px;font-size:clamp(28px,6vw,40px);line-height:1.1}.fm-sub{margin:0 0 18px;color:var(--muted,#9a9aa6)}'
      + '.fm-card{background:var(--panel,#ffffff0a);border:1px solid var(--line,#ffffff1f);border-radius:18px;padding:14px;margin-bottom:12px}'
      + '.fm-start{width:100%;text-align:left;font:inherit;color:var(--muted,#9a9aa6);background:var(--panel,#ffffff0a);border:1px dashed var(--line,#ffffff33);border-radius:18px;padding:14px 16px;cursor:pointer;margin-bottom:14px}'
      + '.fm input,.fm textarea,.fm select{width:100%;font:inherit;color:var(--text,#ededf0);background:var(--bg,#0000004d);border:1px solid var(--line,#ffffff26);border-radius:12px;padding:10px 12px;margin-top:8px}'
      + '.fm textarea{min-height:110px;resize:vertical}.fm :focus-visible{outline:2px solid var(--accent,#ff7a1a);outline-offset:2px}'
      + '.fm-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.fm-row.sp{justify-content:space-between}'
      + '.fm-btn{font:500 12px var(--mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--text,#ededf0);background:var(--panel,#ffffff0a);border:1px solid var(--line,#ffffff33);border-radius:999px;padding:9px 15px;cursor:pointer}'
      + '.fm-btn.pri{background:var(--accent,#ff7a1a);border-color:transparent;color:#fff}.fm-btn[disabled]{opacity:.5;cursor:default}.fm-btn.on{border-color:var(--accent,#ff7a1a);color:var(--accent,#ff7a1a)}'
      + '.fm-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}.fm-chips::-webkit-scrollbar{display:none}.fm-chips .fm-btn{white-space:nowrap}'
      + '.fm-av{width:34px;height:34px;border-radius:50%;display:inline-grid;place-items:center;font-weight:700;color:#fff;flex:none}'
      + '.fm-name{font-weight:600;color:var(--text,#ededf0);text-decoration:none}.fm-meta{color:var(--muted,#9a9aa6);font-size:12px}'
      + '.fm-tag{font:500 10px var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;border:1px solid var(--line,#ffffff33);border-radius:999px;padding:3px 9px;color:var(--accent,#ff7a1a)}'
      + '.fm-post h3{margin:10px 0 6px;font-size:18px;line-height:1.25;word-break:break-word}.fm-body{margin:0 0 10px;white-space:pre-wrap;word-break:break-word;color:var(--text,#ededf0);opacity:.88}'
      + '.fm-img{display:block;max-width:100%;max-height:420px;border-radius:12px;margin:0 0 10px;object-fit:cover}'
      + '.fm-act{display:flex;gap:8px;align-items:center}.fm-act .fm-btn{padding:7px 12px}.fm-com{border-top:1px solid var(--line,#ffffff1f);margin-top:12px;padding-top:10px}'
      + '.fm-c{display:flex;gap:10px;padding:8px 0;align-items:flex-start}.fm-c .fm-av{width:26px;height:26px;font-size:12px}.fm-c p{margin:2px 0 0;white-space:pre-wrap;word-break:break-word}'
      + '.fm-more{display:block;margin:6px auto}.fm-more[hidden]{display:none}.fm-err{color:#ff8a80;margin:8px 0 0;font-size:13px}.fm-empty{text-align:center;color:var(--muted,#9a9aa6);padding:36px 10px}';
    document.head.appendChild(st);
  }

  /* ---------- list ---------- */
  function load(reset) {
    if (S.busy) return; S.busy = true; S.err = '';
    var before = !reset && S.posts.length ? S.posts[S.posts.length - 1].at : '';
    if (reset) { S.posts = []; statEl.textContent = 'Loading\u2026'; }
    var p = 'posts?cat=' + encodeURIComponent(S.cat) + (S.q ? '&q=' + encodeURIComponent(S.q) : '') + (before ? '&before=' + encodeURIComponent(before) : '');
    api(p).then(function (r) {
      S.busy = false;
      if (!r.ok) { S.err = (r.j && r.j.error) || 'Could not load the forum.'; draw(); return; }
      S.posts = S.posts.concat(r.j.posts || []); S.more = !!r.j.more; S.mod = !!(r.j.me && r.j.me.mod); draw();
    });
  }
  function draw() {
    if (!listEl) return; listEl.textContent = ''; statEl.textContent = '';
    if (S.err) { statEl.appendChild(h('p', { class: 'fm-err', role: 'alert', text: S.err })); }
    var posts = S.posts.slice(); if (S.sort === 'top') posts.sort(function (a, b) { return (b.likes + b.comments) - (a.likes + a.comments); });
    if (!posts.length && !S.err && !S.busy) listEl.appendChild(h('div', { class: 'fm-empty', text: S.q || S.cat !== 'all' ? 'No posts found here yet.' : 'No posts yet. Start the conversation!' }));
    posts.forEach(function (p) { listEl.appendChild(card(p)); });
    moreEl.hidden = !S.more;
  }
  function card(p) {
    var el = h('article', { class: 'fm-card fm-post' }), cm = null, cmBtn, likeBtn;
    el.appendChild(h('div', { class: 'fm-row' }, who(p).concat([h('span', { class: 'fm-meta', text: '\u00b7 ' + ago(p.at) }), h('span', { class: 'fm-tag', style: 'margin-left:auto', text: CAT_NAME[p.cat] || 'General' })])));
    el.appendChild(h('h3', { text: p.title }));
    if (p.body) el.appendChild(h('p', { class: 'fm-body', text: p.body }));
    if (p.image && /^https:\/\//i.test(p.image)) el.appendChild(h('img', { class: 'fm-img', src: p.image, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }));
    likeBtn = h('button', { type: 'button', class: 'fm-btn' + (p.liked ? ' on' : ''), 'aria-pressed': String(!!p.liked), 'aria-label': 'Like', text: '\u2665 ' + p.likes });
    likeBtn.addEventListener('click', function () {
      var on = !p.liked; p.liked = on; p.likes += on ? 1 : -1; likeBtn.textContent = '\u2665 ' + p.likes; likeBtn.classList.toggle('on', on); likeBtn.setAttribute('aria-pressed', String(on));
      api('posts/' + p.id + '/like', { method: on ? 'POST' : 'DELETE' }).then(function (r) { if (!r.ok) { p.liked = !on; p.likes += on ? -1 : 1; likeBtn.textContent = '\u2665 ' + p.likes; likeBtn.classList.toggle('on', p.liked); } });
    });
    cmBtn = h('button', { type: 'button', class: 'fm-btn', 'aria-expanded': 'false', text: '\ud83d\udcac ' + p.comments });
    cmBtn.addEventListener('click', function () {
      if (cm) { cm.remove(); cm = null; cmBtn.setAttribute('aria-expanded', 'false'); return; }
      cm = h('div', { class: 'fm-com' }); el.appendChild(cm); cmBtn.setAttribute('aria-expanded', 'true'); comments(p, cm, cmBtn);
    });
    var act = h('div', { class: 'fm-act' }, [likeBtn, cmBtn]);
    if (p.mine || S.mod) {
      var del = h('button', { type: 'button', class: 'fm-btn', style: 'margin-left:auto', text: 'Delete' });
      del.addEventListener('click', function () { if (!confirm('Delete this post?')) return; api('posts/' + p.id, { method: 'DELETE' }).then(function (r) { if (r.ok) { S.posts = S.posts.filter(function (x) { return x.id !== p.id; }); draw(); } else alert('Could not delete it.'); }); });
      act.appendChild(del);
    }
    el.appendChild(act); return el;
  }
  function comments(p, box, cmBtn) {
    box.textContent = 'Loading\u2026';
    api('posts/' + p.id + '/comments').then(function (r) {
      box.textContent = ''; if (!r.ok) { box.appendChild(h('p', { class: 'fm-err', text: (r.j && r.j.error) || 'Could not load comments.' })); return; }
      var mod = !!r.j.mod, list = h('div'); box.appendChild(list);
      (r.j.comments || []).forEach(function (c) { list.appendChild(cItem(c, mod, p, cmBtn)); });
      var inp = h('input', { type: 'text', maxlength: '500', placeholder: 'Write a comment\u2026', 'aria-label': 'Comment' }), err = h('p', { class: 'fm-err', hidden: true });
      var send = h('button', { type: 'button', class: 'fm-btn pri', text: 'Reply' });
      var go = function () {
        var t = inp.value.trim(); if (!t) return; send.disabled = true;
        api('posts/' + p.id + '/comments', { method: 'POST', body: { body: t } }).then(function (x) {
          send.disabled = false;
          if (!x.ok) { err.hidden = false; err.textContent = (x.j && x.j.error) || 'Could not comment.'; return; }
          err.hidden = true; inp.value = ''; p.comments++; cmBtn.textContent = '\ud83d\udcac ' + p.comments; comments(p, box, cmBtn);
        });
      };
      send.addEventListener('click', go); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      box.appendChild(h('div', { class: 'fm-row', style: 'margin-top:6px' }, [h('div', { style: 'flex:1;min-width:160px' }, [inp]), send])); box.appendChild(err);
    });
  }
  function cItem(c, mod, p, cmBtn) {
    var parts = who(c), row = h('div', { class: 'fm-c' }), body = h('div', { style: 'flex:1;min-width:0' });
    body.appendChild(h('div', {}, [parts[1], h('span', { class: 'fm-meta', text: ' \u00b7 ' + ago(c.at) })])); body.appendChild(h('p', { text: c.body }));
    row.appendChild(parts[0]); row.appendChild(body);
    if (c.mine || mod) {
      var d = h('button', { type: 'button', class: 'fm-btn', 'aria-label': 'Delete comment', text: '\u2715' });
      d.addEventListener('click', function () { api('comments/' + c.id, { method: 'DELETE' }).then(function (r) { if (r.ok) { p.comments = Math.max(0, p.comments - 1); cmBtn.textContent = '\ud83d\udcac ' + p.comments; row.remove(); } }); });
      row.appendChild(d);
    }
    return row;
  }

  /* ---------- composer ---------- */
  function composer() {
    var wrap = h('div'), open = false;
    var start = h('button', { type: 'button', class: 'fm-start', text: 'Start a post\u2026' });
    var form = h('div', { class: 'fm-card', hidden: true });
    var cat = h('select', { 'aria-label': 'Category' }, CATS.slice(1).map(function (c) { return h('option', { value: c[0], text: c[1] }); }));
    var title = h('input', { type: 'text', maxlength: '120', placeholder: 'Title', 'aria-label': 'Title' });
    var body = h('textarea', { maxlength: '2000', placeholder: 'Share something with the community\u2026', 'aria-label': 'Post text' });
    var img = h('input', { type: 'text', maxlength: '500', placeholder: 'Image or GIF link (https://\u2026), optional', 'aria-label': 'Image link' });
    var err = h('p', { class: 'fm-err', role: 'alert', hidden: true }), post = h('button', { type: 'button', class: 'fm-btn pri', text: 'Post' }), cancel = h('button', { type: 'button', class: 'fm-btn', text: 'Cancel' });
    form.appendChild(cat); form.appendChild(title); form.appendChild(body); form.appendChild(img); form.appendChild(err);
    form.appendChild(h('div', { class: 'fm-row', style: 'margin-top:10px' }, [post, cancel]));
    var toggle = function (v) { open = v; form.hidden = !v; start.hidden = v; if (v) title.focus(); };
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

  /* ---------- mount ---------- */
  function mount(pane) {
    if (!pane || pane.querySelector('#forum')) return; css();
    // hide the default landing sections (the creator directory stays, so it can still move to the Explore tab)
    Array.prototype.forEach.call(pane.children, function (c) { if (c.id !== 'explore') c.hidden = true; });
    document.title = 'Maple ID \u00b7 Community';
    var sec = h('section', { class: 'fm', id: 'forum', 'aria-label': 'Community forum' });
    sec.appendChild(h('p', { class: 'fm-eyebrow', text: 'Community' })); sec.appendChild(h('h1', { text: 'Forum' }));
    sec.appendChild(h('p', { class: 'fm-sub', text: 'Ask questions, show off your card, and meet other creators and gamers.' }));
    sec.appendChild(composer());
    var chips = h('div', { class: 'fm-chips', role: 'tablist', 'aria-label': 'Categories' });
    CATS.forEach(function (c) { var b = h('button', { type: 'button', role: 'tab', class: 'fm-btn' + (c[0] === S.cat ? ' on' : ''), 'aria-selected': String(c[0] === S.cat), text: c[1] });
      b.addEventListener('click', function () { S.cat = c[0]; Array.prototype.forEach.call(chips.children, function (x) { x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); }); b.classList.add('on'); b.setAttribute('aria-selected', 'true'); load(true); }); chips.appendChild(b); });
    sec.appendChild(chips);
    var q = h('input', { type: 'search', placeholder: 'Search posts\u2026', 'aria-label': 'Search posts', maxlength: '40', style: 'flex:1;min-width:150px;margin:0' }), t;
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { S.q = q.value.trim(); load(true); }, 350); });
    var sort = h('button', { type: 'button', class: 'fm-btn', text: 'Latest' });
    sort.addEventListener('click', function () { S.sort = S.sort === 'new' ? 'top' : 'new'; sort.textContent = S.sort === 'new' ? 'Latest' : 'Top'; draw(); });
    sec.appendChild(h('div', { class: 'fm-row', style: 'margin:4px 0 14px' }, [q, sort]));
    statEl = h('div', { 'aria-live': 'polite' }); listEl = h('div'); moreEl = h('button', { type: 'button', class: 'fm-btn fm-more', hidden: true, text: 'Show more' });
    moreEl.addEventListener('click', function () { load(false); });
    sec.appendChild(statEl); sec.appendChild(listEl); sec.appendChild(moreEl);
    pane.insertBefore(sec, pane.firstChild); root = sec; load(true);
  }
  window.dgForum = { mount: mount };
})();
