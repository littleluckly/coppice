/**
 * back-to-top — 全站「回到顶部」按钮的行为（2026-10-30）。
 *
 * 四条纪律，与 reveal-on-scroll 同源：
 *   1. **纯增强**：不建 DOM、不改布局。脚本不跑时按钮保持 critical.css 里的默认态
 *      （visibility: hidden），不进 tab 序列，页面内容与阅读顺序完全不受影响。
 *   2. **状态靠 attribute**：显隐只切 `<back-to-top data-visible>`，淡入与位移在 CSS 里，
 *      这里不写任何样式。
 *   3. **尊重系统设置**：prefers-reduced-motion 下不做平滑滚动，直接跳。
 *   4. **与第三方右下角浮层共处**（BUG-074）：hCaptcha 徽标、Inbox / 客服挂件都钉在
 *      物理右下、首屏之后才注入，尺寸还由对方决定（收起 56×56 方块 / 展开 250×46 胶囊）。
 *      所以不写死偏移量，改为**量出来再抬**：见 measureAvoidance()。
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

/* 抬升后与遮挡物之间留的空隙：不能为 0，两块浮层贴边看起来像一块坏掉的控件 */
const AVOID_GAP = 8;

/* 遮挡物变更（徽标注入/移除）按 200ms 合并：MutationObserver 在页面活跃时会连发，
 * 而 getComputedStyle + getBoundingClientRect 是强制样式/布局计算，不能每条都跑 */
const AVOID_DEBOUNCE = 200;

/* 抬升上限占视口高的比例。超过就放弃避让——那已经不是「一枚徽标」，
 * 而是整屏浮层（底部面板、cookie 墙）。把它们顶上天的结果是把按钮送到屏幕中间，
 * 比被压住更荒谬。 */
const AVOID_MAX_RATIO = 0.4;

class BackToTop extends HTMLElement {
  connectedCallback() {
    /* Section Rendering / 编辑器重挂载都会再进一次：重复绑定会让一次点击滚两次 */
    if (this.controller) return;

    const button = this.querySelector('[data-back-to-top]');
    if (!button) return;

    this.controller = new AbortController();
    const { signal } = this.controller;

    window.addEventListener('scroll', () => this.requestSync(), { passive: true, signal });
    window.addEventListener('resize', () => this.requestSync(), { passive: true, signal });
    /* 视口尺寸变了，遮挡物的位置也变了 */
    window.addEventListener('resize', () => this.scheduleAvoidance(), { passive: true, signal });
    button.addEventListener('click', () => this.scrollToTop(), { signal });

    this.watchOverlays(signal);

    /* 刷新后停在半页（浏览器恢复滚动位置）时，首帧就得是可见的 */
    this.sync();
    /* 首帧先量一次：徽标可能在 HTML 之外就已注入（主题编辑器预览里就是） */
    this.scheduleAvoidance();
  }

  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.avoidTimer) {
      clearTimeout(this.avoidTimer);
      this.avoidTimer = null;
    }
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  /**
   * 盯住「右下角会多出东西」的三条路径：
   *   · 第三方脚本 append 到 body（徽标最常见的位置）——MutationObserver 只监听 body 的直接子节点，
   *     不上 subtree：页面内部的 DOM 变动（筛选刷新、变体切换）跟这个角落无关，别让它们触发测量；
   *   · iframe 晚加载（徽标本体多半是 iframe，可能在包装元素之后才拿到尺寸）——捕获阶段的 load 事件，
   *     iframe 的 load 不冒泡，只能这么抓；
   *   · 视口尺寸变化（上面已挂 resize）。
   */
  watchOverlays(signal) {
    if (typeof MutationObserver === 'function') {
      this.observer = new MutationObserver(() => this.scheduleAvoidance());
      this.observer.observe(document.body, { childList: true });
    }
    document.addEventListener('load', () => this.scheduleAvoidance(), { capture: true, signal });
  }

  scheduleAvoidance() {
    if (this.avoidTimer) clearTimeout(this.avoidTimer);
    this.avoidTimer = setTimeout(() => {
      this.avoidTimer = null;
      this.measureAvoidance();
    }, AVOID_DEBOUNCE);
  }

  /**
   * 量「按钮这一格有没有被别人占着」，占着就把 --back-to-top-lift 抬到对方上方。
   *
   * **探针盒必须由视口推导，不能拿按钮自己的 rect**：抬升会改按钮位置，
   * 拿它当探针就形成「抬高→测不到→降回→又测得到」的自激振荡（0.2s 过渡里量更明显）。
   * 水平方向不受抬升影响，所以 left/right 允许取实时 rect——RTL 下按钮在左，
   * 而徽标钉的是物理右侧，这一条让两侧布局共用同一套判断。
   *
   * 判据只看 `position: fixed` 的祖先（含自身）：绝对定位的图、正文 iframe 都钉不到视口角上。
   * 另外跳过 `pointer-events: none` 的纯装饰层——点得穿的浮层不构成遮挡。
   */
  measureAvoidance() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (!vh) return;

    const style = getComputedStyle(this);
    /* 与 CSS 的 --back-to-top-inset 同源，不各写一份 1rem。
       安全区没计入：iOS 上探针盒因此低 30px 左右，被 GAP 与徽标自身的边距吃掉 */
    const pad = parseFloat(style.getPropertyValue('--back-to-top-inset')) || 16;

    const own = this.getBoundingClientRect();
    if (!own.width) return; /* 还没上树 */

    const baseBottom = vh - pad;
    const baseTop = baseBottom - own.height;
    const maxLift = vh * AVOID_MAX_RATIO;

    let lift = 0;
    for (const el of this.overlayCandidates()) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      if (getComputedStyle(el).pointerEvents === 'none') continue;

      /* 只关心压住按钮那一格（含 GAP 带）的元素 */
      if (box.right <= own.left - AVOID_GAP) continue;
      if (box.left >= own.right + AVOID_GAP) continue;
      if (box.bottom <= baseTop - AVOID_GAP) continue; /* 完全在按钮上方，让得开 */

      const need = baseBottom - (box.top - AVOID_GAP);
      if (need > lift && need <= maxLift) lift = need;
    }

    this.applyLift(Math.round(Math.max(0, lift)));
  }

  /** 候选集刻意小：body 直接子节点 + 全页 iframe。第三方挂件九成落在前者，徽标本体在后者 */
  *overlayCandidates() {
    for (const el of document.body.children) {
      if (el === this || el.contains(this)) continue;
      if (this.isPinned(el)) yield el;
    }
    for (const frame of document.querySelectorAll('iframe')) {
      if (this.contains(frame) || !this.isPinned(frame)) continue;
      yield frame;
    }
  }

  /** 自身或任一祖先为 position: fixed。深度有限（十几层），且只对被选中的少数元素调用 */
  isPinned(el) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      if (getComputedStyle(node).position === 'fixed') return true;
    }
    return false;
  }

  applyLift(px) {
    if (px === this.lift) return;
    this.lift = px;
    this.style.setProperty('--back-to-top-lift', `${px}px`);
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
      /* 冒头前再量一次：这是按钮唯一会被看见的时刻，此前量过的结果可能已经过期 */
      if (visible) this.scheduleAvoidance();
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
