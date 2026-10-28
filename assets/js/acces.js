/* Accès : trajet pas à pas sur la carte, piéton / voiture, navette en diagramme radial. */
import { boot, HZ, gsap, ScrollTrigger, t, onLang, ink } from './core.js?v=20261028';
import { drawMap, mapIntro, pulsePins } from './map.js?v=20261028';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

boot(() => {
  hero();
  route();
  radial();
});

function hero() {
  if (HZ.calm) return;
  gsap.from('.ac-hero .label, .ac-hero .lede, .ac-quick span', { y: 24, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.6 });
  const title = $('.ac-hero .hero-title');
  if (title) ink(title, { delay: 0.5 });
  gsap.fromTo('[data-wake]', { scale: 1.15, yPercent: 0 }, { scale: 1.15, yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.ac-hero', start: 'top top', end: 'bottom top', scrub: true } });
}

/* ---------- trajet ---------- */
function route() {
  const host = $('[data-route] [data-map]');
  if (!host) return;
  const map = drawMap(host);
  let mode = 'foot';
  // progression du bateau par étape : 0 quai, 1 à bord, 2 arrivée, 3 maison
  const STOPS = [0, 0.45, 1, 1];
  const prog = { foot: 0, car: 0 };
  const place = () => { map.place('foot', prog.foot); map.place('car', prog.car); };
  const goTo = (i) => {
    const target = STOPS[i];
    if (HZ.calm) { prog[mode] = target; place(); }
    else gsap.to(prog, { [mode]: target, duration: 1.1, ease: 'power2.inOut', onUpdate: place });
    gsap.to(map.innG, { scale: i === 3 ? 1.6 : 1, transformOrigin: '50% 50%', duration: 0.6, ease: 'back.out(2)' });
    if (mode === 'car') gsap.to(map.routes.road, { strokeOpacity: i >= 3 ? 1 : 0.35, duration: 0.4 });
  };

  if (HZ.calm) map.still('foot');
  else {
    const intro = mapIntro(map, gsap, { paused: true });
    ScrollTrigger.create({ trigger: host, start: 'top 80%', once: true, onEnter: () => intro.play() });
    intro.eventCallback('onComplete', () => { prog.foot = 0; prog.car = 0; place(); });
    pulsePins(map, gsap);
  }
  map.show('foot');

  const triggers = [];
  const bind = () => {
    triggers.forEach(s => s.kill());
    triggers.length = 0;
    $$(`[data-steps="${mode}"] .step`).forEach((li, i, all) => {
      triggers.push(ScrollTrigger.create({
        trigger: li, start: 'top 60%', end: 'bottom 60%',
        onToggle: s => { if (s.isActive) { all.forEach(x => x.classList.toggle('is-active', x === li)); goTo(i); } },
      }));
    });
    ScrollTrigger.refresh();
  };
  bind();

  $$('[data-mode]').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    $$('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $$('[data-steps]').forEach(ol => { ol.hidden = ol.dataset.steps !== mode; });
    map.show(mode);
    prog.foot = 0; prog.car = 0; place();
    bind();
  }));
}

/* ---------- navette : directions réelles depuis le port de Kuzu, distances routières du site ---------- */
function bearing([lat1, lon1], [lat2, lon2]) {
  const r = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  return Math.atan2(y, x) / r;
}
function radial() {
  const host = $('[data-radial]');
  if (!host) return;
  const KUZU = [32.962, 131.915];
  const DEST = [
    { key: 'pk.usuki', km: 28, at: [33.126, 131.805] },
    { key: 'pk.oita', km: 58, at: [33.233, 131.606] },
    { key: 'pk.airport', km: 109, at: [33.479, 131.737] },
    { key: 'pk.fukuoka', km: 206, at: [33.590, 130.421] },
  ];
  const NS = 'http://www.w3.org/2000/svg';
  // toutes les destinations sont au nord‑ouest : le port est placé en bas à droite du cadre
  const CX = 520, CY = 540, R = 430, MAX = 206;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 600 600');
  let h = '';
  [50, 100, 150, 200].forEach(km => {
    const r = km / MAX * R;
    h += `<circle class="ring" cx="${CX}" cy="${CY}" r="${r.toFixed(1)}"/><text class="ringlbl" x="${CX + 6}" y="${(CY - r - 5).toFixed(1)}">${km} km</text>`;
  });
  h += `<path d="M${CX} ${CY - R - 10} v-30 m-6 10 l6 -10 6 10" fill="none" stroke="currentColor" stroke-width="1" opacity=".5"/><text x="${CX + 10}" y="${CY - R - 26}" class="ringlbl">N</text>`;
  DEST.forEach(d => {
    const b = bearing(KUZU, d.at) * Math.PI / 180;
    const r = d.km / MAX * R;
    const x = CX + Math.sin(b) * r, y = CY - Math.cos(b) * r;
    h += `<line class="ray" data-ray x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
    h += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#b4472a"/>`;
    h += `<text data-key="${d.key}" x="${(x - 8).toFixed(1)}" y="${(y - 12).toFixed(1)}" text-anchor="start">${t(d.key)}</text>`;
    h += `<text class="km" x="${(x - 8).toFixed(1)}" y="${(y + 22).toFixed(1)}" text-anchor="start">${d.km} km</text>`;
  });
  h += `<g transform="translate(${CX} ${CY})"><circle r="9" fill="#e2683c"/><circle r="16" fill="none" stroke="#e2683c" stroke-opacity=".4"/></g>`;
  h += `<text data-key="map.port" x="${CX}" y="${CY + 36}" text-anchor="middle">${t('map.port')}</text>`;
  svg.innerHTML = h;
  host.appendChild(svg);
  onLang(() => svg.querySelectorAll('text[data-key]').forEach(n => { n.textContent = t(n.dataset.key); }));
  if (HZ.calm) return;
  gsap.from(svg.querySelectorAll('[data-ray]'), { drawSVG: '0%', duration: 1.4, stagger: 0.2, ease: 'power2.out', scrollTrigger: { trigger: host, start: 'top 75%', once: true } });
  gsap.from(svg.querySelectorAll('.ring'), { scale: 0, svgOrigin: `${CX} ${CY}`, duration: 1.2, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: host, start: 'top 75%', once: true } });
}
