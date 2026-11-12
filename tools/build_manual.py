#!/usr/bin/env python3
"""Builds network data for cities without an open data feed (station positions entered by hand, approximate).
Segment lengths are straight-line spacing scaled to each line's published length.
Usage: python3 build_manual.py <www/js folder>"""
import json, math, re, sys
OUTDIR = sys.argv[1]
slug = lambda n: re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')
def hav(a, b):
    p = math.pi / 180
    h = math.sin((b[0]-a[0])*p/2)**2 + math.cos(a[0]*p)*math.cos(b[0]*p)*math.sin((b[1]-a[1])*p/2)**2
    return 12742 * math.asin(math.sqrt(h))

CITIES = {}
# ------------------------------------------------------------------ Hyderabad
RED = [('Miyapur',17.4965,78.3730),('JNTU College',17.4985,78.3890),('KPHB Colony',17.4935,78.4020),('Kukatpally',17.4850,78.4115),('Balanagar',17.4775,78.4205),
 ('Moosapet',17.4715,78.4275),('Bharat Nagar',17.4640,78.4330),('Erragadda',17.4570,78.4380),('ESI Hospital',17.4475,78.4395),('S R Nagar',17.4415,78.4420),
 ('Ameerpet',17.4355,78.4445),('Punjagutta',17.4285,78.4510),('Irrum Manzil',17.4205,78.4560),('Khairatabad',17.4115,78.4610),('Lakdi-ka-pul',17.4040,78.4650),
 ('Assembly',17.3985,78.4700),('Nampally',17.3925,78.4705),('Gandhi Bhavan',17.3860,78.4725),('Osmania Medical College',17.3830,78.4805),('MG Bus Station',17.3785,78.4860),
 ('Malakpet',17.3760,78.4950),('New Market',17.3735,78.5040),('Musarambagh',17.3715,78.5120),('Dilsukhnagar',17.3690,78.5255),('Chaitanyapuri',17.3685,78.5355),
 ('Victoria Memorial',17.3610,78.5435),('LB Nagar',17.3495,78.5480)]
HBLUE = [('Nagole',17.3900,78.5590),('Uppal',17.3995,78.5600),('Stadium',17.4010,78.5505),('NGRI',17.4055,78.5440),('Habsiguda',17.4120,78.5410),('Tarnaka',17.4285,78.5290),
 ('Mettuguda',17.4360,78.5200),('Secunderabad East',17.4355,78.5055),('JBS Parade Ground',17.4430,78.4975),('Paradise',17.4440,78.4860),('Rasoolpura',17.4445,78.4760),
 ('Prakash Nagar',17.4450,78.4670),('Begumpet',17.4380,78.4575),('Ameerpet',17.4355,78.4445),('Madhura Nagar',17.4365,78.4385),('Yousufguda',17.4350,78.4270),
 ('Road No 5 Jubilee Hills',17.4310,78.4200),('Jubilee Hills Check Post',17.4290,78.4130),('Peddamma Gudi',17.4310,78.4075),('Madhapur',17.4365,78.4010),
 ('Durgam Cheruvu',17.4420,78.3880),('HITEC City',17.4490,78.3815),('Raidurg',17.4420,78.3770)]
HGREEN = [('JBS Parade Ground',17.4430,78.4975),('Secunderabad West',17.4340,78.4990),('Gandhi Hospital',17.4250,78.5020),('Musheerabad',17.4170,78.5010),('RTC X Roads',17.4075,78.4985),
 ('Chikkadpally',17.4010,78.4955),('Narayanaguda',17.3950,78.4905),('Sultan Bazaar',17.3840,78.4845),('MG Bus Station',17.3785,78.4860)]
