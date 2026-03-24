'use strict';
(function () {
  const personaMap   = {};
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
      try { extract(await res.clone().json()); notify(); } catch {}
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
  });

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', parseHydration);
  else
    parseHydration();
})();