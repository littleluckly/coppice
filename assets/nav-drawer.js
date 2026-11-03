/**
 * nav-drawer — 移动端导航抽屉（<dialog> + showModal）。
 *
 * O-5 决策：移动与桌面菜单两套 DOM、互斥渲染（AGENTS §6 Custom Elements）。
 *
 * 为什么用原生 <dialog> + showModal()：
 *   平台自带焦点锁定、背景 inert、Esc 关闭、::backdrop、top layer。
 *   手写焦点陷阱最常见的两类错误——漏 inert、漏关闭回焦——在这里不存在。
 *   配套：<dialog scroll-lock> 触发 critical.css 里既有的
 *   `html:has(dialog[scroll-lock][open]) { overflow: hidden }` 锁背景滚动。
 *
 * 2026-11-03 手风琴改版（刘工）：
 *   - 开合委托给 <bottom-sheet>：滑入 / 滑出 / Esc 收口 / 拖拽收起和购物车抽屉、
 *     集合页筛选面板共用一套（critical.css 的 keyframes + .is-entering 等状态类）。
 *   - 子菜单不再是「整块面板从右侧滑进来」的钻取，改为在一级行下方就地展开：
 *     [data-nav-toggle] 切 aria-expanded，子容器切 .nav-drawer__sub.is-open。
 *     同层只留一个展开项（手风琴语义），收起父级会连带收起它的后代。
 *   - 收起态给子容器打 inert：grid 0fr 只是视觉裁切，光靠 overflow:hidden
 *     挡不住 Tab 焦点飘进看不见的链接里（也无障碍树里不该有它们）。
 *   - 所有层级仍由 main-nav.liquid 服务端渲染（三层封顶），本组件只切状态，
 *     不在交互时构建节点。
 *
 * 无 JS 降级：<dialog> 未 showModal 时保持 display:none，汉堡按钮无响应——
 *   可接受（与 search-drawer 同一取舍）。抽屉打开本身依赖 JS，
 *   因此面板导航不再需要 details/summary 类的无 JS 方案。
 *
 * this 绑定：所有 listener 一律类字段箭头函数（BUG-030 / BUG-033 两次教训——
 * 原型方法 + addEventListener 会让 this 漂移到被监听元素，守卫静默短路）。
 */
class NavDrawer extends HTMLElement {
  _dialog = null;
  _opener = null;
  _sheetEl = null;
  _closeButton = null;
  /** 拖拽刚结束的时间戳：浏览器会补发一个 click，别让它顺手把抽屉关掉 */
  _dragEndedAt = 0;

  // 一次性拆除所有监听，避免主题编辑器 / section 重新渲染后事件叠加
  _abort = new AbortController();

  /** 开合组件（bottom-sheet.js）；未加载时退回原生开合 */
  get _sheet() {
    const el = this._sheetEl;
    return el && typeof el.open === 'function' ? el : null;
  }

  _onOpen = () => {
    if (!this._dialog) return;
    /* 收起动画途中再点汉堡：让它重新展开（<bottom-sheet> 会作废未完成的关闭），
       否则顾客得点两次才开——单看 dialog.open 会把这一瞬间判成"已经开着" */
    const sheet = this._sheet;
    if (this._dialog.open && !sheet?.isClosing) return;

    // 关闭期间可能展开了某一层：重开时全部收起（与旧版"回到根面板"同义）
    this._collapseAll();

    if (sheet) sheet.open();
    else if (!this._dialog.open) this._dialog.showModal();

    // 禁用 autofocus（AGENTS §8），显式移焦到关闭按钮——比依赖
    // showModal() 的"首个可聚焦元素"行为更稳定。
    this._closeButton?.focus();
  };

  /** 关闭入口（关闭钮 / 遮罩）：交给组件走滑出 */
  _onClose = () => {
    if (!this._dialog?.open) return;
    const sheet = this._sheet;
    if (sheet) sheet.close();
    else this._dialog.close();
  };

  /** 真正关掉之后（原生 close 事件）：把焦点还给汉堡 */
  _onDialogClose = () => {
    if (this._opener?.isConnected) this._opener.focus({ preventScroll: true });
  };

  /** 点击遮罩：目标为 dialog 自身即说明点在内容之外 */
  _onDialogClick = (event) => {
    /* 拖拽刚松手时浏览器还会补一个 click，落点可能正好在遮罩上——
       不挡掉的话，"往下拽到一半又弹回"会顺手把抽屉关掉。 */
    if (this._dragEndedAt && performance.now() < this._dragEndedAt) return;
    if (event.target === this._dialog) this._onClose();
  };

  /**
   * 手风琴：同层只留一个展开项。
   * 先收掉兄弟节点再展开自己——顺序反了会在过渡期间出现两个同时张开的块。
   */
  _onToggle = (button) => {
    const open = button.getAttribute('aria-expanded') === 'true';

    if (!open) {
      const item = button.closest('.nav-drawer__item');
      const list = item?.parentElement;
      if (list) {
        for (const sibling of list.children) {
          if (sibling === item) continue;
          const other = sibling.querySelector(':scope > [data-nav-toggle][aria-expanded="true"]');
          if (other) this._setExpanded(other, false);
        }
      }
    }

    this._setExpanded(button, !open);
  };