CITIES['hyderabad'] = dict(center=(17.42, 78.47), lines=[
 ('red','red','Red Line','#D8322A','#fff',RED,29.2,None),('blue','blue','Blue Line','#1F6FC2','#fff',HBLUE,27.0,None),('green','green','Green Line','#2B9A4A','#fff',HGREEN,9.6,None)],
 aliases={'JBS Parade Ground':['Parade Ground','Jubilee Bus Station'],'MG Bus Station':['MGBS','Imlibun'],'HITEC City':['Hitech City'],'Raidurg':['Mindspace'],'Lakdi-ka-pul':['Lakdikapul'],
          'Secunderabad East':['Secunderabad railway station'],'Punjagutta':['Panjagutta'],'Balanagar':['Dr. B.R. Ambedkar Balanagar'],'LB Nagar':['L B Nagar','Lal Bahadur Nagar'],'Nampally':['Hyderabad Deccan station']},
 src='Hyderabad Metro network as of 12 Nov 2026; positions entered by hand')
# ------------------------------------------------------------------ Kolkata
KBLUE = [('Dakshineswar',22.6525,88.3630),('Baranagar',22.6430,88.3790),('Noapara',22.6395,88.3940),('Dum Dum',22.6215,88.3930),('Belgachia',22.6065,88.3855),('Shyambazar',22.6010,88.3735),
 ('Shobhabazar Sutanuti',22.5960,88.3655),('Girish Park',22.5865,88.3625),('Mahatma Gandhi Road',22.5810,88.3610),('Central',22.5720,88.3590),('Chandni Chowk',22.5665,88.3570),
 ('Esplanade',22.5645,88.3515),('Park Street',22.5545,88.3505),('Maidan',22.5500,88.3480),('Rabindra Sadan',22.5410,88.3475),('Netaji Bhavan',22.5320,88.3460),('Jatin Das Park',22.5245,88.3465),
 ('Kalighat',22.5170,88.3460),('Rabindra Sarobar',22.5075,88.3455),('Mahanayak Uttam Kumar',22.4945,88.3450),('Netaji',22.4810,88.3465),('Masterda Surya Sen',22.4725,88.3610),
 ('Gitanjali',22.4680,88.3700),('Kavi Nazrul',22.4640,88.3810),('Shahid Khudiram',22.4660,88.3905)]
KGREEN = [('Howrah Maidan',22.5850,88.3300),('Howrah',22.5835,88.3420),('Mahakaran',22.5720,88.3490),('Esplanade',22.5645,88.3515),('Sealdah',22.5680,88.3705),('Phoolbagan',22.5725,88.3895),
 ('Salt Lake Stadium',22.5745,88.3990),('Bengal Chemical',22.5800,88.4010),('City Centre',22.5875,88.4075),('Central Park',22.5865,88.4165),('Karunamoyee',22.5850,88.4215),('Salt Lake Sector V',22.5810,88.4300)]
KPURPLE = [('Joka',22.4525,88.3020),('Thakurpukur',22.4640,88.3075),('Sakher Bazar',22.4760,88.3120),('Behala Chowrasta',22.4870,88.3140),('Behala Bazar',22.4985,88.3170),('Taratala',22.5100,88.3210),('Majerhat',22.5200,88.3245)]
KORANGE = [('Kavi Subhash',22.4720,88.3955),('Satyajit Ray',22.4835,88.3975),('Jyotirindra Nandi',22.4935,88.3990),('Kavi Sukanta',22.5035,88.3985),('Hemanta Mukhopadhyay',22.5135,88.4010),
 ('VIP Bazar',22.5245,88.3990),('Ritwik Ghatak',22.5345,88.3975),('Barun Sengupta',22.5415,88.3965),('Beleghata',22.5560,88.4030)]
