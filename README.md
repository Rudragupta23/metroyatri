# MetroYatri

**A metro guide for 7 Indian cities, built as an installable Android app.**

Plan a journey, see the fare and time, follow the route on a map, and get an alert one stop before you get off. Works in English and Hindi.

> MetroYatri is an independent app. It is not made by, linked to or approved by any metro operator.

---

## Cities

| City | Network | Stations |
| --- | --- | --- |
| Delhi | Delhi Metro | 243 |
| Bengaluru | Namma Metro | 83 |
| Mumbai | Mumbai Metro | 77 |
| Hyderabad | Hyderabad Metro | 56 |
| Kolkata | Kolkata Metro | 55 |
| Chennai | Chennai Metro | 51 |
| Pune | Pune Metro | 45 |

Switch city at any time. Stations, fares, map, places and ticket links all follow the city you choose.

---

## Features

**Journey planning**
- Fastest route, fewest changes or shortest distance
- Fare, distance, travel time, number of stops and changes
- Door-to-door planning: type an address or landmark and get the nearest stations with walking time
- Nearest station from your location
- Monthly cost calculator

**On the journey**
- Arrival alert: the phone vibrates one stop before you get off or change trains
- Works underground, because it uses the planned times and not GPS
- Daily reminder for your regular journey

**Map and stations**
- Metro lines drawn over a real street map, with your route highlighted
- Station pages with lines, next stations and nearby places
- Popular places and the station to get off at

**Account**
- Email accounts with verification (Firebase Authentication)
- Saved routes and bookings sync across phones (Cloud Firestore)
- Profile photo and editable name

**More**
- Share a route as a picture or as text
- English and Hindi, including all station names
- Dark mode
- Practice ticket booking, clearly marked as not valid for travel, with links to each operator's official ticket channels
- Privacy policy inside the app

---

## Tech stack

| Part | Used |
| --- | --- |
| App shell | Capacitor 8 (Android) |
| Interface | HTML, CSS and plain JavaScript, no framework |
| Map | Leaflet with OpenStreetMap tiles |
| Address search | OpenStreetMap Nominatim |
| Accounts | Firebase Authentication (REST) |
| Sync | Cloud Firestore (REST) |
| Phone features | Capacitor Local Notifications, Share, Filesystem, App |
| Build | GitHub Actions |

---

## Project structure

```
metroyatri/
├── www/                     the app itself
│   ├── index.html
│   ├── css/app.css
│   ├── fonts/
│   └── js/
│       ├── app.js           screens and app logic
│       ├── engine.js        route and fare calculation
│       ├── map.js           map screen
│       ├── auth.js          accounts
│       ├── sync.js          Firestore sync
│       ├── native.js        notifications, sharing, vibration
│       ├── i18n.js          language switching
│       ├── lang-hi.js       Hindi screen text
│       ├── lang-hi-city.js  Hindi city text
│       ├── names-hi.js      Hindi station names (generated)
│       ├── cities.js        settings for each city
│       ├── config.js        app settings
│       └── data-*.js        network data for each city
├── android/                 Android project
├── tools/                   scripts that build the data files
├── docs/privacy-policy.html public privacy policy
└── .github/workflows/       automatic APK build
```

---

## Download the app

1. Open the **Releases** page of this repository.
2. Download `MetroYatri.apk` from the latest build.
3. Open it on an Android phone (Android 7 or newer) and allow "install from this source".


---

## Data and accuracy

- **Delhi:** distances and running times from the DMRC open transit data feed.
- **Bengaluru:** community BMRCL GTFS feed, with the official station-to-station fare table.
- **Chennai, Mumbai, Hyderabad, Kolkata, Pune:** no open data feed exists, so station positions were entered by hand and are approximate.
- Fares are worked out from each operator's published distance bands and can be one band out near a boundary. Always confirm at the station or in the official app.
- Arrival alerts use planned times, not live train positions.

---

## Privacy

- No adverts and no tracking.
- Location is used only on the phone to find the nearest station. It is not stored or sent anywhere.
- Accounts, saved routes and practice bookings are stored in Firebase under the user's own account.
- Users can delete their account and data from inside the app.

Full policy: [`docs/privacy-policy.html`](docs/privacy-policy.html)

---

## License

Released under the [MIT License](LICENSE).