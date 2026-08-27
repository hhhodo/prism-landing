# PRISM — media landing page

미디어/방송/콘텐츠 브랜드 "PRISM" 한 페이지 랜딩. Figma 레퍼런스
(`BrVaTxFSnaAlv6IT2ZRvhs`, top node `122:5846`)를 구조·타이포·컬러·인터랙션의
근거로 삼되, 카피는 미디어 산업으로 새로 작성했다. 치트시트(EDITORIAL LANDING
BUILDER v2)를 엄격히 따라 **토큰만 사용**했다 — onair-landing과 달리 이번 빌드는
리터럴 px 값을 쓰지 않았다.

## Figma 참조 경로

`get_variable_defs`는 `{}` — 이 파일도 Figma Variable을 쓰지 않고 리터럴 값만
사용한다. 아래 주요 섹션 노드에 개별 `get_design_context(forceCode:true)`를
호출해 실제 폰트/색/레이아웃을 확인했다:

- `122:5848`/`122:7181` — 히어로(헤드라인 + 회전된 유리 렌더 이미지, 배경 `#000`)
- `125:14025` 외 2개 — "PRODUX | Design that Speaks" 반복 섹션(3회) → 서비스 소개로 대체
- `125:14256` — Selected projects(7-5 / 10 / 4-7 비대칭 카드 그리드)
- `122:8980` — pull-quote + 아이콘 카드 그리드(`#ebf0ed` 라이트 카드)
- `123:13043` — 후기 카드 가로 캐러셀(치트시트 하드룰상 캐러셀 금지 → 정적 3-3 그리드로 전환)
- `125:13889` — 푸터(대형 워드마크 + 링크)
- `125:13855`, `127:19154`, `127:19157`, `127:19159` — 작은 파란 박스(디자이너 주석)

## 파란 주석 박스(디자인 요소 아님, 렌더링에서 제외) — 발견 내용과 반영

파란 배경(`#2f6bff`) 텍스트 박스 4개를 찾아 전부 읽었다. 모두 인터랙션 지시문이며
최종 HTML에는 렌더링하지 않았다:

1. `127:19154`: "스크롤 시 상단 로고 텍스트가 작아지면서 GNB 로고가 됨"
   → `.nav` 스크롤 리스너로 `is-scrolled` 클래스 토글, 로고 font-size가
   `--fs-h3` → `--fs-body-1`로 줄어들며 배경이 blur된 반투명 GNB로 전환.
2. `127:19157`: "스크롤에 따라 가운데 영상이 프레임이 넘어감"
   → `#reel` 섹션(`.scrollframe`)에서 두 프레임 이미지를 IntersectionObserver +
   `setInterval` 크로스페이드로 전환.
3. `127:19159`: "스크롤에 따라 영상은 멈춘 상태에서 네모 박스와 텍스트가 등장함 /
   네모박스는 ASCII 문구 처리됨" → Selected Work의 각 카드 이미지를
   `.ascii-media` 래퍼로 감싸, 모노스페이스 글리프 베일(`.ascii-media__glyphs`)이
   실제 이미지를 가리고 있다가 스크롤 인뷰 시 fade-out되며 이미지가 드러남.
4. `127:19170`(푸터): "마우스를 호버하면 해당 부분이 원모양/모자이크로 변하고
   ASCII 형태로 나옴" → 푸터 대형 워드마크(`.footer__wordmark`)에 hover 시
   `grayscale + contrast` 필터를 적용해 모자이크/스캔 질감을 근사(직접 SVG/아이콘을
   새로 그리지 않는 스킬 규칙을 지키기 위해 필터 기반으로 구현).

## Variant Memo / Layout Declaration

`index.html` 상단 HTML 주석에 그대로 있음. 요약:

```
typo=loud, image=high, color=accent
image-radius=sharp, card-radius=soft, button-radius=round
border=hairline, button-style=solid, fw=700/400
```

```
Hero   → full-bleed → 8-4
Frame  → full-bleed (스크롤 크로스페이드, 분할 없음)
Work   → full-bleed → 7-5 / 4-8 / 5-7 (비대칭, 연속 반복 없음)
Quote  → full-bleed → 4-4-4
Testi  → full-bleed → 3-3 × 2행 (원본 가로 캐러셀 → 정적 그리드로 전환, 하드룰 준수)
Closer → full-bleed → 8-4
```

