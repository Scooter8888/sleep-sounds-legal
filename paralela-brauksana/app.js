/*
 * app.js — Paralēlā braukšana (A–B līniju palīgs) ar telefona GPS.
 * Nav būvēšanas soļa: tīrs pārlūka JavaScript.
 */
(function () {
  'use strict';

  var G = window.Guidance;
  var DEG = Math.PI / 180;
  var VERSION = '1.0.0';
  var LED_SIDE = 7;                 // LED skaits katrā pusē no centra
  var KEY_SETTINGS = 'pb.settings.v1';
  var KEY_FIELD = 'pb.field.v1';
  var MAX_POINTS = 60000;           // pārklājuma punktu limits (localStorage)
  var S;                            // iestatījumi (aizpilda zemāk)

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  /* ------------------------------------------------------------------ */
  /* Tulkojumi                                                            */
  /* ------------------------------------------------------------------ */
  var I18N = {
    lv: {
      hint_gps_wait: 'Gaidu GPS signālu…',
      hint_gps_denied: 'Nav atļauta piekļuve atrašanās vietai. Atļauj to pārlūka iestatījumos un pārlādē lapu.',
      hint_gps_unavailable: 'GPS nav pieejams. Pārbaudi, vai atrašanās vieta ir ieslēgta.',
      hint_set_a: 'Brauc pa pirmo joslu un nospied A',
      hint_set_a_plus: 'Brauc joslas virzienā un nospied A',
      hint_set_b: 'Brauc taisni līdz joslas beigām un nospied B',
      hint_on_line: 'Uz līnijas',
      steer_left: 'Stūrē pa kreisi',
      steer_right: 'Stūrē pa labi',
      btn_a: 'A punkts', btn_b: 'B punkts', btn_cov: 'Pārklājums', btn_snap: 'Centrēt', btn_settings: 'Iestatījumi',
      stat_line: 'Josla', stat_area: 'Platība', stat_width: 'Platums',
      gps_none: 'GPS —', gps_fmt: 'GPS ±{n} m', gps_stale: 'GPS pazudis',
      toast_need_gps: 'Vēl nav GPS pozīcijas',
      toast_need_a: 'Vispirms nospied A',
      toast_too_close: 'B ir pārāk tuvu A, vajag vismaz 5 m',
      toast_a_set: 'A iestatīts. Brauc līdz joslas beigām un nospied B.',
      toast_line_set: 'Līnija iestatīta, joslas platums {w} m',
      toast_aplus_set: 'Līnija iestatīta ar virzienu {h}°',
      toast_no_heading: 'Braukšanas virziens vēl nav zināms, izmantots iestatītais {h}°',
      toast_need_line: 'Vispirms iestati līniju',
      toast_snapped: 'Līnija centrēta uz tavu pozīciju',
      toast_nudged: 'Līnija pabīdīta par {n} cm',
      toast_cov_on: 'Pārklājuma ierakstīšana ieslēgta',
      toast_cov_off: 'Pārklājuma ierakstīšana izslēgta',
      toast_cleared: 'Dzēsts',
      confirm_clear_cov: 'Dzēst visu ierakstīto pārklājumu?',
      confirm_clear_line: 'Dzēst A–B līniju?',
      confirm_clear_all: 'Dzēst līniju un pārklājumu?',
      set_title: 'Iestatījumi',
      set_width: 'Darba platums (m)',
      set_mode: 'Vadības režīms',
      mode_ab: 'A–B līnija (divi punkti)',
      mode_aplus: 'A + virziens',
      set_aplus_current: 'Izmantot pašreizējo braukšanas virzienu',
      set_aplus_heading: 'Virziens (°)',
      set_led_step: 'LED solis (cm)',
      set_led_mode: 'LED gaismas rāda',
      led_mode_steer: 'kurp stūrēt',
      led_mode_pos: 'kurā pusē ir traktors',
      set_nudge: 'Pabīdes solis (cm)',
      set_map: 'Kartes orientācija',
      map_heading_up: 'Kurss uz augšu',
      map_north_up: 'Ziemeļi uz augšu',
      set_sound: 'Skaņas signāls, kad novirze ir liela',
      set_vibrate: 'Vibrācija, kad novirze ir liela',
      set_wake: 'Neļaut ekrānam izslēgties',
      set_lang: 'Valoda',
      set_demo: 'Demo režīms (simulēta braukšana bez GPS)',
      set_clear_cov: 'Dzēst pārklājumu',
      set_clear_line: 'Dzēst līniju',
      set_clear_all: 'Dzēst visu',
      set_close: 'Aizvērt',
      help_title: 'Kā lietot',
      help_1: 'Nostiprini telefonu traktora kabīnē ar brīvu skatu uz debesīm un atļauj piekļuvi atrašanās vietai.',
      help_2: 'Ievadi agregāta darba platumu.',
      help_3: 'Sāc braukt pa pirmo joslu un nospied A. Brauc taisni līdz joslas beigām un nospied B.',
      help_4: 'Apgriezies un brauc pa nākamo joslu. LED josla un cipars rāda, cik tālu un uz kuru pusi jāstūrē.',
      help_5: 'Ieslēdz pārklājumu, kad agregāts strādā, un izslēdz apgriešanās joslā.',
      help_6: 'Ja GPS „aizpeld”, nostājies uz joslas centra un nospied „Centrēt”, vai pabīdi līniju ar bultiņām.',
      note_gps: 'Telefona GPS precizitāte parasti ir 2–5 m un ir labāka, braucot vienmērīgi. Centimetru precizitātei pieslēdz ārēju Bluetooth GNSS (RTK) uztvērēju, kas telefonā darbojas kā atrašanās vietas avots.',
      offline_note: 'Darbojas bezsaistē, dati paliek tikai šajā ierīcē.',
      demo_speed: 'Ātrums',
      unit_ha: 'ha', unit_m: 'm', unit_cm: 'cm', unit_kmh: 'km/h'
    },
    en: {
      hint_gps_wait: 'Waiting for GPS…',
      hint_gps_denied: 'Location access was denied. Allow it in the browser settings and reload.',
      hint_gps_unavailable: 'GPS unavailable. Check that location is turned on.',
      hint_set_a: 'Drive the first pass and press A',
      hint_set_a_plus: 'Drive in the pass direction and press A',
      hint_set_b: 'Drive straight to the end of the pass and press B',
      hint_on_line: 'On line',
      steer_left: 'Steer left',
      steer_right: 'Steer right',
      btn_a: 'Point A', btn_b: 'Point B', btn_cov: 'Coverage', btn_snap: 'Snap', btn_settings: 'Settings',
      stat_line: 'Pass', stat_area: 'Area', stat_width: 'Width',
      gps_none: 'GPS —', gps_fmt: 'GPS ±{n} m', gps_stale: 'GPS lost',
      toast_need_gps: 'No GPS position yet',
      toast_need_a: 'Press A first',
      toast_too_close: 'B is too close to A, at least 5 m needed',
      toast_a_set: 'A set. Drive to the end of the pass and press B.',
      toast_line_set: 'Line set, pass width {w} m',
      toast_aplus_set: 'Line set with heading {h}°',
      toast_no_heading: 'Driving heading not known yet, used configured {h}°',
      toast_need_line: 'Set a line first',
      toast_snapped: 'Line snapped to your position',
      toast_nudged: 'Line nudged by {n} cm',
      toast_cov_on: 'Coverage recording on',
      toast_cov_off: 'Coverage recording off',
      toast_cleared: 'Cleared',
      confirm_clear_cov: 'Delete all recorded coverage?',
      confirm_clear_line: 'Delete the A–B line?',
      confirm_clear_all: 'Delete line and coverage?',
      set_title: 'Settings',
      set_width: 'Working width (m)',
      set_mode: 'Guidance mode',
      mode_ab: 'A–B line (two points)',
      mode_aplus: 'A + heading',
      set_aplus_current: 'Use current driving heading',
      set_aplus_heading: 'Heading (°)',
      set_led_step: 'LED step (cm)',
      set_led_mode: 'LEDs show',
      led_mode_steer: 'where to steer',
      led_mode_pos: 'which side the tractor is on',
      set_nudge: 'Nudge step (cm)',
      set_map: 'Map orientation',
      map_heading_up: 'Heading up',
      map_north_up: 'North up',
      set_sound: 'Beep when far off line',
      set_vibrate: 'Vibrate when far off line',
      set_wake: 'Keep screen on',
      set_lang: 'Language',
      set_demo: 'Demo mode (simulated driving, no GPS)',
      set_clear_cov: 'Clear coverage',
      set_clear_line: 'Clear line',
      set_clear_all: 'Clear all',
      set_close: 'Close',
      help_title: 'How to use',
      help_1: 'Mount the phone in the cab with a clear view of the sky and allow location access.',
      help_2: 'Enter the implement working width.',
      help_3: 'Start driving the first pass and press A. Drive straight to the end and press B.',
      help_4: 'Turn around and drive the next pass. The LED bar and the number show how far and which way to steer.',
      help_5: 'Turn coverage on while the implement is working and off on the headland.',
      help_6: 'If GPS drifts, stop on the pass centre and press "Snap", or nudge the line with the arrows.',
      note_gps: 'Phone GPS accuracy is usually 2–5 m and is better while moving steadily. For centimetre accuracy pair an external Bluetooth GNSS (RTK) receiver as the phone\'s location source.',
      offline_note: 'Works offline; data stays on this device only.',
      demo_speed: 'Speed',
      unit_ha: 'ha', unit_m: 'm', unit_cm: 'cm', unit_kmh: 'km/h'
    }
  };

  function t(key, vars) {
    var dict = I18N[S.lang] || I18N.lv;
    var s = dict[key] != null ? dict[key] : (I18N.lv[key] != null ? I18N.lv[key] : key);
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }

  function applyI18n() {
    document.documentElement.lang = S.lang;
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
  }

  function fmt(n, digits) {
    var s = Number(n).toFixed(digits);
    return S.lang === 'lv' ? s.replace('.', ',') : s;
  }

  /* ------------------------------------------------------------------ */
  /* Stāvoklis                                                            */
  /* ------------------------------------------------------------------ */
  var DEFAULTS = {
    width: 12, mode: 'ab', aplusHeading: 0, aplusUseCurrent: true,
    ledStep: 10, ledMode: 'steer', nudgeStep: 10, northUp: false,
    sound: false, vibrate: false, wakeLock: true, lang: 'lv', demo: false, scale: 6
  };
  S = Object.assign({}, DEFAULTS, loadJSON(KEY_SETTINGS, {}));

  var F = { origin: null, line: null, pendingA: null, runs: [] };  // lauks
  var proj = null;
  var fix = null;             // pēdējais GPS fikss {lat, lon, acc, speed, t}
  var pos = null;             // pozīcija lokālajā plaknē {x, y}
  var heading = null;         // izlīdzināts kurss (°)
  var headingRef = null;      // pēdējā pozīcija, no kuras rēķināts kurss
  var coverageOn = false;
  var currentRun = null;
  var guidance = null;
  var watchId = null;
  var gpsError = null;
  var fieldDirty = false;
  var wakeLock = null;
  var audioCtx = null;
  var lastAlert = 0;
  var ctx, canvas;

  function loadJSON(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* pilna atmiņa vai privātais režīms */ }
  }
  function saveSettings() { saveJSON(KEY_SETTINGS, S); }

  function saveField() {
    fieldDirty = false;
    saveJSON(KEY_FIELD, {
      v: 1,
      origin: F.origin,
      line: F.line,
      pendingA: F.pendingA,
      runs: F.runs.map(function (run) {
        return run.map(function (p) { return [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]; });
      })
    });
  }

  function loadField() {
    var f = loadJSON(KEY_FIELD, null);
    if (!f || !f.origin) return;
    F.origin = f.origin;
    F.line = f.line || null;
    F.pendingA = f.pendingA || null;
    F.runs = Array.isArray(f.runs) ? f.runs.filter(function (r) { return r.length > 0; }) : [];
    proj = G.makeProjection(F.origin.lat, F.origin.lon);
  }

  function setOrigin(lat, lon) {
    F.origin = { lat: lat, lon: lon };
    proj = G.makeProjection(lat, lon);
  }

  /* ------------------------------------------------------------------ */
  /* GPS                                                                  */
  /* ------------------------------------------------------------------ */
  function startGps() {
    if (watchId != null || !navigator.geolocation) {
      if (!navigator.geolocation) { gpsError = 'unavailable'; updateUI(); }
      return;
    }
    gpsError = null;
    watchId = navigator.geolocation.watchPosition(function (p) {
      var c = p.coords;
      gpsError = null;
      handleFix(c.latitude, c.longitude, c.accuracy, c.speed, c.heading, p.timestamp || Date.now());
    }, function (err) {
      if (err.code === 1) { gpsError = 'denied'; stopGps(); }
      else if (err.code === 2) gpsError = 'unavailable';
      updateUI();
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  }

  function stopGps() {
    if (watchId != null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  function handleFix(lat, lon, acc, speed, hdg, time) {
    if (!proj) setOrigin(lat, lon);
    var p = proj.toXY(lat, lon);
    acc = (acc == null || isNaN(acc)) ? 10 : acc;
    speed = (speed == null || isNaN(speed)) ? null : speed;
    fix = { lat: lat, lon: lon, acc: acc, speed: speed, t: time, received: Date.now() };

    // Kurss: no GPS, kad kustība ir droša; citādi no pārvietojuma.
    var h = null;
    if (hdg != null && !isNaN(hdg) && speed != null && speed > 0.7) h = hdg;
    var minMove = Math.max(1.5, acc * 0.4);
    if (headingRef) {
      var moved = Math.hypot(p.x - headingRef.x, p.y - headingRef.y);
      if (moved >= minMove) {
        if (h == null) h = G.bearing(headingRef, p);
        headingRef = p;
      }
    } else {
      headingRef = p;
    }
    if (h != null) heading = G.smoothHeading(heading, h, 0.5);

    pos = p;
    if (coverageOn) addCoverage(p);
    updateUI();
  }

  /* ------------------------------------------------------------------ */
  /* Pārklājums                                                           */
  /* ------------------------------------------------------------------ */
  function addCoverage(p) {
    if (!currentRun) { currentRun = []; F.runs.push(currentRun); }
    var last = currentRun[currentRun.length - 1];
    if (last) {
      var d = Math.hypot(p.x - last[0], p.y - last[1]);
      if (d < 0.5) return;
      if (d > 30) { currentRun = [[p.x, p.y]]; F.runs.push(currentRun); fieldDirty = true; return; }
    }
    currentRun.push([p.x, p.y]);
    fieldDirty = true;
    var total = 0;
    for (var i = 0; i < F.runs.length; i++) total += F.runs[i].length;
    while (total > MAX_POINTS && F.runs.length > 1) total -= F.runs.shift().length;
  }

  function setCoverage(on) {
    coverageOn = on;
    currentRun = null;
    $('#btn-cov').classList.toggle('active', on);
    if (!on) saveField();
    updateUI();
  }

  /* ------------------------------------------------------------------ */
  /* Līnija                                                               */
  /* ------------------------------------------------------------------ */
  function setPointA() {
    if (!pos) return toast(t('toast_need_gps'), true);
    if (!F.line && F.runs.length === 0) {
      setOrigin(fix.lat, fix.lon);
      pos = proj.toXY(fix.lat, fix.lon);
      headingRef = pos;
    }
    if (S.mode === 'aplus') {
      var h = S.aplusHeading;
      if (S.aplusUseCurrent && heading != null) h = heading;
      else if (S.aplusUseCurrent) toast(t('toast_no_heading', { h: fmt(S.aplusHeading, 0) }), true);
      F.line = G.lineFromHeading(pos, h, 100);
      F.pendingA = null;
      toast(t('toast_aplus_set', { h: fmt(h, 0) }));
    } else {
      F.pendingA = { x: pos.x, y: pos.y };
      toast(t('toast_a_set'));
    }
    saveField();
    updateUI();
  }

  function setPointB() {
    if (!pos) return toast(t('toast_need_gps'), true);
    if (!F.pendingA) return toast(t('toast_need_a'), true);
    var d = Math.hypot(pos.x - F.pendingA.x, pos.y - F.pendingA.y);
    if (d < 5) return toast(t('toast_too_close'), true);
    F.line = G.lineFromAB(F.pendingA, pos);
    F.pendingA = null;
    saveField();
    toast(t('toast_line_set', { w: fmt(S.width, 1) }));
    updateUI();
  }

  /** Pabīda līniju braukšanas virzienā: dir = -1 pa kreisi, +1 pa labi. */
  function nudge(dir) {
    if (!F.line) return toast(t('toast_need_line'), true);
    var forward = guidance ? guidance.forward : true;
    var meters = (S.nudgeStep / 100) * (dir < 0 ? 1 : -1) * (forward ? 1 : -1);
    F.line = G.nudgeLine(F.line, meters);
    saveField();
    toast(t('toast_nudged', { n: S.nudgeStep }));
    updateUI();
  }

  function snapToPosition() {
    if (!F.line) return toast(t('toast_need_line'), true);
    if (!pos || !guidance) return toast(t('toast_need_gps'), true);
    F.line = G.nudgeLine(F.line, guidance.xteAB);
    saveField();
    toast(t('toast_snapped'));
    updateUI();
  }

  function clearCoverage() {
    F.runs = []; currentRun = null; fieldDirty = false; saveField(); updateUI();
  }
  function clearLine() {
    F.line = null; F.pendingA = null; guidance = null; saveField(); updateUI();
  }
  function clearAll() {
    F.runs = []; currentRun = null; F.line = null; F.pendingA = null; guidance = null;
    if (fix) { setOrigin(fix.lat, fix.lon); pos = proj.toXY(fix.lat, fix.lon); headingRef = pos; }
    saveField(); updateUI();
  }

  /* ------------------------------------------------------------------ */
  /* UI                                                                   */
  /* ------------------------------------------------------------------ */
  function buildLightbar() {
    var bar = $('#lightbar');
    bar.innerHTML = '';
    for (var i = -LED_SIDE; i <= LED_SIDE; i++) {
      var d = document.createElement('div');
      d.className = 'led' + (i === 0 ? ' center' : '');
      d.dataset.i = i;
      bar.appendChild(d);
    }
  }

  function ledClass(n) { return n <= 2 ? 'near' : n <= 4 ? 'mid' : 'far'; }

  function renderGuide() {
    var leds = $$('#lightbar .led');
    leds.forEach(function (l) { l.className = 'led' + (l.dataset.i === '0' ? ' center' : ''); });
    var val = $('#xte-value'), left = $('#arrow-left'), right = $('#arrow-right'), hint = $('#hint');
    left.classList.remove('show'); right.classList.remove('show');
    hint.classList.remove('warn');

    if (!pos) {
      val.textContent = '—'; val.className = '';
      var key = gpsError === 'denied' ? 'hint_gps_denied' : gpsError === 'unavailable' ? 'hint_gps_unavailable' : 'hint_gps_wait';
      hint.textContent = t(key);
      hint.classList.add('warn');
      return;
    }

    if (!guidance) {
      val.textContent = '—'; val.className = '';
      if (F.pendingA) hint.textContent = t('hint_set_b');
      else hint.textContent = t(S.mode === 'aplus' ? 'hint_set_a_plus' : 'hint_set_a');
      return;
    }

    var xte = guidance.xte;
    var step = S.ledStep / 100;
    var n = Math.min(LED_SIDE, Math.round(Math.abs(xte) / step));
    var abs = Math.abs(xte);
    val.textContent = abs < 0.995 ? Math.round(abs * 100) + ' ' + t('unit_cm') : (abs < 100 ? fmt(abs, 1) : Math.round(abs)) + ' ' + t('unit_m');
    val.className = n === 0 ? 'ok' : ledClass(n);

    if (n === 0) {
      leds[LED_SIDE].classList.add('on');
      hint.textContent = t('hint_on_line');
    } else {
      var steerRight = xte > 0;
      var lightRight = S.ledMode === 'steer' ? steerRight : !steerRight;
      for (var i = 1; i <= n; i++) leds[LED_SIDE + (lightRight ? i : -i)].classList.add('on', ledClass(i));
      (steerRight ? right : left).classList.add('show');
      hint.textContent = t(steerRight ? 'steer_right' : 'steer_left');
    }
    if (F.pendingA) hint.textContent = t('hint_set_b');
  }

  function renderBadges() {
    var gps = $('#badge-gps');
    if (!fix) {
      gps.textContent = t('gps_none'); gps.className = 'badge warn';
    } else if (Date.now() - fix.received > 6000) {
      gps.textContent = t('gps_stale'); gps.className = 'badge bad';
    } else {
      gps.textContent = t('gps_fmt', { n: fmt(fix.acc, fix.acc < 10 ? 1 : 0) });
      gps.className = 'badge ' + (fix.acc <= 4 ? 'good' : fix.acc <= 10 ? 'warn' : 'bad');
    }
    var kmh = fix && fix.speed != null ? fix.speed * 3.6 : 0;
    $('#badge-speed').textContent = fmt(kmh, 1) + ' ' + t('unit_kmh');
    $('#badge-heading').textContent = heading == null ? '—°' : Math.round(heading) + '°';
  }

  function renderStats() {
    $('#stat-line').textContent = guidance ? (guidance.lineIndex > 0 ? '+' : '') + guidance.lineIndex : '—';
    $('#stat-area').textContent = fmt(G.runsArea(F.runs, S.width) / 10000, 2) + ' ' + t('unit_ha');
    $('#stat-width').textContent = fmt(S.width, S.width % 1 ? 1 : 0) + ' ' + t('unit_m');
    $('#nudge-left-label').textContent = S.nudgeStep + ' ' + t('unit_cm');
    $('#nudge-right-label').textContent = S.nudgeStep + ' ' + t('unit_cm');
    $('#btn-b').disabled = !(S.mode === 'ab' && F.pendingA);
  }

  function updateUI() {
    guidance = (F.line && pos) ? G.computeGuidance(F.line, pos, heading, S.width) : null;
    renderGuide();
    renderBadges();
    renderStats();
    draw();
    alerts();
  }

  var toastTimer = null;
  function toast(msg, isError) {
    var el = $('#toast');
    el.textContent = msg;
    el.className = isError ? 'error' : '';
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2800);
  }

  /* ------------------------------------------------------------------ */
  /* Karte                                                                */
  /* ------------------------------------------------------------------ */
  function draw() {
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth, H = canvas.clientHeight;
    if (W === 0 || H === 0) return;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b1210';
    ctx.fillRect(0, 0, W, H);

    var s = S.scale;
    var cx = W / 2, cy = H * 0.62;
    var p = pos || (F.line ? { x: F.line.ax, y: F.line.ay } : { x: 0, y: 0 });
    var rot = (S.northUp || heading == null) ? 0 : heading;
    var cosR = Math.cos(-rot * DEG), sinR = Math.sin(-rot * DEG);
    function toScreen(x, y) {
      var dx = (x - p.x) * s, dy = -(y - p.y) * s;
      return { x: cx + dx * cosR - dy * sinR, y: cy + dx * sinR + dy * cosR };
    }
    var R = Math.hypot(W, H) / (2 * s) + 5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-rot * DEG);
    ctx.scale(s, -s);
    ctx.translate(-p.x, -p.y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Pārklājums
    ctx.strokeStyle = 'rgba(52, 199, 89, 0.38)';
    ctx.fillStyle = 'rgba(52, 199, 89, 0.38)';
    ctx.lineWidth = S.width;
    for (var r = 0; r < F.runs.length; r++) {
      var run = F.runs[r];
      if (run.length === 1) {
        ctx.beginPath(); ctx.arc(run[0][0], run[0][1], S.width / 2, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(run[0][0], run[0][1]);
      for (var i = 1; i < run.length; i++) ctx.lineTo(run[i][0], run[i][1]);
      ctx.stroke();
    }

    // Vadlīnijas
    if (F.line) {
      var f = G.lineFrame(F.line);
      var rel = { x: p.x - F.line.ax, y: p.y - F.line.ay };
      var off = rel.x * f.normal.x + rel.y * f.normal.y;
      var along = rel.x * f.dir.x + rel.y * f.dir.y;
      var range = G.visibleLineRange(off, R, S.width, 400);
      for (var k = range.min; k <= range.max; k++) {
        var ox = F.line.ax + f.normal.x * k * S.width, oy = F.line.ay + f.normal.y * k * S.width;
        var isCur = guidance && k === guidance.lineIndex;
        ctx.lineWidth = (isCur ? 3 : k === 0 ? 2 : 1) / s;
        ctx.strokeStyle = isCur ? '#ffd60a' : k === 0 ? '#ff9f0a' : 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.moveTo(ox + f.dir.x * (along - R), oy + f.dir.y * (along - R));
        ctx.lineTo(ox + f.dir.x * (along + R), oy + f.dir.y * (along + R));
        ctx.stroke();
      }
    }
    ctx.restore();

    // Marķieri ekrāna koordinātās
    function marker(x, y, label, dashed) {
      var q = toScreen(x, y);
      ctx.beginPath();
      ctx.arc(q.x, q.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = dashed ? 'rgba(255,159,10,0.35)' : '#ff9f0a';
      ctx.fill();
      if (dashed) { ctx.setLineDash([4, 3]); ctx.strokeStyle = '#ff9f0a'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = '#0b1210';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, q.x, q.y + 1);
    }
    if (F.line && S.mode === 'ab') { marker(F.line.ax, F.line.ay, 'A'); marker(F.line.bx, F.line.by, 'B'); }
    else if (F.line) marker(F.line.ax, F.line.ay, 'A');
    if (F.pendingA) marker(F.pendingA.x, F.pendingA.y, 'A', true);

    // Precizitātes aplis un traktors
    if (pos && fix) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(4, fix.acc * s), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(90, 200, 250, 0.10)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(90, 200, 250, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(cx, cy);
    if (heading != null) ctx.rotate((heading - rot) * DEG);
    if (heading == null) {
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fillStyle = '#5ac8fa'; ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -18); ctx.lineTo(13, 14); ctx.lineTo(0, 7); ctx.lineTo(-13, 14); ctx.closePath();
      ctx.fillStyle = '#5ac8fa'; ctx.fill();
      ctx.strokeStyle = '#0b1210'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();

    // Mērogs
    var demoOffset = $('#demo-bar').hidden ? 0 : 60;
    var len = G.niceScaleLength(s, Math.min(160, W * 0.35));
    var px = len * s;
    ctx.strokeStyle = '#eef3ef'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, H - 14 - demoOffset); ctx.lineTo(12 + px, H - 14 - demoOffset);
    ctx.moveTo(12, H - 20 - demoOffset); ctx.lineTo(12, H - 8 - demoOffset);
    ctx.moveTo(12 + px, H - 20 - demoOffset); ctx.lineTo(12 + px, H - 8 - demoOffset);
    ctx.stroke();
    ctx.fillStyle = '#eef3ef'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(fmt(len, len < 1 ? 1 : 0) + ' m', 16, H - 20 - demoOffset);

    // Ziemeļu bultiņa
    ctx.save();
    ctx.translate(W - 26, H - 30 - demoOffset);
    ctx.rotate(-rot * DEG);
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(6, 8); ctx.lineTo(0, 3); ctx.lineTo(-6, 8); ctx.closePath();
    ctx.fillStyle = '#ff453a'; ctx.fill();
    ctx.fillStyle = '#eef3ef'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('N', 0, 10);
    ctx.restore();
  }

  function setScale(v) {
    S.scale = Math.min(60, Math.max(0.4, v));
    saveSettings();
    draw();
  }

  function bindZoom() {
    $('#zoom-in').addEventListener('click', function () { setScale(S.scale * 1.4); });
    $('#zoom-out').addEventListener('click', function () { setScale(S.scale / 1.4); });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      setScale(S.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    }, { passive: false });
    var pinch = null;
    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) pinch = { d: dist(e.touches), s: S.scale };
    }, { passive: true });
    canvas.addEventListener('touchmove', function (e) {
      if (pinch && e.touches.length === 2) { e.preventDefault(); setScale(pinch.s * dist(e.touches) / pinch.d); }
    }, { passive: false });
    canvas.addEventListener('touchend', function () { pinch = null; });
    function dist(tt) { return Math.hypot(tt[0].clientX - tt[1].clientX, tt[0].clientY - tt[1].clientY); }
  }

  /* ------------------------------------------------------------------ */
  /* Brīdinājumi (skaņa, vibrācija)                                       */
  /* ------------------------------------------------------------------ */
  function beep(freq) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'square'; o.frequency.value = freq;
      g.gain.value = 0.06;
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + 0.12);
    } catch (e) { /* audio nav pieejams */ }
  }

  function alerts() {
    if (!guidance || (!S.sound && !S.vibrate)) return;
    var step = S.ledStep / 100;
    if (Math.abs(guidance.xte) < step * 2.5) return;
    var now = Date.now();
    if (now - lastAlert < 900) return;
    lastAlert = now;
    if (S.sound) beep(guidance.xte > 0 ? 880 : 440);
    if (S.vibrate && navigator.vibrate) navigator.vibrate(guidance.xte > 0 ? [90] : [60, 60, 60]);
  }

  function requestWakeLock() {
    if (!S.wakeLock || !('wakeLock' in navigator) || wakeLock || document.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (lock) {
      wakeLock = lock;
      lock.addEventListener('release', function () { wakeLock = null; });
    }).catch(function () { /* nav atļauts, piem., zems akumulators */ });
  }
  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
  }

  /* ------------------------------------------------------------------ */
  /* Demo režīms: simulēts traktors bez GPS                               */
  /* ------------------------------------------------------------------ */
  var demo = { on: false, lat: 56.9500, lon: 24.1050, hdg: 15, speed: 3, steer: 0, timer: null, last: 0 };

  function demoStart() {
    if (demo.on) return;
    demo.on = true;
    stopGps();
    gpsError = null;
    $('#demo-bar').hidden = false;
    $('#demo-speed').value = demo.speed;
    $('#demo-speed-val').textContent = fmt(demo.speed, 1);
    demo.last = performance.now();
    demo.timer = setInterval(demoTick, 200);
  }
  function demoStop() {
    if (!demo.on) return;
    demo.on = false;
    clearInterval(demo.timer);
    $('#demo-bar').hidden = true;
    startGps();
    draw();
  }
  function demoTick() {
    var now = performance.now();
    var dt = Math.min(0.5, (now - demo.last) / 1000);
    demo.last = now;
    if (demo.speed > 0.05) demo.hdg = (demo.hdg + demo.steer * 28 * dt + 360) % 360;
    var d = demo.speed * dt;
    var latM = 111320, lonM = 111320 * Math.cos(demo.lat * DEG);
    demo.lat += d * Math.cos(demo.hdg * DEG) / latM;
    demo.lon += d * Math.sin(demo.hdg * DEG) / lonM;
    var noise = 0.12;
    handleFix(
      demo.lat + (Math.random() - 0.5) * noise / latM,
      demo.lon + (Math.random() - 0.5) * noise / lonM,
      1.5, demo.speed, demo.hdg, Date.now()
    );
  }
  function bindDemo() {
    function hold(el, val) {
      var set = function (v) { return function (e) { e.preventDefault(); demo.steer = v; }; };
      el.addEventListener('pointerdown', set(val));
      el.addEventListener('pointerup', set(0));
      el.addEventListener('pointercancel', set(0));
      el.addEventListener('pointerleave', set(0));
    }
    hold($('#demo-left'), -1);
    hold($('#demo-right'), 1);
    $('#demo-speed').addEventListener('input', function (e) {
      demo.speed = parseFloat(e.target.value) || 0;
      $('#demo-speed-val').textContent = fmt(demo.speed, 1);
    });
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || $('#settings').open) return;
      if (demo.on) {
        if (e.key === 'ArrowLeft') { demo.steer = -1; e.preventDefault(); }
        else if (e.key === 'ArrowRight') { demo.steer = 1; e.preventDefault(); }
        else if (e.key === 'ArrowUp') { demo.speed = Math.min(8, demo.speed + 0.5); $('#demo-speed').value = demo.speed; $('#demo-speed-val').textContent = fmt(demo.speed, 1); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { demo.speed = Math.max(0, demo.speed - 0.5); $('#demo-speed').value = demo.speed; $('#demo-speed-val').textContent = fmt(demo.speed, 1); e.preventDefault(); }
      }
      if (e.key === 'a' || e.key === 'A') setPointA();
      else if (e.key === 'b' || e.key === 'B') setPointB();
      else if (e.key === 'c' || e.key === 'C') setCoverage(!coverageOn);
      else if (e.key === '+') setScale(S.scale * 1.4);
      else if (e.key === '-') setScale(S.scale / 1.4);
    });
    document.addEventListener('keyup', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') demo.steer = 0;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Iestatījumi                                                          */
  /* ------------------------------------------------------------------ */
  function fillSettings() {
    $('#set-width').value = S.width;
    $('#set-mode').value = S.mode;
    $('#set-aplus-current').checked = S.aplusUseCurrent;
    $('#set-aplus-heading').value = S.aplusHeading;
    $('#set-led-step').value = String(S.ledStep);
    $('#set-led-mode').value = S.ledMode;
    $('#set-nudge').value = String(S.nudgeStep);
    $('#set-map').value = S.northUp ? 'north' : 'heading';
    $('#set-sound').checked = S.sound;
    $('#set-vibrate').checked = S.vibrate;
    $('#set-wake').checked = S.wakeLock;
    $('#set-lang').value = S.lang;
    $('#set-demo').checked = S.demo;
    $('#aplus-options').hidden = S.mode !== 'aplus';
  }

  function readSettings() {
    var w = parseFloat($('#set-width').value);
    if (w >= 0.5 && w <= 60) S.width = Math.round(w * 100) / 100;
    S.mode = $('#set-mode').value === 'aplus' ? 'aplus' : 'ab';
    S.aplusUseCurrent = $('#set-aplus-current').checked;
    var h = parseFloat($('#set-aplus-heading').value);
    if (!isNaN(h)) S.aplusHeading = ((h % 360) + 360) % 360;
    S.ledStep = parseInt($('#set-led-step').value, 10) || 10;
    S.ledMode = $('#set-led-mode').value === 'position' ? 'position' : 'steer';
    S.nudgeStep = parseInt($('#set-nudge').value, 10) || 10;
    S.northUp = $('#set-map').value === 'north';
    S.sound = $('#set-sound').checked;
    S.vibrate = $('#set-vibrate').checked;
    S.wakeLock = $('#set-wake').checked;
    var lang = $('#set-lang').value;
    S.lang = I18N[lang] ? lang : 'lv';
    S.demo = $('#set-demo').checked;
    $('#aplus-options').hidden = S.mode !== 'aplus';
    saveSettings();
    applyI18n();
    if (S.demo) demoStart(); else demoStop();
    if (S.wakeLock) requestWakeLock(); else releaseWakeLock();
    updateUI();
  }

  function bindSettings() {
    var dlg = $('#settings');
    $('#btn-settings').addEventListener('click', function () {
      fillSettings();
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    });
    $('#settings-form').addEventListener('change', readSettings);
    $('#settings-form').addEventListener('submit', function () { readSettings(); if (!dlg.showModal) dlg.removeAttribute('open'); });
    dlg.addEventListener('close', readSettings);
    $('#clear-cov').addEventListener('click', function () { if (confirm(t('confirm_clear_cov'))) { clearCoverage(); toast(t('toast_cleared')); } });
    $('#clear-line').addEventListener('click', function () { if (confirm(t('confirm_clear_line'))) { clearLine(); toast(t('toast_cleared')); } });
    $('#clear-all').addEventListener('click', function () { if (confirm(t('confirm_clear_all'))) { clearAll(); toast(t('toast_cleared')); dlg.close(); } });
    $('#version').textContent = VERSION;
  }

  /* ------------------------------------------------------------------ */
  /* Starts                                                               */
  /* ------------------------------------------------------------------ */
  function init() {
    canvas = $('#map');
    ctx = canvas.getContext('2d');
    buildLightbar();
    applyI18n();
    loadField();
    bindZoom();
    bindDemo();
    bindSettings();

    $('#btn-a').addEventListener('click', setPointA);
    $('#btn-b').addEventListener('click', setPointB);
    $('#btn-cov').addEventListener('click', function () { setCoverage(!coverageOn); toast(t(coverageOn ? 'toast_cov_on' : 'toast_cov_off')); });
    $('#btn-nudge-left').addEventListener('click', function () { nudge(-1); });
    $('#btn-nudge-right').addEventListener('click', function () { nudge(1); });
    $('#btn-snap').addEventListener('click', snapToPosition);

    // Audio konteksts un ekrāna bloķētājs prasa lietotāja darbību.
    document.addEventListener('pointerdown', function () {
      if (S.sound && !audioCtx) beep(1);
      requestWakeLock();
    }, { once: false });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') requestWakeLock();
      else if (fieldDirty) saveField();
    });
    window.addEventListener('pagehide', function () { if (fieldDirty) saveField(); });

    if (window.ResizeObserver) new ResizeObserver(draw).observe($('#map-wrap'));
    window.addEventListener('resize', draw);

    setInterval(function () {
      if (fieldDirty) saveField();
      renderBadges();
    }, 3000);

    if (S.demo) demoStart(); else startGps();
    requestWakeLock();
    updateUI();

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    }
  }

  // Testiem un atkļūdošanai
  window.PB = {
    version: VERSION,
    handleFix: handleFix,
    state: function () { return { settings: S, field: F, pos: pos, heading: heading, guidance: guidance, coverageOn: coverageOn, fix: fix }; },
    setPointA: setPointA, setPointB: setPointB, setCoverage: setCoverage,
    demoStart: demoStart, demoStop: demoStop, demo: demo
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
