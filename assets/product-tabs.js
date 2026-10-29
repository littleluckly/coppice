/**
 * product-tabs — 产品页 Tab（概览 / 规格）的切换 + 吸顶偏移（2026-10-29 刘工）。
 *
 * 两件事：
 *
 * 1. Tab 切换（参考稿 switchTab）：
 *    点 tab → 同组的 tab 与 panel 互斥激活。纯 class 切换，不碰内容。
 *    无 JS 时两个面板都显示（HTML 里已给首面板 is-active，但 CSS 的
 *    .product-tabs__panel 默认 display:none，仅 is-active 显示——见下方说明）。
 *
 * 2. 吸顶偏移：
 *    Tab 栏 position: sticky 的 top 值必须避开页头（页头 sticky top:0、高度动态）。
 *    这里测量 .main-nav-section 的实际高度，写入 --product-tabs-offset，
 *    供 .product-tabs__nav 的 top 使用。移动端（< 990px）页头不吸顶、Tab 也不吸顶，
 *    所以偏移只在桌面有意义，但写进去无害（CSS 断点已隔离）。
 *
 * 为什么不用 IntersectionObserver 做「滚出取消吸顶」：
 *    position: sticky 本身就把黏附范围限制在父容器内——父容器滚出视口时
 *    sticky 子项随之滚出，天然「取消吸顶」，无需 JS 介入，也就没有跳动。
 *
 * 无 JS 降级：CSS 里 .product-tabs__panel 默认 display:none，仅 .is-active 显示。
 * 若本脚本未加载，首面板（HTML 已标 is-active）仍显示、其余面板隐藏、无法切换——
 * 这与参考稿一致（参考稿 panel 也是 display:none + active）。为保底，脚本首帧
 * 会把「无 is-active 面板」的情况修正为显示第一个面板，避免白屏。
 */
(() => {
  const initTabs = () => {
    document.querySelectorAll('[data-product-tabs]').forEach((root) => {
      if (root.dataset.tabsInit) return;
      root.dataset.tabsInit = '1';

      const tabs = Array.from(root.querySelectorAll('[data-product-tab]'));
      const panels = Array.from(root.querySelectorAll('[data-product-panel]'));
      if (tabs.length === 0) return;

      const activate = (key) => {
        tabs.forEach((t) => {
          const on = t.dataset.productTab === key;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach((p) => {
          p.classList.toggle('is-active', p.dataset.productPanel === key);
        });
      };

      // 保底：若没有激活项（异常），激活第一个
      if (!tabs.some((t) => t.classList.contains('is-active'))) {
        activate(tabs[0].dataset.productTab);
      }

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => activate(tab.dataset.productTab));
      });
    });
  };

  const initOffset = () => {
    const navs = document.querySelectorAll('.product-tabs__nav');
    if (navs.length === 0) return;

    const header = document.querySelector('.main-nav-section');
    if (!header) return;

    const sync = () => {
      // 页头只在桌面吸顶，高度取它的视觉高度；移动端 CSS 断点已让 Tab 栏不吸顶，
      // 这里仍写入偏移，无副作用。
      const h = header.getBoundingClientRect().height;
      navs.forEach((nav) => {
        nav.closest('.product-tabs')?.style.setProperty('--product-tabs-offset', `${h}px`);
      });
    };

    sync();
    window.addEventListener('resize', sync, { passive: true });
    // 字体/logo 加载后高度可能变化，兜底再测一次
    window.addEventListener('load', sync, { once: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initTabs();
      initOffset();
    });
  } else {
    initTabs();
    initOffset();
  }
})();
