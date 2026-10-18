/**
 * site-header — 集合页沉浸页头（2026-10-15 干净版，曾名"透明页头"）。
 *
 * 机制：CSS 默认透明态（critical.css，.js.template-collection 门控）；
 * 本脚本只做两件事：
 * 1. measure：量真实页头高 → CSS 变量 + 内联 margin 兜底（critical.css
 *    被浏览器缓存旧版时，内联样式照样让横幅上移）。
 * 2. update：scrollY ≥（横幅高 − 页头高）→ .site-header--solid 恢复不透明。
 *    初始 scrollY=0 → 不加 solid，与 CSS 默认态同向，无闪烁翻转。
 *
 * 降级：
 * - 禁 JS → .js class 不存在 → CSS 整段不命中 → 页头原样不沉浸；
 * - 集合无 collection.image → threshold=0 → 恒 solid → 不沉浸（正确行为）。
 *
 * 2026-10-18 第二次改制：挂点从元素移到 <body data-site-header>。
 * 起因：线上编辑器中间画布把整个 header-group 渲染成空，而页脚组（无包裹层、
 * section 是 body 直接子级）正常。页头组先后用 <site-header> 自定义元素和
 * div + display:contents 包裹，画布都空 ⇒ 编辑器只认"section 是 body 直接子级"。
 * 所以包裹层彻底去掉，本脚本改为按已知的页头根节点（.announcement-bar /
 * .utility-bar / .main-nav）直接量测，solid 状态类切在 <body> 上
 * （CSS 选择器 .site-header--solid 不变，仍是后代选择器）。
 */
(() => {
  if (!document.body.hasAttribute('data-site-header')) return;

  /* 双重门控：集合页 + 商家开启沉浸页头（settings.immersive_header → body.immersive-header） */
  if (
    !document.body.classList.contains('template-collection') ||
    !document.body.classList.contains('immersive-header')
  ) {
    return;
  }

  /* 页头的三个已知根节点。用最近一级 .shopify-section 包裹层测高——
     包裹层与 section 根节点的可见高度一致，但隐藏状态下两者都是 0。 */
  const HEADER_ROOTS = '.announcement-bar, .utility-bar, .main-nav';

  /** 页头总高：累加可见部分的高度（display:none 的部分 offsetParent 为 null，自动跳过，
      如集合页隐藏的 utility bar） */
  const measure = () => {
    let height = 0;
    for (const el of document.querySelectorAll(HEADER_ROOTS)) {
      const box = el.closest('.shopify-section') || el;
      if (box.offsetParent !== null) height += box.getBoundingClientRect().height;
    }
    document.documentElement.style.setProperty('--site-header-h', `${height}px`);
    const main = document.querySelector('.main-content');
    if (main) main.style.marginTop = `${-height}px`;
  };

  /** solid 判定：scrollY vs 静态阈值（横幅高 − sticky nav 行高），一次测量不做逐帧几何比较 */
  const update = () => {
    const banner = document.querySelector('.collection__banner');
    const nav = document.querySelector('.main-nav-section');
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    const threshold = banner ? Math.max(0, banner.offsetHeight - navHeight) : 0;
    document.body.classList.toggle('site-header--solid', window.scrollY >= threshold);
  };

  const onScroll = () => update();
  const onResize = () => {
    measure();
    update();
  };

  measure();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  /* 字体加载后行高变化 → 重测（FOUC 偏差防护） */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measure();
      update();
    });
  }
})();
