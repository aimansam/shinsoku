import { useEffect, useRef, useState } from 'react';
import MusicSearch from './MusicSearch';
import { keyOf, ytUrl } from './media';

// YouTube's own player API: lets us play, pause, skip and react when a song ends.
let apiPromise;
const loadApi = () =>
  (apiPromise ||= new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      dlog('iframe_api ready');
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => dlog('iframe_api script FAILED to load (blocked by an extension or the network?)');
    document.head.appendChild(s);
  }));

const GENERIC = /^YouTube (video|playlist)$/;

// Open the app with ?debug to trace the player: every event goes to the browser console and, as a tiny request,
// into the web server's access log (docker logs shinsoku), so a problem on another computer can be read from the server.
const DEBUG = new URLSearchParams(window.location.search).has('debug');
const t0 = Date.now();
const dlog = (...parts) => {
  if (!DEBUG) return;
  const line = parts.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
  console.info('[player]', line); // eslint-disable-line no-console
  fetch(`/__log?t=${((Date.now() - t0) / 1000).toFixed(1)}&e=${encodeURIComponent(line.slice(0, 500))}`, { keepalive: true }).catch(() => {});
};
// What the player is doing right now, for the log.
const where = (p) => {
  try {
    return { st: p.getPlayerState(), at: p.getPlaylistIndex(), n: p.getPlaylist()?.length || 0, vid: p.getVideoData?.().video_id || '' };
  } catch {
    return { st: 'not-ready' };
  }
};

