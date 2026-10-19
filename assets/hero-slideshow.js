/**
 * hero-slideshow — PC 端切换控件（圆点 + 上一张/下一张）。
 *
 * 架构约定：滚动本体是 CSS scroll-snap 原生横滑，本脚本**不接管**滚动——
 * 按钮只触发一次 scrollTo，snap 负责对齐；触摸滑动、键盘滚动零损失。
 * 反向链路：监听 track 的 scroll 事件（rAF 节流），把当前位置同步回圆点。
 */
(function () {
  'use strict';

  function init(root) {
    if (!root || root.dataset.heroInitialized) return;
    root.dataset.heroInitialized = 'true';

    const track = root.querySelector('.hero-slideshow__track');
    if (!track) return;

    const dots = Array.from(root.querySelectorAll('[data-hero-dot]'));
    const prev = root.querySelector('[data-hero-prev]');
    const next = root.querySelector('[data-hero-next]');
    if (dots.length < 2) return;

    const slideWidth = () => track.clientWidth;

    // 目标序号 → 滚动位置。仅横向 LTR（本主题仅 en），scrollLeft 直接乘。
    function goTo(index) {
      const clamped = Math.max(0, Math.min(index, dots.length - 1));
      track.scrollTo({ left: clamped * slideWidth(), behavior: 'smooth' });
    }

    // 当前序号：滚动位置取整（snap 对齐后每格恰一个视口宽）
    function currentIndex() {
      return Math.round(track.scrollLeft / slideWidth());
    }

    prev?.addEventListener('click', () => goTo(currentIndex() - 1));
    next?.addEventListener('click', () => goTo(currentIndex() + 1));

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => goTo(i));
    });

    // scroll → 圆点同步（rAF 节流；scroll 事件本身在 snap 滑动中高频触发）
    let ticking = false;
    track.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          const i = currentIndex();
          dots.forEach((dot, di) => {
            const active = di === i;
            dot.classList.toggle('is-active', active);
            // 非当前点退出 Tab 序列，避免 Tab 要穿过一堆圆点
            dot.tabIndex = active ? 0 : -1;
          });
        });
      },
      { passive: true }
    );
  }

  document.querySelectorAll('.hero-slideshow').forEach(init);

  // 主题编辑器重渲染 section 时重新初始化（幂等守卫防重复绑定）
  document.addEventListener('shopify:section:load', (event) => {
    const root = document.getElementById(`shopify-section-${event.detail.sectionId}`);
    if (root?.classList.contains('hero-slideshow') || root?.querySelector('.hero-slideshow')) {
      root.querySelectorAll('.hero-slideshow').forEach(init);
    }
  });
})();
