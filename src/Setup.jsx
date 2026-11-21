import { useState } from 'react';
import { NumberInput, Select, Slider, Switch, Text, Textarea, TextInput } from '@mantine/core';
import { MODES, levelOf, levelProgress, levelTitle } from './modes';
import { STYLES } from './music';
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

export default function Setup({ settings: s, setSettings, stats, onStart }) {
  const [mission, setMission] = useState('');
  const [checklist, setChecklist] = useState('');
  const [chat, setChat] = useState(() => ({ id: 0, text: pick(LINES.greet), mood: 'wink' }));
  const poke = () => setChat({ id: Date.now(), text: pick(LINES.poke), mood: pick(['hype', 'smug', 'cry', 'wink']) });
  const set = (patch) => setSettings({ ...s, ...patch });
  const pickMode = (mode) => {
    const m = MODES[mode];
    set({ mode, focus: m.focus, brk: m.brk, music: m.music });
  };
  const level = levelOf(stats.xp);
  const num = (key) => (v) => typeof v === 'number' && set({ [key]: v });

  const go = () =>
    onStart({
      mission: mission.trim() || MODES[s.mode].label,
      tasks: checklist.split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 12),
    });

  return (
    <div className="setup" style={{ '--c': `hsl(${MODES[s.mode].hue} 100% 58%)`, maxWidth: 760, margin: '0 auto', padding: '28px 16px 60px', display: 'grid', gap: 18 }}>
      <div>
        <h1 className="title">Shinsoku</h1>
        <div className="kanji-sub">神速 · GODSPEED</div>
        <p className="tag" style={{ margin: '14px 0 0', textShadow: '0 2px 8px #000' }}>Study · Work · Game · Create — power up and don't stop</p>
      </div>

      <div className="panel" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="lv" style={{ fontSize: 44 }}>LV {level}</div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <b className="tag">{levelTitle(level)}</b>
          <div className="seg" style={{ width: '100%', marginTop: 4 }}><i style={{ '--w': `${levelProgress(stats.xp)}%` }} /></div>
        </div>
        <Text className="tag">{stats.today} min today</Text>
        <Text className="tag">{stats.streak} day streak</Text>
        <Text className="tag">{stats.hours.toFixed(1)} h total</Text>
      </div>

      <div>
        <h4 className="tag" style={{ margin: '0 0 8px', textShadow: '0 2px 8px #000' }}>Select mode</h4>
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

      <div className="panel" style={{ display: 'grid', gap: 12 }}>
        <h4>Quest</h4>
        <TextInput label="Mission" placeholder="What are you conquering?" maxLength={100} value={mission} onChange={(e) => setMission(e.currentTarget.value)} />
        <Textarea label="Objectives (optional, one per line)" autosize minRows={2} maxRows={5} value={checklist} onChange={(e) => setChecklist(e.currentTarget.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <NumberInput label="Focus min" min={1} max={180} value={s.focus} onChange={num('focus')} />
          <NumberInput label="Break min" min={1} max={60} value={s.brk} onChange={num('brk')} />
          <NumberInput label="Stages" min={1} max={8} value={s.rounds} onChange={num('rounds')} />
        </div>
      </div>

      <div className="panel" style={{ display: 'grid', gap: 12 }}>
        <h4>Soundtrack & visuals</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Select label="Music" data={MUSIC} value={s.music} onChange={(v) => v && set({ music: v })} allowDeselect={false} />
          <Select label="Visual intensity" data={INTENSITY} value={s.intensity} onChange={(v) => v && set({ intensity: v })} allowDeselect={false} />
          <Select label="Brain waves (tone, optional)" data={BINAURAL} value={s.binaural} onChange={(v) => v && set({ binaural: v })} allowDeselect={false} />
        </div>
        <div>
          <Text className="tag" size="sm">Volume</Text>
          <Slider value={s.volume} onChange={(v) => set({ volume: v })} />
        </div>
        <Switch label="Brown noise layer (off = pure beat)" checked={s.noise} onChange={(e) => set({ noise: e.currentTarget.checked })} />
        <Switch label="Lobby music and victory fanfare" checked={s.lobby} onChange={(e) => set({ lobby: e.currentTarget.checked })} />
        <Switch label="Hard mode (no pausing)" checked={s.strict} onChange={(e) => set({ strict: e.currentTarget.checked })} />
      </div>

      <div className="mascot-dock dock-setup" onClick={poke} title="Poke her">
        <Mascot id={chat.id} mood={chat.mood} text={chat.text} size={250} />
      </div>
      <button className="gbtn start" onClick={go}>Press start</button>
      <Text size="xs" ta="center" style={{ textShadow: '0 1px 6px #000' }}>
        Your power form rises the longer you stay in flow. Pausing or hitting "I broke focus" costs a form. Leaving this tab does nothing.
        Headphones recommended for brain waves. Visuals flash fast with the beat. Pick Chill if you are light-sensitive.
      </Text>
    </div>
  );
}
