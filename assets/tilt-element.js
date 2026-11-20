
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)');

const DEFAULTS = {
  rotate: 10,
  shift: 6,
  scale: 1.08,
  perspective: 700,
};

class TiltElement extends HTMLElement {
  _controller = new AbortController();
  _rafId = 0;
  _rect = null;

  connectedCallback() {
    if (REDUCE_MOTION.matches || !FINE_POINTER.matches) return;

    const num = (key, fallback) => {
      const value = parseFloat(this.dataset[key]);
      return Number.isFinite(value) ? value : fallback;
    };
    this._rotate = num('tiltRotate', DEFAULTS.rotate);
    this._shift = num('tiltShift', DEFAULTS.shift);
    this._scale = num('tiltScale', DEFAULTS.scale);
    this._perspective = num('tiltPerspective', DEFAULTS.perspective);

    this._target = this.dataset.tiltTarget
      ? this.querySelector(this.dataset.tiltTarget)
      : this.querySelector('img');
    this._area = this.dataset.tiltArea ? this.querySelector(this.dataset.tiltArea) : this;
    if (!this._target || !this._area) return;

    const invalidate = () => {
      this._rect = null;
    };
    this.addEventListener('mouseenter', invalidate, { signal: this._controller.signal });
    this.addEventListener('mousemove', this._onMove, { signal: this._controller.signal });
    this.addEventListener('mouseleave', this._onLeave, { signal: this._controller.signal });
    window.addEventListener('scroll', invalidate, {
      signal: this._controller.signal,
      passive: true,
    });
    window.addEventListener('resize', invalidate, { signal: this._controller.signal });
  }

  disconnectedCallback() {
    this._controller.abort();
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._target) this._target.style.transform = '';
  }

  _onMove = (event) => {

    this._pending = event;
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = 0;
      if (!this._rect) this._rect = this._area.getBoundingClientRect();
      const rect = this._rect;
      if (!rect.width || !rect.height) return;

      const e = this._pending;
      const clamp = (n) => Math.max(-1, Math.min(1, n));
      const relX = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1);
      const relY = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1);

      this._target.style.transform =
        `perspective(${this._perspective}px) ` +
        `translate3d(${relX * this._shift}px, ${relY * this._shift}px, 0) ` +
        `rotateX(${-relY * this._rotate}deg) rotateY(${relX * this._rotate}deg) ` +
        `scale(${this._scale})`;
      this.style.setProperty('--tilt-x', relX.toFixed(3));
      this.style.setProperty('--tilt-y', relY.toFixed(3));
    });
  };

  _onLeave = () => {
    this._rect = null;
    this._target.style.transform = '';
    this.style.setProperty('--tilt-x', '0');
    this.style.setProperty('--tilt-y', '0');
  };
}

if (!customElements.get('tilt-element')) {
  customElements.define('tilt-element', TiltElement);
}
