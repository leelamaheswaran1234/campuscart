(function () {
  try {
    var scripts = document.getElementsByTagName('script');
    var own = null;
    for (var i = 0; i < scripts.length; i++) if ((scripts[i].src || '').indexOf('analytics-tracker.js') !== -1) own = scripts[i];
    if (!own) return;
    var root = own.src.split('js/analytics-tracker.js')[0];
    var basePath = new URL(root).pathname;
    var page = window.location.pathname.indexOf(basePath) === 0 ? window.location.pathname.slice(basePath.length - 1) : window.location.pathname;
    if (window.location.hash) page += window.location.hash;
    if (/\/admin\//i.test(page)) return;
    fetch(root + 'api/track.php', {method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', keepalive:true, body:JSON.stringify({page:page})}).catch(function(){});
  } catch (e) {}
})();
