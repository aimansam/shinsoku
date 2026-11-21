import { useEffect, useRef, useState } from 'react';
import { Checkbox, RingProgress, TextInput } from '@mantine/core';
import { useHotkeys, useViewportSize } from '@mantine/hooks';
import Mascot, { Soku } from './Mascot';
import { CHAT, CHAT_USERS, IMPACTS, LINES, NOTIFS, RAIN, STUNT_LINES, TROLL_ACH, WINDOWS, pick } from './lines';
import { BREAK_HUE, DEPTHS, SPEED, depthOf, fmtTime, levelOf, levelProgress, levelTitle, now, summarize } from './modes';

const COUNTDOWN = 3;
const rnd = (a, b) => a + Math.random() * (b - a);
const HYPE = [['KEEP GOING!', '続けろ'], ['UNSTOPPABLE', '無敵'], ['NO MERCY', '容赦なし'], ['FLOW STATE', '没入'], ['CRUSH IT', '粉砕'],
  ['LOCKED IN', '集中'], ['INSANE!', '狂気'], ['ON FIRE', '炎上'], ['GOD MODE', '神モード'], ["DON'T STOP", '止まるな'], ['PURE FOCUS', '無心'], ['SO CLEAN', '完璧']];
const FORM_ACH = [null, ['FIRST BLOOD', 'Reached AWAKENED'], ['POWER UP', 'Reached SUPER'], ['OVERDRIVE', 'Reached ULTRA'], ['LEGEND', 'Reached LIMIT BREAK']];

// Everything that changes while the timer runs lives in one mutable object (R).
// A 200 ms interval updates it and copies a snapshot into React state for rendering.
const snapshot = (r) => ({
  phase: r.phase, round: r.round, total: r.total, flow: r.flow, depth: r.depth, breaks: r.breaks, paused: r.paused,
  remaining: r.paused ? r.pausedRem : Math.max(0, (r.end - now()) / 1000),
  tasks: r.tasks, parked: r.parked,
});

