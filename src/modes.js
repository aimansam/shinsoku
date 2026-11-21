// Data + small helpers shared by the UI. No React in here.

// Hidden testing aid: open the app with ?speed=60 to run the clock 60x faster.
export const SPEED = Math.max(1, Number(new URLSearchParams(location.search).get('speed')) || 1);
const T0 = Date.now();
export const now = () => T0 + (Date.now() - T0) * SPEED;

// Activity modes only set defaults. Nothing here reacts to tabs or windows.
export const MODES = {
  study: { label: 'Study', kanji: '学', hue: 190, focus: 50, brk: 10, music: 'lofi' },
  work: { label: 'Deep Work', kanji: '集', hue: 265, focus: 90, brk: 15, music: 'synthwave' },
  gaming: { label: 'Gaming', kanji: '遊', hue: 0, focus: 60, brk: 10, music: 'techno' },
  creative: { label: 'Creative', kanji: '創', hue: 320, focus: 45, brk: 10, music: 'ambient' },
  reading: { label: 'Reading', kanji: '読', hue: 130, focus: 30, brk: 5, music: 'ambient' },
  custom: { label: 'Custom', kanji: '自', hue: 30, focus: 25, brk: 5, music: 'synthwave' },
};

// The Depth Ladder: minutes of uninterrupted flow needed for each level.
export const DEPTHS = [
  { name: 'BASE FORM', kanji: '起動', at: 0, hue: 195 },
  { name: 'AWAKENED', kanji: '覚醒', at: 5, hue: 165 },
  { name: 'SUPER', kanji: '超', at: 15, hue: 265 },
  { name: 'ULTRA', kanji: '極', at: 30, hue: 315 },
  { name: 'LIMIT BREAK', kanji: '限界突破', at: 60, hue: 45 },
];
export const BREAK_HUE = 150;

export const depthOf = (flowSec) =>
  DEPTHS.reduce((d, x, i) => (flowSec >= x.at * 60 ? i : d), 0);

export const DEFAULT_SETTINGS = {
  mode: 'study',
  focus: 50,
  brk: 10,
  rounds: 2,
  music: 'lofi',
  intensity: 'max',
  volume: 80,
  noise: false,
  binaural: 'off',
  strict: false,
};

export const fmtTime = (sec) => {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600);
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
};

// Score = how deep you went, how much of the plan you did, how few breaks.
export function summarize({ focusSec, planned, max, breaks }) {
  const minutes = focusSec / 60;
  const raw = 40 * (max / 4) + 40 * Math.min(1, focusSec / planned) + 20 * Math.max(0, 1 - breaks / 5);
  const score = Math.min(100, Math.max(0, Math.round(raw)));
  const grade = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
  const xp = Math.max(0, Math.round(minutes * (1 + 0.25 * max) - 4 * breaks));
  return { minutes, score, grade, xp };
}

const TITLES = ['Drifter', 'Initiate', 'Operator', 'Specialist', 'Deep Diver', 'Flow Adept', 'Hyperfocus', 'Monk Mode', 'Singularity'];
export const levelOf = (xp) => Math.floor(Math.sqrt(xp / 50)) + 1;
export const levelTitle = (level) => TITLES[Math.min(level - 1, TITLES.length - 1)];
export const levelProgress = (xp) => {
  const L = levelOf(xp);
  const lo = 50 * (L - 1) ** 2;
  const hi = 50 * L ** 2;
  return ((xp - lo) / (hi - lo)) * 100;
};

const dayKey = (d) => d.toLocaleDateString('en-CA'); // yyyy-mm-dd in local time

export function statsOf(history) {
  const byDay = {};
  let total = 0;
  let xp = 0;
  for (const s of history) {
    byDay[s.day] = (byDay[s.day] || 0) + s.minutes;
    total += s.minutes;
    xp += s.xp;
  }
  const d = new Date();
  const today = byDay[dayKey(d)] || 0;
  if (!today) d.setDate(d.getDate() - 1); // a streak survives until the day is over
  let streak = 0;
  while (byDay[dayKey(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return { today: Math.round(today), streak, hours: total / 60, xp, sessions: history.length };
}

export const todayKey = () => dayKey(new Date());
