/* Carte de la baie de Saiki : vraie côte (données MLIT simplifiées), routes et débarcadères indicatifs. */
import { t, onLang } from './core.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, parent) => {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};

// projection identique à celle de la génération des tracés
const LON0 = 131.865, LAT1 = 33.03, KX = 8333.3, KY = 9935.4;
const X = lon => (lon - LON0) * KX;
const Y = lat => (LAT1 - lat) * KY;

// points indicatifs (à confirmer avec l'hôte)
export const PTS = {
  port: [474, 538],
  kuboura: [446, 476],
  inn: [432, 466],
  ferry: [546, 438],
};
const ROUTES = {
  foot: 'M474 538 C468 520 452 500 446 478',
  car: 'M482 540 C512 524 540 470 546 440',
  road: 'M546 440 C520 448 470 452 434 466',
};

export function drawMap(host) {
  const M = window.HZ_MAP;
  const svg = el('svg', { viewBox: `0 0 ${M.w} ${M.h}`, role: 'img' });
  host.appendChild(svg);

  // graticule
  const grid = el('g', { class: 'grid' }, svg);
  [[131.90, '131°54′E'], [131.95, '131°57′E']].forEach(([lon, lbl]) => {
    el('line', { x1: X(lon), x2: X(lon), y1: 0, y2: M.h, 'stroke-dasharray': '3 6' }, grid);
    const tx = el('text', { x: X(lon) + 6, y: M.h - 10, class: 'coordlbl', style: 'font-family:var(--f-mono);font-size:11px;fill:var(--ai-300);stroke:none' }, grid);
    tx.textContent = lbl;
  });
  [[33.00, '33°00′N'], [32.95, '32°57′N']].forEach(([lat, lbl]) => {
    el('line', { x1: 0, x2: M.w, y1: Y(lat), y2: Y(lat), 'stroke-dasharray': '3 6' }, grid);
    const tx = el('text', { x: 8, y: Y(lat) - 6, style: 'font-family:var(--f-mono);font-size:11px;fill:var(--ai-300);stroke:none' }, grid);
    tx.textContent = lbl;
  });

  const landG = el('g', {}, svg);
  const lands = M.land.map(d => el('path', { d, class: 'land' }, landG));
  const isle = el('path', { d: M.island, class: 'isle' }, svg);

  // libellés
  const labels = el('g', {}, svg);
  const label = (key, x, y, cls = '', anchor = 'middle') => {
    const n = el('text', { x, y, class: cls, 'text-anchor': anchor }, labels);
    n.dataset.key = key;
    n.textContent = t(key);
    return n;
  };
  label('map.bay', 790, 560, 't-sea');
  label('map.island', 520, 395, 't-island');
  label('map.saiki', 250, 700, '');
  const bungo = label('map.bungo', 980, 236, 't-sea', 'end');
  bungo.setAttribute('style', 'font-size:18px');
  el('path', { d: 'M930 250 h40 m-8 -6 l8 6 -8 6', fill: 'none', stroke: 'var(--ai-300)', 'stroke-width': 1.5 }, labels);

  // échelle (1 km ≈ 89,5 unités avec cette projection) et nord
  const KM = 89.5;
  const sc = el('g', { class: 'scale', transform: 'translate(600 712)' }, svg);
  el('rect', { class: 'bg', x: -14, y: -26, width: KM + 64, height: 46, rx: 8 }, sc);
  el('line', { x1: 0, y1: 0, x2: KM, y2: 0 }, sc);
  [0, KM / 2, KM].forEach(x => el('line', { x1: x, y1: -6, x2: x, y2: 6 }, sc));
  [['0', 0], ['500 m', KM / 2], ['1 km', KM + 8]].forEach(([txt, x], i) => {
    const n = el('text', { x: i === 2 ? x : x, y: -10, 'text-anchor': i === 2 ? 'start' : 'middle' }, sc);
    n.textContent = txt;
  });
  const north = el('g', { class: 'north', transform: 'translate(770 150)' }, svg);
  el('path', { d: 'M0 -22 L8 6 L0 0 L-8 6 Z' }, north);
  const nt = el('text', { x: 0, y: 24, 'text-anchor': 'middle' }, north);
  nt.textContent = 'N';

  // routes
  const routes = {};
  routes.road = el('path', { d: ROUTES.road, class: 'road' }, svg);
  routes.car = el('path', { d: ROUTES.car, class: 'route route--car' }, svg);
  routes.foot = el('path', { d: ROUTES.foot, class: 'route route--foot' }, svg);

  // repères
  const pins = el('g', {}, svg);
  const pin = (key, [x, y], dx, dy, anchor = 'start', big = false) => {
    const g = el('g', { class: 'pin', transform: `translate(${x} ${y})` }, pins);
    el('circle', { r: big ? 7 : 5 }, g);
    const p = el('circle', { r: big ? 7 : 5, class: 'pulse' }, g);
    const tx = el('text', { x: dx, y: dy, 'text-anchor': anchor }, g);
    tx.dataset.key = key;
    tx.textContent = t(key);
    return { g, pulse: p };
  };
  const pPort = pin('map.port', PTS.port, 12, 26, 'start');
  const pKub = pin('map.kuboura', PTS.kuboura, 14, 8, 'start');
  const pFerry = pin('map.ferry', PTS.ferry, 14, 0, 'start');
  const innG = el('g', { transform: `translate(${PTS.inn[0]} ${PTS.inn[1]})` }, pins);
  const flower = el('use', { href: '#dogwood', x: -14, y: -14, width: 28, height: 28, fill: '#e2683c' }, innG);
  const innT = el('text', { x: -18, y: -10, 'text-anchor': 'end' }, innG);
  innT.dataset.key = 'map.inn';
  innT.textContent = t('map.inn');

  // bateaux
  const boat = (fill) => {
    const g = el('g', { class: 'boat' }, svg);
    el('path', { d: 'M-9 -3 L7 -3 L10 0 L7 3 L-9 3 Z', style: `fill:${fill}` }, g);
    el('path', { d: 'M-4 -1.5 h7 v3 h-7z', style: 'fill:#1f3a5f' }, g);
    return g;
  };
  const boats = { foot: boat('#faf6ee'), car: boat('#f3dcb0') };

  onLang(() => svg.querySelectorAll('text[data-key]').forEach(n => { n.textContent = t(n.dataset.key); }));

  const len = {};
  for (const k in routes) len[k] = routes[k].getTotalLength();

  const place = (k, p) => {
    const path = routes[k];
    const L = len[k];
    const a = path.getPointAtLength(Math.max(0, Math.min(L, p * L)));
    const b = path.getPointAtLength(Math.max(0, Math.min(L, p * L + 1)));
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    boats[k].setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${ang}) scale(1.6)`);
  };

  const api = {
    svg, lands, isle, routes, boats, pins: [pPort, pKub, pFerry], innG, len,
    place,
    show(mode) {
      const showFoot = mode !== 'car';
      const showCar = mode !== 'foot';
      routes.foot.style.opacity = showFoot ? 1 : .15;
      boats.foot.style.opacity = showFoot ? 1 : 0;
      routes.car.style.opacity = showCar ? 1 : .15;
      routes.road.style.opacity = showCar ? 1 : .15;
      boats.car.style.opacity = showCar ? 1 : 0;
    },
    // état final immédiat (mode calme, sans animation)
    still(mode) {
      api.show(mode);
      place('foot', 1);
      place('car', 1);
    },
  };
  place('foot', 0);
  place('car', 0);
  api.show(host.dataset.mode || 'both');
  return api;
}

/* Animation d'entrée commune : la côte se dessine, l'île se remplit, les routes et bateaux suivent. */
export function mapIntro(api, gsap, opts = {}) {
  const tl = gsap.timeline(opts);
  tl.from(api.lands, { drawSVG: '0%', duration: 1.6, ease: 'power2.inOut', stagger: 0.02 })
    .from(api.isle, { drawSVG: '0%', fillOpacity: 0, duration: 1.2, ease: 'power2.inOut' }, 0.4)
    .from([api.routes.foot, api.routes.car], { drawSVG: '0%', duration: 1, ease: 'power1.inOut', stagger: 0.15 }, 1.1)
    .from(api.routes.road, { drawSVG: '0%', duration: 0.6 }, 1.8)
    .from(api.pins.map(p => p.g), { scale: 0, transformOrigin: '50% 50%', duration: 0.5, stagger: 0.1, ease: 'back.out(2)' }, 1.2)
    .from(api.innG, { scale: 0, rotate: -90, transformOrigin: '50% 50%', duration: 0.8, ease: 'back.out(2)' }, 1.9)
    .add(() => {}, 2.2);
  const prog = { foot: 0, car: 0 };
  tl.to(prog, { foot: 1, car: 1, duration: 1.6, ease: 'power1.inOut', onUpdate: () => { api.place('foot', prog.foot); api.place('car', prog.car); } }, 1.3);
  return tl;
}

export function pulsePins(api, gsap) {
  api.pins.forEach((p, i) => {
    gsap.fromTo(p.pulse, { attr: { r: 5 }, opacity: 0.9 }, { attr: { r: 22 }, opacity: 0, duration: 2.2, repeat: -1, delay: i * 0.5, ease: 'power1.out' });
  });
}
