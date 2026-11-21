// SOKU-CHAN: an original anime-style mascot (soft, gentle, long wavy hair) drawn as inline SVG (no image files).
// Her expression ("mood") and her speech bubble are driven by the parent.

const SKIN = '#ffe9dc';
const HAIR = '#f6e6cf'; // soft champagne blonde
const HAIR2 = '#fffaf0';
const HAIR3 = '#dcbd98'; // shading
const HLINE = '#6b4d3a'; // soft brown line art for hair
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
  // soft little smile
  smile: <path d="M88 141 Q100 152 112 141" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />,
  open: (
    <>
      <path d="M87 137 Q100 162 113 137 Z" fill="#8a1d44" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M93 150 Q100 143 107 150 Q100 157 93 150 Z" fill="#ff7a96" />
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
  hype: { eyes: 'open', mouth: 'open', brow: 'up', sparkle: true },
  ultra: { eyes: 'open', iris: '#fff', mouth: 'open', brow: 'angry', sparkle: true, aura: true },
  smug: { eyes: 'lid', mouth: 'smirk', brow: 'smug' },
  cry: { eyes: 'open', mouth: 'cry', brow: 'sad', tears: true },
  sleep: { eyes: 'closed', mouth: 'o', brow: 'flat', zzz: true },
  wink: { eyes: 'wink', mouth: 'open', brow: 'up', hearts: true },
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

const Flower = ({ x, y, s = 1, d = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g className="clip" style={{ animationDelay: `${d}s` }}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-7" rx="4.6" ry="6.4" transform={`rotate(${a})`} fill="#fff" stroke="#e58aa8" strokeWidth="1.4" />
      ))}
      <circle r="3.6" fill="#ffd36b" stroke="#c98a1a" strokeWidth="1.2" />
    </g>
  </g>
);

// Soku-chan: a gentle, long-haired anime girl in a school blazer, with a flower hairpin and a ribbon.
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
        {/* long back hair */}
        <path d="M40 100 Q34 30 100 26 Q166 30 160 100 L168 168 Q176 206 158 238 L42 238 Q24 206 32 168 Z" className="hair" fill={HAIR} stroke={HLINE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M36 170 Q30 206 44 236 M164 170 Q170 206 156 236" stroke={HAIR3} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.8" />
        {/* school blazer, white blouse, ribbon */}
        <path d="M44 244 Q48 192 100 182 Q152 192 156 244 Z" fill="#27325e" stroke={INK} strokeWidth="2" />
        <path d="M82 184 L100 222 L118 184 Z" fill="#fff" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M82 184 L72 204 L94 214 Z M118 184 L128 204 L106 214 Z" fill="#33407a" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M100 206 L80 196 Q76 208 82 220 Z M100 206 L120 196 Q124 208 118 220 Z" fill="var(--c)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <path d="M96 210 L90 232 L100 226 L110 232 L104 210 Z" fill="var(--c)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        <circle cx="100" cy="206" r="6" fill="var(--c)" stroke={INK} strokeWidth="2" />
        <path d="M96 200 Q100 197 104 200" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* neck + face */}
        <path d="M90 150 H110 V186 Q100 192 90 186 Z" fill="#f3cdb8" />
        <path d="M44 104 Q44 54 100 52 Q156 54 156 104 Q156 142 130 158 Q100 172 70 158 Q44 142 44 104 Z" fill={SKIN} />
        {/* blush, tiny nose */}
        <ellipse className="blush" cx="64" cy="137" rx="12" ry="6.5" fill="#ff8fa3" opacity="0.55" />
        <ellipse className="blush" cx="136" cy="137" rx="12" ry="6.5" fill="#ff8fa3" opacity="0.55" />
        <path d="M57 135 l4 -6 M63 136 l4 -6 M69 135 l4 -6 M131 135 l4 -6 M137 136 l4 -6 M143 135 l4 -6" stroke="#ff6f91" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="100" cy="130" r="1.4" fill="#e0a08b" />
        {/* eyes, mouth, tears */}
        {eyes === 'shades' ? (
          <Shades />
        ) : (
          <>
            <Eye cx={76} mode={eyes} iris={m.iris} />
            <Eye cx={124} mode={eyes} iris={m.iris} />
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
        {/* wavy side locks that sway */}
        <g className="tail-l">
          <path d="M46 100 Q26 140 38 178 Q28 206 44 234 Q66 210 54 182 Q64 148 54 106 Z" className="hair" fill={HAIR} stroke={HLINE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M44 132 Q36 162 44 188 M49 122 Q46 150 50 172" stroke={HAIR3} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
        <g className="tail-r">
          <path d="M154 100 Q174 140 162 178 Q172 206 156 234 Q134 210 146 182 Q136 148 146 106 Z" className="hair" fill={HAIR} stroke={HLINE} strokeWidth="2" strokeLinejoin="round" />
          <path d="M156 132 Q164 162 156 188 M151 122 Q154 150 150 172" stroke={HAIR3} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
        {/* soft curtain bangs with a gentle part */}
        <path d="M43 108 Q36 40 100 32 Q164 40 157 108 Q152 92 142 84 Q128 80 112 60 Q106 82 84 90 Q64 94 52 106 Q47 108 43 108 Z" className="hair" fill={HAIR} stroke={HLINE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M70 52 Q86 40 106 40 M126 46 Q142 54 146 70 M60 84 Q72 72 80 62 M100 60 Q94 76 84 82" stroke={HAIR2} strokeWidth="3.2" fill="none" strokeLinecap="round" opacity="0.9" />
        {BROWS[m.brow] && BROWS[m.brow].map((d) => <path key={d} d={d} stroke="#6b4d3a" strokeWidth="2.8" fill="none" strokeLinecap="round" />)}
        {/* single curly ahoge */}
        <path className="ahoge" d="M96 38 Q90 16 108 12 Q118 18 108 27" stroke={HAIR} strokeWidth="4.6" fill="none" strokeLinecap="round" />
        <path className="ahoge" d="M96 38 Q90 16 108 12 Q118 18 108 27" stroke={HLINE} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55" />
        {/* ribbon on the right, flower hairpin on the left */}
        <g className="bow">
          <path d="M142 62 L120 48 Q114 62 120 76 Z M142 62 L164 48 Q170 62 164 76 Z" fill="var(--c)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="142" cy="62" r="5.5" fill="var(--c)" stroke={INK} strokeWidth="2" />
          <path d="M126 58 Q132 62 128 70 M158 58 Q152 62 156 70" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6" />
        </g>
        <Flower x={64} y={64} s={1.6} />
        <Flower x={50} y={86} s={1} d={0.35} />
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
