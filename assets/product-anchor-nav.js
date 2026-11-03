/**
 * product-anchor-nav — 产品页右侧悬浮锚点导航的状态层（2026-11-02 刘工）。
 *
 * 只做三件事，点击与滚动都交给浏览器：
 *   1. **目标不存在就摘链接**：商家删掉 Overview / Specifications / Supplies
 *      某个 section，或商品没有耗材导致耗材区不输出时，对应 anchor 没有落点。
 *      有效目标剩不到 2 项 → 整条导航不出现（一项的"导航"没有意义）。
 *   2. **"页面有滚动"才显示**：量 scrollHeight 与视口高度；推荐区（Section
 *      Rendering 异步拉取）会把页面撑高，所以用 ResizeObserver 重算，而不是
 *      只在 connectedCallback 里量一次。
 *   3. **滚动时标当前分区**：给对应链接打 `aria-current="location"`（样式在
 *      section 的样式块里）。只在索引变化时写 DOM，避免每帧重设属性。
 *
 * 为什么不在脚本里接管点击：原生 `<a href="#id">` 自带 hash 更新、焦点移交和
 * 无 JS 降级；平滑滚动、吸顶页头避让分别由 CSS 的 `scroll-behavior` 与
 * `scroll-padding-top` 消费 `--anchor-nav-offset` 完成。这里只负责测量页头高度。
 *
 * 判据为什么不用 IntersectionObserver：页头吸顶后目标 section 的可见比例与
 * "当前读到哪一块"不是一回事（长表格往往占满视口，比例阈值要反复调）；
 * 直接读 rect.top 与一条固定的阅读线（页头下 35% 视口）比较，行为稳定、
 * 无需缓存位置，窗口缩放/字体加载后自动正确。
 */
class ProductAnchorNav extends HTMLElement {
  connectedCallback() {
    /* Section Rendering / 编辑器重挂载会再进一次：重复绑定会让滚动回调翻倍 */
    if (this._started) return;
    this._started = true;

    this._links = [];
    this._targets = [];

    this.querySelectorAll('[data-anchor-link]').forEach((link) => {
      const target = document.getElementById(link.getAttribute('data-anchor-link'));
      if (!target) {
        const item = link.closest('li');
        if (item) item.remove();
        return;
      }
      this._links.push(link);
      this._targets.push(target);
    });

    /* 少于两项不成立：一条竖轨只指一块内容，不如让用户直接滚 */
    if (this._links.length < 2) return;

    this._activeIndex = -1;
    this._offset = -1;

    this._controller = new AbortController();
    const { signal } = this._controller;

    window.addEventListener('scroll', () => this._queue(), { passive: true, signal });
    window.addEventListener('resize', () => this._queue(), { passive: true, signal });
    window.addEventListener('load', () => this._queue(), { signal });

    /* 推荐区异步填充、图片加载完都会改文档高度 */
    if ('ResizeObserver' in window) {
      this._observer = new ResizeObserver(() => this._queue());
      this._observer.observe(document.body);
    }

    this._sync();
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._started = false;
  }

  /* 滚动 / 尺寸变化按帧合并：Safari 上一帧可能派发多次 scroll */
  _queue() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this._sync();
    });
  }

  _sync() {
    const root = document.documentElement;

    /* 页头从 2026-11-02 起全断点吸顶（移动端也吸），所以高度一律按实测值取，
       不再按断点返回 0——否则移动端锚点跳转的落点会被页头盖住。 */
    const header = document.querySelector('.main-nav-section');
    const offset = header ? Math.round(header.getBoundingClientRect().height) : 0;

    /* 只在值变化时写根变量，避免每帧触发样式重算 */
    if (offset !== this._offset) {
      this._offset = offset;
      root.style.setProperty('--anchor-nav-offset', `${offset}px`);
    }

    /* 「页面有滚动」判定：内容比视口高 1px 以上。overflow: hidden 只锁滚动
       不改 scrollHeight，所以弹窗打开时这里不会误判成"不可滚动"。
       锚点导航条本身仍是桌面专属（移动端隐藏），所以这个 flag 仍按断点判。 */
    const desktop = typeof window.matchMedia === 'function'
      && window.matchMedia('(min-width: 990px)').matches;
    const scrollable = desktop && root.scrollHeight > window.innerHeight + 1;
    if (scrollable !== this.hasAttribute('data-scrollable')) {
      this.toggleAttribute('data-scrollable', scrollable);
    }

    if (!scrollable) {
      this._setActive(-1);
      return;
    }

    /* 阅读线：吸顶页头下 35% 视口。目标按 DOM 顺序排，
       最后一个"顶边已越过阅读线"的就是当前分区。 */
    const line = offset + window.innerHeight * 0.35;
    const atBottom = window.innerHeight + window.scrollY >= root.scrollHeight - 2;

    let active = -1;
    for (let i = 0; i < this._targets.length; i += 1) {
      if (this._targets[i].getBoundingClientRect().top <= line) active = i;
    }
    /* 滚到页尾时最后一块可能顶不到阅读线（推荐区撑着），直接算作当前 */
    if (atBottom) active = this._targets.length - 1;

    this._setActive(active);
  }

  _setActive(index) {
    if (index === this._activeIndex) return;
    this._activeIndex = index;

    this._links.forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
}

if (!customElements.get('product-anchor-nav')) {
  customElements.define('product-anchor-nav', ProductAnchorNav);
}
