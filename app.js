/* Live Earthquake Globe — v4
 * Earthquake data: USGS Earthquake Hazards Program (real-time feeds + FDSN event service).
 */
const USGS = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/';
const HISTORY_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventtype=earthquake&starttime=1900-01-01&minmagnitude=7';
const IMG = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/';
const CLOUDS_URL = 'https://cdn.jsdelivr.net/gh/vasturiano/globe.gl@master/example/clouds/clouds.png';
const BORDERS_URL = 'https://cdn.jsdelivr.net/gh/vasturiano/globe.gl@master/example/datasets/ne_110m_admin_0_countries.geojson';
const RETINA = (window.devicePixelRatio || 1) > 1 ? '@2x' : '';

const STYLES = {
  realistic: { img: 'earth-blue-marble.jpg', shiny: true, clouds: true, borders: true, atmosphere: '#5fb4ff' },
  satellite: {
    img: 'earth-blue-marble.jpg', atmosphere: '#5fb4ff',
    tiles: (x, y, l) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`,
    credit: 'Imagery © <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>, Maxar, Earthstar Geographics',
  },
  dark: {
    img: 'earth-dark.jpg', atmosphere: '#4b6bff',
    tiles: (x, y, l) => `https://basemaps.cartocdn.com/dark_all/${l}/${x}/${y}${RETINA}.png`,
    credit: 'Map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
  },
  night: { img: 'earth-night.jpg', borders: true, atmosphere: '#ff8a50' },
};

