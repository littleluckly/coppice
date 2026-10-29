/**
 * product-gallery — 产品页媒体画廊（task-product T-2.1）。
 *
 * 三套导航的分工（拍板 D1，效果图上三套并存视为冗余）：
 *   桌面 ≥1100px：左侧缩略图列 + 主图左右箭头
 *   移动 <1100px：底部圆点（缩略图列在桌面才排成左列；移动端横滑）
 *
 * 延迟媒体：video / external_video / model 三类在 `<template>` 里，**首次激活才实例化**
 * （延续「隐藏组件首次打开才建 DOM」）。3D 的 model-viewer 由 section 侧按需加载
 * 平台组件，本文件不引任何外部资源。
 *
 * 变体联动：监听 document 上的 `variant:change`（product-form.js 派发），按 mediaId
 * 切到对应媒体；找不到该变体的专属媒体就保持当前帧，不乱跳。
 *
 * 无 JS：所有 slide 里第一张图可见（其余 `hidden` 由 Liquid 输出），至少能看到主图。
 */
class ProductGallery extends HTMLElement {
  connectedCallback() {
    this._slides = Array.from(this.querySelectorAll('.product-gallery__slide'));
    this._thumbs = Array.from(this.querySelectorAll('[data-gallery-thumb]'));
    this._dots = Array.from(this.querySelectorAll('[data-gallery-dot]'));
    this._index = Math.max(
      0,
      this._slides.findIndex((slide) => slide.classList.contains('is-active'))
    );

    if (this._slides.length === 0) return;

    this._controller = new AbortController();
    const { signal } = this._controller;

    const prev = this.querySelector('[data-gallery-prev]');
    const next = this.querySelector('[data-gallery-next]');
    if (prev) prev.addEventListener('click', () => this._step(-1), { signal });
    if (next) next.addEventListener('click', () => this._step(1), { signal });

    this._thumbs.forEach((thumb, i) =>
      thumb.addEventListener('click', () => this.show(i), { signal })
    );
    this._dots.forEach((dot, i) =>
      dot.addEventListener('click', () => this.show(i), { signal })
    );

    // 延迟媒体：封面按钮点一下即实例化播放器
    this.querySelectorAll('[data-deferred-media]').forEach((holder) => {
      const trigger = holder.querySelector('[data-deferred-trigger]');
      if (!trigger) return;
      trigger.addEventListener('click', () => this._activateDeferred(holder), { signal });
    });

    document.addEventListener('variant:change', this._onVariantChange, { signal });

    // 触摸横滑（只在媒体区，不抢页面纵向滚动）
    this._bindSwipe(signal);
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  _onVariantChange = (event) => {
    const mediaId = event.detail && event.detail.mediaId;
    if (!mediaId) return;
    const index = this._slides.findIndex(
      (slide) => Number(slide.dataset.mediaId) === Number(mediaId)
    );
    if (index >= 0) this.show(index);
  };

  _step(delta) {
    const count = this._slides.length;
    if (count < 2) return;
    const nextIndex = (this._index + delta + count) % count;
    this.show(nextIndex);
  }

  show(index) {
    if (index < 0 || index >= this._slides.length) return;
    this._index = index;

    this._slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle('is-active', active);
      // 用 hidden 而非 display:none 内联样式：读屏与焦点顺序一起走
      if (active) {
        slide.removeAttribute('hidden');
        this._activateDeferred(slide.querySelector('[data-deferred-media]'));
      } else {
        slide.setAttribute('hidden', '');
        // 离场即暂停正在播放的媒体，避免多帧同时播放（官方 UX 要求）
        slide.querySelectorAll('video, iframe').forEach((node) => {
          if (node.tagName === 'VIDEO') node.pause();
        });
      }
    });

    this._thumbs.forEach((thumb, i) => {
      const active = i === index;
      thumb.classList.toggle('is-active', active);
      thumb.setAttribute('aria-current', active ? 'true' : 'false');
    });

    this._dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  }

  /** 把 <template> 里的播放器搬进 DOM，只做一次 */
  _activateDeferred(holder) {
    if (!holder || holder.dataset.loaded === 'true') return;
    const template = holder.querySelector('template');
    if (!template) return;

    holder.dataset.loaded = 'true';
    template.replaceWith(template.content.cloneNode(true));
    const trigger = holder.querySelector('[data-deferred-trigger]');
    if (trigger) trigger.remove();
  }

  _bindSwipe(signal) {
    const stage = this.querySelector('.product-gallery__stage');
    if (!stage) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    stage.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length !== 1) return;
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        tracking = true;
      },
      { signal, passive: true }
    );

    stage.addEventListener(
      'touchend',
      (event) => {
        if (!tracking) return;
        tracking = false;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        // 横向位移要明显大于纵向，否则视为页面滚动
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        this._step(dx < 0 ? 1 : -1);
      },
      { signal, passive: true }
    );
  }
}

if (!customElements.get('product-gallery')) {
  customElements.define('product-gallery', ProductGallery);
}
