// PRISM — interactions derived from the Figma file's blue annotation notes:
// 1) "스크롤 시 상단 로고 텍스트가 작아지면서 GNB 로고가 됨" -> nav shrink on scroll
// 2) "스크롤에 따라 가운데 영상이 프레임이 넘어감" -> .scrollframe cross-fade
// 3) "스크롤에 따라 영상은 멈춘 상태에서 네모 박스와 텍스트가 등장함 / ASCII 문구 처리됨"
//    -> .ascii-media glyph veil fades away to reveal the image as it scrolls into view
// 4) "마우스를 호버하면 모자이크(ASCII)처럼 됨" -> .footer__wordmark hover filter (in site.css)

(function () {
  // 1. nav shrink
  var nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 2. reel cross-fade — swap the active frame roughly every 2.6s while the reel
  // section is in view (a static approximation of the scroll-driven frame swap).
  var reel = document.getElementById('reel');
  var frames = reel ? reel.querySelectorAll('.scrollframe__img') : [];
  var frameIndex = 0;
  if (frames.length > 1) {
    var reelObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reel.dataset.playing = '1';
        } else {
          reel.dataset.playing = '0';
        }
      });
    }, { threshold: 0.2 });
    reelObserver.observe(reel);
    setInterval(function () {
      if (reel.dataset.playing !== '1') return;
      frames[frameIndex].classList.remove('is-active');
      frameIndex = (frameIndex + 1) % frames.length;
      frames[frameIndex].classList.add('is-active');
    }, 2600);
  }

  // 3a. generate a deterministic ASCII glyph veil for each .ascii-media block
  var GLYPHS = '01#$%&*+=~/\\<>PRISM';
  document.querySelectorAll('.ascii-media__glyphs').forEach(function (el) {
    var out = '';
    for (var i = 0; i < 96; i++) {
      out += '<span>' + GLYPHS[(i * 7) % GLYPHS.length] + '</span>';
    }
    el.innerHTML = out;
  });

  // 3b + generic reveal-on-scroll for every [data-reveal] element (work cards,
  // headings, ascii media, quote, CTA, etc.)
  var revealTargets = document.querySelectorAll('[data-reveal], .ascii-media');
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      if (entry.target.classList.contains('ascii-media')) {
        entry.target.classList.add('is-revealed');
      }
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  revealTargets.forEach(function (el) { revealObserver.observe(el); });
})();
