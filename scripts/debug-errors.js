(function () {
  'use strict';

  var banner;

  function ensureBanner() {
    if (banner) {
      return banner;
    }
    banner = document.createElement('div');
    banner.id = 'debug-error-banner';
    banner.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:999999;' +
      'max-height:50%;overflow:auto;background:#b00020;color:#fff;' +
      'font:12px/1.4 monospace;padding:10px;white-space:pre-wrap;' +
      'word-break:break-word;box-shadow:0 -2px 8px rgba(0,0,0,.4)';
    var close = document.createElement('div');
    close.textContent = 'Close';
    close.style.cssText =
      'display:inline-block;margin-bottom:6px;padding:4px 10px;' +
      'background:#fff;color:#b00020;border-radius:4px;font-weight:bold';
    close.addEventListener('click', function () {
      banner.remove();
      banner = null;
    });
    var log = document.createElement('div');
    log.id = 'debug-error-log';
    banner.appendChild(close);
    banner.appendChild(log);
    document.body.appendChild(banner);
    return banner;
  }

  function report(label, detail) {
    ensureBanner();
    var log = document.getElementById('debug-error-log');
    var entry = document.createElement('div');
    entry.style.marginTop = '8px';
    entry.textContent = label + ': ' + detail;
    log.appendChild(entry);
  }

  window.addEventListener('error', function (e) {
    var detail = e.message;
    if (e.filename) {
      detail += ' (' + e.filename.split('/').pop() + ':' + e.lineno + ':' + e.colno + ')';
    }
    report('JS error', detail);
  });

  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason;
    var detail = (reason && (reason.stack || reason.message)) || String(reason);
    report('Unhandled promise rejection', detail);
  });
})();
