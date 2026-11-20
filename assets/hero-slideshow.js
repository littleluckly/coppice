
(() => {
  'use strict';

  const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

  const DEFAULT_TIMING = {
    '--hero-product-out-dur': 450,
    '--hero-text-start-offset': 220,
    '--hero-text-out-dur': 400,
    '--hero-text-stagger': 90,
    '--hero-bg-out-delay': 300,
    '--hero-bg-out-dur': 600,
    '--hero-next-in-dur': 600,
    '--hero-next-in-advance': 600,
    '--hero-enter-offset': 300,
  };

  class HeroSlideshow extends HTMLElement {
    #touchStart = null;

    connectedCallback() {
      this.slides = Array.from(this.querySelectorAll('[data-hero-slide]'));
      this.dots = Array.from(this.querySelectorAll('[data-hero-dot]'));
      this.status = this.querySelector('[data-hero-status]');
      this.prevButton = this.querySelector('[data-hero-prev]');
      this.nextButton = this.querySelector('[data-hero-next]');

      if (this.slides.length < 2 || this.dataset.heroReady) return;
      this.dataset.heroReady = 'true';

      this.current = 0;
      this.locked = false;
      this.timers = [];
      this.reduced = window.matchMedia(REDUCED_MOTION);

      this.controller = new AbortController();
      const { signal } = this.controller;

      this.addEventListener('click', (event) => this.#onActionClick(event), { signal });
      this.addEventListener('keydown', (event) => this.#onKeydown(event), { signal });
      this.addEventListener('touchstart', this.#onTouchStart.bind(this), { passive: true, signal });
      this.addEventListener('touchend', this.#onTouchEnd.bind(this), { passive: true, signal });

      this.#preloadSlides();
    }

    #readParams() {
      const css = getComputedStyle(this);

      const toMs = (raw) => {
        const match = /^(-?\d*\.?\d+)\s*(ms|s)?$/i.exec(String(raw).trim());
        if (!match) return undefined;
        const value = parseFloat(match[1]);
        if (!Number.isFinite(value)) return undefined;
        return match[2] && match[2].toLowerCase() === 's' ? value * 1000 : value;
      };

      const dur = (name) => {
        const value = toMs(css.getPropertyValue(name));
        return value !== undefined && value > 0 ? value : DEFAULT_TIMING[name];
      };
      const gap = (name) => {
        const value = toMs(css.getPropertyValue(name));
        return value !== undefined && value >= 0 ? value : DEFAULT_TIMING[name];
      };

      return {
        productOut: dur('--hero-product-out-dur'),
        textStart: gap('--hero-text-start-offset'),
        textOut: dur('--hero-text-out-dur'),
        textStagger: gap('--hero-text-stagger'),
        bgDelay: gap('--hero-bg-out-delay'),
        bgOut: dur('--hero-bg-out-dur'),
        nextIn: dur('--hero-next-in-dur'),
        nextAdvance: gap('--hero-next-in-advance'),
        enterOffset: gap('--hero-enter-offset'),
      };
    }

    #preloadSlides() {
      const images = this.querySelectorAll('img[loading="lazy"]');
      if (!images.length) return;
      const start = () => images.forEach((img) => {
        img.loading = 'eager';
      });
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(start, { timeout: 2500 });
      } else {
        setTimeout(start, 1500);
      }
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.timers?.forEach(clearTimeout);
      this.timers = [];
      this.locked = false;
    }

    #onActionClick(event) {
      const target = event.target.closest('[data-hero-prev], [data-hero-dot], [data-hero-next]');
      if (!target) return;
      if (target.hasAttribute('data-hero-prev')) {
        this.goTo(this.current - 1);
      } else if (target.hasAttribute('data-hero-next')) {
        this.goTo(this.current + 1);
      } else {
        this.goTo(Number(target.dataset.heroDot));
      }
    }

    #onKeydown(event) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.goTo(this.current + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.goTo(this.current - 1);
      }
    }

    #onTouchStart(event) {
      const touch = event.changedTouches[0];
      this.#touchStart = { x: touch.clientX, y: touch.clientY };
    }

    #onTouchEnd(event) {
      const start = this.#touchStart;
      this.#touchStart = null;
      if (!start) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        this.goTo(this.current + (dx < 0 ? 1 : -1));
      }
    }

    goTo(nextIndex) {
      if (this.locked) return;

      const count = this.slides.length;
      const target = ((nextIndex % count) + count) % count;
      if (target === this.current) return;

      const motionScale = this.reduced.matches ? 0 : 1;
      const { productOut, textStart, textOut, textStagger, bgDelay, bgOut, nextIn, nextAdvance, enterOffset } =
        this.#readParams();

      const forward = nextIndex > this.current;
      const horizontal = window.matchMedia('(max-width: 989px)').matches;

      const currentSlide = this.slides[this.current];
      const nextSlide = this.slides[target];
      const product = currentSlide.querySelector('.hero-slideshow__product');
      const lines = currentSlide.querySelectorAll('.hero-slideshow__line');
      const bg = currentSlide.querySelector('.hero-slideshow__bg');
      const nextLines = nextSlide.querySelectorAll('.hero-slideshow__line');
      const nextProduct = nextSlide.querySelector('.hero-slideshow__product');

      this.locked = true;
      this.#setControlsDisabled(true);

      nextSlide.hidden = false;
      nextSlide.style.transform = horizontal
        ? `translateX(${forward ? 100 : -100}%)`
        : 'translateY(100%)';
      nextSlide.style.zIndex = '1';
      currentSlide.style.zIndex = '2';

      if (horizontal) {
        this.dataset.heroDir = forward ? 'next' : 'prev';
      } else {
        delete this.dataset.heroDir;
      }

      const lastLineEnd = textStart + textOut + Math.max(0, lines.length - 1) * textStagger;
      const bgStart = bgDelay;
      const nextStart = Math.max(0, bgStart + bgOut - nextAdvance);

      const enterStart = nextStart + enterOffset;
      const enterEnd = Math.max(
        enterStart + textOut + Math.max(0, nextLines.length - 1) * textStagger,
        enterStart + (nextProduct ? productOut : 0)
      );

      const total = Math.max(nextStart + nextIn, lastLineEnd, productOut, enterEnd) + 50;

      const at = (ms, fn) => {
        if (ms <= 0) {
          fn();
        } else {
          this.timers.push(setTimeout(fn, ms * motionScale));
        }
      };

      at(0, () => product?.classList.add('is-out'));
      at(textStart, () => lines.forEach((line) => line.classList.add('is-out')));
      at(bgStart, () => bg?.classList.add('is-out'));
      at(nextStart, () => {
        nextSlide.classList.add('is-next-in');
        nextLines.forEach((line) => line.classList.add('is-in'));
        nextProduct?.classList.add('is-in');
      });

      at(total, () => {
        currentSlide.hidden = true;
        currentSlide.style.zIndex = '';
        product?.classList.remove('is-out');
        lines.forEach((line) => line.classList.remove('is-out'));
        bg?.classList.remove('is-out');
        nextSlide.classList.remove('is-next-in');
        nextLines.forEach((line) => line.classList.remove('is-in'));
        nextProduct?.classList.remove('is-in');
        nextSlide.style.transform = '';
        nextSlide.style.zIndex = '';
        delete this.dataset.heroDir;

        this.current = target;
        this.#sync();
        this.timers.length = 0; // 编排结束，计时器句柄不再需要
        this.locked = false;
        this.#setControlsDisabled(false);
      });
    }

    #sync() {
      this.dots.forEach((dot, i) => {
        const active = i === this.current;
        dot.classList.toggle('is-active', active);
        dot.tabIndex = active ? 0 : -1;
        if (active) {
          dot.setAttribute('aria-current', 'true');
        } else {
          dot.removeAttribute('aria-current');
        }
      });
      if (this.status && this.dataset.statusTemplate) {
        this.status.textContent = this.dataset.statusTemplate.replace('#', String(this.current + 1));
      }
    }

    #setControlsDisabled(disabled) {
      [this.prevButton, this.nextButton].forEach((button) => {
        if (button) button.disabled = disabled;
      });
    }
  }

  customElements.define('hero-slideshow', HeroSlideshow);
})();
