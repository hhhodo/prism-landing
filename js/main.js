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

  // ── 이미지 격자 (20×12, vscrollWrap 안 — 영상 마지막 키프레임을 아스키아트로
  // 쪼개서 셀 하나하나 와다다 등장. 사진 타일이 아니라 순수 아스키 텍스트임. ──
  var mosaicGrid = document.getElementById('mosaicGrid');
  var sceneMosaic = document.getElementById('vscene-mosaic');
  var COLS = 20, ROWS = 12, TOTAL = COLS * ROWS;
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
  // 랜덤 셔플 순서 (시드 고정으로 매번 같은 결과) — 셀이 등장하는 순서
  var fillOrder = seededShuffle(Array.from({ length: TOTAL }, function (_, i) { return i; }), 42);
  var mosaicCells = [];
  if (mosaicGrid) {
    for (var i = 0; i < TOTAL; i++) {
      var cell = document.createElement('div');
      cell.className = 'mosaic-cell';
      cell.innerHTML = '<div class="mosaic-cell__ascii" aria-hidden="true"></div>';
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
      // 진짜 마지막 프레임에 최대한 가깝게 잡되, 셀이 눈에 띄게 채워지기 시작하는
      // 시점(mp>0.1)까지도 정확히 못 맞췄으면 빈 채로 남느니 그냥 그 시점 프레임으로
      // 강제 캡처 — 정밀도보다 "아예 안 채워지는" 사고를 막는 게 우선.
      maybeBuildMosaic(mp > 0.1);
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

    // 4) 푸터 워드마크(SVG <text>)도 완전히 같은 크기로 — CSS의 20vw는 브라우저마다/
    // 폭에 따라 brandLogo의 실측 핏 크기와 어긋나서 "인트로랑 사이즈가 다르다"는
    // 문제가 있었음. SVG text 엘리먼트에 직접 font-size/y(베이스라인)를 지정한다.
    var footerSvgText = document.getElementById('footerWordmarkSvgText');
    if (footerSvgText) {
      footerSvgText.setAttribute('font-size', fitted + 'px');
      footerSvgText.setAttribute('y', Math.round(fitted * 0.82) + 'px');
      window.dispatchEvent(new CustomEvent('footerwordmark:resized'));
    }
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

  // invert: true면 색반전(어두운 픽셀 → 밀도 높은 문자) — callout 박스 전용 스타일.
  // 기본(false)은 실제 이미지 명암과 일치하는 정방향 매핑 (work 카드용).
  function buildAscii(imgEl, glyphsEl, invert) {
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

      // object-fit:cover와 동일하게 소스 이미지를 컨테이너 비율로 크롭 —
      // 크롭 없이 원본 전체를 넣으면 실제 보이는 사진과 아스키아트의 비율이
      // 달라져서 서로 안 맞아 보였음.
      var containerAspect = w / h;
      var imgAspect = img.naturalWidth / img.naturalHeight;
      var sx, sy, sw, sh;
      if (imgAspect > containerAspect) {
        sh = img.naturalHeight;
        sw = sh * containerAspect;
        sx = (img.naturalWidth - sw) / 2;
        sy = 0;
      } else {
        sw = img.naturalWidth;
        sh = sw / containerAspect;
        sx = 0;
        sy = (img.naturalHeight - sh) / 2;
      }

      var canvas = document.createElement('canvas');
      canvas.width = cols;
      canvas.height = rows;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
      var data = ctx.getImageData(0, 0, cols, rows).data;

      var lines = [];
      for (var r = 0; r < rows; r++) {
        var line = '';
        for (var c = 0; c < cols; c++) {
          var idx = (r * cols + c) * 4;
          var brightness = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
          // 명암 대비 강화 — 중간톤을 양 극단으로 밀어붙여 흑/백이 뚜렷하게 갈리게 함
          brightness = Math.min(1, Math.max(0, (brightness - 0.5) * ASCII_CONTRAST + 0.5));
          if (invert) brightness = 1 - brightness;
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
    var invert = container.classList.contains('callout__mark');
    if (imgEl && glyphsEl) buildAscii(imgEl, glyphsEl, invert);
  });

  // ── 모자이크 격자 — 영상이 멈춘 마지막 키프레임을 캡처해 20×12칸으로 쪼갠 뒤
  // 칸마다 독립적으로 아스키아트 텍스트를 생성한다 (사진 타일이 아님). ──
  function buildMosaicFromFrame(source) {
    if (!mosaicGrid || !mosaicCells.length) return;
    var vw = source.videoWidth || source.naturalWidth;
    var vh = source.videoHeight || source.naturalHeight;
    if (!vw || !vh) return;

    // 실제 화면의 object-fit:cover와 동일한 크롭 — 뷰포트 비율 기준
    var viewportAspect = (window.innerWidth > 0 && window.innerHeight > 0)
      ? window.innerWidth / window.innerHeight
      : 16 / 9; // 뷰포트 크기를 읽을 수 없는 예외 상황(예: 숨겨진 탭) 대비 fallback
    var srcAspect = vw / vh;
    var sx, sy, sw, sh;
    if (srcAspect > viewportAspect) {
      sh = vh; sw = sh * viewportAspect; sx = (vw - sw) / 2; sy = 0;
    } else {
      sw = vw; sh = sw / viewportAspect; sx = 0; sy = (vh - sh) / 2;
    }

    var CAP_W = 960, CAP_H = Math.round(CAP_W / viewportAspect);
    var cap = document.createElement('canvas');
    cap.width = CAP_W; cap.height = CAP_H;
    var capCtx = cap.getContext('2d');
    capCtx.drawImage(source, sx, sy, sw, sh, 0, 0, CAP_W, CAP_H);

    // 자동 레벨 보정 — 마지막 프레임이 어둡거나(페이드아웃 등) 밋밋한 경우
    // 아스키 글자가 거의 안 보여서 "영상이 안 가려진 것처럼" 보이는 문제가 있었음.
    // 캡처된 프레임 전체의 밝기 min/max로 0~1 전체 범위를 다시 늘려 써서
    // 어떤 장면이든 흑/백 텍스처가 확실히 드러나게 함.
    var fullData = capCtx.getImageData(0, 0, CAP_W, CAP_H).data;
    var minB = 1, maxB = 0;
    for (var fi = 0; fi < fullData.length; fi += 4) {
      var fb = (fullData[fi] * 0.299 + fullData[fi + 1] * 0.587 + fullData[fi + 2] * 0.114) / 255;
      if (fb < minB) minB = fb;
      if (fb > maxB) maxB = fb;
    }
    var levelRange = Math.max(0.05, maxB - minB); // 0으로 안 나눠지게 최소치 보장

    var cellCapW = CAP_W / COLS, cellCapH = CAP_H / ROWS;
    var fontSize = 5; // 작은 셀에 맞춘 축소 폰트 — CSS .mosaic-cell__ascii와 반드시 일치
    var charW = fontSize * 0.6, charH = fontSize * 1.15;
    var tmp = document.createElement('canvas');
    var tctx = tmp.getContext('2d');

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var idx = r * COLS + c;
        var cellEl = mosaicCells[idx];
        var asciiEl = cellEl.querySelector('.mosaic-cell__ascii');
        if (!asciiEl) continue;
        var rect = cellEl.getBoundingClientRect();
        var w = Math.max(rect.width || cellEl.offsetWidth, 20);
        var h = Math.max(rect.height || cellEl.offsetHeight, 20);
        var cols = Math.max(1, Math.floor(w / charW));
        var rows = Math.max(1, Math.floor(h / charH));
        tmp.width = cols; tmp.height = rows;
        try {
          tctx.drawImage(cap, c * cellCapW, r * cellCapH, cellCapW, cellCapH, 0, 0, cols, rows);
        } catch (err) {
          console.error('mosaic cell draw failed', { r: r, c: c, cols: cols, rows: rows, capW: cap.width, capH: cap.height, err: err.message });
          continue;
        }
        var data = tctx.getImageData(0, 0, cols, rows).data;

        var lines = [];
        for (var rr = 0; rr < rows; rr++) {
          var line = '';
          for (var cc = 0; cc < cols; cc++) {
            var i2 = (rr * cols + cc) * 4;
            var brightness = (data[i2] * 0.299 + data[i2 + 1] * 0.587 + data[i2 + 2] * 0.114) / 255;
            brightness = (brightness - minB) / levelRange; // 자동 레벨: 전체 범위로 재분배
            brightness = Math.min(1, Math.max(0, (brightness - 0.5) * ASCII_CONTRAST + 0.5));
            var ci = Math.floor(brightness * (ASCII_MAP.length - 1));
            line += ASCII_MAP[ci];
          }
          lines.push(line);
        }
        asciiEl.textContent = lines.join('\n');
      }
    }
  }

  // 별도 숨겨진 video로 duration 근처를 직접 seek하는 방식은 일부 브라우저/코덱
  // 조합에서 큐(cue) 정보 부족으로 seek이 0으로 튕겨버리는 문제가 있었음.
  // 대신 이미 스크롤에 따라 점진적으로 scrub되고 있는 실제 scrollVid를 그대로
  // 재사용 — 모자이크 구간(p>=SPLIT)에 처음 들어오는 순간이면 이미 그 시점까지
  // 여러 프레임에 걸쳐 정상적으로 재생되어 있으므로 훨씬 안정적으로 동작함.
  var mosaicBuilt = false;
  function maybeBuildMosaic(force) {
    if (mosaicBuilt || !scrollVid || scrollVid.readyState < 2) return;
    // targetTime을 실제 currentTime에 반영하는 rafScrub은 다음 프레임에야 도는
    // 비동기라서, p가 SPLIT을 막 넘은 시점엔 아직 진짜 마지막 프레임이 아닐 수
    // 있었음 (그래서 실제 화면 마지막 프레임과 모자이크 아스키가 서로 달라 보임).
    // currentTime이 duration에 충분히 가까워질 때까지 기다렸다가 캡처하되,
    // force가 true면(셀이 이미 채워지기 시작한 시점) 정밀도를 포기하고서라도
    // 지금 프레임으로 확정 — 영원히 못 맞춰서 빈 채로 남는 사고를 막기 위함.
    if (!force && Math.abs(scrollVid.currentTime - scrollVid.duration) > 0.08) return;
    mosaicBuilt = true;
    buildMosaicFromFrame(scrollVid);
  }

  // ── callout 박스 — 마우스 위치를 중심으로 원형으로 아스키아트가 벗겨지며
  // 뒤에 깔린 실제 이미지가 드러남 (스크롤 peel과 무관, 순수 hover 인터랙션) ──
  var REVEAL_RADIUS = 46; // px
  var REVEAL_FEATHER = 10; // px
  document.querySelectorAll('.callout__mark').forEach(function (mark) {
    var glyphs = mark.querySelector('.ascii-media__glyphs');
    if (!glyphs) return;
    function onMove(e) {
      var rect = mark.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var mask = 'radial-gradient(circle at ' + x + 'px ' + y + 'px, transparent 0, transparent ' +
        REVEAL_RADIUS + 'px, #000 ' + (REVEAL_RADIUS + REVEAL_FEATHER) + 'px)';
      glyphs.style.webkitMaskImage = mask;
      glyphs.style.maskImage = mask;
    }
    function onLeave() {
      glyphs.style.webkitMaskImage = '';
      glyphs.style.maskImage = '';
    }
    mark.addEventListener('mousemove', onMove);
    mark.addEventListener('mouseleave', onLeave);
  });

  // ── 푸터 대형 PRISM 워드마크 — 아주 잘게 나눈 도트 격자를 글자 위에 정확히
  // 겹쳐 깔고, 마우스에 가까운 도트만 그 자리의 글자를 가리며 아스키 글자로
  // 바뀐다. 부드러운 원형 그라데이션(mask-image) 대신 도트 단위로 딱 켜지고
  // 꺼지는 방식이라 경계에 흐린 테두리가 생기지 않는다. ──
  (function initFooterWordmarkDots() {
    var wordmark = document.getElementById('footerWordmark');
    var svgEl = document.getElementById('footerWordmarkSvg');
    var svgText = document.getElementById('footerWordmarkSvgText');
    var dotsEl = wordmark ? wordmark.querySelector('.footer__wordmark-dots') : null;
    if (!wordmark || !svgEl || !svgText || !dotsEl) return;

    var DOT = 13; // px — 도트 한 칸 크기. 작을수록 더 잘게 나뉨(요청대로 더 잘게)
    var dots = []; // {el, cx, cy} — cx/cy는 wordmark 기준 도트 중심 좌표
    var buildGen = 0; // 비동기 이미지 로드가 겹칠 때 최신 요청만 반영

    // 지금까지 두 번 실패한 이유:
    // 1) HTML 인라인 요소의 getBoundingClientRect()는 폰트 라인박스(잉크보다
    //    훨씬 큰 여백 포함) 전체를 줌 → 네모난 덩어리로만 활성화됨.
    // 2) SVG <tspan>.getBBox()도 이 폰트에선 브라우저가 글자별 잉크가 아니라
    //    폰트의 공통 ascent/descent(em 박스)를 반환해서 모든 글자 높이가
    //    똑같이 나옴 → 역시 네모난 덩어리.
    // 그래서 이번엔 아예 "박스로 판단"하지 않고, 실제로 화면에 떠 있는 이
    // <svg> 엘리먼트 자체를 그대로 직렬화해서 캔버스에 래스터라이즈한 뒤
    // 픽셀 밝기를 직접 읽는다 — 다른 곳에 다시 그리거나 근사하는 단계가
    // 전혀 없으므로 화면과 어긋날 수가 없다. CSS 변수(fill:var(--prism-ink)
    // 등)는 이미지로 분리되는 순간 못 읽으므로, 복제본에 실제 계산된 값을
    // 인라인으로 박아넣고 그 복제본만 직렬화한다.
    function build() {
      var wordmarkRect = wordmark.getBoundingClientRect();
      var w = Math.max(wordmarkRect.width, 100), h = Math.max(wordmarkRect.height, 100);
      var myGen = ++buildGen;

      var textCs = getComputedStyle(svgText);
      var clone = svgEl.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', w);
      clone.setAttribute('height', h);
      var cloneText = clone.querySelector('text');
      cloneText.setAttribute('fill', '#ffffff');
      cloneText.setAttribute('font-family', textCs.fontFamily);
      cloneText.setAttribute('font-weight', textCs.fontWeight);
      cloneText.setAttribute('letter-spacing', textCs.letterSpacing);
      var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0'); rect.setAttribute('y', '0');
      rect.setAttribute('width', String(w)); rect.setAttribute('height', String(h));
      rect.setAttribute('fill', '#000000');
      clone.insertBefore(rect, clone.firstChild);

      var svgMarkup = new XMLSerializer().serializeToString(clone);
      var svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup);
      var img = new Image();
      img.onload = function () {
        if (myGen !== buildGen) return;
        var srcCanvas = document.createElement('canvas');
        srcCanvas.width = w; srcCanvas.height = h;
        var srcCtx = srcCanvas.getContext('2d');
        srcCtx.drawImage(img, 0, 0, w, h);
        finishBuild(srcCanvas, w, h);
      };
      img.onerror = function () {
        if (myGen !== buildGen) return;
        dotsEl.innerHTML = '';
        dots = [];
      };
      img.src = svgUrl;
    }

    function finishBuild(srcCanvas, w, h) {
      var cols = Math.max(1, Math.round(w / DOT));
      var rows = Math.max(1, Math.round(h / DOT));
      var cellW = w / cols, cellH = h / rows;

      var tmp = document.createElement('canvas');
      tmp.width = cols; tmp.height = rows;
      var tctx = tmp.getContext('2d');
      tctx.drawImage(srcCanvas, 0, 0, w, h, 0, 0, cols, rows);
      var data = tctx.getImageData(0, 0, cols, rows).data;

      dotsEl.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
      dotsEl.style.gridTemplateRows = 'repeat(' + rows + ', 1fr)';
      dotsEl.style.fontSize = Math.max(6, Math.floor(cellH * 0.9)) + 'px';
      dotsEl.innerHTML = '';
      dots = [];

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var idx = (r * cols + c) * 4;
          var b = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
          var ci = Math.floor(b * (ASCII_MAP.length - 1));
          var el = document.createElement('span');
          el.className = 'footer__wordmark-dot';
          el.textContent = ASCII_MAP[ci];
          dotsEl.appendChild(el);
          dots.push({ el: el, cx: (c + 0.5) * cellW, cy: (r + 0.5) * cellH });
        }
      }
    }

    var buildTimer = null;
    function scheduleBuild() {
      clearTimeout(buildTimer);
      buildTimer = setTimeout(build, 50);
    }
    window.addEventListener('load', scheduleBuild);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleBuild);
    window.addEventListener('resize', scheduleBuild);
    // fitLogoToWidth()가 SVG text의 font-size/y를 바꿀 때마다 정확히 그 시점
    // 이후 기준으로 다시 측정 — load/resize보다 더 확실한 트리거
    window.addEventListener('footerwordmark:resized', scheduleBuild);

    // 커서 반경 안에 중심이 들어오는 도트만 활성화 — 그라데이션 없이 딱 켜짐/꺼짐
    var HOVER_RADIUS = 90;
    var R2 = HOVER_RADIUS * HOVER_RADIUS;
    wordmark.addEventListener('mousemove', function (e) {
      var rect = wordmark.getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i];
        var dx = d.cx - x, dy = d.cy - y;
        var active = (dx * dx + dy * dy) <= R2;
        if (active) d.el.classList.add('is-active');
        else d.el.classList.remove('is-active');
      }
    });
    wordmark.addEventListener('mouseleave', function () {
      for (var i = 0; i < dots.length; i++) dots[i].el.classList.remove('is-active');
    });
  })();

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
