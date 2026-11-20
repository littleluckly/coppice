
(() => {
  const root = document.querySelector('[data-cart-recommendations]');
  if (!root || root.dataset.personalized === 'false') return;

  const sectionId = root.dataset.sectionId;
  const seedId = root.dataset.seedProductId;
  const grid = root.querySelector('[data-cart-recommendations-grid]');
  if (!sectionId || !seedId || !grid) return;

  const cartList = document.querySelector('cart-items');
  const inCart = new Set(
    (cartList?.dataset.cartProductIds || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );

  const rootUrl = (root.dataset.root || '/').replace(/\/$/, '');
  const limit = root.dataset.limit || '4';
  const endpoint =
    `${rootUrl}/recommendations/products` +
    `?section_id=${encodeURIComponent(sectionId)}` +
    `&product_id=${encodeURIComponent(seedId)}` +
    `&intent=complementary` +
    `&limit=${encodeURIComponent(limit)}`;

  root.dataset.personalizing = 'true';

  fetch(endpoint, { headers: { Accept: 'text/html' } })
    .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
    .then((html) => {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const nextGrid = parsed.querySelector('[data-cart-recommendations-grid]');
      if (!nextGrid) return;

      nextGrid.querySelectorAll('[data-recommendation-id]').forEach((item) => {
        if (inCart.has(item.dataset.recommendationId)) item.remove();
      });

      if (!nextGrid.querySelector('[data-recommendation-id]')) return;

      grid.replaceWith(nextGrid);
    })
    .catch(() => {

    })
    .finally(() => {
      delete root.dataset.personalizing;
    });
})();
