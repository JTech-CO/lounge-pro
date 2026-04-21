'use strict';
(function () {
  const KEY = 'naver_lounge_blocked';
  const THEME_KEY = 'naver_lounge_theme';
  const SCOPE_KEY = 'naver_lounge_theme_scopes';
  const MAX = 20;
  let blockList = [];
  let currentTheme = '0';
  let currentScopes = ['text'];
  let openPanelType = null;

  chrome.storage.local.get([KEY, THEME_KEY, SCOPE_KEY], d => {
    blockList = d[KEY] || [];
    currentTheme = d[THEME_KEY] || '0';
    currentScopes = d[SCOPE_KEY] || ['text'];
    mountUI();
    start();
  });

  window.addEventListener('message', e => {
    if (e.data?.type === 'QUIET_LOUNGE_API_DATA') filterAll();
    if (e.data?.type === 'LP_MONTHLY_STATS_RESULT') handleMonthlyStats(e.data);
  });

  chrome.storage.onChanged.addListener(changes => {
    if (changes[KEY]) { blockList = changes[KEY].newValue || []; filterAll(); }
  });

  function start() {
    filterAll();
    applyTheme();
    checkProfilePage();
    const onMutation = debounce(() => { filterAll(); ensureProfilePanel(); }, 300);
    const mo = new MutationObserver(onMutation);
    mo.observe(document.body, { childList: true, subtree: true });
    watchNavigation();
  }

  function ensureProfilePanel() {
    if (!getPersonaIdFromPath()) return;
    // If panel was removed by React re-render, re-mount it
    if (!document.getElementById(MONTHLY_ID)) checkProfilePage();
  }

  function debounce(fn, ms) {
    let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function save() { chrome.storage.local.set({ [KEY]: blockList }); }
  function saveTheme() { chrome.storage.local.set({ [THEME_KEY]: currentTheme, [SCOPE_KEY]: currentScopes }); }

  function filterAll() {
    if (!blockList.length) {
      document.querySelectorAll('[data-nlb]').forEach(el => {
        el.style.display = ''; el.removeAttribute('data-nlb');
      });
      return;
    }
    const blocked = new Set(blockList);

    document.querySelectorAll('[data-slot="profile-name-label"] span.truncate, a[href^="/profiles/"]').forEach(el => {
      if (el.closest('#__lb__')) return;

      const nick = el.textContent.trim();
      if (!nick) return;

      let container = el.closest('[data-slot="carousel-item"], .swiper-slide') ||
        el.closest('div.relative[tabindex], a.relative.overflow-hidden[href^="/posts/"]');

      if (!container) {
        const scrollArea = el.closest('.infinite-scroll-component, [role="feed"]');
        if (scrollArea) {
          let curr = el;
          while (curr && curr.parentElement && curr.parentElement !== scrollArea && curr.parentElement !== document.body) {
            curr = curr.parentElement;
          }
          container = curr;
        }
      }

      if (!container) {
        container = el.closest('div.relative, li, article') || el.parentElement?.parentElement;
      }
      if (!container) return;

      if (blocked.has(nick)) {
        if (!container.dataset.nlb) {
          container.style.display = 'none';
          container.dataset.nlb = '1';

          const sep = container.nextElementSibling || container.parentElement?.nextElementSibling;
          if (sep && (sep.getAttribute('data-slot') === 'separator' || sep.tagName === 'HR')) {
            sep.style.display = 'none'; sep.dataset.nlb = '1';
          }
        }
      } else if (container.dataset.nlb) {
        container.style.display = ''; container.removeAttribute('data-nlb');
      }
    });

    // Mark '작성자' badges and Titles for theme accenting
    document.querySelectorAll('span, em, strong, b, h1, h2, h3, h4, [class*="title"]').forEach(s => {
      const txt = s.textContent.trim();
      if (txt === '작성자' || s.tagName.match(/^(H[1-6]|STRONG|B)$/) || s.className.match(/title|heading/i)) {
        s.dataset.lpAcc = '1';
      }
    });
  }

  function watchNavigation() {
    const onNav = () => setTimeout(() => { filterAll(); applyTheme(); checkProfilePage(); }, 400);

    const wrap = fn => function (...a) {
      fn.apply(this, a);
      // Force reload on write page entry while global theme is active
      if (window.location.href.includes('/posts/write') && ['5', '6', '7'].includes(currentTheme)) {
        location.reload();
        return;
      }
      onNav();
    };
    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);
    window.addEventListener('popstate', () => {
      if (window.location.href.includes('/posts/write') && ['5', '6', '7'].includes(currentTheme)) {
        location.reload();
        return;
      }
      onNav();
    });
  }

  function mountUI() {
    if (document.getElementById('__lb__')) return;
    const root = document.createElement('div');
    root.id = '__lb__';
    root.innerHTML = `
<style>
  #__lb__ *, #__lb__ *::before, #__lb__ *::after {
    box-sizing:border-box !important; font-family:'Malgun Gothic','맑은 고딕',sans-serif !important;
    -webkit-text-fill-color:initial !important; color:inherit !important;
    background-image:none !important; filter:none !important;
    animation-name:none !important; text-shadow:none !important;
  }
  #__lb__-btn, #__lb__-theme-btn {
    position:fixed !important; right:22px !important; z-index:2147483647 !important;
    width:36px !important; height:36px !important; border-radius:4px !important;
    background:#000 !important; border:1px solid #fff !important;
    display:flex !important; align-items:center !important; justify-content:center !important;
    cursor:pointer !important; user-select:none !important; backdrop-filter:none !important;
  }
  #__lb__-btn { bottom:22px !important; }
  #__lb__-theme-btn { bottom:66px !important; }
  #__lb__-btn svg, #__lb__-theme-btn svg { color:#fff !important; }
  #__lb__-btn svg *, #__lb__-theme-btn svg * { fill:none !important; stroke:#fff !important; }
  #__lb__-panel {
    position:fixed !important; bottom:110px !important; right:22px !important; z-index:2147483646 !important;
    background:#000 !important; border:1px solid #fff !important;
    width:220px !important; padding:10px !important; display:none; border-radius:4px !important;
    backdrop-filter:none !important;
  }
  #__lb__-theme-panel {
    position:fixed !important; bottom:110px !important; right:22px !important; z-index:2147483646 !important;
    background:#000 !important; border:1px solid #fff !important;
    width:320px !important; padding:12px !important; display:none; border-radius:4px !important;
    backdrop-filter:none !important;
  }
  
  #__lb__-header { display:flex !important; justify-content:space-between !important; align-items:center !important; margin-bottom:8px !important; }
  #__lb__-title { color:#fff !important; -webkit-text-fill-color:#fff !important; font-size:12px !important; font-weight:bold !important; }
  #__lb__-count { color:#888 !important; -webkit-text-fill-color:#888 !important; font-size:11px !important; }
  #__lb__-list { max-height:140px !important; overflow-y:auto !important; margin-bottom:8px !important; scrollbar-width:none !important; }
  #__lb__-list::-webkit-scrollbar { display:none !important; }
  .lb-item { display:flex !important; align-items:center !important; justify-content:space-between !important; padding:4px 0 !important; border-bottom:1px solid #222 !important; background:transparent !important; }
  .lb-item:last-child { border-bottom:none !important; }
  .lb-name { color:#fff !important; -webkit-text-fill-color:#fff !important; font-size:12px !important; overflow:hidden !important; text-overflow:ellipsis !important; white-space:nowrap !important; flex:1 !important; }
  .lb-del { background:none !important; border:1px solid #555 !important; color:#aaa !important; -webkit-text-fill-color:#aaa !important; font-size:10px !important; padding:1px 5px !important; border-radius:2px !important; cursor:pointer !important; flex-shrink:0 !important; margin-left:6px !important; }
  .lb-del:hover { border-color:#fff !important; color:#fff !important; -webkit-text-fill-color:#fff !important; }
  #__lb__-empty { color:#555 !important; -webkit-text-fill-color:#555 !important; font-size:11px !important; padding:6px 0 !important; text-align:center !important; }
  #__lb__-row { display:flex !important; gap:4px !important; }
  #__lb__-input { flex:1 !important; background:#111 !important; border:1px solid #444 !important; color:#fff !important; -webkit-text-fill-color:#fff !important; padding:4px 7px !important; font-size:12px !important; border-radius:3px !important; outline:none !important; min-width:0 !important; }
  #__lb__-input:focus { border-color:#fff !important; }
  #__lb__-add { background:#fff !important; border:none !important; color:#000 !important; -webkit-text-fill-color:#000 !important; font-size:12px !important; font-weight:bold !important; padding:4px 9px !important; border-radius:3px !important; cursor:pointer !important; flex-shrink:0 !important; }
  #__lb__-add:hover { background:#ccc !important; }
  #__lb__-msg { font-size:11px !important; min-height:15px !important; margin-top:5px !important; color:#aaa !important; -webkit-text-fill-color:#aaa !important; text-align:center !important; }
  #__lb__-msg.err { color:#f66 !important; -webkit-text-fill-color:#f66 !important; }

  #__lb__-theme-cols { display:flex !important; gap:12px !important; margin-top:10px !important; }
  #__lb__-theme-col1 { flex:1.2 !important; border-right:1px solid #333 !important; padding-right:12px !important; }
  #__lb__-theme-col2 { flex:1 !important; display:flex !important; flex-direction:column !important; gap:8px !important; padding-top:3px !important; justify-content:flex-start !important; }
  .col-title { font-size:11px !important; color:#888 !important; -webkit-text-fill-color:#888 !important; font-weight:bold !important; margin-bottom:8px !important; border-bottom:1px solid #222 !important; padding-bottom:4px !important; text-transform:uppercase !important; letter-spacing:0.5px !important; }
  
  .theme-option {
    display:block !important; width:100% !important; padding:8px !important; text-align:left !important; color:#fff !important; -webkit-text-fill-color:#fff !important; background:none !important; border:none !important; cursor:pointer !important; font-size:12px !important; border-radius:3px !important;
  }
  .theme-option:hover { background:#222 !important; }
  .theme-option.active { font-weight:bold !important; color:#ffb3ba !important; -webkit-text-fill-color:#ffb3ba !important; }
  .scope-label { display:flex !important; align-items:center !important; gap:6px !important; color:#fff !important; -webkit-text-fill-color:#fff !important; font-size:12px !important; cursor:pointer !important; user-select:none !important; }
  .scope-label input { accent-color:#444 !important; cursor:pointer !important; width:14px !important; height:14px !important; }
  .scope-label.disabled { color:#555 !important; -webkit-text-fill-color:#555 !important; cursor:not-allowed !important; }
  .scope-label.disabled input { cursor:not-allowed !important; filter:grayscale(1) opacity(0.5) !important; }
</style>

<div id="__lb__-btn" title="사용자 차단"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div>
<div id="__lb__-theme-btn" title="Theme Settings">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A6 6 0 1 0 7.5 11.5c.76.76 1.23 1.52 1.41 2.5h6.18z"></path>
  </svg>
</div>

<div id="__lb__-panel">
  <div id="__lb__-header">
    <span id="__lb__-title">lounge-pro 차단</span>
    <span id="__lb__-count">0 / ${MAX}</span>
  </div>
  <div id="__lb__-list"></div>
  <div id="__lb__-row">
    <input id="__lb__-input" type="text" placeholder="차단할 닉네임" maxlength="40" autocomplete="off">
    <button id="__lb__-add">차단</button>
  </div>
  <div id="__lb__-msg"></div>
</div>

<div id="__lb__-theme-panel">
  <div id="__lb__-header"><span id="__lb__-title">Theme Settings</span></div>
  <div id="__lb__-theme-cols">
    <div id="__lb__-theme-col1">
      <div class="col-title">Theme</div>
      <button class="theme-option" data-theme="1">Pastel</button>
      <button class="theme-option" data-theme="2">Cyberpunk</button>
      <button class="theme-option" data-theme="3">Holographic</button>
      <button class="theme-option" data-theme="4">Neon</button>
      <hr style="border:none;border-top:1px solid #333;margin:4px 0;">
      <button class="theme-option" data-theme="5">High Contrast</button>
      <button class="theme-option" data-theme="6">Forest</button>
      <button class="theme-option" data-theme="7">Claude Code</button>
      <button class="theme-option" data-theme="0" style="color:#888;">Off</button>
    </div>
    <div id="__lb__-theme-col2">
      <div class="col-title">Scope (적용범위)</div>
      <label class="scope-label"><input type="checkbox" class="scope-cb" value="text"> 글자</label>
      <label class="scope-label"><input type="checkbox" class="scope-cb" value="border"> 테두리</label>
      <label class="scope-label"><input type="checkbox" class="scope-cb" value="bg"> 그라데이션</label>
    </div>
  </div>
</div>`;
    document.body.appendChild(root);

    document.getElementById('__lb__-btn').addEventListener('click', () => togglePanel('block'));
    document.getElementById('__lb__-theme-btn').addEventListener('click', () => togglePanel('theme'));
    document.getElementById('__lb__-add').addEventListener('click', addUser);
    document.getElementById('__lb__-input').addEventListener('keydown', e => { if (e.key === 'Enter') addUser(); });

    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentTheme = e.target.dataset.theme;
        saveTheme();
        renderThemeUI();
        applyTheme();
      });
    });

    document.querySelectorAll('.scope-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.disabled) return;
        currentScopes = Array.from(document.querySelectorAll('.scope-cb:checked')).map(v => v.value);
        saveTheme();
        applyTheme();
      });
    });

    renderList();
    renderThemeUI();
  }

  function togglePanel(type) {
    openPanelType = openPanelType === type ? null : type;
    const blockPanel = document.getElementById('__lb__-panel');
    const themePanel = document.getElementById('__lb__-theme-panel');
    if (blockPanel) blockPanel.style.display = openPanelType === 'block' ? 'block' : 'none';
    if (themePanel) themePanel.style.display = openPanelType === 'theme' ? 'block' : 'none';
    if (openPanelType === 'block') document.getElementById('__lb__-input')?.focus();
  }

  function renderThemeUI() {
    const isOff = currentTheme === '0';
    const isLayoutTheme = ['5', '6', '7'].includes(currentTheme);
    document.querySelectorAll('.theme-option').forEach(btn => {
      if (btn.dataset.theme === currentTheme) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    document.querySelectorAll('.scope-label').forEach(lbl => {
      const cb = lbl.querySelector('input');
      // Disable scopes for Off AND layout-type (toggle) themes
      cb.disabled = isOff || isLayoutTheme;
      cb.checked = currentScopes.includes(cb.value);
      if (isOff || isLayoutTheme) lbl.classList.add('disabled');
      else lbl.classList.remove('disabled');
    });
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

  /* ── Write Page Toast ── */

  let writeToastShown = false;

  function showWriteToast() {
    if (writeToastShown) return;
    writeToastShown = true;

    const toast = document.createElement('div');
    toast.id = 'lp-write-toast';
    toast.textContent = '글쓰기 탭에서는 잠시 테마가 해제됩니다';
    toast.style.cssText = `
      position:fixed !important; top:50% !important; left:50% !important;
      transform:translate(-50%,-50%) !important; z-index:2147483647 !important;
      background:rgba(0,0,0,0.82) !important; color:#fff !important;
      -webkit-text-fill-color:#fff !important;
      padding:14px 28px !important; border-radius:12px !important;
      font-size:14px !important; font-weight:600 !important;
      font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif !important;
      pointer-events:none !important; opacity:0 !important;
      transition:opacity 0.3s ease !important;
      backdrop-filter:blur(8px) !important;
      box-shadow:0 4px 20px rgba(0,0,0,0.3) !important;
      border:none !important; text-shadow:none !important;
      animation:none !important; filter:none !important;
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => { toast.style.opacity = '1'; });

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => { toast.remove(); writeToastShown = false; }, 300);
    }, 2000);
  }

  /* ── Auto Theme Apply ── */

  const THEMES = {
    '1': {
      bg: 'linear-gradient(90deg, #ffb3ba, #ffdfba, #ffffba, #baffc9, #bae1ff, #ffb3ba)',
      anim: 't_aurora 3s linear infinite',
      ftxt: 'drop-shadow(0 0 3px rgba(255,179,186, 0.5))',
      fbg: '0 0 15px rgba(255,179,186, 0.4)'
    },
    '2': {
      bg: 'linear-gradient(90deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000)',
      anim: 't_scroll 1.5s linear infinite',
      ftxt: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.6))',
      fbg: '0 0 15px rgba(255, 255, 255, 0.4)'
    },
    '3': {
      bg: 'linear-gradient(90deg, #a1c4fd 0%, #c2e9fb 30%, #fff 50%, #c2e9fb 70%, #a1c4fd 100%)',
      anim: 't_holo 2.5s ease-in-out infinite',
      ftxt: 'drop-shadow(0 0 4px rgba(161, 196, 253, 0.6))',
      fbg: '0 0 15px rgba(161, 196, 253, 0.4)'
    }
  };

  const SEL_TEXT = 'span, p, h1, h2, h3, h4, h5, h6, strong, em, b, i, q, mark, small, button, a.truncate, label, [data-slot="profile-sub-text"] span';
  const SEL_BORDER = 'hr, [data-slot="separator"], [role="separator"], [class*="border-b"], [class*="border-t"], [class*="border-solid"], [class*="border-neutral"], .border, [class*="ring-"], .ring';
  const SEL_BG = '[data-slot="card"], [data-slot="carousel-item"], article, aside, nav, header, [class*="bg-neutral-surface"], [role="dialog"], .rounded-xl, .rounded-2xl, .bg-white, .bg-black';

  function applyTheme() {
    let style = document.getElementById('lp-theme-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'lp-theme-style';
      document.head.appendChild(style);
    }

    const isGlobalToggle = ['5', '6', '7'].includes(currentTheme);
    const isWritePage = window.location.href.includes('/posts/write');

    if (!isWritePage) writeToastShown = false;

    if (currentTheme === '0' || (!isGlobalToggle && currentScopes.length === 0) || (isGlobalToggle && isWritePage)) {
      style.textContent = '';
      if (isGlobalToggle && isWritePage) showWriteToast();
      return;
    }

    let css = [];
    const isLayoutTheme = currentTheme === '5';
    const isForestTheme = currentTheme === '6';
    const isClaudeTheme = currentTheme === '7';
    const accentColor = '#ffffff';
    const bgColor = '#000000';

    if (isLayoutTheme) {
      // Reset borders first to prevent double-border stacking
      css.push(`
        /* Reset all borders before applying theme-specific ones */
        * { border: none !important; outline: none !important; box-shadow: none !important; border-radius: 0 !important; text-shadow: none !important; animation-name: none !important; filter: none !important; }
      `);
      // Layout themes always apply all areas together for true wireframe effect
      css.push(`
        /* ── Force Root Design Tokens ── */
        :root, [data-theme], [class*="theme"] {
          --color-background-base: ${bgColor} !important;
          --color-background-surface: ${bgColor} !important;
          --color-background-alternative: ${bgColor} !important;
          --color-text-primary: ${accentColor} !important;
          --color-text-secondary: ${accentColor} !important;
          --color-text-tertiary: ${accentColor} !important;
          --color-text-disabled: ${accentColor}88 !important;
          --color-border-default: ${accentColor} !important;
          --color-border-subtle: ${accentColor}66 !important;
          --tw-ring-color: ${accentColor}44 !important;
          --color-primary: ${accentColor} !important;
          --color-primary-hover: ${accentColor}cc !important;
          color-scheme: dark !important;
        }

        /* ── Strip All Decorative CSS ── */
        *, *::before, *::after {
          border-radius: 0 !important;
          box-shadow: none !important;
          text-shadow: none !important;
          animation-name: none !important;
          transition-duration: 0.05s !important;
          filter: none !important;
        }

        /* ── Force Pure Black Backgrounds ── */
        html, body {
          background: ${bgColor} !important;
          background-color: ${bgColor} !important;
        }
        *:not(img):not(picture):not(video):not(canvas):not(svg):not(path):not(use):not(g):not(defs):not([style*="url("]):not([style*="URL("]) {
          background-color: ${bgColor} !important;
          background-image: none !important;
        }
        /* Keep profile images, comment avatars, and thumbnails visible */
        img, picture, video, svg image { background-color: transparent !important; opacity: 1 !important; visibility: visible !important; }
        [style*="url("], [style*="URL("] {
          background-color: transparent !important;
          border: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        /* ── Force All Text to Accent Color ── */
        *, *::before, *::after {
          color: ${accentColor} !important;
          -webkit-text-fill-color: ${accentColor} !important;
          caret-color: ${accentColor} !important;
        }
        
        /* Apply primary accent specifically to Titles and Author badges */
        [data-lp-acc="1"], [data-lp-acc="1"] * {
          color: var(--color-primary) !important;
          -webkit-text-fill-color: var(--color-primary) !important;
        }

        img, video, canvas { color: transparent !important; }

        /* ── Force SVG to Accent Color ── */
        svg { color: ${accentColor} !important; }
        path, circle, rect, line, polyline, polygon, ellipse {
          fill: ${accentColor} !important;
          stroke: ${accentColor} !important;
        }
        /* Exception: empty fill icons */
        [fill="none"] { fill: none !important; }
        [stroke="none"] { stroke: none !important; }

        /* ── Wire all Borders ── */
        * {
          border-color: ${accentColor}55 !important;
          outline-color: ${accentColor} !important;
        }
        [data-slot="card"], article, section, aside, header, nav, footer,
        input, textarea, select, button, [role="button"], [role="dialog"],
        [role="listbox"], [role="menu"], [role="menuitem"],
        .swiper-slide, [data-slot="carousel-item"],
        [class*="Card"], [class*="card"] {
          border: 1px solid ${accentColor} !important;
          outline: none !important;
        }
        /* Protect avatar structures from getting a square border */
        [class*="avatar"], [class*="Avatar"], [class*="profile"], [class*="Profile"], [class*="thumb"], [class*="Thumb"] {
          border: none !important;
        }

        /* ── Separators ── */
        hr, [data-slot="separator"], [role="separator"] {
          background: ${accentColor} !important;
          background-color: ${accentColor} !important;
          height: 1px !important;
          border: none !important;
          opacity: 1 !important;
        }

        /* ── Inputs & Buttons ── */
        input::placeholder, textarea::placeholder { color: ${accentColor}88 !important; }
        button:hover, [role="button"]:hover { background-color: ${accentColor}22 !important; }
        button:focus, input:focus, textarea:focus { outline: 1px solid ${accentColor} !important; }

        /* ── Remove Backdrop / Overlay ── */
        [class*="backdrop"], [class*="overlay"], [class*="dimmer"] {
          background: ${bgColor}cc !important;
        }

      `);

    } else if (isForestTheme) {
      /* ── Forest Digital Sanctuary Theme (Dark) ── */
      const FR_BG = '#1a2318';
      const FR_SURFACE = '#222e20';
      const FR_CARD = '#2a3828';
      const FR_PRIMARY = '#8da491';
      const FR_SECOND = '#5a6b5d';
      const FR_ACCENT = '#3d4f3a';
      const FR_TEXT = '#e8ede6';
      const FR_MUTED = '#a3b3a0';
      const FR_BORDER = 'rgba(141, 164, 145, 0.2)';
      const FR_GLASS = 'rgba(42, 56, 40, 0.75)';

      css.push(`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap');

        /* ── Root Tokens ── */
        :root, [data-theme], [class*="theme"] {
          --color-background-base: ${FR_BG} !important;
          --color-background-surface: ${FR_SURFACE} !important;
          --color-background-alternative: ${FR_ACCENT} !important;
          --color-text-primary: ${FR_TEXT} !important;
          --color-text-secondary: ${FR_MUTED} !important;
          --color-text-tertiary: ${FR_MUTED} !important;
          --color-border-default: ${FR_BORDER} !important;
          --color-border-subtle: ${FR_BORDER} !important;
          --color-primary: ${FR_PRIMARY} !important;
          --color-primary-hover: ${FR_TEXT} !important;
          --tw-ring-color: rgba(141, 164, 145, 0.15) !important;
          color-scheme: dark !important;
        }

        /* ── Base ── */
        html, body {
          background: ${FR_BG} !important;
          background-color: ${FR_BG} !important;
        }

        /* ── Dark Backgrounds ── */
        *:not(img):not(picture):not(video):not(canvas):not(svg):not(path):not(use):not(g):not(defs):not([style*="url("]):not([style*="URL("]):not(#__lb__):not(#__lb__ *) {
          background-color: ${FR_BG} !important;
          background-image: none !important;
        }

        /* ── Preserve media ── */
        img, picture, video, svg image { background-color: transparent !important; opacity: 1 !important; visibility: visible !important; }
        [style*="url("], [style*="URL("] {
          background-color: transparent !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        /* ── Cards & Panels: dark glass ── */
        [data-slot="card"], article, [data-slot="carousel-item"], .swiper-slide,
        [role="dialog"], [class*="Card"], [class*="card"], aside {
          background: ${FR_GLASS} !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid ${FR_BORDER} !important;
          border-radius: 1.5rem !important;
          box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.3) !important;
        }

        /* ── Rounded Geometry ── */
        *:not(#__lb__ *), *:not(#__lb__ *)::before, *:not(#__lb__ *)::after {
          border-radius: 0.8rem !important;
          transition-duration: 0.2s !important;
        }
        button:not(#__lb__ *), [role="button"]:not(#__lb__ *), input:not(#__lb__ *), textarea, select {
          border-radius: 9999px !important;
        }

        /* ── Typography ── */
        *:not(#__lb__ *), *:not(#__lb__ *)::before, *:not(#__lb__ *)::after {
          color: ${FR_TEXT} !important;
          -webkit-text-fill-color: ${FR_TEXT} !important;
          -webkit-font-smoothing: antialiased !important;
        }
        h1, h2, h3, h4, h5, h6, [data-lp-acc="1"],
        h1 *, h2 *, h3 *, h4 *, h5 *, h6 *, [data-lp-acc="1"] * {
          font-family: 'Quicksand', sans-serif !important;
          font-weight: 700 !important;
          color: ${FR_TEXT} !important;
          -webkit-text-fill-color: ${FR_TEXT} !important;
        }
        [class*="sub"], [class*="description"], [class*="meta"], time, small,
        [data-slot="profile-sub-text"] span {
          color: ${FR_MUTED} !important;
          -webkit-text-fill-color: ${FR_MUTED} !important;
        }
        a:not(#__lb__ *) { color: ${FR_PRIMARY} !important; -webkit-text-fill-color: ${FR_PRIMARY} !important; }
        ::placeholder { color: ${FR_SECOND} !important; }

        img, video, canvas { color: transparent !important; -webkit-text-fill-color: initial !important; }

        /* ── SVG Icons ── */
        svg:not(#__lb__ svg) { color: ${FR_PRIMARY} !important; }
        path:not(#__lb__ path), circle:not(#__lb__ circle), rect:not(#__lb__ rect), line:not(#__lb__ line), polyline:not(#__lb__ polyline), polygon, ellipse {
          fill: ${FR_PRIMARY} !important;
          stroke: ${FR_PRIMARY} !important;
        }
        [fill="none"] { fill: none !important; }
        [stroke="none"] { stroke: none !important; }

        /* ── Borders ── */
        *:not(#__lb__ *) { border-color: ${FR_BORDER} !important; }
        [data-slot="card"], article, section, aside, header, nav, footer,
        input:not(#__lb__ *), textarea, select, button:not(#__lb__ *), [role="button"]:not(#__lb__ *),
        [data-slot="carousel-item"], .swiper-slide,
        [class*="Card"], [class*="card"] {
          border: 1px solid ${FR_BORDER} !important;
        }
        /* Preserve avatar roundness */
        [class*="avatar"], [class*="Avatar"], [class*="profile"]:not(#lp-monthly-panel *), [class*="Profile"], [class*="thumb"], [class*="Thumb"] {
          border: none !important;
          border-radius: 50% !important;
        }

        /* ── Separators ── */
        hr, [data-slot="separator"], [role="separator"] {
          background: ${FR_ACCENT} !important;
          background-color: ${FR_ACCENT} !important;
          height: 1px !important;
          border: none !important;
          border-radius: 0 !important;
          opacity: 0.6 !important;
        }

        /* ── Buttons ── */
        button:not(#__lb__ *), [role="button"]:not(#__lb__ *) {
          background-color: ${FR_ACCENT} !important;
          color: ${FR_TEXT} !important;
          -webkit-text-fill-color: ${FR_TEXT} !important;
          border: 1px solid ${FR_BORDER} !important;
        }
        button:not(#__lb__ *):hover, [role="button"]:not(#__lb__ *):hover {
          background-color: ${FR_SECOND} !important;
        }

        /* ── Inputs ── */
        input:not(#__lb__ *), textarea, select {
          background-color: ${FR_SURFACE} !important;
          border: 1px solid ${FR_BORDER} !important;
          color: ${FR_TEXT} !important;
        }
        input:not(#__lb__ *):focus, textarea:focus, select:focus {
          border-color: ${FR_PRIMARY} !important;
          background-color: ${FR_CARD} !important;
          box-shadow: 0 0 0 4px rgba(141, 164, 145, 0.1) !important;
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 10px; background: ${FR_BG} !important; }
        ::-webkit-scrollbar-track { background: ${FR_BG} !important; }
        ::-webkit-scrollbar-thumb { background: ${FR_SECOND} !important; border-radius: 10px !important; border: 3px solid ${FR_BG} !important; }
        ::-webkit-scrollbar-thumb:hover { background: ${FR_PRIMARY} !important; }
        * { scrollbar-color: ${FR_SECOND} ${FR_BG}; }

        /* ── Backdrop ── */
        [class*="backdrop"], [class*="overlay"], [class*="dimmer"] {
          background: rgba(26, 35, 24, 0.85) !important;
        }

        /* ── Remove harsh decorations ── */
        *:not(#__lb__ *) {
          text-shadow: none !important;
          animation-name: none !important;
          filter: none !important;
        }

      `);

    } else if (isClaudeTheme) {
      /* ── Claude Code Terminal Theme ── */
      const CC_BG = '#1e1e1e';  // charcoal background
      const CC_PANEL = '#2a2a2a';  // slightly lighter panels
      const CC_ACCENT = '#e8855a';  // claude's salmon-orange
      const CC_TEXT = '#d4cfbe';  // warm off-white main text
      const CC_DIM = '#8b8378';  // muted secondary text
      const CC_GREEN = '#7cb87c';  // terminal green for labels
      const CC_DASH = '#5a5040';  // dashed border color

      css.push(`
        /* ── Claude Code: Root Tokens ── */
        :root {
          --color-background-base: ${CC_BG} !important;
          --color-background-surface: ${CC_PANEL} !important;
          --color-text-primary: ${CC_TEXT} !important;
          --color-text-secondary: ${CC_DIM} !important;
          --color-text-tertiary: ${CC_DIM} !important;
          --color-border-default: ${CC_DASH} !important;
          --color-primary: ${CC_ACCENT} !important;
          font-family: 'Courier New', 'Consolas', 'Monaco', monospace !important;
        }

        /* ── Base Background ── */
        html, body { background: ${CC_BG} !important; }
        *:not(img):not(picture):not(video):not(canvas):not(svg):not(path):not(use):not(g):not(defs):not([style*="url("]):not([style*="URL("]) {
          background-color: ${CC_BG} !important;
          background-image: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          text-shadow: none !important;
          font-family: 'Courier New', 'Consolas', 'Monaco', monospace !important;
        }
        /* Keep comment avatars and profile images visible */
        img, picture, video, svg image { background-color: transparent !important; opacity: 1 !important; visibility: visible !important; }
        [style*="url("], [style*="URL("] {
          background-color: transparent !important;
          border: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }

        /* ── Typography ── */
        *, *::before, *::after {
          color: ${CC_TEXT} !important;
          -webkit-text-fill-color: ${CC_TEXT} !important;
        }
        
        /* Claude Code Accents for specific UI elements */
        h1, h2, h3, h4, h5, h6, [data-lp-acc="1"], [class*="title"], [class*="heading"], [class*="badge"],
        h1 *, h2 *, h3 *, h4 *, h5 *, h6 *, [data-lp-acc="1"] *, [class*="title"] *, [class*="heading"] *, [class*="badge"] * {
          color: ${CC_ACCENT} !important;
          -webkit-text-fill-color: ${CC_ACCENT} !important;
        }
        [class*="sub"], [class*="description"], [class*="meta"], time, small {
          color: ${CC_DIM} !important;
          -webkit-text-fill-color: ${CC_DIM} !important;
        }
        a { color: ${CC_ACCENT} !important; -webkit-text-fill-color: ${CC_ACCENT} !important; }
        ::placeholder { color: ${CC_DASH} !important; }

        /* ── SVG Icons ── */
        svg { color: ${CC_DIM} !important; }
        path, circle, rect, line, polyline, polygon, ellipse { fill: ${CC_DIM} !important; stroke: ${CC_DIM} !important; }
        [fill="none"] { fill: none !important; }
        [stroke="none"] { stroke: none !important; }

        /* ── Dashed Structural Borders (Claude Code signature look) ── */
        [data-slot="card"], article, section, header, nav, aside, footer,
        [data-slot="carousel-item"], .swiper-slide, [role="dialog"],
        [class*="Card"], [class*="card"] {
          border: 1px dashed ${CC_DASH} !important;
          outline: none !important;
        }
        /* Protect avatar structures from getting a square dashed border */
        [class*="avatar"], [class*="Avatar"], [class*="profile"], [class*="Profile"], [class*="thumb"], [class*="Thumb"] {
          border: none !important;
        }

        /* ── Panels slightly highlighted ── */
        [data-slot="card"], article {
          background-color: ${CC_PANEL} !important;
        }

        /* ── Separators as thin solid lines ── */
        hr, [data-slot="separator"], [role="separator"] {
          background-color: ${CC_DASH} !important;
          height: 1px !important;
          border: none !important;
        }

        /* ── Inputs & Buttons ── */
        input, textarea, select {
          border: 1px solid ${CC_DASH} !important;
          color: ${CC_TEXT} !important;
        }
        button, [role="button"] {
          border: 1px dashed ${CC_DASH} !important;
          color: ${CC_ACCENT} !important;
          -webkit-text-fill-color: ${CC_ACCENT} !important;
        }
        button:hover, [role="button"]:hover { background-color: ${CC_ACCENT}22 !important; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { background: ${CC_BG} !important; width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${CC_DASH} !important; }
        * { scrollbar-color: ${CC_DASH} ${CC_BG}; }

      `);

    } else {
      const t = THEMES[currentTheme];

      if (currentScopes.includes('text')) {
        if (currentTheme === '4') {
          css.push(`
            ${SEL_TEXT} {
              background: linear-gradient(90deg, #fbc2eb 0%, #a6c1ee 50%, #fbc2eb 100%) !important;
              background-size: 200% auto !important;
              color: transparent !important;
              -webkit-background-clip: text !important;
              background-clip: text !important;
              animation: t_breath 3s ease-in-out infinite alternate !important;
            }
          `);
        } else {
          css.push(`
            ${SEL_TEXT} {
              background: ${t.bg} !important;
              background-size: 200% auto !important;
              color: transparent !important;
              -webkit-background-clip: text !important;
              background-clip: text !important;
              animation: ${t.anim} !important;
              filter: ${t.ftxt} !important;
            }
          `);
        }
        css.push(`svg { color: inherit; }`);
      }

      if (currentScopes.includes('border')) {
        if (currentTheme === '4') {
          css.push(`
            ${SEL_BORDER} {
              border-color: transparent !important;
              border-image: linear-gradient(90deg, #fbc2eb 0%, #a6c1ee 50%, #fbc2eb 100%) 1 !important;
              animation: t_breath 3s ease-in-out infinite alternate !important;
            }
            hr, [data-slot="separator"], [role="separator"] {
              background: linear-gradient(90deg, #fbc2eb 0%, #a6c1ee 50%, #fbc2eb 100%) !important;
              background-size: 200% auto !important;
              border: none !important;
              animation: t_breath 3s ease-in-out infinite alternate !important;
            }
          `);
        } else {
          css.push(`
            ${SEL_BORDER} {
              border-color: transparent !important;
              border-image: ${t.bg} 1 !important;
              animation: ${t.anim} !important;
              box-shadow: ${t.fbg} !important;
            }
            hr, [data-slot="separator"], [role="separator"] {
              background: ${t.bg} !important;
              background-size: 200% auto !important;
              border: none !important;
              animation: ${t.anim} !important;
              box-shadow: ${t.fbg} !important;
            }
          `);
        }
        css.push(`.ring, [class*="ring-"] { --tw-ring-color: transparent !important; }`);
      }

      if (currentScopes.includes('bg')) {
        if (currentTheme === '4') {
          css.push(`
            ${SEL_BG} {
              background: linear-gradient(90deg, #fbc2eb 0%, #a6c1ee 50%, #fbc2eb 100%) !important;
              background-size: 200% auto !important;
              animation: t_breath 3s ease-in-out infinite alternate !important;
              border: none !important;
            }
          `);
        } else {
          css.push(`
            ${SEL_BG} {
              background: ${t.bg} !important;
              background-size: 200% auto !important;
              animation: ${t.anim} !important;
              border: none !important;
              box-shadow: ${t.fbg} !important;
            }
          `);
        }
        css.push(`
          body, html, main, #root, #__next {
            background: none !important; 
            background-color: var(--color-background-base, #111) !important;
            box-shadow: none !important;
          }
        `);
      }

      css.push(`
        @keyframes t_aurora { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        @keyframes t_scroll { to { background-position: -200% center; } }
        @keyframes t_holo { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
      `);
      if (currentTheme === '4') {
        css.push(`
          @keyframes t_breath {
            0% { filter: hue-rotate(0deg) drop-shadow(0 0 2px rgba(255,255,255,0.3)); }
            100% { filter: hue-rotate(360deg) drop-shadow(0 0 10px rgba(255,255,255,0.9)); }
          }
        `);
      }
    }

    /* ── Monthly Stats Panel Theme Integration ── */
    if (isLayoutTheme) {
      css.push(`
        #lp-monthly-panel, #lp-monthly-panel *, #lp-monthly-panel *::before, #lp-monthly-panel *::after {
          color: ${accentColor} !important;
          -webkit-text-fill-color: ${accentColor} !important;
          background-color: transparent !important;
          background-image: none !important;
          font-family: inherit !important;
        }
        #lp-monthly-panel {
          background-color: ${bgColor} !important;
          border: 1px solid ${accentColor} !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        #lp-monthly-panel .lpm-bar-bg { background-color: ${accentColor}22 !important; border-radius: 0 !important; }
        #lp-monthly-panel .lpm-bar-fill { border-radius: 0 !important; background: ${accentColor} !important; }
        #lp-monthly-panel .lpm-bar-fill.lpm-exceeded { background: ${accentColor} !important; animation-name: none !important; }
        #lp-monthly-panel .lpm-ms, #lp-monthly-panel .lpm-ms.on { color: ${accentColor}88 !important; -webkit-text-fill-color: ${accentColor}88 !important; }
        #lp-monthly-panel .lpm-ms::before { background-color: ${accentColor}55 !important; }
        #lp-monthly-panel .lpm-ms-goal.on { color: ${accentColor} !important; -webkit-text-fill-color: ${accentColor} !important; filter: none !important; }
        #lp-monthly-panel .lpm-posts .lpm-label { color: ${accentColor} !important; -webkit-text-fill-color: ${accentColor} !important; }
        #lp-monthly-panel .lpm-comments .lpm-label { color: ${accentColor}cc !important; -webkit-text-fill-color: ${accentColor}cc !important; }
        #lp-monthly-panel .lpm-pct, #lp-monthly-panel .lpm-count { color: ${accentColor} !important; -webkit-text-fill-color: ${accentColor} !important; }
        #lp-monthly-panel .lpm-refresh svg path, #lp-monthly-panel .lpm-refresh svg polyline { stroke: ${accentColor}88 !important; }
        #lp-monthly-panel .lpm-icon path { stroke: ${accentColor} !important; }
        #lp-monthly-panel .lpm-spinner { border-color: ${accentColor}33 !important; border-top-color: ${accentColor} !important; border-radius: 0 !important; }
      `);
    } else if (isClaudeTheme) {
      const CC_BG = '#1e1e1e', CC_PANEL = '#2a2a2a', CC_ACCENT = '#e8855a', CC_TEXT = '#d4cfbe', CC_DIM = '#8b8378', CC_DASH = '#5a5040';
      css.push(`
        #lp-monthly-panel, #lp-monthly-panel *, #lp-monthly-panel *::before, #lp-monthly-panel *::after {
          color: ${CC_TEXT} !important;
          -webkit-text-fill-color: ${CC_TEXT} !important;
          background-color: transparent !important;
          background-image: none !important;
          font-family: 'Courier New', 'Consolas', 'Monaco', monospace !important;
        }
        #lp-monthly-panel {
          background-color: ${CC_BG} !important;
          border: 1px dashed ${CC_DASH} !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        #lp-monthly-panel .lpm-title { color: ${CC_ACCENT} !important; -webkit-text-fill-color: ${CC_ACCENT} !important; }
        #lp-monthly-panel .lpm-bar-bg { background-color: ${CC_PANEL} !important; border-radius: 0 !important; }
        #lp-monthly-panel .lpm-bar-fill { border-radius: 0 !important; background: ${CC_ACCENT} !important; }
        #lp-monthly-panel .lpm-bar-fill.lpm-exceeded { background: ${CC_ACCENT} !important; animation-name: none !important; }
        #lp-monthly-panel .lpm-ms, #lp-monthly-panel .lpm-ms.on { color: ${CC_DIM} !important; -webkit-text-fill-color: ${CC_DIM} !important; }
        #lp-monthly-panel .lpm-ms::before { background-color: ${CC_DASH} !important; }
        #lp-monthly-panel .lpm-ms-goal.on { color: ${CC_ACCENT} !important; -webkit-text-fill-color: ${CC_ACCENT} !important; filter: none !important; }
        #lp-monthly-panel .lpm-posts .lpm-label { color: ${CC_ACCENT} !important; -webkit-text-fill-color: ${CC_ACCENT} !important; }
        #lp-monthly-panel .lpm-comments .lpm-label { color: ${CC_DIM} !important; -webkit-text-fill-color: ${CC_DIM} !important; }
        #lp-monthly-panel .lpm-pct, #lp-monthly-panel .lpm-count { color: ${CC_TEXT} !important; -webkit-text-fill-color: ${CC_TEXT} !important; }
        #lp-monthly-panel .lpm-refresh svg path, #lp-monthly-panel .lpm-refresh svg polyline { stroke: ${CC_DIM} !important; }
        #lp-monthly-panel .lpm-icon path { stroke: ${CC_ACCENT} !important; }
        #lp-monthly-panel .lpm-spinner { border-color: ${CC_DASH} !important; border-top-color: ${CC_ACCENT} !important; border-radius: 0 !important; }
      `);
    } else if (isForestTheme) {
      const FR_BG = '#1a2318', FR_CARD = '#2a3828', FR_PRIMARY = '#8da491', FR_SECOND = '#5a6b5d', FR_TEXT = '#e8ede6', FR_MUTED = '#a3b3a0', FR_BORDER = 'rgba(141,164,145,0.2)';
      css.push(`
        #lp-monthly-panel, #lp-monthly-panel *, #lp-monthly-panel *::before, #lp-monthly-panel *::after {
          color: ${FR_TEXT} !important;
          -webkit-text-fill-color: ${FR_TEXT} !important;
          background-color: transparent !important;
          background-image: none !important;
          font-family: 'Quicksand', sans-serif !important;
        }
        #lp-monthly-panel {
          background: rgba(42, 56, 40, 0.75) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid ${FR_BORDER} !important;
          border-radius: 1.5rem !important;
          box-shadow: 0 8px 24px -8px rgba(0,0,0,0.3) !important;
        }
        #lp-monthly-panel .lpm-title { color: ${FR_TEXT} !important; -webkit-text-fill-color: ${FR_TEXT} !important; }
        #lp-monthly-panel .lpm-bar-bg { background-color: ${FR_SECOND}44 !important; border-radius: 9999px !important; }
        #lp-monthly-panel .lpm-bar-fill { border-radius: 9999px !important; background: linear-gradient(90deg, ${FR_SECOND}, ${FR_PRIMARY}) !important; }
        #lp-monthly-panel .lpm-bar-fill.lpm-complete,
        #lp-monthly-panel .lpm-bar-fill.lpm-exceeded { background: linear-gradient(90deg, ${FR_PRIMARY}, ${FR_TEXT}) !important; }
        #lp-monthly-panel .lpm-ms, #lp-monthly-panel .lpm-ms.on { color: ${FR_MUTED} !important; -webkit-text-fill-color: ${FR_MUTED} !important; }
        #lp-monthly-panel .lpm-ms::before { background-color: ${FR_SECOND} !important; }
        #lp-monthly-panel .lpm-ms-goal.on { color: ${FR_PRIMARY} !important; -webkit-text-fill-color: ${FR_PRIMARY} !important; filter: none !important; }
        #lp-monthly-panel .lpm-posts .lpm-label { color: ${FR_PRIMARY} !important; -webkit-text-fill-color: ${FR_PRIMARY} !important; }
        #lp-monthly-panel .lpm-comments .lpm-label { color: ${FR_MUTED} !important; -webkit-text-fill-color: ${FR_MUTED} !important; }
        #lp-monthly-panel .lpm-pct { color: ${FR_PRIMARY} !important; -webkit-text-fill-color: ${FR_PRIMARY} !important; }
        #lp-monthly-panel .lpm-count { color: ${FR_MUTED} !important; -webkit-text-fill-color: ${FR_MUTED} !important; }
        #lp-monthly-panel .lpm-refresh svg path, #lp-monthly-panel .lpm-refresh svg polyline { stroke: ${FR_SECOND} !important; }
        #lp-monthly-panel .lpm-icon path { stroke: ${FR_PRIMARY} !important; }
        #lp-monthly-panel .lpm-spinner { border-color: ${FR_SECOND} !important; border-top-color: ${FR_PRIMARY} !important; border-radius: 50% !important; }
        #lp-monthly-panel .lpm-loading { color: ${FR_MUTED} !important; -webkit-text-fill-color: ${FR_MUTED} !important; }
      `);
    } else if (currentScopes.includes('border')) {
      const t = THEMES[currentTheme];
      if (t) {
        if (currentTheme === '4') {
          css.push(`
            #lp-monthly-panel {
              border-color: transparent !important;
              border-image: linear-gradient(90deg, #fbc2eb 0%, #a6c1ee 50%, #fbc2eb 100%) 1 !important;
              border-style: solid !important; border-width: 1px !important;
              animation: t_breath 3s ease-in-out infinite alternate !important;
            }
          `);
        } else {
          css.push(`
            #lp-monthly-panel {
              border-color: transparent !important;
              border-image: ${t.bg} 1 !important;
              border-style: solid !important; border-width: 1px !important;
              box-shadow: ${t.fbg} !important;
            }
          `);
        }
      }
    }

    style.textContent = css.join('\\n');
  }

  /* ── Monthly Profile Stats Panel ── */

  const MONTHLY_ID = 'lp-monthly-panel';
  const POST_GOAL = 30;
  const COMMENT_GOAL = 90;
  let monthlyCache = {};
  let activePersonaId = null;

  function getPersonaIdFromPath() {
    const m = location.pathname.match(/^\/profiles\/([^/]+)/);
    return m ? m[1] : null;
  }

  function checkProfilePage() {
    const pid = getPersonaIdFromPath();
    if (!pid) { removeMonthlyPanel(); activePersonaId = null; return; }
    activePersonaId = pid;

    // Wait for tablist to appear then mount panel
    const tryMount = () => {
      if (document.getElementById(MONTHLY_ID)) {
        // Already mounted, just ensure data
        requestIfNeeded(pid);
        return;
      }
      const tablist = document.querySelector('[role="tablist"]');
      if (tablist) {
        mountMonthlyPanel(tablist);
        requestIfNeeded(pid);
      } else {
        setTimeout(tryMount, 500);
      }
    };
    tryMount();
  }

  function requestIfNeeded(pid) {
    const c = monthlyCache[pid];
    const now = new Date();
    if (c && c.month === now.getMonth() + 1 && c.year === now.getFullYear() && (Date.now() - c.ts < 300000)) {
      renderMonthlyData(c);
      return;
    }
    setMonthlyLoading();
    window.postMessage({ type: 'LP_MONTHLY_STATS_REQUEST', personaId: pid }, '*');
  }

  function handleMonthlyStats(data) {
    if (data.error) { setMonthlyError(); return; }
    const result = { posts: data.posts, comments: data.comments, month: data.month, year: data.year, ts: Date.now() };
    monthlyCache[data.personaId] = result;
    if (data.personaId === activePersonaId) renderMonthlyData(result);
  }

  function mountMonthlyPanel(tablist) {
    const panel = document.createElement('div');
    panel.id = MONTHLY_ID;
    panel.innerHTML = `
      <div class="lpm-header">
        <div class="lpm-title-row">
          <svg class="lpm-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
          <span class="lpm-title"></span>
        </div>
        <button class="lpm-refresh" title="새로고침">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
      </div>
      <div class="lpm-body">
        <div class="lpm-loading">불러오는 중...</div>
      </div>
    `;
    tablist.insertAdjacentElement('afterend', panel);

    // Set title with current month
    const now = new Date();
    panel.querySelector('.lpm-title').textContent = `${now.getMonth() + 1}월 이벤트 달성 현황`;

    panel.querySelector('.lpm-refresh').addEventListener('click', () => {
      if (activePersonaId) {
        delete monthlyCache[activePersonaId];
        setMonthlyLoading();
        window.postMessage({ type: 'LP_MONTHLY_STATS_REQUEST', personaId: activePersonaId }, '*');
      }
    });
  }

  function setMonthlyLoading() {
    const body = document.querySelector(`#${MONTHLY_ID} .lpm-body`);
    if (body) body.innerHTML = '<div class="lpm-loading"><div class="lpm-spinner"></div>불러오는 중...</div>';
  }

  function setMonthlyError() {
    const body = document.querySelector(`#${MONTHLY_ID} .lpm-body`);
    if (body) body.innerHTML = '<div class="lpm-loading lpm-err">데이터를 불러올 수 없습니다.</div>';
  }

  function removeMonthlyPanel() {
    document.getElementById(MONTHLY_ID)?.remove();
  }

  function getMilestoneClass(pct) {
    if (pct >= 100) return 'lpm-complete';
    if (pct >= 75) return 'lpm-high';
    if (pct >= 50) return 'lpm-mid';
    if (pct >= 25) return 'lpm-low';
    return 'lpm-start';
  }

  function renderTrack(label, count, goal, accentClass) {
    const pct = Math.round((count / goal) * 100);
    const fillW = Math.min(pct, 100);
    const cls = getMilestoneClass(pct);
    const exceeded = pct > 100;

    const ms = [25, 50, 75].map(v =>
      `<span class="lpm-ms${pct >= v ? ' on' : ''}" style="left:${v}%">${v}%</span>`
    ).join('');
    const goalMs = `<span class="lpm-ms lpm-ms-goal${pct >= 100 ? ' on' : ''}" style="left:calc(100% - 1px)">✦</span>`;

    return `
      <div class="lpm-track ${accentClass}">
        <div class="lpm-label-row">
          <span class="lpm-label">${label}</span>
          <span class="lpm-count">${count.toLocaleString()} / ${goal}</span>
        </div>
        <div class="lpm-bar-wrap">
          <div class="lpm-bar-container">
            <div class="lpm-bar-bg">
              <div class="lpm-bar-fill ${cls}${exceeded ? ' lpm-exceeded' : ''}" style="width:${fillW}%"></div>
            </div>
            <div class="lpm-milestones">${ms}${goalMs}</div>
          </div>
          <span class="lpm-pct ${cls}">${pct}%</span>
        </div>
      </div>
    `;
  }

  function renderMonthlyData(data) {
    const body = document.querySelector(`#${MONTHLY_ID} .lpm-body`);
    if (!body) return;
    body.innerHTML =
      renderTrack('게시글', data.posts, POST_GOAL, 'lpm-posts') +
      renderTrack('댓글', data.comments, COMMENT_GOAL, 'lpm-comments');
  }

})();