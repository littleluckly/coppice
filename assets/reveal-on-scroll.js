
(() => {
  const ATTR = 'data-reveal';
  const STATE = 'data-reveal-state';

  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const init = () => {
    const targets = Array.from(document.querySelectorAll(`[${ATTR}]`));
    if (targets.length === 0) return;

    if (reduced || typeof IntersectionObserver !== 'function') return;

    const viewportH = window.innerHeight || document.documentElement.clientHeight;

    const rects = targets.map((el) => el.getBoundingClientRect());
    const pending = [];

    targets.forEach((el, i) => {
      if (rects[i].top < viewportH) return;
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
      { rootMargin: '0px 0px -12% 0px', threshold: 0 }
    );

    pending.forEach((el) => observer.observe(el));

  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
