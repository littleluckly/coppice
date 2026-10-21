/**
 * hero-slideshow — 「电影式」纵向切换编排（Custom Element）。
 *
 * 时序（节奏参数从 CSS 变量读取，与参考稿 1:1；CSS 变量即唯一调参口）：
 *   t=0              当前屏产品岛上滑淡出
 *   t=textStart(220) 当前屏文字逐行上滑（行间隔由 CSS --line-index × stagger）
 *   t=bgStart        最后一行文字结束后背景上滑（不淡透，opacity 止于 0.6）
 *   t=nextStart      背景结束前 260ms 下一屏从底部顶入（两屏重叠，无缝无黑屏）
 *
 * JS 的 setTimeout 时刻 = 动画实际开始时刻；CSS 动画自身不再带启动 delay
 * （只有文字行间隔在 CSS 里算 stagger），避免参考稿的双重延迟。
 *
 * 约定（AGENTS.md §6）：Custom Element 自包含，AbortController 一次拆绑，
 * Section Rendering 重注入时 connectedCallback 自动重新接管，无需事件监听。
 * prefers-reduced-motion 下所有编排时刻归零 = 瞬切。
 */
(() => {
  'use strict';

  const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

  class HeroSlideshow extends HTMLElement {
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

      // 节奏参数（毫秒数）与 reduced-motion 缩放：reduce 时全部时刻 ×0 = 瞬切
      const css = getComputedStyle(this);
      const num = (name) => parseFloat(css.getPropertyValue(name)) || 0;
      this.reduced = window.matchMedia(REDUCED_MOTION);
      this.params = {
        productOut: num('--hero-product-out-dur'),
        textStart: num('--hero-text-start-offset'),
        textOut: num('--hero-text-out-dur'),
        textStagger: num('--hero-text-stagger'),
        bgDelay: num('--hero-bg-out-delay'),
        bgOut: num('--hero-bg-out-dur'),
        nextIn: num('--hero-next-in-dur'),
        nextAdvance: num('--hero-next-in-advance'),
      };

      this.controller = new AbortController();
      const { signal } = this.controller;

      this.addEventListener('click', (event) => this.#onActionClick(event), { signal });
      this.addEventListener('keydown', (event) => this.#onKeydown(event), { signal });
      this.addEventListener('touchstart', this.#onTouchStart.bind(this), { passive: true, signal });
      this.addEventListener('touchend', this.#onTouchEnd.bind(this), { passive: true, signal });
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.timers.forEach(clearTimeout);
      this.timers = [];
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

    /**
     * 编排一次切换。nextIndex 任意整数（含越界，模回绕）。
     * reduced-motion 下 motionScale = 0，所有编排时刻归零 → 瞬切。
     */
    goTo(nextIndex) {
      if (this.locked) return;

      const count = this.slides.length;
      const target = ((nextIndex % count) + count) % count;
      if (target === this.current) return;

      const motionScale = this.reduced.matches ? 0 : 1;
      const { productOut, textStart, textOut, textStagger, bgDelay, bgOut, nextIn, nextAdvance } = this.params;

      const currentSlide = this.slides[this.current];
      const nextSlide = this.slides[target];
      const product = currentSlide.querySelector('.hero-slideshow__product');
      const lines = currentSlide.querySelectorAll('.hero-slideshow__line');
      const media = currentSlide.querySelector('.hero-slideshow__media');

      this.locked = true;
      this.#setControlsDisabled(true);

      // 下一屏预置到屏幕下方并显示（仍在当前屏之下，被其盖住不露面）
      nextSlide.hidden = false;
      nextSlide.style.transform = 'translateY(100%)';
      nextSlide.style.zIndex = '1';
      currentSlide.style.zIndex = '2';

      // 时间轴：文字最后一行结束 → (+delay) 背景启动；背景结束前 advance → 下一屏顶入
      const lastLineEnd = textStart + textOut + Math.max(0, lines.length - 1) * textStagger;
      const bgStart = Math.max(productOut, lastLineEnd) + bgDelay;
      const nextStart = Math.max(0, bgStart + bgOut - nextAdvance);
      const total = nextStart + nextIn + 50;

      const at = (ms, fn) => {
        if (ms <= 0) {
          fn();
        } else {
          this.timers.push(setTimeout(fn, ms * motionScale));
        }
      };

      at(0, () => product?.classList.add('is-out'));
      at(textStart, () => lines.forEach((line) => line.classList.add('is-out')));
      at(bgStart, () => media?.classList.add('is-out'));
      at(nextStart, () => nextSlide.classList.add('is-next-in'));

      at(total, () => {
        // 收尾：隐藏旧屏、清全部动画态（下一屏动画 forwards 已停在 0 位，移除类无跳动）
        currentSlide.hidden = true;
        currentSlide.style.zIndex = '';
        product?.classList.remove('is-out');
        lines.forEach((line) => line.classList.remove('is-out'));
        media?.classList.remove('is-out');
        nextSlide.classList.remove('is-next-in');
        nextSlide.style.transform = '';
        nextSlide.style.zIndex = '';

        this.current = target;
        this.#sync();
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
