/**
 * reveal-on-scroll — 非首屏内容的滚动入场（2026-10-28 产品页立项，
 * 2026-11-12 扩展到首页四个区块并支持卡片级联）。
 *
 * 形态：从下方 24px 淡入到原位，只动 opacity / transform，**不动布局**（零 CLS）。
 * 级联：目标上的 `--reveal-delay`（由各 section 按 forloop.index0 输出）决定各自的
 *       animation-delay，脚本不参与编号 —— 同一批进视口的卡片自然依次浮现。
 *
 * 四条纪律：
 *   1. **无 JS 不隐藏**：隐藏态只写在 `[data-reveal-state='pending']` 上，而这个属性
 *      只由本脚本写；脚本没跑（被拦、报错、老浏览器）时元素就是正常显示的。
 *   2. **首屏不参与**：初始化时已在视口内的目标**不写任何状态**，保持默认可见。
 *      否则 LCP 元素会被自己藏起来，且给它挂全局动画会扰动首屏与 CLS。
 *   3. **尊重系统设置**：`prefers-reduced-motion: reduce` 下整段跳过，不注册观察器。
 *   4. **不碰 transition**：视觉状态机用 CSS animation（见 critical.css），
 *      首页卡片自己的 hover 过渡不会被全局简写覆盖。
 *
 * 一次观察多个目标：IntersectionObserver 命中即 `shown` 并解除观察（只播一次）。
 * 动画时长 / 位移量 / 级联延迟都在 critical.css 与 section 输出里，本文件只管状态。
 * 全站由 layout/theme.liquid 引入一次，各 section 只负责输出 `data-reveal`。
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

    // 系统要求减少动效 / 老浏览器 → 什么都不做：元素本来就是可见的默认态。
    // 刻意不写 `shown`：写了反而会挂上全局动画规则，等于没跳过。
    if (reduced || typeof IntersectionObserver !== 'function') return;

    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const pending = [];

    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // 已经在首屏里（或已滚过）→ 不藏、不播、不写状态，保持默认可见
      if (rect.top < viewportH * 0.9) return;
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

    // Section Rendering / 主题编辑器重新注入的 DOM 不带状态 → 默认可见。
    // 这是有意的：编辑器里不该突然播一次入场，也不该把新节点藏起来；
    // 代价是局部刷新进来的区块不再补播动画，属可接受的降级。
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
