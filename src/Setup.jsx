import { useState } from 'react';
import { Collapse, NumberInput, SegmentedControl, Select, Slider, Switch, Text, Textarea, TextInput } from '@mantine/core';
import { MODES, levelOf, levelProgress, levelTitle } from './modes';
import { STYLES } from './music';
import { keyOf } from './media';
import MusicSearch from './MusicSearch';
import Mascot from './Mascot';
import { LINES, pick } from './lines';

const MUSIC = [
  { value: 'off', label: 'No beat (silent, extras only)' },
  ...Object.entries(STYLES).map(([value, s]) => ({ value, label: s.label })),
];
const INTENSITY = [
  { value: 'chill', label: 'Chill' },
  { value: 'hyper', label: 'Hyper' },
  { value: 'max', label: 'MAX' },
];
const BINAURAL = [
  { value: 'off', label: 'Binaural beats: off' },
  { value: 'theta', label: 'Theta 6 Hz (creative)' },
  { value: 'alpha', label: 'Alpha 10 Hz (calm focus)' },
  { value: 'beta', label: 'Beta 18 Hz (alert)' },
  { value: 'gamma', label: 'Gamma 40 Hz (peak)' },
];

export default function Setup({ settings: s, setSettings, stats, onStart, onAnchor, yt }) {
  const [mission, setMission] = useState('');
  const [checklist, setChecklist] = useState('');
  const [more, setMore] = useState(false);
  const [chat, setChat] = useState(() => ({ id: 0, text: pick(LINES.greet), mood: 'wink' }));
  const poke = () => setChat({ id: Date.now(), text: pick(LINES.poke), mood: pick(['hype', 'smug', 'cry', 'wink']) });
  const set = (patch) => setSettings({ ...s, ...patch });
  const pickMode = (mode) => {
    const m = MODES[mode];
    set({ mode, focus: m.focus, brk: m.brk, music: yt.queue.length ? 'off' : m.music });
  };
  const level = levelOf(stats.xp);
  const num = (key) => (v) => typeof v === 'number' && set({ [key]: v });

  const go = () =>
    onStart({
      mission: mission.trim() || MODES[s.mode].label,
      tasks: checklist.split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 12),
    });

  return (
    <div className="setup compact" style={{ '--c': `hsl(${MODES[s.mode].hue} 100% 58%)` }}>
      <header className="setup-head">
        <div>
          <h1 className="title">Shinsoku</h1>
          <div className="kanji-sub">神速 · GODSPEED</div>
        </div>
        <div className="panel level">
          <div className="lv">LV {level}</div>
          <div style={{ flex: 1, minWidth: 90 }}>
            <b className="tag">{levelTitle(level)}</b>
            <div className="seg" style={{ width: '100%', marginTop: 4 }}><i style={{ '--w': `${levelProgress(stats.xp)}%` }} /></div>
          </div>
          <Text className="tag" size="xs">{stats.today} min today · {stats.streak} day streak · {stats.hours.toFixed(1)} h</Text>
        </div>
      </header>

      <div>
        <h4 className="tag step">1 · Pick a mode</h4>
        <div className="modes">
          {Object.entries(MODES).map(([key, m], i) => (
            <button key={key} className={`mode ${s.mode === key ? 'on' : ''}`} style={{ '--h': m.hue, '--i': i }} onClick={() => pickMode(key)}>
              <b>{m.kanji}</b>
              <span>{m.label}</span>
              <small>{m.focus}/{m.brk} min</small>
            </button>
          ))}
        </div>
      </div>

      <div className="setup-cols">
        <div className="stack">
        <div className="panel col">
          <h4>2 · Quest</h4>
          <TextInput label="Mission" placeholder="What are you conquering?" maxLength={100} value={mission} onChange={(e) => setMission(e.currentTarget.value)} />
          <Textarea label="Objectives (optional, one per line)" autosize minRows={2} maxRows={4} value={checklist} onChange={(e) => setChecklist(e.currentTarget.value)} />
          <div className="trio">
            <NumberInput label="Focus min" min={1} max={180} value={s.focus} onChange={num('focus')} />
            <NumberInput label="Break min" min={1} max={60} value={s.brk} onChange={num('brk')} />
            <NumberInput label="Stages" min={1} max={8} value={s.rounds} onChange={num('rounds')} />
          </div>
        </div>
        {yt.queue.length > 0 && (
          <div className="panel col">
            <h4>♫ Now playing</h4>
            <div ref={onAnchor} className="now-anchor" />
            <ol className="queue">
              {yt.queue.map((it, i) => (
                <li key={`${keyOf(it)}-${i}`} className={i === yt.index ? 'on' : ''}>
                  <button className="q-main" onClick={() => yt.jump(i)} title="Play this one">{i === yt.index ? '▶ ' : ''}{it.title}</button>
                  <button className="q-x" onClick={() => yt.remove(i)} aria-label={`Remove ${it.title}`}>×</button>
                </li>
              ))}
            </ol>
            <button className="more" onClick={yt.clear}>Clear queue</button>
          </div>
        )}
        </div>

        <div className="stack">
        <div className="panel col">
          <h4>3 · Sound</h4>
          <Select label="Beat" data={MUSIC} value={s.music} onChange={(v) => v && set({ music: v })} allowDeselect={false} />
          <div>
            <Text className="tag" size="xs" mb={4}>Visual intensity</Text>
            <SegmentedControl fullWidth data={INTENSITY} value={s.intensity} onChange={(v) => set({ intensity: v })} />
          </div>
          <div>
            <Text className="tag" size="xs">Volume</Text>
            <Slider value={s.volume} onChange={(v) => set({ volume: v })} />
          </div>
        </div>
        <div className="panel col">
          <h4>♫ Music (YouTube)</h4>
          <MusicSearch yt={yt} />
        </div>
        </div>
      </div>

      <div>
        <button className="more" onClick={() => setMore((m) => !m)}>{more ? '▾' : '▸'} More options</button>
        <Collapse in={more}>
          <div className="panel more-panel">
            <Select label="Brain waves (tone, optional)" data={BINAURAL} value={s.binaural} onChange={(v) => v && set({ binaural: v })} allowDeselect={false} />
            <Switch label="Brown noise layer (off = pure beat)" checked={s.noise} onChange={(e) => set({ noise: e.currentTarget.checked })} />
            <TextInput
              label="YouTube API key (optional)"
              description="Makes song search more reliable. Free from Google Cloud Console (YouTube Data API v3). Stays in this browser."
              placeholder="AIza..."
              value={s.ytKey}
              onChange={(e) => set({ ytKey: e.currentTarget.value })}
            />
            <Switch label="Hard mode (no pausing)" checked={s.strict} onChange={(e) => set({ strict: e.currentTarget.checked })} />
            <Switch label="Lobby music and victory fanfare" checked={s.lobby} onChange={(e) => set({ lobby: e.currentTarget.checked })} />
          </div>
        </Collapse>
      </div>

      <div className="mascot-dock dock-setup" onClick={poke} title="Poke her">
        <Mascot id={chat.id} mood={chat.mood} text={chat.text} size={250} />
      </div>
      <button className="gbtn start" onClick={go}>Press start</button>
      <Text size="xs" ta="center" style={{ textShadow: '0 1px 6px #000' }}>
        Flow builds your power form; pausing or "I broke focus" costs one. Leaving the tab does nothing. Visuals flash fast with the beat, so pick Chill if you are light-sensitive.
      </Text>
    </div>
  );
}
