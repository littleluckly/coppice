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
 * 2. update：滚过页头高度（公告条 + 导航行）→ .site-header--solid 上实底。
 *    透明底只在横幅还垫在导航行背后时成立；一旦滚过页头，导航行下面就是
 *    白底内容，再保持透明文字就看不见了（2026-10-20 刘工）。
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
 * 切在 <body> 上（CSS 必须写成 .template-collection.immersive-header.site-header--solid
 * ——与 body 上的 immersive-header 是同一元素的复合类，不是后代；写成空格后代
 * 选择器永远不命中，实底会静默失效，见 BUG-046）。
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
  const HEADER_ROOTS = '.announcement-bar, .utility-bar, .main-nav';

  /** 单个页头根节点的高度（取最近一级 .shopify-section 包裹层——
      包裹层与 section 根节点可见高度一致，隐藏状态下两者 offsetParent 都是 null）。 */
  const rowHeight = (selector) => {
    const el = document.querySelector(selector);
    const box = el ? el.closest('.shopify-section') || el : null;
    if (!box || box.offsetParent === null) return 0;
    return box.getBoundingClientRect().height;
  };

  /** 导航行高（只算导航，不含公告条）——沉浸偏移量用 */
  const navHeight = () => rowHeight(NAV_ROOT);

  /** 页头总高（公告条 + 导航行，utility 在沉浸态隐藏会自动跳过）——solid 阈值用 */
  const headerHeight = () => {
    let height = 0;
    for (const el of document.querySelectorAll(HEADER_ROOTS)) {
      const box = el.closest('.shopify-section') || el;
      if (box.offsetParent !== null) height += box.getBoundingClientRect().height;
    }
    return height;
  };

  /* 页头总高缓存：update() 每次滚动都要用，measure 时刷新一次 */
  let headerH = 0;

  const measure = () => {
    const height = navHeight();
    headerH = headerHeight();
    document.documentElement.style.setProperty('--site-nav-h', `${height}px`);
    /* CSS 缓存兜底：桌面端内联负上移；非桌面清掉内联值，交回正常文档流 */
    const main = document.querySelector('.main-content');
    if (main) main.style.marginTop = DESKTOP.matches ? `${-height}px` : '';
  };

  /** solid 判定（2026-10-20 刘工）：滚过页头高度就上实底——透明底一旦离开横幅、
      压到白底内容上，导航文字就看不见了。因此阈值取：
        ① 页头总高（公告条 + 导航行）——主判据；
        ② 横幅底边滚过导航行底边——保底，横幅若比页头还矮也不会出现
           "透明底压在白底内容上"的空档。
      两者取小：先到先实底。 */
  const update = () => {
    const banner = document.querySelector('.collection__banner');
    if (!banner) {
      document.body.classList.add('site-header--solid');
      return;
    }
    const bannerBottom = banner.getBoundingClientRect().bottom + window.scrollY;
    const bannerLeaves = Math.max(0, bannerBottom - navHeight());
    const threshold = Math.max(0, Math.min(headerH, bannerLeaves));
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
