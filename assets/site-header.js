/**
 * site-header — 集合页沉浸页头（2026-10-15 干净版，曾名"透明页头"）。
 *
 * 2026-10-20 收窄为「只沉浸导航行」（刘工：横幅不能沉浸到公告条）：
 * 偏移量只减导航行高，横幅顶边落在公告条下沿；公告条全程品牌实底。
 *
 * 机制：CSS 默认透明态（critical.css，.js.template-collection 门控）；
 * 本脚本只做两件事：
 * 1. measure：量导航行高 → CSS 变量 --site-nav-h + 内联 margin 兜底
 *    （critical.css 被浏览器缓存旧版时，内联样式照样让横幅上移）。
 *    仅桌面（≥990px）：移动端导航不吸顶、也不透明，不需要也不该上移。
 * 2. update：横幅底边滚过导航行底边 → .site-header--solid 恢复不透明。
 *    初始 scrollY=0 → 不加 solid，与 CSS 默认态同向，无闪烁翻转。
 *
 * 降级：
 * - 禁 JS → .js class 不存在 → CSS 整段不命中 → 页头原样不沉浸；
 * - 集合无 banner 图 → 无 .collection__banner → 恒 solid → 不沉浸（正确行为）。
 *
 * 2026-10-18 第二次改制：挂点从元素移到 <body data-site-header>。
 * 起因：线上编辑器中间画布把整个 header-group 渲染成空，而页脚组（无包裹层、
 * section 是 body 直接子级）正常。页头组先后用 <site-header> 自定义元素和
 * div + display:contents 包裹，画布都空 ⇒ 编辑器只认"section 是 body 直接子级"。
 * 所以包裹层彻底去掉，本脚本改为按已知的页头根节点直接量测，solid 状态类
 * 切在 <body> 上（CSS 选择器 .site-header--solid 不变，仍是后代选择器）。
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

  /* 沉浸只发生在桌面：导航行 ≥990px 才 sticky、才透明。
     移动端导航既不吸顶也不透明，把横幅塞到它背后只会被它盖住。 */
  const DESKTOP = window.matchMedia('(min-width: 990px)');
  const NAV_ROOT = '.main-nav';

  /** 导航行高（只算导航，不含公告条）。用最近一级 .shopify-section 包裹层测高——
      包裹层与 section 根节点的可见高度一致，隐藏状态下两者都是 0。 */
  const navHeight = () => {
    const nav = document.querySelector(NAV_ROOT);
    const box = nav ? nav.closest('.shopify-section') || nav : null;
    if (!box || box.offsetParent === null) return 0;
    return box.getBoundingClientRect().height;
  };

  const measure = () => {
    const height = navHeight();
    document.documentElement.style.setProperty('--site-nav-h', `${height}px`);
    /* CSS 缓存兜底：桌面端内联负上移；非桌面清掉内联值，交回正常文档流 */
    const main = document.querySelector('.main-content');
    if (main) main.style.marginTop = DESKTOP.matches ? `${-height}px` : '';
  };

  /** solid 判定：横幅底边滚过导航行底边即恢复不透明。
      阈值用文档绝对坐标（rect.bottom + scrollY）算——布局/断点变化后仍自洽，
      且把"公告条已滚走的那段"算进去（旧公式「横幅高 − 页头高」会漏掉它）。 */
  const update = () => {
    const banner = document.querySelector('.collection__banner');
    if (!banner) {
      document.body.classList.add('site-header--solid');
      return;
    }
    const bannerBottom = banner.getBoundingClientRect().bottom + window.scrollY;
    const threshold = Math.max(0, bannerBottom - navHeight());
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
  DESKTOP.addEventListener('change', onResize);

  /* 字体加载后行高变化 → 重测（FOUC 偏差防护） */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measure();
      update();
    });
  }
})();
