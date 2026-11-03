/**
 * cart-drawer — 购物车抽屉（2026-11-02）。
 *
 * 为什么用原生 <dialog> + showModal()：焦点锁定、背景 inert、Esc 关闭、::backdrop
 * 全由平台提供（AGENTS.md §8），手写焦点陷阱只会和它打架。这里只补四件事：
 * 滑入（桌面右侧 / 移动端底部）、点遮罩关闭、移动端下拉收起、关闭后把焦点还给触发按钮。
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
    /* 下拉收起：逻辑在 assets/bottom-sheet.js（三个底部面板共用一份）。
       只在底部面板形态下启用——桌面是从右侧滑出的窄栏，往下拽没有语义。 */
    this._detachDrag = window.BottomSheet?.attachDragToDismiss(this.dialog, {
      exclude: '[data-cart-drawer-close]',
      isActive: () => window.matchMedia('(max-width: 989.98px)').matches,
      onDragEnd: (guardUntil) => {
        this._dragEndedAt = guardUntil;
      },
    });
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
    /* 拖拽刚松手时浏览器还会补一个 click，落点可能正好在遮罩上——
       不挡掉的话，"往下拽到一半又弹回"会顺手把抽屉关掉。 */
    if (this._dragEndedAt && performance.now() < this._dragEndedAt) return;
    /* dialog 自身是点击目标 = 点在遮罩上（面板盖满了 dialog 内部） */
    if (event.target === this.dialog) this.dialog.close();
  };

  /* 拖拽收起已迁到 assets/bottom-sheet.js（三个底部面板共用），
     本组件只保留 onDragEnd 回调里的防误触 click 窗口。 */

  _onClose = () => {
    /* 拖拽留下的内联样式必须清零：不清的话下次打开会带着上一手的偏移量；
       animation 也要清——拖动期间被压成 none，不清就不会重播滑入 */
    window.BottomSheet?.reset(this.dialog);
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

      const payload = response.ok ? await response.json() : null;
      const html = payload && payload[id];

      if (html) {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const next = parsed.querySelector(`[data-cart-section="${id}"]`);
        const current = this.querySelector(`[data-cart-section="${id}"]`);
        if (next && current) current.replaceWith(next);
        return;
      }

      /* 拿不到渲染结果（例如这个静态 section 不被 Section Rendering 覆盖）时，
         用 /cart.js 核对一次数量：对不上就退回购物车页，
         绝不让顾客加了东西却看到抽屉里写着"购物车是空的"。 */
      const cart = await fetch(`${this.dataset.root || '/'}cart.js`, {
        headers: { Accept: 'application/json' },
      }).then((r) => (r.ok ? r.json() : null));

      if (cart && typeof cart.item_count === 'number') {
        const shown = Number((this.querySelector('[data-cart-drawer-count]')?.textContent || '').replace(/\D/g, ''));
        if (shown !== cart.item_count && this.dataset.cartUrl) {
          window.location.href = this.dataset.cartUrl;
        }
      }
    } catch (error) {
      /* 刷新失败不打扰顾客：抽屉里已有的内容仍然可用，只是可能不是最新 */
      if (error.name !== 'AbortError') return;
    }
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}
