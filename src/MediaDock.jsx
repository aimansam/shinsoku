import { useEffect, useRef, useState } from 'react';
import MusicSearch from './MusicSearch';
import { keyOf } from './media';

// YouTube's own player API: lets us play, pause, skip and react when a song ends.
let apiPromise;
const loadApi = () =>
  (apiPromise ||= new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }));

const GENERIC = /^YouTube (video|playlist)$/;

// One persistent player, rendered once at the top of the app so the music keeps playing between screens.
// On the setup screen it sits on top of the placeholder in the Music panel (`anchor`); during a session it docks in the top-left corner.
export default function MediaDock({ yt, anchor }) {
  const { queue } = yt;
  const has = queue.length > 0;
  const cur = queue[yt.index] || queue[0];
  const key = cur ? keyOf(cur) : null;

  const box = useRef(null);
  const mount = useRef(null);
  const player = useRef(null);
  const ready = useRef(false);
  const loaded = useRef(null);
  const fails = useRef(0);
  const watch = useRef(null);
  const latest = useRef({});
  latest.current = { yt, cur };
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [hidden, setHidden] = useState(() => window.innerWidth < 700);
  const [find, setFind] = useState(false);

  // Some playlists are accepted by YouTube but never start (no error is raised, the old song just keeps going).
  // If nothing new is playing a few seconds after loading a playlist, treat it like an error and move on.
  const watchPlaylist = (c, before) => {
    clearTimeout(watch.current);
    watch.current = setTimeout(() => {
      const p = player.current;
      if (!p || keyOf(latest.current.cur) !== keyOf(c)) return;
      let now;
      try {
        now = p.getVideoData?.().video_id;
      } catch {
        return;
      }
      if (!now || now === before) {
        fails.current += 1;
        setMsg("That playlist can't be played here, skipping…");
        if (fails.current < latest.current.yt.queue.length) next();
      }
    }, 8000);
  };

  // Loads (or just cues, if the user has not pressed play yet) whatever the queue currently points at.
  const syncTrack = () => {
    const p = player.current;
    const { yt: y, cur: c } = latest.current;
    if (!p || !ready.current || !c || loaded.current === keyOf(c)) return;
    loaded.current = keyOf(c);
    setMsg('');
    let before;
    try {
      before = p.getVideoData?.().video_id;
    } catch {
      /* nothing loaded yet */
    }
    if (c.list) (y.armed ? p.loadPlaylist : p.cuePlaylist).call(p, { listType: 'playlist', list: c.list });
    else (y.armed ? p.loadVideoById : p.cueVideoById).call(p, c.id);
    if (c.list && y.armed) watchPlaylist(c, before);
  };

  const next = () => {
    const p = player.current;
    const { yt: y, cur: c } = latest.current;
    if (p && c.list) {
      try {
        if (p.getPlaylistIndex() < (p.getPlaylist()?.length || 0) - 1) return p.nextVideo();
      } catch {
        /* not ready: fall through to the queue */
      }
    }
    if (y.queue.length === 1) {
      p?.seekTo(0, true);
      return p?.playVideo();
    }
    y.setIndex((y.index + 1) % y.queue.length);
    return y.setArmed(true);
  };

  const prev = () => {
    const p = player.current;
    const { yt: y, cur: c } = latest.current;
    try {
      const live = p.getVideoData?.().isLive; // live streams have nothing to restart
      if (!live && p.getDuration() > 0 && p.getCurrentTime() > 3) return p.seekTo(0, true);
      if (c.list && p.getPlaylistIndex() > 0) return p.previousVideo();
    } catch {
      /* not ready */
    }
    y.setIndex((y.index - 1 + y.queue.length) % y.queue.length);
    return y.setArmed(true);
  };

  const toggle = () => {
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
    loadApi().then((YT) => {
      if (dead || !mount.current) return;
      const el = document.createElement('div');
      mount.current.appendChild(el);
      const { yt: y, cur: c } = latest.current;
      p = new YT.Player(el, {
        ...(c.list ? {} : { videoId: c.id }), // YouTube throws if videoId is present but empty
        width: '100%',
        height: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: y.armed ? 1 : 0, playsinline: 1, rel: 0, origin: window.location.origin, ...(c.list ? { listType: 'playlist', list: c.list } : {}) },
        events: {
          onReady: () => {
            ready.current = true;
            loaded.current = keyOf(c);
            syncTrack();
            if (latest.current.yt.armed) {
              p.playVideo();
              if (c.list) watchPlaylist(c, undefined);
            }
          },
          onStateChange: (e) => {
            setPlaying(e.data === 1 || e.data === 3);
            if (e.data === 1) {
              fails.current = 0;
              const t = p.getVideoData?.().title || '';
              setTitle(t);
              setTimeout(() => player.current === p && setTitle(p.getVideoData?.().title || t), 1500); // YouTube's first answer can be stale after a switch
              setMsg('');
              const { yt: y2, cur: c2 } = latest.current;
              if (t && GENERIC.test(c2.title || '')) y2.rename(y2.index, t);
            }
            if (e.data === 0) next();
          },
          onError: (e) => {
            fails.current += 1;
            setMsg("Can't play that one here, skipping…");
            if (fails.current < latest.current.yt.queue.length) next();
          },
        },
      });
      player.current = p;
    });
    return () => {
      dead = true;
      clearTimeout(watch.current);
      ready.current = false;
      loaded.current = null;
      try {
        p?.destroy();
      } catch {
        /* already gone */
      }
      player.current = null;
      mount.current?.replaceChildren();
      setPlaying(false);
      setTitle('');
    };
  }, [has]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(syncTrack, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Press start" or the first click on a song arms the player: start playing if it was only cued.
  useEffect(() => {
    const p = player.current;
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
        <div className="media-frame"><div ref={mount} className="media-mount" /></div>
        <div className="media-bar">
          <span className="media-title" title={title || cur.title}>{msg || title || cur.title}</span>
          <button onClick={prev} aria-label="Previous song" title="Previous">⏮</button>
          <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause' : 'Play'}>{playing ? '⏸' : '▶'}</button>
          <button onClick={next} aria-label="Next song" title="Next">⏭</button>
          {docked && <button onClick={() => setFind((f) => !f)} aria-label="Search songs" title="Search songs">🔍</button>}
        </div>
        {docked && <div className="media-find" hidden={!find}><MusicSearch yt={yt} compact /></div>}
      </div>
    </>
  );
}
