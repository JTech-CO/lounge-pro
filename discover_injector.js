'use strict';
(function () {
  const seen = new Set();
  const ID_RE = /^[A-Z0-9]{8,}$/i;

  /* ── 채널 추출 (JSON 객체 순회) ── */
  function extractChannels(obj, depth) {
    if (depth > 12 || !obj || typeof obj !== 'object') return [];
    if (Array.isArray(obj)) return obj.flatMap(v => extractChannels(v, depth + 1));

    const result = [];

    /* 1순위: channelId/finalChannelId + channelName/name (content-api 대응) */
    const cid = obj.channelId || obj.channelCode || obj.finalChannelId || obj.originalChannelId;
    if (typeof cid === 'string' && ID_RE.test(cid) && !seen.has(cid)) {
      const name = (typeof obj.channelName === 'string' ? obj.channelName :
                    typeof obj.channelTitle === 'string' ? obj.channelTitle :
                    typeof obj.name === 'string' ? obj.name : null);
      if (name && name.trim().length > 0) {
        seen.add(cid);
        let cat = '기타';
        const c = obj.category || obj.categoryInfo || null;
        if (c) cat = typeof c === 'string' ? c : c.categoryName || c.name || c.displayName || cat;
        if (obj.categoryName) cat = obj.categoryName;
        if (obj.topicName)    cat = obj.topicName;
        result.push({ id: cid, name: name.trim(), category: cat });
      }
    }

    /* 2순위: id + (name | title) — 다른 스키마 대응 */
    if (!result.length) {
      const fid = obj.id;
      if (typeof fid === 'string' && ID_RE.test(fid) && fid.length >= 10 && !seen.has(fid)) {
        const name = typeof obj.channelName === 'string' ? obj.channelName :
                     typeof obj.name        === 'string' ? obj.name :
                     typeof obj.title       === 'string' ? obj.title : null;
        if (name && name.trim().length > 0 && name.trim().length < 80) {
          seen.add(fid);
          let cat = obj.categoryName || obj.topicName || obj.category || '기타';
          if (typeof cat !== 'string') cat = cat?.categoryName || cat?.name || '기타';
          result.push({ id: fid, name: name.trim(), category: cat });
        }
      }
    }

    for (const val of Object.values(obj)) {
      if (val && typeof val === 'object') result.push(...extractChannels(val, depth + 1));
    }
    return result;
  }

  function dispatch(channels) {
    if (channels.length > 0) window.postMessage({ type: 'LC_DISCOVERED_CHANNELS', channels }, '*');
  }

  /* ── DOM 링크 기반 추출 — href="/channels/ID" ── */
  function extractFromLinks() {
    const channels = [];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const m = href.match(/\/channels\/([A-Z0-9]{8,})/i);
      if (!m) return;
      const id = m[1].toUpperCase();
      if (seen.has(id)) return;
      /* 링크 텍스트에서 채널명 추출 (첫 줄, 최대 60자) */
      const name = (a.textContent || a.title || a.getAttribute('aria-label') || '')
        .trim().split('\n')[0].trim().slice(0, 60);
      if (!name) return;
      seen.add(id);
      channels.push({ id, name, category: '기타' });
    });
    if (channels.length) dispatch(channels);
  }

  /* ── fetch 가로채기 — lounge.naver.com 전 도메인 ── */
  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await _fetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (url.includes('lounge.naver.com') || url.includes('apis.naver.com/lounge')) {
      try { dispatch(extractChannels(await res.clone().json(), 0)); } catch { }
    }
    return res;
  };

  /* ── 스크립트 태그 파싱 ── */
  function parseHydration() {
    const scripts = document.querySelectorAll('script');
    for (const s of scripts) {
      const t = s.textContent;
      if (!t || t.length < 30) continue;

      /* JSON 블록 파싱 시도 */
      if (t.includes('channelId') || t.includes('"id"')) {
        try {
          const start = t.search(/[{[]/);
          if (start !== -1) dispatch(extractChannels(JSON.parse(t.slice(start)), 0));
        } catch { }
      }

      /* 정규식 추출 */
      const channels = [];
      for (const m of t.matchAll(/"channelId"\s*:\s*"([A-Z0-9]{8,})"[^}]{0,300}?"channelName"\s*:\s*"([^"]{1,60})"/g))
        if (!seen.has(m[1])) { seen.add(m[1]); channels.push({ id: m[1], name: m[2], category: '기타' }); }
      for (const m of t.matchAll(/"channelName"\s*:\s*"([^"]{1,60})"[^}]{0,300}?"channelId"\s*:\s*"([A-Z0-9]{8,})"/g))
        if (!seen.has(m[2])) { seen.add(m[2]); channels.push({ id: m[2], name: m[1], category: '기타' }); }
      dispatch(channels);
    }
    extractFromLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', parseHydration);
  } else {
    parseHydration();
  }

  /* DOM 변화 감지로 SPA 동적 렌더링 후 링크 포착 (디바운스 500ms) */
  let _linkTimer = null;
  new MutationObserver(() => {
    clearTimeout(_linkTimer);
    _linkTimer = setTimeout(extractFromLinks, 500);
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* ── 능동적 채널 수집 — 최상위 프레임에서만 실행 ── */
  if (window === window.top) {

    function hasNextPage(json, pageSize) {
      if (!json || typeof json !== 'object') return false;
      if (json.hasMore === true)  return true;
      if (json.hasMore === false) return false;
      if (json.last === false) return true;
      if (json.last === true)  return false;
      if (typeof json.totalPages === 'number' && typeof json.number === 'number')
        return json.number + 1 < json.totalPages;
      const ids = (JSON.stringify(json).match(/"channelId"/g) || []).length;
      return ids >= pageSize;
    }

    async function crawlSort(sort) {
      const PAGE_SIZE = 100;
      for (let page = 1; page <= 30; page++) {
        try {
          const url = `https://api.lounge.naver.com/v1/channels?sort=${sort}&size=${PAGE_SIZE}&page=${page}`;
          const res = await _fetch(url, { credentials: 'include' });
          if (!res.ok) break;
          const json = await res.json();
          const found = extractChannels(json, 0);
          dispatch(found);
          if (!hasNextPage(json, PAGE_SIZE) || found.length === 0) break;
          await new Promise(r => setTimeout(r, 300));
        } catch { break; }
      }
    }

    /* 카테고리/토픽 목록 응답에서 ID를 뽑아 채널 목록 재조회 */
    async function crawlByIds(json, paramName) {
      const str = JSON.stringify(json);
      const ids = [...new Set(
        [...str.matchAll(/"(?:categoryId|topicId|id)"\s*:\s*"([A-Za-z0-9_\-]{2,20})"/g)]
          .map(m => m[1])
      )].slice(0, 40);
      for (const id of ids) {
        try {
          const url = `https://api.lounge.naver.com/v1/channels?${paramName}=${encodeURIComponent(id)}&size=100&sort=POPULARITY`;
          const res = await _fetch(url, { credentials: 'include' });
          if (res.ok) dispatch(extractChannels(await res.json(), 0));
          await new Promise(r => setTimeout(r, 150));
        } catch { }
      }
    }

    async function crawlExtra() {
      const SZ = 100;
      const endpoints = [
        /* 탐색/발견 */
        `https://api.lounge.naver.com/v1/discovery/channels?size=${SZ}`,
        `https://api.lounge.naver.com/v1/discovery?size=${SZ}`,
        `https://api.lounge.naver.com/v2/discovery/channels?size=${SZ}`,
        /* 탐색 */
        `https://api.lounge.naver.com/v1/explore/channels?size=${SZ}`,
        `https://api.lounge.naver.com/v1/explore/channels?size=${SZ}&sort=POPULARITY`,
        `https://api.lounge.naver.com/v1/explore/channels?size=${SZ}&sort=LATEST`,
        /* 추천/홈 */
        `https://api.lounge.naver.com/v1/recommend/channels?size=${SZ}`,
        `https://api.lounge.naver.com/v1/home/channels?size=${SZ}`,
        `https://api.lounge.naver.com/v1/channels/hot?size=${SZ}`,
        `https://api.lounge.naver.com/v1/channels/new?size=${SZ}`,
        `https://api.lounge.naver.com/v1/channels/recommend?size=${SZ}`,
        /* v2 */
        `https://api.lounge.naver.com/v2/channels?size=${SZ}&sort=POPULARITY`,
        `https://api.lounge.naver.com/v2/channels?size=${SZ}&sort=LATEST`,
        `https://api.lounge.naver.com/v2/channels?size=${SZ}&sort=NAME`,
        /* 카테고리/토픽 메타 */
        `https://api.lounge.naver.com/v1/categories?size=100`,
        `https://api.lounge.naver.com/v1/topics?size=100`,
      ];

      for (const url of endpoints) {
        try {
          const res = await _fetch(url, { credentials: 'include' });
          if (!res.ok) { await new Promise(r => setTimeout(r, 200)); continue; }
          const json = await res.json();
          dispatch(extractChannels(json, 0));
          /* 카테고리/토픽 결과면 각 ID별로 채널 재조회 */
          if (url.includes('categor') || url.includes('topic')) {
            await crawlByIds(json, url.includes('topic') ? 'topicId' : 'categoryId');
          }
          await new Promise(r => setTimeout(r, 200));
        } catch { }
      }
    }

    async function proactiveCrawl() {
      await crawlSort('POPULARITY');
      await crawlSort('LATEST');
      await crawlSort('NAME');
      await crawlExtra();
    }

    const start = () => setTimeout(proactiveCrawl, 2000);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }
})();
