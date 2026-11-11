#!/usr/bin/env python3
"""Builds www/js/data.js for the app from the DMRC GTFS snapshot + verified station list.
Usage: python3 -I build_data.py <gtfs_dir> <wiki.csv> <out.js>
"""
import csv, json, math, re, sys, collections

GTFS, WIKI, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

# ---------- canonical naming ----------
RENAME = {
 'Rohini West': 'Dr. Baba Saheb Ambedkar Hospital', 'Rohini East': 'Rohini', 'Pitampura': 'Madhuban Chowk',
 'Pul Bangash': 'Pulbangash', 'Seelam Pur': 'Seelampur', 'Mansrover park': 'Mansarovar Park',
 'Major Mohit Sharma Rajender Nagar': 'Major Mohit Sharma Rajendra Nagar',
 'Shaheed Sthal (New Bus Adda)': 'Shaheed Sthal',
 'Huda City Centre': 'Millennium City Centre Gurugram', 'Gurudronacharya': 'Guru Dronacharya',
 'Chhattarpur': 'Chhatarpur', 'Jorbagh': 'Jor Bagh', 'Udyog Bhawan': 'Seva Teerth',
 'Rohini Sector 18-19': 'Rohini Sector 18, 19',
 'Dwarka Sector - 21': 'Dwarka Sector 21', 'Dwarka Sector - 8': 'Dwarka Sector 8', 'Dwarka Sector - 9': 'Dwarka Sector 9',
 'Dwarka Sector - 10': 'Dwarka Sector 10', 'Dwarka Sector - 11': 'Dwarka Sector 11', 'Dwarka Sector - 12': 'Dwarka Sector 12',
 'Dwarka Sector - 13': 'Dwarka Sector 13', 'Dwarka Sector - 14': 'Dwarka Sector 14', 'Dwarka': 'Dwarka-Kakrola',
 'Janak Puri West': 'Janakpuri West', 'Janak Puri East': 'Janakpuri East', 'Subash Nagar': 'Subhash Nagar',
 'RK Ashram Marg': 'Ramakrishna Ashram Marg', 'Barakhamba': 'Barakhamba Road', 'Mayur Vihar Ext': 'Mayur Vihar Extension',
 'Noida Sec -15': 'Noida Sector 15', 'Noida Sec -16': 'Noida Sector 16', 'Noida Sec -18': 'Noida Sector 18',
 'Noida Sec-34': 'Noida Sector 34', 'Noida Sec-52': 'Noida Sector 52', 'Noida Sec-61': 'Noida Sector 61',
 'Noida Sec-59': 'Noida Sector 59', 'Noida Sec-62': 'Noida Sector 62',
 'Paschim Vihar (East)': 'Paschim Vihar East', 'Paschim Vihar (West)': 'Paschim Vihar West', 'Peera Garhi': 'Peeragarhi',
 'Mundka Industrial Area (M.I.A)': 'Mundka Industrial Area', 'Ghevra Metro station': 'Ghevra',
 'Lal Quila': 'Lal Qila', 'Jawahar Lal Nehru Stadium': 'Jawaharlal Nehru Stadium', 'Govind Puri': 'Govindpuri',
 'Jasola-Apollo': 'Jasola Apollo', 'Mewala Maharajpur': 'Mewla Maharajpur', 'Sector-28': 'Sector 28', 'Badkal Mor': 'Badkhal Mor',
 'Raja Nahar Singh': 'Raja Nahar Singh (Ballabhgarh)',
 'ESI Basai Darapur': 'ESI - Basaidarapur', 'Delhi Cantt.': 'Delhi Cantonment',
 'Sir Vishweshwaraiah Moti Bagh': 'Sir M. Vishweshwaraiah Moti Bagh', 'Mayur Vihar Pocket 1': 'Shree Ram Mandir Mayur Vihar',
 'Trilokpuri Sanjay Lake': 'Trilokpuri - Sanjay Lake', 'Jafrabad': 'Jaffrabad',
 'Dashrath Puri': 'Dashrathpuri', 'Sadar Bazar Contonment': 'Sadar Bazar Cantonment', 'Terminal 1- IGI Airport': 'Terminal 1-IGI Airport',
 'RK Puram': 'R. K. Puram', 'IGI Airport': 'Indira Gandhi International Airport',
}
# search aliases: former / popular names
ALIASES = {
 'Dr. Baba Saheb Ambedkar Hospital': ['Rohini West'], 'Rohini': ['Rohini East'], 'Madhuban Chowk': ['Pitampura', 'Pitam Pura'],
 'Shaheed Sthal': ['New Bus Adda', 'Ghaziabad'], 'Major Mohit Sharma Rajendra Nagar': ['Rajendra Nagar'],
 'Millennium City Centre Gurugram': ['HUDA City Centre', 'Gurgaon'], 'Seva Teerth': ['Udyog Bhawan'],
 'Lok Kalyan Marg': ['Race Course'], 'Guru Tegh Bahadur Nagar': ['GTB Nagar'], 'Dilli Haat - INA': ['INA'],
 'Dwarka-Kakrola': ['Dwarka'], 'Ramakrishna Ashram Marg': ['RK Ashram Marg', 'Paharganj'], 'Supreme Court': ['Pragati Maidan'],
 'Rajiv Chowk': ['Connaught Place', 'CP'], 'Shree Ram Mandir Mayur Vihar': ['Mayur Vihar Pocket 1'],
 'Indira Gandhi International Airport': ['IGI Airport', 'Airport T3', 'Terminal 3', 'Terminal 2'],
 'Terminal 1-IGI Airport': ['Airport T1', 'Terminal 1'], 'Jawaharlal Nehru Stadium': ['JLN Stadium'],
 'Delhi Cantonment': ['Delhi Cantt'], 'Brigadier Hoshiyar Singh': ['Bahadurgarh City Park'],
 'Raja Nahar Singh (Ballabhgarh)': ['Ballabhgarh'], 'Yashobhoomi Dwarka Sector 25': ['IICC', 'Dwarka Sector 25'],
 'New Delhi': ['NDLS', 'New Delhi Railway Station'], 'Sarai Kale Khan - Nizamuddin': ['Hazrat Nizamuddin'],
 'Durgabai Deshmukh South Campus': ['South Campus'], 'Sir M. Vishweshwaraiah Moti Bagh': ['Moti Bagh'],
 'Netaji Subhash Place': ['NSP'], 'Vishwavidyalaya': ['Delhi University', 'North Campus'], 'Lal Qila': ['Red Fort'],
 'Harkesh Nagar Okhla': ['Okhla'], 'Kashmere Gate': ['ISBT', 'Kashmiri Gate'], 'Noida Sector 52': ['Sector 51 Aqua Line'],
}
canon = lambda n: RENAME.get(n.strip(), n.strip())
def slug(n):
    return re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')

