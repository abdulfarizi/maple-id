# M-ID

M-ID is a digital ID card site: one link that shares your game handles, streams, socials and music. It is a static site on Vercel, backed by Supabase for accounts, the database and file storage.

## Project layout

```
index.html          Main app: homepage, Explore, profiles, Studio, Feed, messages, music player
owner/              Owner page (the "maple" account)
builder/            Free-canvas card builder page
spotify-callback/   Return page for "Connect Spotify"
api/                Serverless functions (Vercel): Spotify, YouTube, lyrics, covers, uploads
assets/             CSS and JavaScript, plus card frame artwork (frame-art/, frame-kit/)
sql/                Supabase setup scripts (run once each, see below)
vercel.json         Routing and cache headers
manifest.json       Web app manifest
icon*.png, icon.svg, apple-icon.png, favicon.png, frame-art-preview.jpg   Icons and preview images
```

There is no build step; `package.json` only declares the project name and Node 20+.

## Setup

### 1. Supabase database (run once each, in the SQL editor)

Run the scripts in `sql/` in this order. Each one says it is safe to re-run.

1. `supabase_forum.sql`: forum posts and comments (required for the Feed)
2. `supabase_forum_v2.sql`: reports, pinned posts, notifications, private messages (run after step 1)
3. `supabase_anon_messages.sql`: anonymous messages with text and drawings
4. `supabase_card_number.sql`: automatic card numbers (ID / 001, 002, …)
5. `supabase_badges.sql`: owner badges (tick and crown); needs step 1
6. `supabase_songs.sql`: storage bucket `song-media` for uploaded songs and covers
7. `supabase_storage.sql`: storage bucket `forum-media` for feed and message pictures, GIFs, video and voice notes

Note: `index.html` refers to a `supabase_setup.sql` script that is not in this repository. The scripts above are the ones included here.

### 2. Environment variables (Vercel → Settings → Environment Variables)

All optional. Without them the features fall back to simpler behaviour.

| Variable | Used for |
| --- | --- |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Spotify artist names and durations; splitting Spotify albums and playlists into songs |
| `YOUTUBE_API_KEY` | Splitting YouTube playlists into songs (YouTube Data API v3, free key) |

Without the Spotify variables, Spotify links still work through Spotify's oEmbed (title and artwork only).

### 3. Deploy

Vercel serves the repository root. The changelog entries below say "re-upload the folder to Vercel"; if the Vercel project is connected to this GitHub repository, pushing to `main` deploys the change.

---

## Changelog

Newest first. Version numbers come from the original change logs; where a version was superseded by a later one, only the later one is listed.

### v36-22 · Frames fit the card, and Publish keeps every frame

- **Fixed: Publish reset the card to "default".** The save step only allowed 5 frame IDs. The 7 newer frames (Solar phoenix, Celestial guardian, Cyber core, Neon reactor, Cloud kitty, Star bunny, Moonlight cat) were wiped to "none" on Publish. All 12 IDs are now allowed.
- **Fixed: giant, blurry frame covering the card.** Frames were stretched to the card's width and height, so on tall phone cards they were enlarged about three times. Each frame is now a 9-slice kit (`assets/frame-kit/<id>.png`) with fixed-size corners and ornaments and stretchable plain edges. The artwork keeps its proportions and sits about 16 px outside the card edge.
- **Fixed:** choosing the Jade dragon frame threw an error in the animation loop that could stop every frame updating. A frame that fails to draw no longer affects the others.
- Note: frames are now thinner borders, so ornaments are smaller than the original art. Dragon and Phoenix look the least crisp.
- Files: `index.html`, `owner/index.html`, `assets/maple-frames.js`, `assets/frame-kit/*`.

### v36-21 · Living card frames and avatar decorations on every card style

