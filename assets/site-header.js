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
 * 2026-10-18 改制：原先挂成 <site-header> 自定义元素（class SiteHeader extends
 * HTMLElement）。线上编辑器中间画布把整组 section 渲染成空（店面 + 本地预览都正常），
 * 唯一的结构异常就是"{% sections %} 被自定义元素包裹"，故降级为普通脚本：
 * 包裹层换成 div.site-header[data-site-header]（仍 display: contents，sticky
 * 包含盒不变），本文件在 DOM 解析后按 [data-site-header] 取节点。
 * 行为与旧实现逐条等价，只是不再有元素生命周期回调。
 *
 * 实现纪律（AGENTS §6）：passive 监听、无逐帧几何比较。
 */
(() => {
  const header = document.querySelector('[data-site-header]');
  if (!header) return;

  /* 双重门控：集合页 + 商家开启沉浸页头（settings.immersive_header → body.immersive-header） */
  if (
    !document.body.classList.contains('template-collection') ||
    !document.body.classList.contains('immersive-header')
  ) {
    return;
  }

  /** 页头总高：累加可见子 section 高度（display:contents 下包裹层无盒；
      display:none 的子级 offsetParent 为 null，自动跳过——如集合页隐藏的 utility） */
  const measure = () => {
    let height = 0;
    for (const child of header.children) {
      if (child.offsetParent !== null) height += child.getBoundingClientRect().height;
    }
    document.documentElement.style.setProperty('--site-header-h', `${height}px`);
    const main = document.querySelector('.main-content');
    if (main) main.style.marginTop = `${-height}px`;
  };

  /** solid 判定：scrollY vs 静态阈值（横幅高 − sticky nav 行高），一次测量不做逐帧几何比较 */
  const update = () => {
    const banner = document.querySelector('.collection__banner');
    const nav = header.querySelector('.main-nav-section');
    const navHeight = nav ? nav.getBoundingClientRect().height : 0;
    const threshold = banner ? Math.max(0, banner.offsetHeight - navHeight) : 0;
    header.classList.toggle('site-header--solid', window.scrollY >= threshold);
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
