# lounge-pro

> **네이버 라운지를 더 쾌적하게 - 사용자 차단 + 커스텀 테마**

## 1. 소개 (Introduction)

lounge-pro는 네이버 라운지(lounge.naver.com)에 부족한 편의 기능을 브라우저 확장 프로그램으로 보완합니다.

**사용자 차단 (User Blocker)**
- 닉네임을 입력하면 해당 사용자의 게시글이 피드에서 즉시 사라짐
- 최대 20명 차단 가능, 언제든 개별 해제 가능
- 페이지 로드 · 무한 스크롤 · SPA 페이지 이동 시에도 자동 적용
- 차단 목록은 브라우저 로컬 저장소에만 보관, 외부 전송 없음

**라운지 테마 (lounge Theme)**
- 메인 화면과 프로필의 텍스트를 포함하여 피드 내 모든 UI 요소에 7가지 테마(Pastel, Cyberpunk, Holographic, Neon, High Contrast, Matrix, Claude Code) 자유롭게 적용
- '고대비', '매트릭스' 전용 **퓨어 블랙 와이어프레임(Wireframe)** 엔진 지원 — `:root` CSS 변수 강제 덮어쓰기 기반으로 배경/글자/테두리를 `#000000` + 액센트(`#fff` / `#0f0`) 2색으로 축약, 모든 음영·굴곡 제거
- 화면 우측 하단 전용 UI에서 클릭만으로 실시간 테마 변경 및 온/오프 가능
- 커스텀 설정은 브라우저 공간에 자동 저장 및 SPA 전환 시에도 최적화 유지

## 2. 기술 스택 (Tech Stack)

- **Platform**: Chrome Extension (Manifest V3)
- **Language**: Vanilla JavaScript (ES2020+)
- **Storage**: chrome.storage.local
- **Design**: 흑백 미니멀 UI (차단 패널) / 파스텔 네온 애니메이션 (통계 강조)

## 3. 설치 및 실행 (Quick Start)

**요구 사항**: Chrome 기반 브라우저 (Chrome, Edge, Brave 등)

1. **다운로드 (Download)**
   ```bash
   git clone https://github.com/jtech-co/lounge-pro.git
   ```

2. **확장 프로그램 로드 (Load Extension)**
   - Chrome 주소창에 `chrome://extensions` 입력
   - 우측 상단 **개발자 모드** 활성화
   - **압축 해제된 확장 프로그램을 로드합니다** 클릭
   - 클론한 폴더 선택

3. **사용 (Usage)**
   - `lounge.naver.com` 접속 시 확장 프로그램이 자동 실행
   - **차단**: 우측 하단 방패 버튼 클릭 → 닉네임 입력 → **차단** 버튼 또는 `Enter`
   - **해제**: 차단 목록에서 **해제** 버튼 클릭
   - **폰트 컬러 테마 변경**: 우측 하단 전구 아이콘 버튼을 눌러 원하는 애니메이션/퓨어 다크 효과와 세부 적용 항목(글자, 테두리, 배경) 클릭 (실시간 적용 및 자동 저장)

## 4. 폴더 구조 (Structure)

```text
lounge-pro/
├── manifest.json              # 확장 프로그램 설정 (Manifest V3)
├── injector.js                # MAIN world fetch 인터셉터 (API 응답 파싱)
├── content.js                 # 핵심 로직 (차단 필터링 + UI + 프로필 오로라 이펙트)
├── style.css                  # (Legacy) 프로필 통계 배지 스타일
├── icons/                     # 확장 프로그램 아이콘 (16/48/128px)
├── lounge-block-privacy-policy.html  # 개인정보 처리방침
├── RELEASE-NOTES.md           # 릴리즈 노트
└── README.md                  # 프로젝트 안내 문서
```

## 5. 정보 (Info)

- **Version**: 2.6
- **License**: MIT
- **Privacy Policy**: [개인정보 처리방침](https://jtech-co.github.io/lounge-pro/lounge-pro-privacy-policy.html)