KYELLOW = [('Noapara',22.6395,88.3940),('Dum Dum Cantonment',22.6375,88.4110),('Jessore Road',22.6440,88.4275),('Jai Hind',22.6480,88.4390)]
CITIES['kolkata'] = dict(center=(22.56, 88.37), lines=[
 ('blue','blue','Blue Line','#1F6FC2','#fff',KBLUE,31.3,'Trains end at Shahid Khudiram while the Blue Line platforms at Kavi Subhash are rebuilt.'),
 ('green','green','Green Line','#2B9A4A','#fff',KGREEN,16.6,None),
 ('purple','purple','Purple Line','#8C3FA0','#fff',KPURPLE,7.75,'Runs between Joka and Majerhat. It is not yet joined to the other lines.'),
 ('orange','orange','Orange Line','#F28A1E','#1b1b1b',KORANGE,9.9,'Runs between Kavi Subhash and Beleghata. It is not joined to the Blue Line while the Blue Line platforms at Kavi Subhash are closed.'),
 ('yellow','yellow','Yellow Line','#E8B800','#1b1b1b',KYELLOW,6.2,None)],
 aliases={'Jai Hind':['Airport','Bimanbandar','Netaji Subhas Chandra Bose Airport'],'Mahanayak Uttam Kumar':['Tollygunge'],'Netaji Bhavan':['Bhowanipore'],'Kavi Subhash':['New Garia'],
          'Kavi Nazrul':['Garia Bazar'],'Shahid Khudiram':['Briji'],'Masterda Surya Sen':['Bansdroni'],'Gitanjali':['Naktala'],'Netaji':['Kudghat'],'Mahakaran':['BBD Bagh','Dalhousie'],
          'Howrah':['Howrah railway station'],'Barun Sengupta':['Science City'],'Hemanta Mukhopadhyay':['Ruby'],'Satyajit Ray':['Panchasayar'],'Jyotirindra Nandi':['Mukundapur'],
          'Kavi Sukanta':['Kalikapur'],'Ritwik Ghatak':['Uttar Panchanna Gram'],'Salt Lake Sector V':['Sector 5'],'Mahatma Gandhi Road':['MG Road'],'Rabindra Sadan':['Exide']},
 src='Kolkata Metro network as of 12 Nov 2026; positions entered by hand')
# ------------------------------------------------------------------ Pune
PPURPLE = [('PCMC Bhavan',18.6295,73.8030),('Sant Tukaram Nagar',18.6175,73.8115),('Nashik Phata',18.6085,73.8185),('Kasarwadi',18.5990,73.8245),('Phugewadi',18.5890,73.8290),('Dapodi',18.5790,73.8335),
 ('Bopodi',18.5700,73.8375),('Khadki',18.5625,73.8430),('Range Hills',18.5500,73.8470),('Shivaji Nagar',18.5320,73.8500),('District Court Pune',18.5275,73.8565),('Kasba Peth',18.5195,73.8565),
 ('Mandai',18.5110,73.8565),('Swargate',18.5010,73.8585)]
PAQUA = [('Vanaz',18.5070,73.8050),('Anand Nagar',18.5090,73.8130),('Ideal Colony',18.5095,73.8205),('Nal Stop',18.5085,73.8290),('Garware College',18.5120,73.8380),('Deccan Gymkhana',18.5165,73.8420),
 ('Chhatrapati Sambhaji Udyan',18.5205,73.8475),('PMC Bhavan',18.5235,73.8525),('District Court Pune',18.5275,73.8565),('Mangalwar Peth',18.5300,73.8640),('Pune Railway Station',18.5290,73.8730),
 ('Ruby Hall Clinic',18.5335,73.8790),('Bund Garden',18.5395,73.8850),('Yerawada',18.5450,73.8870),('Kalyani Nagar',18.5475,73.9000),('Ramwadi',18.5560,73.9110)]
PPINK = [('Maan',18.5760,73.6870),('Maan MIDC Circle Phase II',18.5810,73.6960),('Maan Bus Depot',18.5845,73.7040),('Hinjawadi Phase II Circle II',18.5880,73.7110),('Hinjawadi Phase II Circle I',18.5900,73.7190),
 ('Padmabhushan Chowk',18.5910,73.7280),('Shivaji Chowk Hinjawadi',18.5915,73.7380),('Hinjawadi Phase I',18.5930,73.7460),('Wakad Chowk',18.5900,73.7625),('Sports Complex Mahalunge',18.5775,73.7660),
 ('Mitcon Balewadi',18.5725,73.7725),('R K Laxman Museum Balewadi',18.5690,73.7790),('Aundh',18.5600,73.8085),('Sakal Nagar',18.5520,73.8165),('Savitribai Phule Pune University',18.5415,73.8290),
 ('Agriculture College',18.5335,73.8470),('District Court Pune',18.5275,73.8565)]
