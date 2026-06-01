'use strict';

if (window !== window.top) {
  /* 타 확장 프로그램이 이 프레임을 Lounge Column iframe으로 인식할 수 있도록 마커 설정 */
  document.documentElement.setAttribute('data-lc-frame', '1');

  const style = document.createElement('style');
  style.textContent = '::-webkit-scrollbar{display:none!important}*{scrollbar-width:none!important;-ms-overflow-style:none!important}';
  (document.head || document.documentElement).appendChild(style);

  document.addEventListener('mousedown', (e) => {
    if (e.button === 3) { e.preventDefault(); history.back(); }
    else if (e.button === 4) { e.preventDefault(); history.forward(); }
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Backspace') return;
    const el = document.activeElement;
    if (!el) return;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || el.isContentEditable) return;
    e.preventDefault();
    history.back();
  }, true);

  /* body 직속 자식 중 z-index > 99999 인 고정 요소를 타 확장 오버레이로 간주하여 숨김 */
  function suppressExtOverlays() {
    if (!document.body) return;
    function hide(node) {
      if (node.nodeType !== 1 || node.parentElement !== document.body) return;
      const cs = window.getComputedStyle(node);
      const z  = parseInt(cs.zIndex, 10);
      if (cs.position === 'fixed' && !isNaN(z) && z > 99999) {
        node.style.setProperty('display', 'none', 'important');
      }
    }
    Array.from(document.body.children).forEach(hide);
    new MutationObserver(muts => {
      for (const m of muts) m.addedNodes.forEach(hide);
    }).observe(document.body, { childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', suppressExtOverlays);
  } else {
    suppressExtOverlays();
  }
}

if (window === window.top) {
  const _pending = [];
  let _timer = null;

  function scheduleSave() {
    clearTimeout(_timer);
    _timer = setTimeout(flush, 600);
  }

  function flush() {
    if (!_pending.length) return;
    const batch = _pending.splice(0);

    chrome.storage.local.get(['lc_discovered_lounges'], (data) => {
      const existing = data.lc_discovered_lounges || [];
      const existingIds = new Set(existing.map(l => l.id));

      const added = batch.filter(c =>
        c.id && c.name && !existingIds.has(c.id)
      );
      if (!added.length) return;

      chrome.storage.local.set({
        lc_discovered_lounges: [...existing, ...added],
      });
    });
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.type !== 'LC_DISCOVERED_CHANNELS') return;
    const channels = e.data.channels;
    if (!Array.isArray(channels) || !channels.length) return;
    _pending.push(...channels);
    scheduleSave();
  });
}
