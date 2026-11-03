/* Maple ID · Star card extras: free GIF layer (behind / in front / page background) and editable borders. */
(function () {
  'use strict';
  var qs = new URLSearchParams(location.search), GEDIT = qs.get('gifedit') === '1';
  var HX = /^#[0-9a-f]{6}$/i, SRC = /^(https:\/\/|data:image\/(gif|png|webp|jpeg);base64,)/i;
  var SEL = { panel: '.panel', banner: '.banner', avatar: '.avatar', name: '.name-block', specs: '.specs-box', bio: '.bio', links: '.actions .btn' };
  var TPL = {
    neon:   { panel: { c: '#00e5ff', w: 2, r: 26, g: 16 }, banner: { c: '#ff2bd6', w: 2, g: 10 }, avatar: { c: '#00e5ff', w: 3, g: 14 }, specs: { c: '#ff2bd6', w: 1, s: 'dashed' }, bio: { c: '#00e5ff', w: 1, r: 12, g: 6 }, links: { c: '#00e5ff', w: 2, g: 8 } },
    gold:   { panel: { c: '#d4af37', w: 3, s: 'double', r: 26 }, banner: { c: '#d4af37', w: 2 }, avatar: { c: '#d4af37', w: 4, g: 10 }, specs: { c: '#d4af37', w: 1 }, bio: { c: '#d4af37', w: 1, r: 10 }, links: { c: '#d4af37', w: 2, r: 14 } },
    pastel: { panel: { c: '#bfe6ff', w: 5, r: 28 }, banner: { c: '#ffb3c9', w: 3, r: 18 }, avatar: { c: '#ffb3c9', w: 4 }, specs: { c: '#ffb3c9', w: 2, s: 'dotted', r: 14 }, bio: { c: '#bfe6ff', w: 2, r: 14 }, links: { c: '#ffb3c9', w: 2, r: 20 } },
    pixel:  { panel: { c: '#ffffff', w: 4, r: 0 }, banner: { c: '#ffffff', w: 3, r: 0 }, avatar: { c: '#ffffff', w: 4, r: 0 }, specs: { c: '#ffffff', w: 2, r: 0, s: 'dashed' }, bio: { c: '#ffffff', w: 2, r: 0 }, links: { c: '#ffffff', w: 3, r: 0 } },
    glass:  { panel: { c: '#ffffff', w: 1, r: 30, g: 10 }, banner: { c: '#ffffff', w: 1, g: 6 }, avatar: { c: '#ffffff', w: 2, g: 8 }, specs: { c: '#ffffff', w: 1, r: 14 }, bio: { c: '#ffffff', w: 1, r: 14 }, links: { c: '#ffffff', w: 1, r: 16, g: 6 } },
    none:   { panel: { off: 1 }, banner: { off: 1 }, avatar: { off: 1 }, name: { off: 1 }, specs: { off: 1 }, bio: { off: 1 }, links: { off: 1 } }
  };
  var GL = [], selId = null, ready = false, shell, back, front, bgEl, st, glInit = false, drag = null;
  function el(t, id) { var e = document.createElement(t); if (id) e.id = id; return e; }
  function init() {
    if (ready) return; shell = document.getElementById('shell'); if (!shell) return; ready = true;
    st = el('style', 'bdr-style'); document.head.appendChild(st);
    var css = el('style'); css.textContent = '.gl{position:absolute;inset:0;pointer-events:none}.gl-front{z-index:30}.gl .gi{position:absolute;display:block;height:auto;max-width:none;pointer-events:none;user-select:none}#gl-bg{position:fixed;inset:0;z-index:0;pointer-events:none}'
      + '.gedit .gl .gi{pointer-events:auto;cursor:grab;touch-action:none;outline:1px dashed #fff9}.gedit .gl .gi.sel{outline:2px solid #ff5d7e}';
    document.head.appendChild(css);
    bgEl = el('div', 'gl-bg'); document.body.insertBefore(bgEl, document.body.firstChild);
    back = el('div', 'gl-back'); back.className = 'gl gl-back'; front = el('div', 'gl-front'); front.className = 'gl gl-front';
    shell.insertBefore(back, shell.firstChild); shell.appendChild(front);
    if (GEDIT) { document.documentElement.classList.add('gedit'); editor(); }
  }
  function cssUrl(u) { return 'url("' + String(u).replace(/["\\()\n\r]/g, '') + '")'; }
  function rule(k, o) {
    var s = SEL[k];
    if (o.off) return k === 'avatar' ? '.avatar::before{display:none!important}.avatar{background:transparent!important;padding:0!important}.avatar-inner{border:0!important}' : s + '{border:0!important;box-shadow:none!important}';
    var c = HX.test(o.c) ? o.c : 'var(--accent)', w = Math.max(0, Math.min(12, Number(o.w) || 0)), d = '';
    var sty = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge'].indexOf(o.s) > -1 ? o.s : 'solid';
    var img = o.img && SRC.test(o.img) ? o.img : '';
    if (img) d += 'border:' + (w || 8) + 'px solid transparent!important;border-image:' + cssUrl(img) + ' 30 round!important;';
    else if (w) d += 'border:' + w + 'px ' + (sty === 'double' && w < 3 ? 'solid' : sty) + ' ' + c + '!important;';
    if (o.r !== undefined && o.r !== '' && !img) { var r = Math.max(0, Math.min(999, Number(o.r) || 0)); d += 'border-radius:' + r + 'px!important;'; }
    if (Number(o.g) > 0) d += 'box-shadow:0 0 ' + Math.min(40, Number(o.g)) + 'px ' + c + '!important;';
    if ((k === 'bio' || k === 'name') && (w || img)) d += 'padding:8px 12px!important;';
    if (!d) return '';
    var out = s + '{' + d + '}';
    if (k === 'avatar') {
      if (w || img) out += '.avatar::before{display:none!important}.avatar{background:transparent!important;padding:3px!important}';
      if (o.r !== undefined && o.r !== '') out += '.avatar-inner{border-radius:' + Math.max(0, Math.min(999, Number(o.r) || 0)) + 'px!important}';
    }
    return out;
  }
  function borders(p) {
    var tpl = TPL[p.bdTpl] || {}, man = p.bd && typeof p.bd === 'object' ? p.bd : {}, css = '';
    Object.keys(SEL).forEach(function (k) { var o = Object.assign({}, tpl[k] || {}, man[k] || {}); if (Object.keys(o).length) css += rule(k, o); });
    st.textContent = css;
  }
  function gifs(list) {
    bgEl.textContent = ''; back.textContent = ''; front.textContent = '';
    (Array.isArray(list) ? list : []).forEach(function (g) {
      if (!g || !SRC.test(g.src || '')) return;
      var im = new Image(); im.alt = ''; im.draggable = false; im.src = g.src; im.dataset.id = g.id;
      var op = g.o == null ? 1 : Number(g.o);
      if (g.z === 'bg') { im.style.cssText = 'width:100%;height:100%;object-fit:cover;opacity:' + op; bgEl.appendChild(im); return; }
      im.className = 'gi' + (g.id === selId ? ' sel' : '');
      im.style.cssText = 'left:' + (Number(g.x) || 0) + '%;top:' + (Number(g.y) || 0) + 'px;width:' + (Number(g.w) || 30) + '%;opacity:' + op + ';transform:rotate(' + (Number(g.r) || 0) + 'deg)';
      (g.z === 'back' ? back : front).appendChild(im);
    });
  }
  window.__starExtras = function (p) {
    init(); if (!ready) return; borders(p);
    if (GEDIT) { if (!glInit) { GL = JSON.parse(JSON.stringify(Array.isArray(p.gifs) ? p.gifs : [])); glInit = true; ui(); } gifs(GL); }
    else gifs(p.gifs);
  };
  /* ---------- GIF editor (?gifedit=1) ---------- */
  var bar;
  function post() { try { parent.postMessage({ maple: 'gifs', gifs: GL }, location.origin); } catch (e) {} }
  function cur() { return GL.filter(function (g) { return g.id === selId; })[0]; }
  function editor() {
    bar = el('div', 'gbar');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#1c1316;color:#f4e9ec;border-top:1px solid #3a2a30;padding:10px;font:13px system-ui,sans-serif;max-height:50vh;overflow:auto';
    document.body.appendChild(bar);
    var f = el('input'); f.type = 'file'; f.accept = 'image/gif,image/png,image/webp,image/jpeg'; f.hidden = true; f.id = 'gfile'; document.body.appendChild(f);
    f.addEventListener('change', function () {
      var file = f.files[0]; f.value = ''; if (!file) return;
      if (file.size > 380000) { alert('That file is over 380 KB. Use a smaller GIF, or paste a link to it instead.'); return; }
      var r = new FileReader(); r.onload = function () { add(String(r.result)); }; r.readAsDataURL(file);
    });
    bar.addEventListener('click', onBar); bar.addEventListener('input', onBarInput);
    document.addEventListener('pointerdown', down); document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  }
  function add(src) {
    if (GL.length >= 8) { alert('You can add up to 8 GIFs.'); return; }
    if (!SRC.test(src)) { alert('Use a link that starts with https://, or upload a file.'); return; }
    var g = { id: 'g' + Math.random().toString(36).slice(2, 8), src: src, x: 30, y: Math.round(window.scrollY + 120), w: 30, r: 0, o: 1, z: 'front' };
    GL.push(g); selId = g.id; gifs(GL); ui(); post();
  }
  function ui() {
    if (!bar) return; var g = cur();
    var h = '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><b style="margin-right:auto">GIFs</b>'
      + '<input id="gurl" placeholder="Paste a GIF link (https://…)" style="flex:1;min-width:150px;padding:6px;border-radius:8px;border:1px solid #4a363d;background:#2a1d22;color:inherit">'
      + '<button data-a="addurl" class="gb">Add link</button><button data-a="upload" class="gb">Upload</button><button data-a="done" class="gb" style="background:#ff5d7e;color:#1a0a0e;font-weight:700">Done</button></div>';
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + GL.map(function (x, i) { return '<button data-a="pick" data-id="' + x.id + '" class="gb"' + (x.id === selId ? ' style="outline:2px solid #ff5d7e"' : '') + '>' + (i + 1) + (x.z === 'bg' ? ' (bg)' : '') + '</button>'; }).join('') + '</div>';
    if (g) h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">'
      + '<label>Layer<select data-k="z" class="gi2"><option value="front"' + (g.z === 'front' ? ' selected' : '') + '>In front of everything</option><option value="back"' + (g.z === 'back' ? ' selected' : '') + '>Behind the card</option><option value="bg"' + (g.z === 'bg' ? ' selected' : '') + '>Page background</option></select></label>'
      + '<label>Size<input type="range" data-k="w" min="3" max="100" value="' + g.w + '"></label><label>Opacity<input type="range" data-k="o" min="0.05" max="1" step="0.05" value="' + (g.o == null ? 1 : g.o) + '"></label><label>Rotate<input type="range" data-k="r" min="-180" max="180" value="' + g.r + '"></label>'
      + '<button data-a="del" class="gb" style="align-self:end">Delete this GIF</button></div><p style="opacity:.6;margin:8px 0 0">Drag a GIF on the card to move it.</p>';
    else h += '<p style="opacity:.6;margin:0">Add a GIF, then drag it anywhere. Choose whether it sits behind the card, in front of the buttons, or fills the whole page.</p>';
    bar.innerHTML = h;
    bar.querySelectorAll('.gb').forEach(function (b) { b.style.cssText += ';font:inherit;color:inherit;background:#2a1d22;border:1px solid #4a363d;border-radius:8px;padding:6px 10px;cursor:pointer'; });
    bar.querySelectorAll('select,input[type=range]').forEach(function (i) { i.style.cssText = 'width:100%;display:block;margin-top:2px;font:inherit;color:#f4e9ec;background:#2a1d22;border:1px solid #4a363d;border-radius:6px'; });
    var b2 = bar.querySelector('[data-a=done]'); if (b2) b2.style.cssText += ';background:#ff5d7e;color:#1a0a0e;font-weight:700';
  }
  function onBar(e) {
    var b = e.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a;
    if (a === 'addurl') { var u = document.getElementById('gurl').value.trim(); if (u) add(u); }
    else if (a === 'upload') document.getElementById('gfile').click();
    else if (a === 'done') { try { parent.postMessage({ maple: 'bld-close' }, location.origin); } catch (x) {} }
    else if (a === 'pick') { selId = b.dataset.id; gifs(GL); ui(); }
    else if (a === 'del') { GL = GL.filter(function (g) { return g.id !== selId; }); selId = null; gifs(GL); ui(); post(); }
  }
  function onBarInput(e) {
    var t = e.target, g = cur(); if (!g || !t.dataset.k) return;
    g[t.dataset.k] = t.tagName === 'SELECT' ? t.value : Number(t.value);
    gifs(GL); if (t.tagName === 'SELECT') ui(); post();
  }
  function down(e) {
    var im = e.target.closest && e.target.closest('.gi'); if (!GEDIT || !im) return;
    selId = im.dataset.id; var g = cur(); if (!g) return;
    document.querySelectorAll('.gi.sel').forEach(function (n) { n.classList.remove('sel'); }); im.classList.add('sel');
    drag = { g: g, im: im, sx: e.clientX, sy: e.clientY, ox: g.x, oy: g.y, W: shell.getBoundingClientRect().width || 400 }; ui(); e.preventDefault();
  }
  function move(e) {
    if (!drag) return;
    drag.g.x = Math.round((drag.ox + (e.clientX - drag.sx) / drag.W * 100) * 10) / 10; drag.g.y = Math.round(drag.oy + (e.clientY - drag.sy));
    drag.im.style.left = drag.g.x + '%'; drag.im.style.top = drag.g.y + 'px';
  }
  function up() { if (drag) { drag = null; post(); } }
})();
