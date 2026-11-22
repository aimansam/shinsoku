// YouTube music: parse links, search, and the preset list.
// Search tries your own YouTube Data API key first (if you set one), then a few public Piped servers (no key, but they come and go).

const VIDEO_ID = /^[\w-]{11}$/;

export const PRESETS = [
  { label: 'Lofi Radio', id: 'rFZHOHl-L8A', channel: 'Lofi Girl', title: 'lofi hip hop radio - beats to relax/study to' },
  { label: 'Synthwave Radio', id: '4xDzrJKXOOY', channel: 'Lofi Girl', title: 'synthwave radio - beats to chill/game to' },
];
export const QUICK_SEARCHES = ['lofi hip hop', 'synthwave', 'study music', 'anime lofi', 'piano focus', 'rain sounds'];

// Same key = same track (used to avoid duplicates and to know when the player has to load something new).
export const keyOf = (it) => (it.list ? `L${it.list}` : it.id);

export const thumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

export const fmtDuration = (sec) => {
  if (!sec || sec < 0) return 'LIVE';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

// A pasted YouTube link -> { id, list } (either may be null), or null if it is not a YouTube link.
export function parseYouTube(input) {
  let text = (input || '').trim();
  if (!text || /\s/.test(text)) return null;
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');
  if (!['youtu.be', 'youtube.com', 'youtube-nocookie.com'].includes(host)) return null;
  let id = null;
  if (host === 'youtu.be') id = url.pathname.slice(1);
  else if (url.pathname === '/watch') id = url.searchParams.get('v');
  else id = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1];
  if (!VIDEO_ID.test(id || '')) id = null;
  const list = url.searchParams.get('list');
  const listOk = list && /^[\w-]+$/.test(list) ? list : null;
  return id || listOk ? { id, list: listOk } : null;
}

const PIPED = ['https://api.piped.private.coffee', 'https://pipedapi.ducks.party'];
let goodServer = 0;

async function getJson(url, ms = 7000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// kind 'video' -> [{ id, title, channel, duration }]   kind 'playlist' -> [{ list, title, channel, count, thumb }]
export async function searchYouTube(query, apiKey, kind = 'video') {
  const q = query.trim();
  const playlists = kind === 'playlist';
  if (apiKey) {
    try {
      const data = await getJson(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=${playlists ? 'playlist' : 'video&videoEmbeddable=true'}&maxResults=15&q=${encodeURIComponent(q)}&key=${encodeURIComponent(apiKey)}`,
      );
      return (data.items || []).map((i) =>
        playlists
          ? { list: i.id.playlistId, title: decode(i.snippet.title), channel: decode(i.snippet.channelTitle), count: null, thumb: i.snippet.thumbnails?.medium?.url }
          : { id: i.id.videoId, title: decode(i.snippet.title), channel: decode(i.snippet.channelTitle), duration: null },
      );
    } catch {
      /* bad key or quota used up: fall through to the public servers */
    }
  }
  for (let k = 0; k < PIPED.length; k++) {
    const server = PIPED[(goodServer + k) % PIPED.length];
    try {
      const data = await getJson(`${server}/search?q=${encodeURIComponent(q)}&filter=${playlists ? 'playlists' : 'videos'}`);
      const items = playlists
        ? (data.items || [])
            .filter((i) => /list=[\w-]+/.test(i.url || ''))
            .map((i) => ({ list: i.url.split('list=')[1], title: i.name, channel: i.uploaderName || '', count: i.videos, thumb: i.thumbnail }))
        : (data.items || [])
            .filter((i) => i.type === 'stream' && !i.isShort && /watch\?v=/.test(i.url || ''))
            .map((i) => ({ id: i.url.split('v=')[1].slice(0, 11), title: i.title, channel: i.uploaderName || '', duration: i.duration }));
      goodServer = (goodServer + k) % PIPED.length;
      return items;
    } catch {
      /* try the next server */
    }
  }
  throw new Error('Search is unavailable right now. Paste a YouTube link instead, or add a YouTube API key under More options.');
}

// The Data API returns HTML entities in titles.
const decode = (s) => {
  const t = document.createElement('textarea');
  t.innerHTML = s || '';
  return t.value;
};
