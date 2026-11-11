/* Route finding, distance, time and fare for one city. Works in the app and in Node (for tests). */
(function (root) {
  'use strict';
  var START_WAIT = 3;      // average wait for the first train

  function Engine(data, cfg) {
    var self = this;
    this.data = data; this.cfg = cfg;
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
          var soft = cfg.soft[a + '|' + b];
          link(id + '|' + a, id + '|' + b, { km: 0, min: soft ? 0 : cfg.xferMin, line: null, x: soft ? 0 : 1 });
        });
      });
    });
  }

  Engine.prototype.search = function (from, to, mode, opts) {
    opts = opts || {};
    var S = this.data.stations, adj = this.adj, P = this.cfg.premium, skip = opts.noPremium && P ? P.line : null;
    if (!S[from] || !S[to]) return null;
    var dist = {}, prev = {}, done = {}, heap = [];
    function push(n, d) { heap.push([d, n]); var i = heap.length - 1; while (i > 0) { var p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; var t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; } }
    function pop() { var top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; var i = 0; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; var t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m; } } return top; }
    function w(e) {
      if (mode === 'fast') return e.min + e.x * 0.01;
      if (mode === 'easy') return e.x * 1000 + e.min;
      return e.km + e.x * 0.001 + e.min * 1e-6;
    }
    S[from].lines.forEach(function (l) { if (l === skip) return; dist[from + '|' + l] = 0; push(from + '|' + l, 0); });
    var end = null;
    while (heap.length) {
      var it = pop(), n = it[1];
      if (done[n]) continue; done[n] = 1;
      if (n.split('|')[0] === to) { end = n; break; }
      (adj[n] || []).forEach(function (e) {
        if (skip && (e.line === skip || e.to.split('|')[1] === skip)) return;
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
    var L = this.lines, cfg = this.cfg, legs = [], cur = null, km = 0, min = START_WAIT, changes = 0, segs = [];
    steps.forEach(function (st) {
      var e = st.e;
      if (!e.line) { if (e.x) { changes++; min += e.min; } return; }
      var a = st.n.split('|')[0], b = e.to.split('|')[0];
      var softJoin = cur && cur.lastLine !== e.line && cfg.soft[cur.lastLine + '|' + e.line] && cur.stations[cur.stations.length - 1] === a;
      if (!cur || (cur.lastLine !== e.line && !softJoin)) {
        cur = { group: L[e.line].g, color: L[e.line].color, text: L[e.line].text, lines: [e.line], lastLine: e.line, stations: [a], km: 0, min: 0, segs: [] };
        legs.push(cur);
      } else if (softJoin) { cur.lines.push(e.line); cur.lastLine = e.line; }
      cur.stations.push(b); cur.km += e.km; cur.min += e.min; cur.segs.push(e.seg);
      cur.lastA = a; cur.lastB = b;
      km += e.km; min += e.min; segs.push(e.seg);
    });
    var self = this, P = cfg.premium;
    legs.forEach(function (leg) {
      leg.name = self.groupName(leg.group);
      leg.towards = self.towards(leg);
      leg.from = leg.stations[0]; leg.to = leg.stations[leg.stations.length - 1];
      leg.note = leg.lines.map(function (l) { return L[l].note; }).filter(Boolean)[0] || '';
    });
    var stops = legs.reduce(function (n, l) { return n + l.stations.length - 1; }, 0);
    return { from: from, to: to, legs: legs, km: km, min: Math.round(min), changes: changes, stops: stops, segs: segs,
      usesPremium: !!P && legs.some(function (l) { return l.group === P.line; }) };
  };

  Engine.prototype.groupName = function (g) { return this.cfg.groupNames[g] || g; };

  Engine.prototype.towards = function (leg) {
    var S = this.data.stations, cfg = this.cfg, line = this.lines[leg.lastLine], st = line.st;
    var ia = st.indexOf(leg.lastA), ib = st.indexOf(leg.lastB), n = st.length;
    if (line.loop) return 'ring train, next stop ' + S[leg.stations[1]].n;
    var dir = ib - ia > 0 ? 1 : -1;
    var t = cfg.trunk[leg.lastLine];
    if (t && leg.lines.length === 1 && dir === t.dir) {
      var j = st.indexOf(t.at);
      if ((dir > 0 && ib <= j) || (dir < 0 && ib >= j)) return 'towards ' + t.text;
    }
    return 'towards ' + (cfg.term[leg.lastLine + '|' + dir] || S[dir > 0 ? st[n - 1] : st[0]].n);
  };

  Engine.prototype.premiumOnly = function (id) {
    var P = this.cfg.premium, l = this.data.stations[id].lines;
    return !!P && l.length === 1 && l[0] === P.line;
  };

  /* Normal fare follows the shortest route on the regular lines, whichever route is ridden.
     If the journey rides a premium line (Delhi Airport Express), that part is charged from its own table. */
  Engine.prototype.fare = function (route) {
    var SL = this.cfg.slabs, P = this.cfg.premium;
    function slab(km, col) { for (var i = 0; i < SL.length; i++) if (km <= SL[i][0]) return SL[i][col]; }
    var pFirst = null, pLast = null, normalKm = 0;
    if (route.usesPremium) {
      route.legs.forEach(function (l) {
        if (l.group === P.line) { if (!pFirst) pFirst = l.from; pLast = l.to; } else normalKm += l.km;
      });
    } else {
      var s = route.mode === 'short' ? route : this.search(route.from, route.to, 'short', { noPremium: true });
      normalKm = s.km;
    }
    var pf = pFirst ? P.fares[P.order.indexOf(pFirst)][P.order.indexOf(pLast)] : 0;
    var nw = normalKm > 0 ? slab(normalKm, 1) : 0, nh = normalKm > 0 ? slab(normalKm, 2) : 0;
    return { km: normalKm, weekday: nw + pf, holiday: nh + pf, premium: pf, estimate: !!pFirst };
  };

  /* opts.premium: true = may use the premium line. It is always allowed when a journey starts or ends on it. */
  Engine.prototype.plan = function (from, to, mode, opts) {
    opts = opts || {};
    if (from === to) return null;
    var must = this.premiumOnly(from) || this.premiumOnly(to);
    var r = this.search(from, to, mode || 'short', { noPremium: !(opts.premium || must) });
    if (!r) return null;
    r.mode = mode || 'short';
    r.fare = this.fare(r);
    r.premiumForced = must;
    return r;
  };

  Engine.haversine = function (a, b, c, d) {
    var p = Math.PI / 180, h = Math.pow(Math.sin((c - a) * p / 2), 2) + Math.cos(a * p) * Math.cos(c * p) * Math.pow(Math.sin((d - b) * p / 2), 2);
    return 12742 * Math.asin(Math.sqrt(h));
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine; else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
