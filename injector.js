'use strict';
(function () {
  const personaMap = {};
  const personaCache = {};

  function notify() {
    window.postMessage({ type: 'QUIET_LOUNGE_API_DATA', personaMap, personaCache }, '*');
  }

  function extract(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { obj.forEach(extract); return; }
    if (typeof obj.postId === 'string' && typeof obj.personaId === 'string')
      personaMap[obj.postId] = obj.personaId;
    if (typeof obj.personaId === 'string' && typeof obj.nickname === 'string')
      personaCache[obj.personaId] = obj.nickname;
    Object.values(obj).forEach(extract);
  }

  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await _fetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (url.includes('api.lounge.naver.com')) {
      try { extract(await res.clone().json()); notify(); } catch { }
    }
    return res;
  };

  function parseHydration() {
    document.querySelectorAll('script').forEach(s => {
      const t = s.textContent;
      if (!t || t.length < 20) return;
      for (const m of t.matchAll(/\\?"postId\\?":\\?"([^\\"\\\\]+)\\?",\\?"personaId\\?":\\?"([^\\"\\\\]+)\\?"/g))
        personaMap[m[1]] = m[2];
      for (const m of t.matchAll(/\\?"personaId\\?":\\?"([^\\"\\\\]+)\\?",\\?"nickname\\?":\\?"([^\\"\\\\]+)\\?"/g))
        personaCache[m[1]] = m[2];
    });
    document.querySelectorAll('a[href^="/profiles/"]').forEach(a => {
      const pid = a.getAttribute('href')?.replace('/profiles/', '');
      const nick = a.textContent?.trim();
      if (pid && nick && pid.length >= 6) personaCache[pid] = nick;
    });
    notify();
  }

  window.addEventListener('message', e => {
    if (e.data?.type === 'QUIET_LOUNGE_REQUEST_DATA') notify();
    if (e.data?.type === 'LP_MONTHLY_STATS_REQUEST') {
      fetchMonthlyStats(e.data.personaId);
    }
  });

  /* ── Monthly Stats Counter ── */

  function decodeCursorDate(cursor) {
    try { return atob(cursor).split('|')[2] || null; } catch { return null; }
  }

  async function parseActivityResponse(res) {
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const d = json.data || json;
      return { items: d.items || [], endCursor: d.cursorInfo?.endCursor, hasNext: !!d.cursorInfo?.hasNext };
    } catch {
      const doc = new DOMParser().parseFromString(text, 'text/xml');
      return {
        items: Array.from(doc.querySelectorAll('items > items')),
        endCursor: doc.querySelector('endCursor')?.textContent || null,
        hasNext: doc.querySelector('hasNext')?.textContent === 'true',
      };
    }
  }

  async function countMonthlyActivity(personaId, type, currentMonth) {
    const base = `https://api.lounge.naver.com/user-api/v1/personas/${personaId}/activities/${type}`;
    let count = 0, cursor = null;

    while (true) {
      const url = base + '?limit=20' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : '');
      const { items, endCursor, hasNext } = await parseActivityResponse(await _fetch(url));
      if (!items.length) break;

      const dt = decodeCursorDate(endCursor);
      if (!dt) { count += items.length; break; }

      if (dt.substring(0, 7) >= currentMonth) {
        count += items.length;
        if (!hasNext) break;
        cursor = endCursor;
      } else {
        // Boundary page: re-fetch from same cursor with limit=1 for precision
        let fc = cursor;
        while (true) {
          const fu = base + '?limit=1' + (fc ? '&cursor=' + encodeURIComponent(fc) : '');
          const f = await parseActivityResponse(await _fetch(fu));
          if (!f.items.length) break;
          const fd = decodeCursorDate(f.endCursor);
          if (fd && fd.substring(0, 7) >= currentMonth) {
            count++;
            if (!f.hasNext) break;
            fc = f.endCursor;
          } else break;
        }
        break;
      }
    }
    return count;
  }

  async function fetchMonthlyStats(personaId) {
    const now = new Date();
    const cm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    try {
      const [posts, comments] = await Promise.all([
        countMonthlyActivity(personaId, 'posts', cm),
        countMonthlyActivity(personaId, 'comments', cm),
      ]);
      window.postMessage({
        type: 'LP_MONTHLY_STATS_RESULT', personaId, posts, comments,
        month: now.getMonth() + 1, year: now.getFullYear()
      }, '*');
    } catch (err) {
      window.postMessage({
        type: 'LP_MONTHLY_STATS_RESULT', personaId, error: true, message: err.message
      }, '*');
    }
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', parseHydration);
  else
    parseHydration();
})();