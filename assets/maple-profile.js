/* M-ID · basic-layout profile extras
 * Adds the owner's "Music I Like" and "Anime" collections to a basic card page, and the PC split
 * (ID card fixed on the left, everything else on the right; see maple-pc-profile.css).
 * The old section bar (Overview · About · Music · Anime · Games · Socials · Shop) was removed.
 * Called by the app after it renders a card: window.dgProfileX(container, profile). */
(function () {
  'use strict';

  window.dgProfileX = function (root, p) {
    var page = root && root.querySelector('.card-page'); if (!page || !p) return;
    if (p.layout === 'deck' && window.dgDeck) return window.dgDeck(root, p);
    // PC split (maple-pc-profile.css): the profile card and the "Create yours" link share the left column
    var idc = page.querySelector('.idcard');
    if (idc && !page.querySelector('.pc-left')) {
      var left = document.createElement('div'); left.className = 'pc-left';
      idc.parentNode.insertBefore(left, idc); left.appendChild(idc);
      if (p.showCta !== false) {
        var cta = document.createElement('a'); cta.className = 'pc-cta'; cta.href = '/#auth'; cta.target = '_top';
        cta.innerHTML = '<span><span class="pc-cta-tag">M-ID</span><span class="pc-cta-title">Want your own M-ID?</span><span class="pc-cta-desc">Claim your free link and build a card like this in minutes.</span></span><span class="pc-cta-btn">Create yours <i class="fa-solid fa-arrow-right"></i></span>';
        left.appendChild(cta);
      }
    }
    page.querySelectorAll('.mx-sec').forEach(function (n) { n.remove(); });
    var card = page.querySelector('.idcard'); if (card) card.dataset.sec = 'overview';
    var bio = card && card.querySelector('.bio'); if (bio) { bio.dataset.sec = 'about'; bio.id = bio.id || 'pf-about'; }
    page.querySelectorAll('section.list').forEach(function (sec) {
      var t = (sec.querySelector('h2') && sec.querySelector('h2').textContent || '').toLowerCase();
      if (t.indexOf('game') === 0) sec.dataset.sec = 'games'; else if (t.indexOf('social') === 0) sec.dataset.sec = 'socials';
    });
    var shop = page.querySelector('.shop,.dg-shop,[data-shop]'); if (shop && !shop.dataset.sec) shop.dataset.sec = 'shop';

    var mx = window.MX, html = '';
    if (mx && mx.musicOn(p)) html += mx.musicHTML(p.musicLikes);
    if (mx && mx.animeOn(p)) html += mx.animeHTML(p.anime, { cats: p.animeCats });
    var anchor = page.querySelector('.reactions') || page.querySelector('.actions') || card;
    if (html && anchor) { anchor.insertAdjacentHTML('afterend', html); mx.mount(page, p); }
  };
})();
