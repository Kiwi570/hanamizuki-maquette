/* Séjour : shōji, tarifs, calculateur (campagne ‑50 %), demande de réservation simulée. */
import { boot, HZ, gsap, ScrollTrigger, ink, t, yen, fmtDate, onLang, scrollTo } from './core.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const D = window.HZ_DATA;

boot(() => {
  shoji();
  prices();
  steppers();
  calculator();
  booking();
});

/* ---------- héro : les shōji coulissent ---------- */
function shoji() {
  const panes = $$('[data-shoji] > div');
  const title = $('[data-sj-hero] .hero-title');
  if (HZ.calm) { panes.forEach(p => { p.style.display = 'none'; }); return; }
  const tl = gsap.timeline({ delay: 0.5 });
  tl.to(panes[0], { xPercent: -100, duration: 1.8, ease: 'power3.inOut' }, 0)
    .to(panes[1], { xPercent: 100, duration: 1.8, ease: 'power3.inOut' }, 0)
    .from('.sj-room img', { scale: 1.18, duration: 2.6, ease: 'power3.out' }, 0)
    .add(ink(title) || gsap.timeline(), 0.7)
    .from('[data-sj-hero] .lede, [data-sj-hero] .label, [data-sj-hero] .ticket', { y: 24, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' }, 1);
  gsap.to('.sj-room img', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '[data-sj-hero]', start: 'top top', end: 'bottom top', scrub: true } });
}

/* ---------- tarifs ---------- */
function priceText(n, from) {
  if (!from) return yen(n);
  switch (HZ.lang) {
    case 'ja': return yen(n) + '〜';
    case 'ko': return yen(n) + '~';
    case 'fr': return 'dès ' + yen(n);
    default: return 'from ' + yen(n);
  }
}
function prices() {
  const upd = () => $$('[data-price]').forEach(n => { n.textContent = priceText(+n.dataset.price, n.hasAttribute('data-from')); });
  upd();
  onLang(upd);
  if (!HZ.calm) {
    gsap.from('[data-ledger] tr', { x: -24, opacity: 0, duration: 0.8, stagger: 0.05, ease: 'power3.out', scrollTrigger: { trigger: '[data-ledger]', start: 'top 85%', once: true } });
  }
}

/* ---------- compteurs +/- ---------- */
function steppers() {
  $$('.stepper').forEach(s => {
    const input = $('input', s);
    const clamp = v => Math.max(+input.dataset.min, Math.min(+input.dataset.max, v));
    $$('[data-step]', s).forEach(b => b.addEventListener('click', () => {
      input.value = clamp((parseInt(input.value, 10) || 0) + +b.dataset.step);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }));
    input.addEventListener('change', () => { input.value = clamp(parseInt(input.value, 10) || 0); input.dispatchEvent(new Event('input', { bubbles: true })); });
  });
}

/* ---------- dates (fuseau du Japon) ---------- */
const todayJST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
const asDate = iso => new Date(iso + 'T12:00:00+09:00');

/* ---------- calcul ---------- */
export function compute(v) {
  const P = D.prices, C = D.campaign;
  const persons = v.adults + v.children + v.infants;
  if (v.adults < 1) return { error: 'calc.err.adult' };
  if (v.plan === 'group' && persons > P.groupMax) return { error: 'calc.err.group' };
  const nights = [];
  let base = 0, disc = 0;
  for (let i = 0; i < v.nights; i++) {
    const date = addDays(v.checkin, i);
    const b = v.plan === 'group' ? P.group : v.adults * P.adult + v.children * P.child + v.infants * P.infant;
    const eligible = v.camp && date >= C.start && date <= C.end;
    const d = eligible ? Math.min(Math.floor(b * C.rate), C.capPersonNight * persons) : 0;
    nights.push({ date, base: b, disc: d, eligible });
    base += b; disc += d;
  }
  return { nights, base, disc, total: base - disc };
}
function readForm(f) {
  const n = name => parseInt(f.elements[name].value, 10) || 0;
  return {
    checkin: f.elements.checkin.value || todayJST(),
    nights: Math.max(1, n('nights')), adults: n('adults'), children: n('children'), infants: n('infants'),
    plan: f.elements.plan.value,
    camp: f.elements.camp ? f.elements.camp.checked : true,
  };
}
const nightLabel = i => (HZ.lang === 'ja' || HZ.lang === 'ko') ? `${i + 1}${t('calc.night')}` : `${t('calc.night').replace(/^./, c => c.toUpperCase())} ${i + 1}`;

