# Release Notes

## v2.0 - lounge-pro

> lounge-block → lounge-pro 리브랜딩 및 기능 통합

### 새 기능 (New Features)

- **프로필 통계 배지**: 프로필 페이지(`/profiles/`)에서 총 게시글 수 · 댓글 수를 컬러 배지로 표시
  - DOM 파싱 우선, RSC 스크립트 데이터 폴백으로 안정적 추출
  - MutationObserver 기반 SPA 전환 자동 감지 및 갱신
- 프로필 통계 전용 CSS 파일(`style.css`) 추가

### 변경 사항 (Changes)

- 확장 프로그램 명칭을 `lounge-block` → `lounge-pro`로 변경
- `manifest.json` 버전 1.0 → 2.0 업데이트
- `content.js`에 프로필 통계 로직 네이티브 통합

### 기존 기능 유지 (Unchanged)

- 사용자 차단 (닉네임 기반, 최대 10명)
- 피드 · 캐러셀 필터링
- 무한 스크롤 · SPA 내비게이션 대응
- `injector.js` fetch 인터셉터

---

## v1.0 - lounge-block

### 초기 릴리즈 (Initial Release)

- 네이버 라운지 사용자 차단 기능
  - 닉네임 입력으로 피드 게시글 숨김
  - 최대 10명 차단, 개별 해제 지원
  - `chrome.storage.local` 기반 로컬 저장
- MAIN world fetch 인터셉터로 API 응답에서 postId ↔ personaId ↔ nickname 매핑 추출
- SSR hydration 데이터 파싱 지원
- MutationObserver 기반 무한 스크롤 대응
- SPA 내비게이션 감지 (`pushState` / `replaceState` / `popstate`)
- 흑백 미니멀 UI (고정 버튼 + 패널)