# lounge-pro

> **네이버 라운지를 더 쾌적하게 - 사용자 차단 + 프로필 통계**

## 1. 소개 (Introduction)

lounge-pro는 네이버 라운지(lounge.naver.com)에 부족한 편의 기능을 브라우저 확장 프로그램으로 보완합니다.

**사용자 차단 (User Blocker)** [lounge-block](https://github.com/jtech-co/lounge-block)
- 닉네임을 입력하면 해당 사용자의 게시글이 피드에서 즉시 사라짐
- 최대 10명 차단 가능, 언제든 개별 해제 가능
- 페이지 로드 · 무한 스크롤 · SPA 페이지 이동 시에도 자동 적용
- 차단 목록은 브라우저 로컬 저장소에만 보관, 외부 전송 없음

**프로필 통계 배지 (Profile Stats)** [lounge-profile-stats](https://github.com/jtech-co/lounge-profile-stats)
- 프로필 페이지 방문 시 총 게시글 수 · 댓글 수를 배지로 표시
- DOM 우선 파싱, RSC(React Server Component) 데이터 폴백
- SPA 전환에도 자동 갱신

## 2. 기술 스택 (Tech Stack)

- **Platform**: Chrome Extension (Manifest V3)
- **Language**: Vanilla JavaScript (ES2020+)
- **Storage**: chrome.storage.local
- **Design**: 흑백 미니멀 UI (차단 패널) / 컬러 배지 (프로필 통계)

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
   - **차단**: 우측 하단 버튼 클릭 → 닉네임 입력 → **차단** 버튼 또는 `Enter`
   - **해제**: 차단 목록에서 **해제** 버튼 클릭
   - **프로필 통계**: 프로필 페이지 방문 시 탭 하단에 게시글 · 댓글 배지 자동 표시

## 4. 폴더 구조 (Structure)

```text
lounge-pro/
├── manifest.json              # 확장 프로그램 설정 (Manifest V3)
├── injector.js                # MAIN world fetch 인터셉터 (API 응답 파싱)
├── content.js                 # 핵심 로직 (차단 필터링 + UI + 프로필 통계)
├── style.css                  # 프로필 통계 배지 스타일
├── icons/                     # 확장 프로그램 아이콘 (16/48/128px)
├── lounge-pro-privacy-policy.html  # 개인정보 처리방침
├── RELEASE-NOTES.md           # 릴리즈 노트
└── README.md                  # 프로젝트 안내 문서
```

## 5. 정보 (Info)

- **Version**: 2.0
- **License**: MIT
- **Privacy Policy**: [개인정보 처리방침](https://jtech-co.github.io/lounge-pro/lounge-pro-privacy-policy.html)
