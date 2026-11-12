/* Language support. English text is the key; lang-hi.js holds the Hindi for each key.
   T('Change trains at {0}', name) -> translated text with {0} filled in. */
(function () {
  'use strict';
  var lang = 'en';
  try { lang = JSON.parse(localStorage.getItem('my.lang') || '"en"'); } catch (e) {}
  var I = window.I18N = {
    lang: lang === 'hi' ? 'hi' : 'en',
    missing: {},
    set: function (l) { I.lang = l === 'hi' ? 'hi' : 'en'; try { localStorage.setItem('my.lang', JSON.stringify(I.lang)); } catch (e) {} document.documentElement.lang = I.lang; },
    locale: function () { return I.lang === 'hi' ? 'hi-IN' : 'en-IN'; }
  };
  window.T = function (s) {
    var out = s;
    if (I.lang === 'hi') { var d = window.LANG_HI || {}; if (d[s] !== undefined) out = d[s]; else I.missing[s] = 1; }
    for (var i = 1; i < arguments.length; i++) out = out.split('{' + (i - 1) + '}').join(arguments[i]);
    return out;
  };
  /* station name in the current language */
  window.stationName = function (city, id, st) {
    if (I.lang === 'hi') { var n = (window.NAMES_HI || {})[city]; if (n && n[id]) return n[id]; }
    return st.n;
  };
  document.documentElement.lang = I.lang;
})();