# ---------- projection (km east / km south of reference) ----------
LAT0, LON0 = 28.62, 77.20
KX = 111.32 * math.cos(math.radians(LAT0)); KY = 110.95
def proj(lat, lon): return ((lon - LON0) * KX, (LAT0 - lat) * KY)
def hav(a, b):
    (la1, lo1), (la2, lo2) = a, b
    p = math.pi / 180
    h = math.sin((la2-la1)*p/2)**2 + math.cos(la1*p)*math.cos(la2*p)*math.sin((lo2-lo1)*p/2)**2
    return 12742 * math.asin(math.sqrt(h))

# positions that are wrong in the 2023 feed (checked against the alignment)
COORD_FIX = {'Adarsh Nagar': (28.7165, 77.1705), 'Haiderpur Badli Mor': (28.7302, 77.1495),
             'Rajendra Place': (28.6425, 77.1781), 'Mundka Industrial Area': (28.6833, 77.0120)}

# ---------- load GTFS ----------
rd = lambda f: list(csv.DictReader(open(f'{GTFS}/{f}', encoding='utf-8-sig')))
stops = {r['stop_id']: r for r in rd('stops.txt')}
trips = collections.defaultdict(list)
for r in rd('trips.txt'): trips[r['route_id']].append(r)
want_routes = {'1','2','5','6','8','7','10','11','12','13','14'}
want_trips = {t['trip_id'] for rid in want_routes for t in trips[rid]}
st = collections.defaultdict(list)
for r in rd('stop_times.txt'):
    if r['trip_id'] in want_trips: st[r['trip_id']].append(r)
shapes = collections.defaultdict(list)
for r in rd('shapes.txt'):
    shapes[r['shape_id']].append((float(r['shape_dist_traveled']), float(r['shape_pt_lat']), float(r['shape_pt_lon'])))
for k in shapes: shapes[k].sort()

def tsec(t):
    h, m, s = map(int, t.split(':')); return h*3600 + m*60 + s

