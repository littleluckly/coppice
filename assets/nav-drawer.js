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
 * 无 JS 降级：桌面下拉是纯 CSS :hover / :focus-within，完全不依赖本脚本；
 *   移动端 <dialog> 未 showModal 时保持 display:none，汉堡按钮无响应——可接受。
 */
class NavDrawer extends HTMLElement {
  constructor() {
    super();

    this._dialog = null;
    this._opener = null;
    this._closeButton = null;

    // 一次性拆除所有监听，避免主题编辑器 / section 重新渲染后事件叠加
    this._abort = new AbortController();
    this._onClose = this._onClose.bind(this);
  }

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

    this._closeButton = this._dialog.querySelector('[data-nav-drawer-close]');
    this._closeButton?.addEventListener('click', this._onClose, { signal });
  }

  disconnectedCallback() {
    this._abort.abort();
  }

  /**
   * <template> 惰性实例化：抽屉内容首次打开才进 DOM（AGENTS §6）。
   * 收益是首屏 HTML 不含整棵菜单树。
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
  }

  _onOpen() {
    if (!this._dialog || this._dialog.open) return;

    this._dialog.showModal();

    // 禁用 autofocus（AGENTS §8），显式移焦到关闭按钮——比依赖
    // showModal() 的"首个可聚焦元素"行为更稳定。
    this._closeButton?.focus();
  }

  /** 点击遮罩：目标为 dialog 自身即说明点在内容之外 */
  _onDialogClick(event) {
    if (event.target === this._dialog) this._close();
  }

  _onClose() {
    if (!this._dialog?.open) return;

    this._dialog.close();

    // Esc 关闭时浏览器不自动回焦，显式补上（平台管锁定，不管回焦）
    this._opener?.focus();
  }
}

customElements.define('nav-drawer', NavDrawer);
