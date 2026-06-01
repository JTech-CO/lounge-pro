'use strict';
(function () {
  /* iframe 내부에서 오버레이를 실행하면 컬럼 안에서 재귀 오버레이가 생성되므로 생략 */
  if (window !== window.top) return;

  const S = {
    visible:           false,
    columnCount:       4,
    columns:           ['0P7DE12WXXQQC', '0PBYCRKDD4899', '0P7DE12WDXQC7', '0PVMDMNFDPR0D'],
    customLounges:     [],
    discoveredLounges: [],
    sidebarOpen:       true,
    focusedCol:        0,
    sortMode:          'alpha',
  };

  let $root, $sidebar, $sbExpand, $cols;
  let $colCountGroup, $colSelectors;
  let $toggleBtn;
  const _ssDropdowns = new Set();

  function allLounges() {
    try {
      return getAllLounges([...S.customLounges, ...S.discoveredLounges]);
    } catch (e) {
      console.error('[lounge-pro] allLounges 실패 (lounge_db.js 로드 확인):', e);
      const merged = [...S.customLounges, ...S.discoveredLounges];
      const seen = new Set();
      return merged.filter(l => l && l.id && !seen.has(l.id) && (seen.add(l.id), true));
    }
  }

  function channelUrl(id) {
    try { return getChannelUrl(id); }
    catch (e) { return 'https://lounge.naver.com/channels/' + id; }
  }

  function saveConfig() {
    chrome.storage.local.set({
      lc_overlay_active: S.visible,
      lc_column_count:   S.columnCount,
      lc_columns:        S.columns,
      lc_sidebar_open:   S.sidebarOpen,
    });
  }

  function loadConfig(cb) {
    chrome.storage.local.get(
      ['lc_overlay_active', 'lc_column_count', 'lc_columns',
       'lc_custom_lounges', 'lc_sidebar_open', 'lc_discovered_lounges'],
      (data) => {
        if (data.lc_overlay_active     != null) S.visible           = data.lc_overlay_active;
        if (data.lc_column_count       != null) S.columnCount       = parseInt(data.lc_column_count, 10) || S.columnCount;
        if (Array.isArray(data.lc_columns))            S.columns           = data.lc_columns;
        if (Array.isArray(data.lc_custom_lounges))     S.customLounges     = data.lc_custom_lounges;
        if (data.lc_sidebar_open       != null) S.sidebarOpen       = data.lc_sidebar_open;
        if (Array.isArray(data.lc_discovered_lounges)) S.discoveredLounges = data.lc_discovered_lounges;
        cb();
      }
    );
  }

  function createDOM() {
    $root = document.createElement('div');
    $root.id = 'lc-root';
    $root.innerHTML = `
      <aside id="lc-sidebar">
        <div class="lc-sb-inner">
          <div class="lc-sb-header">
            <span class="lc-sb-title">Lounge Column</span>
            <button id="lc-close-btn" class="lc-btn-icon" title="사이드바 접기">&#9664;</button>
          </div>

          <div class="lc-section">
            <span class="lc-label">컬럼 수</span>
            <div class="lc-count-group" id="lc-col-count-group">
              <button class="lc-btn-count" data-count="1">1</button>
              <button class="lc-btn-count" data-count="2">2</button>
              <button class="lc-btn-count" data-count="3">3</button>
              <button class="lc-btn-count" data-count="4">4</button>
            </div>
          </div>

          <div class="lc-section" id="lc-col-selectors"></div>
        </div>
      </aside>

      <button id="lc-sb-expand" title="사이드바 열기">&#9654;</button>

      <main id="lc-cols"></main>
    `;
    document.body.appendChild($root);

    $toggleBtn = document.createElement('button');
    $toggleBtn.id = 'lc-toggle-btn';
    $toggleBtn.textContent = '컬럼 보기';
    document.body.appendChild($toggleBtn);

    $sidebar       = document.getElementById('lc-sidebar');
    $sbExpand      = document.getElementById('lc-sb-expand');
    $cols          = document.getElementById('lc-cols');
    $colCountGroup = document.getElementById('lc-col-count-group');
    $colSelectors  = document.getElementById('lc-col-selectors');
  }

  function renderAll() {
    renderColCountButtons();
    renderColSelectors();
    renderColumns();
    setSidebarOpen(S.sidebarOpen);
  }

  function renderColCountButtons() {
    $colCountGroup.querySelectorAll('.lc-btn-count').forEach(btn => {
      btn.classList.toggle('lc-active', parseInt(btn.dataset.count, 10) === S.columnCount);
    });
  }

  function getSortedLounges(lounges) {
    if (S.sortMode === 'alpha') {
      return [...lounges].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }
    return [...lounges].reverse();
  }

  function createSearchSelect(colIdx, lounges) {
    const wrap = document.createElement('div');
    wrap.className = 'lc-ss-wrap';

    const input = document.createElement('input');
    input.type         = 'text';
    input.className    = 'lc-ss-input';
    input.placeholder  = '검색...';
    input.autocomplete = 'off';
    input.spellcheck   = false;

    const cur = lounges.find(l => l.id === S.columns[colIdx]);
    input.value = cur ? cur.name : (S.columns[colIdx] || '');

    /* $root에 붙여 .lc-sb-inner의 overflow 클리핑을 우회 */
    const list = document.createElement('div');
    list.className     = 'lc-ss-list';
    list.style.display = 'none';
    $root.appendChild(list);
    _ssDropdowns.add(list);

    function reposition() {
      const r = input.getBoundingClientRect();
      list.style.top   = (r.bottom + 2) + 'px';
      list.style.left  = r.left + 'px';
      list.style.width = r.width + 'px';
    }

    function renderItems(query) {
      const term     = query.trim().toLowerCase();
      const sorted   = getSortedLounges(lounges);
      const filtered = term
        ? sorted.filter(l =>
            l.name.toLowerCase().includes(term) ||
            l.category.toLowerCase().includes(term))
        : sorted;

      list.innerHTML = '';
      const slice = filtered.slice(0, 80);
      if (!slice.length) { list.style.display = 'none'; return; }

      for (const l of slice) {
        const item = document.createElement('div');
        item.className = 'lc-ss-item' + (l.id === S.columns[colIdx] ? ' lc-ss-active' : '');

        const nameEl = document.createElement('span');
        nameEl.className   = 'lc-ss-name';
        nameEl.textContent = l.name;

        const catEl = document.createElement('span');
        catEl.className   = 'lc-ss-cat';
        catEl.textContent = l.category;

        item.appendChild(nameEl);
        item.appendChild(catEl);

        item.addEventListener('mousedown', (e) => {
          e.preventDefault(); // input의 blur를 막아 드롭다운이 닫히기 전에 선택 처리
          S.columns[colIdx] = l.id;
          input.value        = l.name;
          list.style.display = 'none';
          updateColFrame(colIdx);
          saveConfig();
        });

        list.appendChild(item);
      }

      reposition();
      list.style.display = '';
    }

    input.addEventListener('focus', () => {
      _ssDropdowns.forEach(d => { if (d !== list) d.style.display = 'none'; });
      renderItems(input.value);
    });
    input.addEventListener('input', () => renderItems(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { list.style.display = 'none'; input.blur(); }
    });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        list.style.display = 'none';
        if (!input.value.trim()) {
          const c = lounges.find(l => l.id === S.columns[colIdx]);
          if (c) input.value = c.name;
        }
      }, 150);
    });

    wrap.appendChild(input);
    return wrap;
  }

  function renderColSelectors() {
    _ssDropdowns.forEach(d => d.remove());
    _ssDropdowns.clear();
    $colSelectors.innerHTML = '';

    const headRow = document.createElement('div');
    headRow.className = 'lc-col-sel-head';

    const lbl = document.createElement('span');
    lbl.className   = 'lc-label';
    lbl.textContent = '컬럼별 라운지';

    const sortGroup = document.createElement('div');
    sortGroup.className = 'lc-sort-group';

    [['가나다순', 'alpha'], ['최근순', 'recent']].forEach(([label, mode]) => {
      const btn = document.createElement('button');
      btn.className   = 'lc-btn-sort' + (S.sortMode === mode ? ' lc-active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => { S.sortMode = mode; renderColSelectors(); });
      sortGroup.appendChild(btn);
    });

    headRow.appendChild(lbl);
    headRow.appendChild(sortGroup);
    $colSelectors.appendChild(headRow);

    const lounges = allLounges();
    for (let i = 0; i < S.columnCount; i++) {
      const item = document.createElement('div');
      item.className = 'lc-col-sel-item';

      const colLbl = document.createElement('span');
      colLbl.className   = 'lc-col-sel-label';
      colLbl.textContent = `컬럼 ${i + 1}`;

      item.appendChild(colLbl);
      item.appendChild(createSearchSelect(i, lounges));
      $colSelectors.appendChild(item);
    }

    const footer = document.createElement('div');
    footer.className = 'lc-ss-footer';

    const countEl = document.createElement('span');
    countEl.className   = 'lc-ss-count';
    countEl.textContent = `${lounges.length}개 라운지`;

    const crawlBtn = document.createElement('button');
    crawlBtn.className   = 'lc-btn-crawl';
    crawlBtn.textContent = '새로고침';
    crawlBtn.title       = '라운지 목록 새로고침';
    crawlBtn.addEventListener('click', () => {
      crawlBtn.textContent = '로딩 중...';
      crawlBtn.disabled    = true;
      chrome.runtime.sendMessage({ type: 'LC_CRAWL' }, () => {
        crawlBtn.textContent = '완료!';
        setTimeout(() => { crawlBtn.textContent = '새로고침'; crawlBtn.disabled = false; }, 2000);
      });
    });

    footer.appendChild(countEl);
    footer.appendChild(crawlBtn);
    $colSelectors.appendChild(footer);
  }

  function renderColumns() {
    $cols.innerHTML = '';
    for (let i = 0; i < S.columnCount; i++) {
      const col = document.createElement('div');
      col.className = 'lc-col' + (i === S.focusedCol ? ' lc-focused' : '');
      col.dataset.col = i;

      const bar = document.createElement('div');
      bar.className = 'lc-col-bar';

      const iframe = document.createElement('iframe');
      iframe.src = S.columns[i] ? channelUrl(S.columns[i]) : 'about:blank';
      iframe.setAttribute('allow', 'autoplay; clipboard-write; clipboard-read');
      iframe.setAttribute('allowfullscreen', '');

      col.appendChild(bar);
      col.appendChild(iframe);

      col.addEventListener('mousedown', () => {
        if (S.focusedCol !== i) {
          S.focusedCol = i;
          updateFocusHighlight();
        }
      });

      $cols.appendChild(col);
    }
  }

  function updateColFrame(i) {
    const col = $cols.querySelectorAll('.lc-col')[i];
    if (!col) return;
    const iframe = col.querySelector('iframe');
    if (iframe) iframe.src = S.columns[i] ? channelUrl(S.columns[i]) : 'about:blank';
  }

  function updateFocusHighlight() {
    $cols.querySelectorAll('.lc-col').forEach((col, i) => {
      col.classList.toggle('lc-focused', i === S.focusedCol);
    });
  }

  function setVisible(v) {
    S.visible = v;
    if (!v) _ssDropdowns.forEach(d => { d.style.display = 'none'; });
    $root.style.display = v ? 'flex' : 'none';
    $toggleBtn.textContent = v ? '일반 보기' : '컬럼 보기';
    $toggleBtn.classList.toggle('lc-active', v);
    /* 컬럼 뷰가 켜지면 테마 토글 UI(#__lb__)를 숨기도록 마커 클래스 부여 */
    document.documentElement.classList.toggle('lc-overlay-on', v);
    saveConfig();
  }

  function setSidebarOpen(open) {
    S.sidebarOpen = open;
    $sidebar.classList.toggle('lc-collapsed', !open);
    const closeBtn = document.getElementById('lc-close-btn');
    if (closeBtn) closeBtn.innerHTML = open ? '&#9664;' : '&#9654;';
    $sbExpand.classList.toggle('lc-show', !open);
  }

  function bindEvents() {
    const closeBtn = document.getElementById('lc-close-btn');

    closeBtn.addEventListener('click', () => {
      setSidebarOpen(!S.sidebarOpen);
      saveConfig();
    });

    $sbExpand.addEventListener('click', () => { setSidebarOpen(true); saveConfig(); });
    $toggleBtn.addEventListener('click', () => setVisible(!S.visible));

    $colCountGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.lc-btn-count');
      if (!btn) return;
      const n = parseInt(btn.dataset.count, 10);
      if (n === S.columnCount) return;
      S.columnCount = n;
      while (S.columns.length < n) {
        const allIds = allLounges().map(l => l.id);
        const next = allIds.find(id => !S.columns.includes(id)) || allIds[0] || '';
        S.columns.push(next);
      }
      if (S.focusedCol >= n) S.focusedCol = n - 1;
      saveConfig();
      renderColCountButtons();
      renderColSelectors();
      renderColumns();
    });
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.lc_discovered_lounges) {
      S.discoveredLounges = changes.lc_discovered_lounges.newValue || [];
      renderColSelectors();
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'LC_TOGGLE') setVisible(!S.visible);
  });

  loadConfig(() => {
    try {
      createDOM();
      renderAll();
      bindEvents();
      setVisible(S.visible);
    } catch (err) {
      console.error('[lounge-pro] 컬럼 init 실패:', err);
    }
  });
})();
