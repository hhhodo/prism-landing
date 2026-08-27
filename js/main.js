// PRISM — interactions derived from the Figma file's blue annotation notes:
// 1) "스크롤 시 상단 로고 텍스트가 작아지면서 GNB 로고가 됨" -> nav shrink on scroll
// 2) "스크롤에 따라 가운데 영상이 프레임이 넘어감" -> .scrollframe cross-fade, driven by
//    scroll position through the section (not a timer)
// 3) "스크롤에 따라 영상은 멈춘 상태에서 네모 박스와 텍스트가 등장함 / ASCII 문구 처리됨"
//    (near the glass-render feature callouts)
// 4) "스크롤에 따라 리뷰가 가로로 움직이며, 상단의 세로줄 바가 산처럼 솟은 형태로 우측을
//    향해 이동(스크롤바 역할)" -> .testi-track horizontal scroll-linked translate +
//    .testi-scrollbar "mountain" bar peak that travels right with scroll progress
// 5) "마우스를 호버하면 모자이크(ASCII)처럼 됨" -> .footer__wordmark hover filter (in site.css)
// 6) "모든 이미지는 ASCII 문구(12px) 처리된 상태로 로딩. 스크롤에 따라 위에서 아래로
//    문구가 벗겨지면서 이미지 등장" -> every .ascii-media (work-card video slots) loads
//    fully glyph-covered; the glyph veil peels top-to-bottom via clip-path as the
//    element's own scroll progress advances (not a one-shot fade-in-view)

(function () {
  // 1. nav background/padding shrink (visual chrome, unrelated to the logo morph below)
  var nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 1b. brand-logo morph — starts giant, overlapping the hero art, and shrinks/
  // moves into the nav slot as the page scrolls (blue note 1's actual instruction:
  // the logo starts big overlapping the video/image, not just "small text shrinks").
  var brandLogo = document.getElementById('brandLogo');
  var heroSlot = document.getElementById('heroLogoSlot');
  var navSlot = document.getElementById('navLogoSlot');
  if (brandLogo && heroSlot && navSlot) {
    var startRect = null, endRect = null, distance = 1;
    function measureLogoRects() {
      startRect = heroSlot.getBoundingClientRect();
      startRect = { top: startRect.top + window.scrollY, left: startRect.left, fontSize: parseFloat(getComputedStyle(heroSlot).fontSize) };
      endRect = navSlot.getBoundingClientRect();
      endRect = { top: endRect.top, left: endRect.left, fontSize: parseFloat(getComputedStyle(navSlot).fontSize) };
      distance = Math.max(1, (document.querySelector('.hero') || {}).offsetHeight * 0.55 || window.innerHeight * 0.7);
    }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function onLogoScroll() {
      var progress = Math.min(1, Math.max(0, window.scrollY / distance));
      var top = lerp(startRect.top - window.scrollY, endRect.top, progress);
      var left = lerp(startRect.left, endRect.left, progress);
      var fontSize = lerp(startRect.fontSize, endRect.fontSize, progress);
      brandLogo.style.transform = 'translate(' + left + 'px,' + top + 'px)';
      brandLogo.style.fontSize = fontSize + 'px';
      // brandLogo IS the permanent visible mark — once progress hits 1 it just sits
      // at the nav slot's position/size for the rest of the page (never hidden).
    }
    measureLogoRects();
    window.addEventListener('scroll', onLogoScroll, { passive: true });
    window.addEventListener('resize', function () { measureLogoRects(); onLogoScroll(); });
    onLogoScroll();
  }

  // 3. callout backgrounds "freeze" while their ASCII boxes are on screen — if the
  // background is ever swapped for a real <video>, pausing it here already works.
  document.querySelectorAll('[data-callout] .callout__bg').forEach(function (bg) {
    if (bg.tagName !== 'VIDEO') return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) bg.pause(); else bg.play().catch(function () {});
      });
    }, { threshold: 0.4 });
    io.observe(bg);
  });

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

  // 6a. generate a deterministic ASCII glyph veil for each .ascii-media block
  var GLYPHS = '01#$%&*+=~/\\<>PRISM';
  document.querySelectorAll('.ascii-media__glyphs').forEach(function (el) {
    var out = '';
    for (var i = 0; i < 96; i++) {
      out += '<span>' + GLYPHS[(i * 7) % GLYPHS.length] + '</span>';
    }
    el.innerHTML = out;
  });

  // 6b. top-to-bottom peel of the glyph veil, driven by each card's own scroll
  // progress (starts peeling as it enters the viewport, fully peeled once its
  // center passes viewport-center) — a literal scroll-linked wipe, not a fade.
  var veilCards = document.querySelectorAll('.ascii-media');
  function onVeilScroll() {
    var vh = window.innerHeight;
    veilCards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var progress = (vh - rect.top) / (vh * 0.85);
      progress = Math.min(1, Math.max(0, progress));
      var glyphs = card.querySelector('.ascii-media__glyphs');
      if (glyphs) glyphs.style.clipPath = 'inset(' + (progress * 100) + '% 0 0 0)';
    });
  }
  window.addEventListener('scroll', onVeilScroll, { passive: true });
  window.addEventListener('resize', onVeilScroll);
  onVeilScroll();

  // 6c. video veils — play/pause the card's <video> as it enters/leaves view.
  // No real footage is bundled yet (assumes video src is supplied later); the
  // element is wired so dropping in a real <source>/src makes this work as-is.
  document.querySelectorAll('[data-video-veil] video').forEach(function (video) {
    var wrap = video.closest('[data-video-veil]');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!video.currentSrc && !video.src) return;
        if (entry.isIntersecting) video.play().catch(function () {});
        else video.pause();
      });
    }, { threshold: 0.3 });
    io.observe(wrap);
  });

  // generic reveal-on-scroll for every remaining [data-reveal] element
  // (headings, quote, CTA, etc. — ascii-media handles its own reveal above)
  var revealTargets = document.querySelectorAll('[data-reveal]');
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  revealTargets.forEach(function (el) { revealObserver.observe(el); });
})();
