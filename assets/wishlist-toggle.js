
(function () {
  var STORAGE_KEY = 'ib:wishlist:v1';

  function readList() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (error) {
      return [];
    }
  }

  function writeList(list) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (error) {

    }
  }

  function setPressed(button, pressed) {
    button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  }

  function restore() {
    var list = readList();
    var buttons = document.querySelectorAll('[data-wishlist-handle]');
    for (var i = 0; i < buttons.length; i++) {
      setPressed(buttons[i], list.indexOf(buttons[i].getAttribute('data-wishlist-handle')) !== -1);
    }
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-wishlist-handle]');
    if (!button) return;

    var handle = button.getAttribute('data-wishlist-handle');
    var list = readList();
    var index = list.indexOf(handle);

    if (index === -1) {
      list.push(handle);
      setPressed(button, true);
    } else {
      list.splice(index, 1);
      setPressed(button, false);
    }
    writeList(list);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore);
  } else {
    restore();
  }
})();
