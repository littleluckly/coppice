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
 *
 * **等待期必须有骨架（2026-11-20，BUG-083）**：加购那一下服务端还没收到
 * /cart/add.js，`?sections=` 只能取回加购前的购物车，空车时就渲染成「Your cart is
 * empty」。所以加购后**先挂骨架、不发请求**，等 cart:updated 再刷（见 _onAdded）。
 */
class CartDrawer extends HTMLElement {
  /** 骨架兜底时长：加购方迟迟不派 cart:updated（请求挂死 / 未来新增路径）时自愈一次 */
  static PENDING_TIMEOUT_MS = 12000;

  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    if (!this.dialog) return;

    this._panel = this.querySelector('.cart-drawer__panel');
    this._ac = new AbortController();
    const { signal } = this._ac;

    /* 页头入口（桌面 + 移动抽屉各一份），由本元素主动接管，不做全局 click 委托 */
    document.querySelectorAll('[data-cart-drawer-open]').forEach((trigger) => {
      trigger.addEventListener('click', this._onOpen, { signal });
    });

    const closeButton = this.querySelector('[data-cart-drawer-close]');
    if (closeButton) closeButton.addEventListener('click', () => this._closeSheet(), { signal });

    /* 开合行为组件（bottom-sheet.js）：滑入/滑出/Esc 收口都归它，见 critical.css */
    this._sheetEl = this.dialog.closest('bottom-sheet');

    this.dialog.addEventListener('click', this._onBackdropClick, { signal });
    this.dialog.addEventListener('pointerdown', this._onDragStart, { signal });
    this.dialog.addEventListener('close', this._onClose, { signal });

