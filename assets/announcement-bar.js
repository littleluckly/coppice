
(function () {
  'use strict';

  const MOTION_QUERY = window.matchMedia('(prefers-reduced-motion: reduce)');

  function init(root) {
    if (!root || root.dataset.announcementInitialized) return;
    root.dataset.announcementInitialized = 'true';

    const dismissButton = root.querySelector('[data-announcement-dismiss]');
    const list = root.querySelector('[data-announcement-list]');
    const items = Array.from(root.querySelectorAll('.announcement-bar__item'));
    const current = root.querySelector('[data-announcement-current]');
    const prev = root.querySelector('[data-announcement-prev]');
    const next = root.querySelector('[data-announcement-next]');

    const autoplay = root.dataset.announcementAutoplay === 'true';
    const interval = Number(root.dataset.announcementInterval) || 5000;

    const storageKey =
      root.dataset.announcementKey ||
      `coppice:announcement:closed:${root.dataset.sectionId || 'default'}`;

    let index = 0;
    let timer = null;

    const inDesignMode = Boolean(window.Shopify && window.Shopify.designMode);
    let dismissed = null;
    try {
      dismissed = sessionStorage.getItem(storageKey);
    } catch (error) {

    }
    if (dismissed === '1' && !inDesignMode) root.dataset.announcementClosed = 'true';

    dismissButton?.addEventListener('click', () => {
      try {
        sessionStorage.setItem(storageKey, '1');
      } catch (error) {

      }
      root.dataset.announcementClosed = 'true';
      stopAutoplay();
    });

    if (!list || items.length < 2) return;

    function render() {
      items.forEach((item, i) => {
        item.setAttribute('aria-hidden', i === index ? 'false' : 'true');
      });
      list.style.transform = `translateX(-${index * 100}%)`;
      if (current) current.textContent = String(index + 1);
    }

    function go(delta) {
      index = (index + delta + items.length) % items.length;
      render();
    }

    prev?.addEventListener('click', () => {
      stopAutoplay();
      go(-1);
    });
    next?.addEventListener('click', () => {
      stopAutoplay();
      go(1);
    });

    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        stopAutoplay();
        go(-1);
        event.preventDefault();
      } else if (event.key === 'ArrowRight') {
        stopAutoplay();
        go(1);
        event.preventDefault();
      }
    });

    function startAutoplay() {
      if (timer !== null) return;
      if (!autoplay) return; // 商家关闭自动循环
      if (MOTION_QUERY.matches) return; // 减少动态偏好：不自动播
      timer = window.setInterval(() => go(1), interval);
    }

    function stopAutoplay() {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
    }

    const pause = () => stopAutoplay();
    const resume = () => startAutoplay();

    root.addEventListener('mouseenter', pause);
    root.addEventListener('mouseleave', resume);
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', resume);

    render();
    startAutoplay();
  }

  document.querySelectorAll('[data-announcement]').forEach(init);

  document.addEventListener('shopify:section:load', (event) => {
    const root = document.getElementById(`shopify-section-${event.detail.sectionId}`);
    root?.querySelectorAll('[data-announcement]').forEach(init);
  });
})(window);
