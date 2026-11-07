# M-ID v36-13
- Now Playing bar and full-screen player: removed the GPU-layer hints (contain:paint, backface-visibility, will-change) that clash with backdrop blur in some browsers (bar drawn half-clipped or not at all). The bar is now centred with margins instead of a horizontal transform, and the full-screen player uses the real viewport height (100dvh) on phones.
- maple-player.css ?v=13, index.html.