const HOUR = 3600 * 1000;
const PERIOD_MS = { hour: HOUR, day: 24 * HOUR, week: 7 * 24 * HOUR, month: 30 * 24 * HOUR };
const REFRESH_MS = 60 * 1000;
const RETRY_MS = 15 * 1000;
const HOTSPOT_REFRESH_MS = 10 * 60 * 1000;
const OFFLINE_AFTER_MS = 5 * 60 * 1000;
const MERGE_THRESHOLD = 4000;
const NEAR_KM = 1000;
const FELT_MMI = 3;
const REPLAY_SECONDS = 30;
const DESKTOP_MIN_MAG = 4.5;
const LABEL_MIN_MAG = 5;
const PREF_KEY = 'eqglobe-prefs';
const PREF_IDS = ['colorMode', 'style', 'layer', 'rotate', 'follow', 'sort', 'clouds', 'borders', 'labels'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const MAG_SCALE = [
  [6, '#e040fb', 'M6+'], [5, '#ff3b30', 'M5–6'], [4, '#ff9500', 'M4–5'],
  [2.5, '#ffd60a', 'M2.5–4'], [-Infinity, '#34c759', null],
];
const DEPTH_SCALE = [
  [300, '#5e5ce6', '300+'], [70, '#0a84ff', '70–300'], [30, '#64d2ff', '30–70'], [-Infinity, '#ff453a', '0–30'],
];

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtMag = m => num(m, 1);
const fmtKm = km => t('kmUnit', { n: num(Math.round(km)) });
const scaleColor = (scale, v) => scale.find(([min]) => v >= min)[1];
const magColor = m => scaleColor(MAG_SCALE, m);
const depthColor = d => scaleColor(DEPTH_SCALE, d);
const colorOf = q => ($('colorMode').value === 'depth' ? depthColor(q.depth) : magColor(q.mag));
const pointAlt = q => clamp((q.mag + 1) * 0.012, 0.005, 0.18);

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function heat(n, a) {
  const k = clamp(n / 40, 0, 1);
  return `rgba(255,${Math.round(210 - 170 * k)},${Math.round(60 - 40 * k)},${a})`;
}
function ago(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return t('secAgo', { n: num(s) });
  const m = Math.round(s / 60);
  if (m < 60) return t('minAgo', { n: num(m) });
  const h = Math.round(m / 60);
  if (h < 48) return t('hAgo', { n: num(h) });
  return t('dAgo', { n: num(Math.round(h / 24)) });
}
function distKm(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function timeRange() {
  const to = Date.now();
  return { from: to - PERIOD_MS[$('period').value], to };
}
function fmtAxis(ms) {
  const short = ['hour', 'day'].includes($('period').value);
  return new Date(ms).toLocaleString(LOC(), short ? { hour: '2-digit', minute: '2-digit' } : { month: 'short', day: 'numeric' });
}
// Estimated intensity at the user's location (Bakun & Wentworth 1997, hypocentral distance)
function estMmi(q) {
  if (!state.me || q.dist == null) return null;
  const r = Math.hypot(q.dist, q.depth);
  return clamp(3.67 + 1.17 * q.mag - 3.19 * Math.log10(Math.max(r, 5)), 1, 10);
}
function mmiText(v) {
  const i = clamp(Math.round(v), 1, 10);
  const key = i === 1 ? 'mmi1' : i <= 3 ? 'mmi2' : `mmi${i}`;
  return `${ROMAN[i - 1]} · ${t(key)}`;
}
function parse(geo) {
  return geo.features
    .filter(f => f.geometry && f.properties.mag != null)
    .map(f => {
      const [lng, lat, depth] = f.geometry.coordinates;
      const p = f.properties;
      return {
        id: f.id, lat, lng, depth: depth ?? 0, mag: p.mag,
        place: p.place || p.title || 'Unknown location', time: p.time,
        url: p.url, tsunami: p.tsunami === 1, alert: p.alert, felt: p.felt,
        mmi: p.mmi, sig: p.sig, magType: p.magType, status: p.status,
      };
    });
}
function tooltip(q) {
  const extra = state.me ? ` · ${t('kmAway', { n: num(Math.round(q.dist)) })}` : '';
  return `<b style="color:${magColor(q.mag)}">M${fmtMag(q.mag)}</b> ${esc(q.place)}<br>
    <small>${ago(q.time)} · ${t('kmDeep', { n: num(Math.round(q.depth)) })}${extra}</small>`;
}

/* ---------- state & preferences ---------- */
const state = {
  quakes: [], seen: new Set(), firstLoad: true, loading: false, nextRefresh: 0, updatedAt: 0,
  ok: false, offline: false, hotspots: [], history: null, historyLoading: false, selected: null,
  me: null, locating: false, replayT: null, playing: false, unseen: 0,
};
let THREE = null, clouds = null, waterMap = null, borders = [], currentTiles = null;

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY)) || {};
    PREF_IDS.forEach(id => {
      if (p[id] === undefined) return;
      const el = $(id);
      if (el.type === 'checkbox') el.checked = p[id];
      else { el.value = p[id]; if (el.value === '') el.selectedIndex = 0; }
    });
  } catch { /* ignore broken prefs */ }
}
function savePrefs() {
  const p = {};
  PREF_IDS.forEach(id => { const el = $(id); p[id] = el.type === 'checkbox' ? el.checked : el.value; });
  localStorage.setItem(PREF_KEY, JSON.stringify(p));
}

const params = new URLSearchParams(location.search);
if (params.get('period')) $('period').value = params.get('period');
if (params.get('mag')) $('level').value = params.get('mag');
if (!$('period').value) $('period').value = 'day';
if (!$('level').value) $('level').value = '2.5';
loadPrefs();
applyStaticI18n();