def simplify(pts, tol):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2-x1, y2-y1; L = math.hypot(dx, dy) or 1e-9
    imax, dmax = 0, 0
    for i in range(1, len(pts)-1):
        d = abs(dy*(pts[i][0]-x1) - dx*(pts[i][1]-y1)) / L
        if d > dmax: imax, dmax = i, d
    if dmax <= tol: return [pts[0], pts[-1]]
    return simplify(pts[:imax+1], tol)[:-1] + simplify(pts[imax:], tol)

def shape_between(shape, d1, d2):
    def at(d):
        for i in range(1, len(shape)):
            if shape[i][0] >= d:
                a, b = shape[i-1], shape[i]
                f = 0 if b[0] == a[0] else (d - a[0]) / (b[0] - a[0])
                return (a[1] + (b[1]-a[1])*f, a[2] + (b[2]-a[2])*f)
        return shape[-1][1:]
    mid = [(la, lo) for d, la, lo in shape if d1 < d < d2]
    return [at(d1)] + mid + [at(d2)]

def route_run(rid):
    """-> list of (canonical name, lat, lon), list of segments (km, minutes, [latlon...])"""
    best = max(trips[rid], key=lambda t: len(st[t['trip_id']]))
    seq = sorted(st[best['trip_id']], key=lambda r: int(r['stop_sequence']))
    shp = shapes[best['shape_id']]
    names = []
    for s in seq:
        sp = stops[s['stop_id']]
        nm = canon(sp['stop_name'])
        la, lo = COORD_FIX.get(nm, (float(sp['stop_lat']), float(sp['stop_lon'])))
        names.append((nm, la, lo))
    segs = []
    for i, (a, b) in enumerate(zip(seq, seq[1:])):
        d1, d2 = float(a['shape_dist_traveled']), float(b['shape_dist_traveled'])
        mins = (tsec(b['arrival_time']) - tsec(a['arrival_time'])) / 60
        km, geo = (d2 - d1) / 1000, shape_between(shp, d1, d2)
        if names[i][0] in COORD_FIX or names[i+1][0] in COORD_FIX:   # feed has a wrong position here: rebuild from corrected points
            geo = [names[i][1:], names[i+1][1:]]; km = hav(geo[0], geo[1]) * 1.04
        elif rid != '14' and km / max(mins, 0.1) * 60 > 62:
            print('  suspicious segment', names[i][0], '>', names[i+1][0], round(km, 2), 'km in', round(mins, 1), 'min')
        segs.append((km, mins, geo))
    return names, segs

LINES = []      # dicts
STN = {}        # name -> dict
SEGS = []

def add_station(name, lat, lon, approx=False):
    if name not in STN:
        STN[name] = dict(n=name, lat=lat, lon=lon, lines=[], approx=approx)
    return STN[name]

def add_line(lid, group, label, color, text, names, segs, loop=False, note=None):
    ids = []
    for (n, la, lo) in names:
        s = add_station(n, la, lo); s['lines'].append(lid); ids.append(slug(n))
    LINES.append(dict(id=lid, g=group, name=label, color=color, text=text, st=ids, loop=loop, **({'note': note} if note else {})))
    pairs = list(zip(names, names[1:])) + ([(names[-1], names[0])] if loop else [])
    assert len(pairs) == len(segs), (lid, len(pairs), len(segs))
    for (a, b), (km, mins, geo) in zip(pairs, segs):
        pts = simplify([proj(la, lo) for la, lo in geo], 0.012)
        SEGS.append(dict(l=lid, a=slug(a[0]), b=slug(b[0]), km=round(km, 3), min=round(mins, 1),
                         p=[[round(x, 3), round(y, 3)] for x, y in pts]))

def straight(names, total_km, kmh=34, dwell=0.4, via=None):
    """segments for a new section: share the official corridor length by straight-line spacing"""
    via = via or {}
    geos = []
    for i, (a, b) in enumerate(zip(names, names[1:])):
        g = [(a[1], a[2])] + via.get(i, []) + [(b[1], b[2])]
        geos.append(g)
    lens = [sum(hav(g[j], g[j+1]) for j in range(len(g)-1)) for g in geos]
    tot = sum(lens)
    return [(total_km * l / tot, total_km * l / tot / kmh * 60 + dwell, g) for l, g in zip(lens, geos)]

