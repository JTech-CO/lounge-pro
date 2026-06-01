'use strict';

const LOUNGE_URL = 'https://lounge.naver.com/';

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.startsWith('https://lounge.naver.com/')) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'LC_TOGGLE' });
    } catch {
      chrome.tabs.reload(tab.id);
    }
  } else {
    const existing = await chrome.tabs.query({ url: 'https://lounge.naver.com/*' });
    if (existing.length > 0) {
      await chrome.tabs.update(existing[0].id, { active: true });
      await chrome.windows.update(existing[0].windowId, { focused: true });
      try {
        await chrome.tabs.sendMessage(existing[0].id, { type: 'LC_TOGGLE' });
      } catch { }
    } else {
      chrome.tabs.create({ url: LOUNGE_URL });
    }
  }
});

function extractFromText(text) {
  const seen = new Set();
  const results = [];
  for (const m of text.matchAll(/"channelId"\s*:\s*"([A-Z0-9]{8,})"[^}]{0,400}?"channelName"\s*:\s*"([^"]{1,80})"/g)) {
    if (!seen.has(m[1])) { seen.add(m[1]); results.push({ id: m[1], name: m[2], category: '기타' }); }
  }
  for (const m of text.matchAll(/"channelName"\s*:\s*"([^"]{1,80})"[^}]{0,400}?"channelId"\s*:\s*"([A-Z0-9]{8,})"/g)) {
    if (!seen.has(m[2])) { seen.add(m[2]); results.push({ id: m[2], name: m[1], category: '기타' }); }
  }
  /* href="/channels/ID" 패턴으로 링크 텍스트에서 채널명 추출 */
  for (const m of text.matchAll(/href="\/channels\/([A-Z0-9]{8,})"[^>]*>([^<]{1,80})<\/a>/gi)) {
    const id = m[1].toUpperCase(), name = m[2].trim();
    if (name && !seen.has(id)) { seen.add(id); results.push({ id, name, category: '기타' }); }
  }
  return results;
}

function extractFromJson(obj, depth, seen) {
  depth = depth || 0;
  seen  = seen  || new Set();
  if (depth > 12 || !obj || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) return obj.flatMap(v => extractFromJson(v, depth + 1, seen));

  const result = [];
  if (typeof obj.channelId === 'string' && obj.channelId.length >= 8 && !seen.has(obj.channelId)) {
    const name = typeof obj.channelName === 'string' ? obj.channelName.trim() : null;
    if (name && name.length > 0) {
      seen.add(obj.channelId);
      let cat = '기타';
      if (obj.categoryName)   cat = obj.categoryName;
      else if (obj.topicName) cat = obj.topicName;
      else if (obj.category) {
        cat = typeof obj.category === 'string'
          ? obj.category
          : (obj.category.categoryName || obj.category.name || cat);
      }
      result.push({ id: obj.channelId, name, category: cat });
    }
  }
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') result.push(...extractFromJson(val, depth + 1, seen));
  }
  return result;
}

function hasNextPage(json, pageSize) {
  if (!json || typeof json !== 'object') return false;
  if (json.hasMore === true)  return true;
  if (json.hasMore === false) return false;
  if (json.last === false) return true;
  if (json.last === true)  return false;
  if (typeof json.totalPages === 'number' && typeof json.number === 'number') {
    return json.number + 1 < json.totalPages;
  }
  const ids = (JSON.stringify(json).match(/"channelId"/g) || []).length;
  return ids >= pageSize;
}

async function crawlChannels() {
  const found = [];
  const seen  = new Set();

  function add(channels) {
    for (const ch of channels) {
      if (ch.id && ch.name && !seen.has(ch.id)) { seen.add(ch.id); found.push(ch); }
    }
  }

  /* HTML 페이지 파싱 */
  const pages = [
    'https://lounge.naver.com/',
    'https://lounge.naver.com/explore',
    'https://lounge.naver.com/hot',
    'https://lounge.naver.com/new',
    'https://lounge.naver.com/discovery',
  ];
  for (const url of pages) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) continue;
      add(extractFromText(await res.text()));
    } catch { }
  }

  /* 채널 목록 API — sort별 자동 페이지네이션 */
  const PAGE_SIZE = 100;
  for (const sort of ['POPULARITY', 'LATEST', 'NAME']) {
    for (let page = 1; page <= 20; page++) {
      try {
        const url = `https://api.lounge.naver.com/v1/channels?size=${PAGE_SIZE}&sort=${sort}&page=${page}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) break;
        const json = await res.json();
        const before = found.length;
        add(extractFromJson(json));
        if (!hasNextPage(json, PAGE_SIZE) || found.length === before) break;
      } catch { break; }
    }
  }

  /* 기타 엔드포인트 */
  const extra = [
    'https://api.lounge.naver.com/v1/recommend/channels?size=100',
    'https://api.lounge.naver.com/v1/explore/channels?size=100',
    'https://api.lounge.naver.com/v1/home/channels?size=100',
    'https://api.lounge.naver.com/v1/topics?size=100',
    'https://api.lounge.naver.com/v2/channels?size=100&sort=POPULARITY',
    'https://api.lounge.naver.com/v1/channels/hot?size=100',
    'https://api.lounge.naver.com/v1/channels/recommend?size=100',
  ];
  for (const url of extra) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) add(extractFromJson(await res.json()));
    } catch { }
  }

  if (!found.length) return;

  return new Promise(resolve => {
    chrome.storage.local.get(['lc_discovered_lounges'], (data) => {
      const existing    = data.lc_discovered_lounges || [];
      const existingIds = new Set(existing.map(l => l.id));
      const added       = found.filter(c => !existingIds.has(c.id));
      if (added.length) {
        chrome.storage.local.set({ lc_discovered_lounges: [...existing, ...added] }, resolve);
      } else {
        resolve();
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(() => crawlChannels());
chrome.runtime.onStartup.addListener(() => crawlChannels());

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'LC_CRAWL') {
    crawlChannels().then(() => sendResponse({ done: true }));
    return true;
  }
});
