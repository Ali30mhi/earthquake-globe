/* Live Earthquake Globe — "My sensor" panel
 * Talks to the ESP32 quake sensor (sensor/quake_sensor) over WebSocket on port 81.
 */
const sensor = {
  ws: null, want: false, connected: false, retry: null,
  host: localStorage.getItem('eqglobe-sensor') || 'quake-sensor.local',
  fs: 100, buf: new Float32Array(1000), pos: 0, filled: 0,
  warm: 0, alarm: false, events: [], drawing: false, statusKey: 'sensorIdle', statusVars: {},
};

// Peak ground acceleration (milli-g) -> instrumental intensity (Wald et al. 1999)
function sensorMmi(pgaMg) {
  const pga = Math.max(pgaMg * 0.980665, 0.01);
  const lo = 2.2 * Math.log10(pga) + 1.0;
  return clamp(lo < 5 ? lo : 3.66 * Math.log10(pga) - 1.66, 1, 10);
}
function setSensorStatus(key, vars = {}) {
  sensor.statusKey = key;
  sensor.statusVars = vars;
  $('sensorStatus').textContent = t(key, vars);
}
function updateSensorUi() {
  $('sensorConnect').textContent = t(sensor.want ? 'disconnect' : 'connect');
  $('sensorTest').disabled = !sensor.connected;
}
function refreshSensorLang() {
  setSensorStatus(sensor.statusKey, sensor.statusVars);
  updateSensorUi();
  renderSensorEvents();
}

function sensorConnect() {
  if (location.protocol === 'https:') return toast(t('sensorHttps'), null, '', 10000);
  sensor.host = $('sensorHost').value.trim() || 'quake-sensor.local';
  localStorage.setItem('eqglobe-sensor', sensor.host);
  sensor.want = true;
  audioCtx ||= new AudioContext();
  audioCtx.resume();
  updateSensorUi();
  openSocket();
}
function sensorDisconnect() {
  sensor.want = false;
  clearTimeout(sensor.retry);
  if (sensor.ws) sensor.ws.close();
  setSensorStatus('sensorIdle');
  updateSensorUi();
}
function openSocket() {
  clearTimeout(sensor.retry);
  if (sensor.ws) { sensor.ws.onclose = null; sensor.ws.close(); }
  setSensorStatus('sensorConnecting', { host: sensor.host });
  let ws;
  try {
    ws = new WebSocket(`ws://${sensor.host}:81/`);
  } catch (err) {
    $('sensorStatus').textContent = err.message;
    return;
  }
  sensor.ws = ws;
  ws.onopen = () => { sensor.connected = true; updateSensorUi(); };
  ws.onmessage = e => handleSensorMsg(e.data);
  ws.onclose = () => {
    sensor.connected = false;
    updateSensorUi();
    if (sensor.want) {
      setSensorStatus('sensorLost');
      sensor.retry = setTimeout(openSocket, 3000);
    }
  };
}

function handleSensorMsg(raw) {
  let m;
  try { m = JSON.parse(raw); } catch { return; }
  if (m.t === 'h') {
    sensor.fs = m.fs || 100;
    sensor.buf = new Float32Array(sensor.fs * 10);
    sensor.pos = 0;
    sensor.filled = 0;
  } else if (m.t === 'd' && Array.isArray(m.s)) {
    for (const v of m.s) {
      sensor.buf[sensor.pos] = v;
      sensor.pos = (sensor.pos + 1) % sensor.buf.length;
      sensor.filled = Math.min(sensor.filled + 1, sensor.buf.length);
    }
    sensor.warm = m.w || 0;
    $('sLevel').textContent = num(m.s.length ? Math.max(...m.s) : 0, 1);
    $('sRatio').textContent = num(m.r || 0, 1);
    $('sPga').textContent = num(m.p || 0, 1);
    $('sMmi').textContent = `${t('sensorIntensity')}: ${mmiText(sensorMmi(m.p || 0))}`;
    if (sensor.warm > 0) setSensorStatus('sensorWarmup', { s: num(sensor.warm) });
    else setSensorStatus('sensorOnline', { fs: num(sensor.fs) });
  } else if (m.t === 'e') {
    sensorAlarm(m);
  } else if (m.t === 'x') {
    sensorAlarmEnd(m);
  }
}

