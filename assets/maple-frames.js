/* M-ID · card frames + avatar decorations (v36-21)
 * Any element with data-frame="dragon|kitty|tech|garden|neon" gets an animated frame drawn around it; any element with
 * data-adeco="neon|holo|dots|sparkle|ears|halo|wreath|glitch" (+ optional data-adeco-c="#rrggbb") gets a ring/ears/halo.
 * All artwork is original SVG drawn here. The frame is a fixed, click-through layer that follows the element, so it works
 * on the Basic, Glass and Star cards without changing their layout and is never clipped by their overflow.
 * window.dgFrames = { frames, decos, decoSVG(kind,color) }  (the Studio picker and the page builder reuse the lists). */
(function () {
  'use strict';
  if (window.dgFrames) return;
  var RM = false; try { RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(hover: none)').matches; } catch (e) {}   /* v36-23: touch screens show the frames still */
  var NS = 'http://www.w3.org/2000/svg', HEX = /^#[0-9a-f]{6}$/i, uid = 0;
  var FRAMES = [['', 'None'], ['dragon', 'Jade dragon'], ['phoenix', 'Solar phoenix'], ['celestial', 'Celestial guardian'], ['tech', 'Tech panel'], ['cyber', 'Cyber core'], ['reactor', 'Neon reactor'], ['kitty', 'Peeking kitty'], ['cloudkitty', 'Cloud kitty'], ['starbunny', 'Star bunny'], ['mooncat', 'Moonlight cat'], ['garden', 'Jade garden'], ['neon', 'Neon edge']];
  var DECOS = [['', 'None'], ['neon', 'Neon ring'], ['holo', 'Holo spin'], ['dots', 'Dotted orbit'], ['sparkle', 'Sparkles'], ['ears', 'Cat ears'], ['halo', 'Halo'], ['wreath', 'Leaf wreath'], ['glitch', 'Glitch']];
  function f1(n) { return Math.round(n * 10) / 10; }
  function rnd(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  function anim(s) { return RM ? '' : s; }

  /* ───── shared: points along a rounded rectangle, with outward normals ───── */
  function loop(x0, y0, w, h, r, step) {
    r = Math.max(2, Math.min(r, w / 2 - 1, h / 2 - 1));
    var segs = [
      ['l', x0 + w - r, y0 + h, x0 + r, y0 + h, 0, 1],            /* bottom, right → left */
      ['a', x0 + r, y0 + h - r, 90, 180],                           /* bottom-left corner */
      ['l', x0, y0 + h - r, x0, y0 + r, -1, 0],                     /* left, up */
      ['a', x0 + r, y0 + r, 180, 270],                              /* top-left corner */
      ['l', x0 + r, y0, x0 + w - r, y0, 0, -1],                     /* top, left → right */
      ['a', x0 + w - r, y0 + r, 270, 360]                           /* top-right corner */
    ], pts = [], s = 0, i, k, n, sg, a, t, len, tx, ty;
    for (i = 0; i < segs.length; i++) {
      sg = segs[i];
      if (sg[0] === 'l') {
        len = Math.hypot(sg[3] - sg[1], sg[4] - sg[2]); n = Math.max(1, Math.round(len / step)); tx = (sg[3] - sg[1]) / len; ty = (sg[4] - sg[2]) / len;
        for (k = 0; k < n; k++) { t = k / n; pts.push({ x: sg[1] + (sg[3] - sg[1]) * t, y: sg[2] + (sg[4] - sg[2]) * t, nx: sg[5], ny: sg[6], tx: tx, ty: ty, s: s + len * t }); }
        s += len;
      } else {
        len = r * Math.PI / 2; n = Math.max(2, Math.round(len / step));
        for (k = 0; k < n; k++) {
          t = k / n; a = (sg[3] + (sg[4] - sg[3]) * t) * Math.PI / 180;
          pts.push({ x: sg[1] + r * Math.cos(a), y: sg[2] + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a), tx: -Math.sin(a), ty: Math.cos(a), s: s + len * t });
        }
        s += len;
      }
    }
    pts.total = s; return pts;
  }
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    return 'M' + (x + r) + ' ' + y + 'H' + (x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) + 'V' + (y + h - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) + 'H' + (x + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) + 'V' + (y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + 'Z';
  }
  function star(x, y, sc, delay, fill) {
    return '<g transform="translate(' + f1(x) + ' ' + f1(y) + ') scale(' + sc + ')"><path d="M0-6Q0 0 6 0Q0 0 0 6Q0 0-6 0Q0 0 0-6Z" fill="' + (fill || '#fff') + '">'
      + anim('<animateTransform attributeName="transform" type="scale" values=".3;1.15;.3" dur="2s" begin="' + delay + 's" repeatCount="indefinite"/><animate attributeName="opacity" values=".2;1;.2" dur="2s" begin="' + delay + 's" repeatCount="indefinite"/>') + '</path></g>';
  }

  /* ───── the jade dragon (animated every frame) ───── */
  var DR = { mt: 92, ml: 34, mr: 34, mb: 48 };
  function dragonStatic(c) {
    var id = c.id;
    return '<defs><linearGradient id="dg' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ad99b"/><stop offset="1" stop-color="#1f8a58"/></linearGradient>'
      + '<linearGradient id="dh' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#52d494"/><stop offset="1" stop-color="#1b7a50"/></linearGradient>'
      + '<clipPath id="dc' + id + '"><path clip-rule="evenodd" d="M-200 -200H' + (c.W + 200) + 'V' + (c.H + 200) + 'H-200Z' + rr(c.x0, c.y0, c.w, c.h, c.r) + '"/></clipPath></defs>'
      + '<g class="dr-glow" style="filter:drop-shadow(0 0 6px rgba(90,255,170,.35))">'
      + '<g clip-path="url(#dc' + id + ')"><path data-dr="tail" fill="#f6f2e6" stroke="#d9d2bd" stroke-width=".8" stroke-linejoin="round"/><path data-dr="body" fill="url(#dg' + id + ')" stroke="#0f5a3a" stroke-width="1.3" stroke-linejoin="round"/>'
      + '<path data-dr="belly" fill="#a8ecc2" opacity=".55"/><path data-dr="rungs" fill="none" stroke="#0f5a3a" stroke-width="1" opacity=".35"/>'
      + '<path data-dr="gold" fill="#e2c25a" opacity=".92"/><path data-dr="mane" fill="#f6f2e6" stroke="#d9d2bd" stroke-width=".7" stroke-linejoin="round"/></g>'
      + '<g data-dr="front"></g></g>';
  }
  function dragonHead(id) {
    return '<g>'
      + '<g fill="#f6f2e6" stroke="#d9d2bd" stroke-width=".8" stroke-linejoin="round">'
      + '<path d="M-28 -18C-50 -34-66 -26-78 -38-70 -16-62-10-76 0-58 2-52 10-66 24-46 16-36 14-28 6Z">' + anim('<animateTransform attributeName="transform" type="rotate" values="-3 -30 0;4 -30 0;-3 -30 0" dur="2.6s" repeatCount="indefinite"/>') + '</path>'
      + '<path d="M-24 -24C-40-52-22-62-36-72-12-64-4-48-10-30Z">' + anim('<animateTransform attributeName="transform" type="rotate" values="3 -20 -20;-4 -20 -20;3 -20 -20" dur="3.1s" repeatCount="indefinite"/>') + '</path></g>'
      + '<path d="M-8-26C-14-46-34-58-54-54" fill="none" stroke="#b78f36" stroke-width="6.5" stroke-linecap="round"/><path d="M-8-26C-14-46-34-58-54-54" fill="none" stroke="#f3d88a" stroke-width="2.4" stroke-linecap="round"/>'
      + '<path d="M-20-34C-24-44-34-48-44-44" fill="none" stroke="#b78f36" stroke-width="4.5" stroke-linecap="round"/><path d="M-20-34C-24-44-34-48-44-44" fill="none" stroke="#f3d88a" stroke-width="1.6" stroke-linecap="round"/>'
      + '<g>' + anim('<animateTransform attributeName="transform" type="rotate" values="0 -6 8;11 -6 8;0 -6 8;0 -6 8" keyTimes="0;.35;.7;1" dur="3.8s" repeatCount="indefinite"/>')
      + '<path d="M-10 8C10 18 36 18 58 8 66 6 68 12 60 18 44 34 12 36-10 26Z" fill="#1c7d51" stroke="#0f5a3a" stroke-width="1.4" stroke-linejoin="round"/><path d="M44 13l3 7 3-8zM30 15l3 7 3-8zM16 16l3 6 3-7z" fill="#fff"/></g>'
      + '<path d="M-36 2C-38-22-10-36 20-28 38-24 52-18 68-14 78-11 78 0 70 3 60 6 52 6 44 10 30 16 6 20-14 18-28 16-36 12-36 2Z" fill="url(#dh' + id + ')" stroke="#0f5a3a" stroke-width="1.6" stroke-linejoin="round"/>'
      + '<path d="M-24-6l6-6 6 6-6 6zM-9-14l5-5 5 5-5 5zM-14 6l5-5 5 5-5 5z" fill="#e2c25a" opacity=".9"/>'
      + '<ellipse cx="66" cy="-6" rx="2.4" ry="1.6" fill="#0f5a3a"/><path d="M4-17C12-24 24-22 30-14" fill="none" stroke="#0f5a3a" stroke-width="3.2" stroke-linecap="round"/>'
      + '<ellipse cx="17" cy="-9" rx="7.4" ry="5.2" fill="#ffe27a" style="filter:drop-shadow(0 0 3px #ffe27a)"/><ellipse cx="18" cy="-9" rx="2" ry="4.6" fill="#1a0a05"/>'
      + '<ellipse cx="17" cy="-9" rx="8" ry="' + (RM ? 0 : 5.8) + '" fill="#2dae72">' + anim('<animate attributeName="ry" values="0;0;5.8;0;0" keyTimes="0;.9;.93;.96;1" dur="4.6s" repeatCount="indefinite"/>') + '</ellipse>'
      + '<g>' + anim('<animateTransform attributeName="transform" type="rotate" values="-6 64 -2;7 64 -2;-6 64 -2" dur="2.8s" repeatCount="indefinite"/>') + '<path d="M64-2C88-12 98 8 128-4" fill="none" stroke="#f6f2e6" stroke-width="2.4" stroke-linecap="round"/></g>'
      + '<g>' + anim('<animateTransform attributeName="transform" type="rotate" values="6 60 4;-7 60 4;6 60 4" dur="3.3s" repeatCount="indefinite"/>') + '<path d="M60 4C84 14 92-2 120 10" fill="none" stroke="#f6f2e6" stroke-width="2.4" stroke-linecap="round"/></g>'
      + (RM ? '' : [0, 1, 2, 3, 4].map(function (i) {
        return '<circle cx="' + (62 + i * 4) + '" cy="14" r="' + (1.4 + (i % 2)) + '" fill="#ffd98a"><animate attributeName="cy" values="14;-34" dur="2.4s" begin="' + (i * .5) + 's" repeatCount="indefinite"/><animate attributeName="cx" values="' + (62 + i * 4) + ';' + (70 + i * 9) + '" dur="2.4s" begin="' + (i * .5) + 's" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.95;0" dur="2.4s" begin="' + (i * .5) + 's" repeatCount="indefinite"/></circle>';
      }).join(''))
      + '</g>';
  }
  function dragonTick(c, t) {
    var P = c.pts, n = P.length, i, u, d, w, p = [], q, sgn, L = c.Lend, k = 2 * Math.PI / 150, ph = t * 1.5;
    var kk = c.k, last = n - 1;
    for (i = 0; i < n; i++) {
      q = P[i]; u = q.s / L;
      var A = 20 + 6 * Math.sin(q.s / 310 + 1);
      d = 5 + A * Math.sin(k * q.s - ph);
      var f = Math.max(0, Math.min(1, (u - 0.86) / 0.14)); f = f * f * (3 - 2 * f);
      d = d * (1 - f) + 34 * f;
      var f0 = Math.max(0, 1 - u / 0.05); d = d * (1 - f0) + 12 * f0;
      w = 3 + 20 * Math.pow(Math.min(1, u * 1.05), 0.55);
      p.push({ x: q.x + q.nx * d, y: q.y + q.ny * d, w: w });
    }
    /* tangents + sides */
    for (i = 0; i < n; i++) {
      var a = p[Math.max(0, i - 1)], b = p[Math.min(last, i + 1)], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
      p[i].tx = tx / l; p[i].ty = ty / l; p[i].px = -p[i].ty; p[i].py = p[i].tx;
    }
    sgn = (p[Math.floor(n / 2)].px * P[Math.floor(n / 2)].nx + p[Math.floor(n / 2)].py * P[Math.floor(n / 2)].ny) >= 0 ? 1 : -1;
    var L1 = [], R1 = [], B1 = [], B2 = [], gold = '', rungs = '', mane = '';
    for (i = 0; i < n; i++) {
      q = p[i]; var hw = q.w / 2;
      L1.push(f1(q.x + q.px * hw) + ' ' + f1(q.y + q.py * hw)); R1.push(f1(q.x - q.px * hw) + ' ' + f1(q.y - q.py * hw));
      B1.push(f1(q.x + q.px * hw * .1) + ' ' + f1(q.y + q.py * hw * .1)); B2.push(f1(q.x - q.px * hw * .62) + ' ' + f1(q.y - q.py * hw * .62));
      if (i % 3 === 1 && i > 3) { rungs += 'M' + f1(q.x - q.px * hw * .62) + ' ' + f1(q.y - q.py * hw * .62) + 'L' + f1(q.x + q.px * hw * .1) + ' ' + f1(q.y + q.py * hw * .1); }
      if (i % 4 === 2 && i > 5 && i < n - 4) { var sz = q.w * .27; gold += 'M' + f1(q.x - q.tx * sz * 1.3) + ' ' + f1(q.y - q.ty * sz * 1.3) + 'L' + f1(q.x + q.px * sz) + ' ' + f1(q.y + q.py * sz) + 'L' + f1(q.x + q.tx * sz * 1.3) + ' ' + f1(q.y + q.ty * sz * 1.3) + 'L' + f1(q.x - q.px * sz) + ' ' + f1(q.y - q.py * sz) + 'Z'; }
      if (i % 3 === 0 && i > 4 && i < n - 3) {
        var ox = q.px * sgn, oy = q.py * sgn, len = 5 + q.w * (.75 + .25 * Math.sin(ph * 1.3 + i * .6)), bx = q.x + ox * hw, by = q.y + oy * hw;
        mane += 'M' + f1(bx - q.tx * 3.4) + ' ' + f1(by - q.ty * 3.4) + 'L' + f1(bx + ox * len - q.tx * len * .75) + ' ' + f1(by + oy * len - q.ty * len * .75) + 'L' + f1(bx + q.tx * 3.4) + ' ' + f1(by + q.ty * 3.4) + 'Z';
      }
    }
    var e = p[last], s0 = p[0], tail = '';
    for (i = 0; i < 4; i++) { var ang = (i - 1.5) * .5, ca = Math.cos(ang), sa = Math.sin(ang), dx = -s0.tx, dy = -s0.ty, rx = dx * ca - dy * sa, ry = dx * sa + dy * ca; tail += 'M' + f1(s0.x) + ' ' + f1(s0.y) + 'L' + f1(s0.x + rx * 20 - ry * 3) + ' ' + f1(s0.y + ry * 20 + rx * 3) + 'L' + f1(s0.x + rx * 13 + ry * 5) + ' ' + f1(s0.y + ry * 13 - rx * 5) + 'Z'; }
    var S = c.refs;
    S.tail.setAttribute('d', tail);
    S.body.setAttribute('d', 'M' + L1.join('L') + 'L' + R1.reverse().join('L') + 'Z');
    S.belly.setAttribute('d', 'M' + B1.join('L') + 'L' + B2.reverse().join('L') + 'Z');
    S.rungs.setAttribute('d', rungs); S.gold.setAttribute('d', gold); S.mane.setAttribute('d', mane);
    /* head: faces along the last tangent, bobs a little */
    var ang2 = Math.atan2(e.ty, e.tx) * 180 / Math.PI, bob = RM ? 0 : Math.sin(t * 1.5) * 3, sc = c.hs;
    S.head.setAttribute('transform', 'translate(' + f1(e.x + e.tx * 6) + ' ' + f1(e.y + e.ty * 6 + bob) + ') rotate(' + f1(ang2 * .35 + (RM ? 0 : Math.sin(t * 1.5 + 1) * 3)) + ') scale(' + sc + ')');
    var gx = e.x - 12, gy = c.y0;
    S.leg.setAttribute('d', 'M' + f1(e.x - 16) + ' ' + f1(e.y + 6) + 'C' + f1(e.x - 26) + ' ' + f1(e.y + 22) + ' ' + f1(gx - 12) + ' ' + f1(gy - 10) + ' ' + f1(gx) + ' ' + f1(gy + 2));
    S.paw.setAttribute('transform', 'translate(' + f1(gx) + ' ' + f1(gy + 3) + ')');
  }
  function dragonBuild(c) {
    c.hs = Math.max(.95, Math.min(1.3, c.w / 300));
    c.pts = (function () {
      var all = loop(c.x0, c.y0, c.w, c.h, c.r, 7), endX = c.x0 + c.w - 62 * c.hs, out = [], i;
      /* start near the bottom-right, finish on the top edge near the right corner */
      var startIdx = 0;
      for (i = 0; i < all.length; i++) { if (all[i].x <= c.x0 + c.w - 44 && all[i].ny === 1) { startIdx = i; break; } }
      for (i = startIdx; i < all.length; i++) { out.push(all[i]); if (all[i].ny === -1 && all[i].x >= endX) break; }
      var s0 = out[0].s; out.forEach(function (q) { q.s -= s0; }); c.Lend = out[out.length - 1].s || 1; return out;
    })();
    return dragonStatic(c) + '<g data-dr-front-src></g>';
  }
  function dragonFinish(c, svg) {
    var fr = svg.querySelector('[data-dr="front"]'), id = c.id;
    fr.innerHTML = '<path data-dr="leg" fill="none" stroke="#0f5a3a" stroke-width="13.5" stroke-linecap="round"/><path data-dr="leg2" fill="none" stroke="#2fae74" stroke-width="10.5" stroke-linecap="round"/>'
      + '<g data-dr="paw"><g>' + anim('<animateTransform attributeName="transform" type="translate" values="0 0;0 2.2;0 0" dur="2.4s" repeatCount="indefinite"/>')
      + '<ellipse cx="0" cy="0" rx="8" ry="5.4" fill="#2fae74" stroke="#0f5a3a" stroke-width="1.2"/><g fill="none" stroke="#fff8e6" stroke-width="2.6" stroke-linecap="round"><path d="M-5 3q-1.6 6 .8 11"/><path d="M0 4q0 6.4 1.8 11.6"/><path d="M5 3q1.6 6-.4 11"/></g></g></g>'
      + '<g data-dr="head">' + dragonHead(id) + '</g>';
    var refs = {}; svg.querySelectorAll('[data-dr]').forEach(function (n) { refs[n.getAttribute('data-dr')] = n; });
    c.refs = refs;
    /* the leg is drawn twice (outline + fill) from the same d */
    var tickOrig = dragonTick;
    c.tick = function (cc, t) { tickOrig(cc, t); refs.leg2.setAttribute('d', refs.leg.getAttribute('d')); };
  }

  /* ───── peeking kitty ───── */
  var KT = { mt: 62, ml: 26, mr: 26, mb: 64 };
  function kittyBuild(c) {
    var x0 = c.x0, y0 = c.y0, w = c.w, h = c.h, cx = x0 + w / 2, o = '', i, fl = '#fff8f6', st = '#f1d3d8', ink = '#6a4650', R = rnd(11);
    var pts = loop(x0, y0, w, h, c.r, 11);
    pts.forEach(function (q, k) { o += '<circle cx="' + f1(q.x) + '" cy="' + f1(q.y) + '" r="' + f1(7.4 + R() * 1.4) + '" fill="' + fl + '" stroke="' + st + '" stroke-width=".9">' + anim('<animate attributeName="r" values="7.6;8.6;7.6" dur="3.6s" begin="' + f1((k % 9) * .2) + 's" repeatCount="indefinite"/>') + '</circle>'; });
    function ear(side) {
      var m = side < 0 ? 1 : -1, bx = side < 0 ? x0 : x0 + w, tr = function (px) { return f1(bx + m * px); };
      var ox = f1(bx + m * 30), oy = y0 + 4;
      return '<g>' + anim('<animateTransform attributeName="transform" type="rotate" values="0 ' + ox + ' ' + oy + ';0 ' + ox + ' ' + oy + ';' + (-12 * m) + ' ' + ox + ' ' + oy + ';' + (5 * m) + ' ' + ox + ' ' + oy + ';0 ' + ox + ' ' + oy + '" keyTimes="0;.84;.89;.94;1" dur="' + (side < 0 ? 5.2 : 6.6) + 's" repeatCount="indefinite"/>')
        + '<polygon points="' + tr(8) + ',' + (y0 + 12) + ' ' + tr(10) + ',' + (y0 - 44) + ' ' + tr(56) + ',' + (y0 - 2) + '" fill="' + fl + '" stroke="' + st + '" stroke-width="1.6" stroke-linejoin="round"/>'
        + '<polygon points="' + tr(17) + ',' + (y0 + 4) + ' ' + tr(18) + ',' + (y0 - 28) + ' ' + tr(42) + ',' + (y0 - 4) + '" fill="#ffb3c6"/></g>';
    }
    o += ear(-1) + ear(1);
    /* face peeking over the top edge */
    o += '<g>' + anim('<animateTransform attributeName="transform" type="translate" values="0 0;0 -2.6;0 0" dur="3.4s" repeatCount="indefinite"/>')
      + '<ellipse cx="' + cx + '" cy="' + (y0 - 8) + '" rx="46" ry="31" fill="' + fl + '" stroke="' + st + '" stroke-width="1.6"/>'
      + '<g stroke="' + ink + '" stroke-width="2.6" fill="none" stroke-linecap="round"><g>' + (RM ? '' : '<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;.92;.95;.98;1" dur="4.2s" repeatCount="indefinite"/>') + '<path d="M' + (cx - 24) + ' ' + (y0 - 9) + 'q7-8 14 0M' + (cx + 10) + ' ' + (y0 - 9) + 'q7-8 14 0"/></g></g>'
      + '<g fill="' + ink + '">' + (RM ? '<path d="M' + (cx - 24) + ' ' + (y0 - 9) + 'q7-8 14 0M' + (cx + 10) + ' ' + (y0 - 9) + 'q7-8 14 0" fill="none" stroke="' + ink + '" stroke-width="2.6"/>' : '<g>' + '<animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;.92;.95;.98;1" dur="4.2s" repeatCount="indefinite"/><circle cx="' + (cx - 17) + '" cy="' + (y0 - 9) + '" r="4.2"/><circle cx="' + (cx + 17) + '" cy="' + (y0 - 9) + '" r="4.2"/><circle cx="' + (cx - 18.6) + '" cy="' + (y0 - 10.6) + '" r="1.4" fill="#fff"/><circle cx="' + (cx + 15.4) + '" cy="' + (y0 - 10.6) + '" r="1.4" fill="#fff"/></g>') + '</g>'
      + '<ellipse cx="' + (cx - 30) + '" cy="' + (y0 - 1) + '" rx="8" ry="4.6" fill="#ffb3c6" opacity=".7"/><ellipse cx="' + (cx + 30) + '" cy="' + (y0 - 1) + '" rx="8" ry="4.6" fill="#ffb3c6" opacity=".7"/>'
      + '<path d="M' + (cx - 3.6) + ' ' + (y0 - 4) + 'h7.2l-3.6 4.4z" fill="#ff8fa6"/><path d="M' + (cx - 7) + ' ' + (y0 + 3) + 'q3.5 3.4 7 0q3.5 3.4 7 0" fill="none" stroke="' + ink + '" stroke-width="1.6" stroke-linecap="round"/>'
      + '<g stroke="' + st + '" stroke-width="1.4" stroke-linecap="round"><path d="M' + (cx - 40) + ' ' + (y0 - 10) + 'l-12-2M' + (cx - 40) + ' ' + (y0 - 5) + 'l-12 2M' + (cx + 40) + ' ' + (y0 - 10) + 'l12-2M' + (cx + 40) + ' ' + (y0 - 5) + 'l12 2"/></g></g>';
    /* paws gripping the edge */
    [-1, 1].forEach(function (sd, k) {
      var px = cx + sd * 56, py = y0 + 3;
      o += '<g>' + anim('<animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="2.8s" begin="' + (k * 1.4) + 's" repeatCount="indefinite"/>')
        + '<ellipse cx="' + px + '" cy="' + py + '" rx="15" ry="10.5" fill="' + fl + '" stroke="' + st + '" stroke-width="1.4"/><g stroke="' + st + '" stroke-width="1.4" stroke-linecap="round"><path d="M' + (px - 5) + ' ' + (py + 1) + 'v7M' + (px + 5) + ' ' + (py + 1) + 'v7"/></g><ellipse cx="' + px + '" cy="' + (py - 3) + '" rx="4" ry="3" fill="#ffb3c6"/></g>';
    });
    /* tail */
    var tx = x0 + w - 26, ty = y0 + h + 2, d = 'M' + tx + ' ' + ty + 'C' + (tx + 34) + ' ' + (ty + 4) + ' ' + (tx + 46) + ' ' + (ty + 34) + ' ' + (tx + 28) + ' ' + (ty + 56);
    o = '<g>' + anim('<animateTransform attributeName="transform" type="rotate" values="-6 ' + tx + ' ' + ty + ';9 ' + tx + ' ' + ty + ';-6 ' + tx + ' ' + ty + '" dur="2.6s" repeatCount="indefinite"/>')
      + '<path d="' + d + '" fill="none" stroke="' + st + '" stroke-width="15" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + fl + '" stroke-width="12" stroke-linecap="round"/><circle cx="' + (tx + 28) + '" cy="' + (ty + 56) + '" r="6.4" fill="#ffb3c6"/></g>' + o;
    [[x0 + 8, y0 - 26, .9, 0], [x0 + w - 14, y0 - 30, 1, .6], [x0 - 12, y0 + h * .45, .8, 1.1], [x0 + w + 12, y0 + h * .55, .9, .3], [cx - 90, y0 - 34, .7, 1.4], [cx + 96, y0 - 30, .8, 1.7]].forEach(function (s) { o += star(s[0], s[1], s[2], s[3], '#ffd6e4'); });
    return o;
  }

  /* ───── static-ish frames: tech, garden, neon (they hug the card edge from outside) ───── */
  var TG = { mt: 34, ml: 18, mr: 18, mb: 34 };
  function techBuild(c) {
    var x0 = c.x0, y0 = c.y0, w = c.w, h = c.h, cx = x0 + w / 2, id = c.id;
    var pl = function (y, flip) {
      return '<g' + (flip ? ' transform="translate(0 ' + (2 * y0 + h) + ') scale(1 -1)"' : '') + '><path d="M' + (cx - 100) + ' ' + (y0 - 29) + 'h200l-13 25h-174z" fill="url(#tf' + id + ')" stroke="#2a3144" stroke-width="1.5"/><rect x="' + (cx - 72) + '" y="' + (y0 - 23) + '" width="64" height="11" rx="2" fill="#9fe39a" opacity=".88">' + anim('<animate attributeName="opacity" values=".88;.5;.88" dur="2.6s" repeatCount="indefinite"/>') + '</rect><circle cx="' + (cx + 16) + '" cy="' + (y0 - 17.5) + '" r="3.4" fill="#ffb84d">' + anim('<animate attributeName="opacity" values="1;.3;1" dur="1.4s" repeatCount="indefinite"/>') + '</circle><circle cx="' + (cx + 30) + '" cy="' + (y0 - 17.5) + '" r="3.4" fill="#ff6b6b">' + anim('<animate attributeName="opacity" values=".3;1;.3" dur="1.9s" repeatCount="indefinite"/>') + '</circle><path d="M' + (cx - 82) + ' ' + (y0 - 8) + 'h164" stroke="#ffffff55" stroke-width="1.4"/></g>';
    };
    return '<defs><linearGradient id="tf' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d3d9e8"/><stop offset=".5" stop-color="#7d869b"/><stop offset="1" stop-color="#4b5266"/></linearGradient></defs>'
      + '<path d="' + rr(x0 - 7, y0 - 7, w + 14, h + 14, c.r + 7) + '" fill="none" stroke="url(#tf' + id + ')" stroke-width="12"/><path d="' + rr(x0, y0, w, h, c.r) + '" fill="none" stroke="#2a3144" stroke-width="2"/>'
      + pl(0, false) + pl(0, true)
      + [[x0 - 7, y0 - 7], [x0 + w + 7, y0 - 7], [x0 - 7, y0 + h + 7], [x0 + w + 7, y0 + h + 7]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.2" fill="#d3d9e8" stroke="#3a4256" stroke-width="1.4"/>'; }).join('');
  }
  function leaf(x, y, rot, fill) { return '<ellipse rx="7.5" ry="3.2" fill="' + fill + '" transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + rot + ')"/>'; }
  function gardenBuild(c) {
    var x0 = c.x0, y0 = c.y0, w = c.w, h = c.h, o = '', i;
    o += '<path d="' + rr(x0 - 6, y0 - 6, w + 12, h + 12, c.r + 6) + '" fill="none" stroke="#1d6b47" stroke-width="10"/><path d="' + rr(x0, y0, w, h, c.r) + '" fill="none" stroke="#e9cf7a" stroke-width="1.8"/>';
    [[x0 - 10, y0 - 10, 1, 1], [x0 + w + 10, y0 - 10, -1, 1], [x0 - 10, y0 + h + 10, 1, -1], [x0 + w + 10, y0 + h + 10, -1, -1]].forEach(function (cr, ci) {
      var k = cr[2] * cr[3];
      for (i = 0; i < 7; i++) {
        var f2 = i % 2 ? '#2a9d63' : '#4fd68f';
        o += leaf(cr[0] + cr[2] * (8 + i * 11), cr[1] + cr[3] * (i % 2 ? 7 : -1), (i % 2 ? -38 : 38) * k, f2) + leaf(cr[0] + cr[2] * (i % 2 ? 7 : -1), cr[1] + cr[3] * (8 + i * 11), (90 + (i % 2 ? 38 : -38)) * k, f2);
      }
      o += '<g>' + anim('<animateTransform attributeName="transform" type="scale" values="1;1.18;1" dur="3s" begin="' + (ci * .5) + 's" repeatCount="indefinite"/>') + '</g><circle cx="' + cr[0] + '" cy="' + cr[1] + '" r="6" fill="#e9cf7a"/><circle cx="' + cr[0] + '" cy="' + cr[1] + '" r="2.4" fill="#fff6c8"/>';
    });
    return o + star(x0 + w / 2, y0 - 13, 1, 0, '#fff3b0') + star(x0 + w * .25, y0 + h + 12, .8, .8, '#fff3b0') + star(x0 + w * .75, y0 + h + 12, .8, 1.3, '#fff3b0');
  }
  function neonBuild(c) {
    var id = c.id;
    return '<defs><linearGradient id="nf' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00e5ff"/><stop offset="1" stop-color="#ff2bd6"/></linearGradient></defs><g' + (RM ? '' : ' class="mfr-hue"') + ' style="filter:drop-shadow(0 0 5px #00e5ff)">'
      + '<path d="' + rr(c.x0 - 5, c.y0 - 5, c.w + 10, c.h + 10, c.r + 5) + '" fill="none" stroke="url(#nf' + id + ')" stroke-width="4"/><path d="' + rr(c.x0 - 11, c.y0 - 11, c.w + 22, c.h + 22, c.r + 11) + '" fill="none" stroke="url(#nf' + id + ')" stroke-width="1" opacity=".5"/></g>';
  }

  /* ───── avatar decorations (viewBox 0 0 100 100, the avatar fills the middle 78%) ───── */
  function decoSVG(d, color) {
    var c = HEX.test(String(color)) ? color : '#ff5d7e', id = 'dd' + (++uid), o = '', i, a, x, y;
    if (d === 'neon') o = '<circle cx="50" cy="50" r="42" fill="none" stroke="' + c + '" stroke-width="2.6" style="filter:drop-shadow(0 0 2.5px ' + c + ')">' + anim('<animate attributeName="opacity" values="1;.55;1" dur="2.2s" repeatCount="indefinite"/>') + '</circle><circle cx="50" cy="50" r="45.5" fill="none" stroke="' + c + '" stroke-width="1" opacity=".45"/>';
    else if (d === 'holo') o = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5d7e"/><stop offset=".35" stop-color="#ffd35d"/><stop offset=".65" stop-color="#5dffc8"/><stop offset="1" stop-color="#7a6bff"/></linearGradient></defs><circle cx="50" cy="50" r="42" fill="none" stroke="url(#' + id + ')" stroke-width="3.6">' + anim('<animateTransform attributeName="transform" type="rotate" values="0 50 50;360 50 50" dur="6s" repeatCount="indefinite"/>') + '</circle>';
    else if (d === 'dots') o = '<circle cx="50" cy="50" r="42" fill="none" stroke="' + c + '" stroke-width="3" stroke-dasharray="0.01 6.6" stroke-linecap="round">' + anim('<animateTransform attributeName="transform" type="rotate" values="0 50 50;360 50 50" dur="24s" repeatCount="indefinite"/>') + '</circle>';
    else if (d === 'sparkle') { for (i = 0; i < 8; i++) { a = i * Math.PI / 4 + .2; o += star(50 + 45 * Math.cos(a), 50 + 45 * Math.sin(a), i % 2 ? .75 : 1.15, i * .22, c); } }
    else if (d === 'ears') o = '<g stroke-linejoin="round" stroke-width="4" stroke="' + c + '" fill="' + c + '"><polygon points="17,30 19,-3 42,13"/><polygon points="83,30 81,-3 58,13"/></g><g fill="#fff" opacity=".4"><polygon points="23,24 22,7 34,15"/><polygon points="77,24 78,7 66,15"/></g>';
    else if (d === 'halo') o = '<ellipse cx="50" cy="3" rx="19" ry="5.5" fill="none" stroke="#ffd35d" stroke-width="3.2" style="filter:drop-shadow(0 0 3px #ffd35d)">' + anim('<animateTransform attributeName="transform" type="translate" values="0 0;0 -2;0 0" dur="2.6s" repeatCount="indefinite"/>') + '</ellipse>';
    else if (d === 'wreath') { for (i = 0; i < 16; i++) { a = i * Math.PI / 8; x = 50 + 42 * Math.cos(a); y = 50 + 42 * Math.sin(a); o += '<ellipse rx="6.2" ry="2.8" fill="' + c + '" opacity="' + (i % 2 ? .6 : 1) + '" transform="translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + Math.round(a * 180 / Math.PI + 90 + (i % 2 ? 28 : -28)) + ')"/>'; } }
    else if (d === 'glitch') o = '<circle cx="50" cy="50" r="41.5" fill="none" stroke="#00e5ff" stroke-width="2.2" opacity=".9">' + anim('<animateTransform attributeName="transform" type="translate" values="-1.6 0;-1.6 0;-3 1.2;1 -1;-1.6 0" keyTimes="0;.88;.91;.95;1" dur="3s" repeatCount="indefinite"/>') + '</circle><circle cx="50" cy="50" r="41.5" fill="none" stroke="#ff2bd6" stroke-width="2.2" opacity=".9">' + anim('<animateTransform attributeName="transform" type="translate" values="1.6 0;1.6 0;3 -1.2;-1 1;1.6 0" keyTimes="0;.88;.91;.95;1" dur="3s" repeatCount="indefinite"/>') + '</circle><circle cx="50" cy="50" r="41.5" fill="none" stroke="#fff" stroke-width="1.2" opacity=".8"/>';
    return o;
  }


  /* ───── premium collection frames: layered fantasy, sci-fi and cute artwork ───── */
  function collectionBuild(c, kind) {
    var x = c.x0, y = c.y0, w = c.w, h = c.h, id = c.id, cx = x + w / 2;
    var palettes = {
      phoenix: ['#ffdf9a','#f08a45','#8d3045','#fff0c9'],
      celestial: ['#b9c9ff','#8068d9','#29366f','#fff4c4'],
      cyber: ['#8ff7ff','#328bc9','#182d59','#e8ffff'],
      reactor: ['#8dffe0','#26c8bd','#174d63','#e8fff9'],
      cloudkitty: ['#ffd6e7','#ef9fc4','#9d6e9d','#fff8fc'],
      starbunny: ['#e5d5ff','#a98be8','#6656a0','#fff9e8']
    }[kind], a = palettes[0], b = palettes[1], d = palettes[2], hi = palettes[3];
    var outer = rr(x - 9, y - 9, w + 18, h + 18, c.r + 12), inner = rr(x - 3, y - 3, w + 6, h + 6, c.r + 6);
    var out = '<defs>'
      + '<linearGradient id="col-metal' + id + '" x1="0" y1="0" x2="1" y2="1"><stop stop-color="' + hi + '"/><stop offset=".24" stop-color="' + a + '"/><stop offset=".58" stop-color="' + d + '"/><stop offset=".82" stop-color="' + b + '"/><stop offset="1" stop-color="' + hi + '"/></linearGradient>'
      + '<linearGradient id="col-glass' + id + '" x1="0" y1="0" x2="0" y2="1"><stop stop-color="' + a + '" stop-opacity=".42"/><stop offset="1" stop-color="' + d + '" stop-opacity=".08"/></linearGradient>'
      + '<radialGradient id="col-aura' + id + '"><stop stop-color="' + a + '" stop-opacity=".55"/><stop offset="1" stop-color="' + a + '" stop-opacity="0"/></radialGradient>'
      + '</defs>';
    out += '<g style="filter:drop-shadow(0 3px 5px ' + d + '88)">'
      + '<path d="' + outer + '" fill="none" stroke="' + d + '" stroke-width="13" opacity=".82"/>'
      + '<path d="' + outer + '" fill="none" stroke="url(#col-metal' + id + ')" stroke-width="7"/>'
      + '<path d="' + inner + '" fill="none" stroke="' + hi + '" stroke-width="1.3" opacity=".88"/>'
      + '<path d="' + rr(x - 13, y - 13, w + 26, h + 26, c.r + 15) + '" fill="none" stroke="' + a + '" stroke-width="1" stroke-dasharray="2 7" opacity=".8"/>'
      + '</g>';
    /* Four layered corner ornaments make the artwork feel attached to the card. */
    [[x-8,y-8,1,1],[x+w+8,y-8,-1,1],[x-8,y+h+8,1,-1],[x+w+8,y+h+8,-1,-1]].forEach(function(q,i){
      out += '<g transform="translate(' + q[0] + ' ' + q[1] + ') scale(' + q[2] + ' ' + q[3] + ')">'
        + '<path d="M0 30Q0 0 30 0L19 8Q9 9 8 19Z" fill="url(#col-metal' + id + ')" stroke="' + hi + '" stroke-width="1"/>'
        + '<path d="M5 24Q8 8 24 5" fill="none" stroke="' + hi + '" stroke-width="1.4" opacity=".9"/>'
        + '<circle cx="8" cy="8" r="3" fill="' + hi + '" stroke="' + b + '" stroke-width="1"/>'
        + '</g>';
    });
    if (kind === 'phoenix') {
      out += '<g transform="translate(' + cx + ' ' + (y-20) + ')" style="filter:drop-shadow(0 0 7px ' + a + ')">'
        + '<path d="M0 22C-14 7-43 8-58-16C-35-10-24-26-12-34C-12-15-5-8 0 0C5-8 12-15 12-34C24-26 35-10 58-16C43 8 14 7 0 22Z" fill="url(#col-metal' + id + ')" stroke="' + hi + '" stroke-width="1.5"/>'
        + '<path d="M0 16C-7 2-5-11 0-25C5-11 7 2 0 16Z" fill="' + hi + '"/><path d="M-37-8Q-18-2-8 9M37-8Q18-2 8 9" fill="none" stroke="' + hi + '" stroke-width="2"/>'
        + '<circle cx="0" cy="-2" r="5" fill="' + hi + '">' + anim('<animate attributeName="r" values="4;6;4" dur="2.8s" repeatCount="indefinite"/>') + '</circle></g>';
    } else if (kind === 'celestial') {
      out += '<g transform="translate(' + cx + ' ' + (y-14) + ')"><circle r="27" fill="url(#col-aura' + id + ')"/><circle r="18" fill="none" stroke="url(#col-metal' + id + ')" stroke-width="3"/><circle r="12" fill="none" stroke="' + hi + '" stroke-width="1.2"/><path d="M0-28L5-5 28 0 5 5 0 28-5 5-28 0-5-5Z" fill="url(#col-metal' + id + ')" stroke="' + hi + '" stroke-width="1"/><circle r="4" fill="' + hi + '"/></g>';
    } else if (kind === 'cyber' || kind === 'reactor') {
      out += '<g transform="translate(' + cx + ' ' + (y-14) + ')"><circle r="30" fill="url(#col-aura' + id + ')"/><path d="M-27 0L-18-18H18L27 0 18 18H-18Z" fill="url(#col-glass' + id + ')" stroke="url(#col-metal' + id + ')" stroke-width="4"/><circle r="13" fill="none" stroke="' + hi + '" stroke-width="2"/><circle r="5" fill="' + a + '">' + anim('<animate attributeName="opacity" values=".55;1;.55" dur="1.8s" repeatCount="indefinite"/>') + '</circle><path d="M-38 0H-20M20 0H38M0-38V-20M0 20V38" stroke="' + hi + '" stroke-width="2"/></g>';
      for (var j=0;j<5;j++) out += '<path d="M' + (x+18+j*9) + ' ' + (y+h+15) + 'v-5h4" fill="none" stroke="' + a + '" stroke-width="1.4" opacity=".8"/>';
    } else {
      /* Soft plush/cloud crest with a small character face. */
      out += '<g transform="translate(' + cx + ' ' + (y-12) + ')" style="filter:drop-shadow(0 2px 3px ' + b + '88)">'
        + '<path d="M-42 12Q-56 4-43-7Q-35-24-20-16Q-10-35 2-20Q18-33 26-14Q47-18 48 0Q59 14 39 19H-32Z" fill="url(#col-metal' + id + ')" stroke="' + hi + '" stroke-width="2"/>'
        + '<path d="M-10 1q4 5 8 0M8 1q4 5 8 0" fill="none" stroke="' + d + '" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="0" cy="9" rx="4" ry="2.5" fill="' + b + '" opacity=".55"/>'
        + '</g>';
    }
    /* floating glints / runic ticks around the perimeter */
    for (var n=0;n<10;n++) {
      var px = x + 18 + ((n*67) % Math.max(40, w-36)), py = n%2 ? y+h+17 : y-17;
      out += '<path d="M' + px + ' ' + (py-4) + 'l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="' + hi + '" opacity=".9">' + anim('<animate attributeName="opacity" values=".25;1;.25" dur="' + (2.2+(n%4)*.4) + 's" begin="' + (n*.17) + 's" repeatCount="indefinite"/>') + '</path>';
    }
    out += '<path d="M' + (x+35) + ' ' + (y+h+8) + 'H' + (x+w-35) + '" stroke="url(#col-metal' + id + ')" stroke-width="2" opacity=".85"/>';
    return out;
  }

  /* ───── mounting layers that follow their elements ───── */
  var mounts = new Map(), raf = 0, t0 = performance.now();
  var CSS_ID = 'mfr-css';
  function ensureCSS() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement('style'); s.id = CSS_ID;
    s.textContent = '.mfr-layer{position:fixed;left:0;top:0;pointer-events:none;z-index:4;contain:layout style}.mfr-layer svg{display:block;overflow:visible}'
      + '/* The menu drawer and its scrim sit in a lower stacking context, so frames would paint over them: hide frames while it is open. */'
      + 'html.sh-open .mfr-layer{visibility:hidden}'
      + '/* Frames float outside the card; they must not change card width or push the layout down. */'
      + '.mfr-bi{position:absolute;inset:0;box-sizing:border-box;border-style:solid;border-color:transparent;pointer-events:none;transform-origin:50% 50%;animation:mfrFramePulse 4.8s ease-in-out infinite,mfrFrameBreathe 6.4s ease-in-out infinite}.mfr-art{position:absolute;max-width:none;pointer-events:none;animation:mfrFrameFloat 5.6s ease-in-out infinite,mfrFramePulse 4.8s ease-in-out infinite;transform-origin:50% 50%}'
      + '.mfr-dragon-side{position:absolute;top:9%;bottom:9%;width:clamp(12px,3.8vw,22px);background-repeat:repeat-y;background-position:center top;background-size:100% auto;opacity:.98;filter:drop-shadow(0 0 4px rgba(20,220,150,.45))}'
      + '.mfr-dragon-left{left:0}.mfr-dragon-right{right:0}'
      + '.mfr-dragon-orn{position:absolute;left:2%;width:96%;height:auto;max-height:100px;object-fit:contain;pointer-events:none;filter:drop-shadow(0 2px 7px rgba(0,0,0,.55))}'
      + '.mfr-dragon-top{top:0;transform-origin:50% 80%;animation:mfrDragonArrival 3.2s cubic-bezier(.2,.7,.25,1) both,mfrFrameFloat 5.6s 3.2s ease-in-out infinite}'
      + '.mfr-dragon-bottom{bottom:0;transform:rotate(180deg);animation:mfrDragonBottom 5.6s ease-in-out infinite}'
      + '@keyframes mfrDragonArrival{0%{opacity:0;transform:translate3d(-28px,-18px,0) rotate(-3deg) scale(.96)}65%{opacity:1;transform:translate3d(5px,2px,0) rotate(1deg) scale(1.01)}100%{opacity:1;transform:translate3d(0,0,0) rotate(0) scale(1)}}'
      + '@keyframes mfrFramePulse{0%,100%{opacity:.88;filter:drop-shadow(0 2px 5px rgba(70,220,170,.22))}50%{opacity:1;filter:drop-shadow(0 3px 12px rgba(100,240,190,.58))}}'
      + '@keyframes mfrFrameFloat{0%,100%{translate:0 0;filter:drop-shadow(0 2px 6px rgba(70,220,170,.2))}50%{translate:0 -3px;filter:drop-shadow(0 4px 11px rgba(100,240,190,.5))}}'
      + '@keyframes mfrFrameBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.008)}}'
      + '@keyframes mfrDragonBottom{0%,100%{translate:0 0;filter:drop-shadow(0 2px 6px rgba(70,220,170,.2))}50%{translate:0 3px;filter:drop-shadow(0 4px 11px rgba(100,240,190,.5))}}'
      + '@media(prefers-reduced-motion:reduce){.mfr-bi,.mfr-art,.mfr-dragon-top,.mfr-dragon-bottom{animation:none!important;transform:none!important;translate:none!important}}'
      + '.mfr-hue{animation:mfrhue 8s linear infinite}@keyframes mfrhue{to{filter:drop-shadow(0 0 5px #00e5ff) hue-rotate(360deg)}}'
      + '@media (prefers-reduced-motion:reduce){.mfr-hue{animation:none}}';
    document.head.appendChild(s);
  }
  function radiusOf(el) { var r = parseFloat(getComputedStyle(el).borderTopLeftRadius); return isFinite(r) ? Math.max(6, Math.min(r, 60)) : 16; }
  var ART = { dragon: '/assets/frame-art/dragon.png', garden: '/assets/frame-art/garden.png', phoenix: '/assets/frame-art/phoenix.png', celestial: '/assets/frame-art/celestial.png', tech: '/assets/frame-art/tech.png', cyber: '/assets/frame-art/cyber.png', reactor: '/assets/frame-art/reactor.png', neon: '/assets/frame-art/neon.png', kitty: '/assets/frame-art/kitty.png', cloudkitty: '/assets/frame-art/cloudkitty.png', starbunny: '/assets/frame-art/starbunny.png', mooncat: '/assets/frame-art/mooncat.png' };
  /* v36-22: every illustrated frame is a 9-slice kit (assets/frame-kit/<id>.png): fixed-size corners and plain stretchable edges,
   * so the artwork keeps its proportions and never covers the card whatever its shape. s = screen px per source px, sl = slice sizes
   * in kit px (top,right,bottom,left), ins = how far the art band reaches inward (px), orn = optional centre-top sprite. */
  var KIT = {"celestial":{"s":0.2924,"k":0.45,"sl":[104,117,104,117],"ins":[52.9,45.3,20.5,42.7],"kw":246,"kh":219,"ov":18},"cloudkitty":{"s":0.3056,"k":0.45,"sl":[104,117,104,117],"ins":[59.3,42.5,38.2,45.5],"kw":246,"kh":219,"ov":18},"cyber":{"s":0.33,"k":0.45,"sl":[100,117,100,117],"ins":[38.0,46.5,38.9,41.2],"kw":246,"kh":211,"ov":18},"dragon":{"s":0.2486,"k":0.45,"sl":[110,117,104,117],"ins":[57.4,38.0,19.4,50.0],"kw":246,"kh":225,"ov":18},"garden":{"s":0.2933,"k":0.45,"sl":[104,117,104,117],"ins":[48.7,44.0,12.0,44.0],"kw":246,"kh":219,"ov":18,"orn":{"x":280,"y":10,"w":295,"h":190,"cx":43.5}},"kitty":{"s":0.3188,"k":0.45,"sl":[104,117,104,117],"ins":[59.9,36.0,47.2,52.0],"kw":246,"kh":219,"ov":18,"orn":{"x":196,"y":0,"w":379,"h":205,"cx":1.5}},"mooncat":{"s":0.2885,"k":0.45,"sl":[104,117,104,117],"ins":[46.2,47.9,39.0,40.1],"kw":246,"kh":219,"ov":18},"neon":{"s":0.2839,"k":0.45,"sl":[100,117,100,117],"ins":[37.8,46.3,29.5,41.7],"kw":246,"kh":211,"ov":18},"phoenix":{"s":0.2521,"k":0.45,"sl":[116,117,104,117],"ins":[61.5,57.7,24.0,30.3],"kw":246,"kh":231,"ov":18},"reactor":{"s":0.2885,"k":0.45,"sl":[100,117,100,117],"ins":[39.5,43.9,42.1,44.1],"kw":246,"kh":211,"ov":18},"starbunny":{"s":0.2353,"k":0.45,"sl":[104,117,104,117],"ins":[41.6,48.7,24.7,39.3],"kw":246,"kh":219,"ov":18},"tech":{"s":0.33,"k":0.45,"sl":[100,117,100,117],"ins":[41.9,30.4,47.9,48.2],"kw":246,"kh":211,"ov":18}};
  function kitGeom(kind, w, h) {
    var c = KIT[kind]; if (!c) return null;
    var f = 1, r, bT, bR, bB, bL, e;
    function calc() { r = c.s * f / c.k; bT = c.sl[0] * r; bR = c.sl[1] * r; bB = c.sl[2] * r; bL = c.sl[3] * r; }
    calc();
    /* very small card: shrink the art so the corners never overlap each other */
    f = Math.min(1, Math.max(.3, (w - 8) / (bL + bR + 8)), Math.max(.3, (h - 8) / (bT + bB + 8))); calc();
    e = { mt: Math.max(4, c.ins[0] * f - c.ov), mr: Math.min(16, Math.max(4, c.ins[1] * f - c.ov)), mb: Math.min(30, Math.max(4, c.ins[2] * f - c.ov)), ml: Math.min(16, Math.max(4, c.ins[3] * f - c.ov)) };
    return { c: c, f: f, b: [bT, bR, bB, bL], mg: e };
  }
  var KINDS = { dragon: [DR, dragonBuild], kitty: [KT, kittyBuild], tech: [TG, techBuild], garden: [{ mt: 26, ml: 26, mr: 26, mb: 26 }, gardenBuild], neon: [{ mt: 16, ml: 16, mr: 16, mb: 16 }, neonBuild], phoenix: [{ mt: 52, ml: 34, mr: 34, mb: 30 }, function(c){ return collectionBuild(c, 'phoenix'); }], celestial: [{ mt: 48, ml: 30, mr: 30, mb: 28 }, function(c){ return collectionBuild(c, 'celestial'); }], cyber: [{ mt: 48, ml: 24, mr: 24, mb: 30 }, function(c){ return collectionBuild(c, 'cyber'); }], reactor: [{ mt: 48, ml: 24, mr: 24, mb: 30 }, function(c){ return collectionBuild(c, 'reactor'); }], cloudkitty: [{ mt: 42, ml: 28, mr: 28, mb: 28 }, function(c){ return collectionBuild(c, 'cloudkitty'); }], starbunny: [{ mt: 46, ml: 28, mr: 28, mb: 28 }, function(c){ return collectionBuild(c, 'starbunny'); }], mooncat: [{ mt: 34, ml: 24, mr: 24, mb: 30 }, function(c){ return collectionBuild(c, 'cloudkitty'); }] };

  function makeLayer(m, w, h) {
    var c, svgHTML, W, H;
    if (m.type === 'frame') {
      var def = KINDS[m.kind], mg;
      var kg = ART[m.kind] && kitGeom(m.kind, w, h);
      if (kg && m.kind === 'dragon') {
        /* Dragon is composed from independent, aspect-ratio-preserving ornaments and tiled side rails. */
        kg.mg = { mt: Math.max(54, Math.min(94, w * 0.18)), mr: 18, mb: Math.max(54, Math.min(94, w * 0.18)), ml: 18 };
      }
      if (kg) {
        /* Horizontal-only frame: ornamental bands sit above and below the card.
         * No left/right rails, no added card width, and no stretched side panel. */
        mg = { mt: kg.mg.mt, ml: 0, mr: 0, mb: kg.mg.mb };
        W = w; H = h + mg.mt + mg.mb;
        c = { id: ++uid, W: W, H: H, x0: 0, y0: mg.mt, w: w, h: h, r: radiusOf(m.el), mg: mg, kg: kg };
        svgHTML = '';
      } else {
        mg = def[0]; W = w + mg.ml + mg.mr; H = h + mg.mt + mg.mb;
        c = { id: ++uid, W: W, H: H, x0: mg.ml, y0: mg.mt, w: w, h: h, r: radiusOf(m.el), mg: mg };
        svgHTML = def[1](c);
      }
      m.mg = mg;
    } else {
      var s = Math.min(w, h), pad = s * .14; W = H = s * 1.28; c = { W: W, H: H }; m.mg = { mt: pad, ml: pad, mr: pad, mb: pad };
      svgHTML = '<svg xmlns="' + NS + '" viewBox="0 0 100 100" width="' + W + '" height="' + H + '" aria-hidden="true">' + decoSVG(m.kind, m.color) + '</svg>';
    }
    if (!m.layer) { m.layer = document.createElement('div'); m.layer.className = 'mfr-layer'; m.layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(m.layer); }
    if (m.type === 'frame' && c.kg) {
      var g = c.kg, b = g.b, u = '/assets/frame-kit/' + m.kind + '.png?v=1', sl = g.c.sl, px = function (n) { return f1(n) + 'px'; };
      var html;
      if (m.kind === 'dragon') {
        html = '<img class="mfr-dragon-orn mfr-dragon-top" draggable="false" alt="" src="/assets/frame-kit/dragon-top.png?v=2">' +
          '<img class="mfr-dragon-orn mfr-dragon-bottom" draggable="false" alt="" src="/assets/frame-kit/dragon-bottom.png?v=2">';
      } else {
        html = '<div class="mfr-bi" style="border-width:' + px(b[0]) + ' 0 ' + px(b[2]) + ' 0;border-image:url(' + u + ') ' + sl[0] + ' 0 ' + sl[2] + ' 0 / ' + px(b[0]) + ' 0 ' + px(b[2]) + ' 0 stretch"></div>';
      }
      if (g.c.orn) {
        var o = g.c.orn, sc = g.c.s * g.f, ow = o.w * sc, oh = o.h * sc;
        html += '<img class="mfr-art" draggable="false" alt="" src="/assets/frame-kit/' + m.kind + '-top.png?v=1" style="left:' + px(c.mg.ml + w / 2 + o.cx * sc - ow / 2) + ';top:' + px(o.y * sc) + ';width:' + px(ow) + ';height:' + px(oh) + '">';
      }
      m.layer.innerHTML = html;
    } else if (m.type === 'frame') m.layer.innerHTML = '<svg xmlns="' + NS + '" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + svgHTML + '</svg>';
    else m.layer.innerHTML = svgHTML;
    m.layer.style.width = W + 'px'; m.layer.style.height = H + 'px';
    m.c = c; m.w = w; m.h = h; m.tick = null;
    if (m.kind === 'dragon' && m.type === 'frame' && !c.kg) { dragonFinish(c, m.layer.firstChild); m.tick = c.tick; }
  }
  function visible(el, r) {
    if (r.width < 24 || r.height < 24) return false;
    if (r.right < 0 || r.left > innerWidth || r.bottom < -120 || r.top > innerHeight + 120) return false;
    var cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    for (var n = el, k = 0; n && n.nodeType === 1 && k < 8; n = n.parentElement, k++) { var o = getComputedStyle(n); if (o.display === 'none' || Number(o.opacity) < .05) return false; }
    return true;
  }
  var lastRun = 0;
  function frameLoop(now) {
    raf = 0;
    if (!mounts.size) return;
    /* v36-23: animate at about 30 fps and skip while the menu is open; smoother scrolling on phones and tablets */
    if (!document.hidden && now - lastRun >= 33 && !document.documentElement.classList.contains('sh-open')) {
      lastRun = now;
      var t = (now - t0) / 1000;
      mounts.forEach(function (m, el) {
        if (!el.isConnected) { drop(el); return; }
        var r = el.getBoundingClientRect();
        if (!visible(el, r)) { if (m.layer) m.layer.style.display = 'none'; return; }
        if (!m.layer || Math.abs(r.width - m.w) > 1.5 || Math.abs(r.height - m.h) > 1.5) { try { makeLayer(m, r.width, r.height); } catch (err) { m.w = r.width; m.h = r.height; if (m.layer) m.layer.style.display = 'none'; return; } }
        var mg = m.mg; m.layer.style.display = '';
        m.layer.style.transform = 'translate(' + f1(r.left - mg.ml) + 'px,' + f1(r.top - mg.mt) + 'px)';
        if (m.tick) m.tick(m.c, t);
      });
    }
    raf = requestAnimationFrame(frameLoop);
  }
  function kick() { if (!raf && mounts.size) raf = requestAnimationFrame(frameLoop); }
  function drop(el) { var m = mounts.get(el); if (m && m.layer) m.layer.remove(); mounts.delete(el); }

  function scan() {
    ensureCSS();
    var seen = new Set();
    document.querySelectorAll('[data-frame]').forEach(function (el) {
      var k = el.getAttribute('data-frame'); if (!KINDS[k]) return; seen.add(el);
      var m = mounts.get(el); if (m && m.kind === k) return;
      if (m) drop(el); mounts.set(el, { el: el, type: 'frame', kind: k });
    });
    document.querySelectorAll('[data-adeco]').forEach(function (el) {
      var k = el.getAttribute('data-adeco'), col = el.getAttribute('data-adeco-c') || ''; if (!k || !DECOS.some(function (d) { return d[0] === k; })) return; seen.add(el);
      var m = mounts.get(el); if (m && m.kind === k && m.color === col) return;
      if (m) drop(el); mounts.set(el, { el: el, type: 'deco', kind: k, color: col });
    });
    mounts.forEach(function (m, el) { if (!seen.has(el)) drop(el); });
    kick();
  }
  var obs = new MutationObserver(function () { clearTimeout(scan.t); scan.t = setTimeout(scan, 60); });
  function start() { scan(); obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-frame', 'data-adeco', 'data-adeco-c'] }); }
  document.addEventListener('visibilitychange', kick);
  window.dgFrames = { frames: FRAMES, decos: DECOS, decoSVG: decoSVG, rescan: scan };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
