/* Keeps saved routes and bookings in the user's own Firestore document (users/{uid}), so they follow the account.
   Needs: a Firebase key (verified accounts), firebaseProjectId in config.js, and Firestore rules that let a user
   read and write only users/{their uid}. */
window.Sync = (function () {
  'use strict';
  var CFG = window.APP_CONFIG || {}, Auth = window.Auth;
  var base = function () { return 'https://firestore.googleapis.com/v1/projects/' + CFG.firebaseProjectId + '/databases/(default)/documents/users/'; };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('my.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('my.' + k, JSON.stringify(v)); } catch (e) {} }
  };
  var timer = null, busy = false, again = false, listeners = [];
  function favKey(x) { return x.join('|'); }
  function user() { var u = Auth.current(); return u && u.mode === 'cloud' && u.verified ? u : null; }
  function local(u) { return { favs: store.get('favs.' + u.key, []), tickets: store.get('tickets.' + u.key, []), gone: store.get('gone.' + u.key, {}) }; }
  function merge(a, b) {
    var gone = {}, k;
    for (k in a.gone) gone[k] = a.gone[k];
    for (k in (b.gone || {})) gone[k] = Math.max(gone[k] || 0, b.gone[k]);
    var favs = [], seen = {};
    a.favs.concat(b.favs || []).forEach(function (f) { var key = 'f:' + favKey(f); if (!seen[key] && !gone[key]) { seen[key] = 1; favs.push(f); } });
    var tickets = [], st = {};
    a.tickets.concat(b.tickets || []).forEach(function (t) { var key = 't:' + t.id; if (!st[key] && !gone[key]) { st[key] = 1; tickets.push(t); } });
    tickets.sort(function (x, y) { return y.at - x.at; });
    var keys = Object.keys(gone).sort(function (x, y) { return gone[y] - gone[x]; }).slice(0, 200), g2 = {};
    keys.forEach(function (x) { g2[x] = gone[x]; });
    return { favs: favs.slice(0, 30), tickets: tickets.slice(0, 50), gone: g2 };
  }
  function state(s) { store.set('syncState', s); listeners.forEach(function (f) { try { f(s); } catch (e) {} }); }
  function run() {
    var u = user();
    if (!S.available() || !u) return Promise.resolve(false);
    if (busy) { again = true; return Promise.resolve(false); }
    busy = true;
    return Auth.token().then(function (tok) {
      var url = base() + encodeURIComponent(u.key), H = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
      return fetch(url, { headers: H }).then(function (r) {
        if (r.status === 404) return {};
        if (!r.ok) return r.json().then(function (j) { throw (j.error && j.error.status) || ('HTTP ' + r.status); });
        return r.json().then(function (j) { try { return JSON.parse(j.fields.data.stringValue); } catch (e) { return {}; } });
      }).then(function (remote) {
        var before = local(u), m = merge(before, remote);
        store.set('favs.' + u.key, m.favs); store.set('tickets.' + u.key, m.tickets); store.set('gone.' + u.key, m.gone);
        var changedLocal = JSON.stringify([before.favs, before.tickets]) !== JSON.stringify([m.favs, m.tickets]);
        var same = JSON.stringify([remote.favs || [], remote.tickets || [], remote.gone || {}]) === JSON.stringify([m.favs, m.tickets, m.gone]);
        var done = function () { state({ ok: true, at: Date.now() }); return changedLocal; };
        if (same) return done();
        return fetch(url + '?updateMask.fieldPaths=data&updateMask.fieldPaths=updatedAt', { method: 'PATCH', headers: H,
          body: JSON.stringify({ fields: { data: { stringValue: JSON.stringify(m) }, updatedAt: { integerValue: String(Date.now()) } } }) })
          .then(function (r) { if (!r.ok) return r.json().then(function (j) { throw (j.error && j.error.status) || ('HTTP ' + r.status); }); return done(); });
      });
    }).then(function (changed) { busy = false; if (again) { again = false; S.soon(); } return changed; },
      function (err) { busy = false; state({ ok: false, at: Date.now(), err: String(err && err.message ? 'offline' : err) }); return false; });
  }
  var S = {
    available: function () { return !!(Auth.cloud && CFG.firebaseProjectId); },
    active: function () { return S.available() && !!user(); },
    now: run,
    soon: function () { clearTimeout(timer); timer = setTimeout(run, 1500); },
    /* remember that something was deleted, so another phone does not bring it back */
    forget: function (kind, key) { var u = user(); if (!u) return; var g = store.get('gone.' + u.key, {}); g[kind + ':' + key] = Date.now(); store.set('gone.' + u.key, g); },
    status: function () { return store.get('syncState', null); },
    onChange: function (f) { listeners.push(f); },
    wipe: function () {
      var u = user(); if (!S.available() || !u) return Promise.resolve();
      return Auth.token().then(function (tok) { return fetch(base() + encodeURIComponent(u.key), { method: 'DELETE', headers: { Authorization: 'Bearer ' + tok } }); }).catch(function () {});
    }
  };
  return S;
})();