export default function Session({ run, settings: cfg, xp, music, vis, onFinish }) {
  const R = useRef(null);
  if (!R.current) {
    R.current = {
      phase: 'countdown', round: 1, total: COUNTDOWN, end: now() + COUNTDOWN * 1000, last: now(),
      flow: 0, focusSec: 0, depth: 0, max: 0, breaks: 0, paused: false, pausedRem: 0,
      tasks: run.tasks.map((t) => ({ t, done: false })), parked: [],
      popId: 0, nextFloat: 3, nextHype: 5, nextChat: 9, nextNotif: 25, nextViewer: 2, nextImpact: 7, nextWin: 40, nextRain: 25, nextDvd: 60, nextHaz: 45, nextStunt: 15, lastMin: 0, ach: {}, half: false, sprint: false, lastSec: 99,
    };
  }
  const [ui, setUi] = useState(() => snapshot(R.current));
  const [banner, setBanner] = useState(null);
  const [muted, setMuted] = useState(false);
  const [holding, setHolding] = useState(false);
  const [parkOpen, setParkOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [pops, setPops] = useState([]);
  const [mascot, setMascot] = useState({ id: 0, text: '', mood: null });
  const [cutin, setCutin] = useState(null);
  const sayTimer = useRef();
  const holdingRef = useRef(false);
  const dockEl = useRef();
  const [chat, setChat] = useState([]);
  const [stunt, setStunt] = useState(null);
  const holdTimer = useRef();
  const ringEl = useRef();
  const rootEl = useRef();
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const { width, height } = useViewportSize();

  const sync = () => setUi(snapshot(R.current));
  const flash = (text, kanji = '') => {
    setBanner({ id: Date.now(), text, kanji });
    setTimeout(() => setBanner(null), 2100);
    const hard = R.current.depth >= 3 ? 14 : 8;
    rootEl.current?.animate(
      [{ translate: '0 0' }, { translate: `${hard}px -${hard}px` }, { translate: `-${hard}px ${hard}px` }, { translate: `${hard / 2}px 0` }, { translate: '0 0' }],
      { duration: 380 },
    );
  };

  // ---- popups: floating numbers, stickers, achievements, spark bursts ----

  const pop = (kind, text, o = {}) => {
    const id = ++R.current.popId;
    const sparks = kind === 'burst' ? Array.from({ length: 30 }, () => ({ a: rnd(0, 6.283), d: rnd(160, 560) })) : null;
    const rain = kind === 'rain' ? Array.from({ length: 30 }, () => ({ x: rnd(0, 96), d: rnd(0, 1.2), t: rnd(1.2, 2.4), s: rnd(26, 54), e: pick(RAIN) })) : null;
    setPops((p) => [...p.slice(-28), { id, kind, text, sparks, rain, ...o }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), o.ms || 1800);
  };
  const sticker = (text, kanji, o = {}) => {
    pop('sticker', text, { kanji, x: Math.random() < 0.5 ? rnd(2, 15) : rnd(68, 82), y: rnd(14, 76), rot: rnd(-12, 12), ms: 1700, ...o });
    music.blip(o.pitch || 81);
  };
  const achieve = (key, title, sub) => {
    if (R.current.ach[key]) return;
    R.current.ach[key] = 1;
    pop('ach', title, { sub, ms: 3300 });
    pop('burst', '', { ms: 1000 });
    music.blip(88);
  };

  // ---- the crazy stuff: impacts, warning tape, emoji rain, fake error windows, fake live chat, mascot stunts ----

  const impact = () => {
    pop('impact', pick(IMPACTS), { x: rnd(15, 85), y: rnd(22, 74), rot: rnd(-18, 18), ms: 1100 });
    music.boom();
    vis.current.pulse(1.4);
    const k = 6 + R.current.depth * 3;
    rootEl.current?.animate([{ translate: '0 0' }, { translate: `${k}px -${k}px` }, { translate: `-${k}px ${k}px` }, { translate: '0 0' }], { duration: 260 });
  };
  const hazard = () => {
    pop('hazard', '', { ms: 2600 });
    music.siren();
  };
  const rain = () => pop('rain', '', { ms: 3400 });
  const winStorm = () => {
    for (let k = 0; k < 5; k++)
      setTimeout(() => {
        const [title, text] = pick(WINDOWS);
        pop('win', text, { title, x: rnd(18, 82), y: rnd(20, 72), ms: 2600 - k * 150 });
        music.blip(70 + k * 3);
      }, k * 260);
    setTimeout(() => say(pick(LINES.shock), 'shock', 3500), 300);
    setTimeout(() => sticker('JUST KIDDING', '嘘', { x: 50, y: 20, rot: -4 }), 2300);
  };
  const viewerChat = () => {
    const id = ++R.current.popId;
    setChat((c) => [...c.slice(-8), { id, user: pick(CHAT_USERS), hue: Math.floor(rnd(0, 360)), text: pick(CHAT) }]);
    setTimeout(() => setChat((c) => c.filter((x) => x.id !== id)), 6200);
  };
  const doStunt = () => {
    const kind = pick(['spin', 'run', 'flip', 'zoom']);
    const line = pick(STUNT_LINES);
    if (kind === 'zoom') showCut(line);
    else {
      setStunt({ kind });
      setTimeout(() => setStunt(null), 2000);
    }
    say(line, 'hype', 2800);
  };

  // ---- the mascot talks (and trolls). mood overrides her default face for a few seconds ----

  const say = (text, mood = null, ms = 4800) => {
    setMascot({ id: Date.now() + Math.random(), text, mood });
    music.babble();
    clearTimeout(sayTimer.current);
    sayTimer.current = setTimeout(() => setMascot((m) => ({ ...m, text: '', mood: null })), ms);
  };
  // big anime cut-in: she slides in from the side and shouts
  const showCut = (text) => {
    setCutin({ id: Date.now(), text });
    setTimeout(() => setCutin(null), 1550);
  };

  // ---- depth ----

  const setDepth = (d) => {
    const r = R.current;
    const up = d > r.depth;
    r.depth = d;
    r.max = Math.max(r.max, d);
    music.setDepth(d);
    vis.current.setDepth(r.phase === 'break' ? 0 : d, DEPTHS[d].hue);
    if (up) {
      vis.current.shock();
      flash(DEPTHS[d].name, DEPTHS[d].kanji);
      pop('burst', '', { ms: 1000 });
      pop('float', `+${50 * d} XP`, { x: 50, y: 30 });
      showCut(LINES.form[d]);
      impact();
      rain();
      if (d >= 2) hazard();
      say(LINES.form[d], d >= 3 ? 'ultra' : 'hype');
      if (FORM_ACH[d]) achieve(`form${d}`, FORM_ACH[d][0], FORM_ACH[d][1]);
    }
  };

  // A flow break (self reported, or pausing) drops you to the start of the previous level.
  const dropLevel = () => {
    const r = R.current;
    r.flow = DEPTHS[Math.max(0, r.depth - 1)].at * 60;
    setDepth(depthOf(r.flow));
  };

  // ---- phases: countdown -> focus -> break -> focus ... -> finish ----

  const begin = (phase) => {
    const r = R.current;
    const onBreak = phase === 'break';
    r.phase = phase;
    r.total = (onBreak ? cfg.brk : cfg.focus) * 60;
    r.end = now() + r.total * 1000;
    music.setBreak(onBreak);
    vis.current.setDepth(onBreak ? 0 : r.depth, onBreak ? BREAK_HUE : DEPTHS[r.depth].hue);
    vis.current.shock();
    r.half = r.sprint = false;
    r.lastSec = 99;
    flash(onBreak ? 'SAVE POINT' : r.round === 1 ? 'GO!' : `STAGE ${r.round}`, onBreak ? '休憩' : '開始');
    say(pick(onBreak ? LINES.break : r.round === 1 ? LINES.start : LINES.round), onBreak ? 'sleep' : 'hype');
  };

  const finish = (aborted) => {
    const r = R.current;
    if (r.done) return;
    r.done = true;
    const res = summarize({ focusSec: r.focusSec, planned: cfg.focus * 60 * cfg.rounds, max: r.max, breaks: r.breaks });
    finishRef.current({
      ...res, aborted, mode: cfg.mode, mission: run.mission, max: r.max, breaks: r.breaks, parked: r.parked,
      tasksDone: r.tasks.filter((t) => t.done).length, tasksTotal: r.tasks.length,
    });
  };

  const nextPhase = () => {
    const r = R.current;
    if (r.phase === 'countdown') begin('focus');
    else if (r.phase === 'break') {
      r.round++;
      begin('focus');
    } else if (r.round >= cfg.rounds) finish(false);
    else begin('break');
  };

  useEffect(() => {
    const id = setInterval(() => {
      const r = R.current;
      const t = now();
      const dt = Math.min((t - r.last) / 1000, 2 * SPEED);
      r.last = t;
      if (!r.paused) {
        if (r.phase === 'focus') {
          r.flow += dt;
          r.focusSec += dt;
          const d = depthOf(r.flow);
          if (d > r.depth) setDepth(d);
          if (r.focusSec >= r.nextFloat) {
            r.nextFloat += 2.2;
            for (let k = 0; k <= (r.depth >= 2 ? 2 : 0); k++) pop('float', `+${10 * (r.depth + 1)} FLOW`, { x: rnd(14, 86), y: rnd(24, 72) });
          }
          if (r.focusSec >= r.nextHype) {
            r.nextHype += rnd(4, 9);
            const [a, b] = HYPE[Math.floor(Math.random() * HYPE.length)];
            sticker(a, b);
          }
          const min = Math.floor(r.flow / 60);
          if (min > r.lastMin) {
            sticker(`COMBO x${min}`, 'コンボ', { x: 50, y: 18, rot: -4, pitch: 86 });
            vis.current.pulse(1.4);
          }
          r.lastMin = min;
          if (r.focusSec >= r.nextChat) {
            r.nextChat += rnd(12, 24);
            say(pick(LINES.chat), pick(['wink', 'smug', null, null]));
          }
          if (r.focusSec >= r.nextNotif) {
            r.nextNotif += rnd(40, 80);
            const [app, sub, color] = pick(NOTIFS);
            pop('notif', app, { sub, color, ms: 3600 });
            music.blip(96);
            setTimeout(() => say(pick(LINES.notif), 'smug'), 900);
          }
          if (r.focusSec >= r.nextViewer) {
            r.nextViewer += rnd(1.0, 2.4) / (1 + r.depth * 0.5);
            viewerChat();
          }
          if (r.focusSec >= r.nextImpact) {
            r.nextImpact += rnd(7, 14);
            impact();
          }
          if (r.focusSec >= r.nextWin) {
            r.nextWin += rnd(55, 100);
            winStorm();
          }
          if (r.focusSec >= r.nextRain) {
            r.nextRain += rnd(28, 50);
            rain();
          }
          if (r.focusSec >= r.nextHaz) {
            r.nextHaz += rnd(50, 90);
            hazard();
          }
          if (r.focusSec >= r.nextDvd) {
            r.nextDvd += rnd(100, 150);
            pop('dvd', 'SHINSOKU', { ms: 7000 });
            say(pick(LINES.dvd), 'smug', 5000);
          }
          if (r.focusSec >= r.nextStunt) {
            r.nextStunt += rnd(18, 32);
            doStunt();
          }
          TROLL_ACH.forEach(([at, title, sub], i) => r.focusSec >= at && achieve(`troll${i}`, title, sub));
          if (r.focusSec >= 1200 && r.breaks === 0) achieve('iron', 'IRON WILL', '20 min of focus, zero misses');
          const left = (r.end - t) / 1000;
          if (!r.half && left <= r.total / 2) {
            r.half = true;
            sticker('HALFWAY!', '折り返し', { x: 50, y: 18, rot: 3 });
          }
          if (!r.sprint && r.total > 120 && left <= 60) {
            r.sprint = true;
            sticker('FINAL SPRINT', '最終', { x: 50, y: 18, rot: -3, pitch: 90 });
          }
          const sec = Math.ceil(left);
          if (sec <= 10 && sec > 0 && sec !== r.lastSec) {
            r.lastSec = sec;
            pop('num', String(sec), { ms: 900 });
            if (sec === 10) say(pick(LINES.sprint), 'hype', 3000);
            vis.current.pulse(1.2);
          }
        }
        if (r.phase === 'countdown') {
          const n = Math.ceil((r.end - t) / 1000);
          if (n !== r.lastCount) vis.current.pulse(1);
          r.lastCount = n;
        }
        if (t >= r.end) nextPhase();
      }
      sync();
    }, 200);
    return () => clearInterval(id);
  }, []);

  // ---- actions ----

  const togglePause = () => {
    const r = R.current;
    if (cfg.strict || r.phase === 'countdown') return;
    if (r.paused) {
      r.end = now() + r.pausedRem * 1000;
      r.last = now();
      r.paused = false;
      music.setBreak(r.phase === 'break');
      say(pick(LINES.resume), 'wink');
    } else {
      r.pausedRem = (r.end - now()) / 1000;
      r.paused = true;
      if (r.phase === 'focus') dropLevel();
      music.setBreak(true);
      say(pick(LINES.pause), 'smug', 9000);
    }
    sync();
  };

  const reportBreak = () => {
    const r = R.current;
    if (r.phase !== 'focus' || r.paused) return;
    r.breaks++;
    dropLevel();
    sticker('MISS!', 'ミス', { x: 50, y: 22, rot: 5, color: '#ff3b3b', pitch: 60 });
    say(pick(LINES.miss), pick(['smug', 'shades', 'cry']), 5200);
    sync();
  };

  const toggleMute = () => {
    say(pick(muted ? LINES.unmute : LINES.mute), muted ? 'wink' : 'cry');
    music.setMuted(!muted);
    setMuted(!muted);
  };

  const toggleFullscreen = () =>
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {});

  const savePark = () => {
    if (draft.trim()) {
      R.current.parked.push(draft.trim());
      pop('float', 'ITEM GET!', { x: 50, y: 40 });
      achieve('park', 'BRAIN DUMP', 'Parked a thought and kept going');
      say(pick(LINES.park), 'wink');
    }
    setDraft('');
    setParkOpen(false);
    sync();
  };

  const toggleTask = (i) => {
    const r = R.current;
    r.tasks[i].done = !r.tasks[i].done;
    if (r.tasks[i].done) {
      pop('float', 'OBJECTIVE CLEARED!', { x: 50, y: 55 });
      music.blip(84);
      if (r.tasks.every((t) => t.done)) {
        achieve('clear', 'ALL CLEAR', 'Every objective done');
        say(pick(LINES.clear), 'ultra');
      } else say(pick(LINES.task), 'hype');
    }
    sync();
  };

  const cancelHold = () => {
    clearTimeout(holdTimer.current);
    setHolding(false);
    if (holdingRef.current) {
      holdingRef.current = false;
      say(pick(LINES.stay), 'wink', 3500);
    }
  };

  // Buttons blur after a click so the Space shortcut doesn't also "press" the focused button.
  const act = (fn) => (e) => {
    e.currentTarget.blur();
    fn();
  };

  useHotkeys([
    ['space', (e) => { e.preventDefault(); togglePause(); }],
    ['b', reportBreak],
    ['m', toggleMute],
    ['f', toggleFullscreen],
    ['p', (e) => { e.preventDefault(); setParkOpen(true); }],
  ]);

  // ---- side effects: pulse the ring on the beat, page title, wake lock, reload guard ----

  useEffect(
    () =>
      music.onBeat((step) => {
        if (step % 4) return; // the ring only kicks on quarter notes
        ringEl.current?.animate([{ transform: `scale(${step === 0 ? 1.2 : 1.1})` }, { transform: 'scale(1)' }], { duration: 170, easing: 'ease-out' });
        const d = R.current.depth;
        const dir = (step / 4) % 2 ? 1 : -1;
        dockEl.current?.animate([{ transform: `translateY(-${12 + d * 10}px) rotate(${dir * (3 + d * 2)}deg) scale(1.03, 0.97)` }, { transform: 'none' }], { duration: 230, easing: 'ease-out' });
      }),
    [],
  );

  useEffect(() => {
    document.title = `${fmtTime(ui.remaining)} · ${ui.phase === 'break' ? 'BREAK' : DEPTHS[ui.depth].name}`;
  }, [ui.remaining, ui.phase, ui.depth]);

  useEffect(() => {
    let lock;
    const ask = () => navigator.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    ask();
    document.addEventListener('visibilitychange', ask); // browsers release the lock on hide; this only re-asks, nothing else
    window.onbeforeunload = (e) => e.preventDefault();
    return () => {
      document.removeEventListener('visibilitychange', ask);
      lock?.release();
      window.onbeforeunload = null;
      document.title = 'Shinsoku';
    };
  }, []);

  // ---- render ----

  const onBreak = ui.phase === 'break';
  const form = DEPTHS[ui.depth];
  const hue = onBreak ? BREAK_HUE : form.hue;
  const color = `hsl(${hue} 100% 60%)`;
  const elapsed = ui.total - ui.remaining;
  const breath = elapsed % 12 < 4 ? 'INHALE' : elapsed % 12 < 6 ? 'HOLD' : 'EXHALE';
  const size = Math.max(220, Math.min(360, width * 0.8)); // width is 0 on the very first render
  const level = levelOf(xp);
  const baseMood = onBreak ? 'sleep' : ui.paused ? 'smug' : ui.depth >= 4 ? 'ultra' : ui.depth >= 2 ? 'hype' : 'focus';
  const mood = mascot.mood || baseMood;
  const mSize = Math.min(330, (width - 600) / 2 - 10, height * 0.42); // as big as the free space on the left allows
  const cutSize = Math.max(220, Math.min(580, height * 0.8, width * 0.8));
  const phaseLabel = onBreak ? 'SAVE POINT' : ui.phase === 'countdown' ? 'READY' : ui.paused ? 'PAUSED' : 'FIGHT';
  const secs = Math.ceil(ui.remaining);

  // 5 power-gauge segments, each filling up towards the next form
  const segment = (i) => {
    const from = DEPTHS[i].at * 60;
    const to = i < 4 ? DEPTHS[i + 1].at * 60 : from + 1800;
    return i === 4 && ui.depth === 4 ? 100 : Math.min(100, Math.max(0, ((ui.flow - from) / (to - from)) * 100));
  };

  return (
    <div ref={rootEl} className="session" data-phase={ui.phase} data-depth={ui.depth} style={{ '--c': color }}>
      <div className="hud">
        <div className="panel player">
          <div className="lv">LV{level}</div>
          <div style={{ flex: 1 }}>
            <b className="tag">{levelTitle(level)}</b>
            <div className="seg" style={{ width: '100%', marginTop: 4 }}><i style={{ '--w': `${levelProgress(xp)}%` }} /></div>
          </div>
        </div>
        <div className="stage">
          <span>STAGE {ui.round}/{cfg.rounds}</span>
          <em>{phaseLabel}</em>
        </div>
        <div className="counters">
          <span key={Math.floor(ui.flow / 60)} className="combo">COMBO x{Math.floor(ui.flow / 60)}</span>
          <span className="miss">MISS x{ui.breaks}</span>
          <span>ITEMS x{ui.parked.length}</span>
        </div>
      </div>

      <div className="center">
        <div ref={ringEl} className="ring">
          {onBreak && <div className="orb" style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }} />}
          <RingProgress
            size={size} thickness={14} rootColor="rgba(0,0,0,0.55)"
            sections={[{ value: ui.total ? Math.min(100, (elapsed / ui.total) * 100) : 0, color }]}
            label={
              <div style={{ textAlign: 'center' }}>
                {ui.phase === 'countdown' ? (
                  <div key={secs} className="count">{Math.max(1, secs)}</div>
                ) : (
                  <>
                    <div key={secs} className="time">{fmtTime(ui.remaining)}</div>
                    {onBreak && <div className="tag" style={{ marginTop: 6 }}>{breath}</div>}
                  </>
                )}
              </div>
            }
          />
        </div>

        <div className="form">
          <span className="kanji">{onBreak ? '休憩' : form.kanji}</span>
          <b>{onBreak ? 'RECOVERING' : form.name}</b>
        </div>
        <div className="gauge">
          {DEPTHS.map((_, i) => <div key={i} className="seg"><i style={{ '--w': `${segment(i)}%` }} /></div>)}
        </div>
        <div className="gauge-meta"><span>FLOW {fmtTime(ui.flow)}</span><span>FORM {ui.depth}/4</span></div>

        <div className="panel quest" style={{ width: '100%', boxSizing: 'border-box' }}>
          <h4>QUEST: {run.mission}</h4>
          {ui.tasks.map((t, i) => (
            <div key={i} className={`row ${t.done ? 'done' : ''}`}>
              <Checkbox size="xs" checked={t.done} onChange={() => toggleTask(i)} label={t.t} />
            </div>
          ))}
          {parkOpen && (
            <TextInput autoFocus mt="xs" placeholder="Park a distracting thought. Enter to save, Esc to cancel" value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') savePark();
                if (e.key === 'Escape') { setDraft(''); setParkOpen(false); }
              }} />
          )}
        </div>
      </div>

      <div>
        <div className="controls">
          <button className="gbtn ghost" disabled={cfg.strict || ui.phase === 'countdown'} onClick={act(togglePause)}>{ui.paused ? 'Resume' : 'Pause'}<kbd>SPACE</kbd></button>
          <button className="gbtn" onClick={act(reportBreak)}>I broke focus<kbd>B</kbd></button>
          <button className="gbtn ghost" onClick={act(() => setParkOpen(true))}>Park thought<kbd>P</kbd></button>
          <button className="gbtn ghost" onClick={act(toggleMute)}>{muted ? 'Unmute' : 'Mute'}<kbd>M</kbd></button>
          <button className="gbtn ghost" onClick={act(toggleFullscreen)}>Fullscreen<kbd>F</kbd></button>
          <button className={`gbtn ghost hold ${holding ? 'holding' : ''}`}
            onPointerDown={() => { setHolding(true); holdingRef.current = true; say(pick(LINES.retreat), 'cry', 1700); holdTimer.current = setTimeout(() => finish(true), 1500); }}
            onPointerUp={cancelHold} onPointerLeave={cancelHold} onPointerCancel={cancelHold}
            onClick={(e) => { if (e.detail === 0 && confirm('End this session?')) finish(true); }}>
            Hold to retreat
          </button>
        </div>
        <div className="hint">Leaving this tab does nothing. Pausing or "I broke focus" costs one form.</div>
      </div>

      {mSize >= 110 && (
        <div className={`mascot-dock ${stunt ? `stunt-${stunt.kind}` : ''}`} style={{ '--ms': `${mSize}px` }}>
          <Mascot id={mascot.id} mood={mood} text={mascot.text} size={mSize} beatRef={dockEl} />
        </div>
      )}
      {ui.depth >= 3 && !onBreak && width >= 1100 && (
        <div className="clones">
          {Array.from({ length: ui.depth - 1 }, (_, i) => (
            <div key={i} className="clone" style={{ animationDelay: `${i * 0.12}s` }}><Soku mood={i % 2 ? 'wink' : 'hype'} size={110} /></div>
          ))}
        </div>
      )}
      <div className="chat-col">
        {chat.map((c) => <div key={c.id} className="chat-msg"><b style={{ color: `hsl(${c.hue} 90% 68%)` }}>{c.user}:</b>{c.text}</div>)}
      </div>
      {cutin && (
        <div key={cutin.id} className="cutin">
          <div className="cutin-char"><Mascot mood="ultra" size={cutSize} /></div>
          <div className="cutin-text">{cutin.text}</div>
        </div>
      )}
      <div className="notif-stack">
        {pops.filter((p) => p.kind === 'notif').map((p) => (
          <div key={p.id} className="pop-notif">
            <i style={{ background: p.color }}>{p.text[0]}</i>
            <div><b>{p.text}</b><span>{p.sub}</span></div>
          </div>
        ))}
      </div>
      <div className="pops">
        {pops.map((p) => {
          const pos = { left: `${p.x}%`, top: `${p.y}%` };
          if (p.kind === 'float') return <div key={p.id} className="pop-float" style={pos}>{p.text}</div>;
          if (p.kind === 'sticker')
            return (
              <div key={p.id} className="pop-sticker" style={{ ...pos, '--r': `${p.rot}deg`, ...(p.color && { background: p.color, color: '#fff' }) }}>
                <b>{p.text}</b>
                {p.kanji && <i>{p.kanji}</i>}
              </div>
            );
          if (p.kind === 'impact')
            return (
              <div key={p.id} className="pop-impact" style={{ ...pos, '--r': `${p.rot}deg` }}><b>{p.text}</b></div>
            );
          if (p.kind === 'hazard') {
            const tape = '⚠ WARNING ⚠ FLOW SPIKE DETECTED ⚠ UNSTOPPABLE ⚠ '.repeat(6);
            return (
              <div key={p.id} className="pop-hazard">
                <div className="hz top"><span>{tape}</span></div>
                <div className="hz bot"><span>{tape}</span></div>
              </div>
            );
          }
          if (p.kind === 'rain')
            return (
              <div key={p.id} className="pop-rain">
                {p.rain.map((it, i) => <span key={i} className="rain-item" style={{ left: `${it.x}%`, fontSize: it.s, animationDelay: `${it.d}s`, animationDuration: `${it.t}s` }}>{it.e}</span>)}
              </div>
            );
          if (p.kind === 'win')
            return (
              <div key={p.id} className="pop-win" style={pos}>
                <div className="wt"><span>{p.title}</span><i>x</i></div>
                <div className="wb">{p.text}</div>
                <div className="wbtn"><u>OK</u><u>Also OK</u></div>
              </div>
            );
          if (p.kind === 'dvd') return <div key={p.id} className="dvd-x"><div className="dvd-y"><b>{p.text}</b></div></div>;
          if (p.kind === 'num') return <div key={p.id} className="pop-num">{p.text}</div>;
          if (p.kind === 'burst')
            return (
              <div key={p.id} className="burst">
                {p.sparks.map((sp, i) => (
                  <i key={i} className="spark" style={{ '--dx': `${Math.cos(sp.a) * sp.d}px`, '--dy': `${Math.sin(sp.a) * sp.d}px`, '--ang': `${sp.a}rad` }} />
                ))}
              </div>
            );
          return null;
        })}
      </div>
      <div className="ach-stack">
        {pops.filter((p) => p.kind === 'ach').map((p) => (
          <div key={p.id} className="pop-ach">
            <em>ACHIEVEMENT UNLOCKED</em>
            <b>{p.text}</b>
            <span>{p.sub}</span>
          </div>
        ))}
      </div>

      {banner && (
        <div key={banner.id} className="banner">
          <b>{banner.text}</b>
          {banner.kanji && <i>{banner.kanji}</i>}
        </div>
      )}
    </div>
  );
}
