/* App settings you can change without touching the rest of the code. */
window.APP_CONFIG = {
  /* Verified accounts (Firebase Web API key).
     The key is NOT written here. It comes from js/secrets.js, which is created at build time:
       - on GitHub from the repository secret FIREBASE_API_KEY
       - on your computer from the .env file (run: npm run secrets)
     With no key, accounts are kept on the phone only, without verification. */
  firebaseApiKey: (window.APP_SECRETS || {}).firebaseApiKey || '',

  /* Cloud sync of saved routes and bookings (Firestore). This is the Project ID shown in
     Firebase console > Project settings. It is not a secret. Leave empty to switch sync off. */
  firebaseProjectId: 'metroyatri-23',

  /* Address and landmark search for door-to-door planning (OpenStreetMap Nominatim, light use only). */
  geocoder: 'https://nominatim.openstreetmap.org/search',

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
    role: 'Full stack and Data Analytics Developer',
    /* shown in the privacy policy as the contact; leave empty to point people to the GitHub page */
    contactEmail: '',
    repo: 'https://github.com/Rudragupta23/metroyatri',
    about: 'B.Tech Computer Science and Engineering student at Vellore Institute of Technology. I build web and mobile apps and made MetroYatri to make metro travel simpler to plan.',
    links: [
      ['Portfolio', 'https://rudraguptaportfolio.live'],
      ['GitHub', 'https://github.com/Rudragupta23'],
      ['LinkedIn', 'https://www.linkedin.com/in/rudrag23']
    ]
  }
};
