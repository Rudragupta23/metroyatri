/* Thin wrappers around the phone features: notifications, sharing, vibration.
   Inside the Android app they use Capacitor plugins; in a browser they fall back to web features. */
window.Native = (function () {
  'use strict';
  var cap = window.Capacitor, isNative = !!(cap && cap.nativePromise && cap.isNativePlatform && cap.isNativePlatform());
  function call(plugin, method, opts) { return cap.nativePromise(plugin, method, opts || {}); }
  var N = {
    isNative: isNative,
    /* 'granted' | 'denied' | 'prompt' */
    notifyStatus: function () {
      if (isNative) return call('LocalNotifications', 'checkPermissions').then(function (r) { return r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'prompt'; }, function () { return 'denied'; });
      if (!('Notification' in window)) return Promise.resolve('denied');
      return Promise.resolve(Notification.permission === 'default' ? 'prompt' : Notification.permission);
    },
    notifyAsk: function () {
      if (isNative) return call('LocalNotifications', 'requestPermissions').then(function (r) { return r.display === 'granted' ? 'granted' : 'denied'; }, function () { return 'denied'; });
      if (!('Notification' in window)) return Promise.resolve('denied');
      return Notification.requestPermission().then(function (p) { return p === 'granted' ? 'granted' : 'denied'; });
    },
    /* list: [{id, title, body, at: Date}] or, to repeat, [{id, title, body, on: {weekday, hour, minute}}] (weekday 1 = Sunday) */
    schedule: function (list) {
      if (!list.length) return Promise.resolve();
      if (isNative) {
        return call('LocalNotifications', 'schedule', { notifications: list.map(function (n) {
          return { id: n.id, title: n.title, body: n.body, schedule: n.on ? { on: n.on, allowWhileIdle: true } : { at: n.at.toISOString(), allowWhileIdle: true } };
        }) }).catch(function () {});
      }
      list.forEach(function (n) {
        if (n.on) return;
        var ms = n.at.getTime() - Date.now();
        N._timers[n.id] = setTimeout(function () { try { new Notification(n.title, { body: n.body }); } catch (e) {} }, Math.max(0, ms));
      });
      return Promise.resolve();
    },
    now: function (title, body, id) { return N.schedule([{ id: id || (Date.now() % 2000000000), title: title, body: body, at: new Date(Date.now() + 900) }]); },
    cancel: function (ids) {
      if (!ids.length) return Promise.resolve();
      if (isNative) return call('LocalNotifications', 'cancel', { notifications: ids.map(function (i) { return { id: i }; }) }).catch(function () {});
      ids.forEach(function (i) { clearTimeout(N._timers[i]); delete N._timers[i]; });
      return Promise.resolve();
    },
    _timers: {},
    /* Android 12 and newer: can alerts ring at the exact minute? 'granted' | 'denied' */
    exactStatus: function () {
      if (!isNative) return Promise.resolve('granted');
      return call('LocalNotifications', 'checkExactNotificationSetting').then(function (r) { return r.exact_alarm === 'granted' ? 'granted' : 'denied'; }, function () { return 'granted'; });
    },
    exactOpen: function () { return isNative ? call('LocalNotifications', 'changeExactNotificationSetting').catch(function () {}) : Promise.resolve(); },
    vibrate: function (pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern || [350, 150, 350]); } catch (e) {} },
    shareText: function (text) {
      if (isNative) return call('Share', 'share', { text: text, dialogTitle: 'Share route' }).then(function () { return 'shared'; }, function () { return 'cancelled'; });
      if (navigator.share) return navigator.share({ text: text }).then(function () { return 'shared'; }, function () { return 'cancelled'; });
      if (navigator.clipboard) return navigator.clipboard.writeText(text).then(function () { return 'copied'; }, function () { return 'failed'; });
      return Promise.resolve('failed');
    },
    /* dataUrl: PNG data URL */
    shareImage: function (dataUrl, name, text) {
      if (isNative) {
        return call('Filesystem', 'writeFile', { path: name, data: dataUrl.split(',')[1], directory: 'CACHE' })
          .then(function (r) { return call('Share', 'share', { files: [r.uri], text: text || '', dialogTitle: 'Share route' }); })
          .then(function () { return 'shared'; }, function () { return 'cancelled'; });
      }
      try {
        var bin = atob(dataUrl.split(',')[1]), arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        var file = new File([arr], name, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) return navigator.share({ files: [file], text: text || '' }).then(function () { return 'shared'; }, function () { return 'cancelled'; });
      } catch (e) {}
      var a = document.createElement('a'); a.href = dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      return Promise.resolve('saved');
    }
  };
  return N;
})();