- **Studio → Look → Card frame** (new): Jade dragon, Peeking kitty, Tech panel, Jade garden, Neon edge, or None. Works on Basic, Glass slides and Star cards, and is saved with Publish.
- **Jade dragon:** drawn from scratch and animated. Its body coils around the card, a claw grips the edge, the head breathes embers, blinks and sways its whiskers.
- **Peeking kitty:** fluffy trim, ears that twitch, a face that blinks, tapping paws and a swishing tail.
- **Avatar decoration** (same Look tab): Neon ring, Holo spin, Dotted orbit, Sparkles, Cat ears, Halo, Leaf wreath, Glitch, with a colour. Shown on Basic, Glass and Star avatars.
- Frames are a click-through layer on top of the page, so they never change the card layout or get clipped. They follow the card while scrolling, hide when off screen, and stop moving for visitors with reduce-motion turned on.
- Not included: the Free canvas builder has its own frames (v36-20) but not the dragon or kitty.
- No database change. Profile fields `frame`, `avatarDeco` and `avatarDecoColor` are saved with the rest of the profile.
- Files: `assets/maple-frames.js`, `assets/maple-frame-studio.js` (new), `assets/index-maple1.js`, `assets/maple-deck.js`, `owner/index.html`, `index.html`.

### v36-20 · Card frames, effects and three new templates (Builder)

- **Page style → Frame:** Tech panel, Plush kitty, Jade garden and Neon edge. Original SVG artwork drawn around the whole card.
- **Page style → Effect:** Sparkles or Soft glow overlay.
- **New templates:** Tech card, Plush kitty, Jade garden (frame, colours and layout set together).
- Frames sit about 14 px in from the sides and 24 px from top and bottom, so keep content inside them. Motion stops for reduced-motion users.
- File: `builder/page.html`.

### v36-19 · Avatar decorations and crown centring

- **Avatar decorations (Builder):** select an Avatar element → Decoration: Neon ring, Holo spin, Dotted orbit, Sparkles, Cat ears, Halo, Leaf wreath, Glitch. All original SVG/CSS artwork, animated, drawn around a round avatar. They use the avatar's border colour, except Holo and Halo, which have fixed colours.
- **Crown** re-centred inside its box so it lines up with the tick (shared by every card style).
- Not yet: decorations on the non-Builder cards, and extra badge icons (needs a small database change).
- Files: `builder/page.html`, `assets/maple-badges.js`, badge assets in `index.html` and `owner/index.html`.

### v36-18 · Badges on the free-canvas Builder page

- The Builder shows the verified tick and crown next to the name, using the same helper as the other card styles.
- **Templates:** the name text in Basic, Star, Neon, Minimal and Pastel has "Badges after text" on.
- **Existing pages:** if a saved page has no badge-enabled text, the text block matching the profile name gets it automatically.
- **Editor:** any Text element has a "Badges after text" option (Hide / Show).
- Giving and removing badges is still owner-only (Menu → Badges). Explore and Feed lists don't show badges yet.

### v36-17 · Badges on every card style; owner control only in the menu

- The "Owner · badges" toggles on the Glass profile card were removed. Giving or taking a badge is only in the hamburger menu → **Badges**, shown when logged in as the site owner. The server also refuses anyone else.
- Badges show on every card style next to the name: Basic, Star and Glass, through one shared helper (`assets/maple-badges.js` and `.css`).
- Not covered: the Builder page (added in v36-18) and Explore/Feed lists.

### v36-16 · Badge manager in the menu (owner only)

- New **Badges** entry in the hamburger menu, under You, next to Reports. Only shown when logged in as the owner. Type a profile name, press Find, then tap **Verified tick** and/or **Crown**.
- The server only accepts badge changes from the owner account. Run `sql/supabase_badges.sql` if not already done.

### v36-15 · Turn off automatic lyric search

- Studio → Music has a new switch: **"Search for lyrics automatically"**.
  - Off: the player makes no automatic lookup. Lyrics you chose in Studio (or pasted) still show. If none are chosen, the player says "No lyrics chosen" with a manual Search button.
  - The first switch is now **"Show lyrics, when available"** (off = no lyrics panel at all).
- Saved on the profile as `lyricsAuto` (default on, so existing profiles behave as before).

### v36-14 · Saved lyrics and lyric search fixes

