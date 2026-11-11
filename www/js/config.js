/* App settings you can change without touching the rest of the code. */
window.APP_CONFIG = {
  /* Verified accounts.
     Paste the Web API key of your own Firebase project here to switch on email-verified accounts
     (Firebase console > Project settings > General > Web API key; enable Authentication > Email/Password).
     Leave it empty and accounts are kept on the phone only, without verification. */
  firebaseApiKey: 'AIzaSyDQtStquJSzrFumLaRzidqs5tHViz4ZOu0',

  /* Street map shown behind the metro lines (needs internet). {s} {z} {x} {y} {r} are filled in by the map. */
  tiles: {
    light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    credit: '&copy; OpenStreetMap contributors &copy; CARTO'
  },

  developer: {
    name: 'Rudra Gupta',
    role: 'Full stack and data analytics developer',
    about: 'B.Tech Computer Science and Engineering student at VIT Bhopal (2023 to 2027). I build web and mobile apps, and made MetroYatri to make metro travel simpler to plan.',
    links: [
      ['Portfolio', 'https://rudraguptaportfolio.live'],
      ['GitHub', 'https://github.com/Rudragupta23'],
      ['LinkedIn', 'https://www.linkedin.com/in/rudrag23']
    ]
  }
};
