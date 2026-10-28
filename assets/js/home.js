/* Accueil : ouverture, mer, traversée, table, temps de l'île, mythe, avis. */
import { boot, HZ, gsap, ScrollTrigger, ink, t, onLang } from './core.js?v=20261028-2';
import { initSea } from './sea.js?v=20261028-2';
import { drawMap, mapIntro, pulsePins } from './map.js?v=20261028-2';

const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

boot(() => {
  const sea = initSea($('[data-sea]'));
  hero(sea);
  crossing();
  table();
  island();
  myth();
  reviews();
});

/* ---------- ouverture et héro ---------- */
function hero(sea) {
  const loader = $('[data-loader]');
  const title = $('.hero-title');
  const intro = gsap.timeline({ paused: true });
  if (!HZ.calm) {
    intro.add(ink(title, { duration: 0.8 }) || gsap.timeline(), 0)
      .from('.hero .kicker', { y: 20, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.1)
      .from('.hero [data-reveal]', { y: 30, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12 }, 0.4)
      .fromTo('[data-hero-photo]', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'power4.inOut', clearProps: 'clipPath' }, 0.2)
      .from('[data-hero-photo] img', { scale: 1.35, duration: 2, ease: 'power3.out' }, 0.2)
      .from('.hero .ticket, .hero .clock', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15 }, 0.9)
      .from('.scroll-cue', { opacity: 0, duration: 0.8 }, 1.4);
  }
  const showLoader = loader && !root.classList.contains('is-loaded') && !HZ.calm;
  if (showLoader) {
    const tl = gsap.timeline({ onComplete: () => { root.classList.add('is-loaded'); try { sessionStorage.setItem('hz-seen', '1'); } catch (e) { /* ignoré */ } } });
    // voile court : terminé à 1,6 s, titre lancé à 1,2 s
    tl.from('.loader-kanji span', { opacity: 0, filter: 'blur(12px)', y: -18, duration: 0.5, stagger: 0.12, ease: 'power3.out' })
      .from('.loader-sub', { opacity: 0, duration: 0.3 }, 0.3)
      .to('.loader-tide', { yPercent: -100, duration: 0.8, ease: 'power3.inOut' }, 0.45)
      .to(loader, { yPercent: -100, duration: 0.5, ease: 'power4.inOut' }, 1.1)
      .add(() => intro.play(), 1.2);
  } else {
    root.classList.add('is-loaded');
    intro.play();
  }

  if (HZ.calm) { sea && sea.setDive(0); return; }
  // plongée sous la ligne d'eau au défilement
  const o = { d: 0 };
  ScrollTrigger.create({
    trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: s => { o.d = s.progress; sea && sea.setDive(Math.pow(s.progress, 1.3)); },
  });
  gsap.to('.hero-in', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('[data-shore]', {
    attr: { d: 'M0 40 C240 80 480 20 720 50 S1200 80 1440 40 V90 H0Z' }, ease: 'sine.inOut', duration: 4, yoyo: true, repeat: -1,
  });
  // ondulation de la photo au survol
  const disp = document.querySelector('#ripple feDisplacementMap');
  const ph = $('[data-hero-photo]');
  if (disp && ph && HZ.fine) {
    ph.addEventListener('pointerenter', () => gsap.to(disp, { attr: { scale: 22 }, duration: 0.8, ease: 'power2.out' }));
    ph.addEventListener('pointerleave', () => gsap.to(disp, { attr: { scale: 0 }, duration: 1.2, ease: 'power2.out' }));
  }
}

/* ---------- traversée ---------- */
function crossing() {
  const host = $('[data-cross] [data-map]');
  if (!host) return;
  const map = drawMap(host);
  if (HZ.calm) { map.still('both'); return; }
  const tl = mapIntro(map, gsap, { paused: true });
  // tracé piloté par le défilement, sans épinglage : toute la section reste lisible
  ScrollTrigger.create({ trigger: host, start: 'top 82%', end: 'bottom 70%', scrub: 0.8, animation: tl });
  pulsePins(map, gsap);
}

