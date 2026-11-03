/* Maple ID · Free-canvas builder: opens the drag-and-drop editor full screen and syncs it into the Studio form. */
(function () {
  'use strict';
  var overlay = null, form = null;
  function sync() {
    var f = document.getElementById('editor'); if (!f) return;
    if (f !== form) { form = f; window.__bld = null; }
    var r = f.querySelector('input[name=layout]:checked');
    var fs = f.querySelector('[data-builder-only]');
    if (fs && !fs.querySelector('#bld-inbox')) {
      var b = document.createElement('button'); b.type = 'button'; b.id = 'bld-inbox'; b.className = 'btn'; b.style.marginLeft = '8px';
      b.innerHTML = '<i class="fa-solid fa-inbox"></i> Messages'; fs.appendChild(b);
    }
    f.querySelectorAll('[data-builder-only]').forEach(function (e) { e.hidden = !(r && r.value === 'builder'); });
  }
  function close() { if (overlay) { overlay.remove(); overlay = null; document.documentElement.style.overflow = ''; } }
  function open() {
    var f = document.getElementById('editor'); if (!f || !window.__dgGet) return;
    close();
    overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:#0c0708';
    var fr = document.createElement('iframe');
    fr.title = 'Page builder'; fr.src = '/builder/index.html?edit=1';
    fr.style.cssText = 'border:0;width:100%;height:100%;display:block';
    fr.addEventListener('load', function () { try { fr.contentWindow.renderCard(window.__dgGet()); } catch (e) {} });
    overlay.appendChild(fr); document.body.appendChild(overlay); document.documentElement.style.overflow = 'hidden';
  }
  function el(tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt) e.textContent = txt; return e; }
  function inbox() {
    var ov = el('div', 'position:fixed;inset:0;z-index:100000;background:#0c0708ee;overflow:auto;padding:16px');
    var box = el('div', 'max-width:560px;margin:0 auto;color:#f4e9ec;font:15px system-ui,sans-serif');
    var top = el('div', 'display:flex;align-items:center;gap:8px;margin-bottom:12px'), h = el('b', 'flex:1;font-size:18px', 'Anonymous messages');
    var x = el('button', 'font:inherit;padding:6px 12px;border-radius:8px;border:1px solid #555;background:#2a1d22;color:inherit;cursor:pointer', 'Close');
    x.onclick = function () { ov.remove(); }; top.append(h, x); box.append(top);
    var list = el('div', '', 'Loading…'); box.append(list); ov.append(box); document.body.append(ov);
    fetch('/api/messages').then(function (r) { return r.json(); }).then(function (d) {
      list.textContent = ''; var ms = (d && d.messages) || [];
      if (!ms.length) { list.textContent = d && d.error ? d.error : 'No messages yet.'; return; }
      ms.forEach(function (m) {
        var c = el('div', 'background:#1c1316;border:1px solid #3a2a30;border-left:4px solid #ff5d7e;border-radius:10px;padding:10px;margin-bottom:10px');
        c.append(el('small', 'opacity:.6', new Date(m.created_at).toLocaleString()));
        if (m.body) c.append(el('div', 'white-space:pre-wrap;margin-top:4px', m.body));
        if (/^data:image\/(jpeg|png);base64,/.test(m.drawing || '')) { var im = el('img', 'display:block;max-width:100%;margin-top:6px;background:#fff;border-radius:8px'); im.alt = 'Drawing'; im.src = m.drawing; c.append(im); }
        var del = el('button', 'margin-top:8px;font:inherit;padding:4px 10px;border-radius:8px;border:1px solid #555;background:transparent;color:inherit;cursor:pointer', 'Delete');
        del.onclick = function () { fetch('/api/messages/' + m.id, { method: 'DELETE' }).then(function () { c.remove(); }); };
        c.append(del); list.append(c);
      });
    }).catch(function () { list.textContent = 'Could not load messages.'; });
  }
  document.addEventListener('click', function (e) { if (e.target.closest('#bld-inbox')) inbox(); });
  window.addEventListener('message', function (e) {
    var d = e.data; if (e.origin !== location.origin || !d) return;
    if (d.maple === 'bld' && Array.isArray(d.blocks)) {
      window.__bld = { blocks: d.blocks, page: d.page };
      var f = document.getElementById('editor'); if (f) f.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (d.maple === 'bld-close') close();
  });
  document.addEventListener('click', function (e) { if (e.target.closest('#bld-open')) open(); });
  document.addEventListener('change', function (e) { if (e.target && e.target.name === 'layout') sync(); });
  new MutationObserver(sync).observe(document.documentElement, { childList: true, subtree: true });
})();
