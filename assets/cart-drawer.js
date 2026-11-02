/**
 * cart-drawer — 购物车抽屉（2026-11-02）。
 *
 * 为什么用原生 <dialog> + showModal()：焦点锁定、背景 inert、Esc 关闭、::backdrop
 * 全由平台提供（AGENTS.md §8），手写焦点陷阱只会和它打架。这里只补三件事：
 * 右侧滑入、点遮罩关闭、关闭后把焦点还给触发按钮。
 *
 * 为什么监听 document 的 cart:added：那是 quick-add 派发的跨组件事件（项目既有约定，
 * 见 assets/quick-add.js）。抽屉和商品卡永远不在同一棵子树里，只能走 document。
 * 监听器仍挂在 AbortController 上，元素断开时一次性摘除，不会重复绑定。
 *
 * 刷新策略：`?sections=<自身 id>` 取回本 section 的最新渲染，替换内容区。
 * 不拿 /cart.js 自己拼 DOM —— 折扣、订阅计划、物流提示都是条件渲染，
 * 手拼必然漏条件。刷新失败静默保留已渲染内容（抽屉里永远有东西可看）。
 */
class CartDrawer extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    if (!this.dialog) return;

    this._ac = new AbortController();
    const { signal } = this._ac;

    /* 页头入口（桌面 + 移动抽屉各一份），由本元素主动接管，不做全局 click 委托 */
    document.querySelectorAll('[data-cart-drawer-open]').forEach((trigger) => {
      trigger.addEventListener('click', this._onOpen, { signal });
    });

    const closeButton = this.querySelector('[data-cart-drawer-close]');
    if (closeButton) closeButton.addEventListener('click', () => this.dialog.close(), { signal });

    this.dialog.addEventListener('click', this._onBackdropClick, { signal });
    this.dialog.addEventListener('close', this._onClose, { signal });

    document.addEventListener('cart:added', this._onAdded, { signal });
    document.addEventListener('cart:updated', this._onCountChange, { signal });
  }

  disconnectedCallback() {
    this._ac.abort();
  }

  _onOpen = (event) => {
    event.preventDefault();
    this._lastTrigger = event.currentTarget;
    this._show();
  };

  _onAdded = () => {
    /* 加购成功即打开：顾客不用再点一次图标。内容由 _refresh 拉最新 */
    this._show();
  };

  _show() {
    if (!this.dialog.open) {
      this.dialog.showModal();
      document.documentElement.dataset.cartDrawerOpen = '';
    }
    this._refresh();
  }

  /** 只改标题计数，不整块刷新——抽屉内改数量时 cart-items 已经自己换过内容区了 */
  _onCountChange = (event) => {
    const count = event.detail && event.detail.count;
    const el = this.querySelector('[data-cart-drawer-count]');
    if (el && typeof count === 'number') el.textContent = `(${count})`;
  };

  _onBackdropClick = (event) => {
    /* dialog 自身是点击目标 = 点在遮罩上（面板盖满了 dialog 内部） */
    if (event.target === this.dialog) this.dialog.close();
  };

  _onClose = () => {
    delete document.documentElement.dataset.cartDrawerOpen;
    if (this._lastTrigger && this._lastTrigger.isConnected) {
      this._lastTrigger.focus({ preventScroll: true });
    }
  };

  async _refresh() {
    const id = this.dataset.sectionId;
    if (!id) return;

    try {
      const response = await fetch(
        `${window.location.pathname}?sections=${encodeURIComponent(id)}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!response.ok) return;

      const payload = await response.json();
      const html = payload && payload[id];
      if (!html) return;

      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const next = parsed.querySelector(`[data-cart-section="${id}"]`);
      const current = this.querySelector(`[data-cart-section="${id}"]`);
      if (next && current) current.replaceWith(next);
    } catch (error) {
      /* 刷新失败不打扰顾客：抽屉里已有的内容仍然可用，只是可能不是最新 */
      if (error.name !== 'AbortError') return;
    }
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}
