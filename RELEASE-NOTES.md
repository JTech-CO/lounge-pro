# Release Notes

## v3.0 — Monthly Event Tracker

### 새 기능 (New Features)

- **월간 이벤트 달성 트래커**: 프로필 페이지(`/profiles/`)에서 이번 달 작성한 게시글 · 댓글 수를 자동 집계하여 프로그레스 바로 표시
  - 달성 목표: 게시글 월 30개, 댓글 월 90개
  - 25% / 50% / 75% / 100% 마일스톤 단계 표시 및 단계별 색상 변화 (게이미피케이션)
  - 100% 초과 시 실제 퍼센티지 + 달성 시머 이펙트
  - 새로고침 버튼으로 즉시 갱신, 5분 캐시로 효율적 동작

### 변경 사항 (Changes)

- **`injector.js` 확장**: 활동 API 커서 기반 월별 게시글/댓글 카운팅 엔진 추가 (`countMonthlyActivity`)
  - API 커서 Base64 디코딩으로 날짜 경계 판별
  - JSON/XML 양쪽 응답 포맷 호환 파서 내장
  - `LP_MONTHLY_STATS_REQUEST` / `LP_MONTHLY_STATS_RESULT` 메시지 프로토콜
- **`content.js` 확장**: 프로필 페이지 감지 → 패널 마운트 → 데이터 수신 → 렌더링 파이프라인 추가
- **`style.css` 재작성**: 네이버 라운지 네이티브 디자인 언어 기반 이벤트 트래커 패널 스타일
- 테마 엔진과 독립적으로 동작하도록 `#lp-monthly-panel` 전용 스타일 격리
- `manifest.json` 버전 2.6 → 3.0

### v3.0.1 — 패널 안정화 및 테마 연동

**버그 수정 (Bug Fixes)**

- **기본 테마 OFF**: 첫 설치 시 테마가 Pastel로 적용되던 문제 수정, 기본값을 Off로 변경
- **패널 깜빡임 수정**: React 리렌더 시 스탯 패널이 DOM에서 제거되면 `MutationObserver`가 즉시 재마운트하도록 `ensureProfilePanel()` 추가

**개선 사항 (Improvements)**

- **패널 높이 약 25% 축소**: 패딩 · 마진 · 바 높이 · 아이콘 · 폰트 전반을 컴팩트하게 조정
- **다크 브랜드 테마 고정**: 라이트/다크 모드 무관하게 `#111111` 배경 + 네이버 그린(`#03C75A`) 기반 고정 다크 스타일
- **그라데이션 테마 테두리 연동**: Pastel · Cyberpunk · Holographic · Neon 테마에서 테두리 Scope 활성 시 스탯 패널 테두리에 해당 그라데이션 `border-image` 적용 (글자 · 배경은 미변경)
- **전체 변경형 테마 연동**: 고대비(#5) · 매트릭스(#6) 적용 시 패널이 와이어프레임화 (`border-radius: 0`, 퓨어 블랙 배경, 액센트 단색 바), Claude Code(#7) 적용 시 dashed 테두리 + 모노스페이스 + 터미널 톤으로 전환
- 매트릭스 테마 삭제 및 Forest 테마 추가

---

## v2.6 - Claude Code Theme & Layout Mode Polish
- **Claude Code 테마 (`#7`) 신설**: `1px dashed` 테두리, `#1e1e1e`/`#2a2a2a` 배경, `#e8855a` 오렌지 액센트, `#d4cfbe` 본문, 모노스페이스 폰트
- **레이아웃 모드 Scope 비활성화**: 테마 5/6/7 선택 시 `renderThemeUI()`가 Scope 체크박스를 자동 `disabled` 처리
- **이중 테두리 버그 픽스**: CSS 주입 전 `* { border: none !important }` 리셋을 선행 적용
- **댓글 프로필 사진 버그 픽스**: `:not([style*="background-image"])` 예외 추가로 인라인 아바타 이미지 보존

---

## v2.5 - High Contrast / Matrix CSS Root Takeover
- **`:root` 토큰 강제 교체**: `--color-background-base`, `--color-text-primary` 등 네이버 디자인 토큰을 소스에서 직접 덮어쓰기
- **와일드카드 배경 블랙아웃**: `*:not(img):not([style*="background-image"])…` 체인으로 배경색 일괄 `#000000` 강제
- **SVG 예외 처리**: `fill`/`stroke` 강제 교체 + `fill="none"` 아웃라인 아이콘 보호
- **Matrix 전용 스크롤바**: `::-webkit-scrollbar` 형광 초록 적용
- `animation-name`, `box-shadow`, `filter` 일괄 제거

---

## v2.4 - Pure Darkmode Wireframe Architecture
- **High Contrast / Matrix 렌더링 엔진 재설계**: `border-radius: 0`, 퓨어 블랙 배경, 1px 솔리드 액센트 테두리 와이어프레임화
- **코드 유출 버그 픽스**: 템플릿 리터럴 이스케이프 누수 수정
- **차단 캐파 상향**: `MAX 10 → 20`

---

## v2.3 - High Contrast & Matrix Full-Layout Themes
- **솔리드 다크 테마 2종 신설**: `border-radius: 0`, `box-shadow: none`, 퓨어 블랙 배경, 액센트 컬러(`#fff`/`#0f0`) 단일 적용
- **스코프 로직 (`currentScopes`) 추가**: `Text`/`Border`/`Bg` 독립 토글; `SEL_TEXT`, `SEL_BORDER`, `SEL_BG` 그룹화 타겟팅

---

## v2.2 - Multi-Theme Toggle UI
- **4종 네온 테마 통합**: Pastel, Cyberpunk, Holographic, Neon
- **Theme Panel 구축**: 전구 SVG 버튼(`.lb-theme-btn`), `applyTheme()` 실시간 `<style>` 스왑, `THEME_KEY`/`SCOPE_KEY` 영속성

---

## v2.1 - UI Stability & Aurora Glow Effect
- **차단 필터링 재설계 (Radix UI 대응)**: `el.closest()` 역환조사로 부모 컨테이너 탐색 후 `display:none` 적용
- **통계 배지 로직 폐기**: `extractCountsFromDOM` 등 삭제 → `[data-slot="profile-sub-text"] span`에 `background-clip: text` 애니메이션 직접 주입

---

## v2.0 - lounge-pro
- **리브랜딩**: `lounge-block` → `lounge-pro`
- **프로필 통계 배지**: `extractCountsFromDOM`/`extractCountsFromRSC` + `MutationObserver` 연동
- `content.js`에 코어 로직 및 스타일 템플릿 병합

---

## v1.0 - lounge-block
- **초기 릴리즈**: 닉네임 기반 피드 숨김 (`filterAll`, `filterFeed`, `filterCarousel`)
- **스토리지**: `blockList`(최대 20) + `chrome.storage.local` 바인딩
- **SPA 라우팅 후킹**: `history.pushState`/`replaceState`/`popstate` 오버라이드
- **API 인터셉트**: `injector.js` MAIN world 주입으로 `postId ↔ personaId` 매핑 추출