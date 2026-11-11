#!/usr/bin/env python3
"""Builds www/js/data-chennai.js. Station positions are entered by hand (no open feed exists);
segment lengths are straight-line spacing scaled to each line's official length.
Usage: python3 build_chennai.py <out.js>"""
import json, math, re, sys
OUT = sys.argv[1]
LAT0, LON0 = 13.06, 80.21
KX = 111.32 * math.cos(math.radians(LAT0)); KY = 110.95
proj = lambda la, lo: ((lo - LON0) * KX, (LAT0 - la) * KY)
slug = lambda n: re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')
def hav(a, b):
    p = math.pi / 180
    h = math.sin((b[0]-a[0])*p/2)**2 + math.cos(a[0]*p)*math.cos(b[0]*p)*math.sin((b[1]-a[1])*p/2)**2
    return 12742 * math.asin(math.sqrt(h))

# name, lat, lon, layout (E elevated / U underground), opened
BLUE = [
 ('Wimco Nagar Depot', 13.1846, 80.3086, 'E', '2022-03-13'), ('Wimco Nagar', 13.1791, 80.3072, 'E', '2021-02-14'),
 ('Thiruvotriyur', 13.1720, 80.3050, 'E', '2021-02-14'), ('Thiruvotriyur Theradi', 13.1597, 80.3025, 'E', '2021-02-14'),
 ('Kaladipet', 13.1510, 80.2994, 'E', '2021-02-14'), ('Tollgate', 13.1431, 80.2965, 'E', '2021-02-14'),
 ('New Washermanpet', 13.1349, 80.2933, 'E', '2021-02-14'), ('Tondiarpet', 13.1244, 80.2890, 'U', '2021-02-14'),
 ('Sir Theagaraya College', 13.1160, 80.2847, 'U', '2021-02-14'), ('Washermanpet', 13.1078, 80.2806, 'U', '2019-02-10'),
 ('Mannadi', 13.0952, 80.2862, 'U', '2019-02-10'), ('High Court', 13.0873, 80.2850, 'U', '2019-02-10'),
 ('Chennai Central', 13.0815, 80.2727, 'U', '2019-02-10'), ('Government Estate', 13.0696, 80.2729, 'U', '2019-02-10'),
 ('LIC', 13.0644, 80.2660, 'U', '2019-02-10'), ('Thousand Lights', 13.0584, 80.2582, 'U', '2019-02-10'),
 ('AG-DMS', 13.0448, 80.2480, 'U', '2018-05-25'), ('Teynampet', 13.0379, 80.2470, 'U', '2018-05-25'),
 ('Nandanam', 13.0314, 80.2398, 'U', '2018-05-25'), ('Saidapet', 13.0238, 80.2283, 'U', '2018-05-25'),
 ('Little Mount', 13.0147, 80.2240, 'E', '2016-09-21'), ('Guindy', 13.0092, 80.2131, 'E', '2016-09-21'),
 ('Alandur', 13.0041, 80.2015, 'E', '2016-09-21'), ('Nanganallur Road', 12.9998, 80.1937, 'E', '2016-09-21'),
 ('Meenambakkam', 12.9876, 80.1765, 'E', '2016-09-21'), ('Chennai International Airport', 12.9808, 80.1642, 'E', '2016-09-21'),
]
GREEN = [
 ('Chennai Central', 13.0815, 80.2727, 'U', '2018-05-25'), ('Egmore', 13.0790, 80.2610, 'U', '2018-05-25'),
 ('Nehru Park', 13.0787, 80.2505, 'U', '2017-05-14'), ('Kilpauk Medical College', 13.0775, 80.2428, 'U', '2017-05-14'),
 ("Pachaiyappa's College", 13.0756, 80.2325, 'U', '2017-05-14'), ('Shenoy Nagar', 13.0786, 80.2253, 'U', '2017-05-14'),
 ('Anna Nagar East', 13.0849, 80.2190, 'U', '2017-05-14'), ('Anna Nagar Tower', 13.0850, 80.2087, 'U', '2017-05-14'),
 ('Thirumangalam', 13.0852, 80.2015, 'U', '2017-05-14'), ('Koyambedu', 13.0735, 80.1949, 'E', '2015-06-29'),
 ('CMBT', 13.0685, 80.2040, 'E', '2015-06-29'), ('Arumbakkam', 13.0621, 80.2115, 'E', '2015-06-29'),
 ('Vadapalani', 13.0507, 80.2121, 'E', '2015-06-29'), ('Ashok Nagar', 13.0354, 80.2115, 'E', '2015-06-29'),
 ('Ekkattuthangal', 13.0170, 80.2053, 'E', '2015-06-29'), ('Alandur', 13.0041, 80.2015, 'E', '2015-06-29'),
 ('St. Thomas Mount', 12.9950, 80.1996, 'E', '2016-10-14'),
]
YELLOW = [
 ('Poonamallee Bypass', 13.0462, 80.0812, 'E', '2026-10-11'), ('Poonamallee Bus Stand', 13.0480, 80.0945, 'E', '2026-10-11'),
 ('Poonamallee Government Hospital', 13.0476, 80.1020, 'E', '2026-10-11'), ('Karayanchavadi', 13.0468, 80.1100, 'E', '2026-10-11'),
 ('Kumananchavadi', 13.0452, 80.1178, 'E', '2026-10-11'), ('Kattupakkam', 13.0428, 80.1265, 'E', '2026-10-11'),
 ('Iyyapanthangal', 13.0400, 80.1350, 'E', '2026-10-11'), ('Thelliyaragaram', 13.0390, 80.1430, 'E', '2026-10-11'),
 ('Porur Bypass', 13.0385, 80.1505, 'E', '2026-10-11'), ('Porur Junction', 13.0380, 80.1570, 'E', '2026-10-11'),
 ('Vadapalani', 13.0507, 80.2121, 'E', '2026-10-11'),
]
ALIASES = {'Chennai Central': ['Puratchi Thalaivar Dr. M.G. Ramachandran Central', 'MGR Central', 'Central Metro'],
           'CMBT': ['Puratchi Thalaivi Dr. J. Jayalalithaa CMBT', 'Koyambedu Bus Terminus'], 'Alandur': ['Arignar Anna Alandur'],
           'Nanganallur Road': ['OTA'], 'AG-DMS': ['Gemini'], 'Chennai International Airport': ['Airport', 'Meenambakkam Airport'],
           'Thiruvotriyur': ['Tiruvottiyur'], 'Thiruvotriyur Theradi': ['Tiruvottiyur Theradi'], 'Tollgate': ['Tondiarpet Tollgate'],
           'Egmore': ['Chennai Egmore'], 'Iyyapanthangal': ['Iyyappanthangal']}
