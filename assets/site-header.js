/**
 * site-header — 集合页沉浸页头（2026-10-15 干净版，曾名"透明页头"）。
 *
 * 机制：CSS 默认透明态（critical.css，.js.template-collection 门控）；
 * 本脚本只做两件事：
 * 1. _measure：量真实页头高 → CSS 变量 + 内联 margin 兜底（critical.css
 *    被浏览器缓存旧版时，内联样式照样让横幅上移）。
 * 2. _update：scrollY ≥（横幅高 − 页头高）→ .site-header--solid 恢复不透明。
 *    初始 scrollY=0 → 不加 solid，与 CSS 默认态同向，无闪烁翻转。
 *
 * 降级：
 * - 禁 JS → .js class 不存在 → CSS 整段不命中 → 页头原样不沉浸；
 * - 集合无 collection.image → threshold=0 → 恒 solid → 不沉浸（正确行为）。
 *
 * 实现纪律（AGENTS §6）：Custom Element + 类字段箭头函数 + passive 监听。
 */
class SiteHeader extends HTMLElement {
  _onScroll = () => this._update();

  _onResize = () => {
    this._measure();
    this._update();
  };

  connectedCallback() {
    /* 双重门控：集合页 + 商家开启沉浸页头（settings.immersive_header → body.immersive-header） */
    if (
      !document.body.classList.contains('template-collection') ||
      !document.body.classList.contains('immersive-header')
    ) return;

    this._measure();
    this._update();
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });
    /* 字体加载后行高变化 → 重测（FOUC 偏差防护） */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        this._measure();
        this._update();
      });
    }
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onResize);
    document.documentElement.style.removeProperty('--site-header-h');
    const main = document.querySelector('.main-content');
    if (main) main.style.marginTop = '';
  }

  /** 页头总高：累加可见子 section 高度（display:contents 下本元素无盒；
      display:none 的子级 offsetParent 为 null，自动跳过——如集合页隐藏的 utility） */
  _measure() {
    let height = 0;
    for (const child of this.children) {
      if (child.offsetParent !== null) height += child.getBoundingClientRect().height;
    }
    document.documentElement.style.setProperty('--site-header-h', `${height}px`);
    const main = document.querySelector('.main-content');
    if (main) main.style.marginTop = `${-height}px`;
  }

  /** solid 判定：scrollY vs 静态阈值（横幅高 − sticky nav 行高），一次测量不做逐帧几何比较 */
  _update() {
    const banner = document.querySelector('.collection__banner');
    const nav = this.querySelector('.main-nav-section');
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    const threshold = banner ? Math.max(0, banner.offsetHeight - navHeight) : 0;
    this.classList.toggle('site-header--solid', window.scrollY >= threshold);
  }
}

if (!customElements.get('site-header')) {
  customElements.define('site-header', SiteHeader);
}
