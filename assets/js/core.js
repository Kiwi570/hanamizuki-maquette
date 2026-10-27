/* Socle commun : langues, défilement fluide, curseur, révélations, horloge solaire, son, transitions. */
import { Lenis } from './vendor/lenis/lenis.js';

const { gsap, ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin } = window;
gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);

const root = document.documentElement;
const I = window.HZ_I18N || {};
const LANGS = ['ja', 'en', 'fr', 'ko'];
const LOCALE = { ja: 'ja-JP', en: 'en-GB', fr: 'fr-FR', ko: 'ko-KR' };

export const HZ = {
  lang: LANGS.includes(root.lang) ? root.lang : 'ja',
  calm: root.classList.contains('calm'),
  fine: matchMedia('(hover: hover) and (pointer: fine)').matches,
  lenis: null,
  sky: null,
};
export { gsap, ScrollTrigger, SplitText };

/* ---------------- textes ---------------- */
export function t(key, vars) {
  const e = I[key];
  let s = e ? (e[HZ.lang] ?? e.ja) : key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
const langCbs = [];
export const onLang = cb => langCbs.push(cb);

export function yen(n) {
  const v = Math.round(n);
  switch (HZ.lang) {
    case 'ja': return v.toLocaleString('ja-JP') + '円';
    case 'ko': return v.toLocaleString('ko-KR') + '엔';
    case 'fr': return v.toLocaleString('fr-FR') + ' ¥';
    default: return '¥' + v.toLocaleString('en-GB');
  }
}
export function fmtDate(d, opts) {
  return new Intl.DateTimeFormat(LOCALE[HZ.lang], { timeZone: 'Asia/Tokyo', ...opts }).format(d);
}

const inkSplits = new Set();
function applyLang(lang, announce = true) {
  HZ.lang = lang;
  root.lang = lang;
  // arrêter les découpages en cours avant de remplacer les textes
  inkSplits.forEach(s => { s.tween && s.tween.kill(); s.split.revert(); });
  inkSplits.clear();
  document.querySelectorAll('[data-i18n]').forEach(n => { n.innerHTML = t(n.dataset.i18n); });
  document.querySelectorAll('[data-i18n-alt]').forEach(n => { n.alt = t(n.dataset.i18nAlt); });
  document.querySelectorAll('[data-i18n-attr]').forEach(n => {
    n.dataset.i18nAttr.split(';').forEach(p => { const [a, k] = p.split(':'); n.setAttribute(a, t(k)); });
  });
  document.querySelectorAll('[data-lang-cur]').forEach(n => { n.textContent = lang.toUpperCase(); });
  document.querySelectorAll('[data-set-lang]').forEach(b => b.setAttribute('aria-current', b.dataset.setLang === lang ? 'true' : 'false'));
  try { localStorage.setItem('hz-lang', lang); } catch (e) { /* stockage indisponible */ }
  langCbs.forEach(cb => cb(lang));
  if (announce) requestAnimationFrame(() => ScrollTrigger.refresh());
}

function setupLang() {
  const btn = document.querySelector('[data-lang-btn]');
  const list = document.querySelector('[data-lang-list]');
  if (!btn || !list) return;
  const close = () => { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = list.hidden;
    list.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) list.querySelector('button')?.focus();
  });
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-set-lang]');
    if (!b) return;
    applyLang(b.dataset.setLang);
    close();
    btn.focus();
  });
  document.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

/* ---------------- défilement ---------------- */
function setupScroll() {
  if (HZ.calm) return;
  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, autoRaf: false, anchors: { offset: -90 }, allowNestedScroll: true });
  HZ.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
export function scrollTo(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  if (HZ.lenis) HZ.lenis.scrollTo(el, { offset: -90, duration: 1.4 });
  else el.scrollIntoView({ behavior: HZ.calm ? 'auto' : 'smooth' });
}

