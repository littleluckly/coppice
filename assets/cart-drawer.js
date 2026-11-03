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
    if (closeButton) closeButton.addEventListener('click', () => this._closeAnimated(), { signal });

    this.dialog.addEventListener('click', this._onBackdropClick, { signal });
    this.dialog.addEventListener('cancel', this._onCancel, { signal });
    this.dialog.addEventListener('pointerdown', this._onDragStart, { signal });
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
    /* 收起动画进行中又被打开（如加购自动弹出）：作废未完成的关闭，
       清掉关闭路径留下的标记——否则 is-closing 挂着，滑入会被下滑顶掉 */
    this._closing = false;
    this._closeGen = (this._closeGen || 0) + 1;
    this.dialog.classList.remove('is-closing');
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
    if (event.target === this.dialog) this._closeAnimated();
  };

  /* Esc：拦下原生立即关闭，走下滑动画收场（与关闭钮/遮罩同一路径） */
  _onCancel = (event) => {
    event.preventDefault();
    this._closeAnimated();
  };

  /**
   * 动画收口关闭（2026-11-03 刘工：关闭从闪现改为向下滑出，与滑入对称）。
   * 原生 dialog 的 close() 即 display:none——动画必须赶在 close() 之前播：
   * 常规路径挂 .is-closing 播下滑 keyframes，animationend 后才真正 close()；
   * 拖拽路径（fromDrag）transform 已在下拉途中，改用 transition 顺势滑到屏外。
   * 桌面右侧抽屉不做下滑（"向下滑出"没有语义），reduced-motion 同样直接关闭。
   * setTimeout 兜底 animationend/transitionend 偶发不触发（无头浏览器虚拟时间）；
   * 代次计数让"收起途中又被打开"作废未完成的关闭（见 _show）。
   * 内联样式与 is-closing 的清理由 _onClose 统一收口。
   */
  _closeAnimated(fromDrag = false) {
    const dialog = this.dialog;
    if (!dialog.open || this._closing) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 989.98px)').matches;
    if (reduce || !mobile) {
      dialog.close();
      return;
    }
    this._closing = true;
    const gen = (this._closeGen = (this._closeGen || 0) + 1);
    let done = false;
    const finish = () => {
      if (done || gen !== this._closeGen) return;
      done = true;
      dialog.close();
    };
    if (fromDrag) {
      dialog.style.transition = 'transform 0.22s ease-in';
      dialog.style.transform = 'translateY(100%)';
      const onTransEnd = (event) => {
        if (event.target !== dialog || event.propertyName !== 'transform') return;
        dialog.removeEventListener('transitionend', onTransEnd);
        finish();
      };
      dialog.addEventListener('transitionend', onTransEnd);
    } else {
      dialog.classList.add('is-closing');
      const onAnimEnd = (event) => {
        /* ::backdrop 的动画也以 dialog 为 target，按 keyframes 名字区分 */
        if (event.animationName !== 'cart-drawer-slide-down') return;
        dialog.removeEventListener('animationend', onAnimEnd);
        finish();
      };
      dialog.addEventListener('animationend', onAnimEnd);
    }
    window.setTimeout(finish, 320);
  }

  /**
   * 下拉收起（移动端，与集合页筛选面板同一套手感）。
   *
   * 只在底部抽屉形态下启用（≤989.98px）：桌面是从右侧滑出的窄栏，往下拽没有语义。
   * 热区 = 抓手横线 + 头部行（样式里给了 touch-action:none）；
   * 列表区不参与——那里的手势属于滚动，抢过来顾客就没法翻长购物车了。
   * 越过阈值（抽屉高的 30%，至少 120px）→ 关闭；未过 → 弹回原位。
   */
  _onDragStart = (event) => {
    if (event.button > 0) return;
    if (!window.matchMedia('(max-width: 989.98px)').matches) return;
    /* 收起动画进行中：面板已不可交互，不再接受新的拖拽 */
    if (this._closing) return;

    const handle = event.target.closest('.cart-drawer__grabber, .cart-drawer__header');
    /* 关闭按钮在头部行里，不能当成拖拽起点 */
    if (!handle || event.target.closest('[data-cart-drawer-close]')) return;

    const dialog = this.dialog;
    const startY = event.clientY;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let moved = false;

    const onMove = (moveEvent) => {
      const dy = moveEvent.clientY - startY;
      if (dy <= 0) return; /* 只响应下拉，上推不做事 */
      moved = moved || dy > 8;
      /* 必须先压掉滑入动画：@keyframes 的 transform 优先级高于内联 style，
         不压的话抽屉打开后的 0.28s 内怎么拖都不会动（2026-11-03 修） */
      dialog.style.animation = 'none';
      dialog.style.transition = 'none';
      dialog.style.transform = `translateY(${dy}px)`;
    };

    const onEnd = (endEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);

      const dy = endEvent.clientY - startY;
      const dismissAt = Math.max(120, dialog.offsetHeight * 0.3);

      if (moved && dy > dismissAt) {
        this._dragEndedAt = performance.now() + 350;
        /* 从当前拖拽位置顺势滑出（transition 收尾），不再原地闪没（2026-11-03）。
           内联样式清理由 _onClose 统一收口，这里不复位。 */
        this._closeAnimated(true);
        return;
      }

      /* 弹回：先给一段回弹过渡，再从内联样式收回（CSS 自己的滑入动画不受影响） */
      if (moved && !reduce) dialog.style.transition = 'transform 0.22s ease-out';
      dialog.style.transform = '';
      window.setTimeout(
        () => {
          dialog.style.transition = '';
        },
        moved && !reduce ? 240 : 0
      );
      if (moved) this._dragEndedAt = performance.now() + 350;
    };

    window.addEventListener('pointermove', onMove, { signal: this._ac.signal });
    window.addEventListener('pointerup', onEnd, { signal: this._ac.signal });
    window.addEventListener('pointercancel', onEnd, { signal: this._ac.signal });
  };

  _onClose = () => {
    /* 拖拽留下的内联样式必须清零：不清的话下次打开会带着上一手的偏移量；
       animation 也要清——拖动期间被压成 none，不清就不会重播滑入。
       is-closing 同步摘除、收起标记复位：桌面等路径会绕过动画直接 close()。 */
    this.dialog.style.transform = '';
    this.dialog.style.transition = '';
    this.dialog.style.animation = '';
    this.dialog.classList.remove('is-closing');
    this._closing = false;
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
