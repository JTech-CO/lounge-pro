'use strict';
(function () {
  const SEL = {
    postLink: 'a[href^="/posts/"]',
    postContainer: 'div.relative[tabindex]',
    nickname: '[data-slot="profile-name-label"] span.truncate',
    card: '[data-slot="card"]',
    cardItem: '[data-slot="carousel-item"]',
    scrollArea: '.infinite-scroll-component',
  };

  const KEY = 'naver_lounge_blocked';
  const MAX = 10;
  let blockList = [];
  let panelOpen = false;

  chrome.storage.local.get(KEY, d => {
    blockList = d[KEY] || [];
    mountUI();
    start();
  });

  window.addEventListener('message', e => {
    if (e.data?.type === 'QUIET_LOUNGE_API_DATA') filterAll();
  });

  chrome.storage.onChanged.addListener(changes => {
    if (changes[KEY]) { blockList = changes[KEY].newValue || []; filterAll(); }
  });

  function start() {
    filterAll();
    runProfileStats();
    const mo = new MutationObserver(() => {
      debouncedFilter();
      debouncedStats();
    });
    mo.observe(document.querySelector(SEL.scrollArea) || document.body, { childList: true, subtree: true });
    watchNavigation();
  }

  const debouncedFilter = debounce(filterAll, 200);
  const debouncedStats = debounce(runProfileStats, 500);

  function debounce(fn, ms) {
    let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function save() { chrome.storage.local.set({ [KEY]: blockList }); }

  function filterAll() {
    if (!blockList.length) {
      document.querySelectorAll('[data-nlb]').forEach(el => {
        el.style.display = ''; el.removeAttribute('data-nlb');
      });
      return;
    }
    const blocked = new Set(blockList);
    filterFeed(blocked);
    filterCarousel(blocked);
  }

  function filterFeed(blocked) {
    document.querySelectorAll(SEL.postLink).forEach(link => {
      if (link.closest('#__lb__')) return;
      const nick = link.querySelector(SEL.nickname)?.textContent?.trim();
      if (!nick) return;
      const container = link.closest(SEL.postContainer) || link.parentElement?.parentElement;
      if (!container) return;
      if (blocked.has(nick)) {
        if (!container.dataset.nlb) {
          container.style.display = 'none';
          container.dataset.nlb = '1';
          const sep = container.parentElement?.nextElementSibling;
          if (sep?.getAttribute('data-slot') === 'separator') {
            sep.style.display = 'none'; sep.dataset.nlb = '1';
          }
        }
      } else if (container.dataset.nlb) {
        container.style.display = ''; container.removeAttribute('data-nlb');
      }
    });
  }

  function filterCarousel(blocked) {
    document.querySelectorAll(SEL.card).forEach(card => {
      if (card.closest('#__lb__')) return;
      const nick = card.querySelector(SEL.nickname)?.textContent?.trim();
      if (!nick) return;
      const item = card.closest(SEL.cardItem);
      if (!item) return;
      if (blocked.has(nick)) {
        item.style.display = 'none'; item.dataset.nlb = '1';
      } else if (item.dataset.nlb) {
        item.style.display = ''; item.removeAttribute('data-nlb');
      }
    });
  }

  function watchNavigation() {
    const wrap = fn => function (...a) {
      fn.apply(this, a);
      setTimeout(() => { filterAll(); runProfileStats(); }, 400);
    };
    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);
    window.addEventListener('popstate', () => setTimeout(() => { filterAll(); runProfileStats(); }, 400));
  }

  function mountUI() {
    if (document.getElementById('__lb__')) return;
    const root = document.createElement('div');
    root.id = '__lb__';
    root.innerHTML = `
<style>
  #__lb__ *, #__lb__ *::before, #__lb__ *::after {
    box-sizing:border-box; font-family:'Malgun Gothic','맑은 고딕',sans-serif;
  }
  #__lb__-btn {
    position:fixed; bottom:22px; right:22px; z-index:2147483647;
    width:36px; height:36px; border-radius:4px;
    background:#000; border:1px solid #fff;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; user-select:none;
  }
  #__lb__-panel {
    position:fixed; bottom:66px; right:22px; z-index:2147483646;
    background:#000; border:1px solid #fff;
    width:220px; padding:10px; display:none; border-radius:4px;
  }
  #__lb__-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
  #__lb__-title { color:#fff; font-size:12px; font-weight:bold; }
  #__lb__-count { color:#888; font-size:11px; }
  #__lb__-list { max-height:140px; overflow-y:auto; margin-bottom:8px; scrollbar-width:none; }
  #__lb__-list::-webkit-scrollbar { display:none; }
  .lb-item { display:flex; align-items:center; justify-content:space-between; padding:4px 0; border-bottom:1px solid #222; }
  .lb-item:last-child { border-bottom:none; }
  .lb-name { color:#fff; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; }
  .lb-del { background:none; border:1px solid #555; color:#aaa; font-size:10px; padding:1px 5px; border-radius:2px; cursor:pointer; flex-shrink:0; margin-left:6px; }
  .lb-del:hover { border-color:#fff; color:#fff; }
  #__lb__-empty { color:#555; font-size:11px; padding:6px 0; text-align:center; }
  #__lb__-row { display:flex; gap:4px; }
  #__lb__-input { flex:1; background:#111; border:1px solid #444; color:#fff; padding:4px 7px; font-size:12px; border-radius:3px; outline:none; min-width:0; }
  #__lb__-input:focus { border-color:#fff; }
  #__lb__-add { background:#fff; border:none; color:#000; font-size:12px; font-weight:bold; padding:4px 9px; border-radius:3px; cursor:pointer; flex-shrink:0; }
  #__lb__-add:hover { background:#ccc; }
  #__lb__-msg { font-size:11px; min-height:15px; margin-top:5px; color:#aaa; text-align:center; }
  #__lb__-msg.err { color:#f66; }
</style>
<div id="__lb__-btn" title="lounge-block"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div>
<div id="__lb__-panel">
  <div id="__lb__-header">
    <span id="__lb__-title">lounge-block</span>
    <span id="__lb__-count">0 / ${MAX}</span>
  </div>
  <div id="__lb__-list"></div>
  <div id="__lb__-row">
    <input id="__lb__-input" type="text" placeholder="차단할 닉네임" maxlength="40" autocomplete="off">
    <button id="__lb__-add">차단</button>
  </div>
  <div id="__lb__-msg"></div>
</div>`;
    document.body.appendChild(root);
    document.getElementById('__lb__-btn').addEventListener('click', togglePanel);
    document.getElementById('__lb__-add').addEventListener('click', addUser);
    document.getElementById('__lb__-input').addEventListener('keydown', e => { if (e.key === 'Enter') addUser(); });
    renderList();
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    const p = document.getElementById('__lb__-panel');
    if (p) p.style.display = panelOpen ? 'block' : 'none';
    if (panelOpen) document.getElementById('__lb__-input')?.focus();
  }

  function renderList() {
    const listEl = document.getElementById('__lb__-list');
    const countEl = document.getElementById('__lb__-count');
    if (!listEl) return;
    countEl.textContent = `${blockList.length} / ${MAX}`;
    if (!blockList.length) { listEl.innerHTML = '<div id="__lb__-empty">차단된 사용자 없음</div>'; return; }
    listEl.innerHTML = blockList.map(u =>
      `<div class="lb-item"><span class="lb-name" title="${h(u)}">${h(u)}</span><button class="lb-del" data-u="${h(u)}">해제</button></div>`
    ).join('');
    listEl.querySelectorAll('.lb-del').forEach(btn =>
      btn.addEventListener('click', () => removeUser(btn.dataset.u))
    );
  }

  function addUser() {
    const input = document.getElementById('__lb__-input');
    const name = input.value.trim();
    if (!name) return;
    if (blockList.includes(name)) { showMsg('이미 차단된 사용자입니다.', true); return; }
    if (blockList.length >= MAX) { showMsg(`최대 ${MAX}명까지 차단 가능합니다.`, true); return; }
    blockList.push(name); save(); input.value = '';
    showMsg(`"${name}" 차단되었습니다.`);
    renderList(); filterAll();
  }

  function removeUser(name) {
    blockList = blockList.filter(u => u !== name);
    save(); renderList(); filterAll();
    showMsg(`"${name}" 해제되었습니다.`);
  }

  function showMsg(text, isErr) {
    const msg = document.getElementById('__lb__-msg');
    if (!msg) return;
    msg.textContent = text; msg.className = isErr ? 'err' : '';
    clearTimeout(msg._t);
    msg._t = setTimeout(() => { msg.textContent = ''; msg.className = ''; }, 2000);
  }

  function h(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Profile Stats ── */

  const BADGE_ID = 'lounge-profile-stats-badge';

  function extractCountsFromDOM() {
    let totalPosts = 0, totalComments = 0;
    document.querySelectorAll('[data-slot="profile-sub-text"] > span').forEach(span => {
      const text = span.textContent.trim();
      const pm = text.match(/게시글\s*([\d,]+)/);
      const cm = text.match(/댓글\s*([\d,]+)/);
      if (pm) totalPosts += parseInt(pm[1].replace(/,/g, ''), 10);
      if (cm) totalComments += parseInt(cm[1].replace(/,/g, ''), 10);
    });
    return (totalPosts || totalComments) ? { totalPosts, totalComments } : null;
  }

  function extractCountsFromRSC() {
    for (const s of document.querySelectorAll('script')) {
      const t = s.textContent;
      if (!t) continue;
      const pm = t.match(/"totalPostCount"\s*:\s*(\d+)/);
      const cm = t.match(/"totalCommentCount"\s*:\s*(\d+)/);
      if (pm && cm) return {
        totalPosts: parseInt(pm[1], 10),
        totalComments: parseInt(cm[1], 10),
      };
    }
    return null;
  }

  function renderProfileBadge({ totalPosts, totalComments }) {
    let badge = document.getElementById(BADGE_ID);
    if (!badge) {
      badge = document.createElement('div');
      badge.id = BADGE_ID;
      const tablist = document.querySelector('[role="tablist"]');
      if (!tablist) return;
      tablist.insertAdjacentElement('afterend', badge);
    }
    badge.innerHTML =
      `<span class="ls-tag ls-posts">게시글 ${totalPosts.toLocaleString()}</span>` +
      `<span class="ls-tag ls-comments">댓글 ${totalComments.toLocaleString()}</span>`;
  }

  function runProfileStats() {
    if (!location.pathname.startsWith('/profiles/')) return;
    const counts = extractCountsFromDOM() || extractCountsFromRSC();
    if (counts) renderProfileBadge(counts);
  }

  let psTimer = null;
  const psObserver = new MutationObserver(() => {
    clearTimeout(psTimer);
    psTimer = setTimeout(runProfileStats, 500);
  });
  psObserver.observe(document.body, { childList: true, subtree: true });
  setTimeout(runProfileStats, 1000);
})();