/* ---------------- en‑tête et menu ---------------- */
function setupHeader() {
  const hd = document.querySelector('[data-hd]');
  const page = root.dataset.page;
  document.querySelectorAll('[data-nav]').forEach(a => { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); });
  let last = 0;
  const onScroll = y => {
    if (!hd) return;
    hd.classList.toggle('is-hidden', y > 300 && y > last + 2);
    if (y < last - 2 || y < 300) hd.classList.remove('is-hidden');
    last = y;
  };
  if (HZ.lenis) HZ.lenis.on('scroll', l => onScroll(l.scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });

  const burger = document.querySelector('[data-burger]');
  const mnav = document.querySelector('[data-mnav]');
  if (burger && mnav) {
    const set = open => {
      mnav.hidden = !open;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', t(open ? 'ui.close' : 'ui.menu'));
      if (HZ.lenis) open ? HZ.lenis.stop() : HZ.lenis.start();
      if (open && !HZ.calm) gsap.from(mnav.children, { y: 30, opacity: 0, stagger: 0.06, duration: 0.6, ease: 'power3.out' });
    };
    burger.addEventListener('click', () => set(mnav.hidden));
    mnav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mnav.hidden) set(false); });
  }
}

/* ---------------- curseur et micro‑interactions ---------------- */
function setupCursor() {
  const c = document.querySelector('.cursor');
  if (!c || !HZ.fine || HZ.calm) { c && c.remove(); return; }
  const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3' });
  addEventListener('pointermove', e => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
  document.addEventListener('pointerover', e => c.classList.toggle('is-link', !!e.target.closest('a, button, label, [data-tilt]')));
  addEventListener('pointerdown', e => {
    const r = document.createElement('i');
    r.className = 'ripple';
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    document.body.appendChild(r);
    gsap.to(r, { scale: 9, opacity: 0, duration: 0.9, ease: 'power2.out', onComplete: () => r.remove() });
  });
}
function setupMagnetic() {
  if (!HZ.fine || HZ.calm) return;
  document.querySelectorAll('[data-magnetic]').forEach(b => {
    const xTo = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3' });
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.28);
      yTo((e.clientY - r.top - r.height / 2) * 0.4);
    });
    b.addEventListener('pointerleave', () => { gsap.to(b, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, .4)' }); });
  });
}
export function setupTilt(scope = document) {
  if (!HZ.fine || HZ.calm) return;
  scope.querySelectorAll('[data-tilt]').forEach(el => {
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
    gsap.set(el, { transformPerspective: 900 });
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 14);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 12);
    });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* ---------------- révélations ---------------- */
