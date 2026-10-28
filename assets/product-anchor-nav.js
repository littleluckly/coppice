/**
 * product-anchor-nav — 二级锚点条（task-product T-1.2）。
 *
 * 两件事：
 *   1. **死链清理**：某项的目标 id 在页面上不存在（商家删了对应 section）→ 隐藏该项；
 *      三项全无 → 整条隐藏，不留一条空工具栏。
 *   2. **scrollspy**：IntersectionObserver 观察三个落点，把 `aria-current="true"`
 *      挂在当前区块对应的链接上。用 aria-current 而不是 class —— 样式与读屏都认它。
 *
 * 无 JS：链接是原生 `<a href="#…">`，照样能跳（只是没有高亮）。死链项也照常显示，
 * 点了停在原地不会再跳 —— 相比「把整条藏起来」，这是更保守的降级。
 */
class ProductAnchorNav extends HTMLElement {
  connectedCallback() {
    this._links = Array.from(this.querySelectorAll('[data-anchor]'));
    if (this._links.length === 0) return;

    this._controller = new AbortController();
    const { signal } = this._controller;

    // 1) 死链清理
    let alive = 0;
    this._targets = [];
    this._links.forEach((link) => {
      const target = document.getElementById(link.dataset.anchor);
      const item = link.closest('li') || link;
      if (!target) {
        item.hidden = true;
        return;
      }
      alive += 1;
      this._targets.push({ id: target.id, link });
      link.addEventListener('click', (event) => this._onClick(event, target), { signal });
    });

    if (alive === 0) {
      this.hidden = true;
      return;
    }

    // 2) scrollspy
    if ('IntersectionObserver' in window) {
      this._observer = new IntersectionObserver(this._onIntersect, {
        // 顶部让开吸顶条，底部留 55% 视野：判据是"区块已经进入正文区"而不是整块可见
        rootMargin: '-64px 0px -55% 0px',
        threshold: 0,
      });
      this._targets.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) this._observer.observe(el);
      });
    }
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }

  _onClick(event, target) {
    // 交给浏览器做原生锚点跳转（会写 hash、可分享）；这里只负责把焦点送到目标上，
    // 否则键盘用户跳转后焦点还在链接上，再 Tab 会回到页面顶部
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    // 等浏览器完成滚动再聚焦，避免抢滚动
    window.setTimeout(() => target.focus({ preventScroll: true }), 0);
  }

  _onIntersect = (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      this._setCurrent(entry.target.id);
    });
  };

  _setCurrent(id) {
    this._targets.forEach(({ id: targetId, link }) => {
      if (targetId === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }
}

if (!customElements.get('product-anchor-nav')) {
  customElements.define('product-anchor-nav', ProductAnchorNav);
}