/* ---------- globe ---------- */
const globe = new Globe($('globe'))
  .globeImageUrl(IMG + 'earth-blue-marble.jpg')
  .bumpImageUrl(IMG + 'earth-topology.png')
  .backgroundImageUrl(IMG + 'night-sky.png')
  .atmosphereAltitude(0.2)
  .globeCurvatureResolution(2)
  .pointLat('lat').pointLng('lng')
  .pointAltitude(pointAlt)
  .pointRadius(q => clamp(0.12 + q.mag * 0.07, 0.1, 0.7))
  .pointColor(q => colorOf(q))
  .pointResolution(16)
  .pointLabel(tooltip)
  .pointsTransitionDuration(600)
  .onPointClick(q => select(q))
  .labelLat('lat').labelLng('lng')
  .labelText(q => `M${q.mag.toFixed(1)}`)
  .labelSize(q => clamp(0.4 + (q.mag - LABEL_MIN_MAG) * 0.3, 0.4, 1.3))
  .labelColor(q => colorOf(q))
  .labelIncludeDot(false)
  .labelAltitude(q => pointAlt(q) + 0.01)
  .labelResolution(2)
  .labelLabel(tooltip)
  .onLabelClick(q => select(q))
  .ringLat('lat').ringLng('lng')
  .ringColor(q => k => rgba(colorOf(q), 1 - k))
  .ringMaxRadius(q => clamp(q.mag * 1.2, 1.5, 8))
  .ringPropagationSpeed(q => (q.isNew ? 4 : 2))
  .ringRepeatPeriod(q => (q.isNew ? 500 : 1200))
  .polygonCapColor(() => 'rgba(0,0,0,0)')
  .polygonSideColor(() => 'rgba(0,0,0,0)')
  .polygonStrokeColor(() => 'rgba(255,255,255,0.3)')
  .polygonAltitude(0.003)
  .polygonsTransitionDuration(0)
  .pointerEventsFilter((obj, data) => !(data && data.type === 'Feature'))
  .hexBinPointLat('lat').hexBinPointLng('lng')
  .hexMargin(0.15)
  .hexTransitionDuration(800)
  .htmlLat('lat').htmlLng('lng')
  .htmlElement(() => {
    const el = document.createElement('div');
    el.className = 'me';
    return el;
  })
  .onGlobeReady(() => sharpen());

globe.renderer().setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
const sun = globe.lights().find(l => l.type === 'DirectionalLight');
if (sun) sun.position.set(1, 1, 1);
globe.pointOfView({ lat: 30, lng: 55, altitude: 2.3 });
globe.controls().autoRotate = $('rotate').checked;
globe.controls().autoRotateSpeed = 0.35;
window.addEventListener('resize', () => {
  globe.width(innerWidth).height(innerHeight);
  drawChart();
});

/* ---------- map style & graphics ---------- */
function applyStyle() {
  const s = STYLES[$('style').value] || STYLES.realistic;
  globe.globeImageUrl(IMG + s.img).atmosphereColor(s.atmosphere);
  const tiles = s.tiles || null;
  if (tiles !== currentTiles) {
    currentTiles = tiles;
    globe.globeTileEngineUrl(tiles);
  }
  const mat = globe.globeMaterial();
  mat.bumpScale = tiles ? 1 : 10;
  if (THREE) {
    mat.specularMap = s.shiny ? waterMap : null;
    mat.specular = new THREE.Color(s.shiny ? '#555555' : '#000000');
    mat.shininess = s.shiny ? 15 : 0;
    mat.needsUpdate = true;
  }
  if (clouds) clouds.visible = Boolean(s.clouds && $('clouds').checked);
  $('mapCredit').innerHTML = s.credit ? ` · ${s.credit}` : '';
  applyBorders();
  setTimeout(sharpen, 2500);
}
function applyBorders() {
  const s = STYLES[$('style').value] || STYLES.realistic;
  globe.polygonsData($('borders').checked && s.borders ? borders : []);
}
function sharpen() {
  const mat = globe.globeMaterial();
  if (mat.map) {
    mat.map.anisotropy = globe.renderer().capabilities.getMaxAnisotropy();
    mat.map.needsUpdate = true;
  }
}
function loadExtras() {
  import('https://esm.sh/three').then(mod => {
    THREE = mod;
    const loader = new THREE.TextureLoader();
    loader.load(IMG + 'earth-water.png', tex => { waterMap = tex; applyStyle(); });
    loader.load(CLOUDS_URL, tex => {
      clouds = new THREE.Mesh(
        new THREE.SphereGeometry(globe.getGlobeRadius() * 1.004, 75, 75),
        new THREE.MeshPhongMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false })
      );
      globe.scene().add(clouds);
      (function spin() {
        clouds.rotation.y += (0.006 * Math.PI) / 180;
        requestAnimationFrame(spin);
      })();
      applyStyle();
    });
  }).catch(err => console.warn('3D extras unavailable:', err));
}
function loadBorders() {
  fetch(BORDERS_URL)
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(geo => { borders = geo.features; applyBorders(); })
    .catch(err => console.warn('Borders unavailable:', err));
}

