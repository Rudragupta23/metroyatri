#!/usr/bin/env python3
"""Builds www/js/data-bengaluru.js from the community BMRCL GTFS (github.com/Vonter/bmrcl-gtfs).
Usage: python3 -I build_bengaluru.py <gtfs_dir> <out.js>"""
import csv, json, math, re, sys, collections
GTFS, OUT = sys.argv[1], sys.argv[2]
LAT0, LON0 = 12.97, 77.59
KX = 111.32 * math.cos(math.radians(LAT0)); KY = 110.95
proj = lambda la, lo: ((lo - LON0) * KX, (LAT0 - la) * KY)
slug = lambda n: re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')
rd = lambda f: list(csv.DictReader(open(f'{GTFS}/{f}', encoding='utf-8-sig')))
stops = {r['stop_id']: r for r in rd('stops.txt')}
def station(sid):
    s = stops[sid]
    return stops[s['parent_station']] if s.get('parent_station') else s
trips = collections.defaultdict(list)
for r in rd('trips.txt'): trips[r['route_id']].append(r)
st = collections.defaultdict(list)
for r in rd('stop_times.txt'): st[r['trip_id']].append(r)
shapes = collections.defaultdict(list)
for r in rd('shapes.txt'):
    shapes[r['shape_id']].append((float(r.get('shape_dist_traveled') or 0), int(r['shape_pt_sequence']), float(r['shape_pt_lat']), float(r['shape_pt_lon'])))
def hav(a, b):
    p = math.pi / 180
    h = math.sin((b[0]-a[0])*p/2)**2 + math.cos(a[0]*p)*math.cos(b[0]*p)*math.sin((b[1]-a[1])*p/2)**2
    return 12742 * math.asin(math.sqrt(h))
def tsec(t): h, m, s = map(int, t.split(':')); return h*3600 + m*60 + s
def simplify(pts, tol):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]; dx, dy = x2-x1, y2-y1; L = math.hypot(dx, dy) or 1e-9
    imax, dmax = 0, 0
    for i in range(1, len(pts)-1):
        d = abs(dy*(pts[i][0]-x1) - dx*(pts[i][1]-y1)) / L
        if d > dmax: imax, dmax = i, d
    if dmax <= tol: return [pts[0], pts[-1]]
    return simplify(pts[:imax+1], tol)[:-1] + simplify(pts[imax:], tol)

UNDER = {'purple': ['Cubbon Park', 'Vidhana Soudha', 'Central College', 'Majestic', 'Railway Station'], 'green': ['Majestic', 'Chickpete', 'Krishna Rajendra Market']}
OPENED = {'yellow': '2025-08-10'}
COL = {'PURPLE': ('purple', 'Purple Line', '#8C2877', '#fff'), 'GREEN': ('green', 'Green Line', '#1B9A46', '#fff'), 'YELLOW': ('yellow', 'Yellow Line', '#F2C200', '#1b1b1b')}
stations, lines, segs = {}, [], []
for rid in ['PURPLE', 'GREEN', 'YELLOW']:
    lid, name, color, text = COL[rid]
    best = max(trips[rid], key=lambda t: len(st[t['trip_id']]))
    seq = sorted(st[best['trip_id']], key=lambda r: int(r['stop_sequence']))
    shp = sorted(shapes[best['shape_id']], key=lambda x: x[1])
    # cumulative distance along the shape (km)
    cum = [0.0]
    for a, b in zip(shp, shp[1:]): cum.append(cum[-1] + hav(a[2:], b[2:]))
    total_shape, total_trip = cum[-1], float(seq[-1]['shape_dist_traveled'])
    ids = []
    for s in seq:
        p = station(s['stop_id']); n = p['stop_name'].strip(); i = slug(n); ids.append(i)
        la, lo = float(p['stop_lat']), float(p['stop_lon']); x, y = proj(la, lo)
        d = stations.setdefault(i, dict(n=n, lat=round(la, 5), lon=round(lo, 5), x=round(x, 3), y=round(y, 3), lines=[], op={}, lay={}))
        d['lines'].append(lid)
        d['lay'][lid] = 'U' if any(k in n for k in UNDER.get(lid, [])) else 'E'
        if lid in OPENED: d['op'][lid] = OPENED[lid]
    lines.append(dict(id=lid, g=lid, name=name, color=color, text=text, st=ids, loop=False))
    for a, b, ia, ib in zip(seq, seq[1:], ids, ids[1:]):
        d1, d2 = float(a['shape_dist_traveled']), float(b['shape_dist_traveled'])
        f1, f2 = d1 / total_trip * total_shape, d2 / total_trip * total_shape
        lo_, hi_ = min(f1, f2), max(f1, f2)
        mid = [(shp[k][2], shp[k][3]) for k in range(len(shp)) if lo_ < cum[k] < hi_]
        if f1 > f2: mid.reverse()
        A, B = stations[ia], stations[ib]
        pts = [(A['x'], A['y'])] + [proj(la, lo) for la, lo in mid] + [(B['x'], B['y'])]
        # drop shape points that are not between the two stations (shape and timetable may run in opposite directions)
        span = math.hypot(A['x']-B['x'], A['y']-B['y'])
        pts = [pts[0]] + [q for q in pts[1:-1] if math.hypot(q[0]-A['x'], q[1]-A['y']) < span * 1.3 and math.hypot(q[0]-B['x'], q[1]-B['y']) < span * 1.3] + [pts[-1]]
        pts = simplify(pts, 0.012)
        mins = (tsec(b['arrival_time']) - tsec(a['arrival_time'])) / 60
        segs.append(dict(l=lid, a=ia, b=ib, km=round(abs(d2 - d1), 3), min=round(mins, 1), p=[[round(x, 3), round(y, 3)] for x, y in pts]))
    print(f"{lid:7s} {len(ids)} stn {total_trip:.1f} km (shape {total_shape:.1f})  {stations[ids[0]]['n']} -> {stations[ids[-1]]['n']}")
