import { useState } from 'react';
import { CopyButton } from '@mantine/core';
import Mascot from './Mascot';
import { LINES, pick } from './lines';
import { DEPTHS, levelOf, levelProgress, levelTitle } from './modes';

export default function Summary({ result: r, onAgain, onBack }) {
  const [talk] = useState(() => (r.aborted ? pick(LINES.rage) : pick(LINES.grade[r.grade])));
  const mood = r.aborted ? 'smug' : { S: 'ultra', A: 'hype', B: 'wink', C: 'smug', D: 'cry' }[r.grade];
  const xpAfter = r.xpBefore + (r.minutes >= 1 ? r.xp : 0);
  const before = levelOf(r.xpBefore);
  const after = levelOf(xpAfter);
  const stats = [
    [Math.round(r.minutes), 'MINUTES'],
    [DEPTHS[r.max].name, 'BEST FORM'],
    [r.breaks, 'MISSES'],
    [`+${r.xp}`, 'XP'],
  ];

  return (
    <div className="result" style={{ '--c': `hsl(${DEPTHS[r.max].hue} 100% 58%)`, maxWidth: 640, margin: '0 auto', padding: '30px 16px', display: 'grid', gap: 16 }}>
      <h2 className="title" style={{ fontSize: 'clamp(40px, 11vw, 84px)' }}>{r.aborted ? 'Retreat' : 'Victory'}</h2>
      <p className="tag" style={{ margin: 0, textShadow: '0 2px 8px #000' }}>Quest: {r.mission}</p>
      <div style={{ position: 'relative' }}>
        <div className="burst" />
        <div className="rank">{r.grade}</div>
        <div className="tag" style={{ fontSize: 22, textShadow: '0 2px 8px #000' }}>Flow score {r.score}/100</div>
      </div>

      <div className="mascot-inline"><Mascot id={1} mood={mood} text={talk} size={250} /></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        {stats.map(([value, label], i) => (
          <div key={label} className="panel stat" style={{ '--i': i }}>
            <b>{value}</b>
            <small>{label}</small>
          </div>
        ))}
      </div>

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tag">LV {after} · {levelTitle(after)}</span>
          {after > before && <span className="levelup">LEVEL UP!</span>}
        </div>
        <div className="seg" style={{ width: '100%', marginTop: 8 }}><i style={{ '--w': `${levelProgress(xpAfter)}%` }} /></div>
      </div>

      {r.tasksTotal > 0 && <div className="tag">Objectives: {r.tasksDone}/{r.tasksTotal} cleared</div>}
      {r.parked.length > 0 && (
        <div className="panel" style={{ textAlign: 'left' }}>
          <h4>Items collected (parked thoughts)</h4>
          <ul style={{ margin: 0, paddingLeft: 20 }}>{r.parked.map((t, i) => <li key={i}>{t}</li>)}</ul>
          <CopyButton value={r.parked.join('\n')}>
            {({ copied, copy }) => <button className="gbtn ghost" style={{ marginTop: 10 }} onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>}
          </CopyButton>
        </div>
      )}

      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="gbtn" onClick={onAgain}>Go again</button>
        <button className="gbtn ghost" onClick={onBack}>Back to menu</button>
      </div>
    </div>
  );
}