CITIES['pune'] = dict(center=(18.54, 73.82), lines=[
 ('purple','purple','Purple Line','#8C3FA0','#fff',PPURPLE,16.6,None),('aqua','aqua','Aqua Line','#12A5B8','#fff',PAQUA,14.7,None),
 ('pink','pink','Pink Line','#E0559A','#fff',PPINK,23.3,'Opened on 4 November 2026 between Maan and District Court. Six stations on the way are not open yet, so trains pass through them without stopping.')],
 aliases={'District Court Pune':['Civil Court'],'Nashik Phata':['Bhosari'],'Mangalwar Peth':['RTO'],'Savitribai Phule Pune University':['SPPU','University'],'Kasba Peth':['Budhwar Peth'],
          'PCMC Bhavan':['Pimpri','PCMC'],'Shivaji Chowk Hinjawadi':['Shree Shiv Chhatrapati Shivaji Maharaj Chowk'],'Sports Complex Mahalunge':['Balewadi Stadium','Shree Shiv Chhatrapati Sports Complex'],
          'Pune Railway Station':['Pune Junction'],'Chhatrapati Sambhaji Udyan':['Sambhaji Park'],'Yerawada':['Yerwada']},
 src='Pune Metro network as of 12 Nov 2026; positions entered by hand')

for cid, c in CITIES.items():
    LAT0, LON0 = c['center']
    KX = 111.32 * math.cos(math.radians(LAT0)); KY = 110.95
    proj = lambda la, lo: ((lo - LON0) * KX, (LAT0 - la) * KY)
    stations, lines, segs = {}, [], []
    for lid, grp, name, color, text, sts, total, note in c['lines']:
        ids = []
        for n, la, lo in sts:
            i = slug(n); ids.append(i); x, y = proj(la, lo)
            s = stations.setdefault(i, dict(n=n, lat=la, lon=lo, x=round(x, 3), y=round(y, 3), lines=[], approx=1))
            s['lines'].append(lid)
            if n in c['aliases']: s['a'] = c['aliases'][n]
        d = dict(id=lid, g=grp, name=name, color=color, text=text, st=ids, loop=False)
        if note: d['note'] = note
        lines.append(d)
        lens = [hav(a[1:], b[1:]) for a, b in zip(sts, sts[1:])]; f = total / sum(lens)
        for k, (a, b) in enumerate(zip(sts, sts[1:])):
            km = lens[k] * f
            segs.append(dict(l=lid, a=ids[k], b=ids[k+1], km=round(km, 3), min=round(km / 33 * 60 + 0.5, 1), p=[[round(v, 3) for v in proj(a[1], a[2])], [round(v, 3) for v in proj(b[1], b[2])]]))
        print(f'{cid:10s} {lid:7s} {len(ids):2d} stn  straight {sum(lens):5.1f} km -> {total} km (x{f:.2f})')
    for a in c['aliases']: assert slug(a) in stations, a
    data = dict(meta=dict(built='2026-11-12', stations=len(stations), proj=dict(lat0=LAT0, lon0=LON0, kx=KX, ky=KY), src=c['src']), lines=lines, stations=stations, segs=segs)
    open(f'{OUTDIR}/data-{cid}.js', 'w', encoding='utf-8').write('/* generated by tools/build_manual.py - do not edit by hand */\nwindow.NET=window.NET||{};window.NET.' + cid + '=' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n')
    print(f'{cid}: {len(stations)} stations, {len(segs)} segments')