## 토큰 준수

- 그리드: 모든 섹션이 `.fb`(full-bleed, width 100%)이고, `.container`는 내부
  콘텐츠에만 사용. 그리드 갭은 `.grid`(styles.css의 `--grid-gutter-lg`=24px,
  사용자 지시와 이미 일치) 그대로 사용, 별도 `--grid-gutter` 오버라이드 없음.
- 좌우 여백: `css/site.css`에서 `:root{--gutter:40px;}`를 무조건(반응형 아님)
  오버라이드 — styles.css는 1024px 이하에서만 40px이 되므로, 데스크톱에서도
  40px을 강제하기 위해 별도 파일에서 재정의(styles.css 자체는 수정하지 않음).
- 타이포/spacing/radius: `--fs-*`, `--space-*`, `--radius-*` 등 styles.css 토큰만
  사용. 실측한 Figma 값(예: 히어로 74.6px 볼드, Selected work 헤딩 64px, 카드
  radius ~10.6px)을 가장 가까운 토큰(`--fs-display-md`≈`--fs-h0`대역,
  `--radius-sm`)에 매핑했다 — 리터럴 px를 HTML/CSS에 직접 쓰지 않았다(단,
  사용자가 명시적으로 지시한 `--gutter:40px`, 그리고 Figma가 명시적으로 제공한
  브랜드 컬러 hex는 예외로 CSS 변수화했다).
- 컬러: Figma에서 실측한 실제 브랜드 컬러(`#000`, `#0e0e0e`, `#151515`, `#f2f2f2`,
  `#a9a9a9`, `#303030`, `#ebf0ed`, 주석 박스의 `#2f6bff`)를 `css/site.css`
  변수로 선언해 사용 — 회색조 뉴트럴 토큰으로 억지로 눌러 담지 않았다(사용자의
  color-fidelity 원칙).

## 폰트

Figma에서 실제로 감지된 폰트: `Helvetica Now Display`(헤드라인, Bold),
`PP Supply Mono`(라벨), `DM Mono`(본문/캡션), `At Aero`(피처 헤딩),
`KakaoBig`(푸터 링크, 원본은 카카오 사이트 예시라 브랜드 특정 폰트). 이 중
`Helvetica Now Display` / `PP Supply Mono` / `At Aero` / `KakaoBig`은 모두 유료
상용 서체로 Google Fonts 등 무료 CDN에 배포되어 있지 않아 그대로 임베드할 수
없었다. 이에:

- `DM Mono`는 Google Fonts에 실제로 존재하므로 **그대로(치환 없이)** 로드해 본문/
  라벨 서체로 사용했다.
- `Helvetica Now Display Bold`는 형태가 가장 가까운 오픈 라이선스 지오메트릭
  그로테스크인 `Space Grotesk`(700)로 대체.
- `PP Supply Mono`는 `Space Mono`로 대체.
- 한글 UI 카피(네비, 카드 타이틀 등)는 styles.css가 이미 로드하는 Pretendard를
  그대로 사용(브랜드 특정이 아닌 범용 한글 서체이므로 대체 대상 아님).

라이선스로 인해 상용 서체 자체를 그대로 쓸 수 없는 상황이라 가장 근접한 무료
서체로 대체했음을 명시한다 — Pretendard로 뭉뚱그리거나 임의로 다른 서체를 쓰지
않았다.

## 버튼

페이지 전체에서 버튼은 "문의하기"(closer 섹션) 하나뿐이다. 네비/푸터 링크는
페이지 내 앵커 이동이라 버튼이 아니며, Figma 원본에 있던 다른 CTA(뷰-올, 아코디언
토글, 화살표 버튼 등)는 모두 삭제하거나 정적 텍스트/카드로 전환했다.

## 배포

GitHub Pages, `hhhodo/prism-landing` 레포, `.github/workflows/deploy.yml`
(`actions/upload-pages-artifact` + `actions/deploy-pages`)로 자동 배포.
