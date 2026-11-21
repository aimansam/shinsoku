// SOKU-CHAN: an original chibi anime mascot drawn as inline SVG (no image files).
// Her expression ("mood") and her speech bubble are driven by the parent.

const SKIN = '#ffe9dc';
const HAIR = '#7a5cff';
const HAIR2 = '#b3a3ff';
const PINK = '#ff9ec4';
const INK = '#1a1030';
const EYE_Y = 116;

const BROWS = {
  flat: ['M62 92 Q74 88 86 91', 'M114 91 Q126 88 138 92'],
  up: ['M62 88 Q74 83 86 87', 'M114 87 Q126 83 138 88'],
  angry: ['M60 86 L88 96', 'M140 86 L112 96'],
  sad: ['M60 97 L88 89', 'M140 97 L112 89'],
  smug: ['M62 93 Q74 91 86 93', 'M114 84 Q126 80 138 87'],
};

const MOUTHS = {
  // cat "w" mouth with one tiny fang
  smile: (
    <>
      <path d="M86 137 Q93 146 100 137 Q107 146 114 137" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M90 142 L93 149 L96 143 Z" fill="#fff" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
    </>
  ),
  open: (
    <>
      <path d="M86 134 Q100 164 114 134 Z" fill="#8a1d44" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M93 150 Q100 143 107 150 Q100 158 93 150 Z" fill="#ff7a96" />
      <path d="M88 135 L91 142 L94 136 Z" fill="#fff" />
    </>
  ),
  smirk: (
    <>
      <path d="M88 140 Q104 150 116 133" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M118 131 L121 136" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  cry: <path d="M88 148 Q94 139 100 148 Q106 157 112 148" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />,
  o: <ellipse cx="100" cy="143" rx="4.5" ry="5.5" fill="#8a1d44" stroke={INK} strokeWidth="2" />,
};

// mood -> which parts to draw
const MOODS = {
  focus: { eyes: 'open', mouth: 'smile', brow: 'flat' },
  hype: { eyes: 'open', mouth: 'open', brow: 'up', sparkle: true, paws: true },
  ultra: { eyes: 'open', iris: '#fff', mouth: 'open', brow: 'angry', sparkle: true, aura: true },
  smug: { eyes: 'lid', mouth: 'smirk', brow: 'smug' },
  cry: { eyes: 'open', mouth: 'cry', brow: 'sad', tears: true },
  sleep: { eyes: 'closed', mouth: 'o', brow: 'flat', zzz: true },
  wink: { eyes: 'wink', mouth: 'open', brow: 'up', hearts: true, paws: true },
  shades: { eyes: 'shades', mouth: 'open', brow: 'none' },
  shock: { eyes: 'shock', mouth: 'o', brow: 'up', sweat: true },
};

const Shades = () => (
  <g className="shades">
    <rect x="50" y="102" width="46" height="26" rx="9" fill="#111" stroke="#000" strokeWidth="2" />
    <rect x="104" y="102" width="46" height="26" rx="9" fill="#111" stroke="#000" strokeWidth="2" />
    <path d="M96 110 H104 M42 106 L50 108 M158 106 L150 108" stroke="#111" strokeWidth="4" />
    <path d="M58 109 L72 109 M112 109 L126 109" stroke="#fff" strokeWidth="2.8" opacity="0.75" strokeLinecap="round" />
  </g>
);

function Eye({ cx, mode, iris = 'var(--c)' }) {
  const cy = EYE_Y;
  const out = cx < 100 ? -1 : 1; // which way is "outside"
  if (mode === 'shock')
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx="16" ry="20" fill="#fff" stroke={INK} strokeWidth="2.5" />
        <circle cx={cx} cy={cy} r="3.6" fill={INK} />
      </g>
    );
  if (mode === 'closed') return <path d={`M${cx - 15} ${cy} Q${cx} ${cy + 11} ${cx + 15} ${cy}`} stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />;
  if (mode === 'wink') return <path d={`M${cx - 15} ${cy + 3} Q${cx} ${cy - 14} ${cx + 15} ${cy + 3}`} stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />;
  const lid = mode === 'lid';
  const glow = iris === '#fff';
  const lash = lid ? cy + 1 : cy - 12;
  return (
    <g className="blink" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <ellipse cx={cx} cy={cy} rx="16" ry="20" fill="#fff" />
      <ellipse cx={cx} cy={cy + 2} rx="12.5" ry="17" fill={iris} stroke={glow ? 'var(--c)' : 'none'} strokeWidth="2.5" />
      {!glow && <ellipse cx={cx} cy={cy + 3} rx="6.5" ry="10.5" fill={INK} />}
      <circle cx={cx - 5} cy={cy - 6} r="5.4" fill="#fff" />
      <circle cx={cx + 5} cy={cy + 9} r="2.6" fill="#fff" />
      <circle cx={cx + 7} cy={cy - 2} r="1.6" fill="#fff" />
      {lid && <path d={`M${cx - 19} ${cy - 24} H${cx + 19} V${cy + 1} H${cx - 19} Z`} fill={SKIN} />}
      <path d={`M${cx - 18} ${lash} Q${cx} ${lid ? cy + 4 : cy - 26} ${cx + 18} ${lash}`} stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d={`M${cx + out * 18} ${lash} l${out * 6} -3`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

const Star = ({ x, y, s = 1, d = 0 }) => (
  <path className="twinkle" style={{ animationDelay: `${d}s` }} transform={`translate(${x} ${y}) scale(${s})`} fill="#fff"
    d="M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2Z" />
);

const Heart = ({ x, y, s = 1, d = 0 }) => (
  <path className="float-heart" style={{ animationDelay: `${d}s` }} transform={`translate(${x} ${y}) scale(${s})`} fill="#ff5c93" stroke="#fff" strokeWidth="1.5"
    d="M0 7 C-14 -3 -8 -14 0 -6 C8 -14 14 -3 0 7Z" />
);

const Paw = ({ x, cls }) => (
  <g className={`paw ${cls}`} style={{ transformOrigin: `${x}px 150px` }}>
    <circle cx={x} cy="138" r="14" fill={SKIN} stroke={INK} strokeWidth="2" />
    <ellipse cx={x} cy="142" rx="6" ry="5" fill={PINK} />
    <circle cx={x - 7} cy="133" r="2.6" fill={PINK} />
    <circle cx={x} cy="130" r="2.6" fill={PINK} />
    <circle cx={x + 7} cy="133" r="2.6" fill={PINK} />
  </g>
);

export function Soku({ mood = 'focus', size = 190 }) {
  const m = MOODS[mood] || MOODS.focus;
  const eyes = m.eyes;
  return (
    <svg className={`mascot-svg mood-${mood}`} viewBox="0 0 200 240" width={size} height={size * 1.2} role="img" aria-label="Soku-chan, the mascot">
      <defs>
        <radialGradient id="aura">
          <stop offset="0" style={{ stopColor: 'var(--c)', stopOpacity: 0.85 }} />
          <stop offset="1" style={{ stopColor: 'var(--c)', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      {m.aura && <circle className="aura" cx="100" cy="115" r="105" fill="url(#aura)" />}
      <g className="bob">
        {/* curly twin tails + back hair */}
        <g className="tail-l"><path d="M48 88 Q8 96 12 146 Q14 176 40 188 Q22 150 54 124 Z" className="hair" fill={HAIR} /></g>
        <g className="tail-r"><path d="M152 88 Q192 96 188 146 Q186 176 160 188 Q178 150 146 124 Z" className="hair" fill={HAIR} /></g>
        <path d="M42 100 Q36 40 100 34 Q164 40 158 100 L166 170 Q132 156 100 158 Q68 156 34 170 Z" className="hair" fill={HAIR} />
        {/* neko ears */}
        <g className="ear-l"><path d="M46 78 L36 20 L90 50 Z" className="hair" fill={HAIR} /><path d="M52 68 L47 36 L78 52 Z" fill={PINK} /></g>
        <g className="ear-r"><path d="M154 78 L164 20 L110 50 Z" className="hair" fill={HAIR} /><path d="M148 68 L153 36 L122 52 Z" fill={PINK} /></g>
        {/* little uniform */}
        <path d="M54 244 Q58 188 100 178 Q142 188 146 244 Z" fill="#23264d" />
        <path d="M82 180 L100 200 L118 180 L110 176 L100 186 L90 176 Z" fill="#fff" />
        <path d="M100 194 L86 186 L86 202 Z M100 194 L114 186 L114 202 Z" fill="var(--c)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="100" cy="194" r="4" fill="var(--c)" stroke={INK} strokeWidth="2" />
        {/* neck + big round face */}
        <rect x="91" y="152" width="18" height="28" fill="#f3cdb8" />
        <ellipse cx="100" cy="106" rx="58" ry="54" fill={SKIN} />
        {/* blush with hatch lines, tiny nose */}
        <ellipse className="blush" cx="62" cy="136" rx="11" ry="6.5" fill="#ff8fa3" opacity="0.6" />
        <ellipse className="blush" cx="138" cy="136" rx="11" ry="6.5" fill="#ff8fa3" opacity="0.6" />
        <path d="M55 134 l4 -6 M61 135 l4 -6 M67 134 l4 -6 M129 134 l4 -6 M135 135 l4 -6 M141 134 l4 -6" stroke="#ff6f91" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="100" cy="128" r="1.5" fill="#e0a08b" />
        {/* eyes, mouth, tears */}
        {eyes === 'shades' ? (
          <Shades />
        ) : (
          <>
            <Eye cx={74} mode={eyes} iris={m.iris} />
            <Eye cx={126} mode={eyes} iris={m.iris} />
          </>
        )}
        {m.sweat && <path className="tear" d="M150 90 Q143 106 150 116 Q158 106 150 90 Z" fill="#7fd4ff" stroke="#2a8ccf" strokeWidth="1.5" />}
        {m.tears && (
          <>
            <path className="tear" d="M62 138 Q54 156 62 168 Q70 156 62 138 Z" fill="#7fd4ff" stroke="#2a8ccf" strokeWidth="1.5" />
            <path className="tear" style={{ animationDelay: '0.45s' }} d="M138 138 Q130 156 138 168 Q146 156 138 138 Z" fill="#7fd4ff" stroke="#2a8ccf" strokeWidth="1.5" />
          </>
        )}
        {MOUTHS[m.mouth]}
        {/* hair front: bangs, side locks */}
        <path d="M44 100 Q42 46 100 40 Q158 46 156 100 Q148 76 136 70 L128 92 L114 64 L100 94 L86 64 L72 92 L64 70 Q52 76 44 100 Z" className="hair" fill={HAIR} />
        <path d="M46 100 Q38 130 46 162 Q54 130 60 104 Z M154 100 Q162 130 154 162 Q146 130 140 104 Z" className="hair" fill={HAIR} />
        <path d="M70 58 Q82 48 98 48" stroke={HAIR2} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85" />
        {BROWS[m.brow] && BROWS[m.brow].map((d) => <path key={d} d={d} stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />)}
        {/* hair clips (left) and a bow (right) */}
        <path className="clip" transform="translate(58 72)" d="M0 -9 L2.6 -2.6 L9 0 L2.6 2.6 L0 9 L-2.6 2.6 L-9 0 L-2.6 -2.6Z" fill="var(--c)" stroke={INK} strokeWidth="1.8" />
        <path className="clip" style={{ animationDelay: '0.3s' }} transform="translate(74 60) scale(0.7)" d="M0 -9 L2.6 -2.6 L9 0 L2.6 2.6 L0 9 L-2.6 2.6 L-9 0 L-2.6 -2.6Z" fill="var(--c)" stroke={INK} strokeWidth="1.8" />
        <g className="bow">
          <path d="M146 62 L126 50 L126 74 Z M146 62 L166 50 L166 74 Z" fill={PINK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="146" cy="62" r="5.5" fill="#ff5c93" stroke={INK} strokeWidth="2" />
        </g>
        {/* heart-tipped ahoge */}
        <path className="ahoge" d="M100 42 Q95 24 108 14" stroke={HAIR} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path className="ahoge-heart" transform="translate(110 11) scale(1.3)" d="M0 5 C-9 -4 -5 -11 0 -5 C5 -11 9 -4 0 5Z" fill="#ff5c93" stroke={INK} strokeWidth="1.4" />
        {m.paws && (
          <>
            <Paw x={44} cls="paw-l" />
            <Paw x={156} cls="paw-r" />
          </>
        )}
        {m.zzz && <text className="zzz" x="144" y="70">Z</text>}
        {m.sparkle && (
          <>
            <Star x={22} y={62} s={1.1} />
            <Star x={180} y={50} s={1.4} d={0.2} />
            <Star x={176} y={156} s={0.9} d={0.4} />
            <Star x={18} y={150} s={1.2} d={0.3} />
          </>
        )}
        {m.hearts && (
          <>
            <Heart x={24} y={70} s={1.1} />
            <Heart x={178} y={60} s={1.3} d={0.35} />
            <Heart x={170} y={150} s={0.9} d={0.7} />
          </>
        )}
      </g>
    </svg>
  );
}

// character + speech bubble (the bubble pops again every time `id` changes)
export default function Mascot({ mood, text, id, size, beatRef }) {
  return (
    <>
      {text && <div key={id} className="bubble">{text}</div>}
      <div ref={beatRef} className="beat-wrap"><Soku mood={mood} size={size} /></div>
    </>
  );
}
