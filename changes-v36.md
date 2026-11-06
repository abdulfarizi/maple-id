# M-ID v36 · tab fix, YouTube player, automatic lyrics

**Fixed: Home and Explore couldn't be opened after a Glass slides card was shown**
- The Glass slides layout was `position:fixed` over the whole screen, so it stayed on top of the Home and Explore panes. It now lives inside its own pane (card or Profile), so the dock, swiping and arrow keys work again. Keyboard slide navigation also pauses while another pane is on screen.

**Music player**
- **YouTube links**: paste a YouTube link (watch, youtu.be, shorts, music.youtube.com) as the Featured track or in Music I like. Plays through YouTube's official player (the video shows in the expanded player) with the same play/pause, ±10 s and seek controls. Title, channel and thumbnail are filled in automatically (new `/api/yt-meta` function, no API key needed).
- **Automatic lyrics** for every source (Spotify, YouTube, uploads), on by default; switch off in Studio → Music. Titles are cleaned of "(Official Video)", "[Lyrics]", "feat. …", "- Topic" etc., "Artist - Title" is split, and LRCLIB is tried with several fallbacks (exact match, fuzzy search, title only), preferring time-synced lyrics.
- **Uploads**: MP3 title, artist and embedded cover art are read from the file's ID3 tags automatically.
- Uploads still need `supabase_songs.sql` run once (same as before). No other database change.
- Star cards: a YouTube featured track plays in the bottom player (the star card's own inline player is Spotify-only).