- **Picked lyrics were never saved.** The server's whitelist of saveable profile fields left out `lyricsFix`, so they were dropped on Publish. Now saved and cleaned, with line breaks kept.
  - After deploying, open Studio → Music → Lyrics, choose the lyrics again once, and Publish. Lyrics chosen before this version were not stored.
- **Search fields:** the Artist box was pre-filled with the YouTube channel name ("Artist - Topic", "ArtistVEVO"), which broke searches. It is now cleaned, and if title + artist finds nothing, the search retries with the title only.

### v36-13 · Now Playing bar and full-screen player

- Removed the GPU-layer hints that clashed with backdrop blur in some browsers (the bar was drawn half-clipped or not at all). The bar is centred with margins, and the full-screen player uses the real viewport height (100dvh) on phones.

### v36-12 · Smaller music widget, Light/Dark in the menu

- **Music widget (Glass profile):** the player is now inside the lower card with visits and reactions, and the slide is more compact on short screens, so the whole player is visible. The scroll hint is hidden on very short screens.
- **Light/Dark button moved into the menu** (hamburger → More → "Light mode" / "Dark mode"). The circle reveal grows from the menu row, and the menu stays open.
- **Light/Dark no longer follows the device.** The site uses your saved pick, and dark if you haven't picked yet.

### v36-11 · Glass profile redesign, gear card, owner badges, no flicker on Light/Dark

- **Glass profile slide:** one fixed main card (banner, avatar, name, status, role, short bio) that never scrolls inside. Bio clamped to 3 lines (2 on short phones).
- **Two buttons** replace the social icons: **Message me** (opens a private message on the site; asks you to log in if needed) and **WhatsApp** (uses the Phone in Studio → Contact, or the Seller WhatsApp; hidden if neither is set).
- **Counter removed** ("01 / 07 PROFILE"). The social icon row is removed from the card. The full Socials slide is unchanged.
- **Duplicates removed from the slide:** "edit in Studio", "View public card", "Signed in as … Log out", and the Studio button in the card actions. Studio, My card and Log out stay in the header and hamburger menu.
- **Bottom card** holds everything else: visits, location, like, Save contact / copy / QR / share, reactions.
- **Gear card** (new slide after Profile): phone, tablet, laptop, desktop, VR headset, GPU, other. Edit in Studio → Look (Glass layout) → Gear (up to 12 items).
- **Owner badges:** tick = verified, crown = special honour, shown beside the name. Only the owner account sees the toggle, and the server only accepts changes from the owner. **Run `sql/supabase_badges.sql`** once (needs `supabase_forum.sql` already run).
- **Light/Dark flicker fixed:** the new look no longer shows full screen for one frame, the floating shapes recolour inside the switch instead of popping afterwards, and the toggle button no longer jumps.
- Files: `assets/maple-deck.js` and `.css`, `assets/maple-deck-studio.js`, `assets/maple-mode.js` and `.css`, `index.html`, `owner/index.html`, `sql/supabase_badges.sql` (new).

### v36-10 · Glass slides: real Light/Dark, see-through player, Studio scrolls again

- **Studio can scroll again.** The Glass layout's pane rules also matched the Studio's small preview, which lost its scroll. The rules now only match a pane holding the full-screen deck.
- **Light/Dark now changes the whole Glass layout**, not just the header and nav. Every card style (outline, solid, neon, tinted, glass) has a light version.
- **Audio player card is more transparent** in both modes.
- **Lyrics readable in light mode:** dark text with a soft halo; the current line uses the accent colour. Dark mode gets a soft shadow.
- Floating particles recolour when you switch mode.
- **v36-10b:** removed the washed-out glow behind the lyrics on the light background; idle lines and the current line have clearer contrast in the full-screen "Now playing" sheet too.
- **v36-10c/d/e:** the circle reveal that grows from the button is back on every layout, and is lighter (0.42 s instead of 0.62 s, with animations paused during the switch).
- Files: `assets/maple-deck.css`, `assets/maple-deck.js`, `assets/maple-player.css`, `assets/maple-mode.js` and `.css`, `index.html`, `owner/index.html`.

