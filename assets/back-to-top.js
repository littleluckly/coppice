/**
 * back-to-top — 全站「回到顶部」按钮的行为（2026-10-30）。
 *
 * 三条纪律，与 reveal-on-scroll 同源：
 *   1. **纯增强**：不建 DOM、不改布局。脚本不跑时按钮保持 critical.css 里的默认态
 *      （visibility: hidden），不进 tab 序列，页面内容与阅读顺序完全不受影响。
 *   2. **状态靠 attribute**：显隐只切 `<back-to-top data-visible>`，淡入与位移在 CSS 里，
 *      这里不写任何样式。
 *   3. **尊重系统设置**：prefers-reduced-motion 下不做平滑滚动，直接跳。
 *
 * 阈值取 0.75 个视口高，不用固定像素：不足一屏就冒出来等于在首屏右下角放装饰物，
 * 而 480px 这类定值在 27 寸屏上只有三分之一屏高，出现得太早。
 *
 * **焦点要交还页头**：button 是唯一能被键盘触发的（回车即滚），但滚动不会移动焦点——
 * 焦点留在按钮上，键盘用户接着 Tab 会落到页面底部之后的地方，等于被困住。
 * 所以滚完把焦点交给页头品牌链接（没有则 #MainContent）。
 * `preventScroll: true` 不能省：不带它浏览器会先把目标元素滚进视口，
 * 平滑滚动当场被截断，变成瞬间跳顶（实测就是这个现象）。
 */
class BackToTop extends HTMLElement {
  connectedCallback() {
    /* Section Rendering / 编辑器重挂载都会再进一次：重复绑定会让一次点击滚两次 */
    if (this.controller) return;

    const button = this.querySelector('[data-back-to-top]');
    if (!button) return;

    this.controller = new AbortController();
    const { signal } = this.controller;

    this.button = button;
    window.addEventListener('scroll', () => this.requestSync(), { passive: true, signal });
    window.addEventListener('resize', () => this.requestSync(), { passive: true, signal });
    button.addEventListener('click', () => this.scrollToTop(), { signal });

    /* 刷新后停在半页（浏览器恢复滚动位置）时，首帧就得是可见的 */
    this.sync();
  }

  disconnectedCallback() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  /* 滚动事件按帧合并：Safari 上 scroll 可以一帧触发多次，逐次读布局会掉帧 */
  requestSync() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.ticking = false;
      this.sync();
    });
  }

  sync() {
    const threshold = (window.innerHeight || document.documentElement.clientHeight) * 0.75;
    const visible = window.scrollY > threshold;
    /* 只在跨过阈值时改属性，避免每帧写 DOM 让 CSS 过渡不断重启 */
    if (visible !== this.hasAttribute('data-visible')) {
      this.toggleAttribute('data-visible', visible);
    }
  }

  scrollToTop() {
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'auto' : 'smooth' });

    /* 下一帧再对一次状态：reduce 下是瞬时归位，这一帧 scrollY 已经是 0，按钮当场收起；
       平滑滚动时这一帧才刚起步、仍是"在页尾"，按钮留在原地，后续 scroll 事件接手。
       不这么做就得赌"归位一定伴随 scroll 事件"——瞬时跳转在部分实现里只补发一次事件，
       漏掉就留下一个已经没用的浮层。 */
    requestAnimationFrame(() => this.sync());

    const target =
      document.querySelector('.main-nav__logo') || document.getElementById('MainContent');
    if (!target) return;

    /* 老浏览器不认 preventScroll 时会退化成普通 focus()，那时滚动会被截断——
       宁可截断也不把键盘用户留在页尾，所以这里不 try/catch 兜底成不聚焦。 */
    target.focus({ preventScroll: true });
  }
}

if (!customElements.get('back-to-top')) {
  customElements.define('back-to-top', BackToTop);
}
