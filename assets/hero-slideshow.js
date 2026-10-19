/**
 * hero-slideshow — 切换控件（圆点 + 上一张/下一张）+ 文字 caption 过渡。
 *
 * 架构：图片本体是 CSS scroll-snap 原生横滑，本脚本不接管滚动——按钮只
 * 触发一次 scrollTo，snap 负责对齐；触摸/键盘滚动零损失。
 * 文字在固定卡片里以多份 caption 并存，JS 按当前序号淡入淡出切换。
 * 循环：到最后一张再点下一张回到第一张（反向同理），scrollTo 直接回绕。
 */
(function () {
  'use strict';

  function init(root) {
    if (!root || root.dataset.heroInitialized) return;
    root.dataset.heroInitialized = 'true';

    const track = root.querySelector('.hero-slideshow__track');
    if (!track) return;

    const captions = Array.from(root.querySelectorAll('[data-hero-caption]'));
    const dots = Array.from(root.querySelectorAll('[data-hero-dot]'));
    const prev = root.querySelector('[data-hero-prev]');
    const next = root.querySelector('[data-hero-next]');
    const count = captions.length || dots.length;
    if (count < 2) return;

    const slideWidth = () => track.clientWidth;

    // 目标序号 → 滚动位置（带回绕：clamp 到 [0, count-1]）
    function goTo(index) {
      const clamped = ((index % count) + count) % count;
      track.scrollTo({ left: clamped * slideWidth(), behavior: 'smooth' });
    }

    // 当前序号：滚动位置取整（snap 对齐后每格恰一个视口宽）
    function currentIndex() {
      return Math.round(track.scrollLeft / slideWidth());
    }

    // 同步文字 caption + 圆点的 active 态
    function sync(i) {
      captions.forEach((c, ci) => {
        const active = ci === i;
        c.classList.toggle('is-active', active);
        c.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      dots.forEach((dot, di) => {
        const active = di === i;
        dot.classList.toggle('is-active', active);
        dot.tabIndex = active ? 0 : -1;
      });
    }

    // 循环：next 到最后回第一张，prev 到第一张回最后一张
    prev?.addEventListener('click', () => goTo(currentIndex() - 1));
    next?.addEventListener('click', () => goTo(currentIndex() + 1));

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => goTo(i));
    });

    // scroll → 同步 caption + 圆点（rAF 节流）
    let ticking = false;
    track.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          sync(currentIndex());
        });
      },
      { passive: true }
    );
  }

  document.querySelectorAll('.hero-slideshow').forEach(init);

  // 主题编辑器重渲染 section 时重新初始化（幂等守卫防重复绑定）
  document.addEventListener('shopify:section:load', (event) => {
    const root = document.getElementById(`shopify-section-${event.detail.sectionId}`);
    root?.querySelectorAll('.hero-slideshow').forEach(init);
  });
})();
