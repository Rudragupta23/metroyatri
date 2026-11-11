#!/usr/bin/env python3
"""Builds www/js/data-mumbai.js. Station positions are entered by hand (no open feed exists);
segment lengths are straight-line spacing scaled to each line's official length.
Usage: python3 build_mumbai.py <out.js>"""
import json, math, re, sys
OUT = sys.argv[1]
LAT0, LON0 = 19.10, 72.86
KX = 111.32 * math.cos(math.radians(LAT0)); KY = 110.95
proj = lambda la, lo: ((lo - LON0) * KX, (LAT0 - la) * KY)
slug = lambda n: re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')
def hav(a, b):
    p = math.pi / 180
    h = math.sin((b[0]-a[0])*p/2)**2 + math.cos(a[0]*p)*math.cos(b[0]*p)*math.sin((b[1]-a[1])*p/2)**2
    return 12742 * math.asin(math.sqrt(h))

# name, lat, lon, layout (E elevated / U underground / G at grade), opened
L1 = [('Versova', 19.1307, 72.8194), ('D N Nagar', 19.1280, 72.8300), ('Azad Nagar', 19.1262, 72.8385), ('Andheri', 19.1208, 72.8482),
      ('Western Express Highway', 19.1168, 72.8562), ('Chakala (J. B. Nagar)', 19.1113, 72.8672), ('Airport Road', 19.1095, 72.8745),
      ('Marol Naka', 19.1083, 72.8795), ('Saki Naka', 19.1036, 72.8880), ('Asalpha', 19.0958, 72.8950), ('Jagruti Nagar', 19.0925, 72.9020), ('Ghatkopar', 19.0868, 72.9082)]
L1 = [(n, la, lo, 'E', '2014-06-08') for n, la, lo in L1]
A22, J23 = '2022-04-02', '2023-01-19'
L2A = [('Dahisar East', 19.2535, 72.8675, 'E', A22), ('Anand Nagar', 19.2548, 72.8612, 'E', A22), ('Kandarpada', 19.2500, 72.8545, 'E', A22),
       ('Mandapeshwar', 19.2440, 72.8500, 'E', A22), ('Eksar', 19.2380, 72.8480, 'E', A22), ('Borivali West', 19.2310, 72.8465, 'E', A22),
       ('Shimpoli', 19.2235, 72.8445, 'E', A22), ('Kandivli West', 19.2150, 72.8425, 'E', A22), ('Dahanukarwadi', 19.2075, 72.8395, 'E', A22),
       ('Valnai - Meeth Chowky', 19.1975, 72.8370, 'E', J23), ('Malad West', 19.1890, 72.8365, 'E', J23), ('Lower Malad', 19.1800, 72.8360, 'E', J23),
       ('Bangur Nagar', 19.1700, 72.8370, 'E', J23), ('Goregaon West', 19.1620, 72.8380, 'E', J23), ('Oshiwara', 19.1530, 72.8370, 'E', J23),
       ('Lower Oshiwara', 19.1440, 72.8345, 'E', J23), ('Andheri West', 19.1295, 72.8310, 'E', J23)]
P26 = '2026-04-08'
L7 = [('Gundavali', 19.1175, 72.8560, 'E', J23), ('Mogra', 19.1290, 72.8565, 'E', J23), ('Jogeshwari East', 19.1395, 72.8575, 'E', J23),
      ('Goregaon East', 19.1535, 72.8590, 'E', J23), ('Aarey', 19.1655, 72.8595, 'E', A22), ('Dindoshi', 19.1765, 72.8605, 'E', A22),
      ('Kurar', 19.1860, 72.8610, 'E', A22), ('Akurli', 19.1965, 72.8625, 'E', A22), ('Poisar', 19.2065, 72.8635, 'E', A22),
      ('Magathane', 19.2175, 72.8650, 'E', A22), ('Devipada', 19.2255, 72.8655, 'E', A22), ('Rashtriya Udyan', 19.2330, 72.8665, 'E', A22),
      ('Ovaripada', 19.2440, 72.8670, 'E', A22), ('Dahisar East', 19.2535, 72.8675, 'E', A22),
      ('Pandurang Wadi', 19.2645, 72.8690, 'E', P26), ('Miragaon', 19.2745, 72.8700, 'E', P26), ('Kashigaon', 19.2835, 72.8712, 'E', P26)]
L2B = [('Chembur', 19.0625, 72.8985, 'E', '2026-08-13'), ('Diamond Garden', 19.0555, 72.9015, 'E', P26), ('Shivaji Chowk (Chembur)', 19.0500, 72.9085, 'E', P26),
       ('Deonar', 19.0470, 72.9160, 'E', P26), ('Mankhurd', 19.0480, 72.9315, 'E', P26), ('Mandale', 19.0530, 72.9430, 'E', P26)]
