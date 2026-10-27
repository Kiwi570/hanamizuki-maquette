/* 潮見 : mer WebGL dont le ciel suit la position réelle du soleil à Saiki. Repli CSS sans WebGL. */
import { Renderer } from './vendor/ogl/core/Renderer.js';
import { Program } from './vendor/ogl/core/Program.js';
import { Mesh } from './vendor/ogl/core/Mesh.js';
import { Triangle } from './vendor/ogl/extras/Triangle.js';
import { HZ, skyAt } from './core.js';

const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

const fragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uDive;
uniform vec3 uTop, uHz, uSea1, uSea2, uSun;
uniform vec2 uSunPos;
uniform float uSunVis, uNight;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  float hz = mix(0.46, 1.22, uDive);
  vec3 col;
  vec2 sp = vec2(uSunPos.x, hz + uSunPos.y);
  if (uv.y > hz) {
    float t = clamp((uv.y - hz) / max(1.0 - hz, 0.001), 0.0, 1.0);
    col = mix(uHz, uTop, pow(t, 0.5));
    vec2 d = uv - sp; d.x *= aspect;
    float r = length(d);
    col += uSun * (0.5 * exp(-r * 6.0) + 0.22 * exp(-r * 1.8)) * uSunVis;
    col = mix(col, uSun * 1.12, smoothstep(0.046, 0.04, r) * uSunVis);
    vec2 sg = floor(uv * vec2(aspect, 1.0) * 260.0);
    float star = step(0.9965, hash(sg)) * uNight * smoothstep(0.05, 0.5, t);
    col += star * (0.55 + 0.45 * sin(uTime * 1.7 + hash(sg) * 30.0));
    // nuages fins, très lents
    float cl = fbm(vec2(uv.x * aspect * 1.6 + uTime * 0.006, uv.y * 7.0));
    col = mix(col, mix(uHz, uTop, 0.35) * 1.08, smoothstep(0.58, 0.8, cl) * 0.35 * (1.0 - t * 0.6));
  } else {
    float depth = hz - uv.y;
    float z = 1.0 / (depth * 3.2 + 0.035);
    vec2 p = vec2((uv.x - 0.5) * aspect * z * 0.55, z * 0.8);
    float w1 = fbm(p * vec2(0.9, 2.6) + vec2(uTime * 0.02, -uTime * 0.12));
    float w2 = fbm(p * vec2(2.2, 6.0) + vec2(-uTime * 0.05, -uTime * 0.2));
    col = mix(uSea1, uSea2, smoothstep(0.0, 0.55, depth));
    col = mix(col, uHz * 0.75, exp(-depth * 18.0) * 0.55);
    col += (w1 - 0.5) * 0.14 * (1.0 - depth * 0.8);
    col += smoothstep(0.62, 0.8, w2) * 0.05;
    float dx = abs(uv.x - sp.x) * aspect;
    float spread = 0.025 + depth * 0.32;
    float glit = smoothstep(0.55, 0.85, w2 + hash(floor(uv * uRes / 3.0) + floor(uTime * 6.0)) * 0.3);
    col += uSun * exp(-dx / spread * 1.6) * (0.18 + glit * 0.85) * uSunVis * (0.5 + 0.5 * (1.0 - depth));
    vec2 dm = uv - uMouse; dm.x *= aspect;
    float rr = length(dm);
    col += 0.06 * sin(rr * 95.0 - uTime * 4.2) * exp(-rr * 8.0) * step(uMouse.y, hz);
  }
  col += uHz * 0.16 * exp(-abs(uv.y - hz) * 110.0);
  col += (hash(uv * uRes + fract(uTime) * 100.0) - 0.5) * 0.04;
  float vig = smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(aspect * 0.8, 1.0)));
  col *= mix(0.78, 1.0, vig);
  gl_FragColor = vec4(col, 1.0);
}`;

export function initSea(host) {
  if (!host) return null;
  let renderer;
  try {
    renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, HZ.fine ? 1.5 : 1.25), alpha: false, antialias: false, powerPreference: 'low-power' });
    if (!renderer.gl) throw new Error('no gl');
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return null;
  }
  const gl = renderer.gl;
  host.appendChild(gl.canvas);
  gl.canvas.setAttribute('aria-hidden', 'true');

  const sky = HZ.sky || skyAt();
  const program = new Program(gl, {
    vertex, fragment,
    uniforms: {
      uTime: { value: 0 }, uRes: { value: [1, 1] }, uMouse: { value: [0.5, -1] }, uDive: { value: 0 },
      uTop: { value: sky.top }, uHz: { value: sky.hz }, uSea1: { value: sky.sea1 }, uSea2: { value: sky.sea2 }, uSun: { value: sky.sun },
      uSunPos: { value: [sky.sunX, sky.sunY] }, uSunVis: { value: sky.sunVis }, uNight: { value: sky.night },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
  const U = program.uniforms;

  const resize = () => {
    const r = host.getBoundingClientRect();
    renderer.setSize(r.width, r.height);
    U.uRes.value = [r.width, r.height];
  };
  resize();
  addEventListener('resize', resize);

  const mouse = { x: 0.5, y: -1, tx: 0.5, ty: -1 };
  host.parentElement.addEventListener('pointermove', e => {
    const r = host.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width;
    mouse.ty = 1 - (e.clientY - r.top) / r.height;
  });

  const refreshSky = () => {
    const s = HZ.sky || skyAt();
    U.uTop.value = s.top; U.uHz.value = s.hz; U.uSea1.value = s.sea1; U.uSea2.value = s.sea2; U.uSun.value = s.sun;
    U.uSunPos.value = [s.sunX, s.sunY]; U.uSunVis.value = s.sunVis; U.uNight.value = s.night;
  };
  setInterval(refreshSky, 30000);

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(host);
  let t0 = performance.now();
  const frame = now => {
    if (!HZ.calm) requestAnimationFrame(frame);
    if (!visible && !HZ.calm) return;
    U.uTime.value = HZ.calm ? 12 : (now - t0) / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    U.uMouse.value = [mouse.x, mouse.y];
    renderer.render({ scene: mesh });
  };
  requestAnimationFrame(frame);

  return {
    setDive(v) { U.uDive.value = v; if (HZ.calm) renderer.render({ scene: mesh }); },
    canvas: gl.canvas,
  };
}