### v36-9 · Glass layout opens with a star zoom

- The Glass slides layout no longer shows a "click to enter" screen. It opens with the same hollow-star zoom as the card intro: the star pops in, holds, then zooms and spins until the slides are revealed (about 1.7 s).
- The star uses the profile's accent colour and the current Light/Dark background.
- Reduced-motion visitors and the Studio preview skip the animation.
- Safety: the overlay is removed after 4 s at most.
- **v36-9b · autoplay without a tap:** music starts by itself on every profile. If the browser refuses sound, the song starts muted and the first touch anywhere turns the sound on. Spotify links can only start after a tap (a Spotify rule). Pressing play/pause yourself always gives sound.
- Files: `assets/maple-deck.js`, `assets/maple-deck.css`, `assets/maple-player.js`.

### v36-8 · Transparent player and lyrics, light/dark mode, flicker fix

- The full-screen player is see-through glass, with a soft tint of the cover art, instead of a solid black page.
- Lyrics have no box: transparent in the Audio Player sheet, the glass-deck Audio Player slide and the star card.
- **Light/Dark covers the player:** all its colours come from the site tokens, so both modes work.
- **Flicker:** the player only repaints what changed, at most once per frame. The mini bar's pulsing ring is now static while playing. Deck lyrics no longer use per-line blur.
- Files: `assets/maple-player.js`, `assets/maple-player.css`, `assets/maple-deck.css`, `assets/maple-stack.css`.

### v36-7 · Autoplay on every profile

- Opening a profile starts that profile's song automatically (uploaded MP3, YouTube or Spotify link). Going back to your own profile lets your song take over.
- If the browser still refuses sound, the song starts on the visitor's first tap anywhere.
- If a visitor presses pause themselves, it won't restart on its own for that song.
- Profiles with Music switched off in Studio stay silent. Songs started from "Music I like" are never interrupted.
- File: `assets/maple-player.js`.

### v36-6d · The profile on screen owns the player

- The shared player used to keep playing another profile's song after you came back to your own. Now opening a profile with its own song switches the player to that song (paused, no autoplay) and stops the other one. Songs started from "Music I like" on the current profile are not interrupted.

### v36-6c · Choose lyrics in Studio

- **Studio → Music → Featured track → "Lyrics for the featured track":** search LRCLIB by title or artist, pick the right result (time-synced ones are marked), or paste your own lyrics. Publish to save. A "Remove" button goes back to automatic lookup.
- The choice is saved on the profile as `lyricsFix`, used for every visitor before the automatic lookup. It is tied to the featured track; if you change the track, Studio warns that the saved lyrics belong to the old one.
- The "Lyrics" toggle still switches lyrics off completely.

### v36-6b · Lyrics follow-up

- The "probe" text in the Audio Player slide now shows the real lookup status ("Finding lyrics…", "No lyrics found…") with a **Search lyrics manually** button, instead of the song's Studio note.
- **Junk lyrics filtered:** LRCLIB contains test entries; lyrics with fewer than 25 words, or whose length is more than 20 s away from the song, are ignored.
- Manual search is also available from the Sections Audio Player slide and the star card.
- **Covers for "Music I like"** rows saved without one are filled in automatically (iTunes or Deezer).

### v36-6 · YouTube album covers, audio only, working lyrics and manual lyric search

- **Covers:** a regex bug in the artwork allow-list in `maple-collections.js` threw away every YouTube thumbnail. Fixed.
- **Album covers from the song title:** `/api/yt-meta` cleans the YouTube title ("Artist - Song (Official Video)" → artist and song name), looks it up on iTunes, then Deezer (no API keys), and returns the album cover. Falls back to the video thumbnail. Shared helper: `api/_cover.mjs`. The cache key is now `mx:yt2:` so old cover-less results aren't reused.
- **Audio only:** the YouTube player is kept out of sight, and only appears as a fallback if a browser refuses playback without a tap.
- **Lyrics:** clean-title candidates start from the iTunes/Deezer song name. LRCLIB is tried directly and, if the browser can't reach it, through the new `/api/lyrics` proxy.
- **Manual search:** a Search button in the Lyrics header opens title and artist fields, lists matches (time-synced ones marked), and lets you pick the right one. The pick is remembered for that track.
- No new environment variables or SQL.

