/* Metro lines drawn over a real street map (Leaflet). Without internet the lines still show on a plain background. */
(function () {
  'use strict';
  var L = window.L;

  function MetroMap(host, data, engine, opts) {
    var self = this, P = data.meta.proj, S = data.stations;
    this.host = host; this.data = data; this.engine = engine; this.opts = opts || {};
    this.ll = function (p) { return [P.lat0 - p[1] / P.ky, P.lon0 + p[0] / P.kx]; };
    this.picked = null; this.routeLayer = null; this.me = null;

    var lats = [], lons = [];
    Object.keys(S).forEach(function (k) { lats.push(S[k].lat); lons.push(S[k].lon); });
    this.bounds = L.latLngBounds([Math.min.apply(0, lats), Math.min.apply(0, lons)], [Math.max.apply(0, lats), Math.max.apply(0, lons)]);

    var map = this.map = L.map(host, { zoomControl: false, attributionControl: false, minZoom: 9, maxZoom: 17, zoomSnap: 0.25, zoomDelta: 1,
      maxBounds: this.bounds.pad(0.6), maxBoundsViscosity: 0.8, preferCanvas: true });
    L.control.attribution({ prefix: false, position: 'bottomleft' }).addTo(map);
    ['base', 'route', 'dots'].forEach(function (n, i) { map.createPane(n).style.zIndex = 410 + i * 10; });
    this.rBase = L.canvas({ pane: 'base', tolerance: 6 }); this.rRoute = L.canvas({ pane: 'route' }); this.rDots = L.canvas({ pane: 'dots', tolerance: 10 });

    this.tileLayer = null;
    this.setTiles(this.opts.tiles !== false);

    this.lines = data.segs.map(function (s) {
      return L.polyline(s.p.map(self.ll), { renderer: self.rBase, color: engine.lines[s.l].color, weight: 4, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
    });
    this.dots = {}; this.labelTiers = [L.layerGroup(), L.layerGroup(), L.layerGroup()];
    Object.keys(S).forEach(function (id) {
      var st = S[id], groups = {};
      st.lines.forEach(function (l) { groups[engine.lines[l].g] = 1; });
      var major = Object.keys(groups).length > 1;
      var term = st.lines.some(function (l) { var a = engine.lines[l]; return !a.loop && (a.st[0] === id || a.st[a.st.length - 1] === id); });
      var dot = L.circleMarker([st.lat, st.lon], { renderer: self.rDots, radius: major ? 5 : 3.5, weight: major ? 2.5 : 2, color: major ? '#171A21' : engine.lines[st.lines[0]].color, fillColor: '#fff', fillOpacity: 1 }).addTo(map);
      dot.on('click', function () { if (self.opts.onStation) self.opts.onStation(id); });
      self.dots[id] = { m: dot, major: major, color: dot.options.color };
      L.marker([st.lat, st.lon], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'mlb' + (major ? ' mj' : ''), html: '<span>' + esc(self.opts.name ? self.opts.name(id, st) : st.n) + '</span>', iconSize: [0, 0] }) })
        .addTo(self.labelTiers[major ? 0 : term ? 1 : 2]);
    });
    map.on('zoomend', function () { self.restyle(); });
    this.fit();
    this.restyle();
    if (window.ResizeObserver) { this.ro = new ResizeObserver(function () { map.invalidateSize(); }); this.ro.observe(host); }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  MetroMap.prototype.setTiles = function (on) {
    var cfg = (window.APP_CONFIG || {}).tiles, self = this;
    if (this.tileLayer) { this.map.removeLayer(this.tileLayer); this.tileLayer = null; }
    this.host.classList.toggle('plain', !on);
    if (!on || !cfg || !cfg.url) return;
    var ok = 0, bad = 0, told = false;
    this.tileLayer = L.tileLayer(cfg.url, { attribution: cfg.credit, maxZoom: 19, maxNativeZoom: cfg.maxZoom || 19, subdomains: cfg.subdomains || 'abc', referrerPolicy: 'origin' }).addTo(this.map);
    this.tileLayer.on('tileload', function () { ok++; });
    this.tileLayer.on('tileerror', function () {
      bad++;
      if (!told && !ok && bad >= 6 && self.opts.onTilesFailed) { told = true; self.opts.onTilesFailed(navigator.onLine === false); }
    });
    this.tileLayer.bringToBack();
  };

  MetroMap.prototype.restyle = function () {
    var z = this.map.getZoom(), self = this, w = z < 10.5 ? 2.5 : z < 12 ? 3.5 : z < 14 ? 4.5 : 6;
    this.lines.forEach(function (l) { l.setStyle({ weight: w }); });
    var small = this.data.meta.stations < 80;       // small networks can show names earlier
    var show = [z >= (small ? 10.5 : 11.5), z >= (small ? 11.5 : 12.5), z >= (small ? 12.5 : 13.5)];
    Object.keys(this.dots).forEach(function (id) {
      var d = self.dots[id];
      d.m.setStyle({ radius: d.major ? (z < 11 ? 4 : 6) : (z < 11 ? 0 : z < 12.5 ? 3 : 4.5), opacity: !d.major && z < 11 ? 0 : 1, fillOpacity: !d.major && z < 11 ? 0 : 1 });
    });
    this.labelTiers.forEach(function (g, i) {
      var want = show[i] && !self.routeLayer;
      if (want && !self.map.hasLayer(g)) g.addTo(self.map); else if (!want && self.map.hasLayer(g)) self.map.removeLayer(g);
    });
    if (this.routeLabels) {
      var all = z >= 12.5;
      this.host.classList.toggle('route-mid', all);
    }
  };

  MetroMap.prototype.fit = function () {
    var c = this.opts.center;
    if (c) this.map.setView(c.at, c.zoom, { animate: false }); else this.map.fitBounds(this.bounds, { padding: [20, 20], animate: false });
  };
  MetroMap.prototype.zoom = function (d) { this.map.setZoom(this.map.getZoom() + d); };

  /* Highlight a planned route along the line and fade the rest of the network. */
  MetroMap.prototype.setRoute = function (route) {
    var S = this.data.stations, self = this, map = this.map;
    if (this.routeLayer) { map.removeLayer(this.routeLayer); this.routeLayer = null; this.routeLabels = null; }
    map.getPane('base').style.opacity = route ? 0.28 : 1;
    map.getPane('dots').style.opacity = route ? 0.28 : 1;
    this.host.classList.toggle('routed', !!route);
    if (!route) { this.restyle(); return; }
    var g = this.routeLayer = L.layerGroup().addTo(map), pts = [];
    route.legs.forEach(function (leg) {
      leg.segs.forEach(function (i) {
        var p = self.data.segs[i].p.map(self.ll); pts = pts.concat(p);
        L.polyline(p, { renderer: self.rRoute, color: '#ffffff', weight: 12, opacity: 0.9, lineCap: 'round', interactive: false }).addTo(g);
      });
    });
    route.legs.forEach(function (leg) {
      leg.segs.forEach(function (i) {
        L.polyline(self.data.segs[i].p.map(self.ll), { renderer: self.rRoute, color: leg.color, weight: 7, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(g);
      });
    });
    this.routeLabels = true;
    route.legs.forEach(function (leg, li) {
      leg.stations.forEach(function (id, i) {
        var st = S[id], endp = (li === 0 && i === 0) || (li === route.legs.length - 1 && i === leg.stations.length - 1);
        var chg = !endp && (i === 0 || i === leg.stations.length - 1);
        if (i === 0 && li > 0) return;
        var m = L.circleMarker([st.lat, st.lon], { renderer: self.rRoute, radius: endp ? 8 : chg ? 6.5 : 4, weight: endp ? 3 : chg ? 3 : 2, color: endp || chg ? '#171A21' : leg.color, fillColor: endp ? '#FFB300' : '#fff', fillOpacity: 1 }).addTo(g);
        m.on('click', function () { if (self.opts.onStation) self.opts.onStation(id); });
        L.marker([st.lat, st.lon], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'mlb rt ' + (endp || chg ? 'key' : 'mid'), html: '<span>' + esc(self.opts.name ? self.opts.name(id, st) : st.n) + '</span>', iconSize: [0, 0] }) }).addTo(g);
      });
    });
    map.fitBounds(L.latLngBounds(pts), { padding: [46, 46], animate: false });
    this.restyle();
  };

  MetroMap.prototype.pick = function (id) {
    if (this.picked && this.dots[this.picked]) this.dots[this.picked].m.setStyle({ fillColor: '#fff' });
    this.picked = id;
    if (id && this.dots[id]) this.dots[id].m.setStyle({ fillColor: '#FFB300' }).bringToFront();
  };
  MetroMap.prototype.focus = function (id) {
    var st = this.data.stations[id];
    this.map.setView([st.lat, st.lon], 14.5, { animate: false });
    this.pick(id);
  };
  MetroMap.prototype.showMe = function (lat, lon) {
    if (this.me) this.map.removeLayer(this.me);
    this.me = L.circleMarker([lat, lon], { radius: 8, weight: 3, color: '#fff', fillColor: '#1A73E8', fillOpacity: 1, interactive: false }).addTo(this.map);
  };
  MetroMap.prototype.destroy = function () { if (this.ro) this.ro.disconnect(); this.map.remove(); };

  window.MetroMap = MetroMap;
})();
