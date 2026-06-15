# lounge-pro

> **네이버 라운지를 더 쾌적하게 — 라운지 테마 · 멀티 컬럼 뷰어 · 프로필 대시보드 바로가기** · `v4.0.0`

<img src="https://raw.githubusercontent.com/JTech-CO/lounge-pro/refs/heads/main/images/1-Main.png" width="45%"> <img src="https://raw.githubusercontent.com/JTech-CO/lounge-pro/refs/heads/main/images/2-Sub1.png" width="45%">

## 1. 소개 (Introduction)

lounge-pro는 네이버 라운지(lounge.naver.com)에 부족한 편의 기능을 브라우저 확장 프로그램으로 보완합니다.
네이버 라운지의 공식 업데이트로 기존 일부 기능이 정식 지원됨에 따라, lounge-pro는 **라운지 테마**와 **멀티 컬럼 뷰어**를 중심으로 재편되었습니다.

**라운지 테마 (Lounge Theme)**
- 메인 화면과 프로필을 포함한 피드 내 모든 UI 요소에 7가지 테마(Pastel, Cyberpunk, Holographic, Neon, High Contrast, Forest, Claude Code) 적용
- '고대비' 전용 **퓨어 블랙 와이어프레임(Wireframe)** 엔진, '포레스트' 전용 **다크 글래스모피즘** 엔진 지원
- 화면 우측 하단 전용 UI에서 클릭만으로 실시간 테마 변경 및 적용 범위(글자/테두리/그라데이션) 선택
- 화면 전체 변경형 테마 사용 중 글쓰기 진입 시 자동 해제 → 등록 후 자동 복원
- 설정은 브라우저 로컬 저장소에 자동 저장되며 SPA 전환 시에도 유지

**멀티 컬럼 뷰어 (Multi-Column Viewer)**
- 한 화면에서 최대 4개 라운지 채널을 컬럼형으로 동시 표시 (로그인 세션 유지)
- **566개 라운지가 기본 내장**되어 검색형 드롭다운에서 즉시 선택·매핑, 탐색 중 가로챈 API 응답으로 신규 채널 자동 누적
- 화면 좌하단 **컬럼 보기** 버튼 또는 툴바 아이콘으로 일반 보기 ↔ 컬럼 보기 즉시 전환
- 마우스 4번째 버튼(뒤로가기) 또는 Backspace로 해당 컬럼 내에서만 이전 페이지 이동
- 컬럼 수·채널 배치·사이드바 상태가 `chrome.storage.local`에 자동 저장·복원
- 컬럼 보기 진입 시 테마 토글 버튼은 자동으로 숨겨져 화면을 가리지 않음

**프로필 공식 대시보드 바로가기 (Profile Dashboard Shortcut)**
- 프로필 페이지의 **'활동지수' 아래에 `공식 대시보드` 버튼**을 추가, 클릭 시 네이버 공식 대시보드(`/mate/dashboard`)로 이동
- SPA 리렌더로 버튼이 사라지면 자동 재삽입(멱등 처리), 테마 적용 중에도 버튼이 가려지지 않도록 보호

> 테마는 일반 보기(최상위 화면)에만 적용되며, 컬럼 뷰의 각 채널은 네이버 라운지 원본 그대로 표시됩니다.

## 2. 기술 스택 (Tech Stack)

- **Platform**: Chrome Extension (Manifest V3)
- **Language**: Vanilla JavaScript (ES2020+)
- **Content Scripts**: MAIN world(fetch 가로채기) + ISOLATED world 이중 구조
- **Storage**: `chrome.storage.local`
- **Network**: `declarativeNetRequest` (X-Frame-Options · CSP 헤더 제거로 iframe 임베딩 허용)
- **Channel DB**: `api.lounge.naver.com/content-api/v1` 크롤링으로 **566개 라운지** 사전 수집(`lounge_db.js`) + 탐색 중 자동 누적
- **Design**: 다크 테마 오버레이(`#lc-root` 스코프 격리) / 동적 주입 테마 엔진(`#lp-theme-style`)

## 3. 설치 및 실행 (Quick Start)

**요구 사항**: Chrome 기반 브라우저 (Chrome, Edge, Brave 등)

1. **다운로드 (Download)**
   ```bash
   git clone https://github.com/jtech-co/lounge-pro.git
   ```

2. **확장 프로그램 로드 (Load Extension)**
   - Chrome 주소창에 `chrome://extensions` 입력
   - 우측 상단 **개발자 모드** 활성화
   - **압축 해제된 확장 프로그램을 로드합니다** 클릭 → 클론한 `lounge-pro` 폴더 선택

3. **사용 (Usage)**
   - `lounge.naver.com` 접속 시 확장 프로그램이 자동 실행 (컬럼 기능은 네이버 로그인 필요)
   - **테마 변경**: 우측 하단 전구 아이콘 버튼 → 원하는 테마 및 적용 범위 선택
   - **컬럼 보기**: 좌하단 **컬럼 보기** 버튼(또는 툴바 아이콘) → 좌측 사이드바에서 컬럼 수와 채널 선택(566개 검색)
   - **공식 대시보드**: 프로필 페이지의 '활동지수' 아래 **공식 대시보드** 버튼 클릭

## 4. 폴더 구조 (Structure)

```text
lounge-pro/
├── manifest.json          # MV3 설정 (권한 · background · action · DNR · content_scripts)
├── background.js          # 서비스 워커: 툴바 클릭 토글 + 라운지 채널 크롤러
├── rules.json             # declarativeNetRequest: iframe 임베딩용 헤더 제거 규칙
├── theme.js               # 라운지 테마 엔진 + 테마 설정 UI (동적 CSS 주입)
├── column.js              # 멀티 컬럼 오버레이 UI (상태 관리 · DOM 생성 · 이벤트)
├── profile.js             # 프로필 '활동지수' 아래 공식 대시보드 버튼 삽입
├── lounge_db.js           # 채널 DB(566개 라운지) + 유틸 함수 (getAllLounges 등)
├── discover_injector.js   # MAIN world: fetch 및 채널 데이터 추출/탐색
├── discover_content.js    # ISOLATED world: 채널 저장 + iframe 스크롤바·뒤로가기 처리
├── overlay.css            # 컬럼 오버레이 전용 스타일 (다크 테마)
├── icons/                 # 확장 프로그램 아이콘 (16/48/128px)
├── lounge-pro-privacy-policy.html   # 개인정보 처리방침
├── lounge-pro-release-notes.html    # 릴리즈 노트
└── README.md              # 프로젝트 안내 문서
```

## 5. 정보 (Info)

- **Version**: 4.0.0
- **License**: MIT
- **Privacy Policy**: [개인정보 처리방침](https://jtech-co.github.io/lounge-pro/lounge-pro-privacy-policy.html)
