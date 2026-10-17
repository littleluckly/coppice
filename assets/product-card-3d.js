/**
 * product-card-3d — 商品卡 hover 3D 倾斜（2026-10-17）。
 *
 * 参考 dev-docs/local-assets/product-3d.html 的交互（mousemove 跟随倾斜 + 极缓平滑），
 * 按 AGENTS §6 落成 Custom Element：监听挂在自身、AbortController 一次性拆除，
 * Section Rendering 替换 DOM 后重新 connected 不会叠加。
 *
 * 分工：配色（光晕/投影）全在 product-card.css 里走 --color-brand* 变量，
 * 本文件只管几何——要调"动多少"改下方常量，要调"多快"改 CSS 里的 transition。
 *
 * 触发条件：fine pointer + hover（触屏跳过，避免粘滞）+ 非 prefers-reduced-motion。
 * 无 JS：卡片正常显示，仅失去倾斜（CSS hover 光晕/投影保留），渐进增强。
 *
 * 与参考 demo 的参数差异（有意收敛）：旋转 ±24°→±10°、位移 ±12px→±6px、
 * scale 1.05→1.08（补偿位移/旋转露边，配合媒体盒 overflow:hidden）。
 * demo 卡片 360px 独占一屏；我们是 200–300px 的密排网格卡，全幅度会互相打架。
 */
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)');

const MAX_ROTATE_DEG = 10; // 鼠标扫到边缘时的最大倾角
const MAX_SHIFT_PX = 6; // 鼠标跟随的最大平移（视差感）
const HOVER_SCALE = 1.08; // 倾斜态放大，补 overflow:hidden 裁切后的露边

class ProductCard3d extends HTMLElement {
  _controller = new AbortController();
  _rafId = 0;
  _rect = null;

  connectedCallback() {
    if (REDUCE_MOTION.matches || !FINE_POINTER.matches) return;
    this._img = this.querySelector('.product-card__media img');
    this._media = this.querySelector('.product-card__media');
    if (!this._img || !this._media) return;

    /* 位移/倾斜以媒体盒为基准（demo 同款）——img 自身带 transform，
       用它的 rect 会把当前位姿喂回输入造成反馈抖动，必须取未变换的父盒。
       rect 在 mouseenter 缓存一次：transform 不触发布局，缓存即足够。 */
    this.addEventListener('mouseenter', this._onEnter, { signal: this._controller.signal });
    this.addEventListener('mousemove', this._onMove, { signal: this._controller.signal });
    this.addEventListener('mouseleave', this._onLeave, { signal: this._controller.signal });
  }

  disconnectedCallback() {
    this._controller.abort();
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._img) this._img.style.transform = '';
  }

  _onEnter = () => {
    this._rect = this._media.getBoundingClientRect();
  };

  _onMove = (event) => {
    if (!this._rect) this._rect = this._media.getBoundingClientRect();
    /* rAF 合帧：mousemove 高频触发，每帧只算最新目标位姿；
       平滑感由 CSS transition（0.8s 极缓曲线）承担，与 demo 同机制。 */
    this._pendingEvent = event;
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = 0;
      const e = this._pendingEvent;
      const relX = ((e.clientX - this._rect.left) / this._rect.width) * 2 - 1; // -1..1
      const relY = ((e.clientY - this._rect.top) / this._rect.height) * 2 - 1;
      const rotateY = relX * MAX_ROTATE_DEG;
      const rotateX = -relY * MAX_ROTATE_DEG;
      const translateX = relX * MAX_SHIFT_PX;
      const translateY = relY * MAX_SHIFT_PX;
      this._img.style.transform =
        `perspective(700px) translate3d(${translateX}px, ${translateY}px, 0) ` +
        `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${HOVER_SCALE})`;
    });
  };

  _onLeave = () => {
    this._rect = null;
    this._img.style.transform = '';
  };
}

if (!customElements.get('product-card-3d')) {
  customElements.define('product-card-3d', ProductCard3d);
}
