/**
 * fly-to-cart — 加购成功后商品图抛物线飞入页头购物车图标（2026-10-16 刘工）。
 *
 * 监听 quick-add.js 冒泡的 cart:added（detail.button = 触发加购的按钮）：
 * 1. 来源 = 按钮所在 .product-card 内的商品图；无图（占位符卡片）→ 放弃动画；
 * 2. 目标 = 页面上第一个可见的 [data-cart-entry]（DOM 顺序桌面页头在前，
 *    移动抽屉的副本闭着抽屉时不可见，自动跳过）；
 * 3. 克隆一张 56px 圆形缩略图 position:fixed 盖在原图上，Web Animations API
 *    逐帧走二次贝塞尔曲线：x 线性插值、y 过"中点上方控制点"——合成抛物线，
 *    同时缩到 0.3 倍并淡出；结束移除克隆节点。
 *
 * 纪律：
 * - prefers-reduced-motion: reduce → 不做动画（只留 cart-badge 的角标同步）；
 * - 纯视觉层：不碰购物车数据，cart:updated 失败也不影响本动画；
 * - 加载：layout/theme.liquid 以 defer 引入——HTML 解析完才执行，不阻塞首屏
 *   （刘工要求动画脚本在页面加载完成后加载，defer 即此语义且是全站既有惯例）。
 */
(() => {
  const DURATION_MS = 700;
  const SIZE = 56;
  const ARC_LIFT_PX = 90; /* 控制点在起点/终点较高者上方再抬高的距离，决定弧度 */

  function findSourceImage(button) {
    const card = button && button.closest('.product-card');
    return card ? card.querySelector('.product-card__media img') : null;
  }

  /** 第一个可见的购物车入口里的图标（桌面页头优先于抽屉副本） */
  function findTarget() {
    for (const entry of document.querySelectorAll('[data-cart-entry]')) {
      const rect = entry.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return entry.querySelector('svg') || entry;
      }
    }
    return null;
  }

  function spawnClone(sourceImg, from, to) {
    const clone = document.createElement('img');
    clone.src = sourceImg.currentSrc || sourceImg.src;
    clone.alt = '';
    clone.setAttribute('aria-hidden', 'true');
    Object.assign(clone.style, {
      position: 'fixed',
      insetBlockStart: '0',
      insetInlineStart: '0',
      width: `${SIZE}px`,
      height: `${SIZE}px`,
      objectFit: 'cover',
      borderRadius: '50%',
      boxShadow: '0 4px 14px rgb(0 0 0 / 25%)',
      zIndex: '9999',
      pointerEvents: 'none',
    });
    document.body.appendChild(clone);
    return clone;
  }

  /** 二次贝塞尔抛物线：x 线性、y 过控制点，采样成 WAAPI 关键帧 */
  function buildKeyframes(from, to) {
    const half = SIZE / 2;
    const x1 = from.left + from.width / 2;
    const y1 = from.top + from.height / 2;
    const x2 = to.left + to.width / 2;
    const y2 = to.top + to.height / 2;
    const yc = Math.min(y1, y2) - ARC_LIFT_PX;

    const frames = [];
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      const x = (1 - t) * x1 + t * x2;
      const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * yc + t * t * y2;
      const scale = 1 - 0.7 * t;
      frames.push({
        transform: `translate(${x - half}px, ${y - half}px) scale(${scale})`,
        opacity: i === 10 ? 0 : 1 - 0.15 * t,
      });
    }
    return frames;
  }

  document.addEventListener('cart:added', (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const sourceImg = findSourceImage(event.detail && event.detail.button);
    const target = findTarget();
    if (!sourceImg || !target) return;

    const from = sourceImg.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (from.width === 0 || to.width === 0) return;

    const clone = spawnClone(sourceImg, from, to);
    const animation = clone.animate(buildKeyframes(from, to), {
      duration: DURATION_MS,
      easing: 'linear', /* 抛物线形状由关键帧保证，逐帧线性即可平滑 */
      fill: 'forwards',
    });
    animation.addEventListener('finish', () => clone.remove(), { once: true });
    animation.addEventListener('cancel', () => clone.remove(), { once: true });
  });
})();
