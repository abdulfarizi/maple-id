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
    if (!window.MX || !MX.youtube) return '';
    var y = MX.youtube(u); return y ? y.id : '';
  };

  var S = { track: null, engine: '', playing: false, pos: 0, dur: 0, open: false, shown: false, lyrCur: -1 };
  var lyr = { key: '', lines: null, plain: '', msg: '', ok: false, ver: 0 };
  var audio = null, yt = { p: null, ready: false, want: false, id: '' }, tick = 0, lyrCache = {};
  var el = {};

  /* ---------- UI ---------- */
  function build() {
    if (el.mini) return;
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/assets/maple-player-lite.css?v=1';
    document.head.appendChild(css);

    var mini = document.createElement('div'); mini.id = 'mpl-mini'; mini.className = 'mpl-mini'; mini.hidden = true;
    mini.innerHTML = '<button type="button" class="mpl-mini-open" data-a="open" aria-label="Open the player">'
      + '<span class="mpl-art"><img alt="" hidden></span><span class="mpl-mini-txt"><b class="mpl-title"></b><small class="mpl-artist"></small></span></button>'
      + '<button type="button" class="mpl-btn" data-a="toggle" aria-label="Play"></button>';
    document.body.appendChild(mini);

    var sheet = document.createElement('div'); sheet.id = 'mpl-sheet'; sheet.className = 'mpl-sheet'; sheet.hidden = true;
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'Now playing');
    sheet.innerHTML = '<div class="mpl-top"><button type="button" class="mpl-btn ghost" data-a="close" aria-label="Close">&#8964;</button><span class="mpl-from">Now playing</span><span></span></div>'
      + '<div class="mpl-cover"><img alt="" hidden><span class="mpl-noart">&#9835;</span></div>'
      + '<div class="mpl-info"><h2 class="mpl-title"></h2><p class="mpl-artist"></p></div>'
      + '<div class="mpl-prog"><input type="range" class="mpl-seek" min="0" max="1000" value="0" aria-label="Seek"><div class="mpl-times"><span class="mpl-t0">0:00</span><span class="mpl-t1">0:00</span></div></div>'
      + '<div class="mpl-ctrls"><button type="button" class="mpl-btn" data-a="back" aria-label="Back 10 seconds">&#8630;10</button>'
      + '<button type="button" class="mpl-btn big" data-a="toggle" aria-label="Play"></button>'
      + '<button type="button" class="mpl-btn" data-a="fwd" aria-label="Forward 10 seconds">10&#8631;</button></div>'
      + '<label class="mpl-vol">Volume <input type="range" class="mpl-vol-in" min="0" max="100" step="1" aria-label="Volume"></label>'
      + '<section class="mpl-lyrics" aria-label="Lyrics"><header><b>Lyrics</b><small class="mpl-lsrc"></small><button type="button" class="mpl-btn small" data-a="lsearch">Search</button></header>'
      + '<form class="mpl-lform" hidden><input name="title" placeholder="Song title" aria-label="Song title"><input name="artist" placeholder="Artist" aria-label="Artist"><button type="submit" class="mpl-btn small">Find</button></form>'
      + '<div class="mpl-lres" hidden></div><div class="mpl-lbody"></div></section>';
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
    build(); S.open = !!on; el.sheet.hidden = !on; el.sheet.classList.toggle('open', !!on);
    document.documentElement.classList.toggle('mpl-open', !!on);
  }
  function paint() {
    if (!el.mini || !S.track) return;
    var t = S.track, title = t.title || (S.engine === 'yt' ? 'YouTube' : 'Song'), artist = t.artist || '';
    el.mini.hidden = !S.shown; el.mini.classList.toggle('playing', S.playing);
    el.mini.querySelectorAll('.mpl-title').forEach(function (n) { if (n.textContent !== title) n.textContent = title; });
    el.sheet.querySelectorAll('.mpl-title').forEach(function (n) { if (n.textContent !== title) n.textContent = title; });
    el.sheet.querySelectorAll('.mpl-artist').forEach(function (n) { if (n.textContent !== artist) n.textContent = artist; });
    var art = t.art && window.MX && MX.artOk && MX.artOk(t.art) ? t.art : '';
    el.mini.querySelectorAll('.mpl-art img').forEach(function (img) { if (art) { if (img.getAttribute('src') !== art) img.src = art; img.hidden = false; } else img.hidden = true; });
    el.sheet.querySelectorAll('.mpl-cover img').forEach(function (img) { if (art) { if (img.getAttribute('src') !== art) img.src = art; img.hidden = false; } else img.hidden = true; });
    el.sheet.querySelectorAll('.mpl-noart').forEach(function (n) { n.hidden = !!art; });
    el.mini.querySelectorAll('[data-a=toggle]').forEach(function (b) { b.innerHTML = S.playing ? '&#10074;&#10074;' : '&#9654;'; b.setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); });
    el.sheet.querySelectorAll('[data-a=toggle]').forEach(function (b) { b.innerHTML = S.playing ? '&#10074;&#10074;' : '&#9654;'; b.setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); });
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
          el.lbody.innerHTML = '<ol class="mpl-lines">' + lyr.lines.map(function (l, k) { return '<li data-t="' + l.t + '" data-i="' + k + '">' + (esc(l.x) || '&#9834;') + '</li>'; }).join('') + '</ol>';
        }
        var items = el.lbody.querySelectorAll('li');
        S.lyrCur = n;
        for (i = 0; i < items.length; i++) items[i].className = i === n ? 'cur' : (i === n + 1 ? 'nxt' : '');
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
    audio.addEventListener('playing', function () { if (S.engine === 'file') { S.playing = true; paint(); startTick(); } });
    audio.addEventListener('pause', function () { if (S.engine === 'file') { S.playing = false; paint(); stopTick(); } });
    audio.addEventListener('ended', function () { if (S.engine === 'file') { S.playing = false; S.pos = 0; paint(); stopTick(); } });
    audio.addEventListener('loadedmetadata', function () { S.dur = isFinite(audio.duration) ? audio.duration * 1000 : 0; paint(); });
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
            if (yt.want) { yt.want = false; try { e.target.playVideo(); } catch (err) {} }
            paint();
          },
          onStateChange: function (e) {
            if (S.engine !== 'yt') return;
            var st = e.data;
            if (st === 1) { S.playing = true; startTick(); }
            else if (st === 2) { S.playing = false; stopTick(); }
            else if (st === 0) { S.playing = false; S.pos = 0; stopTick(); }
            else if (st === 3) { try { var d = yt.p.getDuration(); if (d > 0) S.dur = d * 1000; } catch (err) {} }
            paint();
          }
        }
      });
    });
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
    if (S.playing) { pauseAll(); paint(); return; }
    if (S.engine === 'file') { var a = aud(); a.play().catch(function () { S.err = 'Tap play again to start the sound.'; paint(); }); }
    else if (S.engine === 'yt') {
      if (yt.p && yt.ready) { ytCall(function (p) { p.playVideo(); }); }
      else yt.want = true;
    }
    S.playing = true; startTick(); paint();
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
    S.track = track; S.shown = true; S.pos = 0; S.dur = Number(track.durationMs || 0); S.lyrCur = -1; S.err = '';
    if (track.audio) {
      S.engine = 'file';
      var a = aud(); a.src = track.audio; a.currentTime = 0;
    } else {
      S.engine = 'yt';
      ytPlay(ytid);
    }
    build(); paint(); loadLyrics();
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
})();
