/**
 * Small, framework-independent behaviour for the "modern refresh" pages.
 * Loaded as a plain script (not an AMD module) so it works regardless of
 * the RequireJS boot sequence, and uses event delegation on document so it
 * keeps working across jQuery Mobile's page show/hide transitions.
 */
(function () {
  'use strict';

  function activateDiffTab(tab) {
    var buttons = document.querySelectorAll('.rf-seg-btn');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.getAttribute('data-diff-tab') === tab) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    }

    var panels = document.querySelectorAll('.rf-diff-panel');
    for (var j = 0; j < panels.length; j++) {
      var panel = panels[j];
      if (panel.getAttribute('data-diff-panel') === tab) {
        panel.classList.add('is-active');
      } else {
        panel.classList.remove('is-active');
      }
    }
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    while (target && target !== document && !target.classList.contains('rf-seg-btn')) {
      target = target.parentNode;
    }
    if (!target || target === document) {
      return;
    }
    event.preventDefault();
    activateDiffTab(target.getAttribute('data-diff-tab'));
  });

  // Anatomy diagram: tap to open full screen (with pinch-zoom) in PhotoSwipe,
  // the same viewer the species photos use.
  var anatomyViewer = null;

  document.addEventListener('click', function (event) {
    var img = event.target.closest && event.target.closest('.rf-anatomy-card img');
    if (!img || !window.Code || !window.Code.PhotoSwipe) {
      return;
    }
    event.preventDefault();

    if (!anatomyViewer) {
      var credit = img.parentNode.querySelector('.rf-anatomy-credit');
      anatomyViewer = window.Code.PhotoSwipe.attach(
        [{ url: img.getAttribute('src'), caption: 'Dragonfly anatomy ' + (credit ? credit.textContent : '') }],
        {
          jQueryMobile: true,
          preventSlideshow: true,
          allowUserZoom: true,
          loop: false,
          captionAndToolbarAutoHideDelay: 0,
          enableMouseWheel: true,
          enableKeyboard: true,
          getImageSource: function (obj) { return obj.url; },
          getImageCaption: function (obj) { return obj.caption; }
        }
      );
    }
    anatomyViewer.show(0);
  });
})();