/* ---------- table : galerie horizontale et banc de kibinago ---------- */
function table() {
  const sec = $('[data-table]');
  const track = $('[data-table-track]');
  const line = $('[data-fishline]');
  if (!sec || !track) return;
  if (!HZ.calm) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tl = gsap.timeline();
      tl.to(track, { x: () => -dist(), ease: 'none' }, 0)
        .fromTo(line, { x: 0 }, { x: () => dist() * 0.45, ease: 'none' }, 0);
      $$('.dish .media', track).forEach((m, i) => {
        tl.fromTo(m, { rotationY: -16, rotationZ: i % 2 ? 1.5 : -1.5 }, { rotationY: 10, rotationZ: i % 2 ? -1.5 : 1.5, ease: 'none' }, 0);
      });
      ScrollTrigger.create({ trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, animation: tl, invalidateOnRefresh: true });
    });
    mm.add('(max-width: 899px)', () => {
      gsap.to(line, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }
  shoal($('[data-shoal]'), sec);
}

function shoal(canvas, sec) {
  if (!canvas || HZ.calm) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 1.5);
  const resize = () => { W = sec.clientWidth; H = sec.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize();
  addEventListener('resize', resize);
  const N = innerWidth < 700 ? 34 : 64;
  const fish = Array.from({ length: N }, (_, i) => ({ x: Math.random() * W, y: H * 0.62 + Math.random() * H * 0.3, vx: 1 + Math.random(), vy: 0, s: 0.7 + Math.random() * 0.6, ph: Math.random() * 6 }));
  const m = { x: -999, y: -999 };
  sec.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; });
  sec.addEventListener('pointerleave', () => { m.x = m.y = -999; });
  let on = false;
  new IntersectionObserver(([en]) => { on = en.isIntersecting; }).observe(sec);
  let t = 0;
  const step = () => {
    requestAnimationFrame(step);
    if (!on) return;
    t += 0.016;
    ctx.clearRect(0, 0, W, H);
    // centre du banc qui serpente
    const cx = (t * 60) % (W + 400) - 200, cy = H * 0.76 + Math.sin(t * 0.7) * H * 0.1;
    for (const f of fish) {
      let ax = (cx - f.x) * 0.0006 + 0.05, ay = (cy - f.y) * 0.0012;
      const dx = f.x - m.x, dy = f.y - m.y, d2 = dx * dx + dy * dy;
      if (d2 < 22000) { const k = 2.2 / Math.sqrt(d2 + 1); ax += dx * k * 0.08; ay += dy * k * 0.08; }
      f.vx = Math.max(0.6, Math.min(4.2, f.vx + ax)); f.vy = Math.max(-2.5, Math.min(2.5, (f.vy + ay) * 0.96));
      f.x += f.vx; f.y += f.vy;
      if (f.x > W + 40) { f.x = -40; f.y = H * 0.62 + Math.random() * H * 0.3; }
      const ang = Math.atan2(f.vy, f.vx), L = 16 * f.s, wig = Math.sin(t * 12 + f.ph) * 0.18;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(ang + wig * 0.3);
      ctx.fillStyle = 'rgba(214,226,236,.4)';
      ctx.beginPath(); ctx.ellipse(0, 0, L, L * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(80,150,200,.6)';
      ctx.fillRect(-L * 0.7, -L * 0.04, L * 1.3, L * 0.08);
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(-L * 1.35, -L * 0.22 + wig * 4); ctx.lineTo(-L * 1.35, L * 0.22 + wig * 4); ctx.closePath();
      ctx.fillStyle = 'rgba(214,226,236,.45)'; ctx.fill();
      ctx.restore();
    }
  };
  step();
}

/* ---------- temps de l'île ---------- */
function island() {
  // courbes de niveau : contour réel de l'île, réductions successives (illustratif)
  const svg = $('[data-contour]');
  if (svg && window.HZ_MAP) {
    const NS = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', 'translate(200 260) rotate(-8) scale(1.05) translate(-520 -310)');
    for (let i = 0; i < 4; i++) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', window.HZ_MAP.island);
      const s = 1 - i * 0.2;
      p.setAttribute('transform', `translate(520 310) scale(${s}) translate(-520 -310)`);
      p.setAttribute('opacity', String(0.6 - i * 0.1));
      g.appendChild(p);
    }
    const trail = document.createElementNS(NS, 'path');
    trail.setAttribute('class', 'trail');
    trail.setAttribute('d', 'M470 470 C430 420 420 380 470 350 S560 330 600 360 S560 250 520 200 S560 150 610 150');
    g.appendChild(trail);
    svg.appendChild(g);
    if (!HZ.calm) {
      gsap.from(g.querySelectorAll('path:not(.trail)'), { drawSVG: '0%', duration: 2, stagger: 0.12, ease: 'power2.inOut', scrollTrigger: { trigger: svg, start: 'top 80%', once: true } });
      gsap.fromTo(trail, { strokeDashoffset: 0 }, { strokeDashoffset: -70, duration: 3, repeat: -1, ease: 'none' });
    }
  }
  // ligne de pêche qui plonge
  const ln = $('[data-fishing-line]');
  if (ln && !HZ.calm) gsap.fromTo(ln, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'power2.in', scrollTrigger: { trigger: ln.closest('.card'), start: 'top 75%', once: true } });
  // braises du Tondo
  embers($('[data-embers]'));
  // prochaine édition
  const next = $('[data-tondo-next]');
  const upd = () => {
    if (!next) return;
    const now = new Date();
    const y = now.getMonth() === 0 && now.getDate() <= 20 ? now.getFullYear() : now.getFullYear() + 1;
    next.textContent = t('tondo.next', { y });
  };
  upd();
  onLang(upd);
}

