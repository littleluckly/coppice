
(() => {
  const DURATION_MS = 700;
  const SIZE = 56;
  const ARC_LIFT_PX = 90;

  function findSourceImage(button) {
    const card = button && button.closest('.product-card');
    return card ? card.querySelector('.product-card__media img') : null;
  }

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
      easing: 'linear',
      fill: 'forwards',
    });
    animation.addEventListener('finish', () => clone.remove(), { once: true });
    animation.addEventListener('cancel', () => clone.remove(), { once: true });
  });
})();
