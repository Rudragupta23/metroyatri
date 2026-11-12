/* Accounts.
   With a Firebase Web API key in config.js: real accounts, email must be verified by a link sent to the inbox.
   Without a key: accounts live on this phone only and are not verified. */
window.Auth = (function () {
  'use strict';
  var KEY = ((window.APP_CONFIG || {}).firebaseApiKey || '').trim();
  var cloud = !!KEY;
  var IDT = 'https://identitytoolkit.googleapis.com/v1/accounts:', TOK = 'https://securetoken.googleapis.com/v1/token?key=';
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('my.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('my.' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var MSG = {
    EMAIL_EXISTS: 'An account with this email already exists. Log in instead.',
    EMAIL_NOT_FOUND: 'No account found for this email. Create an account first.',
    INVALID_PASSWORD: 'Wrong password. Try again.',
    INVALID_LOGIN_CREDENTIALS: 'Email or password is wrong. Try again.',
    INVALID_EMAIL: 'Enter a valid email address.',
    USER_DISABLED: 'This account has been disabled.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Wait a few minutes and try again.',
    OPERATION_NOT_ALLOWED: 'Email sign-in is not switched on in the Firebase project.',
    TOKEN_EXPIRED: 'Your login has expired. Log in again.',
    INVALID_REFRESH_TOKEN: 'Your login has expired. Log in again.',
    USER_NOT_FOUND: 'This account no longer exists.'
  };
  function nice(code) {
    code = String(code || '');
    if (code.indexOf('WEAK_PASSWORD') === 0) return 'Use a password with at least 6 characters.';
    if (code.indexOf('API key not valid') >= 0) return 'The Firebase API key in config.js is not valid.';
    return MSG[code.split(' ')[0]] || 'Could not complete this. (' + code + ')';
  }
  function post(url, body, form) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' }, body: form ? body : JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw nice(j && j.error && j.error.message); return j; }); },
        function () { throw 'No internet connection. Connect and try again.'; });
  }
  function call(method, body) { return post(IDT + method + '?key=' + KEY, body); }
  function validEmail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
  function session() { return store.get('session2', null); }
  function save(s) { store.set('session2', s); return s; }
  function hash(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    var h = 5381; for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return Promise.resolve('x' + (h >>> 0).toString(16));
  }
  function token() {
    var s = session();
    if (!s || s.mode !== 'cloud') return Promise.reject('Log in again.');
    if (s.exp > Date.now() + 60000) return Promise.resolve(s.idToken);
    return post(TOK + KEY, 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(s.refresh), true).then(function (j) {
      s.idToken = j.id_token; s.refresh = j.refresh_token; s.exp = Date.now() + (+j.expires_in) * 1000; save(s); return s.idToken;
    });
  }
  function fromAuth(j, name, verified) {
    return save({ mode: 'cloud', key: j.localId, email: j.email, name: name || j.displayName || j.email.split('@')[0], verified: !!verified,
      idToken: j.idToken, refresh: j.refreshToken, exp: Date.now() + (+j.expiresIn || 3600) * 1000 });
  }

  var A = {
    cloud: cloud,
    token: token,
    current: function () {
      var s = session(); if (!s) return null;
      if (s.mode === 'cloud' && !cloud) return null;
      if (s.mode === 'local') { var u = store.get('users', {})[s.key]; if (!u) return null; s = { mode: 'local', key: u.key, email: u.key, name: u.name, verified: false }; }
      var p = store.get('profile.' + s.key, {});
      return { mode: s.mode, key: s.key, email: s.email, name: p.name || s.name, verified: s.mode === 'cloud' ? s.verified : false, photo: p.photo || null };
    },
    signup: function (name, id, pw) {
      name = name.trim(); id = id.trim().toLowerCase();
      if (name.length < 2) return Promise.reject('Enter your name.');
      if (pw.length < 6) return Promise.reject('Use a password with at least 6 characters.');
      if (cloud) {
        if (!validEmail(id)) return Promise.reject('Enter a valid email address. A verification link will be sent to it.');
        return call('signUp', { email: id, password: pw, returnSecureToken: true }).then(function (j) {
          fromAuth(j, name, false);
          return call('update', { idToken: j.idToken, displayName: name, returnSecureToken: false }).catch(function () {})
            .then(function () { return call('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: j.idToken }); })
            .then(function () { return A.current(); });
        });
      }
      id = id.replace(/\s+/g, '');
      if (!validEmail(id) && !/^\+?\d{10,13}$/.test(id)) return Promise.reject('Enter a valid email address or a 10-digit mobile number.');
      var users = store.get('users', {});
      if (users[id]) return Promise.reject('An account with this email or mobile already exists on this phone. Log in instead.');
      var salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
      return hash(salt + pw).then(function (h) {
        users[id] = { key: id, name: name, salt: salt, hash: h, since: Date.now() };
        store.set('users', users); save({ mode: 'local', key: id }); return A.current();
      });
    },
    login: function (id, pw) {
      id = id.trim().toLowerCase();
      if (cloud) {
        if (!validEmail(id)) return Promise.reject('Enter the email address you signed up with.');
        return call('signInWithPassword', { email: id, password: pw, returnSecureToken: true }).then(function (j) {
          return call('lookup', { idToken: j.idToken }).then(function (l) {
            var u = (l.users || [])[0] || {};
            fromAuth(j, u.displayName, u.emailVerified); return A.current();
          });
        });
      }
      id = id.replace(/\s+/g, '');
      var u = store.get('users', {})[id];
      if (!u) return Promise.reject('No account found for this email or mobile on this phone. Create an account first.');
      return hash(u.salt + pw).then(function (h) {
        if (h !== u.hash) return Promise.reject('Wrong password. Try again.');
        save({ mode: 'local', key: u.key }); return A.current();
      });
    },
    /* asks the server whether the link in the email has been opened */
    checkVerified: function () {
      return token().then(function (t) { return call('lookup', { idToken: t }); }).then(function (l) {
        var u = (l.users || [])[0] || {}, s = session();
        s.verified = !!u.emailVerified; save(s); return s.verified;
      });
    },
    resend: function () { return token().then(function (t) { return call('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: t }); }); },
    reset: function (email) {
      email = email.trim().toLowerCase();
      if (!validEmail(email)) return Promise.reject('Type your email address above first.');
      return call('sendOobCode', { requestType: 'PASSWORD_RESET', email: email });
    },
    setName: function (name) {
      var u = A.current(); if (!u) return;
      var p = store.get('profile.' + u.key, {}); p.name = name; store.set('profile.' + u.key, p);
      if (u.mode === 'cloud') token().then(function (t) { return call('update', { idToken: t, displayName: name, returnSecureToken: false }); }).catch(function () {});
    },
    setPhoto: function (dataUrl) {
      var u = A.current(); if (!u) return;
      var p = store.get('profile.' + u.key, {}); if (dataUrl) p.photo = dataUrl; else delete p.photo; store.set('profile.' + u.key, p);
    },
    logout: function () { save(null); },
    remove: function () {
      var u = A.current(); if (!u) return Promise.resolve();
      function wipe() { store.set('profile.' + u.key, {}); store.set('tickets.' + u.key, []); store.set('favs.' + u.key, []); save(null); }
      if (u.mode === 'cloud') return (window.Sync ? window.Sync.wipe() : Promise.resolve()).then(token).then(function (t) { return call('delete', { idToken: t }); }).then(wipe);
      var users = store.get('users', {}); delete users[u.key]; store.set('users', users); wipe();
      return Promise.resolve();
    }
  };
  return A;
})();
