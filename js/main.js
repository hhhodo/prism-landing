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

  // ── 이미지 격자 (20×12, vscrollWrap 안 — 영상 위에 겹쳐서 등장) ──
  var mosaicGrid = document.getElementById('mosaicGrid');
  var sceneMosaic = document.getElementById('vscene-mosaic');
  var COLS = 20, ROWS = 12, TOTAL = COLS * ROWS;
  // 노이즈 텍스처 17장 — Selected projects에 쓴 형체있는 사진과 겹치지 않는 별도 풀
  var NOISE_IMAGES = [
    'noise-01.jpg','noise-02.jpg','noise-03.jpg','noise-04.jpg','noise-05.jpg',
    'noise-06.jpg','noise-07.jpg','noise-08.jpg','noise-09.jpg','noise-10.jpg',
    'noise-11.jpg','noise-12.jpg','noise-13.jpg','noise-14.jpg','noise-15.jpg',
    'noise-16.jpg','noise-17.jpg'
  ];
  // seeded shuffle (mulberry32) — 매번 같은 결과지만 육안상 랜덤하게 섞임
  function seededShuffle(arr, seed) {
    var a = arr.slice();
    function rand() { seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  // 랜덤 셔플 순서 (시드 고정으로 매번 같은 결과)
  var fillOrder = seededShuffle(Array.from({ length: TOTAL }, function (_, i) { return i; }), 42);
  // 셀별 이미지 배정: 17장을 반복 배열한 뒤 별도 시드로 다시 섞어 인접 셀에 같은
  // 이미지가 몰리지 않게 함 (겹치지 않고 화면 전체에 고르게 랜덤 분산)
  var cellImages = seededShuffle(
    Array.from({ length: TOTAL }, function (_, i) { return NOISE_IMAGES[i % NOISE_IMAGES.length]; }),
    99
  );
  var mosaicCells = [];
  if (mosaicGrid) {
    for (var i = 0; i < TOTAL; i++) {
      var cell = document.createElement('div');
      cell.className = 'mosaic-cell';
      cell.innerHTML = '<img src="assets/images/' + cellImages[i] + '" alt="" loading="lazy">';
      mosaicGrid.appendChild(cell);
      mosaicCells.push(cell);
    }
  }
  // 모자이크는 updateScenes 안에서 vscrollWrap progress로 구동됨 (별도 스크롤 리스너 불필요)
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

  // ── 콜아웃 아이템 scrub — transition 없음, p가 매 프레임 직접 제어 ──
  // sceneEl 안의 [data-seq] 요소를 pStart~pEnd 구간에서 seq 순서대로 등장시킴.
  // 각 아이템은 전체 구간을 n등분한 슬롯 하나를 차지하고, 그 슬롯의 60%에서 완전히 나타남.
  function scrubCallout(sceneEl, p, pStart, pEnd) {
    if (!sceneEl) return;
    var items = sceneEl.querySelectorAll('[data-seq]');
    var n = items.length;
    if (!n) return;
    var span = pEnd - pStart;
    var slotW = span / n;
    var entryW = slotW * 0.6; // 각 슬롯의 60% 구간 동안 t 0→1
    items.forEach(function(item) {
      var seq = parseInt(item.dataset.seq, 10);
      var s = pStart + seq * slotW;
      var t = p < s ? 0 : p >= s + entryW ? 1 : (p - s) / entryW;
      item.style.opacity = t;
      item.style.transform = 'translateY(' + (10 * (1 - t)) + 'px)';
      item.style.filter = t < 1 ? 'blur(' + (4 * (1 - t)) + 'px)' : 'none';
    });
  }

  // ── 씬 전환 (progress 0~1, 전반 0~SPLIT = 영상+callout(700vh), 후반 SPLIT~1.0 = 모자이크(200vh) ──
  // 모자이크 구간을 700vh→200vh로 줄여 격자 노이즈가 훨씬 빨리 지나가도록 함.
  // .vscroll-wrap 총 높이(css: 900vh) = FRONT_VH + BACK_VH 와 반드시 일치해야 함.
  var FRONT_VH = 700, BACK_VH = 200, TOTAL_VH = FRONT_VH + BACK_VH;
  var SPLIT = FRONT_VH / TOTAL_VH;
  var MOSAIC_FADE = 20 / TOTAL_VH; // 모자이크 씬으로 20vh 동안 크로스페이드
  function updateScenes(p) {
    // 전반부(0~SPLIT)를 0~1로 리맵해서 기존 씬 로직 적용
    var sp = Math.min(1, p / SPLIT); // scene progress 0~1

    var heroOp = sp < 0.30 ? 1 : sp < 0.36 ? 1 - (sp - 0.30) / 0.06 : 0;
    var c1Op = sp < 0.36 ? 0 : sp < 0.40 ? (sp - 0.36) / 0.04 : sp < 0.57 ? 1 : sp < 0.60 ? 1 - (sp - 0.57) / 0.03 : 0;
    var c2Op = sp < 0.60 ? 0 : sp < 0.63 ? (sp - 0.60) / 0.03 : sp < 0.76 ? 1 : sp < 0.79 ? 1 - (sp - 0.76) / 0.03 : 0;
    var c3Op = sp < 0.79 ? 0 : sp < 0.82 ? (sp - 0.79) / 0.03 : sp < 0.95 ? 1 : sp < 0.99 ? 1 - (sp - 0.95) / 0.04 : 0;

    setScene(sceneHero, heroOp);
    setScene(sceneC1, c1Op);
    setScene(sceneC2, c2Op);
    setScene(sceneC3, c3Op);

    scrubCallout(sceneC1, sp, 0.36, 0.50);
    scrubCallout(sceneC2, sp, 0.62, 0.74);
    scrubCallout(sceneC3, sp, 0.86, 0.97);

    // 후반부(SPLIT~1.0): 모자이크 — callout 사라진 뒤 영상 마지막 프레임 위에 격자 등장
    var mosaicOp = p < SPLIT - MOSAIC_FADE ? 0 : p < SPLIT ? (p - (SPLIT - MOSAIC_FADE)) / MOSAIC_FADE : 1;
    setScene(sceneMosaic, mosaicOp);

    if (p >= SPLIT && mosaicCells.length) {
      var mp = (p - SPLIT) / (1 - SPLIT); // mosaic progress 0~1
      // 기하급수 가속: mp^0.3 → 처음엔 빠르게 몇개 톡톡, 끝에 와다다 쏟아짐
      // 실제로는 역: 셀 i의 threshold = (i/TOTAL)^3 → 앞쪽 셀은 일찍, 뒤쪽 셀은 끝에 몰림
      for (var i = 0; i < TOTAL; i++) {
        var cellIdx = fillOrder[i];
        var ratio = i / TOTAL;
        var threshold = 1 - Math.pow(1 - ratio, 3.5); // 역3.5제곱 — 초반 적당히, 후반 폭발
        threshold *= 0.85; // 전체를 85% 지점까지 압축 → 스크롤 끝나기 전 완전히 채워짐
        var t = mp < threshold ? 0 : mp >= threshold + 0.006 ? 1 : (mp - threshold) / 0.006;
        mosaicCells[cellIdx].style.opacity = t;
      }
    }
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
    // 로고 모프: 전반부(SPLIT) 안에서 0~0.285 구간 → p 기준 0~(SPLIT*0.285)
    var logoProg = Math.min(1, p / (SPLIT * 0.285));
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

    // 비디오 scrub — 전반부(p 0~SPLIT)에서 전체 영상 재생, SPLIT 이후 마지막 프레임 고정
    if (scrollVid && scrollVid.duration) {
      var sp = Math.min(1, p / SPLIT); // scene progress 0~1
      // callout 구간 고정 로직 (sp 기준)
      var vidSp = sp < 0.36 ? sp
                : sp < 0.50 ? 0.36
                : sp < 0.62 ? sp
                : sp < 0.74 ? 0.62
                : sp < 0.86 ? sp
                : sp < 0.97 ? 0.86
                : sp;
      targetTime = vidSp * scrollVid.duration;
      if (!rafId) rafId = requestAnimationFrame(rafScrub);
    }
  }
  window.addEventListener('scroll', onMainScroll, { passive: true });
  window.addEventListener('resize', function () { measureLogoRects(); onMainScroll(); });

  // 폰트 로드 후 로고 크기 맞춤 + 좌표 측정 → 초기 렌더
  // brandLogo 자체를 100px로 임시 설정해 실제 렌더링 폰트(PartialSans) 기준으로 측정
  function fitLogoToWidth() {
    if (!brandLogo || !heroSlot) return;
    var available = window.innerWidth - 80; // 좌우 40px 여백

    // 1) brandLogo를 100px로 잠깐 바꿔 실제 텍스트 너비 측정 (getBoundingClientRect는 reflow 강제)
    var savedSize = brandLogo.style.fontSize;
    var savedTransform = brandLogo.style.transform;
    brandLogo.style.fontSize = '100px';
    brandLogo.style.transform = 'translate(0,0)';
    var w100 = brandLogo.getBoundingClientRect().width;
    brandLogo.style.fontSize = savedSize || '20vw';
    brandLogo.style.transform = savedTransform;

    if (w100 < 80) return; // 폰트 미로드 → 폴백 유지
    var fitted = Math.floor(available / w100 * 100);

    // 2) heroSlot 부모도 동기화 (measureLogoRects 좌표 앵커로 사용)
    var slot = heroSlot.parentElement || heroSlot;
    slot.style.fontSize = fitted + 'px';

    // 3) brandLogo 바로 적용
    brandLogo.style.fontSize = fitted + 'px';
  }

  function initLogo(show) {
    fitLogoToWidth();
    measureLogoRects();
    // lastScrollP 리셋 — 폰트 로드 전후로 두 번 호출될 때 p===lastScrollP 조기 리턴을 막아
    // updateLogo가 반드시 실행되도록 강제
    lastScrollP = -1;
    onMainScroll();
    // 폰트 로드 완료 후에만 표시 — 그 전에는 opacity:0 유지해 오위치 플래시 방지
    if (show && brandLogo) brandLogo.style.opacity = '1';
  }
  // 1) 즉시 실행 — 위치·크기 계산만, 표시는 아직 하지 않음
  initLogo(false);
  // 2) 폰트 로드 후 재조정 — PartialSans 기준 크기·위치 정밀 보정 후 표시
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function() { initLogo(true); });
  } else {
    initLogo(true);
  }
  window.addEventListener('resize', function() { fitLogoToWidth(); measureLogoRects(); onMainScroll(); });

  // 씬 초기화 — 로고와 별개로 씬 opacity만 미리 설정
  updateScenes(0);

  // ── ASCII 아트 생성 — canvas로 이미지 픽셀 밝기 → 문자 밀도 매핑 ────────
  // 밝은 픽셀일수록 밀도 높은 문자. 배경이 어둡고 글자색이 밝기 때문에
  // (원본의 밝은 부분 = 밀도 높은 밝은 글자, 어두운 부분 = 공백으로 배경 그대로)
  // 그래야 실제 이미지 명암과 맞게 보임 — 반전시키면 색반전처럼 보임.
  var ASCII_MAP = ' .\'`^",:;Il!i><~+_-?][}{1)(|tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
  var ASCII_CONTRAST = 2.4; // >1 = 더 세게 대비, 중간톤을 흑/백 극단으로 밀어냄

  function buildAscii(imgEl, glyphsEl) {
    var img = new Image();
    img.onload = function () {
      var rect = glyphsEl.getBoundingClientRect();
      var w = Math.max(rect.width || glyphsEl.offsetWidth, 60);
      var h = Math.max(rect.height || glyphsEl.offsetHeight, 60);
      // Courier New: 폭 ≈ 높이 × 0.6
      var fontSize = 6;
      var charH = fontSize * 1.15;
      var charW = fontSize * 0.6;
      var cols = Math.floor(w / charW);
      var rows = Math.floor(h / charH);

      var canvas = document.createElement('canvas');
      canvas.width = cols;
      canvas.height = rows;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, cols, rows);
      var data = ctx.getImageData(0, 0, cols, rows).data;

      var lines = [];
      for (var r = 0; r < rows; r++) {
        var line = '';
        for (var c = 0; c < cols; c++) {
          var idx = (r * cols + c) * 4;
          var brightness = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
          // 명암 대비 강화 — 중간톤을 양 극단으로 밀어붙여 흑/백이 뚜렷하게 갈리게 함
          brightness = Math.min(1, Math.max(0, (brightness - 0.5) * ASCII_CONTRAST + 0.5));
          // 밝은 픽셀 → 밀도 높은 문자 (반전 없음 — 원본 명암과 일치)
          var ci = Math.floor(brightness * (ASCII_MAP.length - 1));
          line += ASCII_MAP[ci];
        }
        lines.push(line);
      }
      glyphsEl.textContent = lines.join('\n');
    };
    img.src = imgEl.src;
  }

  document.querySelectorAll('.ascii-media').forEach(function (container) {
    var imgEl = container.querySelector('img');
    var glyphsEl = container.querySelector('.ascii-media__glyphs');
    if (imgEl && glyphsEl) buildAscii(imgEl, glyphsEl);
  });

  // ── ASCII peel (work 카드만 — callout 박스는 sticky 안이라 scroll과 무관) ──
  var veilCards = document.querySelectorAll('.ascii-media:not(.callout__mark)');
  function onVeilScroll() {
    var vh = window.innerHeight;
    veilCards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var progress = (vh * 0.5 - rect.top) / (vh * 0.5);
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

  // ── 인용구 01/02 토글 ────────────────────────────────────────
  var quoteToggle = document.getElementById('quoteToggle');
  var quoteText = document.getElementById('quoteText');
  var quoteCite = document.getElementById('quoteCite');
  if (quoteToggle && quoteText && quoteCite) {
    quoteToggle.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-quote-index]');
      if (!btn) return;
      var idx = btn.dataset.quoteIndex;
      quoteToggle.querySelectorAll('button').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      quoteText.style.opacity = '0';
      quoteCite.style.opacity = '0';
      setTimeout(function () {
        quoteText.textContent = '"' + quoteText.getAttribute('data-quote-' + idx) + '"';
        quoteCite.textContent = quoteCite.getAttribute('data-cite-' + idx);
        quoteText.style.opacity = '1';
        quoteCite.style.opacity = '.55';
      }, 200);
    });
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