### v36-5 · Profile music is a YouTube link or an uploaded file; albums split into songs

- **Studio → Featured track:** only a YouTube link or an uploaded song. Spotify links are refused with a message; an existing Spotify value is left alone until the owner changes it.
- **Music I like** still accepts Spotify and YouTube links, and splits **albums and playlists into separate songs** (Spotify albums and playlists, YouTube playlists). Existing album rows get a **Split into songs** button.
- On the card, Music I like is a one-by-one list (first 8 shown + "Show all"). The separate "Your songs" block from v36-4 is merged into it.
- New `/api/album-tracks`. Needs `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for Spotify, and `YOUTUBE_API_KEY` for YouTube playlists. Without them the Studio says so, and a Spotify album is kept as one entry with a Split button for later.

### v36-3 / v36-4 · Spotify-style Audio Player and "Your songs"

- The player is styled after a Spotify-style layout: flat dark surface, white round play button, green progress on hover and touch.
- New **Your songs** section under the player: a list of the card's uploaded MP3s (featured upload and uploads in Music I like), with hover play, a green current row and an equalizer while playing. Uploaded songs no longer repeat in the Music I like grid. Needs no Spotify.

### v36-1 · Star cards, private messages and the tab fix

- **Fixed: Home and Explore couldn't be opened after a Glass slides card was shown.** The Glass layout was fixed over the whole screen. It now lives inside its own pane, so the dock, swiping and arrow keys work again. Keyboard slide navigation pauses while another pane is open.
- **YouTube links:** paste a YouTube link (watch, youtu.be, shorts, music.youtube.com) as the Featured track or in Music I like. Plays through YouTube's official player with play/pause, ±10 s and seek. Title, channel and thumbnail filled in automatically via `/api/yt-meta`, no API key needed.
- **Automatic lyrics** for every source, on by default (switch off in Studio → Music). Titles are cleaned of "(Official Video)", "[Lyrics]", "feat. …" and similar, and LRCLIB is tried with several fallbacks, preferring time-synced lyrics.
- **Uploads:** MP3 title, artist and embedded cover art are read from the file's ID3 tags.
- **Private messages:** the message bar sits at the very bottom of the screen; the chat is no longer capped at 52% of screen height, which had left a blank gap.
- **Star cards:** a single player (the duplicate "now playing" strip is gone), and lyrics show unless switched off.
- Requires `sql/supabase_songs.sql` to have been run once for uploads.

### v36 · (superseded by v36-1)

The first v36 log covered the same tab fix, YouTube player and automatic lyrics; v36-1 extends it.

### v31 · New homepage, one header, bottom music player, Music I Like, Anime

- **Homepage redesign:** new hero ("One digital ID for every game handle, stream, and social."), lighting and glass, a floating claim field with a live availability light, a theme picker that crossfades the example card, a game ticker, a new bento layout, restyled Explore and sign-up. All element IDs kept.
- **One global header:** stays on star-layout cards too. Desktop gets Home · Explore · Profile links and an Alerts bell; mobile keeps the menu. On a profile, a **View** button shows only the controls that owner switched on.
- **Bottom music player** replaces the header music button: a mini-player above the dock that slides up to a full Now Playing sheet. Uses Spotify's official embed (iFrame API), with progress, play/pause and ±10 s. Optional synced lyrics from LRCLIB.
- **Music I Like** and **Anime** collections on every layout. Managed in Studio → **Music & anime**: add Spotify links with automatic title and artwork, AniList search, status, rating, notes, reorder, live preview.
- Data is stored in the existing profile record. **No database change.**
- New endpoint `/api/spotify-meta`. Optional: `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` for artist names and durations.

### v29 · Fix: file upload and voice notes

- Cause: `/api/uploads` only shrank card images into a data link, so pictures, GIFs, video and voice notes in feed comments and private messages all failed.
- Fix: uploads now go to Supabase Storage (bucket `forum-media`, a folder per member) and return a public link. Checks login, file type and size (picture 3 MB, video 25 MB, voice note 8 MB).
- **Run `sql/supabase_storage.sql` once**, then re-upload.

### v28 · Renamed to M-ID, new homepage intro, feed and chat redesign

- Renamed Maple ID to M-ID (wordmark, titles, manifest, footer). The domain on the claim bar follows the address bar.
- New homepage intro: "Stop pasting your IDs. Share one link instead."
- Feed: removed the "Feed" heading and card and button borders. Message is an envelope icon beside the name; the ⋯ menu sits in the top-right of each post.
- Comments open in a bottom widget with a bar for pictures, GIFs or video, text and send.
- Private messages: full-screen chat with a fixed message bar; ＋ for pictures, GIFs and video, and a mic for voice notes.
- Media is uploaded to `/api/uploads` and stored as a `[[img|vid|aud:https://…]]` token in the text. No database change.
- Open item at the time: `/api/uploads` had to accept video and audio types and the kinds `forum-img`, `forum-vid`, `forum-aud` (addressed in v29).

### v27 · Light mode for login, one header, slide-out menu

- The login and sign-up panel has a proper light mode.
- Light/dark switch: the new look grows as a circle out of the button you tap (View Transitions; instant swap where unsupported or with reduced motion).
- Studio flicker fixed: the switch no longer rewrites `<html style>`, which had re-seeded the falling-leaf canvas on every switch.
- Card has its own light/dark button and a private-message button.
- Header is now: menu · brand · … · private messages · Studio · mode switch. Everything else is in the slide-out menu (Feed/Home, Explore, My card, Profile, Studio, Alerts, Reports for admins, Owner, Log in/out). New files: `maple-shell.js` and `.css`, `maple-mode.css`.
- Forum home is just the Feed. Messages, alerts and reports open from the header or menu, each with a "Feed" button back. Message stays visible on posts; Report, Pin and Delete sit behind "…".
- `/?pm=1` opens the inbox.

### v26 · Forum avatars, light and dark design system, new logo

- Forum: profile pictures next to every post, comment, alert and message (`/api/forum/avatars`, thumbnails cached 6 h).
- New design system: `assets/maple-design.css` with light and dark tokens. Toggle in the top bar, remembered, follows the device until you choose. Card themes only set accents, so they work in both modes.
- New logo and icon set (`icon.svg`, favicon, 192/512, maskable, Apple icon), new brand mark in the header, updated manifest colours.
- Smoothness: removed the full-screen grain layer and some blur and per-frame effects; falling-leaf effects stay on (off for reduced-motion or data-saver) and are capped at 30 fps; forum cards skip off-screen rendering.

---

## Earlier updates (undated)

### Vercel fix

- Song uploads no longer use Netlify Blobs, which can't run on Vercel. Songs and covers go to the Supabase bucket `song-media`. Run `sql/supabase_songs.sql` once.
- Added `api/spotify-config.mjs`, so "Connect Spotify" returns JSON on Vercel.
- `vercel.json`: `/api/*` and `/assets/*` are never rewritten to the app page, and `/spotify-callback` is served explicitly.
- Removed Netlify-only files (`netlify/`, `netlify.toml`, `@netlify/blobs`, the lockfile).

### Frame art upgrade

- Added 12 individually cropped, transparent PNG frame overlays in `assets/frame-art/`, replacing SVG-only frame rendering.
- Added a new **Moonlight cat** frame to the Cute collection and artwork thumbnails to the Frame Studio picker.
- Frame IDs, the profile save and publish flow, avatar decorations and the SVG fallback were kept.

### Dragon frame update

- The dragon is now separate top and bottom ornaments with narrow left and right side rails that repeat vertically without distortion.
- A one-time 3.2 s dragon entrance animation on page load, with reduced-motion support.

### Frame animation update

- Every illustrated frame gets a gentle breathing scale and a shared glow pulse; top ornaments also pulse while floating.
- Reduced-motion preferences disable the added motion and show a still frame.
