# M-ID v36-15 · turn off automatic lyric search
- Studio → Music has a new switch: **"Search for lyrics automatically (off = only the lyrics I choose below)"**.
  - Off: the player makes no automatic lookup. Lyrics you chose in Studio (or pasted) still show; if none are chosen, the player says "No lyrics chosen" with a manual Search button.
  - The first switch is now "Show lyrics, when available" (off = no lyrics panel at all, as before).
- Saved on the profile as `lyricsAuto` (index.html whitelist + boolean). Default is on, so existing profiles behave as before.
Files: index.html, assets/index-maple1.js, assets/maple-player.js ?v=17, assets/maple-deck.js ?v=14, assets/maple-studio-x.js ?v=9.