  /**
   * 单个分组的展开态。收起时递归收后代，否则下次展开父级会带着旧的展开态一起出现。
   * inert 与 aria-expanded 必须同步：视觉（grid 0fr）和无障碍树不能各说一套。
   */
  _setExpanded = (button, open) => {
    button.setAttribute('aria-expanded', open ? 'true' : 'false');

    const sub = document.getElementById(button.getAttribute('aria-controls') || '');
    if (!sub) return;

    if (!open) {
      sub.querySelectorAll('[data-nav-toggle][aria-expanded="true"]').forEach((nested) => {
        this._setExpanded(nested, false);
      });
      /* 焦点若在即将 inert 的子树里，必须先挪出来——inert 会把焦点直接丢到 body */
      if (sub.contains(document.activeElement)) button.focus({ preventScroll: true });
    }

    sub.classList.toggle('is-open', open);
    sub.inert = !open;
  };

  _collapseAll = () => {
    this._dialog?.querySelectorAll('[data-nav-toggle][aria-expanded="true"]').forEach((button) => {
      this._setExpanded(button, false);
    });
  };

  /**
   * 抽屉内搜索行 → 打开搜索抽屉（叠加 modal，不关本抽屉——
   * 关掉搜索后回到菜单层级，与参考图"搜索就在菜单里"的动线一致）。
   * search-drawer 的 opener 绑定发生在页面加载时，够不到此时才
   * 实例化的本抽屉内容，所以这里直接调它的公开 open()。
   */
  _onSearch = (button) => {
    this.closest('nav')?.querySelector('search-drawer')?.open(button);
  };

  /**
   * 下拉收起（2026-11-03，与购物车抽屉同一套手感）。
   *
   * 热区 = 抓手横线 + 面板头部行（样式里给了 touch-action:none）；
   * 菜单列表不参与——那里的手势属于滚动，抢过来顾客就没法翻长菜单了。
   * 越过阈值（面板高的 30%，至少 120px）→ 关闭；未过 → 弹回原位。
   */
  _onDragStart = (event) => {
    if (event.button > 0) return;
    /* 收起动画进行中：面板已不可交互，不再接受新的拖拽 */
    if (this._sheet?.isClosing) return;

    const handle = event.target.closest('.nav-drawer__grabber, .nav-drawer__head--root');
    /* 关闭 / 搜索按钮在头部行里，不能当成拖拽起点 */
    if (!handle || event.target.closest('[data-nav-drawer-close], [data-nav-search]')) return;

    const dialog = this._dialog;
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
        const sheet = this._sheet;
        if (sheet) sheet.close({ fromDrag: true });
        else this._dialog.close();
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

    window.addEventListener('pointermove', onMove, { signal: this._abort.signal });
    window.addEventListener('pointerup', onEnd, { signal: this._abort.signal });
    window.addEventListener('pointercancel', onEnd, { signal: this._abort.signal });
  };

  connectedCallback() {
    this._build();
    if (!this._dialog) return;

    const { signal } = this._abort;

    this._dialog.addEventListener('close', this._onDialogClose, { signal });
    // showModal 下 ::backdrop 不接收事件，靠"目标是否为 dialog 自身"判定点了遮罩
    this._dialog.addEventListener('click', this._onDialogClick, { signal });
    this._dialog.addEventListener('pointerdown', this._onDragStart, { signal });

    const opener = this.closest('nav')?.querySelector('[data-nav-drawer-open]');
    if (opener) {
      this._opener = opener;
      opener.addEventListener('click', this._onOpen, { signal });
    }
  }

  disconnectedCallback() {
    this._abort.abort();
  }

  /**
   * <template> 惰性实例化：抽屉内容首次打开才进 DOM（AGENTS §6）。
   * 收益是首屏 HTML 不含整棵菜单树。克隆落文档后一次绑好所有交互，
   * 不做委托遍历（AGENTS §6）。
   */
  _build() {
    this._dialog = this.querySelector('dialog[data-nav-drawer]');
    if (!this._dialog) return;

    /* 开合组件是 dialog 的父元素（display:contents，不占位） */
    this._sheetEl = this.querySelector('bottom-sheet');

    const template = this._dialog.querySelector('template[data-nav-drawer-template]');
    if (!template) return;

    // open 状态下重渲染会再次 connected，此时不重复克隆
    if (this._dialog.dataset.built === 'true') return;

    this._dialog.append(template.content.cloneNode(true));
    this._dialog.dataset.built = 'true';

    // 锁背景滚动：属性驱动，样式在 critical.css
    this._dialog.setAttribute('scroll-lock', '');

    const { signal } = this._abort;

    // 关闭按钮只有头部那一枚，但仍按属性全量绑定（将来加第二个不用改代码）
    const closeButtons = this._dialog.querySelectorAll('[data-nav-drawer-close]');
    this._closeButton = closeButtons[0] ?? null;
    closeButtons.forEach((button) => {
      button.addEventListener('click', this._onClose, { signal });
    });

    this._dialog.querySelectorAll('[data-nav-toggle]').forEach((button) => {
      button.addEventListener('click', () => this._onToggle(button), { signal });
    });

    this._dialog.querySelectorAll('[data-nav-search]').forEach((button) => {
      button.addEventListener('click', () => this._onSearch(button), { signal });
    });
  }
}

if (!customElements.get('nav-drawer')) {
  customElements.define('nav-drawer', NavDrawer);
}
