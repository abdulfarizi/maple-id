# M-ID v36-7 · autoplay on every profile

- Opening a profile now **starts that profile's song automatically** (uploaded MP3, YouTube or Spotify link). Their song plays on their profile; go back to your own profile and your song takes over (the other one stops).
- Browsers only allow sound after a tap. Opening a card/profile from inside the app is a tap, so it just plays. If the browser still refuses (page opened straight from a link), the song starts on the visitor's **first tap anywhere** (no pop-up player in the meantime).
- If the visitor presses pause themselves, it will not restart on its own for that song.
- Profiles with Music switched off (Studio) stay silent. Songs started from "Music I like" are never interrupted.
- Files: assets/maple-player.js (cache-buster ?v=13 in index.html). No env vars or SQL.