function siren(seconds) {
  audioCtx ||= new AudioContext();
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  for (let i = 0; i < seconds * 2; i++) {
    osc.frequency.setValueAtTime(950, t0 + i * 0.5);
    osc.frequency.linearRampToValueAtTime(500, t0 + i * 0.5 + 0.45);
  }
  gain.gain.setValueAtTime(0.1, t0);
  gain.gain.setValueAtTime(0.1, t0 + seconds - 0.05);
  gain.gain.linearRampToValueAtTime(0, t0 + seconds);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + seconds);
}
function sensorAlarm(m) {
  const test = Boolean(m.test);
  sensor.events.unshift({ time: Date.now(), test, pga: null, dur: 0 });
  sensor.events = sensor.events.slice(0, 20);
  sensor.alarm = true;
  $('sensor').hidden = false;
  $('sensor').classList.add('alarm');
  requestDraw();
  siren(test ? 1 : 4);
  toast(`<b>${t(test ? 'testTitle' : 'alarmTitle')}</b><br>${t('alarmBody')}`, null, 'alarm', test ? 4000 : 15000);
  if (!test && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(t('alarmTitle'), { body: t('alarmBody'), requireInteraction: true });
  }
  renderSensorEvents();
}
function sensorAlarmEnd(m) {
  sensor.alarm = false;
  $('sensor').classList.remove('alarm');
  const ev = sensor.events[0];
  if (ev && ev.pga == null) { ev.pga = m.p || 0; ev.dur = m.d || 0; }
  renderSensorEvents();
}
function renderSensorEvents() {
  $('sensorEvents').innerHTML = sensor.events.map(ev => {
    const when = new Date(ev.time).toLocaleTimeString(LOC());
    const what = ev.test ? t('testEvent') : ev.pga == null ? t('shakingNow')
      : t('eventItem', { pga: num(ev.pga, 1), mmi: mmiText(sensorMmi(ev.pga)), d: num(ev.dur, 1) });
    return `<li class="${ev.test ? 'test' : ''}">${when} · ${what}</li>`;
  }).join('');
}

function requestDraw() {
  if (sensor.drawing) return;
  sensor.drawing = true;
  requestAnimationFrame(drawSeismo);
}
function drawSeismo() {
  sensor.drawing = false;
  if ($('sensor').hidden) return;
  const c = $('seismo');
  const w = c.clientWidth, h = 110, dpr = window.devicePixelRatio || 1;
  if (w) {
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = h * dpr; }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const n = sensor.buf.length;
    let max = 10;
    for (let i = 0; i < sensor.filled; i++) max = Math.max(max, sensor.buf[i]);
    ctx.strokeStyle = sensor.alarm ? '#ff3b30' : '#34c759';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < sensor.filled; i++) {
      const idx = (sensor.pos - sensor.filled + i + n) % n;
      const x = ((n - sensor.filled + i) / (n - 1)) * w;
      const y = h - 4 - (sensor.buf[idx] / max) * (h - 16);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px system-ui';
    ctx.fillText(`${max.toFixed(0)} mg · 10 s`, 6, 12);
  }
  requestDraw();
}

$('sensorHost').value = sensor.host;
$('sensorBtn').addEventListener('click', () => {
  $('sensor').hidden = !$('sensor').hidden;
  if (!$('sensor').hidden) requestDraw();
});
$('sensorClose').addEventListener('click', () => { $('sensor').hidden = true; });
$('sensorConnect').addEventListener('click', () => (sensor.want ? sensorDisconnect() : sensorConnect()));
$('sensorTest').addEventListener('click', () => {
  if (sensor.ws && sensor.connected) sensor.ws.send('test');
});
$('sensorHost').addEventListener('keydown', e => {
  if (e.key === 'Enter') sensorConnect();
});
setSensorStatus('sensorIdle');
updateSensorUi();
// end of sensor.js
