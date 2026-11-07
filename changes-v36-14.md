# M-ID v36-14 · saved lyrics + lyric search
- **Picked lyrics were never saved.** Studio sent them, but the server's list of saveable profile fields (index.html) didn't include `lyricsFix`, so they were dropped on Publish and the player fell back to automatic lookup / manual search. Now saved (and cleaned, line breaks kept).
  - After deploying, open Studio → Music → Lyrics, choose the lyrics again once, and Publish. Lyrics chosen before this version were not stored.
- **Search fields:** the Artist box is pre-filled from the song's source; for YouTube that was the channel name ("Artist - Topic", "ArtistVEVO"), which made searches fail. It is now cleaned, and if title + artist finds nothing the search retries with the title only. Same in the player's own Search box.
Files: index.html, assets/maple-studio-x.js ?v=8, assets/maple-player.js ?v=16.