    document.addEventListener('cart:added', this._onAdded, { signal });
    document.addEventListener('cart:add-failed', this._onAddFailed, { signal });
    document.addEventListener('cart:updated', this._onCountChange, { signal });
  }

  disconnectedCallback() {
    this._ac.abort();
    window.clearTimeout(this._pendingTimer);
  }

  _onOpen = (event) => {
    event.preventDefault();
    this._lastTrigger = event.currentTarget;
    this._show();
  };

  /**
   * 加购（点击即发）→ 只开抽屉 + 挂骨架，**不在这里发请求**。
   *
   * 为什么不在 `_onAdded` 里 `_refresh()`：cart:added 是 fetch **之前**派发的
   * （quick-add / product-form / supplies 三处同口径，为的是飞入动画不迟滞）。
   * 此刻发 `?sections=` 与 /cart/add.js 并发，服务端读到的还是旧购物车——
   * 空车时返回的就是空态 HTML，抽屉里先闪一句「Your cart is empty」，
   * 等 cart:updated 引发的第二次请求才换成商品行（BUG-083 的现场）。
   *
   * 正确的等待信号是 cart:updated：它在 /cart/add.js 成功、/cart.js 查回
   * item_count 之后才派发，那一刻服务端已经是加完的购物车。
   *
   * **快速查看弹窗里点加购：抽屉直接盖上去，弹窗不收**（2026-11-26 刘工第二版）。
   * 试过"等弹窗播完滑出再开抽屉"：顺序是干净了，但顾客要连看两段动画
   * （0.22s 关 + 0.28s 开）、中间还有一瞬两面都没有，而且抽屉关掉后落回的是
   * 商品列表，不是刚才那个商品。现在的做法是弹窗留在原地当背景，抽屉从底部
   * 推上来把它整块盖住 —— 前提是**抽屉必须比弹窗高**，否则第一帧就会露出
   * 上半截弹窗，变成两截拼接（那正是 BUG-100 的现场）。移动端两者都锁
   * 88dvh（见 sections/cart-drawer.liquid 与 assets/product-card.css），
   * 所以这条时序才成立；改高度时两边必须一起改。
   */
  _onAdded = () => {
    this._showPending();
  };

  /** 加购失败（三条加购路径的 catch 都会派发）：骨架不能一直转，刷一次真实购物车 */
  _onAddFailed = () => {
    if (!this._isPending()) return;
    this._refresh();
  };

  _show() {
    if (!this.dialog.open) this._openSheet();
    /* 正在等加购结果时别抢先发请求：那一次必然读到加购前的购物车（BUG-083 的原样）。
       骨架会继续挂着，等 cart:updated 的刷新来收尾。 */
    if (this._isPending()) return;
    this._refresh();
  }

  _showPending() {
    this._beginPending();
    if (!this.dialog.open) this._openSheet();
  }

  _isPending() {
    return this.dataset.cartLoading !== undefined;
  }

  _beginPending() {
    /* 连点两件：重置计时器，别让第一件的超时把第二件的等待提前掐断 */
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = window.setTimeout(() => {
      /* 兜底自愈：万一没有 cart:updated（请求挂死、加购路径未接事件），
         拿一次服务端真值，对不上至少还能退回购物车页，不能让人一直盯骨架 */
      this._refresh();
    }, CartDrawer.PENDING_TIMEOUT_MS);

    this.dataset.cartLoading = '';
    /* aria-busy 挂面板而不是内容区：内容区会被整块替换，属性会跟着丢 */
    if (this._panel) this._panel.setAttribute('aria-busy', 'true');
  }

  _endPending() {
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = null;
    delete this.dataset.cartLoading;
    if (this._panel) this._panel.removeAttribute('aria-busy');
  }

  /**
   * 开合委托给 <bottom-sheet>（2026-11-03 刘工）：滑入/滑出、重开打断、
   * reduced-motion 与桌面右滑形态的跳过都在组件里。组件未加载时退回原生开合。
   */
  get _sheet() {
    const el = this._sheetEl;
    return el && typeof el.open === 'function' ? el : null;
  }

  _openSheet() {
    if (this._sheet) this._sheet.open();
    else if (!this.dialog.open) this.dialog.showModal();
    /* 锁背景滚动（critical.css 的 html:has(dialog[scroll-lock][open])） */
    document.documentElement.dataset.cartDrawerOpen = '';
  }

  _closeSheet(options) {
    if (this._sheet) this._sheet.close(options);
    else if (this.dialog.open) this.dialog.close();
  }

  /**
   * 标题计数同步（cart:updated 带真实 item_count）。
   *
   * 两条来路，处理方式不同：
   *   ① cart-items 自己改完数量派发的（detail.source === 'items'）：内容区已经整块
   *      换过，这里只管标题数字，别再发一次请求；
   *   ② 加购完成（quick-add / product-form / supplies 在 /cart.js 查回 count 后派发）
   *      或别的标签页改了车：detail 里只有 count。**正在等骨架的必须刷**——这是
   *      加购的收尾动作，唯一的正确刷新时机（见 _onAdded）；抽屉开着但没在等的也刷
   *      一次，列表才不会停在旧数据。
   */
  _onCountChange = (event) => {
    const detail = event.detail || {};
    const count = detail.count;
    const el = this.querySelector('[data-cart-drawer-count]');
    if (el && typeof count === 'number') el.textContent = `(${count})`;

    if (detail.source === 'items') return;
    if (this._isPending() || this.dialog.open) this._refresh();
  };

  _onBackdropClick = (event) => {
    /* 拖拽刚松手时浏览器还会补一个 click，落点可能正好在遮罩上——
       不挡掉的话，"往下拽到一半又弹回"会顺手把抽屉关掉。 */
    if (this._dragEndedAt && performance.now() < this._dragEndedAt) return;
    /* dialog 自身是点击目标 = 点在遮罩上（面板盖满了 dialog 内部） */
    if (event.target === this.dialog) this._closeSheet();
  };

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
    if (this._sheet?.isClosing) return;

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
        /* 从当前拖拽位置顺势滑出（组件按 fromDrag 走 transition），不再原地闪没 */
        this._closeSheet({ fromDrag: true });
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
    /* 内联样式与 is-closing 由 <bottom-sheet> 组件统一清零，这里只管本组件状态 */
    delete document.documentElement.dataset.cartDrawerOpen;
    /* 关掉就结束等待：不然顾客关掉再打开会看到一屏骨架（而请求可能早就没在飞了） */
    this._endPending();
    if (this._lastTrigger && this._lastTrigger.isConnected) {
      this._lastTrigger.focus({ preventScroll: true });
    }
  };

  /**
   * 取回本 section 的最新渲染，只换 `[data-cart-section]`（连小计一起）。
   *
   * **裸 fetch，禁止带 `Accept: application/json`**：商品页上带这个头，Shopify 会
   * 走 AJAX Product API 返回 `{"product":{…}}`，`payload[id]` 恒为 undefined
   * （SDD §6.2 实测踩坑，与 compare-lookup 同一条）。`?sections=` 自己就会回
   * `{ "<section id>": "<html>" }`，不需要任何头。
   * no-store：抽屉内容必须反映刚刚发生的加购，走缓存等于白刷。
   *
   * 等待骨架在这里收尾（finally）。注意 replaceWith 与 _endPending 在**同一个任务**里
   * 同步完成，浏览器在任务结束才绘制——不会出现「新内容被旧 loading 状态藏起来」那一帧。
   */
  async _refresh() {
    const id = this.dataset.sectionId;
    if (!id) return;

    /* 连点两件会连发两次刷新，先到的响应可能更旧：只认最后一次发起的 */
    const seq = (this._refreshSeq = (this._refreshSeq || 0) + 1);

    try {
      const response = await fetch(`${window.location.pathname}?sections=${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });

      if (seq !== this._refreshSeq) return;

      const payload = response.ok ? await response.json() : null;
      const html = payload && payload[id];

      /* 再查一次：await json() 期间可能又发起了新的刷新，让位给更新的那一次 */
      if (seq !== this._refreshSeq) return;

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
    } catch {
      /* 刷新失败不打扰顾客：抽屉里已有的内容仍然可用，只是可能不是最新。
         （AbortError 是元素断开时的正常中止，同样静默。）骨架一律在 finally 收掉，
         否则顾客会永远停在一屏灰块上——宁可露出旧内容。 */
    } finally {
      /* 被更新的请求取代时不清骨架——那一次还在飞 */
      if (seq === this._refreshSeq) this._endPending();
    }
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}