// One persistent player, rendered once at the top of the app so the music keeps playing between screens.
// On the setup screen it sits on top of the placeholder in the Music panel (`anchor`); during a session it docks in the top-left corner.
export default function MediaDock({ yt, anchor }) {
  const { queue } = yt;
  const has = queue.length > 0;
  const cur = queue[yt.index] || queue[0];
  const key = cur ? keyOf(cur) : null;
  const listKey = cur?.list ? keyOf(cur) : ''; // a new playlist gets a brand-new player (see below)

  const box = useRef(null);
  const mount = useRef(null);
  const player = useRef(null);
  const ready = useRef(false);
  const loaded = useRef(null);
  const fails = useRef(0);
  const blocked = useRef(0); // how many leading videos of the current playlist were blocked from embedding
  const watch = useRef(null);
  const retry = useRef(null);
  const arrivedAuto = useRef(null); // key of the item the player moved to by itself (song ended / skipped), not picked by the user
  const latest = useRef({});
  latest.current = { yt, cur };
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [hidden, setHidden] = useState(() => window.innerWidth < 700);
  const [find, setFind] = useState(false);
  const [stuck, setStuck] = useState(null); // key of an item YouTube refuses to play inside this site
  // Server mode: songs YouTube will not embed are played through our own helper (api/server.py) in a plain <audio> element.
  const audio = useRef(null);
  const srv = useRef(null); // { key, tracks: [{ id, title }], i, fails } while the current queue item plays through the server
  const serverOk = useRef(null); // is the helper running? (checked once on load)
  const [srvView, setSrvView] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        serverOk.current = !!d?.ok;
        dlog('server helper', d || 'missing');
      })
      .catch(() => {
        serverOk.current = false;
      });
  }, []);

  const stopServer = () => {
    srv.current = null;
    setSrvView(null);
    const a = audio.current;
    if (a) {
      a.pause();
      a.removeAttribute('src');
      a.load();
    }
  };

  const playTrack = (i) => {
    const s = srv.current;
    const a = audio.current;
    if (!s || !a) return;
    s.i = i;
    const t = s.tracks[i];
    dlog('server: play track', i, t.id, t.title);
    a.src = `/api/audio?id=${t.id}`;
    if (latest.current.yt.armed) a.play().catch((e) => dlog('server: play() refused', String(e)));
    setSrvView({ key: s.key, id: t.id, i, n: s.tracks.length });
    setTitle(t.title);
    setMsg('Loading through your server…');
    const nx = s.tracks[i + 1];
    if (nx) fetch(`/api/warm?id=${nx.id}`).catch(() => {}); // look the next song up now so it starts without a wait
  };

  // Moves the queue itself (not inside a playlist). auto: the music is moving on by itself.
  const queueStep = (dir, auto) => {
    const { yt: y } = latest.current;
    const to = (y.index + dir + y.queue.length) % y.queue.length;
    arrivedAuto.current = auto ? keyOf(y.queue[to]) : null;
    y.setIndex(to);
    y.setArmed(true);
  };

  const srvNext = (auto) => {
    const s = srv.current;
    if (s.i + 1 < s.tracks.length) return playTrack(s.i + 1);
    if (latest.current.yt.queue.length === 1) return playTrack(0); // the only item: start it over
    return queueStep(1, auto);
  };

  const srvPrev = () => {
    const s = srv.current;
    const a = audio.current;
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return undefined;
    }
    if (s.i > 0) return playTrack(s.i - 1);
    if (latest.current.yt.queue.length === 1) return playTrack(s.tracks.length - 1);
    return queueStep(-1, false);
  };

  // YouTube refused this item: get its songs from the helper and play them here. Resolves false if the helper cannot.
  const startServer = async (c) => {
    if (serverOk.current === false) return false;
    clearTimeout(retry.current);
    clearTimeout(watch.current);
    try {
      player.current?.pauseVideo();
    } catch {
      /* not ready */
    }
    setStuck(null);
    setMsg('Blocked on YouTube, playing it through your server…');
    dlog('server: start', c.list || c.id);
    let tracks;
    try {
      if (c.list) {
        const r = await fetch(`/api/playlist?list=${encodeURIComponent(c.list)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        tracks = (await r.json()).items;
      } else tracks = [{ id: c.id, title: c.title }];
    } catch (e) {
      dlog('server: playlist failed', String(e));
      return false;
    }
    if (keyOf(latest.current.cur) !== keyOf(c)) return true; // the user picked something else meanwhile
    if (!tracks?.length) return false;
    srv.current = { key: keyOf(c), tracks, i: 0, fails: 0 };
    playTrack(0);
    return true;
  };

  // YouTube will not play this item inside another site (its owner blocks embedding, common for official label music).
  // If the player got here by itself (the previous song ended) keep the music going with the next item; if the user picked it,
  // stay on it and offer to play it on youtube.com instead.
  const giveUp = (c) => {
    if (srv.current) return undefined;
    if (serverOk.current) {
      startServer(c).then((ok) => ok || fallback(c));
      return undefined;
    }
    return fallback(c);
  };

  const fallback = (c) => {
    const { yt: y } = latest.current;
    const auto = arrivedAuto.current === keyOf(c) && y.queue.length > 1 && fails.current < y.queue.length;
    dlog('fallback (no server)', { title: c.title, auto, fails: fails.current });
    clearTimeout(retry.current);
    if (auto) {
      setMsg("Can't play that one here, skipping…");
      return next(true);
    }
    setMsg('Blocked outside YouTube');
    return setStuck(keyOf(c));
  };

  // Play the current item on youtube.com in a small pop-up window (one shared window, reused for every item).
  const openOut = () => {
    const c = latest.current.cur;
    if (!c) return;
    try {
      player.current?.pauseVideo();
    } catch {
      /* not ready */
    }
    const w = window.open(ytUrl(c), 'shinsoku-youtube', 'popup=yes,width=560,height=400');
    w?.focus(); // an already-open YouTube window would otherwise stay hidden behind this one
    dlog('open on YouTube', ytUrl(c), w ? 'window opened' : 'pop-up blocked');
    setMsg(w ? 'Playing in the YouTube window' : 'Allow pop-ups for this site, then try again');
  };

  // The first video of a playlist is blocked, so YouTube never even loaded it. Start from the next position, and if that is silent too
  // (blocked videos do not always raise an error) move on again. A playable video starts within about a second.
  const tryFrom = (c, k) => {
    const p = player.current;
    if (!p || srv.current || k > (serverOk.current ? 1 : 5)) return false; // with the helper running, hand over quickly
    dlog('tryFrom: loadPlaylist from index', k, c.list);
    blocked.current = k;
    p.loadPlaylist({ listType: 'playlist', list: c.list, index: k });
    if (k > 0) setMsg(`Skipping videos that can't be played here… (${k})`);
    clearTimeout(retry.current);
    retry.current = setTimeout(() => {
      const q = player.current;
      if (!q || srv.current || keyOf(latest.current.cur) !== keyOf(c)) return;
      let st;
      try {
        st = q.getPlayerState();
      } catch {
        return;
      }
      dlog('tryFrom check after 1.5s', { k, ...where(q) });
      if (st === 1 || st === 2 || st === 3) return; // playing, paused or buffering: it worked
      if (!tryFrom(c, k + 1)) giveUp(c);
    }, 1500);
    return true;
  };

  // Some playlists are accepted by YouTube but never start (no error is raised, the old song just keeps going).
  // If nothing new is playing a few seconds after loading a playlist, treat it like an error and move on.
  const watchPlaylist = (c, before) => {
    clearTimeout(watch.current);
    watch.current = setTimeout(() => {
      const p = player.current;
      if (!p || srv.current || keyOf(latest.current.cur) !== keyOf(c) || (blocked.current > 0 && blocked.current <= 5)) return; // tryFrom is already handling it
      let now;
      try {
        now = p.getVideoData?.().video_id;
      } catch {
        return;
      }
      dlog('watchdog after 8s', { now, before, ...where(p) });
      if (!now || now === before) {
        fails.current += 1;
        giveUp(c);
      }
    }, 8000);
  };

  // Loads (or just cues, if the user has not pressed play yet) whatever the queue currently points at.
  const syncTrack = () => {
    const p = player.current;
    const { yt: y, cur: c } = latest.current;
    if (!p || !ready.current || !c || c.list || loaded.current === keyOf(c)) return; // playlists: the player is re-created instead
    loaded.current = keyOf(c);
    setMsg('');
    dlog(y.armed ? 'loadVideoById' : 'cueVideoById', c.id);
    p[y.armed ? 'loadVideoById' : 'cueVideoById'](c.id);
  };

  // auto: the player is moving on by itself (song ended, or skipping something unplayable), not because the user pressed ⏭.
  const next = (auto = false) => {
    const p = player.current;
    const { yt: y, cur: c } = latest.current;
    dlog('next', { auto }, srv.current ? 'server' : p ? where(p) : 'no player');
    if (srv.current) return srvNext(auto);
    if (p && c.list) {
      try {
        if (p.getPlaylistIndex() < (p.getPlaylist()?.length || 0) - 1) return p.nextVideo();
      } catch {
        /* not ready: fall through to the queue */
      }
    }
    if (y.queue.length === 1) {
      if (c.list) {
        // End of the only playlist: start it over, not just its last song. Going through tryFrom lets the blocked-start retry
        // handle a playlist whose first video cannot be embedded.
        return tryFrom(c, 0);
      }
      p?.seekTo(0, true);
      return p?.playVideo();
    }
    const to = (y.index + 1) % y.queue.length;
    arrivedAuto.current = auto ? keyOf(y.queue[to]) : null;
    y.setIndex(to);
    return y.setArmed(true);
  };

  const prev = () => {
    const p = player.current;
    const { yt: y, cur: c } = latest.current;
    dlog('prev', srv.current ? 'server' : p ? where(p) : 'no player');
    if (srv.current) return srvPrev();
    try {
      const live = p.getVideoData?.().isLive; // live streams have nothing to restart
      if (!live && p.getDuration() > 0 && p.getCurrentTime() > 3) return p.seekTo(0, true);
      if (c.list && p.getPlaylistIndex() > 0) return p.previousVideo();
      if (c.list && y.queue.length === 1) return p.playVideoAt((p.getPlaylist()?.length || 1) - 1); // wrap to the end of the only playlist
    } catch {
      /* not ready */
    }
    arrivedAuto.current = null;
    y.setIndex((y.index - 1 + y.queue.length) % y.queue.length);
    return y.setArmed(true);
  };

  const toggle = () => {
    if (srv.current) {
      const a = audio.current;
      yt.setArmed(true);
      if (a.paused) a.play().catch(() => {});
      else a.pause();
      return undefined;
    }
    if (stuck && stuck === key) return openOut(); // nothing to play here: ▶ means "play it on YouTube"
    const p = player.current;
    if (!p || !ready.current) return;
    yt.setArmed(true);
    if (p.getPlayerState() === 1) p.pauseVideo();
    else p.playVideo();
  };

  // Create the player once there is something to play, destroy it when the queue is emptied.
  useEffect(() => {
    if (!has) return undefined;
    let dead = false;
    let p;
    blocked.current = 0;
    loadApi().then((YT) => {
      if (dead || !mount.current) return;
      const el = document.createElement('div');
      mount.current.appendChild(el);
      const { yt: y, cur: c } = latest.current;
      dlog('create player', { list: c.list || null, id: c.id || null, title: c.title, armed: y.armed, origin: window.location.origin });
      p = new YT.Player(el, {
        ...(c.list ? {} : { videoId: c.id }), // YouTube throws if videoId is present but empty
        width: '100%',
        height: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: y.armed ? 1 : 0, playsinline: 1, rel: 0, origin: window.location.origin, ...(c.list ? { listType: 'playlist', list: c.list } : {}) },
        events: {
          onReady: () => {
            dlog('onReady', where(p));
            ready.current = true;
            loaded.current = keyOf(c);
            syncTrack();
            if (latest.current.yt.armed) {
              p.playVideo();
              if (c.list) watchPlaylist(c, undefined);
            }
          },
          onStateChange: (e) => {
            dlog('state', e.data, where(p));
            if (srv.current) {
              if (e.data === 1) p.pauseVideo(); // a late start of the blocked item: the server is already playing it
              return;
            }
            setPlaying(e.data === 1 || e.data === 3);
            if (e.data === 1) {
              fails.current = 0;
              setStuck(null);
              const t = p.getVideoData?.().title || '';
              setTitle(t);
              setTimeout(() => player.current === p && setTitle(p.getVideoData?.().title || t), 1500); // YouTube's first answer can be stale after a switch
              setMsg('');
              const { yt: y2, cur: c2 } = latest.current;
              if (t && GENERIC.test(c2.title || '')) y2.rename(y2.index, t);
            }
            if (e.data === 0) next(true);
          },
          onError: (e) => {
            fails.current += 1;
            const { yt: y2, cur: c2 } = latest.current;
            dlog('onError', e.data, { fails: fails.current, blocked: blocked.current, ...where(p) });
            if (srv.current) return undefined;
            if (c2.list && fails.current <= 8) {
              // One video inside a playlist is blocked from embedding: try the next video of the SAME playlist,
              // do not jump to a different playlist (that made a click land on the wrong one).
              setMsg("That video can't be played here, trying the next one…");
              try {
                const at = p.getPlaylistIndex();
                const n = p.getPlaylist()?.length || 0;
                if (at >= 0 && n > 0) {
                  if (at + 1 < n) return p.nextVideo();
                } else if (tryFrom(c2, blocked.current + 1)) return; // the playlist itself never loaded
              } catch {
                /* not ready: give up on this playlist below */
              }
            }
            return giveUp(c2);
          },
        },
      });
      player.current = p;
    });
    return () => {
      dead = true;
      clearTimeout(watch.current);
      clearTimeout(retry.current);
      ready.current = false;
      loaded.current = null;
      try {
        p?.destroy();
      } catch {
        /* already gone */
      }
      player.current = null;
      if (srv.current && !latest.current.yt.queue.length) stopServer();
      mount.current?.replaceChildren();
      setPlaying(false);
      setTitle('');
    };
  }, [has, listKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(syncTrack, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setStuck(null);
    if (srv.current && srv.current.key !== key) stopServer();
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopServer(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // "Press start" or the first click on a song arms the player: start playing if it was only cued.
  useEffect(() => {
    const p = player.current;
    if (srv.current) {
      if (yt.armed && audio.current?.paused) audio.current.play().catch(() => {});
      return;
    }
    if (yt.armed && p && ready.current && p.getPlayerState() !== 1 && p.getPlayerState() !== 3) p.playVideo();
  }, [yt.armed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the placeholder on the setup screen (it moves when the page scrolls or resizes) and tell it how tall the player is.
  useEffect(() => {
    if (!anchor || !has) return undefined;
    let frame;
    const follow = () => {
      const el = box.current;
      if (el) {
        const r = anchor.getBoundingClientRect();
        el.style.left = `${r.left}px`;
        el.style.top = `${r.top}px`;
        el.style.width = `${r.width}px`;
        if (anchor.style.height !== `${el.offsetHeight}px`) anchor.style.height = `${el.offsetHeight}px`;
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => {
      cancelAnimationFrame(frame);
      const el = box.current; // hand positioning back to the stylesheet (corner dock)
      if (el) {
        el.style.left = '';
        el.style.top = '';
        el.style.width = '';
      }
    };
  }, [anchor, has]);

  if (!has) return null;
  const docked = !anchor;
  return (
    <>
      {docked && (
        <button className="media-chip" onClick={() => setHidden((h) => !h)} title="Show or hide the music player">
          ♫ {hidden ? 'Show' : 'Hide'} player
        </button>
      )}
      <div ref={box} className={`media-dock ${docked ? 'corner' : 'inline'} ${docked && hidden ? 'away' : ''}`}>
        <div className="media-frame">
          <div ref={mount} className="media-mount" />
          {srvView && srvView.key === key && (
            <div className="media-art" style={{ backgroundImage: `url(https://i.ytimg.com/vi/${srvView.id}/hqdefault.jpg)` }}>
              <small>
                {srvView.n > 1 ? `${srvView.i + 1} / ${srvView.n} · ` : ''}via your server (blocked on YouTube)
              </small>
            </div>
          )}
          {stuck && stuck === key && (
            <div className="media-out">
              <span>YouTube won't play this one inside other sites.</span>
              <button onClick={openOut}>▶ Play it on YouTube</button>
              <small>Opens a small YouTube window. The music keeps playing there while you focus.</small>
            </div>
          )}
        </div>
        <audio
          ref={audio}
          preload="auto"
          onPlaying={() => {
            setPlaying(true);
            setMsg('');
            if (srv.current) srv.current.fails = 0;
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => srv.current && srvNext(true)}
          onError={() => {
            const s = srv.current;
            if (!s || !audio.current?.getAttribute('src')) return;
            s.fails += 1;
            dlog('server: audio error', s.tracks[s.i]?.id, audio.current.error?.code, { fails: s.fails });
            if (s.fails < 3 && s.tracks.length > 1) return srvNext(true);
            const c = latest.current.cur;
            stopServer();
            return fallback(c);
          }}
        />
        <div className="media-bar">
          <span className="media-title" title={title || cur.title}>{msg || title || cur.title}</span>
          <button onClick={prev} aria-label="Previous song" title="Previous">⏮</button>
          <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'}>{playing ? '⏸' : '▶'}</button>
          <button onClick={() => next()} aria-label="Next song" title="Next">⏭</button>
          <button onClick={openOut} aria-label="Open on YouTube" title="Open on YouTube">↗</button>
          {docked && <button onClick={() => setFind((f) => !f)} aria-label="Search songs" title="Search songs">🔍</button>}
        </div>
        {docked && <div className="media-find" hidden={!find}><MusicSearch yt={yt} compact /></div>}
      </div>
    </>
  );
}
