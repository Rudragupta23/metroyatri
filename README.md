# MetroYatri – Delhi Metro guide (Android app)

An independent Android app for Delhi Metro: journey planner with fare, distance and time,
interactive map with the route highlighted along the line, station details, login, and practice
ticket booking with a hand-off to DMRC's official ticket channels. Works offline.

Not made by, linked to or approved by Delhi Metro Rail Corporation.

## Get the APK (no tools needed on your computer)

1. Create a new **empty** repository on GitHub (no README).
2. Upload everything in this folder to it, including the hidden `.github` folder.
   With git:
   ```
   git init
   git add -A
   git commit -m "MetroYatri"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. Open the repository's **Actions** tab. The "Build Android APK" run starts by itself and takes about 5 minutes.
4. When it turns green, open the **Releases** page of the repository and download `MetroYatri.apk`
   (it is also attached to the run as the "MetroYatri-apk" artifact).
5. Copy the APK to an Android phone (Android 7 or newer), open it and allow "install from this source".

## Build on your own computer instead

Needs Node 22, JDK 21 and Android Studio (SDK 36).

```
npm ci
npx cap sync android
cd android && ./gradlew assembleDebug
```
The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.
`npx cap open android` opens the project in Android Studio.

## Putting it on the Play Store

The workflow builds a debug APK for installing directly. For the Play Store you need a Google Play
developer account, your own signing key and a release bundle (`./gradlew bundleRelease` after adding a
signing config in `android/app/build.gradle`). Keep the app's "not an official DMRC app" wording.

## Where things are

| Path | What |
|---|---|
| `www/` | The app: screens (`js/app.js`), routing and fares (`js/engine.js`), map (`js/map.js`), network data (`js/data.js`) |
| `android/` | Android project (Capacitor 8) with icons, splash screen and permissions |
| `.github/workflows/build-apk.yml` | Builds the APK on GitHub |
| `tools/` | Script that regenerates `www/js/data.js` from the DMRC GTFS feed and the station list |

## Data (checked 11 Nov 2026)

- 243 stations on 9 lines, including the Pink Line ring and Magenta Line Majlis Park–Deepali Chowk
  section (8 Mar 2026), Krishna Park Extension (2025) and station renames up to 2026.
- Track distances and running times: DMRC GTFS feed from Delhi Open Transit Data. Four wrong station
  positions in the feed are corrected. Newer sections use published corridor lengths; their map
  positions are approximate.
- Fares: DMRC distance bands in force since 25 Aug 2025 (₹11–₹64; lower on Sundays and national
  holidays). Airport Express fares are estimates.
- Not included: Noida Aqua Line, Rapid Metro Gurugram, Namo Bharat.

To change fares, edit `SLABS` in `www/js/engine.js`. To add a newly opened section, add its stations in
`tools/build_data.py` and `tools/wiki.csv`, then run
`python3 tools/build_data.py <gtfs folder> tools/wiki.csv www/js/data.js`.
