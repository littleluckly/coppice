/**
 * reveal-on-scroll — 产品页各区块的上滑入场动画（2026-10-28 刘工要求）。
 *
 * 形态：区块从下方 24px 淡入到原位，只动 opacity / transform，**不动布局**（零 CLS）。
 *
 * 三条纪律：
 *   1. **无 JS 不隐藏**：初始隐藏态写在 `[data-reveal-state]` 上，而这个属性只由本脚本
 *      写入 —— 脚本没跑（被拦、报错、老浏览器）时区块就是正常显示的，不会白屏。
 *   2. **首屏不参与**：初始化时已在视口内的区块直接标记 `shown` 且不加过渡，
 *      否则 LCP 元素会被自己藏起来（首屏产品图在 main-product 里，本就不挂 data-reveal）。
 *   3. **尊重系统设置**：`prefers-reduced-motion: reduce` 下整段跳过，动画不注册。
 *
 * 一次观察多个区块：IntersectionObserver 命中即 `shown` 并解除观察（只播一次，不来回闪）。
 * 动画时长 / 位移量在 critical.css 的 `[data-reveal]` 规则里，本文件只管状态机。
 */
(() => {
  const ATTR = 'data-reveal';
  const STATE = 'data-reveal-state';

  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const init = () => {
    const targets = Array.from(document.querySelectorAll(`[${ATTR}]`));
    if (targets.length === 0) return;

    // 系统要求减少动效 → 一律直接显示，不注册任何观察器
    if (reduced || typeof IntersectionObserver !== 'function') {
      targets.forEach((el) => el.setAttribute(STATE, 'shown'));
      return;
    }

    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const pending = [];

    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // 已经在首屏里（或已滚过）→ 不藏、不播，立即显示
      if (rect.top < viewportH * 0.9) {
        el.setAttribute(STATE, 'shown');
        return;
      }
      el.setAttribute(STATE, 'pending');
      pending.push(el);
    });

    if (pending.length === 0) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute(STATE, 'shown');
          obs.unobserve(entry.target);
        });
      },
      // 提前 12% 视口高度触发：等区块进到画面中央才动，观感上是"跟手慢了"
      { rootMargin: '0px 0px -12% 0px', threshold: 0 }
    );

    pending.forEach((el) => observer.observe(el));

    // Section Rendering / 主题编辑器重新注入 DOM 后，新节点没有状态 → 补一次
    document.addEventListener(
      'shopify:section:load',
      () => {
        document.querySelectorAll(`[${ATTR}]:not([${STATE}])`).forEach((el) => {
          el.setAttribute(STATE, 'shown');
        });
      },
      { once: false }
    );
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
