/* Route finding, distance, time and fare. Works in the app and in Node (for tests). */
(function (root) {
  'use strict';
  var XFER_MIN = 7;        // walk + wait at an interchange
  var START_WAIT = 3;      // average wait for the first train
  // lines whose trains run through onto each other (no change of train needed)
  var SOFT = { 'blue|blueb': 1, 'blueb|blue': 1, 'green|greenb': 1, 'greenb|green': 1 };
  // where two services share track: either train works until the junction
  var TRUNK = {
    blue: { at: 'yamuna-bank', dir: 1, text: 'Noida Electronic City or Vaishali' },
    green: { at: 'ashok-park-main', dir: -1, text: 'Inderlok or Kirti Nagar' }
  };
  var TERM = { 'blueb|-1': 'Dwarka Sector 21', 'greenb|1': 'Brigadier Hoshiyar Singh' };

  // Fares in force since 25 Aug 2025
  var SLABS = [[2, 11, 11], [5, 21, 11], [12, 32, 21], [21, 43, 32], [32, 54, 43], [Infinity, 64, 54]];
  // Airport Express has its own table. Values to/from IGI Airport are published; the rest are estimates.
  var AE_ORDER = ['new-delhi', 'shivaji-stadium', 'dhaula-kuan', 'delhi-aerocity', 'indira-gandhi-international-airport', 'dwarka-sector-21', 'yashobhoomi-dwarka-sector-25'];
  var AE_FARE = [
    [0, 21, 43, 54, 64, 64, 75],
    [21, 0, 32, 54, 54, 64, 64],
    [43, 32, 0, 32, 32, 54, 54],
    [54, 54, 32, 0, 21, 32, 43],
    [64, 54, 32, 21, 0, 21, 32],
    [64, 64, 54, 32, 21, 0, 21],
    [75, 64, 54, 43, 32, 21, 0]
  ];

  function Engine(data) {
    var self = this;
    this.data = data;
    this.lines = {};
    data.lines.forEach(function (l) { self.lines[l.id] = l; });
    this.adj = {};
    function link(a, b, e) { (self.adj[a] = self.adj[a] || []).push({ to: b, km: e.km, min: e.min, line: e.line, x: e.x || 0, seg: e.seg }); }
    data.segs.forEach(function (s, i) {
      link(s.a + '|' + s.l, s.b + '|' + s.l, { km: s.km, min: s.min, line: s.l, seg: i });
      link(s.b + '|' + s.l, s.a + '|' + s.l, { km: s.km, min: s.min, line: s.l, seg: i });
    });
    Object.keys(data.stations).forEach(function (id) {
      var ls = data.stations[id].lines;
      ls.forEach(function (a) {
        ls.forEach(function (b) {
          if (a === b) return;
          var soft = SOFT[a + '|' + b];
          link(id + '|' + a, id + '|' + b, { km: 0, min: soft ? 0 : XFER_MIN, line: null, x: soft ? 0 : 1 });
        });
      });
    });
  }

  Engine.prototype.search = function (from, to, mode, opts) {
    opts = opts || {};
    var S = this.data.stations, adj = this.adj;
    if (!S[from] || !S[to]) return null;
    var dist = {}, prev = {}, done = {}, heap = [];
    function push(n, d) { heap.push([d, n]); var i = heap.length - 1; while (i > 0) { var p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; var t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; } }
    function pop() { var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; var i = 0; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; var t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } } return top; }
    function w(e) {
      if (mode === 'fast') return e.min + e.x * 0.01;
      if (mode === 'easy') return e.x * 1000 + e.min;
      return e.km + e.x * 0.001 + e.min * 1e-6;
    }
    S[from].lines.forEach(function (l) { if (opts.noAirport && l === 'airport') return; dist[from + '|' + l] = 0; push(from + '|' + l, 0); });
    var end = null;
    while (heap.length) {
      var it = pop(), n = it[1];
      if (done[n]) continue; done[n] = 1;
      if (n.split('|')[0] === to) { end = n; break; }
      (adj[n] || []).forEach(function (e) {
        if (opts.noAirport && (e.line === 'airport' || e.to.split('|')[1] === 'airport')) return;
        var d = it[0] + w(e);
        if (dist[e.to] === undefined || d < dist[e.to]) { dist[e.to] = d; prev[e.to] = { n: n, e: e }; push(e.to, d); }
      });
    }
    if (!end) return null;
    var steps = [];
    for (var c = end; prev[c]; c = prev[c].n) steps.unshift(prev[c]);
    return this.describe(from, to, steps);
  };

  Engine.prototype.describe = function (from, to, steps) {
    var S = this.data.stations, L = this.lines, legs = [], cur = null, km = 0, min = START_WAIT, changes = 0, segs = [];
    steps.forEach(function (st) {
      var e = st.e;
      if (!e.line) { if (e.x) { changes++; min += e.min; } return; }
      var a = st.n.split('|')[0], b = e.to.split('|')[0];
      var softJoin = cur && cur.lastLine !== e.line && SOFT[cur.lastLine + '|' + e.line] && cur.stations[cur.stations.length - 1] === a;
      if (!cur || (cur.lastLine !== e.line && !softJoin)) {
        cur = { group: L[e.line].g, color: L[e.line].color, text: L[e.line].text, lines: [e.line], lastLine: e.line, stations: [a], km: 0, min: 0, segs: [] };
        legs.push(cur);
      } else if (softJoin) { cur.lines.push(e.line); cur.lastLine = e.line; }
      cur.stations.push(b); cur.km += e.km; cur.min += e.min; cur.segs.push(e.seg);
      cur.lastA = a; cur.lastB = b;
      km += e.km; min += e.min; segs.push(e.seg);
    });
    var self = this;
    legs.forEach(function (leg) {
      leg.name = self.groupName(leg.group);
      leg.towards = self.towards(leg);
      leg.from = leg.stations[0]; leg.to = leg.stations[leg.stations.length - 1];
      leg.note = leg.lines.map(function (l) { return L[l].note; }).filter(Boolean)[0] || '';
    });
    var stops = legs.reduce(function (n, l) { return n + l.stations.length - 1; }, 0);
    return { from: from, to: to, legs: legs, km: km, min: Math.round(min), changes: changes, stops: stops, segs: segs,
      usesAirport: legs.some(function (l) { return l.group === 'airport'; }) };
  };

  Engine.prototype.groupName = function (g) {
    return { red: 'Red Line', yellow: 'Yellow Line', blue: 'Blue Line', green: 'Green Line', violet: 'Violet Line', pink: 'Pink Line', magenta: 'Magenta Line', grey: 'Grey Line', airport: 'Airport Express' }[g];
  };

  Engine.prototype.towards = function (leg) {
    var S = this.data.stations, line = this.lines[leg.lastLine], st = line.st;
    var ia = st.indexOf(leg.lastA), ib = st.indexOf(leg.lastB), n = st.length;
    var dir = ib - ia;
    if (line.loop) {
      if (dir === n - 1) dir = -1; else if (dir === -(n - 1)) dir = 1;
      return 'ring train, next stop ' + S[leg.stations[1]].n;
    }
    dir = dir > 0 ? 1 : -1;
    var t = TRUNK[leg.lastLine];
    if (t && leg.lines.length === 1 && dir === t.dir) {
      var j = st.indexOf(t.at);
      if ((dir > 0 && ib <= j) || (dir < 0 && ib >= j)) return 'towards ' + t.text;
    }
    return 'towards ' + (TERM[leg.lastLine + '|' + dir] || S[dir > 0 ? st[n - 1] : st[0]].n);
  };

  Engine.prototype.airportOnly = function (id) {
    var l = this.data.stations[id].lines; return l.length === 1 && l[0] === 'airport';
  };

  /* Normal fare follows the shortest route on the regular lines, whichever route is ridden.
     If the journey rides the Airport Express, that part is charged from its own table. */
  Engine.prototype.fare = function (route) {
    function slab(km, col) { for (var i = 0; i < SLABS.length; i++) if (km <= SLABS[i][0]) return SLABS[i][col]; }
    var aeFirst = null, aeLast = null, normalKm = 0;
    if (route.usesAirport) {
      route.legs.forEach(function (l) {
        if (l.group === 'airport') { if (!aeFirst) aeFirst = l.from; aeLast = l.to; } else normalKm += l.km;
      });
    } else {
      var s = route.mode === 'short' ? route : this.search(route.from, route.to, 'short', { noAirport: true });
      normalKm = s.km;
    }
    var ae = aeFirst ? AE_FARE[AE_ORDER.indexOf(aeFirst)][AE_ORDER.indexOf(aeLast)] : 0;
    var nw = normalKm > 0 ? slab(normalKm, 1) : 0, nh = normalKm > 0 ? slab(normalKm, 2) : 0;
    return { km: normalKm, weekday: nw + ae, holiday: nh + ae, airport: ae, estimate: !!aeFirst };
  };

  /* opts.airport: true = may use Airport Express. It is always allowed when a journey starts or ends on it. */
  Engine.prototype.plan = function (from, to, mode, opts) {
    opts = opts || {};
    if (from === to) return null;
    var must = this.airportOnly(from) || this.airportOnly(to);
    var r = this.search(from, to, mode || 'short', { noAirport: !(opts.airport || must) });
    if (!r) return null;
    r.mode = mode || 'short';
    r.fare = this.fare(r);
    r.airportForced = must;
    return r;
  };

  Engine.SLABS = SLABS;
  Engine.haversine = function (a, b, c, d) {
    var p = Math.PI / 180, h = Math.pow(Math.sin((c - a) * p / 2), 2) + Math.cos(a * p) * Math.cos(c * p) * Math.pow(Math.sin((d - b) * p / 2), 2);
    return 12742 * Math.asin(Math.sqrt(h));
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine; else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
