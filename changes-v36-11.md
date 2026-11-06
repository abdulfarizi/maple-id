# M-ID v36-11 · Glass profile redesign, gear card, owner badges, no more flicker on Light/Dark

## Glass profile slide
- **One fixed main card** (banner, avatar, name, status, role, short bio) that never scrolls inside. Bio is clamped to 3 lines (2 on short phones).
- **Two buttons** replace the social icons: **Message me** (opens a private message to that person on the site; asks you to log in if you aren't) and **WhatsApp** (uses the Phone in Studio → Contact, or the Seller WhatsApp; hidden if neither is set).
- **Counter removed** (the "01 / 07 PROFILE" on the left). The social icon row is removed from the card; the full Socials slide is unchanged.
- **Duplicates removed from the slide:** "edit in Studio", "View public card", "Signed in as … Log out" and the Studio button in the card actions. Studio, My card and Log out stay in the header and the hamburger menu.
- **Bottom card** now holds everything else: visits, location, like, Save contact / copy / QR / share, reactions.
- **Gear card** (new slide "Gear", right after Profile): phone, tablet, laptop, desktop, VR headset, GPU, other. Edit it in Studio → Look (Glass layout) → Gear (up to 12 items).

## Owner badges
- **Tick** = verified, **crown** = special honor. Shown beside the name.
- Only the owner account sees the toggle (inside the bottom card, "Owner · badges") and the server only accepts changes from the owner account.
- **Run `supabase_badges.sql` once** in Supabase → SQL editor (needs supabase_forum.sql already run). Without it, cards work as before and the badge buttons show an error.

## Light/Dark flicker
- The new look could show full screen for one frame before the circle started; it now starts fully clipped and keeps its final state until the transition ends.
- The floating shapes used to change to new random colours *after* the switch finished (visible pop). They now recolour inside the switch, keep their own colour slot, and the canvas is repainted before the reveal.
- The toggle button no longer jumps when the swap begins.

Files: assets/maple-deck.js/.css ?v=12, assets/maple-deck-studio.js ?v=2, assets/maple-mode.js ?v=7, assets/maple-mode.css ?v=4, assets/index-maple1.js, index.html, owner/index.html, supabase_badges.sql (new).
