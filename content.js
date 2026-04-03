'use strict';
(function () {
  const KEY = 'naver_lounge_blocked';
  const THEME_KEY = 'naver_lounge_theme';
  const SCOPE_KEY = 'naver_lounge_theme_scopes';
  const MAX = 20;
  let blockList = [];
  let currentTheme = '1';
  let currentScopes = ['text'];
  let openPanelType = null;

  chrome.storage.local.get([KEY, THEME_KEY, SCOPE_KEY], d => {
    blockList = d[KEY] || [];
    currentTheme = d[THEME_KEY] || '1';
    currentScopes = d[SCOPE_KEY] || ['text'];
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
    applyTheme();
    const mo = new MutationObserver(debounce(filterAll, 300));
    mo.observe(document.body, { childList: true, subtree: true });
    watchNavigation();
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
    const wrap = fn => function (...a) {
      fn.apply(this, a);
      setTimeout(() => { filterAll(); applyTheme(); }, 400);
    };
    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);
    window.addEventListener('popstate', () => setTimeout(() => { filterAll(); applyTheme(); }, 400));
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
  #__lb__-btn, #__lb__-theme-btn {
    position:fixed; right:22px; z-index:2147483647;
    width:36px; height:36px; border-radius:4px;
    background:#000; border:1px solid #fff;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; user-select:none;
  }
  #__lb__-btn { bottom:22px; }
  #__lb__-theme-btn { bottom:66px; }
  #__lb__-panel {
    position:fixed; bottom:110px; right:22px; z-index:2147483646;
    background:#000; border:1px solid #fff;
    width:220px; padding:10px; display:none; border-radius:4px;
  }
  #__lb__-theme-panel {
    position:fixed; bottom:110px; right:22px; z-index:2147483646;
    background:#000; border:1px solid #fff;
    width:320px; padding:12px; display:none; border-radius:4px;
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

  #__lb__-theme-cols { display: flex; gap: 12px; margin-top:10px; }
  #__lb__-theme-col1 { flex: 1.2; border-right: 1px solid #333; padding-right: 12px; }
  #__lb__-theme-col2 { flex: 1; display:flex; flex-direction:column; gap:8px; padding-top:3px; justify-content:flex-start; }
  .col-title { font-size:11px; color:#888; font-weight:bold; margin-bottom:8px; border-bottom:1px solid #222; padding-bottom:4px; text-transform:uppercase; letter-spacing:0.5px; }
  
  .theme-option {
    display:block; width:100%; padding:8px; text-align:left; color:#fff; background:none; border:none; cursor:pointer; font-size:12px; border-radius:3px;
  }
  .theme-option:hover { background:#222; }
  .theme-option.active { font-weight:bold; color:#ffb3ba; }
  .scope-label { display:flex; align-items:center; gap:6px; color:#fff; font-size:12px; cursor:pointer; user-select:none; }
  .scope-label input { accent-color:#444; cursor:pointer; width:14px; height:14px; }
  .scope-label.disabled { color:#555; cursor:not-allowed; }
  .scope-label.disabled input { cursor:not-allowed; filter:grayscale(1) opacity(0.5); }
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
      <button class="theme-option" data-theme="6">Matrix</button>
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

    if (currentTheme === '0' || (!isGlobalToggle && currentScopes.length === 0) || (isGlobalToggle && isWritePage)) {
      style.textContent = '';
      return;
    }

    let css = [];
    const isLayoutTheme = currentTheme === '5' || currentTheme === '6';
    const isClaudeTheme = currentTheme === '7';
    const accentColor = currentTheme === '6' ? '#00ff00' : '#ffffff';
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

        /* ── Matrix: green scrollbar ── */
        ${currentTheme === '6' ? `
          ::-webkit-scrollbar { background: ${bgColor} !important; width: 8px; }
          ::-webkit-scrollbar-thumb { background: ${accentColor}88 !important; }
        ` : ''}
      `);

    } else if (isClaudeTheme) {
      /* ── Claude Code Terminal Theme ── */
      const CC_BG    = '#1e1e1e';  // charcoal background
      const CC_PANEL = '#2a2a2a';  // slightly lighter panels
      const CC_ACCENT= '#e8855a';  // claude's salmon-orange
      const CC_TEXT  = '#d4cfbe';  // warm off-white main text
      const CC_DIM   = '#8b8378';  // muted secondary text
      const CC_GREEN = '#7cb87c';  // terminal green for labels
      const CC_DASH  = '#5a5040';  // dashed border color

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

    style.textContent = css.join('\\n');
  }

})();