# station-to-station fare table from the feed (BMRCL capped some pairs below the distance band in Feb 2025)
price = {r['fare_id']: int(float(r['price'])) for r in rd('fare_attributes.txt')}
code2slug = {sid: slug(r['stop_name'].strip()) for sid, r in stops.items() if not r.get('parent_station')}
ids = sorted(stations)
idx = {i: k for k, i in enumerate(ids)}
grid = [[0] * len(ids) for _ in ids]
for r in rd('fare_rules.txt'):
    a, b = code2slug.get(r['origin_id']), code2slug.get(r['destination_id'])
    if a in idx and b in idx: grid[idx[a]][idx[b]] = price[r['fare_id']] // 10
missing = sum(1 for i in range(len(ids)) for j in range(len(ids)) if i != j and not grid[i][j])
assert missing == 0, missing
fares = dict(ids=ids, step=10, rows=[''.join(str(v) for v in row) for row in grid])
ALIASES = {'Nadaprabhu Kempegowda Station, Majestic': ['Majestic', 'Kempegowda Bus Station'], 'Krantivira Sangolli Rayanna Railway Station': ['KSR Bengaluru', 'City Railway Station', 'SBC'],
           'Mahatma Gandhi Road': ['MG Road'], 'Dr. B. R. Ambedkar Station, Vidhana Soudha': ['Vidhana Soudha'], 'Sir M. Visvesvaraya Stn., Central College': ['Central College'],
           'Krishna Rajendra Market': ['KR Market', 'City Market'], 'Rashtreeya Vidyalaya Road': ['RV Road'], 'Jaya Prakash Nagar': ['JP Nagar'], 'Krishnarajapura': ['KR Puram', 'KR Pura'],
           'Pattandur Agrahara': ['ITPL'], 'Whitefield (Kadugodi)': ['Whitefield'], 'Delta Electronics Bommasandra': ['Bommasandra'], 'Infosys Foundation Konappana Agrahara': ['Konappana Agrahara', 'Infosys'],
           'Sri Balagangadharanatha Swamiji Station, Hosahalli': ['Hosahalli'], 'Baiyappanahalli': ['SMVT', 'Byappanahalli'], 'Yeshwantpur': ['Yeshwanthpur'], 'Central Silk Board': ['Silk Board'],
           'Biocon Hebbagodi': ['Hebbagodi'], 'Mantri Square Sampige Road': ['Sampige Road', 'Malleshwaram']}
for n, al in ALIASES.items(): stations[slug(n)]['a'] = al
data = dict(meta=dict(built='2026-11-12', stations=len(stations), proj=dict(lat0=LAT0, lon0=LON0, kx=KX, ky=KY), src='Community BMRCL GTFS (OpenStreetMap positions, BMRCL timetables), Aug 2026'),
            lines=lines, stations=stations, segs=segs, fares=fares)
open(OUT, 'w', encoding='utf-8').write('/* generated by tools/build_bengaluru.py - do not edit by hand */\nwindow.NET=window.NET||{};window.NET.bengaluru=' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n')
print('stations', len(stations), 'segments', len(segs), 'points', sum(len(s['p']) for s in segs))
for l in lines: print(l['id'], ' | '.join(stations[i]['n'] for i in l['st']))
for s in segs:
    A, B = stations[s['a']], stations[s['b']]; h = math.hypot(A['x']-B['x'], A['y']-B['y'])
    if s['km'] / max(h, .01) > 1.5 or s['km'] / max(h, .01) < 0.9 or s['min'] <= 0: print('  check', s['a'], s['b'], s['km'], round(h, 2), s['min'])