LINES = [
 ('blue', 'Blue Line', '#1F6FC2', '#fff', BLUE, 32.1, None, {}),
 ('green', 'Green Line', '#2B9A4A', '#fff', GREEN, 22.0, 'Some Green Line trains run through from Alandur to the Airport, so a change at Alandur is not always needed.', {}),
 ('yellow', 'Yellow Line', '#E8B500', '#1b1b1b', YELLOW, 14.6,
  'Opened 11 Oct 2026 between Poonamallee Bypass and Vadapalani. Trains do not stop between Porur Junction and Vadapalani until those stations open.',
  {9: [(13.0412, 80.1700), (13.0440, 80.1830), (13.0478, 80.1980)]}),   # Arcot Road waypoints
]
SECTIONS = {
 'blue': [('Wimco Nagar Depot', 'Washermanpet', 9.0), ('Washermanpet', 'AG-DMS', 10.0), ('AG-DMS', 'Little Mount', 4.5), ('Little Mount', 'Chennai International Airport', 8.6)],
 'green': [('Chennai Central', 'Koyambedu', 10.7), ('Koyambedu', 'Alandur', 10.0), ('Alandur', 'St. Thomas Mount', 1.3)],
}
stations, lines, segs = {}, [], []
for lid, name, color, text, sts, total, note, via in LINES:
    ids = []
    for n, la, lo, lay, op in sts:
        i = slug(n); ids.append(i)
        x, y = proj(la, lo)
        s = stations.setdefault(i, dict(n=n, lat=la, lon=lo, x=round(x, 3), y=round(y, 3), lines=[], op={}, lay={}, approx=1))
        s['lines'].append(lid); s['op'][lid] = op; s['lay'][lid] = lay
        if n in ALIASES: s['a'] = ALIASES[n]
    d = dict(id=lid, g=lid, name=name, color=color, text=text, st=ids, loop=False)
    if note: d['note'] = note
    lines.append(d)
    geos = [[(a[1], a[2])] + via.get(k, []) + [(b[1], b[2])] for k, (a, b) in enumerate(zip(sts, sts[1:]))]
    lens = [sum(hav(g[j], g[j+1]) for j in range(len(g)-1)) for g in geos]
    # scale each opened section to its own published length (underground loops wind more than elevated track)
    names = [x[0] for x in sts]; scale = [total / sum(lens)] * len(lens)
    for a, b, km_ in SECTIONS.get(lid, []):
        i, j = names.index(a), names.index(b)
        for k in range(i, j): scale[k] = km_ / sum(lens[i:j])
    for k, g in enumerate(geos):
        km = lens[k] * scale[k]
        segs.append(dict(l=lid, a=ids[k], b=ids[k+1], km=round(km, 3), min=round(km / 34 * 60 + 0.5, 1),
                         p=[[round(v, 3) for v in proj(*q)] for q in g]))
    print(f'{lid:7s} {len(ids)} stn, straight {sum(lens):.1f} km -> official {total} km')
for a in ALIASES: assert slug(a) in stations, a
data = dict(meta=dict(built='2026-11-11', stations=len(stations), proj=dict(lat0=LAT0, lon0=LON0, kx=KX, ky=KY),
                      src='Chennai Metro Rail network as of 11 Nov 2026; positions entered by hand'),
            lines=lines, stations=stations, segs=segs)
open(OUT, 'w', encoding='utf-8').write('/* generated by tools/build_chennai.py - do not edit by hand */\nwindow.NET=window.NET||{};window.NET.chennai=' +
                                       json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n')
print('stations', len(stations), 'segments', len(segs))
