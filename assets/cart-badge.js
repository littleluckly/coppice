/**
 * cart-badge — 页头购物车角标同步（2026-10-16 刘工反馈：加购后角标不更新，要手动刷新）。
 *
 * 监听 quick-add.js 在加购成功后派发的 cart:updated（detail.count = /cart.js
 * 查回的真实 item_count），就地更新页面上所有 [data-cart-entry]（桌面页头 +
 * 移动抽屉各一份，snippet cart-entry.liquid）：
 * - count > 0 → 建/更新 .cart-entry__count 徽标（类名样式复用 main-nav 内既有
 *   规则，绝对定位不占布局，防 CLS），并按 data-label-template-* 重写 aria-label；
 * - count = 0 → 摘除徽标，aria-label 回到 data-label-empty。
 *
 * 设计要点：
 * - 文案模板由 Liquid 渲进 data 属性（复数形式服务端定），JS 只替换 '[count]'，
 *   前端不硬编码文案；
 * - /cart/add.js 响应不含购物车总数，所以总数必须回查 /cart.js（quick-add.js 做）；
 * - 局部刷新（faceted-filters _load）替换的是卡片容器，本监听挂 document，不受影响。
 *
 * 加载：layout/theme.liquid 以 defer 引入（全站页头共用，不阻塞渲染）。
 */
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