O24, M25, O25 = '2024-10-05', '2025-05-09', '2025-10-09'
L3 = [('Aarey JVLR', 19.1445, 72.8755, 'G', O24), ('SEEPZ', 19.1290, 72.8745, 'U', O24), ('MIDC - Andheri', 19.1205, 72.8705, 'U', O24),
      ('Marol Naka', 19.1083, 72.8795, 'U', O24), ('CSMIA - T2', 19.0990, 72.8740, 'U', O24), ('Sahar Road', 19.0990, 72.8635, 'U', O24),
      ('CSMIA - T1', 19.0920, 72.8555, 'U', O24), ('Santacruz', 19.0795, 72.8480, 'U', O24), ('Bandra Colony', 19.0700, 72.8560, 'U', O24),
      ('Bandra Kurla Complex', 19.0625, 72.8625, 'U', O24), ('Dharavi', 19.0465, 72.8550, 'U', M25), ('Shitaladevi Mandir', 19.0390, 72.8430, 'U', M25),
      ('Dadar', 19.0215, 72.8425, 'U', M25), ('Siddhivinayak', 19.0155, 72.8300, 'U', M25), ('Worli', 19.0085, 72.8185, 'U', M25),
      ('Acharya Atre Chowk', 18.9970, 72.8175, 'U', M25), ('Science Centre', 18.9895, 72.8165, 'U', O25), ('Mahalaxmi', 18.9820, 72.8215, 'U', O25),
      ('Jagannath Shankar Sheth', 18.9700, 72.8195, 'U', O25), ('Grant Road', 18.9630, 72.8160, 'U', O25), ('Girgaon', 18.9555, 72.8195, 'U', O25),
      ('Kalbadevi', 18.9485, 72.8280, 'U', O25), ('Chhatrapati Shivaji Maharaj Terminus', 18.9400, 72.8350, 'U', O25),
      ('Hutatma Chowk', 18.9325, 72.8335, 'U', O25), ('Churchgate', 18.9335, 72.8265, 'U', O25), ('Vidhan Bhavan', 18.9255, 72.8240, 'U', O25),
      ('Cuffe Parade', 18.9150, 72.8195, 'U', O25)]
ALIASES = {'CSMIA - T2': ['Airport Terminal 2', 'Chhatrapati Shivaji Maharaj International Airport T2', 'International Airport'],
           'CSMIA - T1': ['Airport Terminal 1', 'Chhatrapati Shivaji Maharaj International Airport T1', 'Domestic Airport'],
           'Chhatrapati Shivaji Maharaj Terminus': ['CSMT', 'CST', 'VT'], 'Jagannath Shankar Sheth': ['Mumbai Central'], 'Bandra Colony': ['Vidyanagari'],
           'Bandra Kurla Complex': ['BKC'], 'Western Express Highway': ['WEH'], 'D N Nagar': ['DN Nagar'], 'Diamond Garden': ['Deshbhakt N.G. Acharya Udyan'],
           'Mandale': ['Maharashtranagar Mandale'], 'Deonar': ['BSNL'], 'Rashtriya Udyan': ['National Park', 'Borivali East'], 'Science Centre': ['Nehru Science Centre', 'Science Museum'],
           'Kandivli West': ['Kandivali West'], 'Bangur Nagar': ['Pahadi Goregaon'], 'Shimpoli': ['Pahadi Eksar'], 'Chakala (J. B. Nagar)': ['Chakala', 'JB Nagar']}
LINES = [
 ('l1', 'blue', 'Blue Line 1', '#1F78C8', '#fff', L1, 11.4, 'Run by Mumbai Metro One. It needs its own ticket.', {}),
 ('l2a', 'yellow', 'Yellow Line 2A', '#E8B800', '#1b1b1b', L2A, 18.6, None, {}),
 ('l2b', 'yellow', 'Yellow Line 2B', '#E8B800', '#1b1b1b', L2B, 6.4, 'Opened in 2026 between Mandale and Chembur. This section is not yet joined to the rest of the metro network.', {}),
 ('l7', 'red', 'Red Line 7 and 9', '#DC3C32', '#fff', L7, 20.1, 'Line 9 from Dahisar East to Kashigaon opened in April 2026 and runs as part of the same service.', {}),
 ('l3', 'aqua', 'Aqua Line 3', '#12A5B8', '#fff', L3, 33.5, 'Underground line run by MMRC. It needs its own ticket.', {}),
]
SECTIONS = {'l7': [('Gundavali', 'Dahisar East', 16.5), ('Dahisar East', 'Kashigaon', 3.6)], 'l2b': [('Diamond Garden', 'Mandale', 5.4)]}
stations, lines, segs = {}, [], []
for lid, grp, name, color, text, sts, total, note, via in LINES:
    ids = []
    for n, la, lo, lay, op in sts:
        i = slug(n); ids.append(i)
        x, y = proj(la, lo)
        s = stations.setdefault(i, dict(n=n, lat=la, lon=lo, x=round(x, 3), y=round(y, 3), lines=[], op={}, lay={}, approx=1))
        s['lines'].append(lid); s['op'][grp] = op; s['lay'][grp] = lay
        if n in ALIASES: s['a'] = ALIASES[n]
    d = dict(id=lid, g=grp, name=name, color=color, text=text, st=ids, loop=False)
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
        segs.append(dict(l=lid, a=ids[k], b=ids[k+1], km=round(km, 3), min=round(km / 33 * 60 + 0.5, 1),
                         p=[[round(v, 3) for v in proj(*q)] for q in g]))
    print(f'{lid:7s} {len(ids)} stn, straight {sum(lens):.1f} km -> official {total} km')
for a in ALIASES: assert slug(a) in stations, a
data = dict(meta=dict(built='2026-11-12', stations=len(stations), proj=dict(lat0=LAT0, lon0=LON0, kx=KX, ky=KY),
                      src='Mumbai Metro network as of 12 Nov 2026; positions entered by hand'),
            lines=lines, stations=stations, segs=segs)
open(OUT, 'w', encoding='utf-8').write('/* generated by tools/build_chennai.py - do not edit by hand */\nwindow.NET=window.NET||{};window.NET.mumbai=' +
                                       json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n')
print('stations', len(stations), 'segments', len(segs))
