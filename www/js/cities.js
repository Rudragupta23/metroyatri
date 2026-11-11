/* Per-city settings: fares, how lines connect, official ticket channels, places. Network data is in data-<city>.js */
window.CITIES = {
  delhi: {
    id: 'delhi', name: 'Delhi', system: 'Delhi Metro', operator: 'DMRC', checked: '11 Nov 2026',
    center: [28.63, 77.21], zoom: 11,
    groups: ['red', 'yellow', 'blue', 'green', 'violet', 'pink', 'magenta', 'grey', 'airport'],
    groupNames: { red: 'Red Line', yellow: 'Yellow Line', blue: 'Blue Line', green: 'Green Line', violet: 'Violet Line', pink: 'Pink Line', magenta: 'Magenta Line', grey: 'Grey Line', airport: 'Airport Express' },
    // [up to km, normal fare, Sunday and national holiday fare]
    slabs: [[2, 11, 11], [5, 21, 11], [12, 32, 21], [21, 43, 32], [32, 54, 43], [Infinity, 64, 54]],
    fareSince: '25 Aug 2025', holidayFares: true,
    card: { pct: 10, label: 'with smart card' },
    xferMin: 7,
    soft: { 'blue|blueb': 1, 'blueb|blue': 1, 'green|greenb': 1, 'greenb|green': 1 },
    trunk: { blue: { at: 'yamuna-bank', dir: 1, text: 'Noida Electronic City or Vaishali' }, green: { at: 'ashok-park-main', dir: -1, text: 'Inderlok or Kirti Nagar' } },
    term: { 'blueb|-1': 'Dwarka Sector 21', 'greenb|1': 'Brigadier Hoshiyar Singh' },
    premium: {
      line: 'airport', name: 'Airport Express',
      order: ['new-delhi', 'shivaji-stadium', 'dhaula-kuan', 'delhi-aerocity', 'indira-gandhi-international-airport', 'dwarka-sector-21', 'yashobhoomi-dwarka-sector-25'],
      fares: [[0, 21, 43, 54, 64, 64, 75], [21, 0, 32, 54, 54, 64, 64], [43, 32, 0, 32, 32, 54, 54], [54, 54, 32, 0, 21, 32, 43], [64, 54, 32, 21, 0, 21, 32], [64, 64, 54, 32, 21, 0, 21], [75, 64, 54, 43, 32, 21, 0]]
    },
    official: { buttons: [
      ['Book on DMRC WhatsApp (9650855800)', 'https://wa.me/919650855800?text=Hi'],
      ['Get the official DMRC app', 'https://play.google.com/store/search?q=DMRC%20Momentum%20Delhi%20Sarthi&c=apps']
    ], site: 'https://www.delhimetrorail.com/' },
    helplines: [['DMRC helpline', '155370'], ['CISF metro security', '155655'], ['Emergency', '112']],
    timings: 'Most lines run from about 5:30 am to 11:30 pm. The Airport Express starts earlier, around 4:45 am. First and last trains differ by station.',
    fareNotes: [
      ['Smart card', '10% off every journey. A further 10% off in off-peak hours (before 8 am, 12 noon to 5 pm, and after 9 pm) from Monday to Saturday.'],
      ['Airport Express', 'Has its own fares from ₹11 to ₹75. New Delhi to the airport (Terminal 2 and 3) is about ₹64. Airport Express fares in this app are estimates.']
    ],
    about: [
      ['What is included', '243 stations on the Red, Yellow, Blue, Green, Violet, Pink, Magenta, Grey and Airport Express lines. It includes the Pink Line ring and the Majlis Park to Deepali Chowk section of the Magenta Line opened on 8 March 2026, and station names changed up to 2026 (for example Madhuban Chowk, Seva Teerth, Dwarka-Kakrola).'],
      ['What is not included', 'Noida Aqua Line, Rapid Metro Gurugram and Namo Bharat trains have separate tickets and are not included. Sections still being built (Golden Line, Krishna Park Extension to Deepali Chowk, Soorghat station) are added in app updates once they open.'],
      ['Where the data comes from', 'Track distances and train running times come from the DMRC open transit data feed. Newer sections use the published corridor length, and their map positions are approximate. Fares use the DMRC distance bands of 25 August 2025.']
    ],
    tips: [
      'Fares are lower on Sundays and national holidays. The app switches to them by itself on Sundays.',
      'A smart card saves 10% on every journey, and 20% outside rush hours.',
      'On the Blue Line, check the board: trains go to either Noida Electronic City or Vaishali.',
      'The Pink Line is a ring. Either direction reaches your station, so take the shorter way round.',
      'Carrying luggage? Choose Fewest changes to avoid long walks between platforms.',
      'The Airport Express reaches Terminal 3 from New Delhi in about 20 minutes, at a higher fare.'
    ],
    places: [
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
    ]
  },

  chennai: {
    id: 'chennai', name: 'Chennai', system: 'Chennai Metro', operator: 'CMRL', checked: '11 Nov 2026',
    center: null, zoom: null,
    groups: ['blue', 'green', 'yellow'],
    groupNames: { blue: 'Blue Line', green: 'Green Line', yellow: 'Yellow Line' },
    slabs: [[2, 10, 10], [5, 20, 20], [12, 30, 30], [21, 40, 40], [Infinity, 50, 50]],
    fareSince: 'February 2021', holidayFares: false,
    card: { pct: 20, label: 'with Singara Chennai card or mobile QR ticket' },
    xferMin: 6, soft: {}, trunk: {}, term: {}, premium: null,
    official: { buttons: [
      ['Book on CMRL WhatsApp (83000 86000)', 'https://wa.me/918300086000?text=Hi'],
      ['Get the official CMRL app', 'https://play.google.com/store/search?q=CMRL%20Chennai%20Metro%20Rail&c=apps']
    ], site: 'https://chennaimetrorail.org/' },
    helplines: [['CMRL customer care', '18604251515'], ['Emergency', '112']],
    timings: 'Trains run from about 5 am to 11 pm. First and last trains differ by station.',
    fareNotes: [
      ['20% discount', 'Singara Chennai (NCMC) card and mobile QR tickets bought on WhatsApp, the CMRL app, Paytm or PhonePe get 20% off. Paper QR tickets bought at the station are full fare.'],
      ['Official fare table', 'CMRL sets fares station to station. This app works them out from distance bands, so check the fare at the station or in the CMRL app before you travel.']
    ],
    about: [
      ['What is included', '51 stations on the Blue Line (Wimco Nagar Depot to Airport), the Green Line (Chennai Central to St. Thomas Mount) and the Yellow Line section from Poonamallee Bypass to Vadapalani that opened on 11 October 2026.'],
      ['What is not included', 'Chennai MRTS and suburban trains have separate tickets and are not included. Yellow Line stations between Porur Junction and Vadapalani, and the rest of Phase 2, are added in app updates once they open.'],
      ['Where the data comes from', 'CMRL does not publish an open data feed, so station positions were entered by hand and are approximate. Distances are scaled to each line\'s official length, and journey times assume an average speed of 34 km/h.']
    ],
    tips: [
      'Singara Chennai card and mobile QR tickets are 20% cheaper than paper tickets.',
      'Chennai Central and Alandur are where the Blue and Green lines meet.',
      'For the Yellow Line to Poonamallee, change at Vadapalani on the Green Line.',
      'Some Green Line trains continue to the Airport, so check the board at Alandur before changing.',
      'Carrying luggage? Choose Fewest changes to avoid long walks between platforms.'
    ],
    places: [
      ['Chennai Central railway station', 'Chennai Central'], ['Egmore railway station and Government Museum', 'Egmore'],
      ['Chennai airport', 'Chennai International Airport'], ['Koyambedu bus terminus (CMBT)', 'CMBT'], ['Koyambedu market', 'Koyambedu'],
      ['Vadapalani Murugan Temple', 'Vadapalani'], ['Anna Nagar Tower Park', 'Anna Nagar Tower'], ['Guindy National Park', 'Guindy'],
      ['Madras High Court and Parrys Corner', 'High Court'], ['St. Thomas Mount', 'St. Thomas Mount'], ['Little Mount shrine', 'Little Mount'],
      ['Sri Ramachandra hospital, Porur', 'Thelliyaragaram'], ['Poonamallee bus stand', 'Poonamallee Bus Stand']
    ]
  },

  bengaluru: {
    id: 'bengaluru', name: 'Bengaluru', system: 'Namma Metro', operator: 'BMRCL', checked: '12 Nov 2026',
    center: null, zoom: null,
    groups: ['purple', 'green', 'yellow'],
    groupNames: { purple: 'Purple Line', green: 'Green Line', yellow: 'Yellow Line' },
    slabs: [[2, 10, 10], [4, 20, 20], [6, 30, 30], [8, 40, 40], [10, 50, 50], [15, 60, 60], [20, 70, 70], [25, 80, 80], [Infinity, 90, 90]],
    fareSince: 'February 2025', holidayFares: false,
    card: { pct: 5, label: 'with smart card (10% off outside rush hours)' },
    xferMin: 6, soft: {}, trunk: {}, term: {}, premium: null,
    official: { buttons: [
      ['Book on BMRCL WhatsApp (81055 56677)', 'https://wa.me/918105556677?text=Hi'],
      ['Get the official Namma Metro app', 'https://play.google.com/store/search?q=Namma%20Metro%20BMRCL&c=apps']
    ], site: 'https://www.bmrc.co.in/' },
    helplines: [['BMRCL helpline', '180042512345'], ['Emergency', '112']],
    timings: 'Trains run from about 5 am to 11 pm. First and last trains differ by station and by day of the week.',
    fareNotes: [
      ['Smart card', '5% off in rush hours and 10% off at other times, on Sundays and on national holidays.'],
      ['Proposed increase', 'A 5% fare increase announced for February 2026 (₹11 to ₹95) was put on hold. If BMRCL brings it in, fares will be slightly higher than shown here.'],
      ['Station-to-station fares', 'Journey fares in this app come from the BMRCL station-to-station fare table in the August 2026 data feed. For some station pairs BMRCL charges less than the distance band shown above.']
    ],
    about: [
      ['What is included', '83 stations on the Purple Line (Whitefield to Challaghatta), the Green Line (Madavara to Silk Institute) and the Yellow Line (RV Road to Bommasandra).'],
      ['What is not included', 'The Pink Line (Kalena Agrahara to Tavarekere) and the Blue Line were not open when the data was checked. They are added in app updates once they open.'],
      ['Where the data comes from', 'Station positions, track shapes and running times come from the community BMRCL GTFS feed, which is built from OpenStreetMap and BMRCL timetables. Fares use the distance bands of February 2025.']
    ],
    tips: [
      'Majestic is where the Purple and Green lines meet. RV Road is where the Green and Yellow lines meet.',
      'A smart card saves 5% in rush hours and 10% at other times.',
      'For Electronic City, change to the Yellow Line at RV Road.',
      'For Whitefield and ITPL, stay on the Purple Line towards Whitefield (Kadugodi).',
      'Carrying luggage? Choose Fewest changes to avoid long walks between platforms.'
    ],
    places: [
      ['MG Road and Brigade Road', 'Mahatma Gandhi Road'], ['Cubbon Park and Chinnaswamy Stadium', 'Cubbon Park'],
      ['Vidhana Soudha', 'Dr. B. R. Ambedkar Station, Vidhana Soudha'], ['Lalbagh Botanical Garden', 'Lalbagh'],
      ['KR Market', 'Krishna Rajendra Market'], ['Majestic bus stand', 'Nadaprabhu Kempegowda Station, Majestic'],
      ['KSR Bengaluru City railway station', 'Krantivira Sangolli Rayanna Railway Station'], ['Mantri Square mall', 'Mantri Square Sampige Road'],
      ['Indiranagar 100 Feet Road', 'Indiranagar'], ['ITPL and Whitefield tech parks', 'Pattandur Agrahara'],
      ['Electronic City', 'Electronic City'], ['Yeshwantpur railway station', 'Yeshwantpur'], ['KR Puram railway station', 'Krishnarajapura'],
      ['Jayanagar shopping', 'Jayanagar'], ['Silk Board junction', 'Central Silk Board'], ['Jayadeva Hospital', 'Jayadeva Hospital']
    ]
  },

  mumbai: {
    id: 'mumbai', name: 'Mumbai', system: 'Mumbai Metro', operator: 'the metro operators', checked: '12 Nov 2026',
    center: null, zoom: null,
    groups: ['blue', 'yellow', 'red', 'aqua'],
    groupNames: { blue: 'Blue Line 1', yellow: 'Yellow Line 2', red: 'Red Line 7', aqua: 'Aqua Line 3' },
    slabs: [[3, 10, 10], [12, 20, 20], [18, 30, 30], [24, 40, 40], [30, 50, 50], [Infinity, 60, 60]],
    fareGroups: [
      { id: 'l1', name: 'Blue Line 1', lines: ['l1'], slabs: [[2, 10], [5, 20], [8, 30], [Infinity, 40]] },
      { id: 'mmmocl', name: 'Yellow and Red lines', lines: ['l2a', 'l2b', 'l7'], slabs: [[3, 10], [12, 20], [18, 30], [24, 40], [30, 50], [Infinity, 60]] },
      { id: 'l3', name: 'Aqua Line 3', lines: ['l3'], slabs: [[3, 10], [12, 20], [18, 30], [24, 40], [30, 50], [36, 60], [Infinity, 70]] }
    ],
    fareSince: 'the opening of each line', holidayFares: false, card: null,
    xferMin: 7, walkMin: 9, soft: {}, trunk: {}, term: {}, premium: null,
    links: [['d-n-nagar', 'andheri-west'], ['western-express-highway', 'gundavali']],
    official: { buttons: [
      ['Get the Mumbai One app (all lines)', 'https://play.google.com/store/search?q=Mumbai%20One&c=apps'],
      ['Aqua Line 3 on WhatsApp (98730 16836)', 'https://wa.me/919873016836?text=Hi']
    ], site: 'https://www.mmmocl.co.in/' },
    helplines: [['Emergency', '112']],
    timings: 'Most lines run from about 5:30 am to 11:30 pm. Timings differ by line, so check the board at the station.',
    fareNotes: [
      ['Three operators, three tickets', 'Blue Line 1, the Yellow and Red lines, and Aqua Line 3 are run by different operators. A journey across them needs a ticket for each part. The app adds the parts together.'],
      ['One app for all', 'The Mumbai One app sells a single QR ticket that covers every part of a mixed journey.']
    ],
    about: [
      ['What is included', '77 stations on Blue Line 1, Yellow Line 2A and 2B, Red Line 7 and 9, and Aqua Line 3. It includes Line 9 to Kashigaon and Line 2B between Mandale and Chembur, both opened in 2026.'],
      ['What is not included', 'Navi Mumbai Metro, the Monorail and suburban trains have separate tickets and are not included. Yellow Line 2B is not yet joined to the other lines, so the app cannot plan journeys between it and the rest of the network.'],
      ['Where the data comes from', 'There is no open data feed for Mumbai Metro, so station positions were entered by hand and are approximate. Distances are scaled to each line\'s official length, and journey times assume an average speed of 33 km/h.']
    ],
    tips: [
      'Blue Line 1, the Yellow and Red lines, and Aqua Line 3 each need their own ticket. The Mumbai One app covers all of them.',
      'Marol Naka is where Blue Line 1 meets Aqua Line 3.',
      'D N Nagar (Line 1) and Andheri West (Line 2A) are joined by a short walk.',
      'Western Express Highway (Line 1) and Gundavali (Line 7) are joined by a walkway.',
      'For the airport, Aqua Line 3 stops at both Terminal 1 and Terminal 2.'
    ],
    places: [
      ['CSMT railway station', 'Chhatrapati Shivaji Maharaj Terminus'], ['Fort and Flora Fountain', 'Hutatma Chowk'], ['Marine Drive and Churchgate station', 'Churchgate'],
      ['Mantralaya and Nariman Point', 'Vidhan Bhavan'], ['Siddhivinayak Temple', 'Siddhivinayak'], ['Mahalaxmi Racecourse', 'Mahalaxmi'],
      ['Nehru Science Centre', 'Science Centre'], ['Mumbai Central railway station', 'Jagannath Shankar Sheth'], ['Dadar', 'Dadar'],
      ['Bandra Kurla Complex', 'Bandra Kurla Complex'], ['Airport Terminal 2 (international)', 'CSMIA - T2'], ['Airport Terminal 1 (domestic)', 'CSMIA - T1'],
      ['Sanjay Gandhi National Park', 'Rashtriya Udyan'], ['Andheri railway station', 'Andheri'], ['Ghatkopar railway station', 'Ghatkopar'], ['Versova', 'Versova']
    ]
  }
};
