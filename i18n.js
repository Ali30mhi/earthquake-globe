/* Live Earthquake Globe — translations (English / Persian) */
const I18N = {
  en: {
    docTitle: 'Live Earthquake Globe', title: '🌍 Live Earthquake Globe', loading: 'Loading live USGS data…',
    timeRange: 'Time range', pHour: 'Past hour', pDay: 'Past 24 hours', pWeek: 'Past 7 days', pMonth: 'Past 30 days',
    magnitude: 'Magnitude', mAll: 'All', mSig: 'Significant',
    colorBy: 'Color by', cMag: 'Magnitude', cDepth: 'Depth',
    mapStyle: 'Map style', sRealistic: 'Realistic 3D', sSatellite: 'Satellite HD', sDark: 'Dark map HD', sNight: 'Night lights',
    layer: 'Seismic layer', layerRecent: 'Hotspots · last 30 days (M2.5+)', layerHistory: 'Major quakes since 1900 (M7+)', layerOff: 'Off',
    stCount: 'earthquakes', stMax: 'strongest', stHour: 'last hour', stNear: 'near you',
    chartTitle: 'Activity over time – click to jump there', now: 'now',
    replay: '▶ Replay', pause: '❚❚ Pause', live: '● LIVE',
    tLabels: 'Labels for M5+', tBorders: 'Country borders', tClouds: 'Clouds (Realistic 3D)', tRotate: 'Auto-rotate',
    tFollow: 'Fly to new earthquakes', tSound: 'Sound alert', tDesktop: 'Desktop alerts (M4.5+)',
    nearMe: '📍 Near me', locating: '📍 Locating…', located: '📍 Location set', sensorBtn: '📡 My sensor',
    perfHint: 'Large dataset: point clicks are disabled for performance. Raise the magnitude filter to interact.',
    dataFrom: 'Data:', refreshed: 'refreshed every minute', keys: 'Space replay · L live · R rotate · Esc close',
    privacy: 'Your location is only used inside your browser.',
    feedTitle: 'Earthquakes', sortNew: 'Newest', sortMag: 'Strongest', sortDist: 'Nearest',
    searchPh: 'Filter by place… (e.g. Iran, Japan)',
    km: 'km', kmUnit: '{n} km', kmDeep: '{n} km deep', kmAway: '{n} km from you', belowM25: 'below M2.5',
    lgLastHour: '◎ last hour', lgRecent: '⬢ 30-day activity', lgHistory: '⬢ M7+ since 1900',
    secAgo: '{n}s ago', minAgo: '{n} min ago', hAgo: '{n} h ago', dAgo: '{n} d ago',
    stLoading: 'Loading USGS data…', stError: 'Connection problem ({msg}) · retrying…',
    stLive: 'Live · USGS data from {time} · next update in {s}s', stOffline: 'Offline · showing saved data from {time}',
    stReplay: 'Replay mode · press L to go live', replayAt: 'Replay: {time}',
    noMatches: 'No matches.', noQuakes: 'No earthquakes in this range.',
    dLocal: 'Local time', dUtc: 'UTC', dDepth: 'Depth', dCoords: 'Coordinates', dFromYou: 'From you',
    dShake: 'Shaking where you are', rough: 'rough estimate', dMmi: 'Max intensity', dPager: 'PAGER alert',
    dTsunami: 'Tsunami flag', dFelt: 'Felt reports', dSig: 'Significance', dStatus: 'Review status', yes: 'Yes', no: 'No',
    usgsPage: 'Full event page on USGS ↗', feltIt: 'Felt it? Report to USGS ↗',
    mmi1: 'Not felt', mmi2: 'Weak', mmi4: 'Light', mmi5: 'Moderate', mmi6: 'Strong', mmi7: 'Very strong',
    mmi8: 'Severe', mmi9: 'Violent', mmi10: 'Extreme',
    newQuake: 'New M{m}', moreNew: '+{n} more new events', notifTitle: 'M{m} earthquake',
    nearCount: '{n} earthquakes within {km} km of you in this period',
    nearNone: 'No earthquakes within {km} km of you in this period',
    feltCount: '{n} of them were probably felt where you are.',
    geoNA: 'Geolocation is not available in this browser.', geoErr: 'Location unavailable: {msg}',
    notifNA: 'Desktop notifications are not supported in this browser.', notifDenied: 'Notification permission was not granted.',
    hexRecent: '<b>{n}</b> earthquakes (M2.5+) here in the last 30 days',
    hexHistory: '<b>{n}</b> major earthquakes (M7+) here since 1900<br>Strongest: M{m} · {year} · {place}',
    historyLoading: 'Loading 120+ years of USGS records…', historyLoaded: '{n} major earthquakes since 1900 loaded',
    historyError: 'Could not load the historical records. Try again later.',
    sensorTitle: '📡 My seismic sensor', connect: 'Connect', disconnect: 'Disconnect',
    sensorIdle: 'Not connected', sensorConnecting: 'Connecting to {host}…', sensorOnline: 'Connected · {fs} samples/s',
    sensorWarmup: 'Learning background noise… {s}s', sensorLost: 'Connection lost · retrying…',
    sensorHttps: 'The sensor can only be reached when this page runs locally over http (use the quake command), not https.',
    sLevel: 'motion (mg)', sPga: 'peak (mg)', sensorIntensity: 'Intensity now', testAlarm: '🔔 Test alarm',
    sensorNote: 'Your ESP32 sensor must be on the same Wi-Fi. Build guide: sensor/README.md',
    alarmTitle: '⚠️ SHAKING DETECTED', testTitle: '🔔 Sensor test alarm',
    alarmBody: 'Your sensor detected strong shaking. Drop, cover and hold on.',
    testEvent: 'test alarm', shakingNow: 'shaking…', eventItem: 'peak {pga} mg · {mmi} · {d}s',
  },
  fa: {
    docTitle: 'کره‌ی زنده‌ی زلزله', title: '🌍 کره‌ی زنده‌ی زلزله', loading: 'در حال دریافت داده‌های زنده از USGS…',
    timeRange: 'بازه‌ی زمانی', pHour: 'یک ساعت گذشته', pDay: '۲۴ ساعت گذشته', pWeek: '۷ روز گذشته', pMonth: '۳۰ روز گذشته',
    magnitude: 'بزرگی', mAll: 'همه', mSig: 'فقط مهم‌ها',
    colorBy: 'رنگ بر اساس', cMag: 'بزرگی', cDepth: 'عمق',
    mapStyle: 'سبک نقشه', sRealistic: 'واقع‌گرایانه سه‌بعدی', sSatellite: 'ماهواره‌ای HD', sDark: 'نقشه‌ی تیره HD', sNight: 'نور شهرها در شب',
    layer: 'لایه‌ی لرزه‌خیزی', layerRecent: 'کانون‌ها · ۳۰ روز اخیر (۲٫۵+)', layerHistory: 'زلزله‌های بزرگ از ۱۹۰۰ (۷+)', layerOff: 'خاموش',
    stCount: 'زلزله', stMax: 'قوی‌ترین', stHour: 'ساعت اخیر', stNear: 'نزدیک شما',
    chartTitle: 'فعالیت در طول زمان – برای رفتن به آن لحظه کلیک کنید', now: 'اکنون',
    replay: '▶ بازپخش', pause: '❚❚ توقف', live: '● زنده',
    tLabels: 'برچسب زلزله‌های ۵+', tBorders: 'مرز کشورها', tClouds: 'ابرها (حالت واقع‌گرایانه)', tRotate: 'چرخش خودکار',
    tFollow: 'رفتن خودکار به زلزله‌های جدید', tSound: 'هشدار صوتی', tDesktop: 'اعلان دسکتاپ (۴٫۵+)',
    nearMe: '📍 نزدیک من', locating: '📍 در حال یافتن…', located: '📍 موقعیت ثبت شد', sensorBtn: '📡 حسگر من',
    perfHint: 'داده‌ها زیاد است: برای حفظ سرعت، کلیک روی نقاط غیرفعال شده. فیلتر بزرگی را بالاتر ببرید.',
    dataFrom: 'داده‌ها:', refreshed: 'به‌روزرسانی هر دقیقه', keys: 'Space بازپخش · L زنده · R چرخش · Esc بستن',
    privacy: 'موقعیت شما فقط داخل مرورگر خودتان استفاده می‌شود.',
    feedTitle: 'زلزله‌ها', sortNew: 'جدیدترین', sortMag: 'قوی‌ترین', sortDist: 'نزدیک‌ترین',
    searchPh: 'جستجوی مکان… (انگلیسی، مثلاً Iran)',
    km: 'کیلومتر', kmUnit: '{n} کیلومتر', kmDeep: 'عمق {n} کیلومتر', kmAway: '{n} کیلومتر از شما', belowM25: 'کمتر از ۲٫۵',
    lgLastHour: '◎ ساعت اخیر', lgRecent: '⬢ فعالیت ۳۰ روزه', lgHistory: '⬢ زلزله‌های ۷+ از ۱۹۰۰',
    secAgo: '{n} ثانیه پیش', minAgo: '{n} دقیقه پیش', hAgo: '{n} ساعت پیش', dAgo: '{n} روز پیش',
    stLoading: 'در حال دریافت داده از USGS…', stError: 'مشکل اتصال ({msg}) · تلاش دوباره…',
    stLive: 'زنده · داده‌ی USGS ساعت {time} · به‌روزرسانی بعدی تا {s} ثانیه', stOffline: 'آفلاین · نمایش داده‌ی ذخیره‌شده از ساعت {time}',
    stReplay: 'حالت بازپخش · برای بازگشت به حالت زنده L را بزنید', replayAt: 'بازپخش: {time}',
    noMatches: 'نتیجه‌ای پیدا نشد.', noQuakes: 'در این بازه زلزله‌ای ثبت نشده.',
    dLocal: 'زمان محلی', dUtc: 'UTC', dDepth: 'عمق', dCoords: 'مختصات', dFromYou: 'فاصله از شما',
    dShake: 'لرزش در محل شما', rough: 'تخمین تقریبی', dMmi: 'بیشینه‌ی شدت', dPager: 'هشدار PAGER',
    dTsunami: 'نشانگر سونامی', dFelt: 'گزارش‌های حس‌شده', dSig: 'درجه‌ی اهمیت', dStatus: 'وضعیت بررسی', yes: 'بله', no: 'خیر',
    usgsPage: 'صفحه‌ی کامل رویداد در USGS ↗', feltIt: 'حسش کردید؟ به USGS گزارش دهید ↗',
    mmi1: 'حس نشده', mmi2: 'ضعیف', mmi4: 'خفیف', mmi5: 'متوسط', mmi6: 'شدید', mmi7: 'خیلی شدید',
    mmi8: 'ویرانگر', mmi9: 'بسیار ویرانگر', mmi10: 'فاجعه‌بار',
    newQuake: 'زلزله‌ی جدید {m}', moreNew: '+{n} رویداد جدید دیگر', notifTitle: 'زلزله‌ی {m} ریشتری',
    nearCount: '{n} زلزله در شعاع {km} کیلومتری شما در این بازه',
    nearNone: 'در این بازه زلزله‌ای در شعاع {km} کیلومتری شما ثبت نشده',
    feltCount: 'احتمالاً {n} مورد از آن‌ها در محل شما حس شده.',
    geoNA: 'مرورگر شما از تعیین موقعیت پشتیبانی نمی‌کند.', geoErr: 'موقعیت در دسترس نیست: {msg}',
    notifNA: 'مرورگر شما از اعلان دسکتاپ پشتیبانی نمی‌کند.', notifDenied: 'اجازه‌ی اعلان داده نشد.',
    hexRecent: '<b>{n}</b> زلزله‌ی ۲٫۵+ در ۳۰ روز اخیر',
    hexHistory: '<b>{n}</b> زلزله‌ی بزرگ (۷+) در این منطقه از ۱۹۰۰<br>قوی‌ترین: {m} · سال {year} · {place}',
    historyLoading: 'در حال دریافت بیش از ۱۲۰ سال سابقه از USGS…', historyLoaded: '{n} زلزله‌ی بزرگ از ۱۹۰۰ بارگذاری شد',
    historyError: 'دریافت سوابق تاریخی ممکن نشد. بعداً دوباره امتحان کنید.',
    sensorTitle: '📡 حسگر لرزه‌ی من', connect: 'اتصال', disconnect: 'قطع اتصال',
    sensorIdle: 'متصل نیست', sensorConnecting: 'در حال اتصال به {host}…', sensorOnline: 'متصل · {fs} نمونه در ثانیه',
    sensorWarmup: 'در حال یادگیری نویز زمینه… {s} ثانیه', sensorLost: 'اتصال قطع شد · تلاش دوباره…',
    sensorHttps: 'حسگر فقط وقتی در دسترس است که این صفحه به‌صورت محلی و با http باز شده باشد (با دستور quake)، نه https.',
    sLevel: 'حرکت (میلی‌g)', sPga: 'بیشینه (میلی‌g)', sensorIntensity: 'شدت فعلی', testAlarm: '🔔 آزمایش آژیر',
    sensorNote: 'حسگر ESP32 باید به همین وای‌فای وصل باشد. راهنمای ساخت: sensor/README.md',
    alarmTitle: '⚠️ لرزش تشخیص داده شد', testTitle: '🔔 آزمایش آژیر حسگر',
    alarmBody: 'حسگر شما لرزش شدید را تشخیص داد. زیر میز پناه بگیرید، سر را بپوشانید و محکم نگه دارید.',
    testEvent: 'آزمایش آژیر', shakingNow: 'در حال لرزش…', eventItem: 'بیشینه {pga} میلی‌g · {mmi} · {d} ثانیه',
  },
};

let LANG = localStorage.getItem('eqglobe-lang') ||
  ((navigator.language || '').toLowerCase().startsWith('fa') ? 'fa' : 'en');
const LOC = () => (LANG === 'fa' ? 'fa-IR' : 'en-US');

function t(key, vars = {}) {
  const s = I18N[LANG]?.[key] ?? I18N.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
function num(n, digits = 0, group = true) {
  return Number(n).toLocaleString(LOC(), {
    minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: group,
  });
}
function applyStaticI18n() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = LANG === 'fa' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.title = t('docTitle');
}
// end of i18n.js
