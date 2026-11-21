// Procedural music engine. Everything is synthesised with WebAudio, no audio files.
//
// Tune the music here: each style is just data. Patterns are 16-step strings (one bar):
//   drums/bass: 'x' = hit, '.' = rest
//   arp/lead:   a digit picks a chord tone (0 = root, 1, 2, 3), '.' = rest
// `prog` is the chord progression (one scale degree per bar, 4 bars), `bpm` is [depth 0, depth 4].
export const STYLES = {
  synthwave: {
    label: 'Synthwave', bpm: [106, 151], root: 45, scale: [0, 2, 3, 5, 7, 8, 10], tones: [0, 2, 4, 7],
    prog: [0, 5, 2, 6], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
    bass: 'x.xxx.xxx.xxx.xx', arp: '0121012301210123', lead: '0...2...1...3...',
    arpWave: 'sawtooth', swing: 0, drums: 1,
  },
  techno: {
    label: 'Techno Pulse', bpm: [143, 184], root: 43, scale: [0, 2, 3, 5, 7, 8, 10], tones: [0, 2, 4, 7],
    prog: [0, 0, 5, 3], kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.',
    bass: '.xx..xx..xx..xx.', arp: '0.2.0.2.1.3.1.3.', lead: '0.......2.......',
    arpWave: 'square', swing: 0, drums: 1.1,
  },
  dnb: {
    label: 'Drum & Bass', bpm: [173, 216], root: 41, scale: [0, 2, 3, 5, 7, 8, 10], tones: [0, 2, 4, 7],
    prog: [0, 5, 3, 6], kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
    bass: 'x.....x...x.x...', arp: '0.1.2.3.2.1.0.1.', lead: '2.......3.......',
    arpWave: 'sawtooth', swing: 0, drums: 1,
  },
  lofi: {
    label: 'Lo-fi Chill', bpm: [81, 109], root: 48, scale: [0, 2, 4, 5, 7, 9, 11], tones: [0, 2, 4, 6],
    prog: [1, 4, 0, 5], kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.',
    bass: 'x.....x.....x...', arp: '0.1.2.1.0.1.2.3.', lead: '2.......1.......',
    arpWave: 'triangle', swing: 0.22, drums: 0.9,
  },
  ambient: {
    label: 'Half-time Groove', bpm: [80, 110], root: 48, scale: [0, 2, 3, 5, 7, 8, 10], tones: [0, 2, 4, 7],
    prog: [0, 5, 3, 4], kick: 'x.....x...x.....', snare: '........x.......', hat: 'x.x.x.x.x.x.x.x.',
    bass: 'x.....x...x.x...', arp: '0.1.2.3.2.1.0.1.', lead: '2.......3.......',
    arpWave: 'triangle', swing: 0.1, drums: 0.9,
  },
};

// Which depth each layer enters at.
// Everything is a drum or a short stab, no sustained pads, so the beat is on from the first second.
const LAYER_AT = { kick: 0, hat: 0, snare: 1, bass: 2, arp: 2, lead: 3, extra: 4 };

const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12);
const lerp = (a, b, t) => a + (b - a) * t;
const BINAURAL = { theta: 6, alpha: 10, beta: 18, gamma: 40 };

export class Music {
  constructor() {
    this.ctx = null;
    this.running = false;
    this.style = STYLES.synthwave;
    this.depth = 0;
    this.onBreak = false;
    this.muted = false;
    this.volume = 0.6;
    this.listeners = new Set();
    this.step = 0;
  }

