# Release Notes

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
