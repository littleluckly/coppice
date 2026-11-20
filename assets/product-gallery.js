
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

    this._imageSlides = this._slides.filter((slide) => slide.dataset.mediaType === 'image');
    this._lightbox = this.querySelector('[data-gallery-lightbox]');
    this._lightboxIndex = 0;
    this._suppressClick = false;

    this._controller = new AbortController();
    const { signal } = this._controller;

    const prev = this.querySelector('[data-gallery-prev]');
    const next = this.querySelector('[data-gallery-next]');
    if (prev) prev.addEventListener('click', () => this._step(-1), { signal });
    if (next) next.addEventListener('click', () => this._step(1), { signal });

    this._thumbs.forEach((thumb, i) =>
      thumb.addEventListener('click', () => this.show(i, true), { signal })
    );
    this._dots.forEach((dot, i) =>
      dot.addEventListener('click', () => this.show(i, true), { signal })
    );

    this.querySelectorAll('[data-gallery-zoom]').forEach((button) =>
      button.addEventListener('click', () => this._openLightbox(button), { signal })
    );

    this.querySelectorAll('[data-deferred-media]').forEach((holder) => {
      const trigger = holder.querySelector('[data-deferred-trigger]');
      if (!trigger) return;
      trigger.addEventListener(
        'click',
        () => {
          this._activateDeferred(holder);
          this._playMedia(holder);
        },
        { signal }
      );
    });

    if (this._lightbox) this._bindLightbox(signal);

    document.addEventListener('variant:change', this._onVariantChange, { signal });

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
    this.show(nextIndex, true);
  }

  show(index, play = false) {
    if (index < 0 || index >= this._slides.length) return;
    this._index = index;

    this._slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle('is-active', active);
      if (active) {
        slide.removeAttribute('hidden');
        const holder = slide.querySelector('[data-deferred-media]');
        this._activateDeferred(holder);
        if (play) this._playMedia(holder);
      } else {
        slide.setAttribute('hidden', '');
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

  _activateDeferred(holder) {
    if (!holder || holder.dataset.loaded === 'true') return;
    const template = holder.querySelector('template');
    if (!template) return;

    holder.dataset.loaded = 'true';
    template.replaceWith(template.content.cloneNode(true));
    const trigger = holder.querySelector('[data-deferred-trigger]');
    if (trigger) trigger.remove();
  }

  _playMedia(holder) {
    if (!holder) return;
    const video = holder.querySelector('video');
    if (!video) return;

    const started = video.play();
    if (started && typeof started.catch === 'function') {
      started.catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }
  }

  _openLightbox(button) {
    if (this._suppressClick) {
      this._suppressClick = false;
      return;
    }
    if (!this._lightbox || typeof this._lightbox.showModal !== 'function') return;
    if (this._lightbox.open) return;

    const slide = button.closest('.product-gallery__slide');
    const index = this._imageSlides.indexOf(slide);
    if (index < 0) return;

    this._lightboxIndex = index;
    this._lightbox.showModal();
    this._renderLightbox();
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
      const template = dialog.dataset.counterTemplate || '[index] / [total]';
      counter.textContent = template
        .replace('[index]', String(this._lightboxIndex + 1))
        .replace('[total]', String(total));
    }

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
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
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
