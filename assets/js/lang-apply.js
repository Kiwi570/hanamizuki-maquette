/* Langue appliquée avant le premier affichage : script classique placé juste après i18n.js (avant les modules). */
(function () {
  var d = document.documentElement, I = window.HZ_I18N || {}, l = d.lang;
  try {
    if (l === 'ja') return;
    var t = function (k) { var e = I[k]; return e ? (e[l] != null ? e[l] : e.ja) : k; };
    var all = function (s, f) { var n = document.querySelectorAll(s); for (var i = 0; i < n.length; i++) f(n[i]); };
    all('[data-i18n]', function (n) { n.innerHTML = t(n.getAttribute('data-i18n')); });
    all('[data-i18n-alt]', function (n) { n.alt = t(n.getAttribute('data-i18n-alt')); });
    all('[data-i18n-attr]', function (n) {
      n.getAttribute('data-i18n-attr').split(';').forEach(function (p) { var a = p.split(':'); n.setAttribute(a[0], t(a[1])); });
    });
    all('[data-lang-cur]', function (n) { n.textContent = l.toUpperCase(); });
  } finally {
    d.classList.remove('i18n-wait');
  }
})();
