

const AVOID_GAP = 8;

const AVOID_DEBOUNCE = 200;

const AVOID_MAX_RATIO = 0.4;

class BackToTop extends HTMLElement {
  connectedCallback() {

    if (this.controller) return;

    const button = this.querySelector('[data-back-to-top]');
    if (!button) return;

    this.controller = new AbortController();
    const { signal } = this.controller;

    window.addEventListener('scroll', () => this.requestSync(), { passive: true, signal });
    window.addEventListener('resize', () => this.requestSync(), { passive: true, signal });

    window.addEventListener('resize', () => this.scheduleAvoidance(), { passive: true, signal });
    button.addEventListener('click', () => this.scrollToTop(), { signal });

    this.watchOverlays(signal);

    this.sync();

    this.scheduleAvoidance();
  }

  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.avoidTimer) {
      clearTimeout(this.avoidTimer);
      this.avoidTimer = null;
    }
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  watchOverlays(signal) {
    if (typeof MutationObserver === 'function') {
      this.observer = new MutationObserver(() => this.scheduleAvoidance());
      this.observer.observe(document.body, { childList: true });
    }
    document.addEventListener('load', () => this.scheduleAvoidance(), { capture: true, signal });
  }

  scheduleAvoidance() {
    if (this.avoidTimer) clearTimeout(this.avoidTimer);
    this.avoidTimer = setTimeout(() => {
      this.avoidTimer = null;
      this.measureAvoidance();
    }, AVOID_DEBOUNCE);
  }

  measureAvoidance() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (!vh) return;

    const style = getComputedStyle(this);

    const rawOffset = style.getPropertyValue('--back-to-top-offset').trim();
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const offset = /rem$/.test(rawOffset) ? parseFloat(rawOffset) * rootFontSize : parseFloat(rawOffset) || 90;

    const own = this.getBoundingClientRect();
    if (!own.width) return;

    const baseBottom = vh - offset;
    const baseTop = baseBottom - own.height;
    const maxLift = vh * AVOID_MAX_RATIO;

    let lift = 0;
    for (const el of this.overlayCandidates()) {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      if (getComputedStyle(el).pointerEvents === 'none') continue;

      if (box.right <= own.left - AVOID_GAP) continue;
      if (box.left >= own.right + AVOID_GAP) continue;
      if (box.bottom <= baseTop - AVOID_GAP) continue;

      const need = baseBottom - (box.top - AVOID_GAP);
      if (need > lift && need <= maxLift) lift = need;
    }

    this.applyLift(Math.round(Math.max(0, lift)));
  }

  *overlayCandidates() {
    for (const el of document.body.children) {
      if (el === this || el.contains(this)) continue;
      if (this.isPinned(el)) yield el;
    }
    for (const frame of document.querySelectorAll('iframe')) {
      if (this.contains(frame) || !this.isPinned(frame)) continue;
      yield frame;
    }
  }

  isPinned(el) {
    let style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      if (node !== el) style = getComputedStyle(node);
      if (style.position === 'fixed') return true;
    }
    return false;
  }

  applyLift(px) {
    if (px === this.lift) return;
    this.lift = px;
    this.style.setProperty('--back-to-top-lift', `${px}px`);
  }

  requestSync() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.ticking = false;
      this.sync();
    });
  }

  sync() {
    const threshold = (window.innerHeight || document.documentElement.clientHeight) * 0.75;
    const visible = window.scrollY > threshold;

    if (visible !== this.hasAttribute('data-visible')) {
      this.toggleAttribute('data-visible', visible);

      if (visible) this.scheduleAvoidance();
    }
  }

  scrollToTop() {
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({ top: 0, left: 0, behavior: reduce ? 'auto' : 'smooth' });

    requestAnimationFrame(() => this.sync());

    const target =
      document.querySelector('.main-nav__logo') || document.getElementById('MainContent');
    if (!target) return;

    target.focus({ preventScroll: true });
  }
}

if (!customElements.get('back-to-top')) {
  customElements.define('back-to-top', BackToTop);
}
