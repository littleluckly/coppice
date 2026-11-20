/**
 * wishlist-toggle — 商品卡收藏心的最小行为（localStorage 版）。
 *
 * v1.0 范围：点击切换 aria-pressed + 持久化到 localStorage `ib:wishlist:v1`
 * （存 handle 数组，本机持久、不跨设备同步——产品决策 2026-10-09）。
 * 页面加载时按存储恢复已收藏状态。
 * 跨设备同步需 app（customer metafield / app proxy），主题内不做。
 */
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
      /* 隐私模式等场景写入失败：收藏仅在当前会话生效，静默降级 */
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