function embers(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const host = canvas.parentElement;
  let W, H;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const resize = () => { W = host.clientWidth; H = host.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize();
  addEventListener('resize', resize);
  const P = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: 0.0015 + Math.random() * 0.003, r: 0.6 + Math.random() * 1.8, ph: Math.random() * 6 }));
  const draw = (t) => {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of P) {
      const life = 1 - p.y;
      const x = p.x * W + Math.sin(t * 0.8 + p.ph) * 12 * life;
      const y = p.y * H;
      const a = Math.min(1, (1 - p.y) * 1.4) * Math.min(1, p.y * 3); // fondu doux, pas de clignotement
      const g = ctx.createRadialGradient(x, y, 0, x, y, p.r * 5);
      g.addColorStop(0, `rgba(255,190,120,${0.85 * a})`);
      g.addColorStop(1, 'rgba(226,104,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, p.r * 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  };
  if (HZ.calm) { draw(0); return; }
  let on = false, t = 0;
  new IntersectionObserver(([en]) => { on = en.isIntersecting; }).observe(host);
  const step = () => {
    requestAnimationFrame(step);
    if (!on) return;
    t += 0.016;
    for (const p of P) { p.y -= p.v; if (p.y < 0) { p.y = 1; p.x = Math.random(); } }
    draw(t);
  };
  step();
}

/* ---------- mythe : marée dans le puits ---------- */
function myth() {
  const w1 = $('[data-water]'), w2 = $('[data-water2]'), water = $('.well .water');
  if (!water || HZ.calm) return;
  gsap.to(w1, { attr: { d: 'M0 30 Q50 50 100 30 T200 30 T300 30 T400 30 V200 H0Z' }, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to(w2, { attr: { d: 'M0 40 Q50 58 100 40 T200 40 T300 40 T400 40 V200 H0Z' }, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.fromTo(water, { height: '22%' }, {
    height: '78%', ease: 'none',
    scrollTrigger: { trigger: '[data-myth]', start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

/* ---------- avis : cartes postales qui tanguent ---------- */
function reviews() {
  const track = $('[data-rev-track]');
  if (!track) return;
  const cards = $$('.postcard', track);
  if (!HZ.calm) {
    cards.forEach((c, i) => {
      gsap.set(c, { rotation: (i % 2 ? 1.6 : -1.4) });
      gsap.to(c, { y: i % 2 ? 8 : -8, rotation: i % 2 ? -0.8 : 0.9, duration: 3 + (i % 3) * 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 });
    });
    gsap.from(cards, { y: 80, opacity: 0, duration: 1.2, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: track, start: 'top 85%', once: true } });
  }
  const by = dir => {
    const w = cards[0] ? cards[0].getBoundingClientRect().width + 24 : 300;
    track.scrollBy({ left: dir * w, behavior: HZ.calm ? 'auto' : 'smooth' });
  };
  $('[data-rev-prev]')?.addEventListener('click', () => by(-1));
  $('[data-rev-next]')?.addEventListener('click', () => by(1));
  // glisser à la souris
  let down = false, sx = 0, sl = 0;
  track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = track.scrollLeft; track.style.scrollSnapType = 'none'; });
  addEventListener('pointerup', () => { if (!down) return; down = false; track.style.scrollSnapType = ''; });
  track.addEventListener('pointermove', e => { if (down) track.scrollLeft = sl - (e.clientX - sx); });
  track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') by(1); if (e.key === 'ArrowLeft') by(-1); });
}
