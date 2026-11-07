/* M-ID · Studio → Look → "Card frame" + "Avatar decoration" (v36-21)
 * The picks ride along with the Studio's normal Publish through window.__dkFrame() (same way as the Glass background),
 * and are saved on the profile as frame / avatarDeco / avatarDecoColor. Cards read them via data-frame / data-adeco. */
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var HEX = /^#[0-9a-f]{6}$/i, form = null, st = null;
  var F = (window.dgFrames && dgFrames.frames) || [['', 'None'], ['dragon', 'Jade dragon'], ['phoenix', 'Solar phoenix'], ['celestial', 'Celestial guardian'], ['tech', 'Tech panel'], ['cyber', 'Cyber core'], ['reactor', 'Neon reactor'], ['kitty', 'Peeking kitty'], ['cloudkitty', 'Cloud kitty'], ['starbunny', 'Star bunny'], ['mooncat', 'Moonlight cat'], ['garden', 'Jade garden'], ['neon', 'Neon edge']];
  var D = (window.dgFrames && dgFrames.decos) || [['', 'None'], ['neon', 'Neon ring'], ['holo', 'Holo spin'], ['dots', 'Dotted orbit'], ['sparkle', 'Sparkles'], ['ears', 'Cat ears'], ['halo', 'Halo'], ['wreath', 'Leaf wreath'], ['glitch', 'Glitch']];
  var SUB = { '': 'Plain card', dragon: 'Jade scales and a moving guardian', phoenix: 'Layered solar wings and ember light', celestial: 'Astral crest, orbit lines and starlight', kitty: 'Ears, paws and a tail', cloudkitty: 'Soft cloud character and pastel trim', starbunny: 'Dreamy plush details and starlight', mooncat: 'Midnight blue, stars and sleepy cats', tech: 'Metal device edge', cyber: 'Glass alloy and a powered core', reactor: 'Energy ring and illuminated hardware', garden: 'Vines and a gold line', neon: 'Animated glow' };
  var ICON = { '': 'fa-ban', dragon: 'fa-dragon', phoenix: 'fa-fire', celestial: 'fa-star', kitty: 'fa-cat', cloudkitty: 'fa-cloud', starbunny: 'fa-wand-magic-sparkles', mooncat: 'fa-moon', tech: 'fa-microchip', cyber: 'fa-microchip', reactor: 'fa-bolt', garden: 'fa-leaf', neon: 'fa-bolt' };

  function dirty() { if (form) form.dispatchEvent(new Event('input', { bubbles: true })); }
  function snapshot() { return { frame: st.frame, avatarDeco: st.deco, avatarDecoColor: HEX.test(st.color) ? st.color : '' }; }

  function css() {
    if (document.getElementById('dkf-css')) return;
    var s = document.createElement('style'); s.id = 'dkf-css';
    s.textContent = '.dkf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:8px;margin:8px 0}.dkf-group{margin:12px 0 16px}.dkf-group-title{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;opacity:.62;margin:12px 2px 6px}.dkf-opt span{min-height:76px;transition:transform .18s,border-color .18s,background .18s}.dkf-opt:hover span{transform:translateY(-2px)}'
      + '.dkf-opt{position:relative;display:flex;cursor:pointer}.dkf-opt input{position:absolute;opacity:0;inset:0}'
      + '.dkf-opt span{display:flex;flex:1;flex-direction:column;gap:2px;padding:10px;border-radius:12px;border:1.5px solid color-mix(in srgb,currentColor 18%,transparent);background:color-mix(in srgb,currentColor 4%,transparent)}'
      + '.dkf-preview{width:100%;height:82px;object-fit:contain;border-radius:8px;background:radial-gradient(ellipse at center,color-mix(in srgb,var(--accent,#ff5d7e) 12%,transparent),transparent 72%);margin-bottom:5px}.dkf-opt i{font-size:18px;margin-bottom:4px;color:var(--accent,#ff5d7e)}.dkf-opt b{font-size:13px}.dkf-opt small{opacity:.65;font-size:11px;line-height:1.3}'
      + '.dkf-opt input:checked+span{border-color:var(--accent,#ff5d7e);background:color-mix(in srgb,var(--accent,#ff5d7e) 14%,transparent)}'
      + '.dkf-opt input:focus-visible+span{outline:2px solid var(--accent,#ff5d7e);outline-offset:2px}'
      + '.dkf-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.dkf-row select{flex:1;min-width:140px}.dkf-row input[type=color]{width:44px;height:36px;padding:2px}';
    document.head.appendChild(s);
  }
  function paint() {
    var box = form && form.querySelector('[data-dkframe]'); if (!box) return;
    var groups = [
      { title: 'Fantasy · Mythic & celestial', ids: ['', 'dragon', 'phoenix', 'celestial'] },
      { title: 'Futuristic · Tech & energy', ids: ['tech', 'cyber', 'reactor', 'neon'] },
      { title: 'Cute · Soft & playful', ids: ['kitty', 'cloudkitty', 'starbunny', 'mooncat'] },
      { title: 'Nature · Botanical', ids: ['garden'] }
    ];
    box.innerHTML = groups.map(function (g) {
      var items = F.filter(function (f) { return g.ids.indexOf(f[0]) !== -1; });
      return '<section class="dkf-group"><div class="dkf-group-title">' + esc(g.title) + '</div><div class="dkf-grid" role="radiogroup" aria-label="' + esc(g.title) + '">' + items.map(function (f) {
        var preview = f[0] ? '<img class="dkf-preview" src="/assets/frame-art/' + esc(f[0]) + '.png" alt="" loading="lazy">' : '';
        return '<label class="dkf-opt"><input type="radio" name="dkf-frame" value="' + esc(f[0]) + '"' + (st.frame === f[0] ? ' checked' : '') + '><span>' + preview + '<i class="fa-solid ' + (ICON[f[0]] || 'fa-star') + '" aria-hidden="true"></i><b>' + esc(f[1]) + '</b><small>' + esc(SUB[f[0]] || '') + '</small></span></label>';
      }).join('') + '</div></section>';
    }).join('') + '<p class="hint">Works on Basic, Glass and Star cards. Motion respects reduced-motion settings. Your selection is saved when you publish.</p>'
      + '<div class="field"><label>Avatar decoration <small>drawn around a round avatar</small></label><div class="dkf-row"><select data-dkf-deco aria-label="Avatar decoration">'
      + D.map(function (d) { return '<option value="' + esc(d[0]) + '"' + (st.deco === d[0] ? ' selected' : '') + '>' + esc(d[1]) + '</option>'; }).join('')
      + '</select><input type="color" data-dkf-color value="' + (HEX.test(st.color) ? st.color : '#ff5d7e') + '" aria-label="Decoration colour"></div></div>';
  }
  function bind() {
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'dkf-frame') { st.frame = t.value; dirty(); }
      else if (t.matches && t.matches('[data-dkf-deco]')) { st.deco = t.value; dirty(); }
      else if (t.matches && t.matches('[data-dkf-color]')) { st.color = t.value; dirty(); }
    });
    form.addEventListener('input', function (e) { var t = e.target; if (t.matches && t.matches('[data-dkf-color]')) { st.color = t.value; } });
  }
  function init(f) {
    form = f; window.__dkFrame = null; css();
    var cur = window.__dgGet ? window.__dgGet() : {};
    st = {
      frame: F.some(function (x) { return x[0] && x[0] === cur.frame; }) ? cur.frame : '',
      deco: D.some(function (x) { return x[0] && x[0] === cur.avatarDeco; }) ? cur.avatarDeco : '',
      color: HEX.test(cur.avatarDecoColor || '') ? cur.avatarDecoColor : ''
    };
    window.__dkFrame = snapshot; paint(); bind();
  }
  function check() {
    var f = document.getElementById('editor');
    if (f && f !== form && f.querySelector('[data-dkframe]') && window.__dgGet) init(f);
    if (!f && form) { form = null; window.__dkFrame = null; }
  }
  new MutationObserver(function () { clearTimeout(check.t); check.t = setTimeout(check, 30); }).observe(document.body, { childList: true, subtree: true });
  check();
})();
