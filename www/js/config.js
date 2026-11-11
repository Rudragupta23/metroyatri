/* App settings you can change without touching the rest of the code. */
window.APP_CONFIG = {
  /* Verified accounts (Firebase Web API key).
     The key is NOT written here. It comes from js/secrets.js, which is created at build time:
       - on GitHub from the repository secret FIREBASE_API_KEY
       - on your computer from the .env file (run: npm run secrets)
     With no key, accounts are kept on the phone only, without verification. */
  firebaseApiKey: (window.APP_SECRETS || {}).firebaseApiKey || '',

  /* Street map shown behind the metro lines (needs internet).
     Default: OpenStreetMap's own tiles, which need no key and are meant for light use.
     For an app with many users, replace url with a tile provider that gives you a key. */
  tiles: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    credit: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
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
