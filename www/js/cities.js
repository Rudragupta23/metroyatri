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
    official: {
      whatsapp: 'https://wa.me/919650855800?text=Hi', whatsappNo: '9650855800',
      app: 'https://play.google.com/store/search?q=DMRC%20Momentum%20Delhi%20Sarthi&c=apps', appName: 'official DMRC app',
      site: 'https://www.delhimetrorail.com/'
    },
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
    official: {
      whatsapp: 'https://wa.me/918300086000?text=Hi', whatsappNo: '83000 86000',
      app: 'https://play.google.com/store/search?q=CMRL%20Chennai%20Metro%20Rail&c=apps', appName: 'official CMRL app',
      site: 'https://chennaimetrorail.org/'
    },
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
    places: [
      ['Chennai Central railway station', 'Chennai Central'], ['Egmore railway station and Government Museum', 'Egmore'],
      ['Chennai airport', 'Chennai International Airport'], ['Koyambedu bus terminus (CMBT)', 'CMBT'], ['Koyambedu market', 'Koyambedu'],
      ['Vadapalani Murugan Temple', 'Vadapalani'], ['Anna Nagar Tower Park', 'Anna Nagar Tower'], ['Guindy National Park', 'Guindy'],
      ['Madras High Court and Parrys Corner', 'High Court'], ['St. Thomas Mount', 'St. Thomas Mount'], ['Little Mount shrine', 'Little Mount'],
      ['Sri Ramachandra hospital, Porur', 'Thelliyaragaram'], ['Poonamallee bus stand', 'Poonamallee Bus Stand']
    ]
  }
};
