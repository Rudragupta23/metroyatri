/* MetroYatri – screens and app logic */
(function () {
  'use strict';
  var D = window.METRO, S = D.stations, E = new window.Engine(D);
  var $view = document.getElementById('view'), $sheet = document.getElementById('sheet'), $toast = document.getElementById('toast');
  var IDS = Object.keys(S).sort(function (a, b) { return S[a].n.localeCompare(S[b].n); });
  var GROUPS = ['red', 'yellow', 'blue', 'green', 'violet', 'pink', 'magenta', 'grey', 'airport'];
  var GCOL = {}, GTXT = {};
  D.lines.forEach(function (l) { GCOL[l.g] = l.color; GTXT[l.g] = l.text; });
  var OFFICIAL = {
    whatsapp: 'https://wa.me/919650855800?text=Hi',
    app: 'https://play.google.com/store/search?q=DMRC%20Momentum%20Delhi%20Sarthi&c=apps',
    site: 'https://www.delhimetrorail.com/'
  };
  var PLACES = [
    ['Red Fort (Lal Qila)', 'Lal Qila'], ['Jama Masjid', 'Jama Masjid'], ['Chandni Chowk market', 'Chandni Chowk'],
    ['India Gate and Kartavya Path', 'Central Secretariat'], ['Rashtrapati Bhavan', 'Central Secretariat'],
    ['Connaught Place', 'Rajiv Chowk'], ['Jantar Mantar', 'Patel Chowk'], ['Gurudwara Bangla Sahib', 'Patel Chowk'],
    ['Agrasen ki Baoli', 'Barakhamba Road'], ['Qutub Minar', 'Qutab Minar'], ['Lotus Temple', 'Kalkaji Mandir'],
    ['Kalkaji Temple', 'Kalkaji Mandir'], ['Akshardham Temple', 'Akshardham'], ["Humayun's Tomb", 'Jawaharlal Nehru Stadium'],
    ['Lodhi Garden', 'Jor Bagh'], ['Safdarjung Tomb', 'Jor Bagh'], ['Hauz Khas Village and Deer Park', 'Green Park'],
    ['Dilli Haat', 'Dilli Haat - INA'], ['Sarojini Nagar market', 'Sarojini Nagar'], ['Lajpat Nagar market', 'Lajpat Nagar'],
    ['Karol Bagh market', 'Karol Bagh'], ['Khan Market', 'Khan Market'], ['Paharganj', 'Ramakrishna Ashram Marg'],
    ['Raj Ghat', 'Delhi Gate'], ['Arun Jaitley Stadium', 'Delhi Gate'], ['Purana Qila and Delhi Zoo', 'Supreme Court'],
    ['Bharat Mandapam (Pragati Maidan)', 'Supreme Court'], ['National Museum', 'Seva Teerth'], ['Select Citywalk, Saket', 'Malviya Nagar'],
    ['Garden of Five Senses', 'Saket'], ['Chhatarpur Temple', 'Chhatarpur'], ['Majnu ka Tilla', 'Vidhan Sabha'],
    ['Delhi University North Campus', 'Vishwavidyalaya'], ['Nehru Place market', 'Nehru Place'], ['ISKCON Temple', 'Nehru Place'],
    ['Okhla Bird Sanctuary', 'Okhla Bird Sanctuary'], ['Noida Sector 18 market', 'Noida Sector 18'], ['Yashobhoomi convention centre', 'Yashobhoomi Dwarka Sector 25'],
    ['Airport Terminal 1', 'Terminal 1-IGI Airport'], ['Airport Terminal 2 and 3', 'Indira Gandhi International Airport'],
    ['New Delhi railway station', 'New Delhi'], ['Old Delhi railway station', 'Chandni Chowk'], ['Hazrat Nizamuddin railway station', 'Sarai Kale Khan - Nizamuddin'],
    ['Anand Vihar railway terminal and ISBT', 'Anand Vihar'], ['Kashmere Gate ISBT', 'Kashmere Gate'], ['AIIMS hospital', 'AIIMS']
  ];
  var BYNAME = {}; IDS.forEach(function (id) { BYNAME[S[id].n] = id; });

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('my.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('my.' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var toastT;
  function toast(msg) { $toast.textContent = msg; $toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { $toast.classList.remove('on'); }, 2400); }
  function groupsOf(id) { var g = []; S[id].lines.forEach(function (l) { var x = E.lines[l].g; if (g.indexOf(x) < 0) g.push(x); }); return g; }
  function roundels(id, big) { return '<span class="rd' + (big ? ' big' : '') + '">' + groupsOf(id).map(function (g) { return '<i style="--c:' + GCOL[g] + '"></i>'; }).join('') + '</span>'; }
  function lineNames(id) { return groupsOf(id).map(function (g) { return E.groupName(g); }).join(', '); }
  function go(h) { location.hash = h; }
  function isHoliday() { return state.day === 'holiday' || (state.day === 'auto' && new Date().getDay() === 0); }
  function fmtDate(t) { return new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function sameDay(a, b) { return new Date(a).toDateString() === new Date(b).toDateString(); }
  var BACK = '<button class="back" data-act="back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>Back</button>';
  var SEARCH_ICON = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>';

  var state = {
    from: store.get('from', null), to: store.get('to', null), mode: 'fast', day: 'auto',
    airport: store.get('airport', false), route: null, open: {}, user: null, mapRoute: null
  };
  if (state.from && !S[state.from]) state.from = null;
  if (state.to && !S[state.to]) state.to = null;

  /* ---------- accounts (kept on this phone only) ---------- */
  function hash(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 5381; for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return Promise.resolve('x' + (h >>> 0).toString(16));
  }
  var auth = {
    users: function () { return store.get('users', {}); },
    current: function () { var k = store.get('session', null), u = this.users(); return k && u[k] ? u[k] : null; },
    key: function (id) { return id.trim().toLowerCase().replace(/\s+/g, ''); },
    signup: function (name, id, pw) {
      var users = this.users(), k = this.key(id);
      if (name.trim().length < 2) return Promise.reject('Enter your name.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(k) && !/^\+?\d{10,13}$/.test(k)) return Promise.reject('Enter a valid email address or a 10-digit mobile number.');
      if (pw.length < 6) return Promise.reject('Use a password with at least 6 characters.');
      if (users[k]) return Promise.reject('An account with this email or mobile already exists on this phone. Log in instead.');
      var salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
      return hash(salt + pw).then(function (h) {
        users[k] = { key: k, name: name.trim(), salt: salt, hash: h, since: Date.now() };
        store.set('users', users); store.set('session', k); return users[k];
      });
    },
    login: function (id, pw) {
      var u = this.users()[this.key(id)];
      if (!u) return Promise.reject('No account found for this email or mobile on this phone. Create an account first.');
      return hash(u.salt + pw).then(function (h) {
        if (h !== u.hash) return Promise.reject('Wrong password. Try again.');
        store.set('session', u.key); return u;
      });
    },
    logout: function () { store.set('session', null); },
    remove: function () { var u = this.users(), c = this.current(); if (!c) return; delete u[c.key]; store.set('users', u); store.set('tickets.' + c.key, []); store.set('session', null); }
  };
  function tickets() { var u = auth.current(); return u ? store.get('tickets.' + u.key, []) : []; }
  function saveTickets(t) { var u = auth.current(); if (u) store.set('tickets.' + u.key, t); }

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
      html += '<div class="list" style="margin-bottom:10px"><button class="item" data-act="nearest"><span class="grow"><b>Use my nearest station</b><small>Needs location permission</small></span><span class="chev">›</span></button></div>';
      var rec = store.get('recent', []).filter(function (id) { return S[id]; });
      if (rec.length) html += '<h2 class="sec" style="margin-top:6px">Recent</h2><div class="list">' + rec.map(function (id) { return stationRow(id); }).join('') + '</div><h2 class="sec">All stations</h2>';
    }
    if (!ids.length) return html + '<div class="empty"><b>No station matches “' + esc(q) + '”</b>Check the spelling, or try an older name such as Pitampura or HUDA City Centre.</div>';
    return html + '<div class="list">' + ids.slice(0, 80).map(function (id) { return stationRow(id, aliasHit(id, q)); }).join('') + '</div>' +
      (ids.length > 80 ? '<p class="hint" style="padding:10px 4px">Type a few letters to see more stations.</p>' : '');
  }
  function openPicker(title, cb) {
    pickerCb = cb;
    openSheet('<header><h3>' + esc(title) + '<button data-act="close-sheet">Cancel</button></h3><label class="search">' + SEARCH_ICON +
      '<input id="pq" type="search" placeholder="Search station" autocomplete="off" autocapitalize="off" spellcheck="false"></label></header><div class="body" id="plist">' + pickerList('') + '</div>', true);
    var q = document.getElementById('pq');
    q.addEventListener('input', function () { document.getElementById('plist').innerHTML = pickerList(q.value); });
    setTimeout(function () { q.focus(); }, 60);
  }
  function remember(id) {
    var r = store.get('recent', []).filter(function (x) { return x !== id; }); r.unshift(id); store.set('recent', r.slice(0, 6));
  }
  function nearest(cb) {
    if (!navigator.geolocation) { toast('Location is not available on this phone.'); return; }
    toast('Finding your location…');
    navigator.geolocation.getCurrentPosition(function (p) {
      var list = IDS.map(function (id) { return { id: id, km: window.Engine.haversine(p.coords.latitude, p.coords.longitude, S[id].lat, S[id].lon) }; })
        .sort(function (a, b) { return a.km - b.km; }).slice(0, 5);
      if (list[0].km > 60) { toast('You seem to be far from the Delhi Metro network.'); return; }
      cb(list);
    }, function () { toast('Could not get your location. Turn on location and allow access.'); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  /* ---------- Plan ---------- */
  function compute() {
    state.route = (state.from && state.to && state.from !== state.to) ? E.plan(state.from, state.to, state.mode, { airport: state.airport }) : null;
  }
  function fareNow(r) { return isHoliday() ? r.fare.holiday : r.fare.weekday; }
  function legHtml(leg, i) {
    var mid = leg.stations.slice(1, -1), key = 'l' + i, open = state.open[key];
    var stops = leg.stations.length - 1;
    return '<div class="leg" style="--c:' + leg.color + ';--ct:' + leg.text + '"><div class="rail" style="grid-row:1/span 3"></div>' +
      '<div class="stop"><span class="d"></span><span class="t">' + esc(S[leg.from].n) + '</span></div>' +
      '<div class="ride"><span class="ln">' + esc(leg.name) + '</span>' + esc(leg.towards) + '<br>' + stops + (stops === 1 ? ' stop' : ' stops') + ', about ' + Math.max(1, Math.round(leg.min)) + ' min' +
      (mid.length ? '<button data-act="toggle-leg" data-key="' + key + '">' + (open ? 'Hide stops' : 'Show ' + mid.length + ' stops in between') + '</button>' +
        (open ? '<ol>' + mid.map(function (id) { return '<li>' + esc(S[id].n) + '</li>'; }).join('') + '</ol>' : '') : '') +
      '</div><div class="stop"><span class="d"></span><span class="t">' + esc(S[leg.to].n) + '</span></div></div>';
  }
  function resultHtml(r) {
    var f = fareNow(r), hol = isHoliday(), notes = [];
    if (r.fare.estimate) notes.push('This route uses the Airport Express, which has its own higher fares. The fare shown is an estimate.');
    r.legs.forEach(function (l) { if (l.note && l.lines.indexOf('pinkb') >= 0) notes.push(l.note); });
    var favs = store.get('favs', []), isFav = favs.some(function (x) { return x[0] === r.from && x[1] === r.to; });
    return '<div class="card" style="margin-top:12px"><div class="fare"><div class="amt"><sup>₹</sup>' + f + '</div>' +
      '<div class="day">' + (hol ? 'Sunday and national holiday fare' : 'Weekday fare') + '<br>about ₹' + Math.round(f * 0.9) + ' with smart card</div></div>' +
      '<div class="facts"><div><b>' + r.km.toFixed(1) + ' km</b>distance</div><div><b>' + r.min + ' min</b>travel time</div><div><b>' + r.stops + '</b>stations</div><div><b>' + r.changes + '</b>' + (r.changes === 1 ? 'change' : 'changes') + '</div></div>' +
      notes.map(function (n) { return '<p class="note">' + esc(n) + '</p>'; }).join('') + '</div>' +
      '<div class="chips"><button class="chip' + (!hol ? ' on' : '') + '" data-act="day" data-day="weekday">Weekday fare</button><button class="chip' + (hol ? ' on' : '') + '" data-act="day" data-day="holiday">Sunday or holiday fare</button></div>' +
      '<div class="card strip" style="margin-top:12px">' + r.legs.map(function (l, i) {
        return (i ? '<div class="change">Change trains at ' + esc(S[l.from].n) + '</div>' : '') + legHtml(l, i);
      }).join('') + '</div>' +
      '<div class="btns"><button class="btn alt" data-act="show-map">Show on map</button><button class="btn signal" data-act="book">Book ticket</button></div>' +
      '<div class="btns"><button class="btn alt" data-act="fav">' + (isFav ? 'Remove from saved' : 'Save this route') + '</button><button class="btn alt" data-act="share">Share route</button></div>' +
      '<p class="hint" style="margin-top:12px">Fare is charged for the shortest route between the two stations, whichever route you ride. Distance and time are calculated from track data and can differ slightly from the figures at the station.</p>';
  }
  function renderPlan() {
    compute();
    var r = state.route, u = auth.current();
    var html = '<div class="head"><div><h1 class="title">' + (u ? 'Namaste, ' + esc(u.name.split(' ')[0]) : 'Plan a journey') + '</h1><p class="sub">' + D.meta.stations + ' Delhi Metro stations, fares from 25 Aug 2025</p></div></div>' +
      '<div class="planner"><button class="row" data-act="pick" data-which="from"><span class="pin"></span><span><small>From</small><b class="' + (state.from ? '' : 'ph') + '">' + (state.from ? esc(S[state.from].n) : 'Choose starting station') + '</b></span></button>' +
      '<div class="perf"></div><button class="row" data-act="pick" data-which="to"><span class="pin to"></span><span><small>To</small><b class="' + (state.to ? '' : 'ph') + '">' + (state.to ? esc(S[state.to].n) : 'Choose destination') + '</b></span></button>' +
      '<button class="swap" data-act="swap" aria-label="Swap stations"><svg viewBox="0 0 24 24"><path d="M7 4v15m0 0-3.5-3.5M7 19l3.5-3.5M17 20V5m0 0-3.5 3.5M17 5l3.5 3.5"/></svg></button></div>';
    if (r) {
      html += '<div class="chips">' + [['fast', 'Fastest'], ['easy', 'Fewest changes'], ['short', 'Shortest distance']].map(function (m) {
        return '<button class="chip' + (state.mode === m[0] ? ' on' : '') + '" data-act="mode" data-mode="' + m[0] + '">' + m[1] + '</button>';
      }).join('') + (r.airportForced ? '' : '<button class="chip' + (state.airport ? ' on' : '') + '" data-act="airport"><i style="background:' + GCOL.airport + '"></i>Use Airport Express</button>') + '</div>' + resultHtml(r);
    } else {
      if (state.from && state.to && state.from === state.to) html += '<p class="note">Choose two different stations.</p>';
      var favs = store.get('favs', []).filter(function (x) { return S[x[0]] && S[x[1]]; });
      if (favs.length) html += '<h2 class="sec">Saved routes</h2><div class="list">' + favs.map(function (x) {
        return '<button class="item" data-act="use-fav" data-from="' + x[0] + '" data-to="' + x[1] + '"><span class="grow"><b>' + esc(S[x[0]].n) + ' to ' + esc(S[x[1]].n) + '</b></span><span class="chev">›</span></button>';
      }).join('') + '</div>';
      html += '<h2 class="sec">Quick start</h2><div class="list">' +
        '<button class="item" data-act="near-from"><span class="grow"><b>Start from my nearest station</b><small>Finds the closest stations to you</small></span><span class="chev">›</span></button>' +
        '<a class="item" href="#/places"><span class="grow"><b>Places to visit by metro</b><small>Red Fort, Qutub Minar, markets, airports and more</small></span><span class="chev">›</span></a>' +
        '<a class="item" href="#/fares"><span class="grow"><b>Fare chart</b><small>₹11 to ₹64, lower on Sundays and holidays</small></span><span class="chev">›</span></a></div>';
    }
    $view.className = ''; $view.innerHTML = html;
  }
  function shareText(r) {
    var t = 'Delhi Metro: ' + S[r.from].n + ' to ' + S[r.to].n + '\nFare ₹' + fareNow(r) + ', ' + r.km.toFixed(1) + ' km, about ' + r.min + ' min\n';
    r.legs.forEach(function (l, i) { t += (i + 1) + '. ' + l.name + ' ' + l.towards + ': ' + S[l.from].n + ' to ' + S[l.to].n + ' (' + (l.stations.length - 1) + ' stops)\n'; });
    return t + 'Planned with MetroYatri';
  }

  /* ---------- Map ---------- */
  var map = null;
  function renderMap() {
    $view.className = 'full';
    var r = state.mapRoute;
    $view.innerHTML = '<div class="mapwrap' + (r ? ' routed' : '') + '" id="mapwrap"><div class="maptop"><button class="search" data-act="map-search" style="text-align:left">' + SEARCH_ICON + '<span style="color:var(--soft)">Find a station on the map</span></button></div>' +
      '<div class="legend">' + GROUPS.map(function (g) { return '<span><i style="background:' + GCOL[g] + '"></i>' + E.groupName(g).replace(' Line', '') + '</span>'; }).join('') + '</div>' +
      '<div class="zoom"><button data-act="locate" aria-label="My nearest station"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg></button><button data-act="zin" aria-label="Zoom in">+</button><button data-act="zout" aria-label="Zoom out">−</button></div></div>' +
      (r ? '<div class="routebar"><div class="grow"><b>' + esc(S[r.from].n) + ' to ' + esc(S[r.to].n) + '</b><small>₹' + fareNow(r) + ', ' + r.km.toFixed(1) + ' km, ' + r.min + ' min, ' + r.changes + (r.changes === 1 ? ' change' : ' changes') + '</small></div><button data-act="clear-route">Clear</button></div>' : '');
    map = new window.MetroMap(document.getElementById('mapwrap'), D, E, { onStation: stationSheet });
    if (r) map.setRoute(r);
    else if (state.mapFocus) { map.focus(state.mapFocus); state.mapFocus = null; }
    else { map.fit({ x0: -9, x1: 9, y0: -8, y1: 9 }, 0); }
  }
  function stationSheet(id) {
    if (map) map.pick(id);
    var st = S[id];
    openSheet('<header><h3><span style="display:flex;align-items:center;gap:10px">' + roundels(id, true) + esc(st.n) + '</span><button data-act="close-sheet">Close</button></h3><p class="hint">' + esc(lineNames(id)) + (st.approx ? '. Map position is approximate.' : '') + '</p></header>' +
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
          '<div class="list">' + l.st.map(function (id) { return '<a class="item" href="#/station/' + id + '">' + roundels(id) + '<span class="grow"><b>' + esc(S[id].n) + '</b>' + (groupsOf(id).length > 1 ? '<small>Change for ' + esc(groupsOf(id).filter(function (x) { return x !== g; }).map(function (x) { return E.groupName(x); }).join(', ')) + '</small>' : '') + '</span><span class="chev">›</span></a>'; }).join('') + '</div>';
      }).join('');
    }
    var ids = matchStations(q).filter(function (id) { return !g || groupsOf(id).indexOf(g) >= 0; });
    if (!ids.length) return '<div class="empty"><b>No station found</b>Try a different spelling or an older name.</div>';
    return '<div class="list" style="margin-top:12px">' + ids.map(function (id) { return '<a class="item" href="#/station/' + id + '">' + roundels(id) + '<span class="grow"><b>' + esc(S[id].n) + '</b><small>' + esc(aliasHit(id, q) || lineNames(id)) + '</small></span><span class="chev">›</span></a>'; }).join('') + '</div>';
  }
  function renderStations() {
    $view.className = '';
    $view.innerHTML = '<div class="head"><div><h1 class="title">Stations</h1><p class="sub">Search by name, or pick a line to see its stations in order</p></div></div>' +
      '<label class="search">' + SEARCH_ICON + '<input id="sq" type="search" placeholder="Search ' + D.meta.stations + ' stations" value="' + esc(stFilter.q) + '" autocomplete="off" spellcheck="false"></label>' +
      '<div class="chips" id="schips">' + stChips() + '</div><div id="slist">' + stationsList() + '</div>';
    var q = document.getElementById('sq');
    q.addEventListener('input', function () { stFilter.q = q.value; document.getElementById('slist').innerHTML = stationsList(); });
  }
  function stChips() {
    return '<button class="chip' + (!stFilter.g ? ' on' : '') + '" data-act="st-line" data-g="">All</button>' + GROUPS.map(function (g) {
      return '<button class="chip' + (stFilter.g === g ? ' on' : '') + '" data-act="st-line" data-g="' + g + '"><i style="background:' + GCOL[g] + '"></i>' + E.groupName(g).replace(' Line', '') + '</button>';
    }).join('');
  }
  var LAY = { E: 'Elevated', U: 'Underground', G: 'At ground level' };
  function renderStation(id) {
    var st = S[id]; if (!st) return go('#/stations');
    var gs = groupsOf(id);
    var html = BACK + '<div class="head"><div><h1 class="title">' + esc(st.n) + '</h1><p class="sub">' + (gs.length > 1 ? 'Interchange station' : 'Metro station') + (st.a ? ', also known as ' + esc(st.a.join(', ')) : '') + '</p></div>' + roundels(id, true) + '</div>' +
      '<div class="btns" style="margin-top:0"><button class="btn alt" data-act="set-from" data-id="' + id + '">Start here</button><button class="btn" data-act="set-to" data-id="' + id + '">Go here</button></div>';
    html += '<h2 class="sec">Lines and next stations</h2>';
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
    var near = PLACES.filter(function (p) { return p[1] === st.n; });
    if (near.length) html += '<h2 class="sec">Get off here for</h2><div class="list">' + near.map(function (p) { return '<div class="item"><span class="grow"><b>' + esc(p[0]) + '</b></span></div>'; }).join('') + '</div>';
    html += '<div class="btns"><button class="btn alt" data-act="map-focus" data-id="' + id + '">See on metro map</button><a class="btn alt" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(st.n + ' metro station Delhi') + '">Open in Google Maps</a></div>' +
      '<p class="hint" style="margin-top:12px">Trains on most lines run from about 5:30 am to 11:30 pm. First and last train times differ by station, so check the board at the station for late-night journeys.</p>';
    $view.className = ''; $view.innerHTML = html; $view.scrollTop = 0;
  }

  /* ---------- Tickets ---------- */
  function officialCard() {
    return '<div class="card" style="margin-top:12px"><b style="font-size:17px">Get a real ticket</b><p class="hint" style="margin:4px 0 2px">Only DMRC can issue tickets that open the metro gates. These open the official channels:</p>' +
      '<div class="btns one"><a class="btn" target="_blank" rel="noopener" href="' + OFFICIAL.whatsapp + '">Book on DMRC WhatsApp (9650855800)</a>' +
      '<a class="btn alt" target="_blank" rel="noopener" href="' + OFFICIAL.app + '">Get the official DMRC app</a></div></div>';
  }
  function qrSvg(text) {
    var q = window.qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }
  function renderTickets() {
    var u = auth.current();
    $view.className = '';
    if (!u) {
      $view.innerHTML = '<div class="head"><div><h1 class="title">Tickets</h1></div></div><div class="card"><div class="empty" style="padding:18px 4px"><b>Log in to book tickets</b>Your tickets and journey history are saved to your account on this phone.</div><a class="btn" href="#/login">Log in or create account</a></div>' + officialCard();
      return;
    }
    var t = tickets();
    $view.innerHTML = '<div class="head"><div><h1 class="title">Tickets</h1><p class="sub">Practice bookings made in this app</p></div></div>' +
      (t.length ? '<div class="list">' + t.map(function (x) {
        var live = sameDay(x.at, Date.now());
        return '<a class="item" href="#/ticket/' + x.id + '"><span class="grow"><b>' + esc(x.fromN) + ' to ' + esc(x.toN) + '</b><small>' + fmtDate(x.at) + ', ' + x.pax + (x.pax === 1 ? ' passenger' : ' passengers') + ', ₹' + x.total + '</small></span><span class="tag' + (live ? ' live' : '') + '">' + (live ? 'Today' : 'Past') + '</span></a>';
      }).join('') + '</div>' : '<div class="card"><div class="empty" style="padding:18px 4px"><b>No bookings yet</b>Plan a journey, then tap Book ticket.</div><a class="btn" href="#/plan">Plan a journey</a></div>') + officialCard();
  }
  var book = { pax: 1, pay: 'upi' };
  function renderBook() {
    var r = state.route, u = auth.current();
    if (!r) return go('#/plan');
    if (!u) { state.next = '#/book'; return go('#/login'); }
    var f = fareNow(r);
    $view.className = '';
    $view.innerHTML = BACK + '<div class="head"><div><h1 class="title">Book ticket</h1><p class="sub">Single journey, valid today</p></div></div>' +
      '<p class="note" style="margin:0 0 12px">Practice booking. No money is taken and this ticket will not open metro gates. For a real ticket use the official DMRC options below.</p>' +
      '<div class="card"><div class="kv"><span>From</span><b>' + esc(S[r.from].n) + '</b></div><div class="kv"><span>To</span><b>' + esc(S[r.to].n) + '</b></div>' +
      '<div class="kv"><span>Journey</span><b>' + r.km.toFixed(1) + ' km, ' + r.changes + (r.changes === 1 ? ' change' : ' changes') + '</b></div>' +
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
      '<div class="meta"><div class="kv"><span>Booking number</span><b>' + x.id + '</b></div><div class="kv"><span>Booked</span><b>' + fmtDate(x.at) + '</b></div><div class="kv"><span>Passengers</span><b>' + x.pax + '</b></div>' +
      '<div class="kv"><span>Route</span><b>' + esc(x.via) + '</b></div><div class="kv"><span>Paid with</span><b>' + { upi: 'UPI', card: 'Card', wallet: 'Wallet' }[x.pay] + ' (practice)</b></div><div class="kv total"><span>Total</span><b>₹' + x.total + '</b></div>' +
      '<div style="margin-top:8px"><span class="tag' + (live ? ' live' : '') + '">' + (live ? 'Booked today' : 'Past booking') + '</span></div></div></div>' +
      '<div class="btns"><button class="btn alt" data-act="ticket-route" data-id="' + x.id + '">See route</button><button class="btn danger" data-act="ticket-del" data-id="' + x.id + '">Delete</button></div>' + officialCard();
    $view.scrollTop = 0;
  }

  /* ---------- Account and info ---------- */
  function renderMore() {
    var u = auth.current(), dark = document.documentElement.getAttribute('data-theme') === 'dark';
    $view.className = '';
    $view.innerHTML = '<div class="head"><div><h1 class="title">Account</h1></div></div>' +
      (u ? '<div class="card" style="display:flex;gap:14px;align-items:center"><span class="avatar">' + esc(u.name[0].toUpperCase()) + '</span><div style="min-width:0"><b style="font-size:19px;display:block">' + esc(u.name) + '</b><span class="hint">' + esc(u.key) + '</span></div></div>'
         : '<div class="card"><b style="font-size:18px">You are not logged in</b><p class="hint" style="margin:2px 0 10px">Log in to book tickets and keep your booking history.</p><a class="btn" href="#/login">Log in or create account</a></div>') +
      '<h2 class="sec">Travel information</h2><div class="list">' +
      '<a class="item" href="#/fares"><span class="grow"><b>Fare chart</b><small>Fares by distance, smart card discount</small></span><span class="chev">›</span></a>' +
      '<a class="item" href="#/places"><span class="grow"><b>Places to visit by metro</b><small>Nearest station for popular places</small></span><span class="chev">›</span></a>' +
      '<a class="item" href="#/help"><span class="grow"><b>Timings, helplines and real tickets</b><small>DMRC helpline 155370</small></span><span class="chev">›</span></a></div>' +
      '<h2 class="sec">App</h2><div class="list">' +
      '<button class="item" data-act="theme"><span class="grow"><b>Dark mode</b><small>' + (dark ? 'On' : 'Off') + '</small></span><span class="chev">›</span></button>' +
      '<a class="item" href="#/about"><span class="grow"><b>About this app and its data</b><small>Network checked on 11 Nov 2026</small></span><span class="chev">›</span></a>' +
      (u ? '<button class="item" data-act="logout"><span class="grow"><b>Log out</b></span></button><button class="item" data-act="del-account"><span class="grow"><b style="color:#C62828">Delete my account from this phone</b></span></button>' : '') + '</div>' +
      '<p class="legal">MetroYatri is an independent guide. It is not made by, linked to or approved by Delhi Metro Rail Corporation (DMRC).</p>';
  }
  var loginMode = 'login';
  function renderLogin() {
    $view.className = '';
    var up = loginMode === 'signup';
    $view.innerHTML = BACK + '<div class="head"><div><h1 class="title">' + (up ? 'Create account' : 'Log in') + '</h1><p class="sub">Your account is stored only on this phone</p></div></div>' +
      '<div class="seg"><button class="' + (!up ? 'on' : '') + '" data-act="login-mode" data-m="login">Log in</button><button class="' + (up ? 'on' : '') + '" data-act="login-mode" data-m="signup">Create account</button></div>' +
      '<form id="authform" novalidate>' + (up ? '<label class="field"><span>Your name</span><input name="name" autocomplete="name" maxlength="40"></label>' : '') +
      '<label class="field"><span>Email or mobile number</span><input name="id" autocomplete="username" inputmode="email" autocapitalize="off" maxlength="60"></label>' +
      '<label class="field"><span>Password</span><input name="pw" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" maxlength="60"></label>' +
      '<p class="err" id="autherr"></p><button class="btn" type="submit">' + (up ? 'Create account' : 'Log in') + '</button></form>' +
      '<p class="legal">This is not your DMRC or Delhi Metro account. Do not reuse a password from another service. If you forget the password, delete the app data and create the account again.</p>';
    document.getElementById('authform').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, p = up ? auth.signup(f.name.value, f.id.value, f.pw.value) : auth.login(f.id.value, f.pw.value);
      p.then(function (u) { loginMode = 'login'; toast('Logged in as ' + u.name); var n = state.next || '#/more'; state.next = null; location.replace(n); route(); },
        function (msg) { document.getElementById('autherr').textContent = msg; });
    });
  }
  function renderFares() {
    var SL = window.Engine.SLABS, lo = 0;
    $view.className = '';
    $view.innerHTML = BACK + '<div class="head"><div><h1 class="title">Fare chart</h1><p class="sub">In force since 25 August 2025</p></div></div><div class="card"><table class="slab"><tr><th>Distance</th><th>Mon to Sat</th><th>Sunday, holiday</th></tr>' +
      SL.map(function (s) { var row = '<tr><td>' + (s[0] === Infinity ? 'Over ' + lo + ' km' : lo + ' to ' + s[0] + ' km') + '</td><td>₹' + s[1] + '</td><td>₹' + s[2] + '</td></tr>'; lo = s[0]; return row; }).join('') + '</table></div>' +
      '<div class="card"><b>Smart card</b><p class="hint" style="margin-top:2px">10% off every journey. A further 10% off in off-peak hours (before 8 am, 12 noon to 5 pm, and after 9 pm) from Monday to Saturday.</p></div>' +
      '<div class="card"><b>Airport Express</b><p class="hint" style="margin-top:2px">Has its own fares from ₹11 to ₹75. New Delhi to the airport (Terminal 2 and 3) is about ₹64. Airport Express fares in this app are estimates.</p></div>' +
      '<div class="card"><b>How fare is worked out</b><p class="hint" style="margin-top:2px">Fare depends on the shortest track distance between your two stations. Near the edge of a distance band the app can be one band out, so treat the fare as a close guide and confirm at the station or in the official DMRC app.</p></div>';
  }
  function renderPlaces() {
    $view.className = '';
    $view.innerHTML = BACK + '<div class="head"><div><h1 class="title">Places by metro</h1><p class="sub">Tap a place to plan a journey to its nearest station</p></div></div><div class="list">' +
      PLACES.map(function (p) { var id = BYNAME[p[1]]; return '<button class="item" data-act="set-to" data-id="' + id + '">' + roundels(id) + '<span class="grow"><b>' + esc(p[0]) + '</b><small>' + esc(p[1]) + ' station</small></span><span class="chev">›</span></button>'; }).join('') + '</div>';
  }
  function renderHelp() {
    $view.className = '';
    $view.innerHTML = BACK + '<div class="head"><div><h1 class="title">Travel help</h1></div></div>' +
      '<div class="card"><b>Train timings</b><p class="hint" style="margin-top:2px">Most lines run from about 5:30 am to 11:30 pm. The Airport Express starts earlier, around 4:45 am. First and last trains differ by station.</p></div>' +
      '<h2 class="sec">Helplines</h2><div class="list"><a class="item" href="tel:155370"><span class="grow"><b>DMRC helpline</b><small>155370</small></span><span class="chev">›</span></a>' +
      '<a class="item" href="tel:155655"><span class="grow"><b>CISF metro security</b><small>155655</small></span><span class="chev">›</span></a>' +
      '<a class="item" href="tel:112"><span class="grow"><b>Emergency</b><small>112</small></span><span class="chev">›</span></a></div>' + officialCard() +
      '<div class="btns one"><a class="btn alt" target="_blank" rel="noopener" href="' + OFFICIAL.site + '">Open the DMRC website</a></div>';
  }
  function renderAbout() {
    $view.className = '';
    $view.innerHTML = BACK + '<div class="head"><div><h1 class="title">About</h1><p class="sub">MetroYatri 1.0</p></div></div>' +
      '<div class="card"><b>What is in the app</b><p class="hint" style="margin-top:2px">' + D.meta.stations + ' stations on the Red, Yellow, Blue, Green, Violet, Pink, Magenta, Grey and Airport Express lines. It includes the Pink Line ring and the Majlis Park to Deepali Chowk section of the Magenta Line opened on 8 March 2026, and station names changed up to 2026 (for example Madhuban Chowk, Seva Teerth, Dwarka-Kakrola).</p></div>' +
      '<div class="card"><b>What is not in the app</b><p class="hint" style="margin-top:2px">Noida Aqua Line, Rapid Metro Gurugram and Namo Bharat trains are run with separate tickets and are not included. Sections still being built (Golden Line, Krishna Park Extension to Deepali Chowk, Soorghat station) are added in app updates once they open.</p></div>' +
      '<div class="card"><b>Where the data comes from</b><p class="hint" style="margin-top:2px">Track distances and train running times come from the DMRC open transit data feed. Newer sections use the published corridor length, and their map positions are approximate. Fares use the DMRC distance bands of 25 August 2025.</p></div>' +
      '<div class="card"><b>Tickets</b><p class="hint" style="margin-top:2px">Bookings inside this app are for practice only and are clearly marked. Real tickets are sold only through DMRC channels, which the app links to.</p></div>' +
      '<p class="legal">Independent app. Not made by, linked to or approved by Delhi Metro Rail Corporation. Uses the Mukta typeface (SIL Open Font License) and qrcode-generator (MIT).</p>';
  }

  /* ---------- router ---------- */
  var TABS = { plan: 'plan', book: 'plan', map: 'map', stations: 'stations', station: 'stations', tickets: 'tickets', ticket: 'tickets', more: 'more', login: 'more', fares: 'more', places: 'more', help: 'more', about: 'more' };
  function route() {
    closeSheet();
    var parts = (location.hash || '#/plan').slice(2).split('/'), page = parts[0] || 'plan';
    if (!TABS[page]) { page = 'plan'; }
    map = null;
    ({ plan: renderPlan, book: renderBook, map: renderMap, stations: renderStations, station: function () { renderStation(parts[1]); }, tickets: renderTickets, ticket: function () { renderTicket(parts[1]); },
      more: renderMore, login: renderLogin, fares: renderFares, places: renderPlaces, help: renderHelp, about: renderAbout })[page]();
    Array.prototype.forEach.call(document.querySelectorAll('#tabs a'), function (a) { a.classList.toggle('on', a.getAttribute('data-tab') === TABS[page]); });
  }
  function rerender() { var y = $view.scrollTop; route(); $view.scrollTop = y; }
  function setEnd(which, id) {
    state[which] = id; store.set(which, id); remember(id); state.open = {};
    if (which === 'from' && state.to === id) { state.to = null; store.set('to', null); }
    if (which === 'to' && state.from === id) { state.from = null; store.set('from', null); }
  }

  /* ---------- actions ---------- */
  var ACT = {
    back: function () { if (history.length > 1) history.back(); else go('#/plan'); },
    'close-sheet': function () { closeSheet(); if (map) map.pick(null); },
    'close-sheet-nav': function () { closeSheet(); },
    pick: function (b) { var w = b.getAttribute('data-which'); openPicker(w === 'from' ? 'Starting station' : 'Destination', function (id) { setEnd(w, id); rerender(); }); },
    swap: function () { var a = state.from; state.from = state.to; state.to = a; store.set('from', state.from); store.set('to', state.to); state.open = {}; rerender(); },
    mode: function (b) { state.mode = b.getAttribute('data-mode'); state.open = {}; rerender(); },
    day: function (b) { state.day = b.getAttribute('data-day'); rerender(); },
    airport: function () { state.airport = !state.airport; store.set('airport', state.airport); state.open = {}; rerender(); },
    'toggle-leg': function (b) { var k = b.getAttribute('data-key'); state.open[k] = !state.open[k]; rerender(); },
    'show-map': function () { state.mapRoute = state.route; go('#/map'); },
    'clear-route': function () { state.mapRoute = null; rerender(); },
    book: function () { book.pax = 1; go('#/book'); },
    fav: function () {
      var r = state.route, f = store.get('favs', []), n = f.filter(function (x) { return !(x[0] === r.from && x[1] === r.to); });
      if (n.length === f.length) { n.unshift([r.from, r.to]); toast('Route saved'); } else toast('Removed from saved');
      store.set('favs', n.slice(0, 12)); rerender();
    },
    'use-fav': function (b) { setEnd('from', b.getAttribute('data-from')); setEnd('to', b.getAttribute('data-to')); rerender(); },
    share: function () {
      var t = shareText(state.route);
      if (navigator.share) navigator.share({ text: t }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { toast('Route copied'); }, function () { toast('Could not share'); });
      else toast('Sharing is not available');
    },
    nearest: function () {
      var cb = pickerCb;
      nearest(function (list) {
        openSheet('<header><h3>Stations near you<button data-act="close-sheet">Cancel</button></h3></header><div class="body"><div class="list">' + list.map(function (x) { return stationRow(x.id, x.km.toFixed(1) + ' km away, ' + lineNames(x.id)); }).join('') + '</div></div>');
        pickerCb = cb;
      });
    },
    'near-from': function () { pickerCb = function (id) { setEnd('from', id); rerender(); }; ACT.nearest(); },
    locate: function () { nearest(function (list) { if (map) { map.focus(list[0].id); stationSheet(list[0].id); } }); },
    zin: function () { if (map) map.zoom(0.65); },
    zout: function () { if (map) map.zoom(1.5); },
    'map-search': function () { openPicker('Find a station', function (id) { if (map) { map.focus(id); stationSheet(id); } }); },
    'map-focus': function (b) { state.mapRoute = null; state.mapFocus = b.getAttribute('data-id'); go('#/map'); },
    'set-from': function (b) { setEnd('from', b.getAttribute('data-id')); closeSheet(); if (location.hash === '#/plan') rerender(); else go('#/plan'); },
    'set-to': function (b) { setEnd('to', b.getAttribute('data-id')); closeSheet(); if (location.hash === '#/plan') rerender(); else go('#/plan'); },
    'st-line': function (b) { stFilter.g = b.getAttribute('data-g'); document.getElementById('schips').innerHTML = stChips(); document.getElementById('slist').innerHTML = stationsList(); },
    pax: function (b) { book.pax = Math.max(1, Math.min(6, book.pax + (+b.getAttribute('data-d')))); if (book.pax === 6 && +b.getAttribute('data-d') > 0) toast('Up to 6 passengers per booking'); rerender(); },
    'confirm-book': function () {
      var r = state.route, f = fareNow(r), pay = (document.querySelector('input[name=pay]:checked') || {}).value || 'upi';
      var t = tickets(), id = 'MY' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 900 + 100);
      t.unshift({ id: id, at: Date.now(), from: r.from, to: r.to, fromN: S[r.from].n, toN: S[r.to].n, pax: book.pax, fare: f, total: f * book.pax, pay: pay,
        via: r.legs.map(function (l) { return l.name; }).join(', then ') });
      saveTickets(t.slice(0, 50)); toast('Practice booking saved'); location.replace('#/ticket/' + id); route();
    },
    'ticket-route': function (b) { var x = tickets().filter(function (t) { return t.id === b.getAttribute('data-id'); })[0]; if (x && S[x.from] && S[x.to]) { setEnd('from', x.from); setEnd('to', x.to); go('#/plan'); } },
    'ticket-del': function (b) { saveTickets(tickets().filter(function (t) { return t.id !== b.getAttribute('data-id'); })); toast('Booking deleted'); location.replace('#/tickets'); route(); },
    theme: function () { var d = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', d); store.set('theme', d); rerender(); },
    logout: function () { auth.logout(); loginMode = 'login'; toast('Logged out'); rerender(); },
    'del-account': function (b) {
      if (b.getAttribute('data-sure')) { auth.remove(); toast('Account deleted'); rerender(); }
      else { b.setAttribute('data-sure', '1'); b.querySelector('b').textContent = 'Tap again to delete the account and its bookings'; }
    },
    'login-mode': function (b) { loginMode = b.getAttribute('data-m'); rerender(); }
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
    else if (window.Capacitor && Capacitor.nativePromise) Capacitor.nativePromise('App', 'exitApp', {});
  }
  try { if (window.Capacitor && Capacitor.addListener) Capacitor.addListener('App', 'backButton', onBack); } catch (err) {}

  var theme = store.get('theme', null) || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  PLACES.forEach(function (p) { if (!BYNAME[p[1]]) console.error('Unknown station for place', p); });
  window.__app = { state: state, E: E, auth: auth };
  route();
})();
