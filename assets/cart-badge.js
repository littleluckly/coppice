
(() => {
  const COUNT_KEY_ONE = 'labelTemplateOne';
  const COUNT_KEY_OTHER = 'labelTemplateOther';

  function labelFor(link, count) {
    const template = link.dataset[count === 1 ? COUNT_KEY_ONE : COUNT_KEY_OTHER] || '';
    return template.replace('[count]', String(count));
  }

  function updateEntry(entry, count) {
    const link = entry.querySelector('[data-cart-link]');
    if (!link) return;

    let badge = link.querySelector('.cart-entry__count');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart-entry__count';
        badge.setAttribute('aria-hidden', 'true');
        link.appendChild(badge);
      }
      badge.textContent = count;
      const label = labelFor(link, count);
      if (label) link.setAttribute('aria-label', label);
    } else if (badge) {
      badge.remove();
      if (link.dataset.labelEmpty) link.setAttribute('aria-label', link.dataset.labelEmpty);
    }
  }

  document.addEventListener('cart:updated', (event) => {
    const count = event.detail && event.detail.count;
    if (typeof count !== 'number' || count < 0) return;
    document.querySelectorAll('[data-cart-entry]').forEach((entry) => {
      updateEntry(entry, count);
    });
  });
})();
