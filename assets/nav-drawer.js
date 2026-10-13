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
 * 2026-10-13 钻入式面板（刘工，参考效果图）：
 *   - 抽屉本体是底部面板：showModal 后 translate 0 100% → 0，从屏幕底边往上滑入。
 *   - 分组行（[data-nav-open="#panel-id"]）把对应子面板从右侧滑入（iOS 栈式），
 *     被覆盖的面板滑出到左侧（is-left）；[data-nav-back] 逆向弹出。
 *   - 面板全部由 main-nav.liquid 服务端渲染（三层封顶），本组件只维护一个
 *     显式栈 {panel, trigger}，不在导航时构建 DOM。
 *   - 打开抽屉时重置到根面板（复用上次停留的子面板会让人迷失层级）。
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
  _closeButton = null;
  _root = null;
  /** 栈元素：{ panel, trigger }；栈底为根面板（trigger 为 null） */
  _stack = [];

  // 一次性拆除所有监听，避免主题编辑器 / section 重新渲染后事件叠加
  _abort = new AbortController();

  _onOpen = () => {
    if (!this._dialog || this._dialog.open) return;

    // 关闭期间可能钻到了子面板：重开时回到根面板
    this._resetPanels();

    this._dialog.showModal();

    // 禁用 autofocus（AGENTS §8），显式移焦到关闭按钮——比依赖
    // showModal() 的"首个可聚焦元素"行为更稳定。
    this._closeButton?.focus();
  };

  _onClose = () => {
    if (!this._dialog?.open) return;

    this._dialog.close();

    // Esc 关闭时浏览器不自动回焦，显式补上（平台管锁定，不管回焦）
    this._opener?.focus();
  };

  /** 点击遮罩：目标为 dialog 自身即说明点在内容之外 */
  _onDialogClick = (event) => {
    if (event.target === this._dialog) this._onClose();
  };

  /** 钻入：当前面板滑出左侧，目标面板自右滑入；焦点移到子面板返回键 */
  _push = (trigger) => {
    const target = this._dialog.querySelector(
      `#${CSS.escape(trigger.getAttribute('data-nav-open'))}`,
    );
    const current = this._stack[this._stack.length - 1];
    if (!target || !current || target === current.panel) return;

    current.panel.classList.remove('is-active');
    current.panel.classList.add('is-left');
    target.classList.add('is-active');
    this._stack.push({ panel: target, trigger });

    target.querySelector('[data-nav-back]')?.focus();
  };

  /** 弹回：子面板退场，上一层滑回；焦点回到触发钻入的那枚按钮 */
  _pop = () => {
    if (this._stack.length < 2) return;

    const entry = this._stack.pop();
    const prev = this._stack[this._stack.length - 1];

    entry.panel.classList.remove('is-active');
    prev.panel.classList.remove('is-left');
    prev.panel.classList.add('is-active');
    entry.trigger?.focus();
  };

  _resetPanels = () => {
    for (const { panel } of this._stack) {
      panel.classList.remove('is-active', 'is-left');
    }
    this._stack = this._root ? [{ panel: this._root, trigger: null }] : [];
    this._root?.classList.add('is-active');
  };

  connectedCallback() {
    this._build();
    if (!this._dialog) return;

    const { signal } = this._abort;

    this._dialog.addEventListener('close', this._onClose, { signal });
    // showModal 下 ::backdrop 不接收事件，靠"目标是否为 dialog 自身"判定点了遮罩
    this._dialog.addEventListener('click', this._onDialogClick, { signal });

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
   * 收益是首屏 HTML 不含整棵菜单树。克隆落文档后接线面板栈——
   * 内容只构建一次，监听直接绑到按钮上，不做委托遍历（AGENTS §6）。
   */
  _build() {
    this._dialog = this.querySelector('dialog[data-nav-drawer]');
    if (!this._dialog) return;

    const template = this._dialog.querySelector('template[data-nav-drawer-template]');
    if (!template) return;

    // open 状态下重渲染会再次 connected，此时不重复克隆
    if (this._dialog.dataset.built === 'true') return;

    this._dialog.append(template.content.cloneNode(true));
    this._dialog.dataset.built = 'true';

    // 锁背景滚动：属性驱动，样式在 critical.css
    this._dialog.setAttribute('scroll-lock', '');

    // 关闭按钮每层面板各有一枚，全量绑定；焦点初始落点取根面板那枚
    const closeButtons = this._dialog.querySelectorAll('[data-nav-drawer-close]');
    this._closeButton = closeButtons[0] ?? null;
    closeButtons.forEach((button) => {
      button.addEventListener('click', this._onClose, { signal });
    });

    // 面板栈初始化：根面板 = 第一个 data-nav-panel（main-nav.liquid 保证顺序）
    this._root = this._dialog.querySelector('[data-nav-panel]');
    this._resetPanels();

    const { signal } = this._abort;
    this._dialog.querySelectorAll('[data-nav-open]').forEach((button) => {
      button.addEventListener('click', () => this._push(button), { signal });
    });
    this._dialog.querySelectorAll('[data-nav-back]').forEach((button) => {
      button.addEventListener('click', this._pop, { signal });
    });
  }
}

customElements.define('nav-drawer', NavDrawer);
