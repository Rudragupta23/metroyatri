/* Interactive network map drawn from track geometry. Pan with one finger, pinch or use +/- to zoom. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function pathOf(p) { return 'M' + p.map(function (q) { return q[0] + ' ' + q[1]; }).join('L'); }

  function MetroMap(host, data, engine, opts) {
    this.host = host; this.data = data; this.engine = engine; this.opts = opts || {};
    this.route = null; this.picked = null;
    var S = data.stations, self = this, xs = [], ys = [];
    Object.keys(S).forEach(function (k) { xs.push(S[k].x); ys.push(S[k].y); });
    this.bounds = { x0: Math.min.apply(0, xs) - 3, y0: Math.min.apply(0, ys) - 3, x1: Math.max.apply(0, xs) + 3, y1: Math.max.apply(0, ys) + 3 };
    this.svg = el('svg', { 'class': 'mapsvg', role: 'img', 'aria-label': 'Delhi Metro network map' }, host);
    this.gBase = el('g', { 'class': 'base' }, this.svg);
    this.gLines = el('g', {}, this.gBase);
    this.gDots = el('g', {}, this.gBase);
    this.gHi = el('g', { 'class': 'hi' }, this.svg);
    this.gLabels = el('g', { 'class': 'labels' }, this.svg);
    this.gHiLabels = el('g', { 'class': 'labels hilabels' }, this.svg);

    data.segs.forEach(function (s) {
      el('path', { d: pathOf(s.p), stroke: engine.lines[s.l].color, 'class': 'ln' }, self.gLines);
    });
    this.dots = {}; this.labels = {};
    Object.keys(S).forEach(function (id) {
      var st = S[id], groups = {}, major;
      st.lines.forEach(function (l) { groups[engine.lines[l].g] = 1; });
      major = Object.keys(groups).length > 1;
      var term = st.lines.some(function (l) { var a = engine.lines[l]; return !a.loop && (a.st[0] === id || a.st[a.st.length - 1] === id); });
      var c = el('circle', { cx: st.x, cy: st.y, 'class': 'dot' + (major ? ' x' : ''), stroke: major ? 'var(--ink)' : engine.lines[st.lines[0]].color }, self.gDots);
      var hit = el('circle', { cx: st.x, cy: st.y, 'class': 'hit', 'data-id': id }, self.gDots);
      var t = el('text', { x: st.x, y: st.y, 'class': 'lb t' + (major ? 0 : term ? 1 : 2) }, self.gLabels);
      t.textContent = st.n;
      self.dots[id] = { c: c, hit: hit, major: major }; self.labels[id] = t;
    });
    this.view = null;
    this.bind();
    this.fit();
    if (window.ResizeObserver) new ResizeObserver(function () { self.apply(); }).observe(host);
  }

  MetroMap.prototype.size = function () { return { w: this.host.clientWidth || 360, h: this.host.clientHeight || 520 }; };

  MetroMap.prototype.fit = function (box, pad) {
    var b = box || this.bounds, sz = this.size();
    var w = b.x1 - b.x0, h = b.y1 - b.y0, p = pad === undefined ? 0 : pad;
    w += p * 2; h += p * 2;
    var ar = sz.w / sz.h;
    if (w / h < ar) w = h * ar; else h = w / ar;
    var min = 2.2; if (w < min) { w = min; h = w / ar; }
    this.view = { x: (b.x0 + b.x1) / 2 - w / 2, y: (b.y0 + b.y1) / 2 - h / 2, w: w, h: h };
    this.apply();
  };

  MetroMap.prototype.apply = function () {
    var v = this.view, sz = this.size(), B = this.bounds;
    if (!v || !sz.w) return;
    var ar = sz.w / sz.h, maxW = Math.max(B.x1 - B.x0, (B.y1 - B.y0) * ar) * 1.15;
    v.w = Math.max(1.6, Math.min(maxW, v.w)); v.h = v.w / ar;
    v.x = Math.max(B.x0 - v.w * 0.6, Math.min(B.x1 - v.w * 0.4, v.x));
    v.y = Math.max(B.y0 - v.h * 0.6, Math.min(B.y1 - v.h * 0.4, v.y));
    this.svg.setAttribute('viewBox', v.x + ' ' + v.y + ' ' + v.w + ' ' + v.h);
    var u = v.w / sz.w;                    // map units per screen pixel
    var ppk = 1 / u;                       // pixels per km
    var st = this.svg.style;
    st.setProperty('--u', u);
    st.setProperty('--lw', Math.max(2.2, Math.min(5, ppk * 0.16)) * u);
    st.setProperty('--r', Math.max(1.6, Math.min(5.5, ppk * 0.22)) * u);
    st.setProperty('--fs', 11.5 * u);
    this.svg.setAttribute('data-z', ppk > 30 ? 3 : ppk > 15 ? 2 : ppk > 7 ? 1 : 0);
    var off = (Math.max(1.6, Math.min(5.5, ppk * 0.22)) + 4) * u, id;
    for (id in this.labels) { this.labels[id].setAttribute('dx', off); this.labels[id].setAttribute('dy', 3.6 * u); }
    var hl = this.gHiLabels.childNodes;
    for (var i = 0; i < hl.length; i++) { hl[i].setAttribute('dx', off + 2 * u); hl[i].setAttribute('dy', 3.6 * u); }
  };

  MetroMap.prototype.zoom = function (f, cx, cy) {
    var v = this.view, sz = this.size();
    if (cx === undefined) { cx = sz.w / 2; cy = sz.h / 2; }
    var mx = v.x + cx / sz.w * v.w, my = v.y + cy / sz.h * v.h;
    v.w *= f; v.h *= f;
    v.x = mx - cx / sz.w * v.w; v.y = my - cy / sz.h * v.h;
    this.apply();
  };

  MetroMap.prototype.bind = function () {
    var self = this, pts = {}, last = null, moved = 0, downId = null;
    var svg = this.svg;
    function rel(e) { var r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    svg.addEventListener('pointerdown', function (e) {
      svg.setPointerCapture && svg.setPointerCapture(e.pointerId);
      pts[e.pointerId] = rel(e); moved = 0; last = null;
      downId = e.target.getAttribute && e.target.getAttribute('data-id');
    });
    svg.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      var p = rel(e), ids = Object.keys(pts), v = self.view, sz = self.size();
      if (ids.length === 1) {
        var o = pts[e.pointerId];
        v.x -= (p.x - o.x) * v.w / sz.w; v.y -= (p.y - o.y) * v.h / sz.h;
        moved += Math.abs(p.x - o.x) + Math.abs(p.y - o.y);
        pts[e.pointerId] = p; self.apply();
      } else if (ids.length === 2) {
        pts[e.pointerId] = p;
        var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (last) {
          v.x -= (c.x - last.c.x) * v.w / sz.w; v.y -= (c.y - last.c.y) * v.h / sz.h;
          if (d > 0 && last.d > 0) self.zoom(last.d / d, c.x, c.y); else self.apply();
        }
        last = { d: d, c: c }; moved += 10;
      }
    });
    function up(e) {
      if (!pts[e.pointerId]) return;
      delete pts[e.pointerId]; last = null;
      if (moved < 8 && downId && self.opts.onStation) self.opts.onStation(downId);
      downId = null;
    }
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', function (e) { delete pts[e.pointerId]; last = null; });
    svg.addEventListener('wheel', function (e) { e.preventDefault(); var p = rel(e); self.zoom(e.deltaY > 0 ? 1.18 : 0.85, p.x, p.y); }, { passive: false });
  };

  /* Highlight a planned route along the real line, dim everything else. */
  MetroMap.prototype.setRoute = function (route) {
    var S = this.data.stations, self = this;
    this.route = route;
    this.gHi.textContent = ''; this.gHiLabels.textContent = '';
    this.svg.classList.toggle('hasroute', !!route);
    if (!route) { this.apply(); return; }
    var xs = [], ys = [];
    route.legs.forEach(function (leg) {
      leg.segs.forEach(function (i) {
        var s = self.data.segs[i];
        el('path', { d: pathOf(s.p), 'class': 'case' }, self.gHi);
        s.p.forEach(function (q) { xs.push(q[0]); ys.push(q[1]); });
      });
    });
    route.legs.forEach(function (leg) {
      leg.segs.forEach(function (i) { el('path', { d: pathOf(self.data.segs[i].p), stroke: leg.color, 'class': 'rt' }, self.gHi); });
    });
    route.legs.forEach(function (leg, li) {
      leg.stations.forEach(function (id, i) {
        var st = S[id], endp = (li === 0 && i === 0) || (li === route.legs.length - 1 && i === leg.stations.length - 1);
        var chg = !endp && (i === 0 || i === leg.stations.length - 1);
        if (i === 0 && li > 0) return;
        el('circle', { cx: st.x, cy: st.y, 'class': 'rdot' + (endp ? ' end' : chg ? ' chg' : ''), stroke: leg.color }, self.gHi);
        var t = el('text', { x: st.x, y: st.y, 'class': 'lb ' + (endp || chg ? 'key' : 'mid') }, self.gHiLabels);
        t.textContent = st.n;
      });
    });
    this.fit({ x0: Math.min.apply(0, xs), x1: Math.max.apply(0, xs), y0: Math.min.apply(0, ys), y1: Math.max.apply(0, ys) }, 0);
    this.zoom(1.35);
  };

  MetroMap.prototype.pick = function (id) {
    if (this.picked) this.dots[this.picked].c.classList.remove('picked');
    this.picked = id;
    if (id) this.dots[id].c.classList.add('picked');
  };

  MetroMap.prototype.focus = function (id) {
    var st = this.data.stations[id];
    this.fit({ x0: st.x - 2.2, x1: st.x + 2.2, y0: st.y - 2.2, y1: st.y + 2.2 }, 0);
    this.pick(id);
  };

  window.MetroMap = MetroMap;
})();
