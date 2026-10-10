/**
 * search-drawer — 搜索抽屉（<dialog> + showModal）。
 *
 * 2026-10-10 刘工：导航行上只放一个搜索图标；点击后从屏幕右侧滑出本抽屉，
 * 完整的预测搜索表单（snippets/predictive-search-entry.liquid）在抽屉里。
 *
 * 结构与 nav-drawer 同款（AGENTS §6 Custom Elements + 原生 <dialog>）：
 *   平台自带焦点锁定、背景 inert、Esc 关闭、::backdrop、top layer。
 *   配套：<dialog scroll-lock> 触发 critical.css 里既有的
 *   `html:has(dialog[scroll-lock][open]) { overflow: hidden }` 锁背景滚动。
 *
 * 与 nav-drawer 的两处差异：
 *   1. openers 是复数——桌面 tools 区 + 移动端行右各一枚按钮，共用同一抽屉；
 *      关闭时焦点回到「最近使用的那枚」。
 *   2. 打开后焦点进输入框（显式移焦，不用 autofocus——AGENTS §8）。
 *
 * Esc 分层：抽屉内联想面板未开时 Esc 由 <dialog> 原生处理（关抽屉）；
 * 面板开着时 predictive-search.js 先拦截 Esc 收面板——两层退出互不打架。
 *
 * 无 JS 降级：<dialog> 未 showModal 时保持 display:none，图标按钮无响应——
 * 与 nav-drawer 同一取舍（可接受；搜索仍可从搜索结果页直达）。
 */
class SearchDrawer extends HTMLElement {
  constructor() {
    super();

    this._dialog = null;
    this._lastOpener = null;
    this._closeButton = null;

    // 一次性拆除所有监听，避免主题编辑器 / section 重新渲染后事件叠加
    this._abort = new AbortController();
  }

  connectedCallback() {
    this._build();
    if (!this._dialog) return;

    const { signal } = this._abort;

    this._dialog.addEventListener('close', this._onClose, { signal });
    // showModal 下 ::backdrop 不接收事件，靠"目标是否为 dialog 自身"判定点了遮罩
    this._dialog.addEventListener('click', this._onDialogClick, { signal });

    const openers = this.closest('nav')?.querySelectorAll('[data-search-drawer-open]');
    openers?.forEach((opener) => {
      opener.addEventListener('click', () => this._onOpen(opener), { signal });
    });

    this._closeButton = this._dialog.querySelector('[data-search-drawer-close]');
    this._closeButton?.addEventListener('click', this._onClose, { signal });
  }

  disconnectedCallback() {
    this._abort.abort();
  }

  /**
   * <template> 惰性实例化：首次打开才进 DOM（AGENTS §6）。
   * 收益是首屏 HTML 不含搜索表单与结果容器；克隆落文档后
   * predictive-search 自定义元素自动升级、自行接管联想行为。
   */
  _build() {
    this._dialog = this.querySelector('dialog[data-search-drawer]');
    if (!this._dialog) return;

    const template = this._dialog.querySelector('template[data-search-drawer-template]');
    if (!template) return;

    // open 状态下重渲染会再次 connected，此时不重复克隆
    if (this._dialog.dataset.built === 'true') return;

    this._dialog.append(template.content.cloneNode(true));
    this._dialog.dataset.built = 'true';

    // 锁背景滚动：属性驱动，样式在 critical.css
    this._dialog.setAttribute('scroll-lock', '');
  }

  _onOpen(opener) {
    if (!this._dialog || this._dialog.open) return;

    this._lastOpener = opener;
    this._dialog.showModal();

    // 禁用 autofocus（AGENTS §8），显式移焦到输入框——搜索的第一动作是打字
    this._dialog.querySelector('.predictive-search__input')?.focus();
  }

  /** 点击遮罩：目标为 dialog 自身即说明点在内容之外 */
  _onDialogClick(event) {
    if (event.target === this._dialog) this._close();
  }

  _onClose() {
    if (!this._dialog?.open) return;

    this._dialog.close();

    // Esc 关闭时浏览器不自动回焦，显式补上（平台管锁定，不管回焦）
    this._lastOpener?.focus();
  }
}

customElements.define('search-drawer', SearchDrawer);
