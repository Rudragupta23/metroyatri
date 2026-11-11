/* MetroYatri – screens and app logic */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG, CITIES = window.CITIES, NET = window.NET, Auth = window.Auth;
  var $view = document.getElementById('view'), $sheet = document.getElementById('sheet'), $toast = document.getElementById('toast');
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('my.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('my.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  /* ---------- current city ---------- */
  var C, D, S, E, IDS, GROUPS, GCOL, BYNAME, engines = {};
  function loadCity(id) {
    if (!CITIES[id] || !NET[id]) id = 'delhi';
    C = CITIES[id]; D = NET[id]; S = D.stations;
    E = engines[id] || (engines[id] = new window.Engine(D, C));
    IDS = Object.keys(S).sort(function (a, b) { return S[a].n.localeCompare(S[b].n); });
    GROUPS = C.groups; GCOL = {}; BYNAME = {};
    D.lines.forEach(function (l) { GCOL[l.g] = l.color; });
    IDS.forEach(function (i) { BYNAME[S[i].n] = i; });
    store.set('city', id);
  }
  var state = { from: null, to: null, mode: 'fast', day: 'auto', premium: false, route: null, open: {}, mapRoute: null, mapFocus: null, next: null };
  function switchCity(id) {
    loadCity(id);
    state.from = state.to = state.route = state.mapRoute = state.mapFocus = null; state.open = {}; state.premium = false;
    stFilter.q = ''; stFilter.g = '';
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var toastT;
  function toast(msg) { $toast.textContent = msg; $toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { $toast.classList.remove('on'); }, 2600); }
  function groupsOf(id) { var g = []; S[id].lines.forEach(function (l) { var x = E.lines[l].g; if (g.indexOf(x) < 0) g.push(x); }); return g; }
  function roundels(id, big) { return '<span class="rd' + (big ? ' big' : '') + '">' + groupsOf(id).map(function (g) { return '<i style="--c:' + GCOL[g] + '"></i>'; }).join('') + '</span>'; }
  function lineNames(id) { return groupsOf(id).map(function (g) { return E.groupName(g); }).join(', '); }
  function go(h) { location.hash = h; }
  function isHoliday() { return C.holidayFares && (state.day === 'holiday' || (state.day === 'auto' && new Date().getDay() === 0)); }
  function fmtDate(t) { return new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function cardFare(f) { return Math.round(f * (100 - C.card.pct) / 100); }
  function avatar(u, cls) { return u.photo ? '<img class="avatar ' + (cls || '') + '" src="' + u.photo + '" alt="">' : '<span class="avatar ' + (cls || '') + '">' + esc((u.name || '?')[0].toUpperCase()) + '</span>'; }
  var BACK = '<button class="back" data-act="back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>Back</button>';
  var SEARCH_ICON = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>';
  function head(title, sub, right) { return '<div class="head"><div><h1 class="title">' + title + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>'; }
  function item(attrs, title, small, lead, tail) {
    var tag = attrs.indexOf('href=') >= 0 ? 'a' : attrs ? 'button' : 'div';
    return '<' + tag + ' class="item" ' + attrs + '>' + (lead || '') + '<span class="grow"><b>' + title + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</span>' + (tail === undefined ? '<span class="chev">›</span>' : tail) + '</' + tag + '>';
  }

  /* saved routes and history (saved routes carry their city) */
  function favs() { return store.get('favs', []).map(function (x) { return x.length === 2 ? ['delhi', x[0], x[1]] : x; }).filter(function (x) { return NET[x[0]] && NET[x[0]].stations[x[1]] && NET[x[0]].stations[x[2]]; }); }
  function isFav(r) { return favs().some(function (x) { return x[0] === C.id && x[1] === r.from && x[2] === r.to; }); }
  function tickets() { var u = Auth.current(); return u ? store.get('tickets.' + u.key, []) : []; }
  function saveTickets(t) { var u = Auth.current(); if (u) store.set('tickets.' + u.key, t); }

  /* ---------- sheet ---------- */
  function openSheet(html, tall) {
    $sheet.innerHTML = '<div class="scrim" data-act="close-sheet"></div><div class="panel' + (tall ? ' tall' : '') + '">' + html + '</div>';
    $sheet.hidden = false;
  }
  function closeSheet() { $sheet.hidden = true; $sheet.innerHTML = ''; }

  /* ---------- station picker ---------- */
  var pickerCb = null;
  function stationRow(id, extra) {
    return '<button class="item" data-pick="' + id + '">' + roundels(id) + '<span class="grow"><b>' + esc(S[id].n) + '</b><small>' + esc(extra || lineNames(id)) + '</small></span></button>';
  }
  function matchStations(q) {
    q = q.trim().toLowerCase();
    if (!q) return IDS;
    var starts = [], has = [];
    IDS.forEach(function (id) {
      var st = S[id], names = [st.n].concat(st.a || []), best = 0;
      names.forEach(function (n) { n = n.toLowerCase(); if (n.indexOf(q) === 0 || n.split(/[\s\-,(]+/).some(function (w) { return w.indexOf(q) === 0; })) best = Math.max(best, 2); else if (n.indexOf(q) >= 0) best = Math.max(best, 1); });
      if (best === 2) starts.push(id); else if (best === 1) has.push(id);
    });
    return starts.concat(has);
  }
  function aliasHit(id, q) {
    q = q.trim().toLowerCase(); if (!q || S[id].n.toLowerCase().indexOf(q) >= 0) return null;
    var a = (S[id].a || []).filter(function (x) { return x.toLowerCase().indexOf(q) >= 0; })[0];
    return a ? 'Also known as ' + a : null;
  }
  function pickerList(q) {
    var ids = matchStations(q), html = '';
    if (!q.trim()) {
      html += '<div class="list" style="margin-bottom:10px">' + item('data-act="nearest"', 'Use my nearest station', 'Needs location permission') + '</div>';
      var rec = store.get('recent.' + C.id, []).filter(function (id) { return S[id]; });
      if (rec.length) html += '<h2 class="sec" style="margin-top:6px">Recent</h2><div class="list">' + rec.map(function (id) { return stationRow(id); }).join('') + '</div><h2 class="sec">All stations</h2>';
    }
    if (!ids.length) return html + '<div class="empty"><b>No station matches “' + esc(q) + '”</b>Check the spelling, or try an older name for the station.</div>';
    return html + '<div class="list">' + ids.slice(0, 80).map(function (id) { return stationRow(id, aliasHit(id, q)); }).join('') + '</div>' +
      (ids.length > 80 ? '<p class="hint" style="padding:10px 4px">Type a few letters to see more stations.</p>' : '');
  }
  function openPicker(title, cb) {
    pickerCb = cb;
    openSheet('<header><h3>' + esc(title) + '<button data-act="close-sheet">Cancel</button></h3><label class="search">' + SEARCH_ICON +
      '<input id="pq" type="search" placeholder="Search ' + esc(C.name) + ' stations" autocomplete="off" autocapitalize="off" spellcheck="false"></label></header><div class="body" id="plist">' + pickerList('') + '</div>', true);
    var q = document.getElementById('pq');
    q.addEventListener('input', function () { document.getElementById('plist').innerHTML = pickerList(q.value); });
    setTimeout(function () { q.focus(); }, 60);
  }
  function remember(id) { var r = store.get('recent.' + C.id, []).filter(function (x) { return x !== id; }); r.unshift(id); store.set('recent.' + C.id, r.slice(0, 6)); }
  function locate(cb) {
    if (!navigator.geolocation) { toast('Location is not available on this phone.'); return; }
    toast('Finding your location…');
    navigator.geolocation.getCurrentPosition(function (p) {
      var list = IDS.map(function (id) { return { id: id, km: window.Engine.haversine(p.coords.latitude, p.coords.longitude, S[id].lat, S[id].lon) }; }).sort(function (a, b) { return a.km - b.km; }).slice(0, 5);
      cb(list, p.coords);
    }, function () { toast('Could not get your location. Turn on location and allow access.'); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }
  function nearest(cb) { locate(function (list, pos) { if (list[0].km > 60) { toast('You seem to be far from the ' + C.system + ' network. Check the city selected.'); return; } cb(list, pos); }); }

  /* ---------- Plan ---------- */
  function compute() {
    state.route = (state.from && state.to && state.from !== state.to) ? E.plan(state.from, state.to, state.mode, { premium: state.premium }) : null;
  }
  function fareNow(r) { return isHoliday() ? r.fare.holiday : r.fare.weekday; }
  function legHtml(leg, i) {
    var mid = leg.stations.slice(1, -1), key = 'l' + i, open = state.open[key], stops = leg.stations.length - 1;
    return '<div class="leg" style="--c:' + leg.color + ';--ct:' + leg.text + '">' +
      '<div class="stop"><span class="d"></span><span class="t">' + esc(S[leg.from].n) + '</span></div>' +
      '<div class="ride"><span class="ln">' + esc(leg.name) + '</span>' + esc(leg.towards) + '<br>' + plural(stops, 'stop') + ', about ' + Math.max(1, Math.round(leg.min)) + ' min' +
      (mid.length ? '<button data-act="toggle-leg" data-key="' + key + '">' + (open ? 'Hide stops' : 'Show ' + plural(mid.length, 'stop') + ' in between') + '</button>' +
        (open ? '<ol>' + mid.map(function (id) { return '<li>' + esc(S[id].n) + '</li>'; }).join('') + '</ol>' : '') : '') +
      '</div><div class="stop"><span class="d"></span><span class="t">' + esc(S[leg.to].n) + '</span></div></div>';
  }
  function resultHtml(r) {
    var f = fareNow(r), hol = isHoliday(), notes = [];
    if (r.fare.estimate) notes.push('This route uses the ' + C.premium.name + ', which has its own higher fares. The fare shown is an estimate.');
    r.legs.forEach(function (l) { if (l.note && notes.indexOf(l.note) < 0 && (C.id !== 'delhi' || l.lines.indexOf('pinkb') >= 0)) notes.push(l.note); });
    return '<div class="card" style="margin-top:12px"><div class="fare"><div class="amt"><sup>₹</sup>' + f + '</div>' +
      '<div class="day">' + (C.holidayFares ? (hol ? 'Sunday and national holiday fare' : 'Weekday fare') + '<br>' : '') + '₹' + cardFare(f) + ' ' + esc(C.card.label) + '</div></div>' +
      '<div class="facts"><div><b>' + r.km.toFixed(1) + ' km</b>distance</div><div><b>' + r.min + ' min</b>travel time</div><div><b>' + r.stops + '</b>stations</div><div><b>' + r.changes + '</b>' + (r.changes === 1 ? 'change' : 'changes') + '</div></div>' +
      notes.map(function (n) { return '<p class="note">' + esc(n) + '</p>'; }).join('') + '</div>' +
      (C.holidayFares ? '<div class="chips"><button class="chip' + (!hol ? ' on' : '') + '" data-act="day" data-day="weekday">Weekday fare</button><button class="chip' + (hol ? ' on' : '') + '" data-act="day" data-day="holiday">Sunday or holiday fare</button></div>' : '') +
      '<div class="card strip" style="margin-top:12px">' + r.legs.map(function (l, i) {
        return (i ? '<div class="change">Change trains at ' + esc(S[l.from].n) + '</div>' : '') + legHtml(l, i);
      }).join('') + '</div>' +
      '<div class="btns"><button class="btn alt" data-act="show-map">Show on map</button><button class="btn signal" data-act="book">Book ticket</button></div>' +
      '<div class="btns three"><button class="btn alt" data-act="fav">' + (isFav(r) ? 'Unsave' : 'Save route') + '</button><button class="btn alt" data-act="share">Share</button><a class="btn alt" href="#/cost">Monthly cost</a></div>' +
      '<p class="hint" style="margin-top:12px">Fare is charged for the shortest route between the two stations, whichever route you ride. Distance and time are calculated from network data and can differ slightly from the figures at the station.</p>';
  }
  function renderPlan() {
    compute();
    var r = state.route, u = Auth.current();
    var cityBtn = '<button class="citybtn" data-act="city"><svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.500C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>' + esc(C.name) + '</button>';
    var html = head(u ? 'Namaste, ' + esc(u.name.split(' ')[0]) : 'Plan a journey', D.meta.stations + ' ' + esc(C.system) + ' stations', cityBtn) +
      '<div class="planner"><button class="row" data-act="pick" data-which="from"><span class="pin"></span><span><small>From</small><b class="' + (state.from ? '' : 'ph') + '">' + (state.from ? esc(S[state.from].n) : 'Choose starting station') + '</b></span></button>' +
      '<div class="perf"></div><button class="row" data-act="pick" data-which="to"><span class="pin to"></span><span><small>To</small><b class="' + (state.to ? '' : 'ph') + '">' + (state.to ? esc(S[state.to].n) : 'Choose destination') + '</b></span></button>' +
      '<button class="swap" data-act="swap" aria-label="Swap stations"><svg viewBox="0 0 24 24"><path d="M7 4v15m0 0-3.5-3.5M7 19l3.5-3.5M17 20V5m0 0-3.5 3.5M17 5l3.5 3.5"/></svg></button></div>';
    var clear = (state.from || state.to) ? '<button class="chip clear" data-act="clear-plan"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>Clear</button>' : '';
    if (r) {
      html += '<div class="chips">' + clear + [['fast', 'Fastest'], ['easy', 'Fewest changes'], ['short', 'Shortest distance']].map(function (m) {
        return '<button class="chip' + (state.mode === m[0] ? ' on' : '') + '" data-act="mode" data-mode="' + m[0] + '">' + m[1] + '</button>';
      }).join('') + (C.premium && !r.premiumForced ? '<button class="chip' + (state.premium ? ' on' : '') + '" data-act="premium"><i style="background:' + GCOL[C.premium.line] + '"></i>Use ' + esc(C.premium.name) + '</button>' : '') + '</div>' + resultHtml(r);
    } else {
      if (clear) html += '<div class="chips">' + clear + '</div>';
      if (state.from && state.to && state.from === state.to) html += '<p class="note">Choose two different stations.</p>';
      var fv = favs().filter(function (x) { return x[0] === C.id; });
      if (fv.length) html += '<h2 class="sec">Saved routes</h2><div class="list">' + fv.slice(0, 4).map(function (x) {
        return item('data-act="use-route" data-from="' + x[1] + '" data-to="' + x[2] + '"', esc(S[x[1]].n) + ' to ' + esc(S[x[2]].n));
      }).join('') + '</div>';
      var jr = store.get('journeys.' + C.id, []).filter(function (x) { return S[x[0]] && S[x[1]]; });
      if (jr.length) html += '<h2 class="sec">Recent journeys</h2><div class="list">' + jr.map(function (x) {
        return item('data-act="use-route" data-from="' + x[0] + '" data-to="' + x[1] + '"', esc(S[x[0]].n) + ' to ' + esc(S[x[1]].n));
      }).join('') + '</div>';
      html += '<h2 class="sec">Quick start</h2><div class="list">' +
        item('data-act="near-from"', 'Start from my nearest station', 'Finds the closest stations to you') +
        item('href="#/places"', 'Places to visit by metro', esc(C.places.slice(0, 3).map(function (p) { return p[0]; }).join(', ')) + ' and more') +
        item('href="#/fares"', 'Fare chart', '₹' + C.slabs[0][1] + ' to ₹' + C.slabs[C.slabs.length - 1][1] + (C.holidayFares ? ', lower on Sundays and holidays' : ', ' + C.card.pct + '% off with card or mobile QR')) + '</div>';
    }
    $view.className = ''; $view.innerHTML = html;
  }
  function shareText(r) {
    var t = C.system + ': ' + S[r.from].n + ' to ' + S[r.to].n + '\nFare ₹' + fareNow(r) + ', ' + r.km.toFixed(1) + ' km, about ' + r.min + ' min\n';
    r.legs.forEach(function (l, i) { t += (i + 1) + '. ' + l.name + ' ' + l.towards + ': ' + S[l.from].n + ' to ' + S[l.to].n + ' (' + plural(l.stations.length - 1, 'stop') + ')\n'; });
    return t + 'Planned with MetroYatri';
  }
  var cost = { trips: 2, days: 22 };
  function renderCost() {
    var r = state.route; if (!r) return go('#/plan');
    var f = r.fare.weekday, n = cost.trips * cost.days, full = f * n, card = cardFare(f) * n;
    $view.className = '';
    $view.innerHTML = BACK + head('Monthly cost', esc(S[r.from].n) + ' to ' + esc(S[r.to].n)) +
      '<div class="card"><div class="kv" style="align-items:center"><span>Journeys per day</span><div class="stepper"><button data-act="cost" data-k="trips" data-d="-1" aria-label="Fewer journeys">−</button><b>' + cost.trips + '</b><button data-act="cost" data-k="trips" data-d="1" aria-label="More journeys">+</button></div></div>' +
      '<div class="kv" style="align-items:center"><span>Travel days per month</span><div class="stepper"><button data-act="cost" data-k="days" data-d="-1" aria-label="Fewer days">−</button><b>' + cost.days + '</b><button data-act="cost" data-k="days" data-d="1" aria-label="More days">+</button></div></div></div>' +
      '<div class="card"><div class="kv"><span>Fare per journey</span><b>₹' + f + '</b></div><div class="kv"><span>' + n + ' journeys at full fare</span><b>₹' + full.toLocaleString('en-IN') + '</b></div>' +
      '<div class="kv"><span>' + esc(C.card.label.replace(/^with /, 'With ')) + '</span><b>₹' + card.toLocaleString('en-IN') + '</b></div>' +
      '<div class="kv total"><span>You save each month</span><b>₹' + (full - card).toLocaleString('en-IN') + '</b></div></div>' +
      '<p class="hint" style="margin-top:12px">Uses the weekday fare and the standard ' + C.card.pct + '% discount.</p>';
  }

  /* ---------- Map ---------- */
  var map = null;
  function renderMap() {
    $view.className = 'full';
    var r = state.mapRoute, tiles = store.get('tiles', true);
    $view.innerHTML = '<div class="mapwrap' + (r ? ' routed' : '') + '"><div id="mapwrap" class="mapbox"></div><div class="maptop"><button class="search" data-act="map-search" style="text-align:left">' + SEARCH_ICON + '<span style="color:var(--soft)">Find a ' + esc(C.name) + ' station</span></button></div>' +
      '<div class="legend">' + GROUPS.map(function (g) { return '<span><i style="background:' + GCOL[g] + '"></i>' + E.groupName(g).replace(' Line', '') + '</span>'; }).join('') + '</div>' +
      '<div class="zoom"><button data-act="tiles" class="' + (tiles ? 'on' : '') + '" aria-label="Street map on or off"><svg viewBox="0 0 24 24"><path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 13 9 5 9-5"/></svg></button><button data-act="locate" aria-label="Show where I am"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></button><button data-act="zin" aria-label="Zoom in">+</button><button data-act="zout" aria-label="Zoom out">−</button></div></div>' +
      (r ? '<div class="routebar"><div class="grow"><b>' + esc(S[r.from].n) + ' to ' + esc(S[r.to].n) + '</b><small>₹' + fareNow(r) + ', ' + r.km.toFixed(1) + ' km, ' + r.min + ' min, ' + plural(r.changes, 'change') + '</small></div><button data-act="clear-route">Clear</button></div>' : '');
    map = new window.MetroMap(document.getElementById('mapwrap'), D, E, { onStation: stationSheet, tiles: tiles, center: C.center ? { at: C.center, zoom: C.zoom } : null });
    if (r) map.setRoute(r);
    else if (state.mapFocus) { map.focus(state.mapFocus); state.mapFocus = null; }
  }
  function stationSheet(id) {
    if (map) map.pick(id);
    var st = S[id];
    openSheet('<header><h3><span style="display:flex;align-items:center;gap:10px">' + roundels(id, true) + esc(st.n) + '</span><button data-act="close-sheet">Close</button></h3><p class="hint">' + esc(lineNames(id)) + '</p></header>' +
      '<div class="body"><div class="btns" style="margin-top:0"><button class="btn alt" data-act="set-from" data-id="' + id + '">Start here</button><button class="btn" data-act="set-to" data-id="' + id + '">Go here</button></div>' +
      '<div class="btns one"><a class="btn alt" href="#/station/' + id + '" data-act="close-sheet-nav">Station details</a></div></div>');
  }

  /* ---------- Stations ---------- */
  var stFilter = { q: '', g: '' };
  function stationsList() {
    var q = stFilter.q, g = stFilter.g;
    if (g && !q.trim()) {
      return D.lines.filter(function (l) { return l.g === g; }).map(function (l) {
        return '<div class="linehead" style="--c:' + l.color + ';--ct:' + l.text + ';margin-top:12px">' + esc(l.name) + '<span style="margin-left:auto;font-size:14px;font-weight:600">' + l.st.length + ' stations</span></div>' +
          (l.note ? '<p class="hint" style="margin:-2px 4px 10px">' + esc(l.note) + '</p>' : '') +
          '<div class="list">' + l.st.map(function (id) {
            var others = groupsOf(id).filter(function (x) { return x !== g; });
            return item('href="#/station/' + id + '"', esc(S[id].n), others.length ? 'Change for ' + esc(others.map(function (x) { return E.groupName(x); }).join(', ')) : '', roundels(id));
          }).join('') + '</div>';
      }).join('');
    }
    var ids = matchStations(q).filter(function (id) { return !g || groupsOf(id).indexOf(g) >= 0; });
    if (!ids.length) return '<div class="empty"><b>No station found</b>Try a different spelling or an older name.</div>';
    return '<div class="list" style="margin-top:12px">' + ids.map(function (id) { return item('href="#/station/' + id + '"', esc(S[id].n), esc(aliasHit(id, q) || lineNames(id)), roundels(id)); }).join('') + '</div>';
  }
  function stChips() {
    return '<button class="chip' + (!stFilter.g ? ' on' : '') + '" data-act="st-line" data-g="">All</button>' + GROUPS.map(function (g) {
      return '<button class="chip' + (stFilter.g === g ? ' on' : '') + '" data-act="st-line" data-g="' + g + '"><i style="background:' + GCOL[g] + '"></i>' + E.groupName(g).replace(' Line', '') + '</button>';
    }).join('');
  }
  function renderStations() {
    $view.className = '';
    $view.innerHTML = head(esc(C.name) + ' stations', 'Search by name, or pick a line to see its stations in order') +
      '<label class="search">' + SEARCH_ICON + '<input id="sq" type="search" placeholder="Search ' + D.meta.stations + ' stations" value="' + esc(stFilter.q) + '" autocomplete="off" spellcheck="false"></label>' +
      '<div class="chips" id="schips">' + stChips() + '</div><div id="slist">' + stationsList() + '</div>';
    var q = document.getElementById('sq');
    q.addEventListener('input', function () { stFilter.q = q.value; document.getElementById('slist').innerHTML = stationsList(); });
  }
  var LAY = { E: 'Elevated', U: 'Underground', G: 'At ground level' };
  function renderStation(id) {
    var st = S[id]; if (!st) return go('#/stations');
    var gs = groupsOf(id);
    var html = BACK + head(esc(st.n), (gs.length > 1 ? 'Interchange station' : 'Metro station') + (st.a ? ', also known as ' + esc(st.a.join(', ')) : ''), roundels(id, true)) +
      '<div class="btns" style="margin-top:0"><button class="btn alt" data-act="set-from" data-id="' + id + '">Start here</button><button class="btn" data-act="set-to" data-id="' + id + '">Go here</button></div><h2 class="sec">Lines and next stations</h2>';
    st.lines.forEach(function (lid) {
      var l = E.lines[lid], i = l.st.indexOf(id), n = l.st.length;
      var prev = i > 0 ? l.st[i - 1] : (l.loop ? l.st[n - 1] : null), next = i < n - 1 ? l.st[i + 1] : (l.loop ? l.st[0] : null);
      html += '<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="rd"><i style="--c:' + l.color + '"></i></span><b style="font-size:17px">' + esc(l.name) + '</b></div>' +
        '<div class="kv"><span>Platform level</span><b>' + (LAY[st.lay[l.g]] || '') + '</b></div>' +
        '<div class="kv"><span>Opened</span><b>' + new Date(st.op[l.g]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + '</b></div>' +
        (prev ? '<div class="kv"><span>' + (l.loop ? 'One way round' : 'Towards ' + esc(S[l.st[0]].n)) + '</span><b><a href="#/station/' + prev + '">' + esc(S[prev].n) + '</a></b></div>' : '<div class="kv"><span>Line starts here</span><b></b></div>') +
        (next ? '<div class="kv"><span>' + (l.loop ? 'Other way round' : 'Towards ' + esc(S[l.st[n - 1]].n)) + '</span><b><a href="#/station/' + next + '">' + esc(S[next].n) + '</a></b></div>' : '<div class="kv"><span>Line ends here</span><b></b></div>') +
        (l.note ? '<p class="hint" style="margin-top:6px">' + esc(l.note) + '</p>' : '') + '</div>';
    });
    var near = C.places.filter(function (p) { return p[1] === st.n; });
    if (near.length) html += '<h2 class="sec">Get off here for</h2><div class="list">' + near.map(function (p) { return item('', esc(p[0]), '', '', ''); }).join('') + '</div>';
    html += '<div class="btns"><button class="btn alt" data-act="map-focus" data-id="' + id + '">See on map</button><a class="btn alt" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(st.n + ' metro station ' + C.name) + '">Open in Google Maps</a></div>' +
      '<p class="hint" style="margin-top:12px">' + esc(C.timings) + '</p>';
    $view.className = ''; $view.innerHTML = html; $view.scrollTop = 0;
  }

  /* ---------- Tickets ---------- */
  function officialCard() {
    var o = C.official;
    return '<div class="card" style="margin-top:12px"><b style="font-size:17px">Get a real ticket</b><p class="hint" style="margin:4px 0 2px">Only ' + esc(C.operator) + ' can issue tickets that open the metro gates. These open the official channels:</p>' +
      '<div class="btns one"><a class="btn" target="_blank" rel="noopener" href="' + o.whatsapp + '">Book on ' + esc(C.operator) + ' WhatsApp (' + o.whatsappNo + ')</a>' +
      '<a class="btn alt" target="_blank" rel="noopener" href="' + o.app + '">Get the ' + esc(o.appName) + '</a></div></div>';
  }
  function qrSvg(text) { var q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
  function renderTickets() {
    var u = Auth.current();
    $view.className = '';
    if (!u) {
      $view.innerHTML = head('Tickets') + '<div class="card"><div class="empty" style="padding:18px 4px"><b>Log in to book tickets</b>Your bookings are saved to your account.</div><a class="btn" href="#/login">Log in or create account</a></div>' + officialCard();
      return;
    }
    var t = tickets();
    $view.innerHTML = head('Tickets', 'Practice bookings made in this app') +
      (t.length ? '<div class="list">' + t.map(function (x) {
        var live = sameDay(x.at, Date.now());
        return item('href="#/ticket/' + x.id + '"', esc(x.fromN) + ' to ' + esc(x.toN), (x.cityN ? esc(x.cityN) + ', ' : '') + fmtDate(x.at) + ', ' + plural(x.pax, 'passenger') + ', ₹' + x.total, '', '<span class="tag' + (live ? ' live' : '') + '">' + (live ? 'Today' : 'Past') + '</span>');
      }).join('') + '</div>' : '<div class="card"><div class="empty" style="padding:18px 4px"><b>No bookings yet</b>Plan a journey, then tap Book ticket.</div><a class="btn" href="#/plan">Plan a journey</a></div>') + officialCard();
  }
  var book = { pax: 1, pay: 'upi' };
  function renderBook() {
    var r = state.route, u = Auth.current();
    if (!r) return go('#/plan');
    if (!u) { state.next = '#/book'; return location.replace('#/login'); }
    if (Auth.cloud && !u.verified) { state.next = '#/book'; return location.replace('#/verify'); }
    var f = fareNow(r);
    $view.className = '';
    $view.innerHTML = BACK + head('Book ticket', 'Single journey, valid today') +
      '<p class="note" style="margin:0 0 12px">Practice booking. No money is taken and this ticket will not open metro gates. For a real ticket use the official ' + esc(C.operator) + ' options below.</p>' +
      '<div class="card"><div class="kv"><span>From</span><b>' + esc(S[r.from].n) + '</b></div><div class="kv"><span>To</span><b>' + esc(S[r.to].n) + '</b></div>' +
      '<div class="kv"><span>Journey</span><b>' + r.km.toFixed(1) + ' km, ' + plural(r.changes, 'change') + '</b></div>' +
      '<div class="kv" style="align-items:center"><span>Passengers</span><div class="stepper"><button data-act="pax" data-d="-1" aria-label="Fewer passengers">−</button><b>' + book.pax + '</b><button data-act="pax" data-d="1" aria-label="More passengers">+</button></div></div>' +
      '<div class="kv"><span>Fare per passenger</span><b>₹' + f + (isHoliday() ? ' (holiday fare)' : '') + '</b></div><div class="kv total"><span>Total</span><b>₹' + f * book.pax + '</b></div></div>' +
      '<h2 class="sec">Pay with</h2><div class="card">' + [['upi', 'UPI'], ['card', 'Debit or credit card'], ['wallet', 'Wallet']].map(function (p) {
        return '<label class="radio"><input type="radio" name="pay" value="' + p[0] + '"' + (book.pay === p[0] ? ' checked' : '') + '><span>' + p[1] + ' <small style="color:var(--soft)">(practice, nothing is charged)</small></span></label>';
      }).join('') + '</div><div class="btns one"><button class="btn signal" data-act="confirm-book">Confirm practice booking of ₹' + f * book.pax + '</button></div>' + officialCard();
  }
  function renderTicket(id) {
    var x = tickets().filter(function (t) { return t.id === id; })[0];
    if (!x) return go('#/tickets');
    var live = sameDay(x.at, Date.now());
    $view.className = '';
    $view.innerHTML = BACK + '<div class="ticket"><div class="demo"><p>Practice ticket. Not valid for travel.</p></div><div class="top"><div class="od"><div><small>From</small><b>' + esc(x.fromN) + '</b></div><span class="arrow">›</span><div><small>To</small><b>' + esc(x.toN) + '</b></div></div></div>' +
      '<div class="tear"></div><div class="qr"><div class="code">' + qrSvg('MetroYatri practice ticket - NOT VALID FOR TRAVEL | ' + x.id + ' | ' + x.fromN + ' > ' + x.toN + ' | ' + x.pax + ' pax') + '</div><span class="stamp">DEMO</span></div>' +
      '<div class="meta"><div class="kv"><span>Booking number</span><b>' + x.id + '</b></div>' + (x.cityN ? '<div class="kv"><span>City</span><b>' + esc(x.cityN) + '</b></div>' : '') + '<div class="kv"><span>Booked</span><b>' + fmtDate(x.at) + '</b></div><div class="kv"><span>Passengers</span><b>' + x.pax + '</b></div>' +
      '<div class="kv"><span>Route</span><b>' + esc(x.via) + '</b></div><div class="kv"><span>Paid with</span><b>' + { upi: 'UPI', card: 'Card', wallet: 'Wallet' }[x.pay] + ' (practice)</b></div><div class="kv total"><span>Total</span><b>₹' + x.total + '</b></div>' +
      '<div style="margin-top:8px"><span class="tag' + (live ? ' live' : '') + '">' + (live ? 'Booked today' : 'Past booking') + '</span></div></div></div>' +
      '<div class="btns"><button class="btn alt" data-act="ticket-route" data-id="' + x.id + '">See route</button><button class="btn danger" data-act="ticket-del" data-id="' + x.id + '">Delete</button></div>' + officialCard();
    $view.scrollTop = 0;
  }

  /* ---------- Account ---------- */
  function renderMore() {
    var u = Auth.current(), dark = document.documentElement.getAttribute('data-theme') === 'dark', fv = favs();
    $view.className = '';
    $view.innerHTML = head('Account') +
      (u ? '<a class="card profile" href="#/profile">' + avatar(u) + '<div class="grow" style="min-width:0"><b style="font-size:19px;display:block">' + esc(u.name) + '</b><span class="hint">' + esc(u.email) + '</span><br>' +
          (u.mode === 'cloud' ? (u.verified ? '<span class="tag live">Email verified</span>' : '<span class="tag warn">Email not verified</span>') : '<span class="tag">Saved on this phone</span>') + '</div><span class="chev">›</span></a>' +
          (u.mode === 'cloud' && !u.verified ? '<div class="btns one"><a class="btn signal" href="#/verify">Verify your email</a></div>' : '')
         : '<div class="card"><b style="font-size:18px">You are not logged in</b><p class="hint" style="margin:2px 0 10px">Log in to book tickets and keep your booking history.</p><a class="btn" href="#/login">Log in or create account</a></div>') +
      '<h2 class="sec">Your travel</h2><div class="list">' +
      item('data-act="city"', 'City', esc(C.name) + ', ' + esc(C.system)) +
      item('href="#/saved"', 'Saved routes', fv.length ? plural(fv.length, 'route') + ' saved' : 'Nothing saved yet') +
      item('href="#/tickets"', 'My bookings', u ? plural(tickets().length, 'practice booking') : 'Log in to see bookings') + '</div>' +
      '<h2 class="sec">Travel information</h2><div class="list">' +
      item('href="#/fares"', 'Fare chart', 'Fares by distance and discounts') +
      item('href="#/places"', 'Places to visit by metro', 'Nearest station for popular places') +
      item('href="#/help"', 'Timings, helplines and real tickets', esc(C.helplines[0][0])) + '</div>' +
      '<h2 class="sec">App</h2><div class="list">' +
      item('data-act="theme"', 'Dark mode', dark ? 'On' : 'Off') +
      item('href="#/about"', 'About this app and its data', 'Network checked on ' + esc(C.checked)) +
      item('href="#/developer"', 'About the developer', esc(CFG.developer.name)) +
      (u ? item('data-act="logout"', 'Log out', '', '', '') + '<button class="item" data-act="del-account"><span class="grow"><b style="color:#C62828">Delete my account</b></span></button>' : '') + '</div>' +
      '<p class="legal">MetroYatri is an independent guide made by ' + esc(CFG.developer.name) + '. It is not made by, linked to or approved by DMRC or CMRL.</p>';
  }
  function renderProfile() {
    var u = Auth.current(); if (!u) return location.replace('#/login');
    $view.className = '';
    $view.innerHTML = BACK + head('Your profile') +
      '<div class="card" style="text-align:center;padding:22px 16px">' + avatar(u, 'xl') +
      '<div class="btns' + (u.photo ? '' : ' one') + '" style="margin-top:16px"><label class="btn alt">' + (u.photo ? 'Change photo' : 'Add a profile photo') + '<input type="file" id="photo" accept="image/*" hidden></label>' + (u.photo ? '<button class="btn alt" data-act="photo-remove">Remove photo</button>' : '') + '</div></div>' +
      '<form id="nameform" novalidate><label class="field"><span>Your name</span><input name="name" maxlength="40" value="' + esc(u.name) + '" autocomplete="name"></label>' +
      '<p class="err" id="nameerr"></p><button class="btn" type="submit">Save name</button></form>' +
      '<div class="card" style="margin-top:16px"><div class="kv"><span>' + (u.email.indexOf('@') > 0 ? 'Email' : 'Mobile') + '</span><b>' + esc(u.email) + '</b></div><div class="kv"><span>Account</span><b>' + (u.mode === 'cloud' ? (u.verified ? 'Email verified' : 'Email not verified') : 'Saved on this phone') + '</b></div></div>' +
      '<p class="hint" style="margin-top:10px">Your photo stays on this phone. It is not uploaded anywhere.</p>';
    document.getElementById('photo').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var n = 256, c = document.createElement('canvas'), s = Math.min(img.width, img.height);
          c.width = c.height = n;
          c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, n, n);
          Auth.setPhoto(c.toDataURL('image/jpeg', 0.85)); toast('Profile photo updated'); rerender();
        };
        img.onerror = function () { toast('That file is not a picture this phone can read.'); };
        img.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
    document.getElementById('nameform').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = e.target.name.value.trim();
      if (v.length < 2) { document.getElementById('nameerr').textContent = 'Enter a name with at least 2 letters.'; return; }
      Auth.setName(v); toast('Name saved'); rerender();
    });
  }
  function renderSaved() {
    var fv = favs(); $view.className = '';
    var html = BACK + head('Saved routes', 'Tap a route to plan it again');
    if (!fv.length) html += '<div class="card"><div class="empty" style="padding:18px 4px"><b>No saved routes yet</b>Plan a journey and tap Save route.</div><a class="btn" href="#/plan">Plan a journey</a></div>';
    Object.keys(CITIES).forEach(function (cid) {
      var list = fv.filter(function (x) { return x[0] === cid; }); if (!list.length) return;
      var st = NET[cid].stations;
      html += '<h2 class="sec">' + esc(CITIES[cid].name) + '</h2><div class="list">' + list.map(function (x) {
        return '<div class="item"><button class="grow open" data-act="use-saved" data-city="' + cid + '" data-from="' + x[1] + '" data-to="' + x[2] + '"><b>' + esc(st[x[1]].n) + ' to ' + esc(st[x[2]].n) + '</b></button><button class="x" data-act="del-saved" data-city="' + cid + '" data-from="' + x[1] + '" data-to="' + x[2] + '" aria-label="Remove saved route"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
      }).join('') + '</div>';
    });
    $view.innerHTML = html;
  }
  function renderDeveloper() {
    var d = CFG.developer; $view.className = '';
    $view.innerHTML = BACK + head('Developer') +
      '<div class="card" style="text-align:center;padding:24px 16px"><span class="avatar xl">' + esc(d.name.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2)) + '</span>' +
      '<b style="display:block;font-size:22px;margin-top:12px">' + esc(d.name) + '</b><span class="hint" style="font-size:15px">' + esc(d.role) + '</span></div>' +
      '<div class="card"><b>About me</b><p class="hint" style="margin-top:4px;font-size:15px;color:var(--ink)">' + esc(d.about) + '</p></div>' +
      '<h2 class="sec">Find me online</h2><div class="list">' + d.links.map(function (l) { return item('target="_blank" rel="noopener" href="' + esc(l[1]) + '"', esc(l[0]), esc(l[1].replace(/^https?:\/\/(www\.)?/, ''))); }).join('') + '</div>' +
      '<p class="legal">MetroYatri version 1.1, designed and developed by ' + esc(d.name) + '.</p>';
  }
  var loginMode = 'login';
  function renderLogin() {
    $view.className = '';
    var up = loginMode === 'signup', cloud = Auth.cloud;
    $view.innerHTML = BACK + head(up ? 'Create account' : 'Log in', cloud ? (up ? 'We will email you a link to verify the address' : 'Use the email you signed up with') : 'Your account is stored only on this phone') +
      '<div class="seg"><button class="' + (!up ? 'on' : '') + '" data-act="login-mode" data-m="login">Log in</button><button class="' + (up ? 'on' : '') + '" data-act="login-mode" data-m="signup">Create account</button></div>' +
      '<form id="authform" novalidate>' + (up ? '<label class="field"><span>Your name</span><input name="name" autocomplete="name" maxlength="40"></label>' : '') +
      '<label class="field"><span>' + (cloud ? 'Email address' : 'Email or mobile number') + '</span><input name="id" autocomplete="username" inputmode="email" autocapitalize="off" maxlength="60"></label>' +
      '<label class="field"><span>Password</span><input name="pw" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" maxlength="60"></label>' +
      '<p class="err" id="autherr"></p><button class="btn" type="submit">' + (up ? 'Create account' : 'Log in') + '</button>' +
      (cloud && !up ? '<div class="btns one"><button class="btn alt" type="button" data-act="forgot">Forgot password</button></div>' : '') + '</form>' +
      '<p class="legal">' + (cloud ? 'This is a MetroYatri account, not your DMRC or CMRL account. Only people who can open the email inbox can use the account.'
        : 'This is not your DMRC or CMRL account. Accounts on this phone are not verified, so do not reuse a password from another service.') + '</p>';
    document.getElementById('authform').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('button[type=submit]'), err = document.getElementById('autherr');
      btn.disabled = true; err.textContent = '';
      (up ? Auth.signup(f.name.value, f.id.value, f.pw.value) : Auth.login(f.id.value, f.pw.value)).then(function (u) {
        loginMode = 'login';
        if (Auth.cloud && !u.verified) { toast(up ? 'Verification email sent' : 'Verify your email to continue'); location.replace('#/verify'); return route(); }
        toast('Logged in as ' + u.name); var n = state.next || '#/more'; state.next = null; location.replace(n); route();
      }, function (msg) { btn.disabled = false; err.textContent = String(msg); });
    });
  }
  function renderVerify() {
    var u = Auth.current(); if (!u) return location.replace('#/login');
    if (!Auth.cloud || u.verified) return location.replace(state.next || '#/more');
    $view.className = '';
    $view.innerHTML = BACK + head('Verify your email', 'One step left before you can book') +
      '<div class="card"><p style="font-size:16px">We sent a link to <b>' + esc(u.email) + '</b>.</p><ol class="steps"><li>Open the verification email. Check the spam folder too.</li><li>Tap the link in it.</li><li>Come back here and tap the button below.</li></ol>' +
      '<p class="err" id="verr"></p><button class="btn signal" data-act="verify-check">I have opened the link</button>' +
      '<div class="btns"><button class="btn alt" data-act="verify-resend">Send the email again</button><button class="btn alt" data-act="logout">Use another email</button></div></div>';
  }
  function renderFares() {
    var lo = 0; $view.className = '';
    $view.innerHTML = BACK + head(esc(C.name) + ' fare chart', 'In force since ' + esc(C.fareSince)) + '<div class="card"><table class="slab"><tr><th>Distance</th><th>' + (C.holidayFares ? 'Mon to Sat' : 'Fare') + '</th>' + (C.holidayFares ? '<th>Sunday, holiday</th>' : '<th>' + C.card.pct + '% off</th>') + '</tr>' +
      C.slabs.map(function (s) { var row = '<tr><td>' + (s[0] === Infinity ? 'Over ' + lo + ' km' : lo + ' to ' + s[0] + ' km') + '</td><td>₹' + s[1] + '</td><td>₹' + (C.holidayFares ? s[2] : cardFare(s[1])) + '</td></tr>'; lo = s[0]; return row; }).join('') + '</table></div>' +
      C.fareNotes.map(function (n) { return '<div class="card"><b>' + esc(n[0]) + '</b><p class="hint" style="margin-top:2px">' + esc(n[1]) + '</p></div>'; }).join('') +
      '<div class="card"><b>How fare is worked out</b><p class="hint" style="margin-top:2px">Fare depends on the shortest distance between your two stations. Near the edge of a distance band the app can be one band out, so treat the fare as a close guide and confirm at the station or in the official ' + esc(C.operator) + ' app.</p></div>';
  }
  function renderPlaces() {
    $view.className = '';
    $view.innerHTML = BACK + head('Places in ' + esc(C.name), 'Tap a place to plan a journey to its nearest station') + '<div class="list">' +
      C.places.map(function (p) { var id = BYNAME[p[1]]; return item('data-act="set-to" data-id="' + id + '"', esc(p[0]), esc(p[1]) + ' station', roundels(id)); }).join('') + '</div>';
  }
  function renderHelp() {
    $view.className = '';
    $view.innerHTML = BACK + head(esc(C.system) + ' help') +
      '<div class="card"><b>Train timings</b><p class="hint" style="margin-top:2px">' + esc(C.timings) + '</p></div>' +
      '<h2 class="sec">Helplines</h2><div class="list">' + C.helplines.map(function (h) { return item('href="tel:' + h[1] + '"', esc(h[0]), h[1]); }).join('') + '</div>' + officialCard() +
      '<div class="btns one"><a class="btn alt" target="_blank" rel="noopener" href="' + C.official.site + '">Open the ' + esc(C.operator) + ' website</a></div>';
  }
  function renderAbout() {
    $view.className = '';
    $view.innerHTML = BACK + head('About', 'MetroYatri 1.1, ' + esc(C.name)) +
      C.about.map(function (a) { return '<div class="card"><b>' + esc(a[0]) + '</b><p class="hint" style="margin-top:2px">' + esc(a[1]) + '</p></div>'; }).join('') +
      '<div class="card"><b>Tickets</b><p class="hint" style="margin-top:2px">Bookings inside this app are for practice only and are clearly marked. Real tickets are sold only through official channels, which the app links to.</p></div>' +
      '<div class="card"><b>Street map</b><p class="hint" style="margin-top:2px">The map behind the lines needs internet. Map data © OpenStreetMap contributors, map tiles © CARTO. Without internet the lines are shown on a plain background.</p></div>' +
      '<div class="list" style="margin-top:10px">' + item('href="#/developer"', 'About the developer', esc(CFG.developer.name)) + '</div>' +
      '<p class="legal">Independent app. Not made by, linked to or approved by DMRC or CMRL. Uses the Mukta typeface (SIL Open Font License), Leaflet (BSD) and qrcode-generator (MIT).</p>';
  }
  function citySheet() {
    openSheet('<header><h3>Choose your city<button data-act="close-sheet">Cancel</button></h3></header><div class="body"><div class="list">' + Object.keys(CITIES).map(function (id) {
      var c = CITIES[id];
      return item('data-act="set-city" data-id="' + id + '"', esc(c.name), esc(c.system) + ', ' + NET[id].meta.stations + ' stations on ' + c.groups.length + ' lines', '', id === C.id ? '<span class="tag live">Selected</span>' : '<span class="chev">›</span>');
    }).join('') + '</div><p class="hint" style="padding:12px 4px 0">Stations, fares, map and ticket links all follow the city you choose.</p></div>');
  }

  /* ---------- router ---------- */
  var PAGES = {
    plan: ['plan', renderPlan], book: ['plan', renderBook], cost: ['plan', renderCost], map: ['map', renderMap], stations: ['stations', renderStations],
    station: ['stations', function (p) { renderStation(p[1]); }], tickets: ['tickets', renderTickets], ticket: ['tickets', function (p) { renderTicket(p[1]); }],
    more: ['more', renderMore], login: ['more', renderLogin], verify: ['more', renderVerify], profile: ['more', renderProfile], saved: ['more', renderSaved],
    developer: ['more', renderDeveloper], fares: ['more', renderFares], places: ['more', renderPlaces], help: ['more', renderHelp], about: ['more', renderAbout]
  };
  function route() {
    closeSheet();
    var parts = (location.hash || '#/plan').slice(2).split('/'), page = PAGES[parts[0]] ? parts[0] : 'plan';
    if (map) { map.destroy(); map = null; }
    PAGES[page][1](parts);
    Array.prototype.forEach.call(document.querySelectorAll('#tabs a'), function (a) { a.classList.toggle('on', a.getAttribute('data-tab') === PAGES[page][0]); });
  }
  function rerender() { var y = $view.scrollTop; route(); $view.scrollTop = y; }
  function setEnd(which, id) {
    state[which] = id; remember(id); state.open = {};
    if (which === 'from' && state.to === id) state.to = null;
    if (which === 'to' && state.from === id) state.from = null;
    if (state.from && state.to) {
      var j = store.get('journeys.' + C.id, []).filter(function (x) { return !(x[0] === state.from && x[1] === state.to); });
      j.unshift([state.from, state.to]); store.set('journeys.' + C.id, j.slice(0, 5));
    }
  }
  function toPlan() { closeSheet(); if ((location.hash || '#/plan') === '#/plan') rerender(); else go('#/plan'); }

  /* ---------- actions ---------- */
  var ACT = {
    back: function () { if (history.length > 1) history.back(); else go('#/plan'); },
    'close-sheet': function () { closeSheet(); if (map) map.pick(null); },
    'close-sheet-nav': function () { closeSheet(); },
    city: function () { citySheet(); },
    'set-city': function (b) { var id = b.getAttribute('data-id'); if (id !== C.id) { switchCity(id); toast('Now showing ' + C.system); } closeSheet(); rerender(); },
    pick: function (b) { var w = b.getAttribute('data-which'); openPicker(w === 'from' ? 'Starting station' : 'Destination', function (id) { setEnd(w, id); rerender(); }); },
    swap: function () { var a = state.from; state.from = state.to; state.to = a; state.open = {}; rerender(); },
    'clear-plan': function () { state.from = state.to = state.route = state.mapRoute = null; state.open = {}; state.mode = 'fast'; $view.scrollTop = 0; route(); },
    mode: function (b) { state.mode = b.getAttribute('data-mode'); state.open = {}; rerender(); },
    day: function (b) { state.day = b.getAttribute('data-day'); rerender(); },
    premium: function () { state.premium = !state.premium; state.open = {}; rerender(); },
    'toggle-leg': function (b) { var k = b.getAttribute('data-key'); state.open[k] = !state.open[k]; rerender(); },
    'show-map': function () { state.mapRoute = state.route; go('#/map'); },
    'clear-route': function () { state.mapRoute = null; rerender(); },
    book: function () { book.pax = 1; go('#/book'); },
    fav: function () {
      var r = state.route, f = favs(), n = f.filter(function (x) { return !(x[0] === C.id && x[1] === r.from && x[2] === r.to); });
      if (n.length === f.length) { n.unshift([C.id, r.from, r.to]); toast('Route saved'); } else toast('Removed from saved routes');
      store.set('favs', n.slice(0, 30)); rerender();
    },
    'use-route': function (b) { setEnd('from', b.getAttribute('data-from')); setEnd('to', b.getAttribute('data-to')); rerender(); },
    'use-saved': function (b) { var c = b.getAttribute('data-city'); if (c !== C.id) switchCity(c); setEnd('from', b.getAttribute('data-from')); setEnd('to', b.getAttribute('data-to')); go('#/plan'); },
    'del-saved': function (b) {
      var c = b.getAttribute('data-city'), a = b.getAttribute('data-from'), t = b.getAttribute('data-to');
      store.set('favs', favs().filter(function (x) { return !(x[0] === c && x[1] === a && x[2] === t); })); toast('Removed from saved routes'); rerender();
    },
    share: function () {
      var t = shareText(state.route);
      if (navigator.share) navigator.share({ text: t }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('Route copied'); }, function () { toast('Could not share'); });
      else toast('Sharing is not available');
    },
    cost: function (b) { var k = b.getAttribute('data-k'), max = k === 'trips' ? 8 : 31; cost[k] = Math.max(1, Math.min(max, cost[k] + (+b.getAttribute('data-d')))); rerender(); },
    nearest: function () {
      var cb = pickerCb;
      nearest(function (list) {
        openSheet('<header><h3>Stations near you<button data-act="close-sheet">Cancel</button></h3></header><div class="body"><div class="list">' + list.map(function (x) { return stationRow(x.id, x.km.toFixed(1) + ' km away, ' + lineNames(x.id)); }).join('') + '</div></div>');
        pickerCb = cb;
      });
    },
    'near-from': function () { pickerCb = function (id) { setEnd('from', id); rerender(); }; ACT.nearest(); },
    locate: function () { locate(function (list, pos) { if (!map) return; map.showMe(pos.latitude, pos.longitude); if (list[0].km > 60) { toast('You are outside ' + C.name + '.'); return; } map.focus(list[0].id); stationSheet(list[0].id); }); },
    tiles: function (b) { var on = !store.get('tiles', true); store.set('tiles', on); b.classList.toggle('on', on); if (map) map.setTiles(on); toast(on ? 'Street map on' : 'Street map off'); },
    zin: function () { if (map) map.zoom(1); },
    zout: function () { if (map) map.zoom(-1); },
    'map-search': function () { openPicker('Find a station', function (id) { if (map) { map.focus(id); stationSheet(id); } }); },
    'map-focus': function (b) { state.mapRoute = null; state.mapFocus = b.getAttribute('data-id'); go('#/map'); },
    'set-from': function (b) { setEnd('from', b.getAttribute('data-id')); toPlan(); },
    'set-to': function (b) { setEnd('to', b.getAttribute('data-id')); toPlan(); },
    'st-line': function (b) { stFilter.g = b.getAttribute('data-g'); document.getElementById('schips').innerHTML = stChips(); document.getElementById('slist').innerHTML = stationsList(); },
    pax: function (b) { var d = +b.getAttribute('data-d'); if (book.pax === 6 && d > 0) toast('Up to 6 passengers per booking'); book.pax = Math.max(1, Math.min(6, book.pax + d)); rerender(); },
    'confirm-book': function () {
      var r = state.route, f = fareNow(r), pay = (document.querySelector('input[name=pay]:checked') || {}).value || 'upi';
      var t = tickets(), id = 'MY' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100);
      t.unshift({ id: id, at: Date.now(), city: C.id, cityN: C.name, from: r.from, to: r.to, fromN: S[r.from].n, toN: S[r.to].n, pax: book.pax, fare: f, total: f * book.pax, pay: pay,
        via: r.legs.map(function (l) { return l.name; }).join(', then ') });
      saveTickets(t.slice(0, 50)); toast('Practice booking saved'); location.replace('#/ticket/' + id); route();
    },
    'ticket-route': function (b) {
      var x = tickets().filter(function (t) { return t.id === b.getAttribute('data-id'); })[0]; if (!x) return;
      var c = x.city || 'delhi'; if (c !== C.id) switchCity(c);
      if (S[x.from] && S[x.to]) { setEnd('from', x.from); setEnd('to', x.to); go('#/plan'); }
    },
    'ticket-del': function (b) { saveTickets(tickets().filter(function (t) { return t.id !== b.getAttribute('data-id'); })); toast('Booking deleted'); location.replace('#/tickets'); route(); },
    theme: function () { var d = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', d); store.set('theme', d); rerender(); },
    logout: function () { Auth.logout(); loginMode = 'login'; toast('Logged out'); if ((location.hash || '').indexOf('#/verify') === 0) { location.replace('#/login'); route(); } else rerender(); },
    'del-account': function (b) {
      if (!b.getAttribute('data-sure')) { b.setAttribute('data-sure', '1'); b.querySelector('b').textContent = 'Tap again to delete the account and its bookings'; return; }
      Auth.remove().then(function () { toast('Account deleted'); rerender(); }, function (m) { toast(String(m)); });
    },
    'login-mode': function (b) { loginMode = b.getAttribute('data-m'); rerender(); },
    forgot: function () {
      var f = document.getElementById('authform');
      Auth.reset(f.id.value).then(function () { toast('Password reset email sent'); }, function (m) { document.getElementById('autherr').textContent = String(m); });
    },
    'verify-check': function (b) {
      b.disabled = true;
      Auth.checkVerified().then(function (ok) {
        if (ok) { toast('Email verified'); var n = state.next || '#/more'; state.next = null; location.replace(n); route(); }
        else { b.disabled = false; document.getElementById('verr').textContent = 'Not verified yet. Open the link in the email first, then tap again.'; }
      }, function (m) { b.disabled = false; document.getElementById('verr').textContent = String(m); });
    },
    'verify-resend': function () { Auth.resend().then(function () { toast('Email sent again'); }, function (m) { document.getElementById('verr').textContent = String(m); }); },
    'photo-remove': function () { Auth.setPhoto(null); toast('Photo removed'); rerender(); }
  };
  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-pick]');
    if (p && pickerCb) { var cb = pickerCb, id = p.getAttribute('data-pick'); pickerCb = null; closeSheet(); remember(id); cb(id); return; }
    var b = e.target.closest('[data-act]');
    if (b && ACT[b.getAttribute('data-act')]) { if (b.tagName !== 'A') e.preventDefault(); ACT[b.getAttribute('data-act')](b); }
  });
  document.addEventListener('change', function (e) { if (e.target.name === 'pay') book.pay = e.target.value; });
  window.addEventListener('hashchange', route);
  // tabs replace the current page so the phone's back button does not walk through every tab
  document.getElementById('tabs').addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    e.preventDefault(); location.replace(a.getAttribute('href'));
  });
  // Android back button: close sheet, go back, return to Plan, then leave the app
  var ROOT = { plan: 1, map: 1, stations: 1, tickets: 1, more: 1 };
  function onBack() {
    var page = (location.hash || '#/plan').slice(2).split('/')[0] || 'plan';
    if (!$sheet.hidden) { closeSheet(); if (map) map.pick(null); }
    else if (!ROOT[page]) { if (history.length > 1) history.back(); else location.replace('#/plan'); }
    else if (page !== 'plan') location.replace('#/plan');
    else if (state.from || state.to) ACT['clear-plan']();
    else if (window.Capacitor && window.Capacitor.nativePromise) window.Capacitor.nativePromise('App', 'exitApp', {});
  }
  try { if (window.Capacitor && window.Capacitor.addListener) window.Capacitor.addListener('App', 'backButton', onBack); } catch (err) {}

  var theme = store.get('theme', null) || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  loadCity(store.get('city', 'delhi'));
  window.__app = { state: state, Auth: Auth, city: function () { return C.id; } };
  route();
})();
