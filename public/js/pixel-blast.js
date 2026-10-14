// Fundo pixelado em WebGL puro — porte sem React/three.js do PixelBlast
// (react-bits), inspirado em github.com/zavalit/bayer-dithering-webgl-demo.
// Ruído FBM com domain warp, pontilhado Bayer 8x8 em células quadradas,
// ondas no clique e fade nas bordas. Fundo transparente.
//
// Uso declarativo: <section data-pixel-blast data-pixel-color="#B497CF"> …
// O módulo inicializa sozinho todo [data-pixel-blast] da página.
// Sem WebGL nada acontece; com movimento reduzido desenha um quadro estático.

const MAX_RIPPLES = 10;
const RIPPLE_LIFETIME = 3.5;

const DEFAULTS = {
  color: '#B497CF',
  pixelSize: 4,
  patternScale: 2,
  patternDensity: 1,
  speed: 0.5,
  edgeFade: 0.25,
  enableRipples: true,
  rippleSpeed: 0.4,
  rippleThickness: 0.12,
  rippleIntensityScale: 1.5,
};

const VERTEX = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uResolution;
uniform float uTime;
uniform float uSpeed;
uniform vec3 uColor;
uniform float uPixelSize;
uniform float uScale;
uniform float uDensity;
uniform float uEdgeFade;
uniform vec2 uRipplePos[${MAX_RIPPLES}];
uniform float uRippleTime[${MAX_RIPPLES}];
uniform float uRippleSpeed;
uniform float uRippleThickness;
uniform float uRippleIntensity;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.0;
    a *= 0.5;
  }
  return v;
}

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 cell = floor(gl_FragCoord.xy / uPixelSize);
  vec2 uv = (cell + 0.5) * uPixelSize / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  float t = uTime * uSpeed;
  vec2 q = p * uScale;
  float warp = fbm(q + vec2(t * 0.12, -t * 0.08));
  float n = fbm(q + warp * 1.6 + vec2(-t * 0.05, t * 0.1));
  float feed = (n - 0.38) * 1.9 * uDensity;

  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    float age = uTime - uRippleTime[i];
    if (uRippleTime[i] < 0.0 || age > ${RIPPLE_LIFETIME.toFixed(1)}) continue;
    vec2 c = vec2(uRipplePos[i].x * aspect, uRipplePos[i].y);
    float d = distance(p, c);
    float ring = exp(-pow((d - age * uRippleSpeed) / uRippleThickness, 2.0));
    float fade = 1.0 - age / ${RIPPLE_LIFETIME.toFixed(1)};
    feed += ring * fade * fade * uRippleIntensity * 0.6;
  }

  float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float edgeMask = uEdgeFade > 0.0 ? smoothstep(0.0, uEdgeFade, edge) : 1.0;

  float on = step(bayer8(cell), clamp(feed, 0.0, 1.0) * edgeMask);
  gl_FragColor = vec4(uColor * on, on);
}
`;

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? [...value].map((c) => c + c).join('') : value;
  const int = parseInt(full, 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('PixelBlast: shader não compilou', gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

export function createPixelBlast(container, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-blast__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // Um triângulo que cobre a tela inteira.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPosition = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const u = (name) => gl.getUniformLocation(program, name);
  const loc = {
    resolution: u('uResolution'),
    time: u('uTime'),
    pixelSize: u('uPixelSize'),
    ripplePos: u('uRipplePos'),
    rippleTime: u('uRippleTime'),
  };
  gl.uniform3fv(u('uColor'), hexToRgb(opts.color));
  gl.uniform1f(u('uSpeed'), opts.speed);
  gl.uniform1f(u('uScale'), opts.patternScale);
  gl.uniform1f(u('uDensity'), opts.patternDensity);
  gl.uniform1f(u('uEdgeFade'), opts.edgeFade);
  gl.uniform1f(u('uRippleSpeed'), opts.rippleSpeed);
  gl.uniform1f(u('uRippleThickness'), opts.rippleThickness);
  gl.uniform1f(u('uRippleIntensity'), opts.rippleIntensityScale);

  const ripplePos = new Float32Array(MAX_RIPPLES * 2);
  const rippleTime = new Float32Array(MAX_RIPPLES).fill(-1);
  let rippleIndex = 0;
  gl.uniform2fv(loc.ripplePos, ripplePos);
  gl.uniform1fv(loc.rippleTime, rippleTime);

  container.prepend(canvas);

  const start = performance.now();
  // Começa num ponto adiantado do ruído para não nascer sempre igual.
  const seed = Math.random() * 100;
  const now = () => (performance.now() - start) / 1000 + seed;

  let frame = 0;
  let visible = true;

  const draw = () => {
    gl.uniform1f(loc.time, reduceMotion ? seed : now());
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(container.clientWidth * dpr));
    const height = Math.max(1, Math.round(container.clientHeight * dpr));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(loc.resolution, width, height);
    gl.uniform1f(loc.pixelSize, Math.max(1, Math.round(opts.pixelSize * dpr)));
    if (reduceMotion) draw();
  };

  const loop = () => {
    draw();
    frame = requestAnimationFrame(loop);
  };

  const play = () => {
    if (reduceMotion || frame || !visible || document.hidden) return;
    frame = requestAnimationFrame(loop);
  };

  const pause = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const onPointerDown = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1 - (event.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    ripplePos[rippleIndex * 2] = x;
    ripplePos[rippleIndex * 2 + 1] = y;
    rippleTime[rippleIndex] = now();
    rippleIndex = (rippleIndex + 1) % MAX_RIPPLES;
    gl.uniform2fv(loc.ripplePos, ripplePos);
    gl.uniform1fv(loc.rippleTime, rippleTime);
  };

  if (opts.enableRipples && !reduceMotion) {
    container.addEventListener('pointerdown', onPointerDown);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  // Só anima enquanto está na tela e com a aba ativa.
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) play();
    else pause();
  });
  visibilityObserver.observe(container);

  const onVisibilityChange = () => (document.hidden ? pause() : play());
  document.addEventListener('visibilitychange', onVisibilityChange);

  resize();
  draw();
  requestAnimationFrame(() => canvas.classList.add('is-ready'));
  play();

  return {
    destroy() {
      pause();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      container.removeEventListener('pointerdown', onPointerDown);
      canvas.remove();
    },
  };
}

function readOptions(el) {
  const d = el.dataset;
  const num = (value) => (value === undefined ? undefined : Number(value));
  const options = {
    color: d.pixelColor,
    pixelSize: num(d.pixelSize),
    patternScale: num(d.pixelScale),
    patternDensity: num(d.pixelDensity),
    speed: num(d.pixelSpeed),
    edgeFade: num(d.pixelEdgeFade),
    enableRipples: d.pixelRipples === undefined ? undefined : d.pixelRipples !== 'false',
  };
  return Object.fromEntries(Object.entries(options).filter(([, v]) => v !== undefined));
}

document.querySelectorAll('[data-pixel-blast]').forEach((el) => {
  createPixelBlast(el, readOptions(el));
});
