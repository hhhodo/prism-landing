// PRISM — interactions derived from the Figma file's blue annotation notes:
// 1) "스크롤 시 상단 로고 텍스트가 작아지면서 GNB 로고가 됨" -> nav shrink on scroll
// 2) "스크롤에 따라 가운데 영상이 프레임이 넘어감" -> .scrollframe cross-fade, driven by
//    scroll position through the section (not a timer)
// 3) "스크롤에 따라 영상은 멈춘 상태에서 네모 박스와 텍스트가 등장함 / ASCII 문구 처리됨"
//    -> .ascii-media glyph veil fades away to reveal the image as it scrolls into view
// 4) "스크롤에 따라 리뷰가 가로로 움직이며, 상단의 세로줄 바가 산처럼 솟은 형태로 우측을
//    향해 이동(스크롤바 역할)" -> .testi-track horizontal scroll-linked translate +
//    .testi-scrollbar "mountain" bar peak that travels right with scroll progress
// 5) "마우스를 호버하면 모자이크(ASCII)처럼 됨" -> .footer__wordmark hover filter (in site.css)

(function () {
  // 1. nav shrink
  var nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 2. reel cross-fade — frame swap tied directly to scroll position through the
  // section, per the annotation ("스크롤에 따라... 프레임이 넘어감").
  var reel = document.getElementById('reel');
  var frames = reel ? reel.querySelectorAll('.scrollframe__img') : [];
  if (frames.length > 1) {
    var reelActive = -1;
    function onReelScroll() {
      var rect = reel.getBoundingClientRect();
      var vh = window.innerHeight;
      var progress = (vh - rect.top) / (vh + rect.height);
      progress = Math.min(1, Math.max(0, progress));
      var idx = Math.min(frames.length - 1, Math.floor(progress * frames.length));
      if (idx !== reelActive) {
        frames.forEach(function (f) { f.classList.remove('is-active'); });
        frames[idx].classList.add('is-active');
        reelActive = idx;
      }
    }
    window.addEventListener('scroll', onReelScroll, { passive: true });
    onReelScroll();
  }

  // 4. testimonials — horizontal track position + mountain-scrollbar peak both
  // driven by scroll progress through the .testi section.
  var testi = document.getElementById('voices');
  var track = document.getElementById('testiTrack');
  var bars = testi ? testi.querySelectorAll('.testi-scrollbar__bar') : [];
  if (testi && track && bars.length) {
    function onTestiScroll() {
      var rect = testi.getBoundingClientRect();
      var vh = window.innerHeight;
      var total = rect.height - vh;
      var progress = total > 0 ? (-rect.top) / total : 0;
      progress = Math.min(1, Math.max(0, progress));

      var maxScroll = Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
      track.style.transform = 'translateX(-' + (progress * maxScroll) + 'px)';

      var peak = progress * (bars.length - 1);
      bars.forEach(function (bar, i) {
        var dist = Math.abs(i - peak);
        var height = Math.max(6, 56 - dist * 14);
        bar.style.height = height + 'px';
        bar.style.background = dist < 1.5 ? 'var(--prism-accent)' : 'var(--prism-line)';
      });
    }
    window.addEventListener('scroll', onTestiScroll, { passive: true });
    window.addEventListener('resize', onTestiScroll);
    onTestiScroll();
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
