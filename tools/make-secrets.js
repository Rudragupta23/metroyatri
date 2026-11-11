/* Writes www/js/secrets.js from the FIREBASE_API_KEY environment variable or the .env file.
   secrets.js and .env are in .gitignore, so the key never goes into the repository. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let key = process.env.FIREBASE_API_KEY || '';
const envFile = path.join(root, '.env');
if (!key && fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*FIREBASE_API_KEY\s*=\s*(.*)$/);
    if (m) key = m[1].trim().replace(/^['"]|['"]$/g, '');
  }
}
if (key && !/^[A-Za-z0-9_\-]{20,}$/.test(key)) { console.error('FIREBASE_API_KEY does not look like an API key.'); process.exit(1); }
fs.writeFileSync(path.join(root, 'www', 'js', 'secrets.js'), '/* generated at build time - do not commit */\nwindow.APP_SECRETS = ' + JSON.stringify({ firebaseApiKey: key }) + ';\n');
console.log(key ? 'secrets.js written: verified accounts ON (key ending ' + key.slice(-4) + ')' : 'secrets.js written: no key found, accounts stay on the phone');