C = dict(red=('#E0342B', '#fff'), yellow=('#F4C20D', '#1b1b1b'), blue=('#1F6FC2', '#fff'), green=('#2B9A4A', '#fff'),
         violet=('#7A3E9D', '#fff'), pink=('#EC6FA9', '#1b1b1b'), magenta=('#C01C7B', '#fff'), grey=('#868C96', '#fff'),
         airport=('#F28A1E', '#1b1b1b'))

# Red
n, s = route_run('1'); add_line('red', 'red', 'Red Line', *C['red'], n, s)
# Yellow (GTFS trip runs south->north; store north->south)
n, s = route_run('2'); n.reverse(); s = [(k, m, g[::-1]) for k, m, g in reversed(s)]
add_line('yellow', 'yellow', 'Yellow Line', *C['yellow'], n, s)
# Blue main + Vaishali branch
n, s = route_run('5'); add_line('blue', 'blue', 'Blue Line', *C['blue'], n, s)
n, s = route_run('6'); i = [x[0] for x in n].index('Yamuna Bank')
add_line('blueb', 'blue', 'Blue Line (Vaishali branch)', *C['blue'], n[i:], s[i:])
# Green main (+ Punjabi Bagh West, opened 2022, missing from the 2023 feed) and Kirti Nagar branch
n, s = route_run('8')
pbw = [x for x in stops.values() if x['stop_name'] == 'Punjabi Bagh West'][0]
pbw = ('Punjabi Bagh West', float(pbw['stop_lat']), float(pbw['stop_lon']))
i = [x[0] for x in n].index('Punjabi Bagh')
km, mins, geo = s[i]
j = min(range(len(geo)), key=lambda q: hav(geo[q], pbw[1:]))
j = max(1, min(len(geo)-2, j)) if len(geo) > 2 else 0
if len(geo) > 2:
    g1, g2 = geo[:j+1], geo[j:]
else:
    g1, g2 = [geo[0], pbw[1:]], [pbw[1:], geo[1]]
l1 = sum(hav(g1[q], g1[q+1]) for q in range(len(g1)-1)); l2 = sum(hav(g2[q], g2[q+1]) for q in range(len(g2)-1))
f = l1 / (l1 + l2)
n.insert(i+1, pbw); s[i:i+1] = [(km*f, mins*f + 0.2, g1), (km*(1-f), mins*(1-f) + 0.2, g2)]
add_line('green', 'green', 'Green Line', *C['green'], n, s)
n, s = route_run('7'); i = [x[0] for x in n].index('Ashok Park Main')
add_line('greenb', 'green', 'Green Line (Kirti Nagar branch)', *C['green'], n[:i+1], s[:i])
# Violet
n, s = route_run('10'); add_line('violet', 'violet', 'Violet Line', *C['violet'], n, s)
# Pink ring + Shiv Vihar branch
n, s = route_run('11'); i = [x[0] for x in n].index('Maujpur - Babarpur')
ring_n, ring_s = n[:i+1], s[:i]
branch_n, branch_s = n[i:], s[i:]
MP = ring_n[0]; MJ = ring_n[-1]
# 2026 section (coordinates estimated from the alignment; Soorghat is built but not yet open -> waypoint only)
new_pink = [MJ, ('Yamuna Vihar', 28.6975, 77.2738), ('Bhajanpura', 28.7012, 77.2652), ('Khajuri Khas', 28.7083, 77.2622),
            ('Nanaksar - Sonia Vihar', 28.7102, 77.2498), ('Jagatpur - Wazirabad', 28.7172, 77.2228),
            ('Jharoda Majra', 28.7236, 77.2085), ('Burari', 28.7262, 77.1972), MP]
ns = straight(new_pink, 12.3, via={4: [(28.7120, 77.2340)]})
for x in new_pink[1:-1]: add_station(x[0], x[1], x[2], approx=True)
add_line('pink', 'pink', 'Pink Line (Ring)', *C['pink'], ring_n + new_pink[1:-1], ring_s + ns, loop=True)
add_line('pinkb', 'pink', 'Pink Line (Shiv Vihar branch)', *C['pink'], branch_n, branch_s,
         note='Separate shuttle service: change trains at Maujpur - Babarpur.')
