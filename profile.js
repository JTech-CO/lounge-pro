'use strict';
(function () {
  /* 컬럼 iframe 내부에서는 실행하지 않음 (최상위 프레임 전용) */
  if (window !== window.top) return;

  const BTN_ID = 'lp-official-dashboard-btn';
  const DASHBOARD_URL = 'https://lounge.naver.com/mate/dashboard';

  const onProfilePage = () => /^\/profiles\/[^/]+/.test(location.pathname);

  /* "활동지수" 라벨 span(또는 정보 버튼)을 앵커로 사용 */
  function findActivityAnchor() {
    const spans = document.querySelectorAll('span');
    for (const s of spans) {
      if (s.textContent.trim() === '활동지수') return s;
    }
    return document.querySelector('[aria-label="라운지 활동지수 정보 보기"]');
  }

  /* 앵커에서 위로 올라가 '세로 흐름(블록·flex-column·grid)' 컨테이너를 찾아,
     그 컨테이너 안에서 활동지수 행 바로 다음에 버튼을 끼울 자식 노드를 반환 */
  function findInsertAfterNode(anchor) {
    let child = anchor;
    let parent = child.parentElement;
    while (parent && parent !== document.body) {
      const cs = getComputedStyle(parent);
      const vertical = cs.display.includes('flex')
        ? cs.flexDirection.startsWith('column')
        : (cs.display === 'block' || cs.display === 'grid' || cs.display.includes('flow-root'));
      if (vertical && parent.getBoundingClientRect().width >= 150) return child;
      child = parent;
      parent = parent.parentElement;
    }
    return anchor.parentElement; // 폴백: 앵커의 부모 다음에 삽입
  }

  function buildButton() {
    const a = document.createElement('a');
    a.id = BTN_ID;
    a.href = DASHBOARD_URL;
    a.setAttribute('role', 'button');
    a.setAttribute('aria-label', '공식 대시보드로 이동');
    a.style.cssText = [
      'display:flex', 'align-items:center', 'justify-content:center', 'gap:6px',
      'width:100%', 'margin:12px 0', 'padding:11px 16px', 'box-sizing:border-box',
      'border-radius:12px', 'background:#03c75a', 'color:#fff', '-webkit-text-fill-color:#fff',
      'font-size:14px', 'font-weight:700',
      "font-family:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,sans-serif",
      'text-decoration:none', 'cursor:pointer', 'border:none', 'box-shadow:none',
      'text-shadow:none', 'letter-spacing:-0.2px', 'line-height:1.3', 'animation:none', 'filter:none'
    ].map(s => s + ' !important').join(';');
    a.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">' +
      '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="5"/>' +
      '<rect x="12" y="8" width="3" height="9"/><rect x="17" y="14" width="3" height="3"/></svg>' +
      '<span style="color:#fff !important;-webkit-text-fill-color:#fff !important">공식 대시보드</span>';
    return a;
  }

  function ensureButton() {
    if (!onProfilePage()) { document.getElementById(BTN_ID)?.remove(); return; }
    if (document.getElementById(BTN_ID)) return;          // 이미 존재 → 멱등
    const anchor = findActivityAnchor();
    if (!anchor) return;                                   // 아직 렌더 전
    const after = findInsertAfterNode(anchor);
    if (!after || !after.parentElement) return;
    after.insertAdjacentElement('afterend', buildButton());
  }

  const debounce = (fn, ms) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };
  const tick = debounce(ensureButton, 250);

  /* SPA 리렌더·페이지 전환 대응: DOM 변화 감지 시 (재)삽입/제거 */
  new MutationObserver(tick).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', () => setTimeout(ensureButton, 300));

  ensureButton();
})();
