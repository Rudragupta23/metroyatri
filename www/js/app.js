/* MetroYatri – screens and app logic */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG, CITIES = window.CITIES, NET = window.NET, Auth = window.Auth;
  var T = window.T, I18N = window.I18N, Native = window.Native, Sync = window.Sync, VERSION = '2.1';
  var $view = document.getElementById('view'), $sheet = document.getElementById('sheet'), $toast = document.getElementById('toast');
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('my.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('my.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem('my.' + k); } catch (e) {} }
  };

  /* ---------- current city ---------- */
  var C, D, S, E, IDS, GROUPS, GCOL, BYNAME, engines = {};
  function engineOf(id) { return engines[id] || (engines[id] = new window.Engine(NET[id], CITIES[id])); }
  function sortIds() { IDS = Object.keys(S).sort(function (a, b) { return sn(a).localeCompare(sn(b), I18N.locale()); }); }
  function loadCity(id) {
    if (!CITIES[id] || !NET[id]) id = 'delhi';
    C = CITIES[id]; D = NET[id]; S = D.stations; E = engineOf(id);
    sortIds();
    GROUPS = C.groups; GCOL = {}; BYNAME = {};
    D.lines.forEach(function (l) { GCOL[l.g] = l.color; });
    IDS.forEach(function (i) { BYNAME[S[i].n] = i; });
    store.set('city', id);
  }
  var state = { from: null, to: null, place: { from: null, to: null }, mode: 'fast', day: 'auto', premium: false, route: null, open: {}, mapRoute: null, mapFocus: null, next: null };
  function switchCity(id) {
    loadCity(id);
    state.from = state.to = state.route = state.mapRoute = state.mapFocus = null; state.place = { from: null, to: null }; state.open = {}; state.premium = false;
    stFilter.q = ''; stFilter.g = '';
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var toastT;
  function toast(msg) { $toast.textContent = msg; $toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { $toast.classList.remove('on'); }, 2800); }
  /* names in the chosen language */
  function sn(id) { return window.stationName(C.id, id, S[id]); }
  function snc(city, id) { return window.stationName(city, id, NET[city].stations[id]); }
  function gname(g) { return T(E.groupName(g)); }
  function gshort(g) { return I18N.lang === 'hi' ? gname(g).replace(' लाइन', '') : gname(g).replace(' Line', ''); }
  var MON_HI = { Jan: 'जनवरी', Feb: 'फ़रवरी', Mar: 'मार्च', Apr: 'अप्रैल', May: 'मई', Jun: 'जून', Jul: 'जुलाई', Aug: 'अगस्त', Sep: 'सितंबर', Oct: 'अक्टूबर', Nov: 'नवंबर', Dec: 'दिसंबर' };
  function trDate(d) { return I18N.lang === 'hi' ? String(d).replace(/[A-Z][a-z]{2}/, function (m) { return MON_HI[m] || m; }) : d; }
  function cnt(n, one, many) { return T(n === 1 ? one : many, n); }
  function towardsText(leg, city) {
    var nm = city ? function (i) { return snc(city, i); } : sn, tw = leg.tw;
    if (tw.ring) return T('ring line, next stop {0}', nm(tw.next));
    return T('towards {0}', tw.ids.map(nm).join(T(' or ')));
  }
  function groupsOf(id) { var g = []; S[id].lines.forEach(function (l) { var x = E.lines[l].g; if (g.indexOf(x) < 0) g.push(x); }); return g; }
  function roundels(id, big) { return '<span class="rd' + (big ? ' big' : '') + '">' + groupsOf(id).map(function (g) { return '<i style="--c:' + GCOL[g] + '"></i>'; }).join('') + '</span>'; }
  function lineNames(id) { return groupsOf(id).map(gname).join(', '); }
  function go(h) { location.hash = h; }
  function page() { return (location.hash || '#/plan').slice(2).split('/')[0] || 'plan'; }
  function isHoliday() { return C.holidayFares && (state.day === 'holiday' || (state.day === 'auto' && new Date().getDay() === 0)); }
  function fmtDate(t) { return new Date(t).toLocaleString(I18N.locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function fmtTime(t) { return new Date(t).toLocaleTimeString(I18N.locale(), { hour: 'numeric', minute: '2-digit' }); }
  function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
  function cardFare(f) { return Math.round(f * (100 - C.card.pct) / 100); }
  function fmtDist(km) { return km < 1 ? T('{0} m', Math.max(10, Math.round(km * 100) * 10)) : T('{0} km', km.toFixed(1)); }
  function avatar(u, cls) { return u.photo ? '<img class="avatar ' + (cls || '') + '" src="' + u.photo + '" alt="">' : '<span class="avatar ' + (cls || '') + '">' + esc((u.name || '?')[0].toUpperCase()) + '</span>'; }
  function backBtn() { return '<button class="back" data-act="back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>' + T('Back') + '</button>'; }
  var SEARCH_ICON = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>';
  var X_ICON = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function head(title, sub, right) { return '<div class="head"><div><h1 class="title">' + title + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>'; }
  function item(attrs, title, small, lead, tail) {
    var tag = attrs.indexOf('href=') >= 0 ? 'a' : attrs ? 'button' : 'div';
    return '<' + tag + ' class="item" ' + attrs + '>' + (lead || '') + '<span class="grow"><b>' + title + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</span>' + (tail === undefined ? '<span class="chev">›</span>' : tail) + '</' + tag + '>';
  }
  function info(title, text) { return '<div class="card"><b>' + esc(T(title)) + '</b><p class="hint" style="margin-top:2px">' + esc(T(text)) + '</p></div>'; }
  function sw(on) { return '<span class="switch' + (on ? ' on' : '') + '"><i></i></span>'; }

  /* saved routes and bookings (saved routes carry their city) */
  function favs() { return store.get('favs', []).map(function (x) { return x.length === 2 ? ['delhi', x[0], x[1]] : x; }).filter(function (x) { return NET[x[0]] && NET[x[0]].stations[x[1]] && NET[x[0]].stations[x[2]]; }); }
  function isFav(r) { return favs().some(function (x) { return x[0] === C.id && x[1] === r.from && x[2] === r.to; }); }
  function tickets() { var u = Auth.current(); return u ? store.get('tickets.' + u.key, []) : []; }
  function saveTickets(t) { var u = Auth.current(); if (u) store.set('tickets.' + u.key, t); }
  function tkName(x, w) { var c = x.city || 'delhi', id = x[w]; return NET[c] && NET[c].stations[id] ? snc(c, id) : x[w + 'N']; }
  function tkCity(x) { var c = CITIES[x.city || 'delhi']; return c ? T(c.name) : (x.cityN || ''); }

  /* ---------- profile photo viewer ---------- */
  function openPhoto() {
    var u = Auth.current(); if (!u) return;
    closePhoto(true);
    var v = document.createElement('div'); v.id = 'photoview'; v.setAttribute('data-act', 'photo-close');
    v.innerHTML = (u.photo ? '<img src="' + u.photo + '" alt="">' : '<span class="big">' + esc((u.name || '?')[0].toUpperCase()) + '</span>') + '<p>' + esc(u.name) + '<small>' + T('Tap anywhere to close') + '</small></p>';
    document.getElementById('app').appendChild(v);
  }
  function closePhoto(now) {
    var v = document.getElementById('photoview'); if (!v) return;
    if (now) { v.remove(); return; }
    v.classList.add('out'); setTimeout(function () { if (v.parentNode) v.remove(); }, 180);
  }

  /* ---------- sheet ---------- */
  function openSheet(html, tall) {
    clearTimeout(sheetT); $sheet.classList.remove('out');
    $sheet.innerHTML = '<div class="scrim" data-act="close-sheet"></div><div class="panel' + (tall ? ' tall' : '') + '">' + html + '</div>';
    $sheet.hidden = false;
  }
  var sheetT = null;
  function closeSheet() { clearTimeout(sheetT); $sheet.classList.remove('out'); $sheet.hidden = true; $sheet.innerHTML = ''; }
  function slideSheetAway() { if ($sheet.hidden) return; $sheet.classList.add('out'); clearTimeout(sheetT); sheetT = setTimeout(closeSheet, 170); }
  function sheetHead(title, btn) { return '<header><h3>' + esc(title) + '<button data-act="close-sheet">' + T(btn || 'Cancel') + '</button></h3>'; }

  /* ---------- station picker, with address search ---------- */
  var pickerCb = null, pickPlace = null, geoResults = [], geoLast = 0;
  function stationRow(id, extra) {
    return '<button class="item" data-pick="' + id + '">' + roundels(id) + '<span class="grow"><b>' + esc(sn(id)) + '</b><small>' + esc(extra || lineNames(id)) + '</small></span></button>';
  }
  function matchStations(q) {
    q = q.trim().toLowerCase();
    if (!q) return IDS;
    var starts = [], has = [], hi = (window.NAMES_HI || {})[C.id] || {};
    IDS.forEach(function (id) {
      var st = S[id], names = [st.n].concat(st.a || []), best = 0;
      if (hi[id]) names.push(hi[id]);
      names.forEach(function (n) { n = n.toLowerCase(); if (n.indexOf(q) === 0 || n.split(/[\s\-,(]+/).some(function (w) { return w.indexOf(q) === 0; })) best = Math.max(best, 2); else if (n.indexOf(q) >= 0) best = Math.max(best, 1); });
      if (best === 2) starts.push(id); else if (best === 1) has.push(id);
    });
    return starts.concat(has);
  }
  function aliasHit(id, q) {
    q = q.trim().toLowerCase(); if (!q || S[id].n.toLowerCase().indexOf(q) >= 0 || sn(id).toLowerCase().indexOf(q) >= 0) return null;
    var a = (S[id].a || []).filter(function (x) { return x.toLowerCase().indexOf(q) >= 0; })[0];
    return a ? T('Also known as {0}', a) : null;
  }
  function geoRow(q) {
    return '<div class="list" style="margin-bottom:10px">' + item('data-act="geo"', esc(T('Search “{0}” as an address or place', q.trim())), T('Finds the stations nearest to it and the walking time'), '<span class="lead">' + SEARCH_ICON + '</span>') + '</div>';
  }
  function pickerList(q) {
    var ids = matchStations(q), html = '', typed = q.trim().length >= 3;
    if (!q.trim()) {
      html += '<div class="list" style="margin-bottom:10px">' + item('data-act="nearest"', T('Use my nearest station'), T('Needs location permission')) + '</div>' +
        '<p class="hint" style="padding:0 4px 10px">' + T('You can also type an address, office, mall or landmark to find the stations near it.') + '</p>';
      var rec = store.get('recent.' + C.id, []).filter(function (id) { return S[id]; });
      if (rec.length) html += '<h2 class="sec" style="margin-top:6px">' + T('Recent') + '</h2><div class="list">' + rec.map(function (id) { return stationRow(id); }).join('') + '</div><h2 class="sec">' + T('All stations') + '</h2>';
    }
    if (!ids.length) return (typed ? geoRow(q) : '') + '<div class="empty"><b>' + esc(T('No station matches “{0}”', q)) + '</b>' + T(typed ? 'Search it as an address above, or check the spelling.' : 'Check the spelling, or try an older name for the station.') + '</div>';
    return html + '<div class="list">' + ids.slice(0, 80).map(function (id) { return stationRow(id, aliasHit(id, q)); }).join('') + '</div>' +
      (typed ? '<div style="margin-top:10px">' + geoRow(q) + '</div>' : '') +
      (ids.length > 80 ? '<p class="hint" style="padding:10px 4px">' + T('Type a few letters to see more stations.') + '</p>' : '');
  }
  function openPicker(title, cb) {
    pickerCb = cb; pickPlace = null;
    openSheet(sheetHead(title) + '<label class="search">' + SEARCH_ICON +
      '<input id="pq" type="search" placeholder="' + esc(T('Station, address or landmark')) + '" autocomplete="off" autocapitalize="off" spellcheck="false"></label></header><div class="body" id="plist">' + pickerList('') + '</div>', true);
    var q = document.getElementById('pq');
    q.addEventListener('input', function () { document.getElementById('plist').innerHTML = pickerList(q.value); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter' && q.value.trim().length >= 3 && !matchStations(q.value).length) { e.preventDefault(); ACT.geo(); } });
    setTimeout(function () { q.focus(); }, 60);
  }
  function remember(id) { var r = store.get('recent.' + C.id, []).filter(function (x) { return x !== id; }); r.unshift(id); store.set('recent.' + C.id, r.slice(0, 6)); }
  function nearestTo(lat, lon, n) {
    return IDS.map(function (id) { return { id: id, km: window.Engine.haversine(lat, lon, S[id].lat, S[id].lon) }; }).sort(function (a, b) { return a.km - b.km; }).slice(0, n || 5);
  }
  function locate(cb) {
    if (!navigator.geolocation) { toast(T('Location is not available on this phone.')); return; }
    toast(T('Finding your location…'));
    navigator.geolocation.getCurrentPosition(function (p) { cb(nearestTo(p.coords.latitude, p.coords.longitude), p.coords); },
      function () { toast(T('Could not get your location. Turn on location and allow access.')); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }
  function nearest(cb) { locate(function (list, pos) { if (list[0].km > 60) { toast(T('You seem to be far from the {0} network. Check the city selected.', T(C.system))); return; } cb(list, pos); }); }
  /* walking: straight-line distance made 30% longer for real streets, at 4.8 km/h */
  function walk(km) { var real = km * 1.3; return { km: real, min: Math.max(1, Math.round(real / 4.8 * 60)), far: real > 2.5 }; }
  function walkLabel(km) { var w = walk(km); return w.far ? T('{0} away, too far to walk', fmtDist(w.km)) : T('about {0} min walk ({1})', w.min, fmtDist(w.km)); }
  /* list of stations near a point; picking one keeps the place for door-to-door times */
  function nearSheet(title, placeName, list, me) {
    var cb = pickerCb, by = {};
    list.forEach(function (x) { by[x.id] = x.km; });
    openSheet(sheetHead(title) + (placeName ? '<p class="hint">' + esc(placeName) + '</p>' : '') + '</header><div class="body"><div class="list">' +
      list.map(function (x) { return stationRow(x.id, walkLabel(x.km) + ', ' + lineNames(x.id)); }).join('') + '</div>' +
      '<p class="hint" style="padding:12px 4px 0">' + T('Walking times are estimates from the distance on the map.') + '</p></div>');
    pickerCb = cb; pickPlace = { name: placeName, me: !!me, by: by };
  }
  function cityBox() {
    var la = [], lo = [];
    IDS.forEach(function (i) { la.push(S[i].lat); lo.push(S[i].lon); });
    return { w: Math.min.apply(0, lo) - 0.12, e: Math.max.apply(0, lo) + 0.12, s: Math.min.apply(0, la) - 0.12, n: Math.max.apply(0, la) + 0.12 };
  }
  function geocode(q) {
    var b = cityBox(), wait = Math.max(0, 1100 - (Date.now() - geoLast));
    return new Promise(function (res) { setTimeout(res, wait); }).then(function () {
      geoLast = Date.now();
      return fetch(CFG.geocoder + '?format=jsonv2&limit=6&countrycodes=in&bounded=1&viewbox=' + [b.w, b.n, b.e, b.s].join(',') +
        '&accept-language=' + (I18N.lang === 'hi' ? 'hi,en' : 'en') + '&q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } });
    }).then(function (r) { if (!r.ok) throw 0; return r.json(); });
  }

  /* ---------- Plan ---------- */
  function compute() {
    state.route = (state.from && state.to && state.from !== state.to) ? E.plan(state.from, state.to, state.mode, { premium: state.premium }) : null;
  }
  function fareNow(r) { return isHoliday() ? r.fare.holiday : r.fare.weekday; }
  function placeName(p) { return p.me ? T('your location') : p.name; }
  function doorMin(r) {
    var m = r.min, p = state.place;
    if (p.from && !p.from.far) m += p.from.min;
    if (p.to && !p.to.far) m += p.to.min;
    return m;
  }
  function walkLeg(p, id, toStation) {
    if (!p) return '';
    var txt = p.far ? T(toStation ? '{0} is {1} from {2} station. Take an auto, cab or bus.' : '{2} station is {1} from {0}. Take an auto, cab or bus.', placeName(p), fmtDist(p.km), sn(id))
      : T(toStation ? 'Walk about {0} min ({1}) from {2} to {3} station' : 'Walk about {0} min ({1}) from {3} station to {2}', p.min, fmtDist(p.km), placeName(p), sn(id));
    return '<div class="walkleg"><svg viewBox="0 0 24 24"><circle cx="13" cy="4.5" r="2"/><path d="M13 8l-3 3v4M13 8l3 3 3 1M10 15l-2 6M12 14l3 3 1 4"/></svg><span>' + esc(txt) + '</span></div>';
  }
  function legHtml(leg, i) {
    var mid = leg.stations.slice(1, -1), key = 'l' + i, open = state.open[key], stops = leg.stations.length - 1;
    return '<div class="leg" style="--c:' + leg.color + ';--ct:' + leg.text + '">' +
      '<div class="stop"><span class="d"></span><span class="t">' + esc(sn(leg.from)) + '</span></div>' +
      '<div class="ride"><span class="ln">' + esc(T(leg.name)) + '</span>' + esc(towardsText(leg)) + '<br>' + T('{0}, about {1} min', cnt(stops, '{0} stop', '{0} stops'), Math.max(1, Math.round(leg.min))) +
      (mid.length ? '<button data-act="toggle-leg" data-key="' + key + '">' + (open ? T('Hide stops') : cnt(mid.length, 'Show {0} stop in between', 'Show {0} stops in between')) + '</button>' +
        (open ? '<ol>' + mid.map(function (id) { return '<li>' + esc(sn(id)) + '</li>'; }).join('') + '</ol>' : '') : '') +
      '</div><div class="stop"><span class="d"></span><span class="t">' + esc(sn(leg.to)) + '</span></div></div>';
  }
  function resultHtml(r) {
    var f = fareNow(r), hol = isHoliday(), notes = [], parts = r.fare.parts && r.fare.parts.length > 1 ? r.fare.parts : null, pl = state.place;
    if (r.fare.estimate) notes.push(T('This route uses the {0}, which has its own higher fares. The fare shown is an estimate.', T(C.premium.name)));
    if (parts) notes.push(T(C.id === 'mumbai' ? 'Separate tickets: {0}. The Mumbai One app sells them as one ticket.' : 'The fare adds these parts: {0}.', parts.map(function (x) { return T('₹{0} for {1}', x.fare, T(x.name)); }).join(', ')));
    r.legs.forEach(function (l) { if (l.note && notes.indexOf(T(l.note)) < 0 && (C.id === 'chennai' || l.lines.indexOf('pinkb') >= 0)) notes.push(T(l.note)); });
    if (pl.from || pl.to) notes.push(T('Door to door: about {0} min, with the walking shown below.', doorMin(r)));
    var pop = state.fresh ? ' pop' : ''; state.fresh = false;
    return '<div class="card' + pop + '" style="margin-top:12px"><div class="fare"><div class="amt"><sup>₹</sup>' + f + '</div>' +
      '<div class="day">' + (C.holidayFares ? T(hol ? 'Sunday and national holiday fare' : 'Weekday fare') + '<br>' : '') + (C.card ? '₹' + cardFare(f) + ' ' + esc(T(C.card.label)) : (parts && C.id === 'mumbai' ? cnt(parts.length, '{0} ticket needed', '{0} tickets needed') : T('Single journey fare'))) + '</div></div>' +
      '<div class="facts"><div><b>' + T('{0} km', r.km.toFixed(1)) + '</b>' + T('distance') + '</div><div><b>' + T('{0} min', r.min) + '</b>' + T('travel time') + '</div><div><b>' + r.stops + '</b>' + T('stations') + '</div><div><b>' + r.changes + '</b>' + T(r.changes === 1 ? 'change' : 'changes') + '</div></div>' +
      notes.map(function (n) { return '<p class="note">' + esc(n) + '</p>'; }).join('') + '</div>' +
      (C.holidayFares ? '<div class="chips"><button class="chip' + (!hol ? ' on' : '') + '" data-act="day" data-day="weekday">' + T('Weekday fare') + '</button><button class="chip' + (hol ? ' on' : '') + '" data-act="day" data-day="holiday">' + T('Sunday or holiday fare') + '</button></div>' : '') +
      '<div class="card strip' + (pop ? ' pop d1' : '') + '" style="margin-top:12px">' + walkLeg(pl.from, r.from, true) + r.legs.map(function (l, i) {
        var prev = i ? r.legs[i - 1] : null;
        return (prev ? '<div class="change">' + esc(prev.to !== l.from ? T('Walk from {0} to {1} station', sn(prev.to), sn(l.from)) : T('Change trains at {0}', sn(l.from))) + '</div>' : '') + legHtml(l, i);
      }).join('') + walkLeg(pl.to, r.to, false) + '</div>' +
      '<div class="btns one"><button class="btn" data-act="j-start"><svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>' + T('Start journey with arrival alert') + '</button></div>' +
      '<div class="btns"><button class="btn alt" data-act="show-map">' + T('Show on map') + '</button><button class="btn signal" data-act="book">' + T('Book ticket') + '</button></div>' +
      '<div class="btns three"><button class="btn alt" data-act="fav">' + T(isFav(r) ? 'Unsave' : 'Save route') + '</button><button class="btn alt" data-act="share">' + T('Share') + '</button><a class="btn alt" href="#/cost">' + T('Monthly cost') + '</a></div>' +
      '<p class="hint" style="margin-top:12px">' + T('Fare is charged for the shortest route between the two stations, whichever route you ride. Distance and time are calculated from network data and can differ slightly from the figures at the station.') + '</p>';
  }
  function endRow(which) {
    var id = state[which], p = state.place[which];
    return '<button class="row" data-act="pick" data-which="' + which + '"><span class="pin' + (which === 'to' ? ' to' : '') + '"></span><span><small>' + T(which === 'from' ? 'From' : 'To') + (p ? ', ' + esc(T('near {0}', placeName(p))) : '') + '</small><b class="' + (id ? '' : 'ph') + '">' +
      (id ? esc(sn(id)) : T(which === 'from' ? 'Choose starting station' : 'Choose destination')) + '</b></span></button>';
  }
  function renderPlan() {
    compute();
    var r = state.route, u = Auth.current(), j = journey();
    var cityBtn = '<button class="citybtn" data-act="city"><svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.500C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>' + esc(T(C.name)) + '</button>';
    var html = head(greeting(u), esc(T('Where are you going on the {0}?', T(C.system))), cityBtn);
    if (j) html += '<a class="jbar" href="#/journey"><span class="pulse"></span><span class="grow"><b>' + T('Journey in progress') + '</b><small>' + esc(T('{0} to {1}', snc(j.city, j.from), snc(j.city, j.to))) + '</small></span><span class="chev">›</span></a>';
    html += '<div class="planner">' + endRow('from') + '<div class="perf"></div>' + endRow('to') +
      '<button class="swap" data-act="swap" aria-label="' + T('Swap stations') + '"><svg viewBox="0 0 24 24"><path d="M7 4v15m0 0-3.5-3.5M7 19l3.5-3.5M17 20V5m0 0-3.5 3.5M17 5l3.500 3.5"/></svg></button></div>';
    var clear = (state.from || state.to) ? '<button class="chip clear" data-act="clear-plan">' + X_ICON + T('Clear') + '</button>' : '';
    if (r) {
      html += '<div class="chips">' + clear + [['fast', 'Fastest'], ['easy', 'Fewest changes'], ['short', 'Shortest distance']].map(function (m) {
        return '<button class="chip' + (state.mode === m[0] ? ' on' : '') + '" data-act="mode" data-mode="' + m[0] + '">' + T(m[1]) + '</button>';
      }).join('') + (C.premium && !r.premiumForced ? '<button class="chip' + (state.premium ? ' on' : '') + '" data-act="premium"><i style="background:' + GCOL[C.premium.line] + '"></i>' + esc(T('Use {0}', T(C.premium.name))) + '</button>' : '') + '</div>' + resultHtml(r);
    } else {
      if (clear) html += '<div class="chips">' + clear + '</div>';
      if (state.from && state.to && state.from === state.to) html += '<p class="note">' + T('Choose two different stations.') + '</p>';
      else if (state.from && state.to) html += '<p class="note">' + esc(T('No metro route joins {0} and {1} yet. One of them is on a section that is not connected to the rest of the network.', sn(state.from), sn(state.to))) + '</p>';
      html += homeHtml();
    }
    $view.className = ''; $view.innerHTML = html;
  }
  /* small drawing of the whole network, used on the Plan screen */
  var artCache = {};
  function networkArt() {
    if (artCache[C.id]) return artCache[C.id];
    var xs = [], ys = [], km = 0;
    IDS.forEach(function (i) { xs.push(S[i].x); ys.push(S[i].y); });
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys), w = x1 - x0, h = y1 - y0, pad = Math.max(w, h) * 0.04;
    var sw = Math.max(w, h) / 110;
    var paths = D.segs.map(function (sg) { km += sg.km; return '<path d="M' + sg.p.map(function (q) { return q[0] + ' ' + q[1]; }).join('L') + '" stroke="' + E.lines[sg.l].color + '"/>'; }).join('');
    var dots = IDS.filter(function (i) { return groupsOf(i).length > 1; }).map(function (i) { return '<circle cx="' + S[i].x + '" cy="' + S[i].y + '" r="' + sw * 1.15 + '"/>'; }).join('');
    artCache[C.id] = { km: Math.round(km), svg: '<svg viewBox="' + (x0 - pad) + ' ' + (y0 - pad) + ' ' + (w + pad * 2) + ' ' + (h + pad * 2) + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g fill="none" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round">' + paths + '</g><g class="ix" stroke-width="' + sw * 0.6 + '">' + dots + '</g></svg>' };
    return artCache[C.id];
  }
  var TILE_ICONS = {
    near: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    map: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>',
    fare: '<path d="M7 5h10M7 9h10M9 5c5 0 5 8 0 8H7l7 7"/>',
    ticket: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2.5"/>'
  };
  function tile(attrs, icon, title, small) {
    var tag = attrs.indexOf('href=') >= 0 ? 'a' : 'button';
    return '<' + tag + ' class="qtile" ' + attrs + '><svg viewBox="0 0 24 24">' + TILE_ICONS[icon] + '</svg><b>' + T(title) + '</b><small>' + small + '</small></' + tag + '>';
  }
  function fareRange() {
    var lo = Infinity, hi = 0;
    (C.fareGroups ? C.fareGroups.map(function (g) { return g.slabs; }) : [C.slabs]).forEach(function (t) { lo = Math.min(lo, t[0][1]); hi = Math.max(hi, t[t.length - 1][1]); });
    if (D.fares) hi = Math.max(hi, C.slabs[C.slabs.length - 1][1]);
    return T('₹{0} to ₹{1}', lo, hi);
  }
  function routeItem(act, city, a, b) {
    return item('data-act="' + act + '" data-city="' + city + '" data-from="' + a + '" data-to="' + b + '"', esc(T('{0} to {1}', snc(city, a), snc(city, b))));
  }
  function homeHtml() {
    var art = networkArt(), html = '';
    html += '<a class="netcard" href="#/map">' + art.svg + '<div class="stats"><div><b>' + D.meta.stations + '</b>' + T('stations') + '</div><div><b>' + GROUPS.length + '</b>' + T('lines') + '</div><div><b>' + T('{0} km', art.km) + '</b>' + T('of track') + '</div></div><span class="open">' + T('Open map') + ' ›</span></a>';
    html += '<div class="qgrid">' + tile('data-act="near-from"', 'near', 'Nearest station', T('Start from where you are')) + tile('href="#/map"', 'map', 'Metro map', T('Lines over the city map')) +
      tile('href="#/fares"', 'fare', 'Fare chart', fareRange()) + tile('href="#/tickets"', 'ticket', 'Tickets', T('Bookings and real tickets')) + '</div>';
    var fv = favs().filter(function (x) { return x[0] === C.id; });
    if (fv.length) html += '<h2 class="sec">' + T('Saved routes') + '</h2><div class="list">' + fv.slice(0, 4).map(function (x) { return routeItem('use-route', C.id, x[1], x[2]); }).join('') + '</div>';
    var jr = store.get('journeys.' + C.id, []).filter(function (x) { return S[x[0]] && S[x[1]]; });
    if (jr.length) html += '<h2 class="sec">' + T('Recent journeys') + '</h2><div class="list">' + jr.slice(0, 3).map(function (x) { return routeItem('use-route', C.id, x[0], x[1]); }).join('') + '</div>';
    html += '<h2 class="sec">' + T('Lines') + '</h2><div class="hscroll">' + GROUPS.map(function (g) {
      var ls = D.lines.filter(function (l) { return l.g === g; }), main = ls[0], n = {};
      ls.forEach(function (l) { l.st.forEach(function (i) { n[i] = 1; }); });
      return '<button class="linecard" data-act="open-line" data-g="' + g + '" style="--c:' + main.color + ';--ct:' + main.text + '"><b>' + esc(gname(g)) + '</b><small>' + T('{0} stations', Object.keys(n).length) + '</small><span>' +
        esc(main.loop ? T('{0} ring', sn(main.st[0])) : T('{0} to {1}', sn(main.st[0]), sn(main.st[main.st.length - 1]))) + '</span></button>';
    }).join('') + '</div>';
    html += '<h2 class="sec">' + T('Popular places') + '</h2><div class="hscroll">' + C.places.slice(0, 10).map(function (p) {
      var id = BYNAME[p[1]];
      return '<button class="placecard" data-act="set-to" data-id="' + id + '">' + roundels(id) + '<b>' + esc(T(p[0])) + '</b><small>' + esc(sn(id)) + '</small></button>';
    }).join('') + '<a class="placecard more" href="#/places"><b>' + T('See all places') + '</b><small>' + T('{0} places', C.places.length) + '</small></a></div>';
    var tip = C.tips[Math.floor(Date.now() / 864e5) % C.tips.length];
    html += '<div class="tip"><b>' + T('Tip of the day') + '</b><p>' + esc(T(tip)) + '</p></div>';
    return html;
  }
  function greeting(u) {
    var h = new Date().getHours(), g = T(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
    return u ? g + ', ' + esc(u.name.split(' ')[0]) : g;
  }
  var cost = { trips: 2, days: 22 };
  function stepper(label, act, extra, val, lessLabel, moreLabel) {
    return '<div class="kv" style="align-items:center"><span>' + T(label) + '</span><div class="stepper"><button data-act="' + act + '" ' + extra + ' data-d="-1" aria-label="' + T(lessLabel) + '">−</button><b>' + val + '</b><button data-act="' + act + '" ' + extra + ' data-d="1" aria-label="' + T(moreLabel) + '">+</button></div></div>';
  }
  function money(n) { return '₹' + n.toLocaleString('en-IN'); }
  function renderCost() {
    var r = state.route; if (!r) return go('#/plan');
    var f = r.fare.weekday, n = cost.trips * cost.days, full = f * n, card = C.card ? cardFare(f) * n : full;
    $view.className = '';
    $view.innerHTML = backBtn() + head(T('Monthly cost'), esc(T('{0} to {1}', sn(r.from), sn(r.to)))) +
      '<div class="card">' + stepper('Journeys per day', 'cost', 'data-k="trips"', cost.trips, 'Fewer', 'More') + stepper('Travel days per month', 'cost', 'data-k="days"', cost.days, 'Fewer', 'More') + '</div>' +
      '<div class="card"><div class="kv"><span>' + T('Fare per journey') + '</span><b>₹' + f + '</b></div><div class="kv' + (C.card ? '' : ' total') + '"><span>' + T(C.card ? '{0} journeys at full fare' : '{0} journeys each month', n) + '</span><b>' + money(full) + '</b></div>' +
      (C.card ? '<div class="kv"><span>' + esc(T('{0}% off {1}', C.card.pct, T(C.card.label))) + '</span><b>' + money(card) + '</b></div>' +
      '<div class="kv total"><span>' + T('You save each month') + '</span><b>' + money(full - card) + '</b></div>' : '') + '</div>' +
      '<p class="hint" style="margin-top:12px">' + (C.card ? T('Uses the weekday fare and the standard {0}% discount.', C.card.pct) : T('Uses the single journey fare. Monthly passes sold by the operators can cost less.')) + '</p>';
  }

  /* ---------- sharing a route ---------- */
  function shareText(r) {
    var t = T(C.system) + ': ' + T('{0} to {1}', sn(r.from), sn(r.to)) + '\n' + T('Fare ₹{0}, {1} km, about {2} min', fareNow(r), r.km.toFixed(1), r.min) + '\n';
    r.legs.forEach(function (l, i) { t += (i + 1) + '. ' + T(l.name) + ', ' + towardsText(l) + ': ' + T('{0} to {1}', sn(l.from), sn(l.to)) + ' (' + cnt(l.stations.length - 1, '{0} stop', '{0} stops') + ')\n'; });
    return t + T('Planned with MetroYatri');
  }
  function routeImage(r) {
    var W = 1080, P = 64, FONT = 'Roboto, "Noto Sans Devanagari", sans-serif';
    function draw(ctx, measure) {
      var y = 0;
      function font(size, weight) { ctx.font = (weight || 400) + ' ' + size + 'px ' + FONT; }
      function lines(text, maxW) {
        var words = String(text).split(' '), out = [], cur = '';
        words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; });
        if (cur) out.push(cur); return out;
      }
      function text(str, x, size, weight, color, maxW, lh) {
        font(size, weight); ctx.fillStyle = color; ctx.textBaseline = 'top';
        lines(str, maxW || W - P - x).forEach(function (ln) { if (!measure) ctx.fillText(ln, x, y); y += Math.round(size * (lh || 1.3)); });
      }
      function rr(x, yy, w, h, rad, color) { if (measure) return; ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, yy, w, h, rad) : ctx.rect(x, yy, w, h); ctx.fill(); }
      if (!measure) { ctx.fillStyle = '#EEF1F5'; ctx.fillRect(0, 0, W, ctx.canvas.height); ctx.fillStyle = '#1E4FA3'; ctx.fillRect(0, 0, W, 190); }
      y = 46; text('MetroYatri', P, 58, 700, '#fff'); y += 2; text(T(C.system), P, 32, 400, 'rgba(255,255,255,.9)');
      y = 236; text(T('From'), P, 30, 500, '#596170'); text(sn(r.from), P, 56, 700, '#171A21', 0, 1.2);
      y += 14; text(T('To'), P, 30, 500, '#596170'); text(sn(r.to), P, 56, 700, '#171A21', 0, 1.2);
      y += 30;
      var facts = [['₹' + fareNow(r), T('fare')], [T('{0} min', r.min), T('travel time')], [T('{0} km', r.km.toFixed(1)), T('distance')], [String(r.changes), T(r.changes === 1 ? 'change' : 'changes')]], bw = (W - P * 2 - 3 * 18) / 4, y0 = y;
      facts.forEach(function (f, i) {
        var x = P + i * (bw + 18); rr(x, y0, bw, 150, 22, '#fff'); y = y0 + 26; var fz = 46; font(fz, 700); while (fz > 26 && ctx.measureText(f[0]).width > bw - 40) { fz -= 2; font(fz, 700); } text(f[0], x + 22, fz, 700, '#171A21', 9999); y = y0 + 92; text(f[1], x + 22, 28, 400, '#596170', 9999);
      });
      y = y0 + 150 + 34;
      r.legs.forEach(function (l, i) {
        if (i) { y += 6; text(r.legs[i - 1].to !== l.from ? T('Walk from {0} to {1} station', sn(r.legs[i - 1].to), sn(l.from)) : T('Change trains at {0}', sn(l.from)), P + 40, 30, 500, '#596170'); y += 18; }
        var top = y, x = P + 40, real = measure;
        if (!real) { measure = true; legBody(l, x); var bottom = y; measure = false; y = top; rr(P, top, W - P * 2, bottom - top, 26, '#fff'); rr(P, top + 24, 12, bottom - top - 48, 6, l.color); }
        legBody(l, x); y += 16;
      });
      function legBody(l, x) {
        y += 30; font(34, 700); var nm = T(l.name), pw = ctx.measureText(nm).width + 44;
        rr(x, y - 8, pw, 60, 30, l.color); if (!measure) { ctx.fillStyle = l.text; ctx.textBaseline = 'top'; ctx.fillText(nm, x + 22, y + 2); } y += 68;
        text(towardsText(l), x, 30, 400, '#596170'); y += 6;
        text(T('{0} to {1}', sn(l.from), sn(l.to)), x, 38, 700, '#171A21', 0, 1.25);
        text(T('{0}, about {1} min', cnt(l.stations.length - 1, '{0} stop', '{0} stops'), Math.max(1, Math.round(l.min))), x, 30, 400, '#596170');
        y += 26;
      }
      y += 20; text(T('Planned with MetroYatri. Fare and time are estimates, check at the station.'), P, 28, 400, '#596170'); y += 44;
      return y;
    }
    var c = document.createElement('canvas'); c.width = W; c.height = 10;
    var h = draw(c.getContext('2d'), true);
    c.height = h; draw(c.getContext('2d'), false);
    return c.toDataURL('image/png');
  }
  function shareSheet() {
    openSheet(sheetHead(T('Share this route')) + '</header><div class="body"><div class="list">' +
      item('data-act="share-img"', T('Share as a picture'), T('Best for WhatsApp. Shows the route, fare and time.')) +
      item('data-act="share-text"', T('Share as text'), T('A short message with each step')) + '</div></div>');
  }

  /* ---------- notifications ---------- */
  var notifCb = null;
  function askNotify(cb, why) {
    Native.notifyStatus().then(function (s) {
      if (s === 'granted') return cb(true);
      if (s === 'denied') { toast(T('Notifications are blocked. Turn them on in phone Settings, Apps, MetroYatri.')); return cb(false); }
      notifCb = cb; store.set('notifAsked', true);
      openSheet('<div class="body askbox"><span class="bell"><svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7"/><path d="M10 20a2 2 0 0 0 4 0"/></svg></span><h3>' + T('Allow notifications?') + '</h3>' +
        '<p>' + T(why || 'MetroYatri uses them for two things only:') + '</p><ul><li>' + T('An alert one stop before you need to get off or change trains.') + '</li><li>' + T('A daily reminder for your regular journey, if you switch it on.') + '</li></ul>' +
        '<p class="hint">' + T('No adverts and no offers. You can turn them off at any time in Account, Notifications.') + '</p>' +
        '<div class="btns one"><button class="btn" data-act="notif-yes">' + T('Allow notifications') + '</button><button class="btn alt" data-act="notif-no">' + T('Not now') + '</button></div></div>');
    });
  }
  /* daily reminder for a saved route */
  var DAYSETS = { mf: [2, 3, 4, 5, 6], ms: [2, 3, 4, 5, 6, 7], all: [1, 2, 3, 4, 5, 6, 7] }, REM_IDS = [7101, 7102, 7103, 7104, 7105, 7106, 7107];
  function reminder() { return store.get('remind', { on: false, route: null, time: '08:30', days: 'mf' }); }
  function reminderRoute(rm) {
    var x = rm.route; if (!x || !NET[x[0]] || !NET[x[0]].stations[x[1]] || !NET[x[0]].stations[x[2]]) return null;
    return engineOf(x[0]).plan(x[1], x[2], 'fast', {});
  }
  function scheduleReminder() {
    var rm = reminder();
    return Native.cancel(REM_IDS).then(function () {
      var r = rm.on ? reminderRoute(rm) : null; if (!r) return;
      var hm = rm.time.split(':'), x = rm.route;
      return Native.schedule(DAYSETS[rm.days].map(function (wd, i) {
        return { id: REM_IDS[i], title: T('Time for your metro'), body: T('{0} to {1}', snc(x[0], x[1]), snc(x[0], x[2])) + '. ' + T('Fare ₹{0}, about {1} min', r.fare.weekday, r.min) + '.', on: { weekday: wd, hour: +hm[0], minute: +hm[1] } };
      }));
    });
  }
  function renderAlerts() {
    var rm = reminder(), fv = favs(), on = store.get('alertsOn', true);
    $view.className = '';
    var html = backBtn() + head(T('Notifications'), T('Only the alerts you choose. No adverts.')) + '<div id="nstate"></div>' +
      '<div class="list">' + item('data-act="alerts-toggle"', T('Arrival alerts'), T('Vibrates and notifies one stop before you get off or change trains, after you tap Start journey'), '', sw(on)) + '</div>' +
      '<h2 class="sec">' + T('Daily journey reminder') + '</h2>';
    if (!fv.length) html += '<div class="card"><div class="empty" style="padding:14px 4px"><b>' + T('Save a route first') + '</b>' + T('Plan your regular journey and tap Save route. Then you can set a reminder for it here.') + '</div><a class="btn alt" href="#/plan">' + T('Plan a journey') + '</a></div>';
    else {
      var cur = rm.route ? rm.route.join('|') : fv[0].join('|');
      html += '<div class="card"><label class="field" style="margin:0 0 12px"><span>' + T('Journey') + '</span><select id="rroute">' + fv.map(function (x) { var k = x.join('|'); return '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(T('{0} to {1}', snc(x[0], x[1]), snc(x[0], x[2])) + ' (' + T(CITIES[x[0]].name) + ')') + '</option>'; }).join('') + '</select></label>' +
        '<label class="field" style="margin:0 0 12px"><span>' + T('Remind me at') + '</span><input id="rtime" type="time" value="' + esc(rm.time) + '"></label>' +
        '<div class="chips" style="margin:0 0 4px">' + [['mf', 'Mon to Fri'], ['ms', 'Mon to Sat'], ['all', 'Every day']].map(function (d) { return '<button class="chip' + (rm.days === d[0] ? ' on' : '') + '" data-act="rem-days" data-d="' + d[0] + '">' + T(d[1]) + '</button>'; }).join('') + '</div>' +
        '<div class="btns one"><button class="btn' + (rm.on ? ' alt' : '') + '" data-act="rem-toggle">' + T(rm.on ? 'Turn reminder off' : 'Turn reminder on') + '</button></div>' +
        (rm.on ? '<p class="hint" style="margin-top:10px">' + esc(T('Reminder is on for {0}.', fmtTime(new Date().setHours(+rm.time.split(':')[0], +rm.time.split(':')[1], 0, 0)))) + '</p>' : '') + '</div>';
    }
    html += '<div class="btns one"><button class="btn alt" data-act="notif-test">' + T('Send a test notification') + '</button></div>' +
      '<p class="hint" style="margin-top:12px">' + T('Alerts are worked out on this phone from the planned times, so they also work underground without signal. MetroYatri has no live train data and cannot send service disruption alerts.') + '</p>';
    $view.innerHTML = html;
    var keep = function () { var m = reminder(), a = document.getElementById('rroute'), b = document.getElementById('rtime'); if (a) m.route = a.value.split('|'); if (b && /^\d\d:\d\d$/.test(b.value)) m.time = b.value; store.set('remind', m); if (m.on) scheduleReminder(); };
    ['rroute', 'rtime'].forEach(function (id) { var el = document.getElementById(id); if (el) el.addEventListener('change', keep); });
    Promise.all([Native.notifyStatus(), Native.exactStatus()]).then(function (s) {
      var box = document.getElementById('nstate'); if (!box || page() !== 'alerts') return;
      if (s[0] !== 'granted') box.innerHTML = '<div class="card warnbox"><b>' + T('Notifications are off') + '</b><p class="hint" style="margin:2px 0 10px">' + T(s[0] === 'denied' ? 'They are blocked in phone settings. Open Settings, Apps, MetroYatri, Notifications and allow them.' : 'Allow them so alerts can reach you when the phone is locked.') + '</p>' + (s[0] === 'prompt' ? '<button class="btn" data-act="notif-ask">' + T('Allow notifications') + '</button>' : '') + '</div>';
      else if (s[1] !== 'granted') box.innerHTML = '<div class="card warnbox"><b>' + T('Alerts can arrive late') + '</b><p class="hint" style="margin:2px 0 10px">' + T('Android may delay alerts by a few minutes to save battery. Allow “Alarms and reminders” for MetroYatri to get them on time.') + '</p><button class="btn alt" data-act="exact-open">' + T('Open the setting') + '</button></div>';
    });
  }

  /* ---------- journey mode with arrival alert ---------- */
  var J_IDS = [7001, 7002, 7003, 7004, 7005, 7006, 7007, 7008], jTimer = null;
  function journey() { var j = store.get('journey', null); return j && NET[j.city] ? j : null; }
  function jAlerts(j) {
    var out = [], last = j.legs.length - 1;
    j.legs.forEach(function (l, i) {
      var n = l.st.length, k = Math.max(0, n - 2), at = j.start + (n > 2 ? l.t[k] : l.t[0] + 0.3) * 60000, stop = snc(j.city, l.st[n - 1]);
      out.push({ leg: i, at: at, title: T('Next stop: {0}', stop),
        body: i === last ? T('Get ready to get off. This is your destination.') : T('Get ready to change to the {0}, {1}.', T(j.legs[i + 1].name), towardsText(j.legs[i + 1], j.city)) });
    });
    return out;
  }
  function jSchedule(j) {
    return Native.cancel(J_IDS).then(function () {
      if (!store.get('alertsOn', true)) return;
      var now = Date.now();
      return Native.schedule(jAlerts(j).filter(function (a) { return !j.fired[a.leg] && a.at > now + 1500; }).slice(0, 8).map(function (a) { return { id: J_IDS[a.leg], title: a.title, body: a.body, at: new Date(a.at) }; }));
    });
  }
  function jStart(r) {
    var legs = [], off = 1;
    r.legs.forEach(function (l, i) {
      if (i) off += r.legs[i - 1].to !== l.from ? (C.walkMin || 9) : (C.xferMin || 6);
      legs.push({ name: l.name, color: l.color, text: l.text, tw: l.tw, st: l.stations.slice(), t: l.times.map(function (m) { return off + m; }) });
      off += l.min;
    });
    var j = { city: C.id, from: r.from, to: r.to, start: Date.now(), legs: legs, fired: {} };
    store.set('journey', j); jSchedule(j); jWatch(); go('#/journey');
  }
  function jEnd(quiet) { store.del('journey'); Native.cancel(J_IDS); clearInterval(jTimer); jTimer = null; if (!quiet) toast(T('Journey ended')); }
  /* where the planned times say you are now */
  function jWhere(j) {
    var m = (Date.now() - j.start) / 60000;
    for (var i = 0; i < j.legs.length; i++) {
      var l = j.legs[i], n = l.st.length;
      if (m < l.t[0]) return { leg: i, idx: 0, waiting: true };
      if (m < l.t[n - 1]) { var k = 0; while (k < n - 2 && l.t[k + 1] <= m) k++; return { leg: i, idx: k, left: Math.max(1, Math.round(l.t[n - 1] - m)) }; }
    }
    return { done: true };
  }
  function jTick() {
    var j = journey(); if (!j) { clearInterval(jTimer); jTimer = null; return; }
    var now = Date.now(), changed = false, lastLeg = j.legs[j.legs.length - 1];
    if (now > j.start + (lastLeg.t[lastLeg.t.length - 1] + 6) * 60000) { jEnd(true); toast(T('Journey finished')); if (page() === 'journey') location.replace('#/plan'); else if (page() === 'plan') rerender(); return; }
    jAlerts(j).forEach(function (a) {
      if (!j.fired[a.leg] && now >= a.at) { j.fired[a.leg] = 1; changed = true; if (store.get('alertsOn', true) && now - a.at < 180000) { Native.vibrate([500, 200, 500, 200, 500]); toast(a.title + '. ' + a.body); } }
    });
    if (changed) store.set('journey', j);
    if (page() === 'journey' && $sheet.hidden) rerender();
  }
  function jWatch() { clearInterval(jTimer); if (journey()) jTimer = setInterval(jTick, 5000); }
  function renderJourney() {
    var j = journey(); if (!j) return location.replace('#/plan');
    var w = jWhere(j), nm = function (i) { return snc(j.city, i); }, last = j.legs.length - 1, html = backBtn() + head(T('Journey in progress'), esc(T('{0} to {1}', nm(j.from), nm(j.to))));
    var now;
    if (w.done) now = '<b>' + esc(T('You should be at {0} now', nm(j.to))) + '</b><span>' + T('Tap End journey when you leave the train.') + '</span>';
    else {
      var l = j.legs[w.leg], n = l.st.length;
      if (w.waiting) now = '<b>' + esc(T('Board the {0} at {1}', T(l.name), nm(l.st[0]))) + '</b><span>' + esc(towardsText(l, j.city)) + '</span>';
      else now = '<b>' + esc(T('Next stop: {0}', nm(l.st[w.idx + 1]))) + '</b><span>' + esc(w.leg === last ? T('About {0} min to {1}, where you get off', w.left, nm(l.st[n - 1])) : T('About {0} min to {1}, where you change trains', w.left, nm(l.st[n - 1]))) + '</span>';
    }
    html += '<div class="jnow"><span class="pulse"></span><div>' + now + '</div></div><div id="jwarn"></div>' +
      '<p class="hint" style="margin:10px 2px">' + T('The phone vibrates one stop before you get off or change. If the train is ahead or behind, tap the station you are at and the alert is corrected.') + '</p>';
    j.legs.forEach(function (l, i) {
      var n = l.st.length;
      html += (i ? '<div class="change" style="margin:10px 0 0 6px">' + esc(j.legs[i - 1].st[j.legs[i - 1].st.length - 1] !== l.st[0] ? T('Walk from {0} to {1} station', nm(j.legs[i - 1].st[j.legs[i - 1].st.length - 1]), nm(l.st[0])) : T('Change trains at {0}', nm(l.st[0]))) + '</div>' : '') +
        '<div class="card jleg" style="--c:' + l.color + ';--ct:' + l.text + '"><div class="jhead"><span class="ln">' + esc(T(l.name)) + '</span>' + esc(towardsText(l, j.city)) + '</div>' +
        l.st.map(function (id, k) {
          var st = w.done || i < w.leg || (i === w.leg && !w.waiting && k <= w.idx) ? 'done' : '', here = !w.done && i === w.leg && k === w.idx;
          var tag = k === n - 1 ? T(i === last ? 'Get off' : 'Change') : (k === Math.max(0, n - 2) && n > 2 ? T('Alert') : '');
          return '<button class="jst ' + st + (here ? ' here' : '') + (k === n - 1 ? ' end' : '') + '" data-act="j-here" data-l="' + i + '" data-k="' + k + '"><span class="d"></span><span class="grow">' + esc(nm(id)) + '</span>' +
            (tag ? '<em>' + tag + '</em>' : '') + '<time>' + fmtTime(j.start + l.t[k] * 60000) + '</time></button>';
        }).join('') + '</div>';
    });
    html += '<div class="btns one"><button class="btn danger" data-act="j-end">' + T('End journey') + '</button></div>' +
      '<p class="hint" style="margin-top:12px">' + T('Times come from the planned route, not from live trains, so they can be a few minutes out. Keep an eye on the station names too.') + '</p>';
    $view.className = ''; $view.innerHTML = html;
    Native.notifyStatus().then(function (s) {
      var box = document.getElementById('jwarn'); if (!box || s === 'granted' || !store.get('alertsOn', true)) return;
      box.innerHTML = '<p class="note" style="margin-top:10px">' + T('Notifications are off, so the alert only works while this screen is open.') + ' <a href="#/alerts">' + T('Turn them on') + '</a></p>';
    });
  }

  /* ---------- Map ---------- */
  var map = null;
  function renderMap() {
    $view.className = 'full';
    var r = state.mapRoute, tiles = store.get('tiles', true);
    $view.innerHTML = '<div class="mapwrap' + (r ? ' routed' : '') + '"><div id="mapwrap" class="mapbox"></div><div class="maptop"><button class="search" data-act="map-search" style="text-align:left">' + SEARCH_ICON + '<span style="color:var(--soft)">' + esc(T('Find a {0} station', T(C.name))) + '</span></button></div>' +
      '<div class="legend">' + GROUPS.map(function (g) { return '<span><i style="background:' + GCOL[g] + '"></i>' + esc(gshort(g)) + '</span>'; }).join('') + '</div>' +
      '<div class="zoom"><button data-act="tiles" class="' + (tiles ? 'on' : '') + '" aria-label="' + T('Street map on or off') + '"><svg viewBox="0 0 24 24"><path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 13 9 5 9-5"/></svg></button><button data-act="locate" aria-label="' + T('Show where I am') + '"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></button><button data-act="zin" aria-label="' + T('Zoom in') + '">+</button><button data-act="zout" aria-label="' + T('Zoom out') + '">−</button></div></div>' +
      (r ? '<div class="routebar"><div class="grow"><b>' + esc(T('{0} to {1}', sn(r.from), sn(r.to))) + '</b><small>₹' + fareNow(r) + ', ' + T('{0} km', r.km.toFixed(1)) + ', ' + T('{0} min', r.min) + ', ' + cnt(r.changes, '{0} change', '{0} changes') + '</small></div><button data-act="clear-route">' + T('Clear') + '</button></div>' : '');
    map = new window.MetroMap(document.getElementById('mapwrap'), D, E, { onStation: stationSheet, tiles: tiles, name: function (id) { return sn(id); },
      onTilesFailed: function (offline) { toast(T(offline ? 'No internet. Showing metro lines without the street map.' : 'The street map could not load. Metro lines are still shown.')); }, center: C.center ? { at: C.center, zoom: C.zoom } : null });
    if (r) map.setRoute(r);
    else if (state.mapFocus) { map.focus(state.mapFocus); state.mapFocus = null; }
  }
  function startGo(id) { return '<button class="btn alt" data-act="set-from" data-id="' + id + '">' + T('Start here') + '</button><button class="btn" data-act="set-to" data-id="' + id + '">' + T('Go here') + '</button>'; }
  function stationSheet(id) {
    if (map) map.pick(id);
    openSheet('<header><h3><span style="display:flex;align-items:center;gap:10px">' + roundels(id, true) + esc(sn(id)) + '</span><button data-act="close-sheet">' + T('Close') + '</button></h3><p class="hint">' + esc(lineNames(id)) + '</p></header>' +
      '<div class="body"><div class="btns" style="margin-top:0">' + startGo(id) + '</div>' +
      '<div class="btns one"><a class="btn alt" href="#/station/' + id + '" data-act="close-sheet-nav">' + T('Station details') + '</a></div></div>');
  }

  /* ---------- Stations ---------- */
  var stFilter = { q: '', g: '' };
  function stationsList() {
    var q = stFilter.q, g = stFilter.g;
    if (g && !q.trim()) {
      return D.lines.filter(function (l) { return l.g === g; }).map(function (l) {
        return '<div class="linehead" style="--c:' + l.color + ';--ct:' + l.text + ';margin-top:12px">' + esc(T(l.name)) + '<span style="margin-left:auto;font-size:14px;font-weight:600">' + T('{0} stations', l.st.length) + '</span></div>' +
          (l.note ? '<p class="hint" style="margin:-2px 4px 10px">' + esc(T(l.note)) + '</p>' : '') +
          '<div class="list">' + l.st.map(function (id) {
            var others = groupsOf(id).filter(function (x) { return x !== g; });
            return item('href="#/station/' + id + '"', esc(sn(id)), others.length ? esc(T('Change for {0}', others.map(gname).join(', '))) : '', roundels(id));
          }).join('') + '</div>';
      }).join('');
    }
    var ids = matchStations(q).filter(function (id) { return !g || groupsOf(id).indexOf(g) >= 0; });
    if (!ids.length) return '<div class="empty"><b>' + T('No station found') + '</b>' + T('Try a different spelling or an older name.') + '</div>';
    return '<div class="list" style="margin-top:12px">' + ids.map(function (id) { return item('href="#/station/' + id + '"', esc(sn(id)), esc(aliasHit(id, q) || lineNames(id)), roundels(id)); }).join('') + '</div>';
  }
  function stChips() {
    return '<button class="chip' + (!stFilter.g ? ' on' : '') + '" data-act="st-line" data-g="">' + T('All') + '</button>' + GROUPS.map(function (g) {
      return '<button class="chip' + (stFilter.g === g ? ' on' : '') + '" data-act="st-line" data-g="' + g + '"><i style="background:' + GCOL[g] + '"></i>' + esc(gshort(g)) + '</button>';
    }).join('');
  }
  function renderStations() {
    $view.className = '';
    $view.innerHTML = head(esc(T('{0} stations', T(C.name))), T('Search by name, or pick a line to see its stations in order')) +
      '<label class="search">' + SEARCH_ICON + '<input id="sq" type="search" placeholder="' + esc(T('Search {0} stations', D.meta.stations)) + '" value="' + esc(stFilter.q) + '" autocomplete="off" spellcheck="false"></label>' +
      '<div class="chips" id="schips">' + stChips() + '</div><div id="slist">' + stationsList() + '</div>';
    var q = document.getElementById('sq');
    q.addEventListener('input', function () { stFilter.q = q.value; document.getElementById('slist').innerHTML = stationsList(); });
  }
  var LAY = { E: 'Elevated', U: 'Underground', G: 'At ground level' };
  function renderStation(id) {
    var st = S[id]; if (!st) return go('#/stations');
    var gs = groupsOf(id), also = (I18N.lang === 'hi' ? [st.n] : []).concat(st.a || []);
    var html = backBtn() + head(esc(sn(id)), T(gs.length > 1 ? 'Interchange station' : 'Metro station') + (also.length ? ', ' + esc(T('also known as {0}', also.join(', '))) : ''), roundels(id, true)) +
      '<div class="btns" style="margin-top:0">' + startGo(id) + '</div><h2 class="sec">' + T('Lines and next stations') + '</h2>';
    st.lines.forEach(function (lid) {
      var l = E.lines[lid], i = l.st.indexOf(id), n = l.st.length;
      var prev = i > 0 ? l.st[i - 1] : (l.loop ? l.st[n - 1] : null), next = i < n - 1 ? l.st[i + 1] : (l.loop ? l.st[0] : null);
      var link = function (x) { return '<b><a href="#/station/' + x + '">' + esc(sn(x)) + '</a></b>'; };
      html += '<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="rd"><i style="--c:' + l.color + '"></i></span><b style="font-size:17px">' + esc(T(l.name)) + '</b></div>' +
        (st.lay && LAY[st.lay[l.g]] ? '<div class="kv"><span>' + T('Platform level') + '</span><b>' + T(LAY[st.lay[l.g]]) + '</b></div>' : '') +
        (st.op && st.op[l.g] ? '<div class="kv"><span>' + T('Opened') + '</span><b>' + new Date(st.op[l.g]).toLocaleDateString(I18N.locale(), { day: 'numeric', month: 'short', year: 'numeric' }) + '</b></div>' : '') +
        (prev ? '<div class="kv"><span>' + esc(l.loop ? T('One way round') : T('Towards {0}', sn(l.st[0]))) + '</span>' + link(prev) + '</div>' : '<div class="kv"><span>' + T('Line starts here') + '</span><b></b></div>') +
        (next ? '<div class="kv"><span>' + esc(l.loop ? T('Other way round') : T('Towards {0}', sn(l.st[n - 1]))) + '</span>' + link(next) + '</div>' : '<div class="kv"><span>' + T('Line ends here') + '</span><b></b></div>') +
        (l.note ? '<p class="hint" style="margin-top:6px">' + esc(T(l.note)) + '</p>' : '') + '</div>';
    });
    (C.links || []).forEach(function (pr) {
      var other = pr[0] === id ? pr[1] : pr[1] === id ? pr[0] : null; if (!other) return;
      html += '<a class="card" style="display:block" href="#/station/' + other + '"><b style="font-size:16px">' + esc(T('Walk to {0} station', sn(other))) + '</b><p class="hint" style="margin-top:2px">' + esc(T('A short walk links this station to {0} for the {1}.', sn(other), lineNames(other))) + '</p></a>';
    });
    var near = C.places.filter(function (p) { return p[1] === st.n; });
    if (near.length) html += '<h2 class="sec">' + T('Get off here for') + '</h2><div class="list">' + near.map(function (p) { return item('', esc(T(p[0])), '', '', ''); }).join('') + '</div>';
    html += '<div class="btns"><button class="btn alt" data-act="map-focus" data-id="' + id + '">' + T('See on map') + '</button><a class="btn alt" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(st.n + ' metro station ' + C.name) + '">' + T('Open in Google Maps') + '</a></div>' +
      '<p class="hint" style="margin-top:12px">' + esc(T(C.timings)) + '</p>';
    $view.className = ''; $view.innerHTML = html; $view.scrollTop = 0;
  }

  /* ---------- Tickets ---------- */
  function officialCard() {
    var o = C.official;
    return '<div class="card" style="margin-top:12px"><b style="font-size:17px">' + T('Get a real ticket') + '</b><p class="hint" style="margin:4px 0 2px">' + esc(T('Only {0} can issue tickets that open the metro gates. These open the official channels:', T(C.operator))) + '</p>' +
      '<div class="btns one">' + o.buttons.map(function (b, i) { return '<a class="btn' + (i ? ' alt' : '') + '" target="_blank" rel="noopener" href="' + b[1] + '">' + esc(T(b[0])) + '</a>'; }).join('') + '</div></div>';
  }
  function qrSvg(text) { var q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
  function emptyCard(title, text, btn, href) { return '<div class="card"><div class="empty" style="padding:18px 4px"><b>' + T(title) + '</b>' + T(text) + '</div><a class="btn" href="' + href + '">' + T(btn) + '</a></div>'; }
  function renderTickets() {
    var u = Auth.current();
    $view.className = '';
    if (!u) { $view.innerHTML = head(T('Tickets')) + emptyCard('Log in to book tickets', 'Your bookings are saved to your account.', 'Log in or create account', '#/login') + officialCard(); return; }
    var t = tickets();
    $view.innerHTML = head(T('Tickets'), T('Practice bookings made in this app')) +
      (t.length ? '<div class="list">' + t.map(function (x) {
        var live = sameDay(x.at, Date.now());
        return item('href="#/ticket/' + x.id + '"', esc(T('{0} to {1}', tkName(x, 'from'), tkName(x, 'to'))), esc(tkCity(x)) + ', ' + fmtDate(x.at) + ', ' + cnt(x.pax, '{0} passenger', '{0} passengers') + ', ₹' + x.total, '', '<span class="tag' + (live ? ' live' : '') + '">' + T(live ? 'Today' : 'Past') + '</span>');
      }).join('') + '</div>' : emptyCard('No bookings yet', 'Plan a journey, then tap Book ticket.', 'Plan a journey', '#/plan')) + officialCard();
  }
  var book = { pax: 1, pay: 'upi' }, PAY = { upi: 'UPI', card: 'Debit or credit card', wallet: 'Wallet' };
  function renderBook() {
    var r = state.route, u = Auth.current();
    if (!r) return go('#/plan');
    if (!u) { state.next = '#/book'; return location.replace('#/login'); }
    if (Auth.cloud && !u.verified) { state.next = '#/book'; return location.replace('#/verify'); }
    var f = fareNow(r);
    $view.className = '';
    $view.innerHTML = backBtn() + head(T('Book ticket'), T('Single journey, valid today')) +
      '<p class="note" style="margin:0 0 12px">' + T('Practice booking. No money is taken and this ticket will not open metro gates. For a real ticket use the official options below.') + '</p>' +
      '<div class="card"><div class="kv"><span>' + T('From') + '</span><b>' + esc(sn(r.from)) + '</b></div><div class="kv"><span>' + T('To') + '</span><b>' + esc(sn(r.to)) + '</b></div>' +
      '<div class="kv"><span>' + T('Journey') + '</span><b>' + T('{0} km', r.km.toFixed(1)) + ', ' + cnt(r.changes, '{0} change', '{0} changes') + '</b></div>' +
      stepper('Passengers', 'pax', '', book.pax, 'Fewer', 'More') +
      '<div class="kv"><span>' + T('Fare per passenger') + '</span><b>₹' + f + (isHoliday() ? ' ' + T('(holiday fare)') : '') + '</b></div><div class="kv total"><span>' + T('Total') + '</span><b>₹' + f * book.pax + '</b></div></div>' +
      '<h2 class="sec">' + T('Pay with') + '</h2><div class="card">' + Object.keys(PAY).map(function (p) {
        return '<label class="radio"><input type="radio" name="pay" value="' + p + '"' + (book.pay === p ? ' checked' : '') + '><span>' + T(PAY[p]) + ' <small style="color:var(--soft)">' + T('(practice, nothing is charged)') + '</small></span></label>';
      }).join('') + '</div><div class="btns one"><button class="btn signal" data-act="confirm-book">' + T('Confirm practice booking of ₹{0}', f * book.pax) + '</button></div>' + officialCard();
  }
  function renderTicket(id) {
    var x = tickets().filter(function (t) { return t.id === id; })[0];
    if (!x) return go('#/tickets');
    var live = sameDay(x.at, Date.now()), via = (x.lines || String(x.via || '').split(', then ')).map(function (n) { return T(n); }).join(T(', then '));
    $view.className = '';
    $view.innerHTML = backBtn() + '<div class="ticket"><div class="demo"><p>' + T('Practice ticket. Not valid for travel.') + '</p></div><div class="top"><div class="od"><div><small>' + T('From') + '</small><b>' + esc(tkName(x, 'from')) + '</b></div><span class="arrow">›</span><div><small>' + T('To') + '</small><b>' + esc(tkName(x, 'to')) + '</b></div></div></div>' +
      '<div class="tear"></div><div class="qr"><div class="code">' + qrSvg('MetroYatri practice ticket - NOT VALID FOR TRAVEL | ' + x.id + ' | ' + x.fromN + ' > ' + x.toN + ' | ' + x.pax + ' pax') + '</div><span class="stamp">DEMO</span></div>' +
      '<div class="meta"><div class="kv"><span>' + T('Booking number') + '</span><b>' + x.id + '</b></div><div class="kv"><span>' + T('City') + '</span><b>' + esc(tkCity(x)) + '</b></div><div class="kv"><span>' + T('Booked') + '</span><b>' + fmtDate(x.at) + '</b></div><div class="kv"><span>' + T('Passengers') + '</span><b>' + x.pax + '</b></div>' +
      '<div class="kv"><span>' + T('Route') + '</span><b>' + esc(via) + '</b></div><div class="kv"><span>' + T('Paid with') + '</span><b>' + T(PAY[x.pay] || 'UPI') + ' ' + T('(practice)') + '</b></div><div class="kv total"><span>' + T('Total') + '</span><b>₹' + x.total + '</b></div>' +
      '<div style="margin-top:8px"><span class="tag' + (live ? ' live' : '') + '">' + T(live ? 'Booked today' : 'Past booking') + '</span></div></div></div>' +
      '<div class="btns"><button class="btn alt" data-act="ticket-route" data-id="' + x.id + '">' + T('See route') + '</button><button class="btn danger" data-act="ticket-del" data-id="' + x.id + '">' + T('Delete') + '</button></div>' + officialCard();
    $view.scrollTop = 0;
  }

  /* ---------- Account ---------- */
  function accountTag(u) { return u.mode === 'cloud' ? (u.verified ? 'Email verified' : 'Email not verified') : 'Saved on this phone'; }
  function syncLine(u) {
    if (!u) return T('Log in to keep saved routes and bookings on all your phones');
    if (!u.verified) return T('Verify your email to turn sync on');
    var s = Sync.status();
    if (!s) return T('Tap to sync now');
    if (s.ok) return T('Up to date. Last synced {0}', fmtDate(s.at));
    if (s.err === 'offline') return T('No internet. It will sync when you are back online.');
    return T('Sync is not set up in Firebase yet ({0})', s.err);
  }
  function renderMore() {
    var u = Auth.current(), dark = document.documentElement.getAttribute('data-theme') === 'dark', fv = favs(), rm = reminder();
    $view.className = '';
    $view.innerHTML = head(T('Account')) +
      (u ? '<a class="card profile" href="#/profile">' + avatar(u) + '<div class="grow" style="min-width:0"><b style="font-size:19px;display:block">' + esc(u.name) + '</b><span class="hint">' + esc(u.email) + '</span><br>' +
          '<span class="tag' + (u.mode === 'cloud' ? (u.verified ? ' live' : ' warn') : '') + '">' + T(accountTag(u)) + '</span></div><span class="chev">›</span></a>' +
          (u.mode === 'cloud' && !u.verified ? '<div class="btns one"><a class="btn signal" href="#/verify">' + T('Verify your email') + '</a></div>' : '')
         : '<div class="card"><b style="font-size:18px">' + T('You are not logged in') + '</b><p class="hint" style="margin:2px 0 10px">' + T('Log in to book tickets and keep your booking history.') + '</p><a class="btn" href="#/login">' + T('Log in or create account') + '</a></div>') +
      '<h2 class="sec">' + T('Your travel') + '</h2><div class="list">' +
      item('data-act="city"', T('City'), esc(T(C.name) + ', ' + T(C.system))) +
      item('href="#/saved"', T('Saved routes'), fv.length ? cnt(fv.length, '{0} route saved', '{0} routes saved') : T('Nothing saved yet')) +
      item('href="#/tickets"', T('My bookings'), u ? cnt(tickets().length, '{0} practice booking', '{0} practice bookings') : T('Log in to see bookings')) +
      (Sync.available() ? item(u ? (u.verified ? 'data-act="sync-now"' : 'href="#/verify"') : 'href="#/login"', T('Sync across phones'), esc(syncLine(u))) : '') + '</div>' +
      '<h2 class="sec">' + T('Travel information') + '</h2><div class="list">' +
      item('href="#/fares"', T('Fare chart'), T('Fares by distance')) +
      item('href="#/places"', T('Places to visit by metro'), T('Nearest station for popular places')) +
      item('href="#/help"', T('Timings, helplines and real tickets'), esc(T(C.helplines[0][0]))) + '</div>' +
      '<h2 class="sec">' + T('App') + '</h2><div class="list">' +
      item('data-act="lang"', 'Language / भाषा', I18N.lang === 'hi' ? 'हिन्दी' : 'English') +
      item('href="#/alerts"', T('Notifications'), T(rm.on ? 'Arrival alerts and a daily reminder' : 'Arrival alerts and reminders')) +
      item('data-act="theme"', T('Dark mode'), T(dark ? 'On' : 'Off'), '', sw(dark)) +
      item('href="#/privacy"', T('Privacy policy'), T('What the app stores and what it does not')) +
      item('href="#/about"', T('About this app and its data'), esc(T('Network checked on {0}', trDate(C.checked)))) +
      item('href="#/developer"', T('About the developer'), esc(CFG.developer.name)) +
      (u ? item('data-act="logout"', T('Log out'), '', '', '') + '<button class="item" data-act="del-account"><span class="grow"><b style="color:#C62828">' + T('Delete my account') + '</b></span></button>' : '') + '</div>' +
      '<p class="legal">' + esc(T('MetroYatri is an independent guide made by {0}. It is not made by, linked to or approved by any metro operator.', CFG.developer.name)) + '</p>';
  }
  function renderProfile() {
    var u = Auth.current(); if (!u) return location.replace('#/login');
    $view.className = '';
    $view.innerHTML = backBtn() + head(T('Your profile')) +
      '<div class="card" style="text-align:center;padding:22px 16px"><button class="avatar-btn" data-act="photo-zoom" aria-label="' + T('View profile photo') + '">' + avatar(u, 'xl') + '</button><p class="hint" style="margin-top:8px">' + T('Tap the photo to view it larger') + '</p>' +
      '<div class="btns' + (u.photo ? '' : ' one') + '" style="margin-top:16px"><label class="btn alt">' + T(u.photo ? 'Change photo' : 'Add a profile photo') + '<input type="file" id="photo" accept="image/*" hidden></label>' + (u.photo ? '<button class="btn alt" data-act="photo-remove">' + T('Remove photo') + '</button>' : '') + '</div></div>' +
      '<form id="nameform" novalidate><label class="field"><span>' + T('Your name') + '</span><input name="name" maxlength="40" value="' + esc(u.name) + '" autocomplete="name"></label>' +
      '<p class="err" id="nameerr"></p><button class="btn" type="submit">' + T('Save name') + '</button></form>' +
      '<div class="card" style="margin-top:16px"><div class="kv"><span>' + T(u.email.indexOf('@') > 0 ? 'Email' : 'Mobile') + '</span><b>' + esc(u.email) + '</b></div><div class="kv"><span>' + T('Account') + '</span><b>' + T(accountTag(u)) + '</b></div></div>' +
      '<p class="hint" style="margin-top:10px">' + T('Your photo stays on this phone. It is not uploaded anywhere.') + '</p>';
    document.getElementById('photo').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var n = 256, c = document.createElement('canvas'), s = Math.min(img.width, img.height);
          c.width = c.height = n;
          c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, n, n);
          Auth.setPhoto(c.toDataURL('image/jpeg', 0.85)); toast(T('Profile photo updated')); rerender();
        };
        img.onerror = function () { toast(T('That file is not a picture this phone can read.')); };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
    document.getElementById('nameform').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = e.target.name.value.trim();
      if (v.length < 2) { document.getElementById('nameerr').textContent = T('Enter a name with at least 2 letters.'); return; }
      Auth.setName(v); toast(T('Name saved')); rerender();
    });
  }
  function renderSaved() {
    var fv = favs(); $view.className = '';
    var html = backBtn() + head(T('Saved routes'), T('Tap a route to plan it again'));
    if (!fv.length) html += emptyCard('No saved routes yet', 'Plan a journey and tap Save route.', 'Plan a journey', '#/plan');
    Object.keys(CITIES).forEach(function (cid) {
      var list = fv.filter(function (x) { return x[0] === cid; }); if (!list.length) return;
      html += '<h2 class="sec">' + esc(T(CITIES[cid].name)) + '</h2><div class="list">' + list.map(function (x) {
        var d = 'data-city="' + cid + '" data-from="' + x[1] + '" data-to="' + x[2] + '"';
        return '<div class="item"><button class="grow open" data-act="use-saved" ' + d + '><b>' + esc(T('{0} to {1}', snc(cid, x[1]), snc(cid, x[2]))) + '</b></button><button class="x" data-act="del-saved" ' + d + ' aria-label="' + T('Remove saved route') + '">' + X_ICON + '</button></div>';
      }).join('') + '</div>';
    });
    $view.innerHTML = html;
  }
  function renderDeveloper() {
    var d = CFG.developer; $view.className = '';
    $view.innerHTML = backBtn() + head(T('Developer')) +
      '<div class="card" style="text-align:center;padding:24px 16px"><span class="avatar xl">' + esc(d.name.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2)) + '</span>' +
      '<b style="display:block;font-size:22px;margin-top:12px">' + esc(d.name) + '</b><span class="hint" style="font-size:15px">' + esc(T(d.role)) + '</span></div>' +
      '<div class="card"><b>' + T('About me') + '</b><p class="hint" style="margin-top:4px;font-size:15px;color:var(--ink)">' + esc(T(d.about)) + '</p></div>' +
      '<h2 class="sec">' + T('Find me online') + '</h2><div class="list">' + d.links.map(function (l) { return item('target="_blank" rel="noopener" href="' + esc(l[1]) + '"', esc(l[0]), esc(l[1].replace(/^https?:\/\/(www\.)?/, ''))); }).join('') + '</div>' +
      '<p class="legal">' + esc(T('MetroYatri version {0}, designed and developed by {1}.', VERSION, d.name)) + '</p>';
  }
  var loginMode = 'login';
  function afterLogin() { Sync.now().then(function (changed) { if (changed) rerender(); }); }
  function renderLogin() {
    $view.className = '';
    var up = loginMode === 'signup', cloud = Auth.cloud;
    $view.innerHTML = backBtn() + head(T(up ? 'Create account' : 'Log in'), T(cloud ? (up ? 'We will email you a link to verify the address' : 'Use the email you signed up with') : 'Your account is stored only on this phone')) +
      '<div class="seg"><button class="' + (!up ? 'on' : '') + '" data-act="login-mode" data-m="login">' + T('Log in') + '</button><button class="' + (up ? 'on' : '') + '" data-act="login-mode" data-m="signup">' + T('Create account') + '</button></div>' +
      '<form id="authform" novalidate>' + (up ? '<label class="field"><span>' + T('Your name') + '</span><input name="name" autocomplete="name" maxlength="40"></label>' : '') +
      '<label class="field"><span>' + T(cloud ? 'Email address' : 'Email or mobile number') + '</span><input name="id" autocomplete="username" inputmode="email" autocapitalize="off" maxlength="60"></label>' +
      '<label class="field"><span>' + T('Password') + '</span><input name="pw" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" maxlength="60"></label>' +
      '<p class="err" id="autherr"></p><button class="btn" type="submit">' + T(up ? 'Create account' : 'Log in') + '</button>' +
      (cloud && !up ? '<div class="btns one"><button class="btn alt" type="button" data-act="forgot">' + T('Forgot password') + '</button></div>' : '') + '</form>' +
      '<p class="legal">' + T(cloud ? 'This is a MetroYatri account, not an account with a metro operator. Only people who can open the email inbox can use the account.'
        : 'This is not an account with a metro operator. Accounts on this phone are not verified, so do not reuse a password from another service.') +
      ' ' + T('By creating an account you accept the') + ' <a href="#/privacy">' + T('privacy policy') + '</a>.</p>';
    document.getElementById('authform').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('button[type=submit]'), err = document.getElementById('autherr');
      btn.disabled = true; err.textContent = '';
      (up ? Auth.signup(f.name.value, f.id.value, f.pw.value) : Auth.login(f.id.value, f.pw.value)).then(function (u) {
        loginMode = 'login';
        if (Auth.cloud && !u.verified) { toast(T(up ? 'Verification email sent' : 'Verify your email to continue')); location.replace('#/verify'); return route(); }
        toast(T('Logged in as {0}', u.name)); var n = state.next || '#/more'; state.next = null; location.replace(n); route(); afterLogin();
      }, function (msg) { btn.disabled = false; err.textContent = T(String(msg)); });
    });
  }
  function renderVerify() {
    var u = Auth.current(); if (!u) return location.replace('#/login');
    if (!Auth.cloud || u.verified) return location.replace(state.next || '#/more');
    $view.className = '';
    $view.innerHTML = backBtn() + head(T('Verify your email'), T('One step left before you can book')) +
      '<div class="card"><p style="font-size:16px">' + T('We sent a link to {0}.', '<b>' + esc(u.email) + '</b>') + '</p><ol class="steps"><li>' + T('Open the verification email. Check the spam folder too.') + '</li><li>' + T('Tap the link in it.') + '</li><li>' + T('Come back here and tap the button below.') + '</li></ol>' +
      '<p class="err" id="verr"></p><button class="btn signal" data-act="verify-check">' + T('I have opened the link') + '</button>' +
      '<div class="btns"><button class="btn alt" data-act="verify-resend">' + T('Send the email again') + '</button><button class="btn alt" data-act="logout">' + T('Use another email') + '</button></div></div>';
  }
  function slabTable(tb, cols) {
    var lo = 0;
    return '<table class="slab"><tr><th>' + T('Distance') + '</th>' + cols.map(function (c) { return '<th>' + c[0] + '</th>'; }).join('') + '</tr>' +
      tb.map(function (r) { var row = '<tr><td>' + (r[0] === Infinity ? T('Over {0} km', lo) : T('{0} to {1} km', lo, r[0])) + '</td>' + cols.map(function (c) { return '<td>₹' + c[1](r) + '</td>'; }).join('') + '</tr>'; lo = r[0]; return row; }).join('') + '</table>';
  }
  function renderFares() {
    $view.className = '';
    var cols = [[T(C.holidayFares ? 'Mon to Sat' : 'Fare'), function (r) { return r[1]; }]];
    if (C.holidayFares) cols.push([T('Sunday, holiday'), function (r) { return r[2]; }]);
    else if (C.card) cols.push([T('{0}% off', C.card.pct), function (r) { return cardFare(r[1]); }]);
    $view.innerHTML = backBtn() + head(esc(T('{0} fare chart', T(C.name))), esc(T('In force since {0}', T(C.fareSince)))) +
      (C.fareGroups ? C.fareGroups.map(function (g) { return '<div class="card"><b>' + esc(T(g.name)) + '</b>' + slabTable(g.slabs, [[T('Fare'), function (r) { return r[1]; }]]) + '</div>'; }).join('')
        : '<div class="card">' + slabTable(C.slabs, cols) + '</div>') +
      C.fareNotes.map(function (n) { return info(n[0], n[1]); }).join('') +
      info('How fare is worked out', 'Fare depends on the distance between your two stations. Near the edge of a distance band the app can be one band out, so treat the fare as a close guide and confirm at the station or in the official app.');
  }
  function renderPlaces() {
    $view.className = '';
    $view.innerHTML = backBtn() + head(esc(T('Places in {0}', T(C.name))), T('Tap a place to plan a journey to its nearest station')) + '<div class="list">' +
      C.places.map(function (p) { var id = BYNAME[p[1]]; return item('data-act="set-to" data-id="' + id + '"', esc(T(p[0])), esc(T('{0} station', sn(id))), roundels(id)); }).join('') + '</div>';
  }
  function renderHelp() {
    $view.className = '';
    $view.innerHTML = backBtn() + head(esc(T('{0} help', T(C.system)))) + info('Train timings', C.timings) +
      '<h2 class="sec">' + T('Helplines') + '</h2><div class="list">' + C.helplines.map(function (h) { return item('href="tel:' + h[1] + '"', esc(T(h[0])), h[1]); }).join('') + '</div>' + officialCard() +
      '<div class="btns one"><a class="btn alt" target="_blank" rel="noopener" href="' + C.official.site + '">' + T('Open the official website') + '</a></div>';
  }
  function renderAbout() {
    $view.className = '';
    $view.innerHTML = backBtn() + head(T('About'), esc(T('MetroYatri {0}, {1}', VERSION, T(C.name)))) +
      C.about.map(function (a) { return info(a[0], a[1]); }).join('') +
      info('Tickets', 'Bookings inside this app are for practice only and are clearly marked. Real tickets are sold only through official channels, which the app links to.') +
      info('Street map and address search', 'The map behind the lines and the address search need internet. Map data, tiles and search results © OpenStreetMap contributors. Without internet the lines are shown on a plain background.') +
      '<div class="list" style="margin-top:10px">' + item('href="#/privacy"', T('Privacy policy'), '') + item('href="#/developer"', T('About the developer'), esc(CFG.developer.name)) + '</div>' +
      '<p class="legal">' + T('Independent app. Not made by, linked to or approved by any metro operator. Uses the Roboto and Noto Sans Devanagari typefaces (SIL Open Font License), Leaflet (BSD) and qrcode-generator (MIT).') + '</p>';
  }
  var PRIVACY = [
    ['In short', 'MetroYatri has no adverts and no tracking, and nothing about you is sold or shared for marketing. It keeps only what it needs to work: your account, your saved routes and your practice bookings.'],
    ['Your account', 'When you create an account the app stores your name, your email address and a password. Accounts are handled by Firebase Authentication, a Google service. The password is kept by Google in a protected form and the developer cannot see it. Your email is used only to log you in, to send the verification link and to reset your password.'],
    ['Saved routes and bookings', 'If your email is verified, your saved routes and practice bookings are also kept in Google Cloud Firestore under your own account, so they appear on any phone where you log in. Only you can read them. Practice bookings contain the stations, the time, the number of passengers and the fare. No payment details are ever collected, because no money is taken in this app.'],
    ['Your location', 'The app asks for your location only when you tap Nearest station or the locate button on the map. Your position is used on the phone to find the closest stations and to show a dot on the map. It is not stored and it is not sent to the developer or to any server.'],
    ['Address search and street map', 'When you search for an address or landmark, the words you type are sent to the OpenStreetMap Nominatim search service to find the place. The street map pictures are downloaded from OpenStreetMap. Like any website, these services can see your internet address when the app contacts them. They are not told who you are.'],
    ['Notifications', 'Arrival alerts and reminders are created on your phone. The app does not use a push notification server and does not collect a notification ID for your phone.'],
    ['What stays only on your phone', 'Your profile photo, the city and language you chose, recent searches, the dark mode setting and reminder settings stay on the phone and are removed when you uninstall the app.'],
    ['Deleting your data', 'Open Account and tap Delete my account. This removes your account from Firebase and deletes your saved routes and bookings from Firestore. You can also ask for deletion through the contact below.'],
    ['Children', 'The app is a travel guide for general use and is not aimed at children under 13. It does not knowingly collect information from them.'],
    ['Changes', 'If this policy changes, the new version is shown here and in the app listing, with a new date.']
  ];
  function renderPrivacy() {
    var d = CFG.developer;
    $view.className = '';
    $view.innerHTML = backBtn() + head(T('Privacy policy'), esc(T('Last updated {0}', trDate('12 Nov 2026')))) + PRIVACY.map(function (p) { return info(p[0], p[1]); }).join('') +
      '<div class="card"><b>' + T('Contact') + '</b><p class="hint" style="margin-top:2px">' + esc(T('MetroYatri is made by {0}, an independent developer in India.', d.name)) + ' ' +
      (d.contactEmail ? esc(T('Write to {0}.', d.contactEmail)) : T('For questions or a deletion request, open an issue on the project page:')) + '</p>' +
      (d.contactEmail ? '<div class="btns one"><a class="btn alt" href="mailto:' + esc(d.contactEmail) + '">' + esc(d.contactEmail) + '</a></div>' : '<div class="btns one"><a class="btn alt" target="_blank" rel="noopener" href="' + esc(d.repo) + '/issues">' + T('Open the project page') + '</a></div>') + '</div>';
  }
  function citySheet() {
    openSheet(sheetHead(T('Choose your city')) + '</header><div class="body"><div class="list">' + Object.keys(CITIES).map(function (id) {
      var c = CITIES[id];
      return item('data-act="set-city" data-id="' + id + '"', esc(T(c.name)), esc(T('{0}, {1} stations on {2} lines', T(c.system), NET[id].meta.stations, c.groups.length)), '', id === C.id ? '<span class="tag live">' + T('Selected') + '</span>' : '<span class="chev">›</span>');
    }).join('') + '</div><p class="hint" style="padding:12px 4px 0">' + T('Stations, fares, map and ticket links all follow the city you choose.') + '</p></div>');
  }
  function langSheet() {
    openSheet(sheetHead('Language / भाषा') + '</header><div class="body"><div class="list">' + [['en', 'English', 'English'], ['hi', 'हिन्दी', 'Hindi']].map(function (l) {
      return item('data-act="set-lang" data-l="' + l[0] + '"', l[1], l[2], '', I18N.lang === l[0] ? '<span class="tag live">' + T('Selected') + '</span>' : '<span class="chev">›</span>');
    }).join('') + '</div></div>');
  }
  var TABS = { plan: 'Plan', map: 'Map', stations: 'Stations', tickets: 'Tickets', more: 'Account' };
  function tabsText() { Array.prototype.forEach.call(document.querySelectorAll('#tabs a'), function (a) { a.querySelector('span').textContent = T(TABS[a.getAttribute('data-tab')]); }); }

  /* ---------- router ---------- */
  var PAGES = {
    plan: ['plan', renderPlan], book: ['plan', renderBook], cost: ['plan', renderCost], journey: ['plan', renderJourney], map: ['map', renderMap], stations: ['stations', renderStations],
    station: ['stations', function (p) { renderStation(p[1]); }], tickets: ['tickets', renderTickets], ticket: ['tickets', function (p) { renderTicket(p[1]); }],
    more: ['more', renderMore], login: ['more', renderLogin], verify: ['more', renderVerify], profile: ['more', renderProfile], saved: ['more', renderSaved], alerts: ['more', renderAlerts], privacy: ['more', renderPrivacy],
    developer: ['more', renderDeveloper], fares: ['more', renderFares], places: ['more', renderPlaces], help: ['more', renderHelp], about: ['more', renderAbout]
  };
  var ROOT = { plan: 1, map: 1, stations: 1, tickets: 1, more: 1 };
  var lastPage = null, lastDepth = 0, navKind = null;
  function route(quiet) {
    closeSheet(); closePhoto(true);
    var parts = (location.hash || '#/plan').slice(2).split('/'), pg = PAGES[parts[0]] ? parts[0] : 'plan';
    if (map) { map.destroy(); map = null; }
    PAGES[pg][1](parts);
    Array.prototype.forEach.call(document.querySelectorAll('#tabs a'), function (a) { a.classList.toggle('on', a.getAttribute('data-tab') === PAGES[pg][0]); });
    // slide new screens in; going back slides the other way; switching tabs fades up
    var key = parts.join('/'), depth = ROOT[pg] ? 0 : 1;
    if (!quiet && key !== lastPage) {
      var cls = navKind === 'tab' || (depth === 0 && lastDepth === 0) ? 'enter-tab' : depth < lastDepth || navKind === 'back' ? 'enter-back' : 'enter';
      $view.classList.add(cls);
      $view.addEventListener('animationend', function done() { $view.classList.remove('enter', 'enter-back', 'enter-tab'); $view.removeEventListener('animationend', done); });
    }
    lastPage = key; lastDepth = depth; navKind = null;
  }
  function rerender() { var y = $view.scrollTop; route(true); $view.scrollTop = y; }
  function setEnd(which, id, place) {
    state[which] = id; state.place[which] = place || null; remember(id); state.open = {}; state.fresh = true;
    var other = which === 'from' ? 'to' : 'from';
    if (state[other] === id) { state[other] = null; state.place[other] = null; }
    if (state.from && state.to) {
      var j = store.get('journeys.' + C.id, []).filter(function (x) { return !(x[0] === state.from && x[1] === state.to); });
      j.unshift([state.from, state.to]); store.set('journeys.' + C.id, j.slice(0, 5));
    }
  }
  function toPlan() { closeSheet(); if ((location.hash || '#/plan') === '#/plan') rerender(); else go('#/plan'); }
  function setFavs(list) { store.set('favs', list.slice(0, 30)); Sync.soon(); }

  var themeT = null;
  function flip(b, on, label) { var k = b && b.querySelector('.switch'); if (!k) return rerender(); k.classList.toggle('on', on); var sm = b.querySelector('small'); if (sm && label) sm.textContent = label; }

  /* ---------- actions ---------- */
  var ACT = {
    back: function () { navKind = 'back'; if (history.length > 1) history.back(); else go('#/plan'); },
    'close-sheet': function () { slideSheetAway(); if (map) map.pick(null); if (notifCb) { var cb = notifCb; notifCb = null; cb(false); } },
    'close-sheet-nav': function () { closeSheet(); },
    city: function () { citySheet(); },
    'set-city': function (b) { var id = b.getAttribute('data-id'); if (id !== C.id) { switchCity(id); toast(T('Now showing {0}', T(C.system))); } closeSheet(); rerender(); },
    lang: function () { langSheet(); },
    'set-lang': function (b) {
      I18N.set(b.getAttribute('data-l')); sortIds(); tabsText(); closeSheet(); rerender(); toast(T('Language changed'));
      if (reminder().on) scheduleReminder();
      var j = journey(); if (j) jSchedule(j);
    },
    pick: function (b) { var w = b.getAttribute('data-which'); openPicker(T(w === 'from' ? 'Starting point' : 'Destination'), function (id, place) { setEnd(w, id, place); rerender(); }); },
    swap: function () { var a = state.from, p = state.place.from; state.from = state.to; state.to = a; state.place.from = state.place.to; state.place.to = p; state.open = {}; rerender(); },
    'clear-plan': function () { state.from = state.to = state.route = state.mapRoute = null; state.place = { from: null, to: null }; state.open = {}; state.mode = 'fast'; $view.scrollTop = 0; route(); },
    mode: function (b) { state.mode = b.getAttribute('data-mode'); state.open = {}; state.fresh = true; rerender(); },
    day: function (b) { state.day = b.getAttribute('data-day'); rerender(); },
    premium: function () { state.premium = !state.premium; state.open = {}; rerender(); },
    'toggle-leg': function (b) { var k = b.getAttribute('data-key'); state.open[k] = !state.open[k]; rerender(); },
    'show-map': function () { state.mapRoute = state.route; go('#/map'); },
    'clear-route': function () { state.mapRoute = null; rerender(); },
    book: function () { book.pax = 1; go('#/book'); },
    fav: function () {
      var r = state.route, f = favs(), n = f.filter(function (x) { return !(x[0] === C.id && x[1] === r.from && x[2] === r.to); });
      if (n.length === f.length) { n.unshift([C.id, r.from, r.to]); toast(T('Route saved')); } else { Sync.forget('f', [C.id, r.from, r.to].join('|')); toast(T('Removed from saved routes')); }
      setFavs(n); rerender();
    },
    'use-route': function (b) { setEnd('from', b.getAttribute('data-from')); setEnd('to', b.getAttribute('data-to')); rerender(); },
    'use-saved': function (b) { var c = b.getAttribute('data-city'); if (c !== C.id) switchCity(c); setEnd('from', b.getAttribute('data-from')); setEnd('to', b.getAttribute('data-to')); go('#/plan'); },
    'del-saved': function (b) {
      var c = b.getAttribute('data-city'), a = b.getAttribute('data-from'), t = b.getAttribute('data-to');
      Sync.forget('f', [c, a, t].join('|'));
      setFavs(favs().filter(function (x) { return !(x[0] === c && x[1] === a && x[2] === t); })); toast(T('Removed from saved routes')); rerender();
    },
    share: function () { shareSheet(); },
    'share-text': function () {
      closeSheet();
      Native.shareText(shareText(state.route)).then(function (r) { if (r === 'copied') toast(T('Route copied')); else if (r === 'failed') toast(T('Sharing is not available')); });
    },
    'share-img': function () {
      var r = state.route; closeSheet(); toast(T('Making the picture…'));
      var ready = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 40px Roboto'), document.fonts.load('400 40px Roboto'), document.fonts.load('700 40px "Noto Sans Devanagari"', 'क'), document.fonts.load('400 40px "Noto Sans Devanagari"', 'क')]).catch(function () {}) : Promise.resolve();
      ready.then(function () {
        var url; try { url = routeImage(r); } catch (e) { toast(T('Could not make the picture. Share as text instead.')); return; }
        return Native.shareImage(url, 'metroyatri-route.png', T('{0} to {1}', sn(r.from), sn(r.to)) + ', ' + T(C.system)).then(function (res) { if (res === 'saved') toast(T('Picture saved to Downloads')); });
      });
    },
    cost: function (b) { var k = b.getAttribute('data-k'), max = k === 'trips' ? 8 : 31; cost[k] = Math.max(1, Math.min(max, cost[k] + (+b.getAttribute('data-d')))); rerender(); },
    nearest: function () { nearest(function (list) { nearSheet(T('Stations near you'), '', list, true); }); },
    'near-from': function () { pickerCb = function (id, place) { setEnd('from', id, place); rerender(); }; ACT.nearest(); },
    geo: function (b) {
      var inp = document.getElementById('pq'), q = inp ? inp.value.trim() : ''; if (q.length < 3) return;
      var list = document.getElementById('plist'), cb = pickerCb;
      list.innerHTML = '<div class="empty"><b>' + esc(T('Searching for “{0}”…', q)) + '</b></div>';
      geocode(q + ', ' + C.name).then(function (res) { return res.length ? res : geocode(q); }).then(function (res) {
        if (!document.getElementById('plist')) return;
        geoResults = res.map(function (x) { var parts = String(x.display_name || '').split(', '); return { name: x.name || parts[0], rest: parts.slice(1, 4).join(', '), lat: +x.lat, lon: +x.lon }; });
        pickerCb = cb;
        list.innerHTML = geoResults.length ? '<h2 class="sec" style="margin-top:4px">' + T('Places found') + '</h2><div class="list">' + geoResults.map(function (g, i) { return item('data-act="geo-pick" data-i="' + i + '"', esc(g.name), esc(g.rest)); }).join('') + '</div><p class="hint" style="padding:12px 4px 0">' + T('Search results © OpenStreetMap contributors') + '</p>'
          : '<div class="empty"><b>' + esc(T('Nothing found for “{0}” in {1}', q, T(C.name))) + '</b>' + T('Try a nearby landmark, a road name or the area name.') + '</div>';
      }, function () { if (document.getElementById('plist')) list.innerHTML = '<div class="empty"><b>' + T('Address search needs internet') + '</b>' + T('Connect to the internet and try again, or pick a station from the list.') + '</div>'; });
    },
    'geo-pick': function (b) {
      var g = geoResults[+b.getAttribute('data-i')]; if (!g) return;
      var list = nearestTo(g.lat, g.lon, 4);
      if (list[0].km > 25) { toast(T('That place is far from the {0} network.', T(C.system))); return; }
      nearSheet(T('Stations near this place'), g.name, list);
    },
    locate: function () { locate(function (list, pos) { if (!map) return; map.showMe(pos.latitude, pos.longitude); if (list[0].km > 60) { toast(T('You are outside {0}.', T(C.name))); return; } map.focus(list[0].id); stationSheet(list[0].id); }); },
    tiles: function (b) { var on = !store.get('tiles', true); store.set('tiles', on); b.classList.toggle('on', on); if (map) map.setTiles(on); toast(T(on ? 'Street map on' : 'Street map off')); },
    zin: function () { if (map) map.zoom(1); },
    zout: function () { if (map) map.zoom(-1); },
    'map-search': function () { openPicker(T('Find a station'), function (id) { if (map) { map.focus(id); stationSheet(id); } }); },
    'map-focus': function (b) { state.mapRoute = null; state.mapFocus = b.getAttribute('data-id'); go('#/map'); },
    'set-from': function (b) { setEnd('from', b.getAttribute('data-id')); toPlan(); },
    'set-to': function (b) { setEnd('to', b.getAttribute('data-id')); toPlan(); },
    'open-line': function (b) { stFilter.q = ''; stFilter.g = b.getAttribute('data-g'); location.replace('#/stations'); route(); },
    'st-line': function (b) { stFilter.g = b.getAttribute('data-g'); document.getElementById('schips').innerHTML = stChips(); document.getElementById('slist').innerHTML = stationsList(); },
    pax: function (b) { var d = +b.getAttribute('data-d'); if (book.pax === 6 && d > 0) toast(T('Up to 6 passengers per booking')); book.pax = Math.max(1, Math.min(6, book.pax + d)); rerender(); },
    'confirm-book': function () {
      var r = state.route, f = fareNow(r), pay = (document.querySelector('input[name=pay]:checked') || {}).value || 'upi';
      var t = tickets(), id = 'MY' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100), names = r.legs.map(function (l) { return l.name; });
      t.unshift({ id: id, at: Date.now(), city: C.id, cityN: C.name, from: r.from, to: r.to, fromN: S[r.from].n, toN: S[r.to].n, pax: book.pax, fare: f, total: f * book.pax, pay: pay, lines: names, via: names.join(', then ') });
      saveTickets(t.slice(0, 50)); Sync.soon(); toast(T('Practice booking saved')); location.replace('#/ticket/' + id); route();
    },
    'ticket-route': function (b) {
      var x = tickets().filter(function (t) { return t.id === b.getAttribute('data-id'); })[0]; if (!x) return;
      var c = x.city || 'delhi'; if (c !== C.id) switchCity(c);
      if (S[x.from] && S[x.to]) { setEnd('from', x.from); setEnd('to', x.to); go('#/plan'); }
    },
    'ticket-del': function (b) { var id = b.getAttribute('data-id'); Sync.forget('t', id); saveTickets(tickets().filter(function (t) { return t.id !== id; })); Sync.soon(); toast(T('Booking deleted')); location.replace('#/tickets'); route(); },
    /* journey mode */
    'j-start': function () {
      var r = state.route; if (!r) return;
      if (!store.get('alertsOn', true)) return jStart(r);
      askNotify(function () { closeSheet(); jStart(r); }, 'To warn you one stop before you get off, even with the phone locked. MetroYatri uses notifications for two things only:');
    },
    'j-here': function (b) {
      var j = journey(); if (!j) return;
      var li = +b.getAttribute('data-l'), k = +b.getAttribute('data-k'), l = j.legs[li], shift = (Date.now() - j.start) / 60000 - l.t[k];
      for (var i = li; i < j.legs.length; i++) j.legs[i].t = j.legs[i].t.map(function (m) { return m + shift; });
      for (i = 0; i < j.legs.length; i++) { if (i < li) j.fired[i] = 1; else delete j.fired[i]; }
      store.set('journey', j); jSchedule(j); toast(T('Timing corrected. You are at {0}.', snc(j.city, l.st[k]))); rerender();
    },
    'j-end': function () { jEnd(); location.replace('#/plan'); route(); },
    /* notifications */
    'notif-yes': function () { var cb = notifCb; notifCb = null; closeSheet(); Native.notifyAsk().then(function (s) { if (cb) cb(s === 'granted'); }); },
    'notif-no': function () { var cb = notifCb; notifCb = null; closeSheet(); if (cb) cb(false); },
    'notif-ask': function () { askNotify(function () { rerender(); }); },
    'notif-test': function () { askNotify(function (ok) { if (!ok) return; Native.now(T('MetroYatri notifications are working'), T('This is how an arrival alert will look.'), 7200); Native.vibrate(); toast(T('Test notification sent')); rerender(); }); },
    'exact-open': function () { Native.exactOpen().then(function () { rerender(); }); },
    'alerts-toggle': function (b) { var on = !store.get('alertsOn', true); store.set('alertsOn', on); var j = journey(); if (j) jSchedule(j); flip(b, on); },
    'rem-days': function (b) { var m = reminder(); m.days = b.getAttribute('data-d'); store.set('remind', m); if (m.on) scheduleReminder(); rerender(); },
    'rem-toggle': function () {
      var m = reminder(), a = document.getElementById('rroute'), t = document.getElementById('rtime');
      if (a) m.route = a.value.split('|'); if (t && /^\d\d:\d\d$/.test(t.value)) m.time = t.value;
      if (m.on) { m.on = false; store.set('remind', m); scheduleReminder(); toast(T('Reminder turned off')); return rerender(); }
      askNotify(function (ok) { if (!ok) return rerender(); m.on = true; store.set('remind', m); scheduleReminder(); toast(T('Reminder turned on')); rerender(); });
    },
    'sync-now': function () { toast(T('Syncing…')); Sync.now().then(function () { var s = Sync.status(); toast(T(s && s.ok ? 'Saved routes and bookings are up to date' : 'Could not sync. See the note under Sync across phones.')); rerender(); }); },
    theme: function (b) {
      var root = document.documentElement, d = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.classList.add('theme-fade'); root.setAttribute('data-theme', d); store.set('theme', d);
      flip(b, d === 'dark', T(d === 'dark' ? 'On' : 'Off'));
      clearTimeout(themeT); themeT = setTimeout(function () { root.classList.remove('theme-fade'); }, 450);
    },
    logout: function () { Auth.logout(); loginMode = 'login'; toast(T('Logged out')); if ((location.hash || '').indexOf('#/verify') === 0) { location.replace('#/login'); route(); } else rerender(); },
    'del-account': function (b) {
      if (!b.getAttribute('data-sure')) { b.setAttribute('data-sure', '1'); b.querySelector('b').textContent = T('Tap again to delete the account and its bookings'); return; }
      Auth.remove().then(function () { toast(T('Account deleted')); rerender(); }, function (m) { toast(T(String(m))); });
    },
    'login-mode': function (b) { loginMode = b.getAttribute('data-m'); rerender(); },
    forgot: function () {
      var f = document.getElementById('authform');
      Auth.reset(f.id.value).then(function () { toast(T('Password reset email sent')); }, function (m) { document.getElementById('autherr').textContent = T(String(m)); });
    },
    'verify-check': function (b) {
      b.disabled = true;
      Auth.checkVerified().then(function (ok) {
        if (ok) { toast(T('Email verified')); var n = state.next || '#/more'; state.next = null; location.replace(n); route(); afterLogin(); }
        else { b.disabled = false; document.getElementById('verr').textContent = T('Not verified yet. Open the link in the email first, then tap again.'); }
      }, function (m) { b.disabled = false; document.getElementById('verr').textContent = T(String(m)); });
    },
    'verify-resend': function () { Auth.resend().then(function () { toast(T('Email sent again')); }, function (m) { document.getElementById('verr').textContent = T(String(m)); }); },
    'photo-zoom': function () { openPhoto(); },
    'photo-close': function () { closePhoto(); },
    'photo-remove': function () { Auth.setPhoto(null); toast(T('Photo removed')); rerender(); }
  };
  /* Touch feedback: a ripple spreads from the finger, and the action follows a moment later so the press is seen. */
  var TAP = '.btn,.item,.chip,.qtile,.linecard,.placecard,.netcard,.citybtn,.planner .row,.jst,.jbar,#tabs a,.seg button,.back,.card.profile,[data-pick]', TAP_MS = 140, tapBusy = false;
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest(TAP); if (!el || el.disabled) return;
    var r = el.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2, dot = document.createElement('span');
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.classList.add('rp-host'); dot.className = 'rp';
    dot.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    el.appendChild(dot); setTimeout(function () { dot.remove(); }, 520);
  }, { passive: true });
  function later(fn, quick) { if (quick) return fn(); if (tapBusy) return; tapBusy = true; setTimeout(function () { tapBusy = false; fn(); }, TAP_MS); }
  var QUICK = { cost: 1, pax: 1, zin: 1, zout: 1, 'photo-close': 1, 'toggle-leg': 1 };
  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-pick]');
    if (p && pickerCb) {
      e.preventDefault();
      return later(function () {
        if (!pickerCb) return;
        var cb = pickerCb, id = p.getAttribute('data-pick'), pp = pickPlace, place = null;
        if (pp && pp.by[id] !== undefined) { var w = walk(pp.by[id]); place = { name: pp.name, me: pp.me, km: w.km, min: w.min, far: w.far }; }
        pickerCb = null; pickPlace = null; closeSheet(); remember(id); cb(id, place);
      });
    }
    var b = e.target.closest('[data-act]');
    if (b && ACT[b.getAttribute('data-act')]) {
      var act = b.getAttribute('data-act'), href = b.tagName === 'A' ? b.getAttribute('href') : null;
      e.preventDefault();
      return later(function () { ACT[act](b); if (href) go(href); }, QUICK[act]);
    }
    // links to other screens inside the app
    var a = e.target.closest('a[href^="#/"]');
    if (a && !a.closest('#tabs')) { e.preventDefault(); var h = a.getAttribute('href'); later(function () { go(h); }); }
  });
  document.addEventListener('change', function (e) { if (e.target.name === 'pay') book.pay = e.target.value; });
  window.addEventListener('hashchange', function () { route(); });
  // tabs replace the current page so the phone's back button does not walk through every tab
  document.getElementById('tabs').addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    e.preventDefault(); var h = a.getAttribute('href');
    later(function () { navKind = 'tab'; location.replace(h); });
  });
  // Android back button: close sheet, go back, return to Plan, then leave the app
  function onBack() {
    var pg = page();
    if (!$sheet.hidden) ACT['close-sheet']();
    else if (document.getElementById('photoview')) closePhoto();
    else if (!ROOT[pg]) { navKind = 'back'; if (history.length > 1) history.back(); else location.replace('#/plan'); }
    else if (pg !== 'plan') location.replace('#/plan');
    else if (state.from || state.to) ACT['clear-plan']();
    else if (window.Capacitor && window.Capacitor.nativePromise) window.Capacitor.nativePromise('App', 'exitApp', {});
  }
  try { if (window.Capacitor && window.Capacitor.addListener) window.Capacitor.addListener('App', 'backButton', onBack); } catch (err) {}

  var theme = store.get('theme', null) || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  loadCity(store.get('city', 'delhi'));
  window.__app = { state: state, Auth: Auth, city: function () { return C.id; }, image: function () { return routeImage(state.route); }, tick: jTick };
  tabsText(); route(true); jWatch();
  // saved routes and bookings follow the account
  Sync.onChange(function () { if (page() === 'more' && $sheet.hidden) rerender(); });
  Sync.now().then(function (changed) { if (changed && $sheet.hidden && (page() === 'plan' && !state.route || page() === 'tickets' || page() === 'saved')) rerender(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { jTick(); Sync.soon(); } });
  // opening screen: stays for about 2 seconds, then fades into the app
  var splash = document.getElementById('splash');
  function firstAsk() { if (!store.get('notifAsked', false) && $sheet.hidden) { store.set('notifAsked', true); askNotify(function () {}); } }
  if (splash) setTimeout(function () {
    splash.classList.add('out'); $view.classList.add('enter-tab');
    setTimeout(function () { splash.remove(); $view.classList.remove('enter-tab'); setTimeout(firstAsk, 700); }, 420);
  }, 2100);
  else setTimeout(firstAsk, 700);
})();
