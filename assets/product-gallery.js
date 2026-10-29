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
 * 全屏查看器（2026-10-28）：点舞台大图 → 原生 `<dialog>` + showModal()。
 * 只收图片（视频/3D 就地播放，塞进灯箱会和自带控件抢空间）。内容懒填——
 * 打开时才克隆舞台图（复用它的 srcset 尺寸档位，只需把 sizes 撑到 100vw，
 * 浏览器自己挑一张够大的），标记里因此不存任何第二份图片 URL。
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

    // 灯箱的索引空间只含图片，和舞台的 _slides 不是同一套，必须分开存
    this._imageSlides = this._slides.filter((slide) => slide.dataset.mediaType === 'image');
    this._lightbox = this.querySelector('[data-gallery-lightbox]');
    this._lightboxIndex = 0;
    // 横滑之后浏览器还会补一个 click，用它把那次点击吞掉（见 _attachSwipe）
    this._suppressClick = false;

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

    this.querySelectorAll('[data-gallery-zoom]').forEach((button) =>
      button.addEventListener('click', () => this._openLightbox(button), { signal })
    );

    // 延迟媒体：封面按钮点一下即实例化播放器
    this.querySelectorAll('[data-deferred-media]').forEach((holder) => {
      const trigger = holder.querySelector('[data-deferred-trigger]');
      if (!trigger) return;
      trigger.addEventListener('click', () => this._activateDeferred(holder), { signal });
    });

    if (this._lightbox) this._bindLightbox(signal);

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

  /* ---------------- 全屏查看器 ---------------- */

  _openLightbox(button) {
    if (this._suppressClick) {
      this._suppressClick = false;
      return;
    }
    if (!this._lightbox || typeof this._lightbox.showModal !== 'function') return;
    // 已经打开时再点不重复 showModal（会抛 InvalidStateError）
    if (this._lightbox.open) return;

    const slide = button.closest('.product-gallery__slide');
    const index = this._imageSlides.indexOf(slide);
    if (index < 0) return;

    this._lightboxIndex = index;
    this._renderLightbox();
    this._lightbox.showModal();
  }

  _renderLightbox() {
    const total = this._imageSlides.length;
    const slide = this._imageSlides[this._lightboxIndex];
    if (!slide) return;

    const dialog = this._lightbox;
    const canvas = dialog.querySelector('[data-lightbox-canvas]');
    const source = slide.querySelector('.product-gallery__zoom img');
    const zoom = slide.querySelector('[data-gallery-zoom]');

    if (canvas && source) {
      const img = document.createElement('img');
      // 复用舞台图的尺寸档位：srcset 原样搬过来，只把 sizes 撑到视口宽，
      // 浏览器就会按新的显示尺寸重新挑图（通常正好是最大那一档）。
      const src = source.getAttribute('src');
      if (src) img.setAttribute('src', src);
      const srcset = source.getAttribute('srcset');
      if (srcset) img.setAttribute('srcset', srcset);
      img.setAttribute('sizes', '100vw');
      img.className = 'product-lightbox__img';
      img.decoding = 'sync';
      img.alt = (zoom && zoom.dataset.zoomAlt) || source.alt || '';
      canvas.replaceChildren(img);
    }

    const counter = dialog.querySelector('[data-lightbox-counter]');
    if (counter) {
      // 计数文案由 Liquid 下发模板（带 [index] / [total] 占位），JS 只做替换——
      // 翻译键与单复数规则仍留在 locale 里，不在脚本里拼英文
      const template = dialog.dataset.counterTemplate || '[index] / [total]';
      counter.textContent = template
        .replace('[index]', String(this._lightboxIndex + 1))
        .replace('[total]', String(total));
    }

    // 只有一张图时，箭头没有意义（循环到同一张），直接隐藏
    const single = total < 2;
    dialog.querySelectorAll('[data-lightbox-prev], [data-lightbox-next]').forEach((arrow) => {
      arrow.hidden = single;
    });
  }

  _stepLightbox(delta) {
    const total = this._imageSlides.length;
    if (total < 2) return;
    this._lightboxIndex = (this._lightboxIndex + delta + total) % total;
    this._renderLightbox();
  }

  _bindLightbox(signal) {
    const dialog = this._lightbox;
    const canvas = dialog.querySelector('[data-lightbox-canvas]');
    const closeButton = dialog.querySelector('[data-lightbox-close]');
    const prev = dialog.querySelector('[data-lightbox-prev]');
    const next = dialog.querySelector('[data-lightbox-next]');

    if (closeButton) closeButton.addEventListener('click', () => dialog.close(), { signal });
    if (prev) prev.addEventListener('click', () => this._stepLightbox(-1), { signal });
    if (next) next.addEventListener('click', () => this._stepLightbox(1), { signal });

    // 点图片以外的画布区域关闭（灯箱的常规习惯）；点图片本身不关
    if (canvas) {
      canvas.addEventListener(
        'click',
        (event) => {
          if (this._suppressClick) {
            this._suppressClick = false;
            return;
          }
          if (event.target === canvas) dialog.close();
        },
        { signal }
      );
      this._attachSwipe(canvas, signal, (delta) => this._stepLightbox(delta));
    }

    // 键盘左右翻页；Esc 由 showModal() 原生负责，不必自己写
    dialog.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          this._stepLightbox(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          this._stepLightbox(1);
        }
      },
      { signal }
    );

    // 关闭后把舞台切到灯箱里停留的那一张——两处看到的东西必须一致。
    // 焦点也顺手还给"当前这张"的放大大按钮：原生只还给它记住的那枚，
    // 而在灯箱里翻过页后那枚已经被 hidden，焦点会掉到 body 上。
    dialog.addEventListener(
      'close',
      () => {
        const slide = this._imageSlides[this._lightboxIndex];
        if (!slide) return;
        this.show(this._slides.indexOf(slide));
        const back = slide.querySelector('[data-gallery-zoom]');
        if (back) back.focus({ preventScroll: true });
      },
      { signal }
    );
  }

  /* ---------------- 触摸横滑 ---------------- */

  _bindSwipe(signal) {
    const stage = this.querySelector('.product-gallery__stage');
    if (stage) this._attachSwipe(stage, signal, (delta) => this._step(delta));
  }

  _attachSwipe(element, signal, onStep) {
    if (!element) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    element.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length !== 1) return;
        startX = event.touches[0].clientX;
        startY = event.touches[0].clientY;
        tracking = true;
      },
      { signal, passive: true }
    );

    element.addEventListener(
      'touchend',
      (event) => {
        if (!tracking) return;
        tracking = false;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        // 横向位移要明显大于纵向，否则视为页面滚动
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        // 横滑后浏览器通常还会补一个 click：不吞掉的话，"滑到下一张"会顺带
        // 打开灯箱（舞台）或者直接把灯箱关掉。定时器是兜底——万一本轮没有
        // 补 click，标志位不会一直挂着把下一次真实点击吞掉。
        this._suppressClick = true;
        setTimeout(() => {
          this._suppressClick = false;
        }, 350);
        onStep(dx < 0 ? 1 : -1);
      },
      { signal, passive: true }
    );
  }
}

if (!customElements.get('product-gallery')) {
  customElements.define('product-gallery', ProductGallery);
}
