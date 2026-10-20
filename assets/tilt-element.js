/**
 * tilt-element — 鼠标跟随 3D 倾斜（通用件）。
 *
 * 2026-10-20 由 assets/product-card-3d.js 泛化而来：商品卡（.product-card）与
 * 集合页横幅的产品悬浮岛（.collection__banner-island）共用同一份几何逻辑，
 * 幅度 / 触发区 / 倾斜目标全部由 HTML 上的 data-* 覆盖——不为一处新用法复制文件。
 *
 * 用法：<tilt-element class="xxx" data-tilt-target=".sel" data-tilt-area=".sel">
 *
 *   data-tilt-target       施加 transform 的元素（默认：host 内第一个 <img>）
 *   data-tilt-area         计算鼠标相对位置的区域（默认：host 自身）
 *                          横幅传整块 banner：鼠标不必压在岛上也跟随，视差更整。
 *   data-tilt-rotate       最大倾角 deg（默认 10）
 *   data-tilt-shift        最大平移 px（默认 6）
 *   data-tilt-scale        倾斜态缩放（默认 1.08；补偿旋转后露出的边）
 *   data-tilt-perspective  perspective px（默认 700；元素越大值越大，否则畸变夸张）
 *
 * 分工：配色（光晕 / 投影）归 CSS，本文件只管几何；「动多少」改上面的 data，
 * 「多快」改 CSS 里的 transition（产品卡 0.8s 极缓曲线，横幅同款）。
 *
 * 触发：fine pointer + 非 prefers-reduced-motion（触屏跳过，避免粘滞）。
 * 无 JS：元素保持静态定位，仅失去倾斜（渐进增强）。
 *
 * 另把 --tilt-x / --tilt-y（-1..1）写到 host：CSS 可据此做光晕 / 阴影跟随；
 * 不用就没有成本。离开时归零。
 *
 * ⚠️ 静态定位不要用 transform（居中偏移改用 translate 属性）——JS 整块覆写
 *    transform，写在里面的 translate(-50%, -45%) 会被吃掉、元素跳位。
 */
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

    /* 位移 / 倾斜以「区域盒」为基准，不能用 target 自己的 rect：它身上带着
       transform，把当前位姿喂回输入会造成反馈抖动（原 product-card-3d 同坑）。
       rect 在 mouseenter 缓存一次——transform 不触发布局，缓存即足够；
       但滚动 / 缩放会让它过期，故这两个时机作废缓存（下一帧重取）。 */
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
    /* rAF 合帧：mousemove 高频触发，每帧只算最新目标位姿；平滑感交给 CSS transition。 */
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
