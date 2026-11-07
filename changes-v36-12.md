# M-ID v36-12

- **Music widget cut in half (Glass profile):** the player was a third card at the bottom of the profile slide, so on shorter phones it sat half off-screen under the scroll hint. It now lives inside the lower card (visits, reactions, player in one card) and the slide is more compact on short screens, so the whole player is visible. The "scroll" hint is hidden on very short screens.
- **Light/Dark button moved into the menu** (hamburger → More → "Light mode" / "Dark mode"). The top-bar button is gone. The circle reveal grows from the menu row; the menu stays open.
- **Light/Dark standby removed:** the site no longer follows the device's light/dark setting or switches by itself. It uses your saved pick, and dark if you haven't picked yet.

Files: assets/maple-mode.js ?v=8, assets/maple-shell.js ?v=2, assets/maple-deck.js/.css ?v=13, index.html, owner/index.html. (The owner page keeps its own button in its header.)
