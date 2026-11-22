import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from '@mantine/hooks';
import { Music } from './music';
import { startVisuals } from './visuals';
import { DEFAULT_SETTINGS, DEPTHS, MODES, statsOf, todayKey } from './modes';
import Setup from './Setup';
import Session from './Session';
import Summary from './Summary';
import MediaDock from './MediaDock';
import { keyOf } from './media';

// One-time: carry progress over from the old name (hf-*) to the new keys (sk-*), so XP and settings survive the rename.
for (const k of ['settings', 'history']) {
  try {
    const old = localStorage.getItem(`hf-${k}`);
    if (old !== null && localStorage.getItem(`sk-${k}`) === null) localStorage.setItem(`sk-${k}`, old);
    localStorage.removeItem(`hf-${k}`);
  } catch {
    /* storage unavailable: nothing to migrate */
  }
}

export default function App() {
  const [saved, setSettings] = useLocalStorage({ key: 'sk-settings', defaultValue: DEFAULT_SETTINGS });
  const [history, setHistory] = useLocalStorage({ key: 'sk-history', defaultValue: [] });
  const settings = { ...DEFAULT_SETTINGS, ...saved };
  const [view, setView] = useState('setup'); // setup | session | summary
  const [run, setRun] = useState(null); // mission + checklist of the current session
  const [result, setResult] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [armed, setArmed] = useState(false); // true once the user has pressed play or chosen a song (browsers need that before sound) // placeholder on the setup screen that the music player sits on

  const music = useMemo(() => new Music(), []);
  const canvas = useRef();
  const vis = useRef(null);

  // Start the background once and make every musical beat pulse it.
  useEffect(() => {
    vis.current = startVisuals(canvas.current, music);
    window.__sk = { music, vis: vis.current }; // handy for debugging in the console
    const off = music.onBeat((step) => {
      const hard = step === 0 ? 1.3 : step % 4 === 0 ? 0.9 : 0.4; // downbeat, quarter, eighth
      vis.current.pulse(hard);
      const punch = 1 + 0.045 * hard * (1 + vis.current.depth());
      canvas.current?.animate([{ transform: `scale(${punch})` }, { transform: 'scale(1)' }], { duration: 150, easing: 'ease-out' });
    });
    return () => {
      off();
      vis.current.destroy();
    };
  }, [music]);
  useEffect(() => vis.current?.setLevel(settings.intensity), [settings.intensity]);
  useEffect(() => {
    if (view === 'setup') vis.current?.setDepth(0, MODES[settings.mode].hue); // background takes the colour of the chosen mode
  }, [view, settings.mode]);

  // YouTube queue. Linking music turns the built-in beat off so the two don't fight.
  const upd = (fn) =>
    setSettings((prev) => {
      const base = { ...DEFAULT_SETTINGS, ...prev };
      return { ...base, ...fn(base) };
    });
  const quiet = (b) => (b.music !== 'off' ? { music: 'off' } : {});
  const queue = settings.queue;
  const yt = {
    queue,
    index: Math.max(0, Math.min(settings.qi, queue.length - 1)),
    armed,
    apiKey: (settings.ytKey || '').trim(),
    setArmed,
    setIndex: (i) => upd(() => ({ qi: i })),
    jump: (i) => {
      setArmed(true);
      upd(() => ({ qi: i }));
    },
    play: (items, i) => {
      setArmed(true);
      upd((b) => ({ queue: items.slice(0, 50), qi: i, ...quiet(b) }));
    },
    playNow: (item) => {
      setArmed(true);
      upd((b) => {
        const at = b.queue.findIndex((x) => keyOf(x) === keyOf(item));
        if (at >= 0) return { qi: at, ...quiet(b) };
        return { queue: [...b.queue, item].slice(-50), qi: Math.min(b.queue.length, 49), ...quiet(b) };
      });
    },
    add: (item) => {
      if (queue.length === 0) setArmed(true);
      upd((b) => (b.queue.some((x) => keyOf(x) === keyOf(item)) ? {} : { queue: [...b.queue, item].slice(-50), qi: b.queue.length ? b.qi : 0, ...quiet(b) }));
    },
    remove: (i) =>
      upd((b) => {
        const q = b.queue.filter((_, k) => k !== i);
        return { queue: q, qi: i < b.qi ? b.qi - 1 : Math.min(b.qi, Math.max(0, q.length - 1)) };
      }),
    clear: () => upd(() => ({ queue: [], qi: 0 })),
    rename: (i, title) => upd((b) => ({ queue: b.queue.map((x, k) => (k === i ? { ...x, title } : x)) })),
  };

  // Lobby music on the menu. Browsers only allow audio after a click or key press, so wait for the first one.
  useEffect(() => {
    if (view !== 'setup' || !settings.lobby || settings.queue.length > 0) return undefined; // your own music replaces the lobby tune
    const go = () => music.startLobby(settings.volume / 100);
    if (music.ctx?.state === 'running') go();
    else {
      window.addEventListener('pointerdown', go, { once: true });
      window.addEventListener('keydown', go, { once: true });
    }
    return () => {
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
      music.stopMenu();
    };
  }, [view, settings.lobby, settings.queue.length, music]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (view === 'setup') music.setVolume(settings.volume / 100);
  }, [view, settings.volume, music]);

  const start = (runConfig) => {
    if (queue.length) setArmed(true);
    music.start({ style: settings.music, volume: settings.volume / 100, noise: settings.noise, binaural: settings.binaural });
    vis.current.setDepth(0, DEPTHS[0].hue);
    setRun(runConfig);
    setView('session');
  };

  const finish = (res) => {
    music.stop();
    vis.current.setDepth(0, DEPTHS[0].hue);
    const xpBefore = statsOf(history).xp;
    if (res.minutes >= 1) {
      const entry = { day: todayKey(), mode: res.mode, mission: res.mission, minutes: res.minutes, xp: res.xp, score: res.score };
      setHistory((h) => [...h, entry].slice(-500));
    }
    setResult({ ...res, xpBefore });
    setView('summary');
  };

  return (
    <>
      <canvas ref={canvas} className="bg" />
      <div className="layer">
        <MediaDock yt={yt} anchor={view === 'setup' ? anchor : null} />
        {view === 'setup' && <Setup settings={settings} setSettings={setSettings} stats={statsOf(history)} onStart={start} onAnchor={setAnchor} yt={yt} />}
        {view === 'session' && <Session run={run} settings={settings} xp={statsOf(history).xp} music={music} vis={vis} onFinish={finish} />}
        {view === 'summary' && <Summary result={result} music={music} fanfare={settings.lobby} onAgain={() => start(run)} onBack={() => setView('setup')} />}
      </div>
    </>
  );
}
