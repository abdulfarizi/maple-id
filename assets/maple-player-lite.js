/* M-ID · light music player (v36-23)
 * Plays uploaded songs and YouTube links as audio only (the YouTube video is never shown).
 * Spotify links are not played here: they open in Spotify.
 * Lyrics: LRCLIB (synced lines). Tap a lyric line to jump to it.
 * Same public API as the old player: window.MaplePlayer = { setProfile, play, pause, ctl, open, close, state, lyrics, searchLyrics }.
 * Kept light: no blur, no backdrop filters, one progress tick (250 ms) and only the current lyric line is restyled. */
(function () {
  'use strict';
  if (window.parent !== window || window.MaplePlayer) return;

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (ms) { var s = Math.max(0, Math.floor((ms || 0) / 1000)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); };
  var ytId = function (u) {
    u = String(u || '').trim(); var id = '';
    if (/^[A-Za-z0-9_-]{11}$/.test(u)) return u;
    try {
      var x = new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u), h = x.hostname.replace(/^(www\.|m\.|music\.)/, '');
      if (h === 'youtu.be') id = x.pathname.slice(1, 12);
      else if (h === 'youtube.com' || h === 'youtube-nocookie.com') id = x.searchParams.get('v') || ((x.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/) || [])[1] || '');
    } catch (e) {}
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
  };

  var S = { track: null, engine: '', playing: false, busy: false, muted: false, err: '', pos: 0, dur: 0, open: false, shown: false, lyrCur: -1 };
  var lyr = { key: '', lines: null, plain: '', msg: '', ok: false, ver: 0 };
  var audio = null, yt = { p: null, ready: false, want: false, id: '' }, tick = 0, lyrCache = {};
  var userPaused = false, armedTap = false;
  var el = {};

  /* ---------- UI ---------- */
  function build() {
    if (el.mini) return;
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/assets/maple-player-lite.css?v=4';
    document.head.appendChild(css);

    var mini = document.createElement('div'); mini.id = 'mpl-mini'; mini.className = 'mpl-mini'; mini.hidden = true;
    mini.innerHTML = '<button type="button" class="mpl-mini-open" data-a="open" aria-label="Open the player">'
      + '<span class="mpl-art"><img alt="" hidden></span><span class="mpl-mini-txt"><b class="mpl-title"></b><small class="mpl-artist"></small></span></button>'
      + '<button type="button" class="mpl-btn" data-a="toggle" aria-label="Play"></button>';
    var tb = document.querySelector('.topbar');
    (tb && tb.parentNode ? tb.parentNode : document.body).insertBefore(mini, tb ? tb.nextSibling : null);   // same stacking context as the header, so it tucks behind it

    var sheet = document.createElement('div'); sheet.id = 'mpl-sheet'; sheet.className = 'mpx-sheet mpl-sheet'; sheet.hidden = true;
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Now playing');
    sheet.innerHTML = '<div class="mpx-bg"><img alt="" hidden></div><div class="mpx-grab"></div>'
      + '<div class="mpx-top"><button type="button" class="mpx-ic" data-a="close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
      + '<p class="mpx-from"><span>Now playing</span><b class="mpl-title"></b></p><span style="width:42px;flex:none"></span></div>'
      + '<div class="mpx-body"><div class="mpx-main">'
      + '<div class="mpx-cover mpl-cover"><img alt="" hidden><span class="mpl-noart">&#9835;</span></div>'
      + '<div class="mpx-info"><h2 class="mpl-title"></h2><p class="mpl-artist"></p><p class="mpl-msg-top" hidden></p></div>'
      + '<div class="mpx-prog mpl-prog"><input type="range" class="mpx-seek mpl-seek" min="0" max="1000" value="0" aria-label="Seek"><div class="mpx-times"><span class="mpl-t0">0:00</span><span class="mpl-t1">0:00</span></div></div>'
      + '<div class="mpx-ctrls"><button type="button" class="mpx-ic" data-a="back" aria-label="Back 10 seconds"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
      + '<button type="button" class="mpx-big mpl-big-btn" data-a="toggle" aria-label="Play"></button>'
      + '<button type="button" class="mpx-ic" data-a="fwd" aria-label="Forward 10 seconds"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>'
      + '<label class="mpl-vol">Volume <input type="range" class="mpl-vol-in" min="0" max="100" step="1" aria-label="Volume"></label>'
      + '<section class="mpx-lyrics mpl-lyrics" aria-label="Lyrics"><header><b>Lyrics</b><small class="mpx-lsrc mpl-lsrc"></small><button type="button" class="mpl-btn small" data-a="lsearch">Search</button></header>'
      + '<form class="mpl-lform" hidden><input name="title" placeholder="Song title" aria-label="Song title"><input name="artist" placeholder="Artist" aria-label="Artist"><button type="submit" class="mpl-btn small">Find</button></form>'
      + '<div class="mpl-lres" hidden></div><div class="mpx-lbody mpl-lbody"></div></section>'
      + '</div></div>';
    document.body.appendChild(sheet);

    var yw = document.createElement('div'); yw.id = 'mpl-yt'; yw.className = 'mpl-yt'; yw.setAttribute('aria-hidden', 'true');
    yw.innerHTML = '<div id="mpl-yt-in"></div>';
    document.body.appendChild(yw);

    el = { mini: mini, sheet: sheet, seek: sheet.querySelector('.mpl-seek'), vol: sheet.querySelector('.mpl-vol-in'), lbody: sheet.querySelector('.mpl-lbody'), lform: sheet.querySelector('.mpl-lform'), lres: sheet.querySelector('.mpl-lres') };

    mini.addEventListener('click', onClick); sheet.addEventListener('click', onClick);
    el.seek.addEventListener('change', function () { if (S.dur) seek(S.dur * el.seek.value / 1000); });
    el.vol.value = Math.round(volGet() * 100);
    el.vol.addEventListener('input', function () { volSet(Number(el.vol.value) / 100); applyVol(); });
    el.lbody.addEventListener('click', function (e) {
      var li = e.target.closest('li[data-t]'); if (!li) return;
      seek(Number(li.dataset.t)); if (!S.playing) toggle();
    });
    el.lform.addEventListener('submit', function (e) { e.preventDefault(); lyricSearch(el.lform.elements.title.value, el.lform.elements.artist.value); });
    el.lres.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-i]'); if (!b) return;
      var d = el.lres.__list[Number(b.dataset.i)]; if (!d) return;
      setLyrics(S.track ? lyrKey(S.track) : 'manual', d); el.lres.hidden = true;
    });
  }
  function onClick(e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.dataset.a;
    if (a === 'open') setOpen(true);
    else if (a === 'close') setOpen(false);
    else if (a === 'toggle') toggle();
    else if (a === 'back') skip(-10);
    else if (a === 'fwd') skip(10);
    else if (a === 'lsearch') { el.lform.hidden = !el.lform.hidden; if (!el.lform.hidden && S.track) { el.lform.elements.title.value = S.track.title || ''; el.lform.elements.artist.value = S.track.artist || ''; } }
  }
  function setOpen(on) {
    build(); S.open = !!on;
    if (on) { clearTimeout(el.hideT); el.sheet.hidden = false; void el.sheet.offsetWidth; el.sheet.classList.add('open'); }
    else { el.sheet.classList.remove('open'); clearTimeout(el.hideT); el.hideT = setTimeout(function () { if (!S.open) el.sheet.hidden = true; }, 520); }
    document.documentElement.classList.toggle('mpl-open', !!on);
  }
  function paint() {
    bcast();
    if (!el.mini || !S.track) return;
    var t = S.track, title = t.title || (S.engine === 'yt' ? 'YouTube' : 'Song'), artist = t.artist || '';
    el.mini.hidden = !S.shown; el.mini.classList.toggle('playing', S.playing);
    el.mini.querySelectorAll('.mpl-title').forEach(function (n) { if (n.textContent !== title) n.textContent = title; });
    el.sheet.querySelectorAll('.mpl-title').forEach(function (n) { if (n.textContent !== title) n.textContent = title; });
    var art = t.art && window.MX && MX.artOk && MX.artOk(t.art) ? t.art : '';
    el.mini.querySelectorAll('.mpl-art img').forEach(function (img) { if (art) { if (img.getAttribute('src') !== art) img.src = art; img.hidden = false; } else img.hidden = true; });
    el.sheet.querySelectorAll('.mpl-cover img, .mpx-bg img').forEach(function (img) { if (art) { if (img.getAttribute('src') !== art) img.src = art; img.hidden = false; } else img.hidden = true; });
    el.sheet.querySelectorAll('.mpx-info .mpl-artist').forEach(function (n) { if (n.textContent !== artist) n.textContent = artist; });
    el.sheet.querySelectorAll('.mpl-noart').forEach(function (n) { n.hidden = !!art; });
    var icon = S.busy ? '&#8943;' : (S.playing ? '&#10074;&#10074;' : '&#9654;');
    el.mini.querySelectorAll('[data-a=toggle]').forEach(function (b) { b.innerHTML = icon; b.setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); });
    var note = S.err || (S.busy ? 'Loading…' : (S.muted ? 'Tap play to turn the sound on' : ''));
    el.mini.querySelectorAll('.mpl-artist').forEach(function (n) { if (n.textContent !== (note || artist)) n.textContent = note || artist; n.classList.toggle('err', !!S.err); });
    el.sheet.querySelectorAll('.mpl-msg-top').forEach(function (n) { n.textContent = note; n.hidden = !note; });
    el.sheet.querySelectorAll('[data-a=toggle]').forEach(function (b) { b.innerHTML = icon; b.setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); });
    el.sheet.querySelector('.mpl-t0').textContent = fmt(S.pos);
    el.sheet.querySelector('.mpl-t1').textContent = S.dur ? fmt(S.dur) : '0:00';
    if (document.activeElement !== el.seek) el.seek.value = S.dur ? Math.round(S.pos / S.dur * 1000) : 0;
    el.mini.style.setProperty('--mpl-p', S.dur ? Math.min(100, S.pos / S.dur * 100) + '%' : '0%');
    paintLyrics();
  }
  function paintLyrics() {
    if (!el.lbody) return;
    var key = lyrKey(S.track || {});
    if (lyr.key !== key) return;
    if (lyr.lines) {
      var n = -1, i;
      for (i = 0; i < lyr.lines.length; i++) { if (lyr.lines[i].t <= S.pos + 250) n = i; else break; }
      if (n !== S.lyrCur || el.lbody.dataset.ver !== String(lyr.ver)) {
        if (el.lbody.dataset.ver !== String(lyr.ver)) {
          el.lbody.dataset.ver = String(lyr.ver);
          el.lbody.innerHTML = '<ol class="mpx-lines mpl-lines">' + lyr.lines.map(function (l, k) { return '<li data-t="' + l.t + '" data-i="' + k + '">' + (esc(l.x) || '&#9834;') + '</li>'; }).join('') + '</ol>';
        }
        var items = el.lbody.querySelectorAll('li');
        S.lyrCur = n;
        for (i = 0; i < items.length; i++) items[i].className = i === n ? 'on' : '';
        var cur = items[n]; if (cur && el.sheet.classList.contains('open')) cur.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    } else if (el.lbody.dataset.ver !== String(lyr.ver)) {
      el.lbody.dataset.ver = String(lyr.ver);
      el.lbody.innerHTML = lyr.plain ? '<div class="mpl-plain">' + esc(lyr.plain).replace(/\n/g, '<br>') + '</div>' : '<p class="mpl-msg">' + esc(lyr.msg || 'No lyrics yet.') + '</p>';
    }
    el.sheet.querySelector('.mpl-lsrc').textContent = lyr.lines ? 'Synced · LRCLIB' : (lyr.plain ? 'LRCLIB' : '');
  }

  /* ---------- volume ---------- */
  function volGet() { try { var v = parseFloat(localStorage.getItem('mid.vol')); return isNaN(v) ? 0.5 : Math.min(1, Math.max(0, v)); } catch (e) { return 0.5; } }
  function volSet(v) { try { localStorage.setItem('mid.vol', String(v)); } catch (e) {} }
  function applyVol() {
    var v = volGet();
    if (audio) audio.volume = v;
    try { if (yt.p && yt.ready) yt.p.setVolume(Math.round(v * 100)); } catch (e) {}
  }

  /* ---------- engines ---------- */
  function aud() {
    if (audio) return audio;
    audio = new Audio(); audio.preload = 'metadata'; audio.volume = volGet();
    audio.addEventListener('playing', function () { if (S.engine === 'file') { S.playing = true; S.busy = false; S.err = ''; paint(); startTick(); } });
    audio.addEventListener('pause', function () { if (S.engine === 'file') { S.playing = false; paint(); stopTick(); } });
    audio.addEventListener('ended', function () { if (S.engine === 'file') { S.playing = false; S.pos = 0; paint(); stopTick(); } });
    audio.addEventListener('loadedmetadata', function () { S.dur = isFinite(audio.duration) ? audio.duration * 1000 : 0; paint(); });
    audio.addEventListener('waiting', function () { if (S.engine === 'file') { S.busy = true; paint(); } });
    audio.addEventListener('canplay', function () { if (S.engine === 'file') { S.busy = false; paint(); } });
    audio.addEventListener('error', function () { if (S.engine === 'file') { S.busy = false; S.playing = false; S.err = 'This song could not be loaded.'; stopTick(); paint(); } });
    return audio;
  }
  function loadYT(cb) {
    if (window.YT && window.YT.Player) return cb();
    if (!loadYT.queued) {
      loadYT.queued = true;
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () { try { prev && prev(); } catch (e) {} loadYT.queued = false; loadYT.cbs.splice(0).forEach(function (f) { f(); }); };
      var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
      s.onerror = function () { loadYT.queued = false; loadYT.cbs.splice(0); S.err = 'YouTube could not load.'; paint(); };
      document.head.appendChild(s);
    }
    loadYT.cbs = loadYT.cbs || []; loadYT.cbs.push(cb);
  }
  function ytPlay(id) {
    yt.id = id; yt.ready = false; yt.want = true;
    setTimeout(function () { if (!yt.ready && S.engine === 'yt' && S.track && ytId(S.track.url) === id) { S.busy = false; S.err = 'YouTube did not load. Check the connection and try again.'; paint(); } }, 12000);
    loadYT(function () {
      if (yt.p) { try { yt.p.loadVideoById(id); } catch (e) {} return; }
      yt.p = new YT.Player('mpl-yt-in', {
        height: '1', width: '1', videoId: id,
        playerVars: { playsinline: 1, controls: 0, rel: 0, modestbranding: 1, origin: location.origin },
        events: {
          onReady: function (e) {
            yt.ready = true; applyVol();
            try { var d = e.target.getDuration(); if (d > 0) S.dur = d * 1000; } catch (err) {}
            try { var v = e.target.getVideoData && e.target.getVideoData(); if (v && S.track && !S.track.title && v.title) { S.track.title = v.title; S.track.artist = S.track.artist || v.author || ''; } } catch (err) {}
            if (yt.want) { yt.want = false; try { e.target.playVideo(); } catch (err) {} setTimeout(ytFallback, 1500); }
            paint();
          },
          onError: function () { if (S.engine !== 'yt') return; S.busy = false; S.playing = false; S.err = 'This YouTube link cannot play here.'; stopTick(); paint(); },
          onStateChange: function (e) {
            if (S.engine !== 'yt') return;
            var st = e.data;
            if (st === 1) { S.playing = true; S.busy = false; S.err = ''; startTick(); }
            else if (st === 3) { S.busy = true; }
            else if (st === 2) { S.playing = false; stopTick(); }
            else if (st === 0) { S.playing = false; S.pos = 0; stopTick(); }
            else if (st === 3) { try { var d = yt.p.getDuration(); if (d > 0) S.dur = d * 1000; } catch (err) {} }
            paint();
          }
        }
      });
    });
  }
  /* a browser may refuse sound before a tap: start muted, and the next tap turns the sound on */
  function ytFallback() {
    if (S.engine !== 'yt' || S.playing || !yt.p || !yt.ready) return;
    try { yt.p.mute(); yt.p.playVideo(); S.muted = true; S.busy = false; paint(); } catch (e) {}
  }
  function ytCall(fn) { if (yt.p && yt.ready) { try { return fn(yt.p); } catch (e) {} } return null; }

  /* ---------- playback ---------- */
  function startTick() { if (!tick) tick = setInterval(progress, 250); }
  function stopTick() { if (tick) { clearInterval(tick); tick = 0; } }
  function progress() {
    if (S.engine === 'file' && audio) S.pos = audio.currentTime * 1000;
    else if (S.engine === 'yt') { var t = ytCall(function (p) { return p.getCurrentTime(); }); if (t != null) S.pos = t * 1000; var d = ytCall(function (p) { return p.getDuration(); }); if (d > 0) S.dur = d * 1000; }
    paint();
  }
  function pauseAll() {
    if (audio && !audio.paused) audio.pause();
    if (S.engine === 'yt') ytCall(function (p) { p.pauseVideo(); });
    S.playing = false; stopTick();
  }
  function toggle() {
    if (!S.track) return;
    if (S.playing) { userPaused = true; pauseAll(); paint(); return; }
    S.err = '';
    if (S.engine === 'file') {
      var a = aud(); S.busy = true; paint();
      var pr = a.play();
      if (pr && pr.catch) pr.catch(function () { S.busy = false; S.err = 'Tap play again to start the sound.'; paint(); });
    } else if (S.engine === 'yt') {
      if (yt.p && yt.ready) {
        if (S.muted) { try { yt.p.unMute(); } catch (e) {} S.muted = false; }
        S.busy = true; ytCall(function (p) { p.playVideo(); }); setTimeout(ytFallback, 1500);
      } else { yt.want = true; S.busy = true; }
    }
    paint();
  }
  function skip(sec) { if (S.dur) seek(Math.min(S.dur, Math.max(0, S.pos + sec * 1000))); }
  function seek(ms) {
    S.pos = Math.max(0, ms);
    if (S.engine === 'file' && audio) audio.currentTime = ms / 1000;
    else if (S.engine === 'yt') ytCall(function (p) { p.seekTo(ms / 1000, true); });
    paint();
  }

  /* ---------- lyrics (LRCLIB) ---------- */
  function lyrKey(t) { return (t.url || t.audio || '') + '|' + (t.title || '') + '|' + (t.artist || ''); }
  function parseLrc(s) {
    var out = [];
    String(s || '').split(/\r?\n/).forEach(function (ln) {
      var m = ln.match(/^\s*\[(\d+):(\d+(?:\.\d+)?)\](.*)$/); if (!m) return;
      out.push({ t: (Number(m[1]) * 60 + Number(m[2])) * 1000, x: m[3].trim() });
    });
    return out.length ? out : null;
  }
  function setLyrics(key, d) {
    var lines = d && parseLrc(d.syncedLyrics);
    lyr = { key: key, lines: lines, plain: lines ? '' : (d && d.plainLyrics) || '', msg: lines || (d && d.plainLyrics) ? '' : 'No lyrics found for this song.', ok: !!(lines || (d && d.plainLyrics)), ver: lyr.ver + 1 };
    S.lyrCur = -1; paint();
  }
  function fetchLyrics(path) {
    return fetch('https://lrclib.net/api/' + path).then(function (r) { if (r.status === 404) return null; if (!r.ok) throw 0; return r.json(); })
      .catch(function () { return fetch('/api/lyrics?p=' + encodeURIComponent(path)).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); });
  }
  function loadLyrics() {
    var t = S.track; if (!t || t.lyrics === false) return;
    var key = lyrKey(t);
    if (lyr.key === key) return;
    if (lyrCache[key]) { setLyrics(key, lyrCache[key]); return; }
    lyr = { key: key, lines: null, plain: '', msg: 'Finding lyrics…', ok: false, ver: lyr.ver + 1 }; paint();
    var q = 'get?track_name=' + encodeURIComponent(t.title || '') + '&artist_name=' + encodeURIComponent(t.artist || '') + (S.dur ? '&duration=' + Math.round(S.dur / 1000) : '');
    fetchLyrics(q).then(function (d) {
      if (d) return d;
      return fetchLyrics('search?q=' + encodeURIComponent((t.title || '') + ' ' + (t.artist || '')).trim()).then(function (list) { return Array.isArray(list) ? (list.find(function (x) { return x.syncedLyrics; }) || list[0]) : null; });
    }).then(function (d) {
      if (S.track && lyrKey(S.track) !== key) return;
      lyrCache[key] = d || {};
      setLyrics(key, d);
    });
  }
  /* a YouTube link has no title yet: read it from YouTube, then look up the lyrics with it */
  function ytMeta(t) {
    fetch('/api/yt-meta?url=' + encodeURIComponent(t.url)).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
      if (!m || !S.track || S.track.url !== t.url) return;
      S.track.title = m.songTitle || m.title || S.track.title || ''; S.track.artist = m.songArtist || m.artist || S.track.artist || ''; S.track.art = m.art || S.track.art || '';
      lyr.key = ''; loadLyrics(); paint(); bcast();
    }).catch(function () { if (S.track && S.track.url === t.url) { lyr.key = ''; loadLyrics(); } });
  }
  function lyricSearch(title, artist) {
    el.lres.hidden = false; el.lres.innerHTML = '<p class="mpl-msg">Searching…</p>';
    fetchLyrics('search?q=' + encodeURIComponent(((title || '') + ' ' + (artist || '')).trim())).then(function (list) {
      list = (Array.isArray(list) ? list : []).filter(function (d) { return d && (d.syncedLyrics || d.plainLyrics); }).slice(0, 6);
      el.lres.__list = list;
      if (!list.length) { el.lres.innerHTML = '<p class="mpl-msg">Nothing found. Try just the song title.</p>'; return; }
      el.lres.innerHTML = list.map(function (d, i) { return '<button type="button" class="mpl-res" data-i="' + i + '">' + esc(d.trackName || d.name || 'Untitled') + ' <small>' + esc(d.artistName || '') + '</small></button>'; }).join('');
    });
  }

  /* ---------- public API ---------- */
  function play(track) {
    if (!track) return;
    var same = S.track && lyrKey(S.track) === lyrKey(track);
    if (same) { setOpen(true); if (!S.playing) toggle(); return; }
    var ytid = ytId(track.url);
    if (!track.audio && !ytid) { if (track.url) window.open(track.url, '_blank', 'noopener'); return; }   // Spotify and other links open outside the player
    pauseAll();
    S.track = track; userPaused = false; S.shown = true; S.busy = true; S.pos = 0; S.dur = Number(track.durationMs || 0); S.lyrCur = -1; S.err = '';
    if (track.audio) {
      S.engine = 'file';
      var a = aud(); a.src = track.audio; a.currentTime = 0;
    } else {
      S.engine = 'yt';
      ytPlay(ytid);
    }
    S.busy = true; S.playing = false; S.muted = false;
    build(); paint();
    if (track.audio) loadLyrics(); else ytMeta(track);
    toggle();
  }
  function pause() { pauseAll(); paint(); }
  function state() { return { track: S.track, src: S.track ? (S.engine === 'file' ? 'file' : 'youtube') : '', engine: S.engine, playing: S.playing, pos: S.pos, dur: S.dur, open: S.open, shown: S.shown }; }
  function lyrics(want) {
    if (want !== undefined && want && S.track) loadLyrics();
    return { lines: lyr.lines, plain: lyr.plain, msg: lyr.msg, ver: lyr.ver, ok: !!(lyr.lines || lyr.plain) };
  }
  function searchLyrics() { build(); setOpen(true); el.lform.hidden = false; if (S.track) { el.lform.elements.title.value = S.track.title || ''; el.lform.elements.artist.value = S.track.artist || ''; } }

  window.MaplePlayer = {
    setProfile: function () {},
    play: play,
    pause: pause,
    ctl: function (a) { if (a === 'toggle') toggle(); else if (a === 'back') skip(-10); else if (a === 'fwd') skip(10); },
    open: function () { build(); setOpen(true); },
    close: function () { setOpen(false); },
    state: state,
    lyrics: lyrics,
    searchLyrics: searchLyrics
  };
  window.addEventListener('pagehide', pause);

  /* ---------- header auto-hide: scrolling down slides the header up, and the music pill slides up behind it.
   * Scrolling up (or being near the top, or with the menu open) brings them back. */
  function hdrHide() {
    if (document.getElementById('mpl-hdr-css')) return;
    var st = document.createElement('style'); st.id = 'mpl-hdr-css';
    st.textContent = '.topbar{transition:transform .3s ease}' +
      'body.tb-auto-hidden .topbar{transform:translateY(-110%)}' +
      'body.tb-auto-hidden .mpl-mini{transform:translate(-50%,calc(-1 * (var(--tb-h,64px) + 60px)))}';
    document.head.appendChild(st);
    var last = window.scrollY || 0;
    window.addEventListener('scroll', function () {
      var y = window.scrollY || 0, d = y - last; last = y;
      if (document.documentElement.classList.contains('sh-open') || y < 80) document.body.classList.remove('tb-auto-hidden');
      else if (d > 6) document.body.classList.add('tb-auto-hidden');
      else if (d < -6) document.body.classList.remove('tb-auto-hidden');
    }, { passive: true });
  }
  hdrHide();

  /* ---------- star cards (iframes) talk to this player with postMessage ----------
   * The Audio Player slide inside a card sends mp-play / mp-ctl and listens for mp-state. */
  function toFrames(msg) { document.querySelectorAll('iframe.star-frame').forEach(function (f) { try { f.contentWindow.postMessage(msg, location.origin); } catch (e) {} }); }
  function bcast() {
    var t = S.track || {};
    var msg = { title: t.title || '', artist: t.artist || '', art: t.art || '', playing: S.playing, buffering: !!S.busy && !S.playing,
      pos: S.pos, dur: S.dur || t.durationMs || 0, src: S.track ? (S.engine === 'file' ? 'file' : 'youtube') : '', engine: S.engine,
      lyrMsg: lyr.msg, err: S.err, lyrKey: lyr.ver };
    if (lyr.sent !== lyr.ver) { lyr.sent = lyr.ver; msg.lines = lyr.lines; msg.plain = lyr.plain; }
    toFrames({ maple: 'mp-state', s: msg });
  }
  /* ---------- autoplay: opening a card starts its song ----------
   * Browsers allow sound only after a tap, so when the start is refused the song starts on the visitor's next tap. */
  function trackFrom(v) {
    if (!v || v.music === false) return null;
    var s = v.song;
    if (s && /^https:\/\//.test(s.audio || '')) return { audio: s.audio, url: s.audio, title: s.title || 'Untitled', artist: s.artist || '', art: s.art || '', durationMs: s.durationMs || 0, slug: v.slug || '' };
    var id = ytId(v.link);
    return id ? { url: 'https://www.youtube.com/watch?v=' + id, title: '', artist: '', art: '', slug: v.slug || '' } : null;
  }
  function autoStart(v) {
    var t = trackFrom(v); if (!t) return;
    var same = S.track && lyrKey(S.track) === lyrKey(t);
    if (same) { if (!S.playing && !userPaused) { armTap(); toggle(); } return; }
    play(t); armTap();
  }
  function armTap() { if (armedTap) return; armedTap = true; document.addEventListener('pointerdown', tapStart, true); }
  function tapStart(e) {
    if (!S.track || S.playing || userPaused) return;
    if (el.mini && (el.mini.contains(e.target) || (el.sheet && el.sheet.contains(e.target)))) return;   // the player's own buttons handle themselves
    armedTap = false; document.removeEventListener('pointerdown', tapStart, true);
    toggle();
  }
  window.addEventListener('message', function (e) {
    var d = e.data; if (e.origin !== location.origin || !d) return;
    if (d.maple === 'mp-play' && d.track) { play(d.track); return; }
    if (d.maple !== 'mp-ctl') return;
    var a = d.act;
    if (a === 'hello') { lyr.sent = -1; setTimeout(bcast, 50); autoStart(d.v || {}); }
    else if (a === 'toggle') toggle();
    else if (a === 'back') skip(-10);
    else if (a === 'fwd') skip(10);
    else if (a === 'seek' && S.dur) seek(S.dur * Math.min(1, Math.max(0, Number(d.v) || 0)));
    else if (a === 'seekms') seek(Math.max(0, Number(d.v) || 0));
    else if (a === 'lsearch') { if (S.track) searchLyrics(); }
  });
})();
