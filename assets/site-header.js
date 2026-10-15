/**
 * site-header — 集合页透明页头（2026-10-15 刘工拍板，"横幅沉浸叠图"）。
 *
 * 机制：
 * - 仅集合页激活（body.template-collection）：main 负上移让横幅钻到页头背后，
 *   页头悬浮叠横幅（白字），滚过横幅后恢复不透明（site-header--transparent 移除）。
 * - 其他页面：connectedCallback 直接短路，零行为、零开销。
 *
 * 实现纪律（AGENTS §6）：Custom Element + 类字段箭头函数 +  passive 监听；
 * 滚动监听不写 setTimeout 节流（切 class 是廉价样式计算，被动监听已够）。
 */
class SiteHeader extends HTMLElement {
  _onScroll = () => this._update();

  _onResize = () => {
    this._measure();
    this._update();
  };

  connectedCallback() {
    if (!document.body.classList.contains('template-collection')) return;

    this._measure();
    this._update();
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });
    /* 字体加载后行高变化 → 重测（FOUC 偏差防护；fonts.ready 不可用时静默跳过） */
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

  /** 页头高度写入 CSS 变量 + 直接内联兜底：
      CSS 变量供 .template-collection .main-content 的规则消费；
      内联 margin 是双保险——critical.css 被浏览器缓存旧版时，横幅照样上移。 */
  _measure() {
    const height = this.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--site-header-h', `${height}px`);
    const main = document.querySelector('.main-content');
    if (main) main.style.marginTop = `${-height}px`;
  }

  /** 透明态判定：横幅底缘还在视口内（页头仍压在横幅上）→ 透明白字；否则恢复 */
  _update() {
    const banner = document.querySelector('.collection__banner');
    const headerBottom = this.getBoundingClientRect().bottom;
    const transparent = banner
      ? banner.getBoundingClientRect().bottom > headerBottom
      : false;
    this.classList.toggle('site-header--transparent', transparent);
  }
}

if (!customElements.get('site-header')) {
  customElements.define('site-header', SiteHeader);
}