const WAVE = '<svg viewBox="0 0 1200 30" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" d="M0 30 V16 C100 4 200 4 300 16 S500 28 600 16 S800 4 900 16 S1100 28 1200 16 V30Z"/></svg>';
export function ink(el, opts = {}) {
  if (HZ.calm) return null;
  const split = new SplitText(el, { type: 'chars', charsClass: 'ch' });
  const vertical = getComputedStyle(el).writingMode.startsWith('vertical');
  const tween = gsap.from(split.chars, {
    opacity: 0,
    filter: 'blur(10px)',
    scale: 1.25,
    x: vertical ? 0 : 12,
    y: vertical ? -14 : 0,
    duration: 1.1,
    ease: 'power3.out',
    stagger: { each: vertical ? 0.06 : 0.025 },
    clearProps: 'filter',
    ...opts,
  });
  const rec = { split, tween };
  inkSplits.add(rec);
  tween.eventCallback('onComplete', () => { inkSplits.delete(rec); split.revert(); });
  return tween;
}
function setupReveals() {
  if (HZ.calm) return;
  // encre verticale (titres)
  document.querySelectorAll('[data-ink]').forEach(el => {
    if (el.closest('[data-hero], [data-sj-hero], .ac-hero')) return; // géré par la page
    ink(el, { scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  // apparition simple
  document.querySelectorAll('[data-reveal]').forEach(el => {
    if (el.closest('[data-hero]')) return;
    gsap.from(el, { y: 36, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  // émersion : la ligne d'eau descend et découvre la photo
  document.querySelectorAll('[data-emerge]').forEach(fig => {
    const veil = document.createElement('div');
    veil.className = 'tide-veil';
    veil.innerHTML = WAVE;
    const dark = !!fig.closest('.sec--dark, .sec--deep');
    const water = dark ? '#1f3a5f' : '#14233a';
    veil.style.setProperty('--veil', water);
    veil.querySelector('svg').style.color = water;
    fig.appendChild(veil);
    const img = fig.querySelector('img');
    const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 88%', once: true } });
    tl.to(veil, { yPercent: 102, duration: 1.5, ease: 'power3.inOut' });
    if (img) tl.from(img, { scale: 1.22, duration: 2, ease: 'power3.out' }, 0);
    tl.add(() => veil.remove());
  });
  // parallaxe
  document.querySelectorAll('[data-parallax]').forEach(el => {
    const amt = parseFloat(el.dataset.parallax) || 8;
    const target = el.querySelector('img') || el;
    gsap.fromTo(target, { yPercent: -amt / 2, scale: 1.08 }, { yPercent: amt / 2, scale: 1.08, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  // compteurs
  document.querySelectorAll('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 1.8, ease: 'power2.out',
      onUpdate: () => { el.textContent = o.v.toFixed(dec); },
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  // éventail de cartes
  document.querySelectorAll('[data-fan]').forEach(g => {
    const cards = g.children;
    gsap.from(cards, {
      y: 120, rotation: i => (i - (cards.length - 1) / 2) * 7, opacity: 0, duration: 1.3, ease: 'power3.out', stagger: 0.09,
      scrollTrigger: { trigger: g, start: 'top 85%', once: true },
    });
  });
}

/* ---------------- jauge de marée ---------------- */
function setupGauge() {
  const svg = document.querySelector('.gauge svg');
  const bar = document.querySelector('.gauge-bar');
  if (svg) {
    const NS = 'http://www.w3.org/2000/svg';
    let html = '';
    for (let i = 0; i <= 38; i++) {
      const y = 380 - i * 10;
      const big = i % 5 === 0;
      html += `<line x1="${big ? 0 : 8}" x2="14" y1="${y}" y2="${y}" stroke="currentColor" stroke-width="${big ? 1 : 0.6}"/>`;
      if (big && i > 0) html += `<text x="16" y="${y + 3}">${i * 10}</text>`;
    }
    html += '<rect x="0" y="0" width="14" height="380" fill="currentColor" opacity=".18"/>';
    html += '<path class="g-water" fill="currentColor" d="M0 380 H14 V380 H0Z"/>';
    svg.innerHTML = html;
    svg.setAttribute('xmlns', NS);
  }
  const water = svg && svg.querySelector('.g-water');
  let tt = 0;
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? (HZ.lenis ? HZ.lenis.scroll : scrollY) / max : 0;
    if (water) {
      const y = 380 - p * 380;
      const w = Math.sin(tt) * 2.5;
      water.setAttribute('d', `M0 ${y + w} Q7 ${y - w} 14 ${y + w} V380 H0Z`);
    }
    if (bar) bar.style.transform = `scaleX(${p})`;
  };
  gsap.ticker.add(() => { tt += 0.08; update(); });
}

/* ---------------- soleil et ciel de Saiki ---------------- */
const RAD = Math.PI / 180;
function sunPosition(date, lat, lon) {
  const d = date.valueOf() / 864e5 - 0.5 + 2440588 - 2451545;
  const M = RAD * (357.5291 + 0.98560028 * d);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  const e = RAD * 23.4397;
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const H = RAD * (280.16 + 360.9856235 * d) + lon * RAD - ra;
  const phi = lat * RAD;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  return { alt: alt / RAD, bearing: (az / RAD + 180 + 360) % 360 };
}
function sunTimes(date, lat, lon) {
  const lw = -lon * RAD, phi = lat * RAD, J2000 = 2451545, J0 = 0.0009;
  const d = date.valueOf() / 864e5 - 0.5 + 2440588 - J2000;
  const n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n;
  const M = RAD * (357.5291 + 0.98560028 * ds);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + RAD * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(RAD * 23.4397) * Math.sin(L));
  const Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const w = Math.acos((Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
  const Jset = J2000 + (J0 + (w + lw) / (2 * Math.PI) + n) + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const Jrise = Jnoon - (Jset - Jnoon);
  const toDate = j => new Date((j + 0.5 - 2440588) * 864e5);
  return { rise: toDate(Jrise), set: toDate(Jset) };
}
const SKY = [ // altitude du soleil (°) -> haut du ciel, horizon, mer proche, mer profonde, couleur du soleil
  [-18, '#050a14', '#13223a', '#0b1626', '#03070d', '#8fa6c0'],
  [-9, '#0b1628', '#35406a', '#0f1d33', '#050b15', '#e2683c'],
  [-3, '#14233a', '#b9574a', '#182a46', '#08111f', '#ff9b6a'],
  [1, '#1f3a5f', '#e8743f', '#1d3352', '#0a1626', '#ffb27a'],
  [7, '#2b4f7c', '#f2a868', '#24466c', '#0d1d33', '#ffd2a0'],
  [16, '#3a6e9e', '#cfe0e6', '#2b5d86', '#102b47', '#fff4e0'],
  [45, '#2f6597', '#dceaf0', '#2a6290', '#0f2f50', '#ffffff'],
];
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
export function skyAt(date = new Date()) {
  const { lat, lon } = (window.HZ_DATA && window.HZ_DATA.saiki) || { lat: 32.985, lon: 131.93 };
  const pos = sunPosition(date, lat, lon);
  const a = Math.max(-18, Math.min(45, pos.alt));
  let i = 0;
  while (i < SKY.length - 2 && a > SKY[i + 1][0]) i++;
  const k = (a - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]);
  const pick = j => mix(hex(SKY[i][j]), hex(SKY[i + 1][j]), Math.max(0, Math.min(1, k)));
  const morning = pos.bearing < 180;
  let phase = 'day';
  if (pos.alt < -6) phase = 'night';
  else if (pos.alt < 6) phase = morning ? 'dawn' : 'dusk';
  return {
    alt: pos.alt, bearing: pos.bearing, phase,
    top: pick(1), hz: pick(2), sea1: pick(3), sea2: pick(4), sun: pick(5),
    sunX: Math.max(0.06, Math.min(0.94, (pos.bearing - 60) / 240)),
    sunY: Math.max(-0.2, Math.min(0.5, pos.alt / 70)),
    sunVis: Math.max(0, Math.min(1, (pos.alt + 2) / 4)),
    night: Math.max(0, Math.min(1, (-pos.alt - 4) / 8)),
    times: sunTimes(date, lat, lon),
  };
}
function setupClock() {
  const box = document.querySelector('[data-clock]');
  const tick = () => {
    const now = new Date();
    const sky = skyAt(now);
    HZ.sky = sky;
    const css = c => `rgb(${c.map(v => Math.round(v * 255)).join(',')})`;
    const r = document.querySelector('[data-sea]');
    if (r) { r.style.setProperty('--sky-top', css(sky.top)); r.style.setProperty('--sky-hz', css(sky.hz)); r.style.setProperty('--sea-1', css(sky.sea1)); r.style.setProperty('--sea-2', css(sky.sea2)); }
    if (!box) return;
    const hm = { hour: '2-digit', minute: '2-digit', hour12: false };
    box.querySelector('[data-clock-time]').textContent = fmtDate(now, hm);
    box.querySelector('[data-sunrise]').textContent = fmtDate(sky.times.rise, hm);
    box.querySelector('[data-sunset]').textContent = fmtDate(sky.times.set, hm);
    box.querySelector('[data-sky-phase]').textContent = t('sky.' + sky.phase);
  };
  tick();
  setInterval(tick, 30000);
  onLang(tick);
}

/* ---------------- campagne ---------------- */
export function campaignState(now = new Date()) {
  const c = window.HZ_DATA.campaign;
  const start = new Date(c.start + 'T00:00:00+09:00');
  const end = new Date(c.end + 'T23:59:59+09:00');
  const days = Math.ceil((end - now) / 864e5);
  return { active: now >= start && now <= end, days, start, end };
}
function setupCampaign() {
  const st = campaignState();
  document.querySelectorAll('[data-campaign]').forEach(el => {
    el.hidden = !st.active;
    const left = el.querySelector('[data-camp-left]');
    const upd = () => { if (left) left.textContent = t('camp.left', { n: st.days }); };
    upd();
    onLang(upd);
  });
}

/* ---------------- actualités (nouvelles / passées) ---------------- */
function setupNews() {
  const now = new Date();
  const upd = () => document.querySelectorAll('li[data-date]').forEach(li => {
    const chip = li.querySelector('[data-chip]');
    const d = new Date(li.dataset.date + 'T00:00:00+09:00');
    const ends = li.dataset.ends && new Date(li.dataset.ends + 'T23:59:59+09:00');
    li.classList.toggle('is-past', !!(ends && ends < now));
    if (!chip) return;
    if (ends && ends < now) { chip.className = 'chip chip--past'; chip.textContent = t('ui.ended'); }
    else if (now - d < 14 * 864e5) { chip.className = 'chip chip--new'; chip.textContent = 'NEW'; }
    else { chip.textContent = ''; chip.className = 'chip'; }
  });
  upd();
  onLang(upd);
}

/* ---------------- copier ---------------- */
function setupCopy() {
  document.querySelectorAll('[data-copy]').forEach(b => {
    b.addEventListener('click', async () => {
      const txt = b.dataset.copy;
      try { await navigator.clipboard.writeText(txt); b.textContent = t('ui.copied'); }
      catch (e) {
        const strong = b.parentElement.querySelector('strong, .mono') || b.parentElement;
        const r = document.createRange();
        r.selectNodeContents(strong);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      }
      setTimeout(() => { b.textContent = t('ui.copy'); }, 1800);
    });
  });
}

/* ---------------- son : vagues et furin, synthétisés ---------------- */
class SeaSound {
  constructor() { this.ctx = null; this.on = false; this.timer = null; }
  init() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    // bruit brun -> passe‑bas modulé = ressac
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buf.getChannelData(c);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; data[i] = last * 3.2; }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
    const swell = ctx.createGain(); swell.gain.value = 0.55;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.085;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.4;
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.085; const lfo2Amt = ctx.createGain(); lfo2Amt.gain.value = 260;
    lfo.connect(lfoAmt).connect(swell.gain);
    lfo2.connect(lfo2Amt).connect(lp.frequency);
    src.connect(lp).connect(swell).connect(this.master);
    src.start(); lfo.start(); lfo2.start();
  }
  chime() {
    if (!this.on) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const f0 = 1700 + Math.random() * 700;
    [1, 2.76, 5.4].forEach((m, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f0 * m; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.05 / (i + 1), t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8 - i * 0.6);
      o.connect(g).connect(this.master);
      o.start(t0); o.stop(t0 + 3);
    });
    this.timer = setTimeout(() => this.chime(), 6000 + Math.random() * 9000);
  }
  toggle() {
    if (!this.ctx) this.init();
    this.on = !this.on;
    const g = this.master.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(this.on ? 0.32 : 0, now, 0.6);
    if (this.on) { this.ctx.resume(); clearTimeout(this.timer); this.timer = setTimeout(() => this.chime(), 1500); }
    else clearTimeout(this.timer);
    return this.on;
  }
}
function setupSound() {
  const btn = document.querySelector('[data-sound]');
  if (!btn) return;
  const s = new SeaSound();
  const label = () => {
    const k = s.on ? 'ui.sound.off' : 'ui.sound.on';
    btn.setAttribute('aria-label', t(k)); btn.setAttribute('title', t(k));
  };
  btn.addEventListener('click', () => { btn.setAttribute('aria-pressed', String(s.toggle())); label(); });
  document.addEventListener('visibilitychange', () => { if (s.ctx && s.on) document.hidden ? s.ctx.suspend() : s.ctx.resume(); });
  onLang(label);
}

/* ---------------- mode calme ---------------- */
function setupCalm() {
  const b = document.querySelector('[data-calm]');
  if (!b) return;
  b.setAttribute('aria-pressed', String(HZ.calm));
  b.addEventListener('click', () => {
    try { localStorage.setItem('hz-calm', HZ.calm ? '0' : '1'); } catch (e) { /* stockage indisponible */ }
    location.reload();
  });
}

/* ---------------- transitions de page ---------------- */
function setupTransitions() {
  const c = document.querySelector('[data-curtain]');
  const wrap = document.querySelector('.curtain');
  const arrive = () => root.classList.add('is-arrived');
  if (!c || HZ.calm) { arrive(); return; }
  if (!root.classList.contains('is-loaded')) { arrive(); gsap.set(c, { yPercent: 110 }); }
  else {
    gsap.set(c, { yPercent: 0 });
    arrive();
    gsap.to(c, { yPercent: -120, duration: 1.1, ease: 'power3.inOut', delay: 0.1 });
  }
  addEventListener('pageshow', e => { if (e.persisted) { gsap.set(c, { yPercent: 110 }); wrap.classList.remove('is-on'); } });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-link]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const samePage = url.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '');
    if (samePage && url.hash) { e.preventDefault(); scrollTo(url.hash); return; }
    if (samePage) return;
    e.preventDefault();
    wrap.classList.add('is-on');
    gsap.fromTo(c, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: 'power3.inOut', onComplete: () => { location.href = url.href; } });
  });
}

/* ---------------- secours image ---------------- */
function setupImgFallback() {
  const ph = n => `<svg class="ph" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="300" fill="#14233a"/><g fill="none" stroke="#3d5f86" stroke-width="2">${[0, 1, 2, 3, 4, 5].map(i => `<path d="M0 ${120 + i * 30} Q50 ${105 + i * 30} 100 ${120 + i * 30} T200 ${120 + i * 30} T300 ${120 + i * 30} T400 ${120 + i * 30}"/>`).join('')}</g><text x="16" y="28" fill="#8fa6c0" font-family="monospace" font-size="12">${n}</text></svg>`;
  document.querySelectorAll('img[src*="assets/img/"]').forEach(img => {
    const fail = () => { const name = img.src.split('/').pop(); img.style.visibility = 'hidden'; img.insertAdjacentHTML('afterend', ph(name)); };
    if (img.complete && img.naturalWidth === 0) fail();
    else img.addEventListener('error', fail, { once: true });
  });
}

/* ---------------- démarrage ---------------- */
export function boot(pageInit) {
  applyLang(HZ.lang, false);
  setupLang();
  setupScroll();
  setupHeader();
  setupCursor();
  setupMagnetic();
  setupTilt();
  setupGauge();
  setupClock();
  setupCampaign();
  setupNews();
  setupCopy();
  setupSound();
  setupCalm();
  setupTransitions();
  setupImgFallback();
  document.querySelectorAll('[data-year]').forEach(n => { n.textContent = new Date().getFullYear(); });
  const start = () => {
    pageInit && pageInit();
    setupReveals();
    ScrollTrigger.refresh();
    if (location.hash) setTimeout(() => scrollTo(location.hash), 300);
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
}