  // Must be called from a click so the browser lets audio play.
  start({ style, depth = 0, volume, noise, binaural }) {
    this.stop();
    this.ensureContext();
    this.ctx.resume();
    this.style = STYLES[style] || null; // null = music off (noise / binaural only)
    this.depth = depth;
    this.onBreak = false;
    this.volume = volume;
    this.applyVolume(0.6);
    this.applyFilter();
    this.setAmbient(noise, binaural);
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.15;
    this.running = true;
    this.timer = new Worker(
      URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 50)'], { type: 'text/javascript' })),
    );
    this.timer.onmessage = () => this.schedule();
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this.timer.terminate();
    this.setAmbient(false, 'off');
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
  }

  setDepth(depth) {
    if (!this.running) return;
    const up = depth > this.depth;
    this.depth = depth;
    if (up && this.style && !this.onBreak) this.riser();
    this.applyFilter();
  }

  // Breaks (and pauses) strip the music back to a muffled, quieter beat.
  setBreak(on) {
    this.onBreak = on;
    this.applyVolume(0.3);
    this.applyFilter();
  }

  setMuted(on) {
    this.muted = on;
    this.applyVolume(0.15);
  }

  setVolume(v) {
    this.volume = v;
    this.applyVolume(0.1);
  }

  setAmbient(noise, binaural) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    if (noise && !this.noiseSrc) {
      this.noiseSrc = ctx.createBufferSource();
      this.noiseSrc.buffer = this.brownBuffer();
      this.noiseSrc.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0.2;
      this.noiseSrc.connect(g).connect(this.master);
      this.noiseSrc.start();
    } else if (!noise && this.noiseSrc) {
      this.noiseSrc.stop();
      this.noiseSrc = null;
    }
    this.beatOsc?.forEach((o) => o.stop());
    this.beatOsc = null;
    if (binaural !== 'off' && BINAURAL[binaural]) {
      // Left ear 200 Hz, right ear 200 Hz + beat. Needs headphones.
      const merger = ctx.createChannelMerger(2);
      const g = ctx.createGain();
      g.gain.value = 0.12;
      merger.connect(g).connect(this.master);
      this.beatOsc = [200, 200 + BINAURAL[binaural]].map((hz, ear) => {
        const o = ctx.createOscillator();
        o.frequency.value = hz;
        o.connect(merger, 0, ear);
        o.start();
        return o;
      });
    }
  }

  // Big impact for the giant BOOM! popups.
  boom() {
    if (!this.running) return;
    const t = this.ctx.currentTime;
    this.kick(t, 1.5);
    this.noiseHit(t, 0.6, 0.35, 'lowpass', 1600);
  }

  // Warning siren: four alternating notes.
  siren() {
    if (!this.running) return;
    const t = this.ctx.currentTime;
    for (let k = 0; k < 6; k++) this.tone(t + k * 0.17, k % 2 ? 84 : 77, 'sawtooth', 0.16, 0.01, 0.08, this.drums, 3000);
  }

  // Little "voice" blips while the mascot talks.
  babble(n = 6) {
    if (!this.running) return;
    const t = this.ctx.currentTime;
    for (let k = 0; k < n; k++) this.tone(t + k * 0.055, 76 + Math.floor(Math.random() * 12), 'triangle', 0.06, 0.003, 0.09, this.drums);
  }

  // Short two-note chirp for popups and achievements.
  blip(midi = 84) {
    if (!this.running) return;
    const t = this.ctx.currentTime;
    this.tone(t, midi, 'square', 0.07, 0.002, 0.1, this.drums);
    this.tone(t + 0.06, midi + 7, 'square', 0.1, 0.002, 0.1, this.drums);
  }

  // Calls fn(stepInBar, bar) on every quarter note, aligned with what you hear. Returns an unsubscribe function.
  onBeat(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // Bass / mid / high energy (0..1) for the visuals.
  energy() {
    if (!this.analyser || !this.running) return { bass: 0, mid: 0, high: 0 };
    this.analyser.getByteFrequencyData(this.bins);
    const avg = (a, b) => {
      let s = 0;
      for (let i = a; i < b; i++) s += this.bins[i];
      return s / (b - a) / 255;
    };
    return { bass: avg(0, 4), mid: avg(4, 24), high: avg(24, 100) };
  }

  // ---- audio graph ----

  ensureContext() {
    if (this.ctx) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    // melodic -> filter -> compressor -> master -> analyser -> speakers. Drums skip the "duck" gain.
    this.mel = ctx.createGain();
    this.drums = ctx.createGain();
    this.drums.gain.value = 1.25;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    const comp = ctx.createDynamicsCompressor(); // glues the mix and lets it run loud
    comp.threshold.value = -22;
    comp.knee.value = 8;
    comp.ratio.value = 8;
    comp.attack.value = 0.004;
    comp.release.value = 0.12;
    const limiter = ctx.createDynamicsCompressor(); // brick-wall limiter so the louder master never clips
    limiter.threshold.value = -2;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.06;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.mel.connect(this.filter);
    this.drums.connect(this.filter);
    // soft clipper as a last guard: transients that slip past the limiter are rounded off instead of clipping
    const clip = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / 1023) * 2 - 1) * 1.6) / Math.tanh(1.6) * 0.95;
    clip.curve = curve;
    this.filter.connect(comp).connect(this.master).connect(limiter).connect(clip).connect(this.analyser).connect(ctx.destination);
    // A feedback delay on the melodic bus.
    this.delay = ctx.createDelay(2);
    const fb = ctx.createGain();
    fb.gain.value = 0.18;
    const send = ctx.createGain();
    send.gain.value = 0.1;
    this.mel.connect(send).connect(this.delay);
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(this.filter);
    // One second of white noise, reused by snare, hats and risers.
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    this.noise.getChannelData(0).forEach((_, i, d) => (d[i] = Math.random() * 2 - 1));
  }

  brownBuffer() {
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * 8, sr);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3;
    }
    const fade = Math.floor(sr * 0.03); // fade the ends so the loop does not click
    for (let i = 0; i < fade; i++) d[i] *= i / fade, d[d.length - 1 - i] *= i / fade;
    return buf;
  }

  applyVolume(seconds) {
    const duck = this.onBreak ? 0.55 : 1;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume * 2.4 * duck, this.ctx.currentTime, seconds);
  }

  applyFilter() {
    const hz = this.onBreak ? 700 : this.layers().extra ? 6000 : 18000;
    this.filter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.4);
  }

  layers() {
    const d = this.onBreak ? 0 : this.depth;
    const on = {};
    for (const k in LAYER_AT) on[k] = d >= LAYER_AT[k];
    return on;
  }

  // ---- scheduler: plays the next few steps ahead of the audio clock ----

  schedule() {
    const s = this.style;
    if (!s) return;
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const d = this.onBreak ? 0 : this.depth;
      const bpm = lerp(s.bpm[0], s.bpm[1], d / 4);
      const stepLen = 60 / bpm / 4;
      const swing = this.step % 2 ? s.swing * stepLen : 0;
      this.delay.delayTime.value = (60 / bpm) * 0.5;
      this.playStep(this.step % 64, this.nextTime + swing, stepLen);
      this.nextTime += stepLen;
      this.step++;
    }
  }

  playStep(n, t, stepLen) {
    const s = this.style;
    const L = this.layers();
    const i = n % 16;
    const bar = Math.floor(n / 16);
    const note = (deg) => s.root + s.scale[((deg % 7) + 7) % 7] + 12 * Math.floor(deg / 7);
    const chord = s.tones.map((offset) => note(s.prog[bar] + offset));
    const hit = (pattern) => pattern[i] === 'x';
    const tone = (pattern) => (/\d/.test(pattern[i]) ? chord[Number(pattern[i])] : null);

    if (i % 2 === 0) {
      const delay = Math.max(0, (t - this.ctx.currentTime) * 1000);
      setTimeout(() => this.listeners.forEach((fn) => fn(i, bar)), delay);
    }
    if (L.kick && hit(s.kick)) {
      this.kick(t, s.drums);
      this.mel.gain.setValueAtTime(0.3, t); // sidechain pump
      this.mel.gain.linearRampToValueAtTime(1, t + 0.2);
    }
    if (L.snare && i % 4 === 0 && !hit(s.kick)) this.kick(t, s.drums * 0.85); // four on the floor from the 2nd form
    if (L.snare && hit(s.snare)) this.snare(t, s.drums);
    if (L.snare && i % 2 === 0 && !hit(s.hat)) this.hat(t, 0.13 * s.drums, 0.03);
    if (L.hat && hit(s.hat)) this.hat(t, 0.4 * s.drums, 0.04);
    if (L.extra && i % 2 === 1) this.hat(t, 0.14 * s.drums, 0.03);
    if (L.extra && bar === 3 && i >= 8) this.snare(t, s.drums * (0.35 + (i - 8) * 0.07)); // rising snare roll // fill into the loop
    if (L.bass && hit(s.bass)) this.tone(t, chord[0], 'sawtooth', stepLen * 1.6, 0.01, 0.22, this.mel, 500);
    if (L.extra && i % 4 === 0) chord.forEach((m) => this.tone(t, m + 12, 'sawtooth', stepLen * 2.5, 0.004, 0.05, this.mel, 4500)); // chord stabs
    if (L.extra && i % 2 === 1) this.tone(t, chord[(i >> 1) % 4] + 24, s.arpWave, stepLen, 0.003, 0.05, this.mel, 5000); // fast octave arp
    if (L.extra && hit(s.bass)) this.tone(t, chord[0] - 12, 'square', stepLen * 1.6, 0.01, 0.16, this.mel, 300); // sub layer
    const arp = L.arp && tone(s.arp);
    if (arp) this.tone(t, arp + 12, s.arpWave, stepLen * 1.5, 0.005, 0.09, this.mel, 3000);
    const lead = L.lead && tone(s.lead);
    if (lead) this.tone(t, lead + 24, 'square', stepLen * 1.2, 0.002, 0.08, this.mel, 6000); // short stab
  }

  // ---- voices ----

  // Oscillator -> (optional lowpass pluck) -> gain envelope -> bus.
  tone(t, midi, type, dur, attack, gain, bus, cutoff) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = midiToHz(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + Math.min(attack, dur / 2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (cutoff) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(cutoff, t);
      f.frequency.exponentialRampToValueAtTime(cutoff / 5, t + dur);
      o.connect(f);
      node = f;
    }
    node.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  kick(t, vol) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.09);
    g.gain.setValueAtTime(1.3 * vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); // short and tight
    o.connect(g).connect(this.drums);
    o.start(t);
    o.stop(t + 0.32);
    this.noiseHit(t, 0.5 * vol, 0.015, 'highpass', 3000); // beater click
  }

  noiseHit(t, vol, dur, type, freq) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.drums);
    src.start(t, Math.random() * Math.max(0, 0.98 - dur));
    src.stop(t + dur + 0.02);
  }

  snare(t, vol) {
    this.noiseHit(t, 0.7 * vol, 0.18, 'bandpass', 2200);
    this.tone(t, 55, 'triangle', 0.12, 0.002, 0.3 * vol, this.drums);
  }

  hat(t, vol, dur) {
    this.noiseHit(t, vol, dur, 'highpass', 7500);
  }

  // Drum roll that speeds up into a big kick + crash. Plays when you reach a new form.
  riser() {
    let at = this.ctx.currentTime;
    for (let k = 0; k < 14; k++) {
      this.snare(at, 0.3 + k * 0.06);
      at += 0.17 - k * 0.01;
    }
    this.kick(at, 1.5);
    this.snare(at, 1);
    this.noiseHit(at, 0.5, 0.5, 'highpass', 6000);
  }
}