function calculator() {
  const f = $('[data-calc]');
  if (!f) return null;
  const start = addDays(todayJST(), 14);
  f.elements.checkin.value = start;
  f.elements.checkin.min = todayJST();
  const out = { total: $('[data-total]', f), base: $('[data-base]', f), disc: $('[data-disc]', f), nights: $('[data-nights]', f), err: $('[data-calc-err]', f), fill: $('.calc-out .fill', f) };
  const shown = { v: 0 };
  let last = null;
  const render = () => {
    const v = readForm(f);
    const r = compute(v);
    last = { v, r };
    if (r.error) {
      out.err.textContent = t(r.error);
      out.total.textContent = '—'; out.base.textContent = '—'; out.disc.textContent = '—'; out.nights.innerHTML = '';
      return;
    }
    out.err.textContent = '';
    out.base.textContent = yen(r.base);
    out.disc.textContent = r.disc ? '−' + yen(r.disc) : yen(0);
    out.nights.innerHTML = r.nights.map((n, i) => `<li><span>${nightLabel(i)} · ${fmtDate(asDate(n.date), { month: 'short', day: 'numeric', weekday: 'short' })}</span><span class="${n.eligible ? 'ok' : ''}">${n.eligible ? t('calc.eligible') : t('calc.noteligible')} · ${yen(n.base - n.disc)}</span></li>`).join('');
    if (HZ.calm) out.total.textContent = yen(r.total);
    else gsap.to(shown, { v: r.total, duration: 0.8, ease: 'power3.out', onUpdate: () => { out.total.textContent = yen(shown.v); } });
    const h = 14 + Math.min(1, Math.log10(1 + r.total) / Math.log10(400000)) * 62;
    if (HZ.calm) out.fill.style.height = h + '%'; else gsap.to(out.fill, { height: h + '%', duration: 1, ease: 'power3.out' });
  };
  f.addEventListener('input', render);
  f.addEventListener('change', render);
  f.addEventListener('submit', e => e.preventDefault());
  onLang(render);
  render();
  if (!HZ.calm) gsap.to('[data-fill]', { attr: { d: 'M0 20 Q50 35 100 20 T200 20 T300 20 T400 20 V100 H0Z' }, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  $('[data-calc-book]')?.addEventListener('click', e => {
    e.preventDefault();
    const b = $('[data-bform]');
    if (b && last) {
      ['checkin', 'nights', 'adults', 'children', 'infants'].forEach(k => { b.elements[k].value = last.v[k]; });
      b.querySelector(`input[name="plan"][value="${last.v.plan}"]`).checked = true;
    }
    scrollTo('#reserver');
  });
  return { compute, readForm };
}

/* ---------- demande de réservation (démo) ---------- */
function booking() {
  const f = $('[data-bform]');
  if (!f) return;
  f.elements.checkin.value = addDays(todayJST(), 14);
  f.elements.checkin.min = todayJST();
  f.elements.lang.value = HZ.lang;
  const panels = $$('[data-panel]', f);
  const steps = $$('.bsteps li', f);
  const next = $('[data-bnext]', f), back = $('[data-bback]', f), again = $('[data-bagain]', f), err = $('[data-ferr]', f);
  const track = $('[data-btrack]', f), boatG = $('[data-bboat]', f);
  let step = 1;
  const moveBoat = (p, instant) => {
    const L = track.getTotalLength();
    const o = { p: moveBoat.p || 0 };
    const set = () => {
      const pt = track.getPointAtLength(o.p * L);
      boatG.setAttribute('transform', `translate(${pt.x} ${pt.y - 4})`);
      track.style.strokeDasharray = `${o.p * L} ${L}`;
    };
    if (instant || HZ.calm) { o.p = p; set(); }
    else gsap.to(o, { p, duration: 1, ease: 'power2.inOut', onUpdate: set });
    moveBoat.p = p;
  };
  const show = s => {
    step = s;
    panels.forEach(p => { p.hidden = +p.dataset.panel !== s; });
    steps.forEach((li, i) => { if (i + 1 === Math.min(s, 3)) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    back.hidden = s === 1 || s === 4;
    next.hidden = s === 4;
    again.hidden = s !== 4;
    $('[data-bnext-label]', f).textContent = t(s === 3 ? 'form.send' : 'form.next');
    $('[data-bnext-label]', f).dataset.i18n = s === 3 ? 'form.send' : 'form.next';
    err.textContent = '';
    moveBoat(s >= 3 ? 1 : (s - 1) / 2);
    const panel = panels.find(p => +p.dataset.panel === s);
    if (panel && !HZ.calm) gsap.from(panel, { y: 16, opacity: 0, duration: 0.5, ease: 'power2.out' });
  };
  const fieldName = el => {
    const lb = el.closest('.field')?.querySelector('label');
    return ((lb && (lb.querySelector('span[data-i18n]') || lb).textContent) || el.name).trim();
  };
  const validate = () => {
    const panel = panels.find(p => +p.dataset.panel === step);
    for (const el of $$('input, select, textarea', panel)) {
      if (el.required && !el.value.trim()) { err.textContent = t('form.err', { f: fieldName(el) }); el.focus(); return false; }
      if (el.type === 'email' && el.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)) { err.textContent = t('form.err.email'); el.focus(); return false; }
    }
    if (step === 1) {
      const r = compute(readBooking());
      if (r.error) { err.textContent = t(r.error); return false; }
    }
    return true;
  };
  const readBooking = () => {
    const n = k => parseInt(f.elements[k].value, 10) || 0;
    return { checkin: f.elements.checkin.value, nights: Math.max(1, n('nights')), adults: n('adults'), children: n('children'), infants: n('infants'), plan: f.querySelector('input[name="plan"]:checked').value, camp: true };
  };
  const summary = () => {
    const v = readBooking();
    const r = compute(v);
    const opts = $$('input[name="opt"]:checked', f).map(c => c.closest('label').textContent.trim());
    const rows = [
      [t('calc.checkin'), fmtDate(asDate(v.checkin), { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })],
      [t('calc.nights'), String(v.nights)],
      [t('calc.adults') + ' / ' + t('calc.children') + ' / ' + t('calc.infants'), `${v.adults} / ${v.children} / ${v.infants}`],
      [t('calc.plan'), t(v.plan === 'group' ? 'calc.plan2' : 'calc.plan1')],
      [t('form.options'), opts.join(', ') || '—'],
      [t('calc.total'), r.error ? '—' : yen(r.total)],
      [t('form.name'), f.elements.name.value],
      [t('form.email'), f.elements.email.value],
      [t('form.tel'), f.elements.tel.value],
    ];
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    $('[data-summary]', f).innerHTML = rows.map(([k, val]) => `<div><span>${esc(k)}</span><span>${esc(val)}</span></div>`).join('');
  };
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) return;
    if (step < 3) show(step + 1);
    else { summary(); show(4); }
  });
  back.addEventListener('click', () => show(Math.max(1, step - 1)));
  again.addEventListener('click', () => { f.reset(); f.elements.checkin.value = addDays(todayJST(), 14); f.elements.lang.value = HZ.lang; show(1); });
  onLang(() => { if (step === 4) summary(); $('[data-bnext-label]', f).textContent = t(step === 3 ? 'form.send' : 'form.next'); });
  moveBoat(0, true);
  show(1);
}
