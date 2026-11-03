/**
 * bottom-sheet — 底部抽屉的开合行为（2026-11-03 刘工）。
 *
 * 只做一件事：滑入 / 滑出。**不封装任何内容**——作者自带 <dialog> 与内部结构，
 * 本元素不创建、不搬移、不替换任何内容节点，也不规定外观（圆角、宽度、flex 布局
 * 全归宿主 CSS）。它只把"开合 + 动效 + Esc 收口"这三件重复事收在一处。
 *
 *   <bottom-sheet media="(max-width: 989.98px)">
 *     <dialog class="…" scroll-lock>…作者自己的内容…</dialog>
 *   </bottom-sheet>
 *
 * 契约：
 * - 直接子 <dialog> 是面板；找不到就静默不工作（不报错、不兜底建 DOM）。
 * - open() / close({ fromDrag }) / toggle() / isOpen / isClosing —— 唯一开合入口。
 * - Esc（原生 cancel）由本元素接住，走同一套滑出；原生 close 事件照常在
 *   真正关闭时点火，宿主的收尾逻辑（表单归位、焦点归还）不用改。
 * - 遮罩点击**不归本元素管**：点击是否等于"收起"各面板有各自的防误触策略
 *   （例如拖拽刚松手时浏览器补发的那个 click 必须挡掉），属于宿主的判断，
 *   宿主自己监听后调 close() 即可。
 * - media 属性可选：不匹配时降级为"无动效直开直关"（购物车桌面是右滑形态，
 *   靠它跳过下滑）。
 * - 拖拽收起同样是宿主的私事（热区与阈值各面板不同）：越过阈值调
 *   close({ fromDrag: true })，本元素从当前位移顺势滑出，不跳回原位重播。
 * - prefers-reduced-motion：一律直开直关。
 *
 * 样式（keyframes 与 .is-entering / .is-closing / .is-close-anim）在 critical.css，
 * 全站一份；本文件不注入任何 CSS。
 */
class BottomSheet extends HTMLElement {
  connectedCallback() {
    this._dialog = this.querySelector(':scope > dialog');
    if (!this._dialog) return;
    /* 重连幂等（宿主搬移 DOM 会触发断开/重连）：先拆旧监听再重挂 */
    this._ac?.abort();
    this._ac = new AbortController();
    const { signal } = this._ac;
    this._dialog.addEventListener('cancel', this._onCancel, { signal });
    this._dialog.addEventListener('close', this._onClose, { signal });
  }

  disconnectedCallback() {
    this._ac?.abort();
    /* 组件被搬走 / 替换（_placeSort、Section Rendering）时关掉面板，
       不留一个悬浮在 top layer、已经脱离文档的 dialog */
    if (this._dialog?.open) this._dialog.close();
  }

  get isOpen() {
    return !!this._dialog?.open;
  }

  get isClosing() {
    return !!this._dialog?.classList.contains('is-closing');
  }

  open() {
    const dialog = this._dialog;
    if (!dialog) return;
    /* 收起途中又被打开（加购自动弹抽屉、快速重开排序）：作废未完成的关闭
       ——finish 里的代次校验会让它空转，不会把刚打开的面板按回去 */
    this._closeGen = (this._closeGen || 0) + 1;
    this._resetStyles();
    if (!dialog.open) dialog.showModal();
    this._playEnter();
  }

  close({ fromDrag = false } = {}) {
    const dialog = this._dialog;
    /* isClosing 守卫：多路径同时触发（宿主遮罩 + 按钮）时只走一次 */
    if (!dialog?.open || this.isClosing) return;
    /* 拖拽期间宿主把 animation 压成 none（内联优先级高于 keyframes），
       不清掉的话下面 .is-close-anim 不生效，会退化成"延迟一下才消失" */
    dialog.style.animation = '';
    if (!this._animates) {
      dialog.close();
      return;
    }
    dialog.classList.remove('is-entering');
    dialog.classList.add('is-closing');
    const gen = (this._closeGen = (this._closeGen || 0) + 1);
    let done = false;
    const finish = () => {
      if (done || gen !== this._closeGen) return;
      done = true;
      dialog.close(); /* 原生 close 事件 → 宿主收尾 */
      this._reset();
    };
    if (fromDrag) {
      /* 面板已被拖到中途：用 transition 顺势滑到屏外，不挂 .is-close-anim——
         @keyframes 的 transform 优先级高于内联 style，两者同挂会打架 */
      dialog.style.transition = 'transform 0.22s ease-in';
      dialog.style.transform = 'translateY(100%)';
      const onTransEnd = (event) => {
        if (event.target !== dialog || event.propertyName !== 'transform') return;
        dialog.removeEventListener('transitionend', onTransEnd);
        finish();
      };
      dialog.addEventListener('transitionend', onTransEnd);
    } else {
      dialog.classList.add('is-close-anim');
      const onAnimEnd = (event) => {
        /* ::backdrop 的动画也以 dialog 为 target，按 keyframes 名字区分 */
        if (event.animationName !== 'sheet-slide-down') return;
        dialog.removeEventListener('animationend', onAnimEnd);
        finish();
      };
      dialog.addEventListener('animationend', onAnimEnd);
    }
    /* 兜底：animationend / transitionend 偶发不触发（无头浏览器虚拟时间、
       标签页切走），不能把"关不上"押在事件上 */
    window.setTimeout(finish, 320);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  /* ---- 内部 ---- */

  _onCancel = (event) => {
    /* Esc：拦下原生立即关闭，走滑出（与关闭钮同一条路径） */
    event.preventDefault();
    this.close();
  };

  _onClose = () => {
    /* 外部直接 dialog.close()（跨断点强制收起等）也要把类名与内联样式复位 */
    this._reset();
  };

  /** 动效可用性：media 不匹配（如购物车桌面右滑形态）或 prefers-reduced-motion → 直开直关 */
  get _animates() {
    const media = this.getAttribute('media');
    if (media && !window.matchMedia(media).matches) return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** 滑入：挂 .is-entering 播 keyframes（[open] 上的 animation 无法重播） */
  _playEnter() {
    const dialog = this._dialog;
    if (!this._animates) return;
    dialog.classList.remove('is-entering', 'is-closing', 'is-close-anim');
    /* 强制回流：连续开关时同名 animation 需要重新起播 */
    void dialog.offsetWidth;
    dialog.classList.add('is-entering');
    const stop = () => {
      dialog.removeEventListener('animationend', onEnd);
      dialog.classList.remove('is-entering');
    };
    const onEnd = (event) => {
      if (event.animationName !== 'sheet-slide-up') return;
      stop();
    };
    dialog.addEventListener('animationend', onEnd);
    window.setTimeout(stop, 420);
  }

  _reset() {
    const dialog = this._dialog;
    if (!dialog) return;
    dialog.classList.remove('is-entering', 'is-closing', 'is-close-anim');
    this._resetStyles();
  }

  _resetStyles() {
    const dialog = this._dialog;
    if (!dialog) return;
    dialog.style.animation = '';
    dialog.style.transition = '';
    dialog.style.transform = '';
  }
}

if (!customElements.get('bottom-sheet')) {
  customElements.define('bottom-sheet', BottomSheet);
}
