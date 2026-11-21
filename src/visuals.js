// Audio-reactive background. One fullscreen WebGL fragment shader (a warping tunnel with fractal
// flow), driven by the music's bass/mid/high energy and the current depth.
// Falls back to a simple 2D canvas if WebGL is not available.

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uI, uBass, uMid, uHigh, uBeat, uHue, uShock, uShake;

// real hue (0..1), so the shader colour matches the accent colour of the UI
vec3 pal(float t) { return 0.12 + 0.88 * clamp(abs(mod(t * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }

vec3 scene(vec2 p) {
  float t = uTime * (1.4 + 6.0 * uI) + uBass * 0.6;
  float r = length(p);
  float a = atan(p.y, p.x);

  // tunnel coordinates: angle around, depth along
  vec2 q = vec2(a * (3.0 + 5.0 * uI) / 6.28318, 0.35 / (r + 0.08) + t);
  float rings = pow(0.5 + 0.5 * sin(q.y * 6.28318 * (0.9 + 1.3 * uI)), 5.0);
  float spokes = pow(0.5 + 0.5 * cos(q.x * 6.28318 * 2.0 + q.y * 2.0), 10.0);

  // fractal fold
  vec2 f = p * (1.4 + uBass * 0.5);
  float acc = 0.0;
  for (int i = 0; i < 6; i++) {
    f = abs(f) / (dot(f, f) + 0.02) - vec2(0.9 + 0.1 * sin(t * 0.3), 0.6 + 0.1 * cos(t * 0.2));
    acc += exp(-length(f) * 1.6);
  }

  vec3 col = pal(uHue + q.y * 0.03 + r * 0.25) * (rings * (0.5 + uBass * 1.2) + spokes * (0.25 + uMid)
           + acc * (0.05 + 0.18 * uI));
  col += pal(uHue + 0.1) * 0.03 / (r + 0.04) * (0.4 + uBeat * 1.5);       // glow in the middle
  col += pal(uHue + 0.5) * uHigh * 0.35 * rings;                            // sparkle on high notes
  float wave = exp(-pow((r - uShock * 1.6) * 5.0, 2.0)) * (1.0 - uShock);   // depth-up shockwave
  col += vec3(1.0) * wave * 1.2;
  // anime speed lines: random streaks around the centre, re-rolled 20 times a second
  float seg = floor(a * (60.0 + 40.0 * uI));
  float h = fract(sin(seg * 91.7 + floor(uTime * 32.0) * 13.1) * 43758.5);
  float streak = step(0.72 - 0.3 * uI, h) * smoothstep(0.18, 0.95, r);
  col += mix(pal(uHue), vec3(1.0), 0.6) * streak * (0.3 + 0.55 * uI) * (0.7 + 1.4 * uBeat);
  col += vec3(1.0) * pow(1.0 - uShock, 2.0) * 0.9;                          // full-screen flash on depth-up
  col *= smoothstep(1.7, 0.25, r) * (0.38 + 0.3 * uI) * (1.0 + uBeat * 1.0);
  // radial zoom-blur flash from the centre on every beat
  col += pal(uHue + 0.15) * uBeat * uBeat * 0.4 * smoothstep(0.1, 1.2, r) * (0.4 + uI);
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float k = smoothstep(0.45, 0.9, uI);                                      // high forms: kaleidoscope + spin + punch
  uv *= 1.0 - uBeat * 0.16 * uI;                                            // zoom punch on the beat
  float ang = uTime * 0.25 * k + uBass * 0.4 * k;
  uv = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * uv;
  float seg = 6.28318 / 8.0;
  float fa = abs(mod(atan(uv.y, uv.x), seg) - seg * 0.5);
  uv = mix(uv, length(uv) * vec2(cos(fa), sin(fa)), k);
  float row = floor(gl_FragCoord.y / (uRes.y / 18.0));                      // glitch: rows slide sideways on hard beats
  float gl = step(0.78, fract(sin(row * 12.9 + floor(uTime * 14.0) * 78.2) * 43758.5)) * step(0.35, uBeat) * k;
  uv.x += gl * 0.12 * (fract(row * 0.37) - 0.5);
  uv += uShake * vec2(sin(uTime * 61.0), cos(uTime * 47.0));
  vec2 dir = normalize(uv + 1e-4) * (0.004 + 0.045 * uI * (uBeat + uBass * 0.8)); // chromatic aberration
  vec3 c = vec3(scene(uv + dir).r, scene(uv).g, scene(uv - dir).b);
  c = pow(1.0 - exp(-c * 0.9), vec3(1.7)); // contrast curve: deep blacks, bright cores // soft tone map so the bright depths do not burn out to white
  c = mix(c, floor(c * 4.0 + 0.5) / 4.0, 0.5); // cel shading: a few flat tones, like an anime frame
  c *= 0.88 + 0.12 * smoothstep(0.25, 0.5, length(fract(gl_FragCoord.xy / 7.0) - 0.5)); // halftone dots
  gl_FragColor = vec4(c, 1.0);
}`;

const LEVEL = { chill: 0.6, hyper: 1.6, max: 2.3 }; // user-selectable intensity

export function startVisuals(canvas, music) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // state the animation eases towards
  const s = { depth: 0, hue: 195, level: 'hyper', I: 0.1, curHue: 195, beat: 0, shock: 1, bass: 0, mid: 0, high: 0 };
  const api = {
    // depth 0..4, hue in degrees
    setDepth(depth, hue) { s.depth = depth; s.hue = hue; },
    setLevel(level) { s.level = level; },
    depth() { return s.depth; },
    pulse(strength = 1) { s.beat = Math.max(s.beat, strength); },
    shock() { s.shock = 0; },
    destroy() { cancelAnimationFrame(raf); removeEventListener('resize', resize); },
  };

  const resize = () => {
    const scale = gl ? 0.6 : 1; // render the shader at lower resolution, the GPU cost drops a lot
    canvas.width = Math.round(innerWidth * scale);
    canvas.height = Math.round(innerHeight * scale);
    gl?.viewport(0, 0, canvas.width, canvas.height);
  };
  addEventListener('resize', resize);
  resize();

  let draw;
  if (gl) {
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      return sh;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one big triangle
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (name) => gl.getUniformLocation(prog, name);
    const U = Object.fromEntries(
      ['uRes', 'uTime', 'uI', 'uBass', 'uMid', 'uHigh', 'uBeat', 'uHue', 'uShock', 'uShake'].map((n) => [n, u(n)]),
    );
    draw = (time, intensity, shake) => {
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uI, intensity);
      gl.uniform1f(U.uBass, s.bass);
      gl.uniform1f(U.uMid, s.mid);
      gl.uniform1f(U.uHigh, s.high);
      gl.uniform1f(U.uBeat, s.beat);
      gl.uniform1f(U.uHue, s.curHue / 360);
      gl.uniform1f(U.uShock, s.shock);
      gl.uniform1f(U.uShake, shake);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
  } else {
    const cx = canvas.getContext('2d');
    draw = (time, intensity) => {
      const { width: w, height: h } = canvas;
      cx.fillStyle = 'rgba(5,6,10,0.18)';
      cx.fillRect(0, 0, w, h);
      cx.strokeStyle = `hsla(${s.curHue},100%,60%,${0.3 + intensity * 0.5})`;
      cx.lineWidth = 1 + intensity * 2 + s.beat * 2;
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2 + time * 0.1;
        const r = ((time * (0.2 + intensity) + i * 0.13) % 1) * Math.hypot(w, h) * 0.6;
        cx.beginPath();
        cx.moveTo(w / 2 + Math.cos(a) * r * 0.6, h / 2 + Math.sin(a) * r * 0.6);
        cx.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
        cx.stroke();
      }
    };
  }

  let raf;
  let last = performance.now();
  const frame = (nowMs) => {
    const dt = Math.min(0.1, (nowMs - last) / 1000);
    last = nowMs;
    const time = nowMs / 1000;
    const mult = reduced ? Math.min(LEVEL[s.level], 0.55) : LEVEL[s.level];

    // ease towards the target depth / hue / audio energy
    s.I += ((0.3 + 0.7 * (s.depth / 4)) - s.I) * Math.min(1, dt * 2.5);
    s.curHue += (s.hue - s.curHue) * Math.min(1, dt * 1.5);
    const e = music.energy();
    const idle = 0.2 + 0.15 * Math.sin(time * 4); // gentle pulse when no music is playing
    const ease = Math.min(1, dt * 22);
    s.bass += (Math.min(1, (e.bass || idle) * 1.25) - s.bass) * ease;
    s.mid += ((e.mid || idle * 0.6) - s.mid) * ease;
    s.high += ((e.high || idle * 0.3) - s.high) * ease;
    s.beat *= Math.exp(-dt * 4);
    s.shock = Math.min(1, s.shock + dt * 1.6);

    const intensity = Math.min(2.4, s.I * mult);
    const shake = reduced || s.depth < 1 ? 0 : 0.005 * s.depth * s.beat * mult; // screen shake only at the top depth
    draw(time, intensity, shake);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return api;
}