/* ---------- seismic layer (30-day hotspots / history since 1900) ---------- */
function hexInfo(h) {
  const top = h.points.reduce((a, b) => (b.mag > a.mag ? b : a));
  return {
    n: num(h.points.length), m: fmtMag(top.mag),
    year: num(new Date(top.time).getUTCFullYear(), 0, false), place: esc(top.place),
  };
}
function applyLayer() {
  const mode = $('layer').value;
  const hist = mode === 'history';
  if (hist && !state.history) loadHistory();
  globe
    .hexBinResolution(hist ? 2 : 3)
    .hexAltitude(({ sumWeight }) => Math.min(sumWeight * (hist ? 0.012 : 0.004), hist ? 0.35 : 0.3))
    .hexTopColor(h => heat(h.sumWeight * (hist ? 4 : 1), 0.55))
    .hexSideColor(h => heat(h.sumWeight * (hist ? 4 : 1), 0.25))
    .hexLabel(h => t(hist ? 'hexHistory' : 'hexRecent', hexInfo(h)))
    .hexBinPointsData(mode === 'recent' ? state.hotspots : hist ? state.history || [] : []);
  renderLegend();
}
async function loadHistory() {
  if (state.historyLoading) return;
  state.historyLoading = true;
  toast(t('historyLoading'));
  try {
    const res = await fetch(HISTORY_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.history = parse(await res.json());
    toast(t('historyLoaded', { n: num(state.history.length) }));
    if ($('layer').value === 'history') applyLayer();
  } catch (err) {
    console.error('History:', err);
    toast(t('historyError'));
  } finally {
    state.historyLoading = false;
  }
}
async function loadHotspots() {
  try {
    const res = await fetch(`${USGS}2.5_month.geojson`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.hotspots = parse(await res.json());
    if ($('layer').value === 'recent') applyLayer();
  } catch (err) {
    console.error('Hotspots:', err);
  }
}

/* ---------- live data ---------- */
function setStatus(kind, msg = '') {
  $('status').className = kind;
  state.ok = kind === 'ok' || kind === 'offline';
  if (kind === 'loading') $('statusText').textContent = t('stLoading');
  if (kind === 'error') $('statusText').textContent = t('stError', { msg });
}
async function load() {
  if (state.loading) return;
  state.loading = true;
  setStatus('loading');
  try {
    const url = `${USGS}${$('level').value}_${$('period').value}.geojson`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const geo = await res.json();

    const prev = new Map(state.quakes.map(q => [q.id, q]));
    const fresh = [];
    const quakes = parse(geo).map(q => {
      const isNew = !state.firstLoad && !state.seen.has(q.id);
      state.seen.add(q.id);
      const obj = Object.assign(prev.get(q.id) || q, q, { isNew });
      if (state.me) obj.dist = distKm(state.me, obj);
      if (isNew) fresh.push(obj);
      return obj;
    }).sort((a, b) => b.time - a.time);

    state.quakes = quakes;
    state.firstLoad = false;
    state.updatedAt = geo.metadata?.generated || Date.now();
    state.offline = Date.now() - state.updatedAt > OFFLINE_AFTER_MS;
    render();
    if (!state.offline) notify(fresh.sort((a, b) => b.mag - a.mag));
    setStatus(state.replayT != null ? 'replay' : state.offline ? 'offline' : 'ok');
    state.ok = true;
    state.nextRefresh = Date.now() + REFRESH_MS;
  } catch (err) {
    console.error(err);
    setStatus('error', err.message);
    state.nextRefresh = Date.now() + RETRY_MS;
  } finally {
    state.loading = false;
    $('loader').classList.add('gone');
  }
}

/* ---------- rendering ---------- */
const visible = () => (state.replayT == null ? state.quakes : state.quakes.filter(q => q.time <= state.replayT));

function render() {
  const live = state.replayT == null;
  const now = live ? Date.now() : state.replayT;
  const q = visible();
  const big = q.length > MERGE_THRESHOLD;
  const { from, to } = timeRange();
  const ringWindow = live ? HOUR : Math.max(HOUR, (to - from) / 40);

  globe.pointsMerge(big).pointsData(q);
  globe.ringsData(q.filter(x => (live && x.isNew) || now - x.time < ringWindow));
  globe.labelsData($('labels').checked ? q.filter(x => x.mag >= LABEL_MIN_MAG).slice(0, 150) : []);
  $('perfHint').hidden = !big;

  $('statCount').textContent = num(q.length);
  const max = q.reduce((m, x) => (!m || x.mag > m.mag ? x : m), null);
  $('statMax').textContent = max ? fmtMag(max.mag) : '–';
  $('statHour').textContent = num(q.filter(x => now - x.time < HOUR).length);
  $('statNear').textContent = state.me ? num(q.filter(x => x.dist <= NEAR_KM).length) : '–';

  renderFeed();
  drawChart();
}

function renderFeed() {
  const term = $('search').value.trim().toLowerCase();
  let items = visible();
  if (term) items = items.filter(q => q.place.toLowerCase().includes(term));
  const sort = $('sort').value;
  if (sort === 'mag') items = [...items].sort((a, b) => b.mag - a.mag);
  if (sort === 'dist' && state.me) items = [...items].sort((a, b) => a.dist - b.dist);
  items = items.slice(0, 80);

  $('feedList').innerHTML = items.length
    ? items.map(q => {
      const parts = [ago(q.time), t('kmDeep', { n: num(Math.round(q.depth)) })];
      if (state.me) {
        parts.push(t('kmAway', { n: num(Math.round(q.dist)) }));
        const mm = estMmi(q);
        if (mm >= FELT_MMI) parts.push(`〰 ${ROMAN[clamp(Math.round(mm), 1, 10) - 1]}`);
      }
      if (q.tsunami) parts.push('🌊');
      return `<li data-id="${esc(q.id)}" class="${q.isNew && state.replayT == null ? 'new' : ''}">
        <span class="mag" style="background:${magColor(q.mag)}">${fmtMag(q.mag)}</span>
        <div><div class="place">${esc(q.place)}</div><div class="meta">${parts.join(' · ')}</div></div>
      </li>`;
    }).join('')
    : `<li class="empty">${t(term ? 'noMatches' : 'noQuakes')}</li>`;
}

function renderLegend() {
  const depth = $('colorMode').value === 'depth';
  const scale = depth ? DEPTH_SCALE : MAG_SCALE;
  const items = [...scale].reverse().map(([, c, label]) => {
    const text = depth ? `${label} ${t('km')}` : label ?? t('belowM25');
    return `<span><i style="background:${c}"></i>${text}</span>`;
  });
  items.push(`<span>${t('lgLastHour')}</span>`);
  const mode = $('layer').value;
  if (mode !== 'off') items.push(`<span>${t(mode === 'history' ? 'lgHistory' : 'lgRecent')}</span>`);
  $('legend').innerHTML = items.join('');
}

function drawChart() {
  const c = $('chart');
  const w = c.clientWidth, h = 56, dpr = window.devicePixelRatio || 1;
  if (!w) return;
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = h * dpr; }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const { from, to } = timeRange();
  const N = 48, span = to - from, bw = w / N;
  const bins = Array.from({ length: N }, () => ({ n: 0, max: -Infinity }));
  for (const q of state.quakes) {
    const i = Math.floor(((q.time - from) / span) * N);
    if (i < 0 || i >= N) continue;
    bins[i].n++;
    bins[i].max = Math.max(bins[i].max, q.mag);
  }
  const top = Math.max(1, ...bins.map(b => b.n));
  const rtl = LANG === 'fa';
  bins.forEach((b, i) => {
    if (!b.n) return;
    const bh = Math.max(2, (b.n / top) * (h - 4));
    const future = state.replayT != null && from + (i / N) * span > state.replayT;
    const x = rtl ? w - (i + 1) * bw : i * bw;
    ctx.globalAlpha = future ? 0.2 : 0.9;
    ctx.fillStyle = magColor(b.max);
    ctx.fillRect(x + 1, h - bh, Math.max(1, bw - 2), bh);
  });
  ctx.globalAlpha = 1;
  if (state.replayT != null) {
    const f = (state.replayT - from) / span;
    ctx.fillStyle = '#fff';
    ctx.fillRect((rtl ? 1 - f : f) * w - 1, 0, 2, h);
  }
  $('chartFrom').textContent = fmtAxis(from);
}

/* ---------- details ---------- */
function select(q, fly = true) {
  state.selected = q;
  if (fly) {
    globe.controls().autoRotate = false;
    globe.pointOfView({ lat: q.lat, lng: q.lng, altitude: 1.4 }, 1200);
  }
  const d = new Date(q.time);
  const mm = estMmi(q);
  const row = (k, v) => `<dt>${t(k)}</dt><dd>${v}</dd>`;
  $('details').innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <div class="big" style="color:${magColor(q.mag)}">M ${fmtMag(q.mag)} <small>${esc(q.magType)}</small></div>
    <h3>${esc(q.place)}</h3>
    <dl>
      ${row('dLocal', `${d.toLocaleString(LOC())} (${ago(q.time)})`)}
      ${row('dUtc', d.toISOString().replace('T', ' ').slice(0, 19))}
      ${row('dDepth', t('kmUnit', { n: num(q.depth, 1) }))}
      ${row('dCoords', `${q.lat.toFixed(3)}, ${q.lng.toFixed(3)}`)}
      ${state.me ? row('dFromYou', fmtKm(q.dist)) : ''}
      ${mm != null ? row('dShake', `${mmiText(mm)} <small class="muted">(${t('rough')})</small>`) : ''}
      ${row('dMmi', q.mmi != null ? `MMI ${num(q.mmi, 1)}` : '—')}
      ${row('dPager', q.alert ? `<span class="alert ${esc(q.alert)}">${esc(q.alert)}</span>` : '—')}
      ${row('dTsunami', t(q.tsunami ? 'yes' : 'no'))}
      ${row('dFelt', num(q.felt ?? 0))}
      ${row('dSig', q.sig != null ? num(q.sig) : '—')}
      ${row('dStatus', esc(q.status))}
    </dl>
    <div class="links">
      <a href="${esc(q.url)}" target="_blank" rel="noopener">${t('usgsPage')}</a>
      <a href="${esc(q.url)}/tellus" target="_blank" rel="noopener">${t('feltIt')}</a>
    </div>`;
  $('details').hidden = false;
}
function closeDetails() {
  $('details').hidden = true;
  state.selected = null;
  globe.controls().autoRotate = $('rotate').checked;
}

/* ---------- replay ---------- */
let rafId = null, lastFrame = 0;

function seek(time) {
  const { from, to } = timeRange();
  if (time >= to - 1000) return goLive();
  state.replayT = clamp(time, from, to);
  $('live').classList.remove('on');
  $('status').className = 'replay';
  $('statusText').textContent = t('stReplay');
  $('scrub').value = Math.round(((state.replayT - from) / (to - from)) * 1000);
  $('replayTime').textContent = t('replayAt', { time: new Date(state.replayT).toLocaleString(LOC()) });
  render();
}
function step(now) {
  if (!state.playing) return;
  const dt = now - lastFrame;
  if (dt >= 200) {
    lastFrame = now;
    const { from, to } = timeRange();
    seek(state.replayT + ((to - from) * dt) / (REPLAY_SECONDS * 1000));
  }
  rafId = requestAnimationFrame(step);
}
function play() {
  const { from, to } = timeRange();
  if (state.replayT == null || state.replayT >= to - 1000) state.replayT = from;
  state.playing = true;
  $('play').textContent = t('pause');
  lastFrame = performance.now();
  seek(state.replayT);
  rafId = requestAnimationFrame(step);
}
function pause() {
  state.playing = false;
  cancelAnimationFrame(rafId);
  $('play').textContent = t('replay');
}
function togglePlay() {
  if (state.playing) pause();
  else play();
}
function goLive() {
  pause();
  state.replayT = null;
  $('live').classList.add('on');
  $('scrub').value = 1000;
  $('replayTime').textContent = '';
  setStatus(state.ok ? (state.offline ? 'offline' : 'ok') : 'loading');
  render();
}

/* ---------- notifications ---------- */
let audioCtx;
function beep(mag) {
  if (!$('sound').checked || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 880 - clamp(mag, 0, 8) * 60;
  gain.gain.setValueAtTime(0.15, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.6);
}
function toast(html, quake, cls = '', ms = 7000) {
  const el = document.createElement('div');
  el.className = `toast ${cls}`;
  el.innerHTML = html;
  if (quake) el.onclick = () => select(quake);
  $('toasts').prepend(el);
  setTimeout(() => el.classList.add('hide'), ms);
  setTimeout(() => el.remove(), ms + 600);
}
function notify(fresh) {
  if (!fresh.length) return;
  fresh.slice(0, 3).forEach(q =>
    toast(`<b style="color:${magColor(q.mag)}">${t('newQuake', { m: fmtMag(q.mag) })}</b> · ${esc(q.place)}`, q));
  if (fresh.length > 3) toast(t('moreNew', { n: num(fresh.length - 3) }));
  beep(fresh[0].mag);
  if ($('desktop').checked && 'Notification' in window && Notification.permission === 'granted') {
    fresh.filter(q => q.mag >= DESKTOP_MIN_MAG).slice(0, 3).forEach(q => {
      const n = new Notification(t('notifTitle', { m: fmtMag(q.mag) }), {
        body: `${q.place}\n${t('kmDeep', { n: num(Math.round(q.depth)) })}`, tag: q.id,
      });
      n.onclick = () => { window.focus(); select(q); };
    });
  }
  if (document.hidden) {
    state.unseen += fresh.length;
    document.title = `(${num(state.unseen)}) ${t('docTitle')}`;
  }
  if ($('follow').checked && state.replayT == null) select(fresh[0]);
}

/* ---------- near me ---------- */
function updateNearBtn() {
  $('nearMe').textContent = t(state.me ? 'located' : state.locating ? 'locating' : 'nearMe');
}
function locateMe() {
  if (!navigator.geolocation) return toast(t('geoNA'));
  state.locating = true;
  updateNearBtn();
  navigator.geolocation.getCurrentPosition(pos => {
    state.locating = false;
    state.me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    state.quakes.forEach(q => { q.dist = distKm(state.me, q); });
    globe.htmlElementsData([state.me]);
    globe.pointOfView({ lat: state.me.lat, lng: state.me.lng, altitude: 1.6 }, 1500);
    $('rotate').checked = false;
    globe.controls().autoRotate = false;
    $('sort').value = 'dist';
    updateNearBtn();
    render();
    const near = state.quakes.filter(q => q.dist <= NEAR_KM).length;
    const felt = state.quakes.filter(q => estMmi(q) >= FELT_MMI).length;
    const km = num(NEAR_KM);
    toast(`${near ? t('nearCount', { n: num(near), km }) : t('nearNone', { km })}`
      + `${felt ? `<br>${t('feltCount', { n: num(felt) })}` : ''}<br><small>${t('privacy')}</small>`, null, '', 10000);
  }, err => {
    state.locating = false;
    updateNearBtn();
    toast(t('geoErr', { msg: esc(err.message) }));
  }, { timeout: 15000, maximumAge: 10 * 60 * 1000 });
}

/* ---------- language ---------- */
function refreshLang() {
  applyStaticI18n();
  $('langBtn').textContent = LANG === 'fa' ? 'EN' : 'فا';
  $('play').textContent = t(state.playing ? 'pause' : 'replay');
  updateNearBtn();
  applyLayer();
  render();
  if (state.replayT != null) seek(state.replayT);
  if (state.selected && !$('details').hidden) select(state.selected, false);
  if (typeof refreshSensorLang === 'function') refreshSensorLang();
}

/* ---------- UI wiring ---------- */
function syncUrl() {
  const p = new URLSearchParams({ period: $('period').value, mag: $('level').value });
  history.replaceState(null, '', `?${p}`);
}
['period', 'level'].forEach(id => $(id).addEventListener('change', () => {
  state.seen.clear();
  state.firstLoad = true;
  syncUrl();
  goLive();
  load();
}));
$('colorMode').addEventListener('change', () => {
  globe.pointColor(q => colorOf(q))
    .ringColor(q => k => rgba(colorOf(q), 1 - k))
    .labelColor(q => colorOf(q));
  renderLegend();
});
$('style').addEventListener('change', applyStyle);
$('clouds').addEventListener('change', applyStyle);
$('borders').addEventListener('change', applyBorders);
$('labels').addEventListener('change', render);
$('layer').addEventListener('change', applyLayer);
$('rotate').addEventListener('change', e => {
  globe.controls().autoRotate = e.target.checked && !state.selected;
});
$('sound').addEventListener('change', e => {
  if (!e.target.checked) return;
  audioCtx ||= new AudioContext();
  audioCtx.resume();
  beep(3);
});
$('desktop').addEventListener('change', async e => {
  if (!e.target.checked) return;
  if (!('Notification' in window)) {
    e.target.checked = false;
    return toast(t('notifNA'));
  }
  if (await Notification.requestPermission() !== 'granted') {
    e.target.checked = false;
    toast(t('notifDenied'));
  }
});
$('langBtn').addEventListener('click', () => {
  LANG = LANG === 'fa' ? 'en' : 'fa';
  localStorage.setItem('eqglobe-lang', LANG);
  refreshLang();
});
$('nearMe').addEventListener('click', locateMe);
$('search').addEventListener('input', renderFeed);
$('sort').addEventListener('change', renderFeed);
$('play').addEventListener('click', togglePlay);
$('live').addEventListener('click', goLive);
$('scrub').addEventListener('input', e => {
  pause();
  const { from, to } = timeRange();
  seek(from + (e.target.value / 1000) * (to - from));
});
$('chart').addEventListener('click', e => {
  pause();
  const r = $('chart').getBoundingClientRect();
  let f = (e.clientX - r.left) / r.width;
  if (LANG === 'fa') f = 1 - f;
  const { from, to } = timeRange();
  seek(from + f * (to - from));
});
$('collapse').addEventListener('click', () => {
  const collapsed = $('panel').classList.toggle('collapsed');
  $('collapse').textContent = collapsed ? '+' : '–';
  if (!collapsed) drawChart();
});
$('feedList').addEventListener('click', e => {
  const li = e.target.closest('li[data-id]');
  const q = li && state.quakes.find(x => x.id === li.dataset.id);
  if (q) select(q);
});
$('details').addEventListener('click', e => {
  if (e.target.closest('.close')) closeDetails();
});
document.addEventListener('change', e => {
  if (PREF_IDS.includes(e.target.id)) savePrefs();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    state.unseen = 0;
    document.title = t('docTitle');
  }
});
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea, button')) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'l' || e.key === 'L') goLive();
  else if (e.key === 'r' || e.key === 'R') {
    $('rotate').checked = !$('rotate').checked;
    $('rotate').dispatchEvent(new Event('change', { bubbles: true }));
  }
  else if (e.key === 'Escape') closeDetails();
});

setInterval(() => {
  if (state.loading) return;
  const s = Math.max(0, Math.ceil((state.nextRefresh - Date.now()) / 1000));
  if (s === 0) return load();
  if (state.ok && state.replayT == null) {
    const time = new Date(state.updatedAt).toLocaleTimeString(LOC());
    $('status').className = state.offline ? 'offline' : 'ok';
    $('statusText').textContent = state.offline ? t('stOffline', { time }) : t('stLive', { time, s: num(s) });
  }
}, 1000);

/* ---------- start ---------- */
$('langBtn').textContent = LANG === 'fa' ? 'EN' : 'فا';
$('play').textContent = t('replay');
updateNearBtn();
applyStyle();
applyLayer();
loadExtras();
loadBorders();
load();
loadHotspots();
setInterval(loadHotspots, HOTSPOT_REFRESH_MS);

if ('serviceWorker' in navigator &&
    (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service worker:', err));
}
// end of app.js
