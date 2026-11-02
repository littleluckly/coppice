/**
 * cart-recommendations — 购物车补充建议的个性化层（task-cart T-1.5）。
 *
 * 服务端已经渲染了商家指定的集合（回退态，也是无 JS 时的全部内容）。
 * 这个脚本只做一件事：拿车内第一台主机的 id 去要"互补商品"，拿到就替换，
 * 拿不到（未配置 Search & Discovery / 网络失败 / 返回空）**保持回退态不动**。
 *
 * 三条纪律：
 * 1. 不阻塞、不闪烁：请求期间只把网格降到 35% 透明度，失败静默恢复。
 * 2. 不再显示车内已有的商品——服务端渲染时 `cart` 可用会过滤一遍，
 *    这里再按 DOM 里带下来的 id 兜一次，防止平台行为变化后重复推荐。
 * 3. 不拼接站内路径：根路径由 Liquid 的 `routes.root_url` 下发到 data-root。
 */
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

      /* 一条都不剩 = 没有互补关系可用，保留服务端的集合列表，别把模块清空 */
      if (!nextGrid.querySelector('[data-recommendation-id]')) return;

      grid.replaceWith(nextGrid);
    })
    .catch(() => {
      /* 个性化是增强，失败不打扰顾客，也不上报到 console 污染生产日志 */
    })
    .finally(() => {
      delete root.dataset.personalizing;
    });
})();
