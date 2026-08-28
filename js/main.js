// PRISM — interactions
// vscrollWrap(700vh)이 모든 스크롤 인터랙션의 단일 런웨이:
//   0 → 28.5% (= 200vh/600vh): 로고 모프 (히어로 씬 표시)
//  28.5→ 33%: 히어로 씬 페이드아웃
//  33 → 38%: 전환 구간
//  38 → 57%: callout-1 씬
//  57 → 76%: callout-2 씬
//  76 → 95%: callout-3 씬
//  95→100%: 아웃트로
// 비디오: currentTime = progress × duration (스크롤 scrub)

(function () {
  var nav = document.getElementById('nav');
  var brandLogo = document.getElementById('brandLogo');
  var heroSlot = document.getElementById('heroLogoSlot');
  var navSlot = document.getElementById('navLogoSlot');
  var vscrollWrap = document.getElementById('vscrollWrap');
  var scrollVid = document.getElementById('scrollVid');

  // 씬 요소
  var sceneHero = document.getElementById('vscene-hero');
  var sceneC1 = document.getElementById('vscene-c1');
  var sceneC2 = document.getElementById('vscene-c2');
  var sceneC3 = document.getElementById('vscene-c3');

  // ── nav 스크롤 배경 ──────────────────────────────────────────
  function onNavScroll() {
    if (window.scrollY > 24) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  }
  window.addEventListener('scroll', onNavScroll, { passive: true });
  onNavScroll();

  // ── 씬 opacity 헬퍼 ─────────────────────────────────────────
  function setScene(el, opacity) {
    if (!el) return;
    el.style.opacity = opacity;
    el.style.pointerEvents = opacity > 0.01 ? 'auto' : 'none';
  }

  // ── 씬 전환 (progress 0~1) ───────────────────────────────────
  function updateScenes(p) {
    // hero: 0~0.30 표시, 0.30~0.36 페이드아웃
    var heroOp = p < 0.30 ? 1 : p < 0.36 ? 1 - (p - 0.30) / 0.06 : 0;
    // c1: 0.36~0.40 페이드인, 0.40~0.57 표시, 0.57~0.60 페이드아웃
    var c1Op = p < 0.36 ? 0 : p < 0.40 ? (p - 0.36) / 0.04 : p < 0.57 ? 1 : p < 0.60 ? 1 - (p - 0.57) / 0.03 : 0;
    // c2: 0.60~0.63 페이드인, 0.63~0.76 표시, 0.76~0.79 페이드아웃
    var c2Op = p < 0.60 ? 0 : p < 0.63 ? (p - 0.60) / 0.03 : p < 0.76 ? 1 : p < 0.79 ? 1 - (p - 0.76) / 0.03 : 0;
    // c3: 0.79~0.82 페이드인, 0.82~0.95 표시, 0.95~0.99 페이드아웃
    var c3Op = p < 0.79 ? 0 : p < 0.82 ? (p - 0.79) / 0.03 : p < 0.95 ? 1 : p < 0.99 ? 1 - (p - 0.95) / 0.04 : 0;

    setScene(sceneHero, heroOp);
    setScene(sceneC1, c1Op);
    setScene(sceneC2, c2Op);
    setScene(sceneC3, c3Op);
  }

  // ── 로고 모프 ────────────────────────────────────────────────
  var startRect = null, endRect = null;
  function measureLogoRects() {
    if (!heroSlot || !navSlot) return;
    var sr = heroSlot.getBoundingClientRect();
    startRect = { top: sr.top, left: sr.left, fontSize: parseFloat(getComputedStyle(heroSlot).fontSize) };
    var er = navSlot.getBoundingClientRect();
    endRect = { top: er.top, left: er.left, fontSize: parseFloat(getComputedStyle(navSlot).fontSize) };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function updateLogo(p) {
    if (!brandLogo || !startRect || !endRect) return;
    // 로고 모프: 0~0.285 (= 200vh / 700vh runway)
    var logoProg = Math.min(1, p / 0.285);
    var top = lerp(startRect.top, endRect.top, logoProg);
    var left = lerp(startRect.left, endRect.left, logoProg);
    var fontSize = lerp(startRect.fontSize, endRect.fontSize, logoProg);
    brandLogo.style.transform = 'translate(' + left + 'px,' + top + 'px)';
    brandLogo.style.fontSize = fontSize + 'px';
    if (logoProg >= 1) nav.classList.add('is-logo-settled');
    else nav.classList.remove('is-logo-settled');
  }

  // ── 비디오 scrub (RAF 래핑) ───────────────────────────────────
  var rafId = null;
  var targetTime = 0;
  function rafScrub() {
    rafId = null;
    if (!scrollVid || !scrollVid.duration) return;
    if (Math.abs(scrollVid.currentTime - targetTime) > 0.016) {
      scrollVid.currentTime = targetTime;
    }
  }

  // ── 메인 스크롤 핸들러 ───────────────────────────────────────
  var lastScrollP = -1;
  function onMainScroll() {
    if (!vscrollWrap) return;
    var rect = vscrollWrap.getBoundingClientRect();
    var runway = vscrollWrap.offsetHeight - window.innerHeight;
    var p = runway > 0 ? Math.min(1, Math.max(0, -rect.top / runway)) : 0;
    if (p === lastScrollP) return;
    lastScrollP = p;

    updateLogo(p);
    updateScenes(p);

    // 비디오 seek은 RAF로 배치 처리
    if (scrollVid && scrollVid.duration) {
      targetTime = p * scrollVid.duration;
      if (!rafId) rafId = requestAnimationFrame(rafScrub);
    }
  }
  window.addEventListener('scroll', onMainScroll, { passive: true });
  window.addEventListener('resize', function () { measureLogoRects(); onMainScroll(); });

  // 폰트 로드 후 로고 크기 맞춤 + 좌표 측정 → 초기 렌더
  function fitLogoToWidth() {
    // heroSlot = #heroLogoSlot (inner span, text만큼의 실제 너비)
    if (!heroSlot) return;
    var available = window.innerWidth - 80; // 좌 40px + 우 40px
    // 부모(.hero__logo-slot)의 font-size를 임시로 100px로 맞춰 텍스트 너비 측정
    var slot = heroSlot.parentElement || heroSlot;
    slot.style.fontSize = '100px';
    slot.style.width = 'auto';
    slot.style.textAlign = 'left';
    var w100 = heroSlot.getBoundingClientRect().width;
    slot.style.width = '100%';
    slot.style.textAlign = 'center';
    if (w100 === 0) { slot.style.fontSize = '20vw'; return; }
    var fitted = Math.floor(available / w100 * 100);
    slot.style.fontSize = fitted + 'px';
  }

  function initLogo() {
    fitLogoToWidth();
    measureLogoRects();
    onMainScroll();
    // 측정·배치 완료 후 한 번에 표시 — 로드 직후 작게 보였다가 커지는 현상 방지
    if (brandLogo) brandLogo.style.opacity = '1';
  }
  // 폰트 로드 완료 후에만 실행 (그 전엔 로고 숨김 상태)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(initLogo);
  } else {
    initLogo();
  }
  window.addEventListener('resize', function() { fitLogoToWidth(); measureLogoRects(); onMainScroll(); });

  // 씬 초기화 — 로고와 별개로 씬 opacity만 미리 설정
  updateScenes(0);

  // ── ASCII 글리프 생성 ─────────────────────────────────────────
  var GLYPHS = '01#$%&*+=~/\\<>PRISM';
  document.querySelectorAll('.ascii-media__glyphs').forEach(function (el) {
    var out = '';
    for (var i = 0; i < 96; i++) {
      out += '<span>' + GLYPHS[(i * 7) % GLYPHS.length] + '</span>';
    }
    el.innerHTML = out;
  });

  // ── ASCII peel (callout 박스 & work 카드) ────────────────────
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

  // ── 증언 스크롤재킹 ──────────────────────────────────────────
  var pinWrap = document.getElementById('testiPinWrap');
  var track = document.getElementById('testiTrack');
  var scrollbarEl = document.getElementById('testiScrollbar');
  var BAR_COUNT = 250;
  if (scrollbarEl) {
    var barsHtml = '';
    for (var b = 0; b < BAR_COUNT; b++) barsHtml += '<span class="testi-scrollbar__bar"></span>';
    scrollbarEl.innerHTML = barsHtml;
  }
  var bars = scrollbarEl ? scrollbarEl.querySelectorAll('.testi-scrollbar__bar') : [];
  var WAVE_STEPS = [[39,1,true],[32,0.73,false],[25,0.46,false],[18,0.19,false]];
  var WAVE_FLAT = [14, 0.05, false];
  if (pinWrap && track && bars.length) {
    function onTestiScroll() {
      var rect = pinWrap.getBoundingClientRect();
      var vh = window.innerHeight;
      var runway = pinWrap.offsetHeight - vh;
      var progress = runway > 0 ? (-rect.top) / runway : 0;
      progress = Math.min(1, Math.max(0, progress));
      var maxScroll = Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
      track.style.transform = 'translateX(-' + (progress * maxScroll) + 'px)';
      var peak = progress * (bars.length - 1);
      bars.forEach(function (bar, i) {
        var dist = Math.round(Math.abs(i - peak));
        var step = WAVE_STEPS[dist] || WAVE_FLAT;
        bar.style.height = step[0] + 'px';
        bar.style.opacity = step[1];
        bar.style.background = step[2] ? '#fff' : '#d9d9d9';
      });
    }
    window.addEventListener('scroll', onTestiScroll, { passive: true });
    window.addEventListener('resize', onTestiScroll);
    onTestiScroll();
  }

  // ── reveal-on-scroll ─────────────────────────────────────────
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