# Magenta south + Krishna Park Extension (2025)
n, s = route_run('12'); n.reverse(); s = [(k, m, g[::-1]) for k, m, g in reversed(s)]
JW = n[-1]; KPE = ('Krishna Park Extension', 28.6425, 77.0868)
add_station(KPE[0], KPE[1], KPE[2], approx=True)
add_line('magenta', 'magenta', 'Magenta Line', *C['magenta'], n + [KPE], s + straight([JW, KPE], 2.2),
         note='Runs Botanical Garden - Krishna Park Extension. The Krishna Park Extension - Deepali Chowk link is under construction.')
# Magenta north (2026)
HBM = STN['Haiderpur Badli Mor']; MC = STN['Madhuban Chowk']; MPs = STN['Majlis Park']
north = [('Deepali Chowk', 28.6962, 77.1212), ('Madhuban Chowk', MC['lat'], MC['lon']),
         ('Uttari Pitampura-Prashant Vihar', 28.7128, 77.1372), ('Haiderpur Village', 28.7226, 77.1422),
         ('Haiderpur Badli Mor', HBM['lat'], HBM['lon']), ('Bhalaswa', 28.7335, 77.1672), ('Majlis Park', MPs['lat'], MPs['lon'])]
for x in north:
    if x[0] not in STN: add_station(x[0], x[1], x[2], approx=True)
add_line('magentan', 'magenta', 'Magenta Line (Majlis Park section)', *C['magenta'], north, straight(north, 9.92),
         note='Runs Deepali Chowk - Majlis Park as a separate section until the link to Krishna Park Extension opens.')
# Grey
n, s = route_run('13'); add_line('grey', 'grey', 'Grey Line', *C['grey'], n, s)
# Airport Express (+ Yashobhoomi 2023)
n, s = route_run('14'); n.reverse(); s = [(k, m, g[::-1]) for k, m, g in reversed(s)]
YB = ('Yashobhoomi Dwarka Sector 25', 28.5550, 77.0378); add_station(YB[0], YB[1], YB[2], approx=True)
add_line('airport', 'airport', 'Airport Express', *C['airport'], n + [YB], s + straight([n[-1], YB], 2.0, kmh=60),
         note='Premium line with its own, higher fares.')

# ---------- verify against the station list ----------
wiki = {}
for row in csv.reader(open(WIKI, encoding='utf-8'), delimiter=';'):
    wiki[row[0]] = row
missing = sorted(set(wiki) - set(STN)); extra = sorted(set(STN) - set(wiki))
assert not missing and not extra, f'missing={missing} extra={extra}'
GROUP = {'Red':'red','Yellow':'yellow','Blue':'blue','Green':'green','Violet':'violet','Pink':'pink','Magenta':'magenta','Grey':'grey','Airport Express':'airport'}
gl = {l['id']: l['g'] for l in LINES}
for name, row in wiki.items():
    s = STN[name]
    wl = [GROUP[x] for x in row[1].split('/')]
    mine = sorted(set(gl[x] for x in s['lines']))
    assert sorted(set(wl)) == mine, (name, wl, mine)
    s['op'] = dict(zip(wl, row[2].split('/')))
    s['lay'] = dict(zip(wl, row[3].split('/')))

stations = {}
for name, s in STN.items():
    x, y = proj(s['lat'], s['lon'])
    d = dict(n=name, lat=round(s['lat'], 5), lon=round(s['lon'], 5), x=round(x, 3), y=round(y, 3), lines=s['lines'], op=s['op'], lay=s['lay'])
    if name in ALIASES: d['a'] = ALIASES[name]
    if s['approx']: d['approx'] = 1
    stations[slug(name)] = d
assert len(stations) == 243
for a in ALIASES: assert a in STN, a
# snap segment ends to station points so the drawing joins up
for sg in SEGS:
    a, b = stations[sg['a']], stations[sg['b']]
    sg['p'][0] = [a['x'], a['y']]; sg['p'][-1] = [b['x'], b['y']]

data = dict(meta=dict(built='2026-11-11', stations=len(stations),
                      src='DMRC GTFS (Delhi Open Transit Data) + 2025-26 openings and renames checked on 11 Nov 2026'),
            lines=LINES, stations=stations, segs=SEGS)
open(OUT, 'w', encoding='utf-8').write('/* generated by build/build_data.py - do not edit by hand */\nwindow.METRO=' +
                                       json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n')
print('stations', len(stations), 'segments', len(SEGS), 'points', sum(len(s['p']) for s in SEGS))
for l in LINES:
    km = sum(s['km'] for s in SEGS if s['l'] == l['id'])
    print(f"  {l['id']:9s} {len(l['st']):3d} stn {km:6.2f} km")
