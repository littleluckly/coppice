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

  /**
   * 节奏参数兜底值（毫秒）。与 sections/hero-slideshow.liquid 的 {% stylesheet %}
   * 里的同名 CSS 变量一一对应——改一边必须改另一边。
   *
   * ⚠️ 这不是冗余保险：{% stylesheet %} 的产物是外链样式表，若脚本先于样式就绪，
   * getPropertyValue 会返回空串 → parseFloat → NaN → 所有时长归零 → 切换瞬闪。
   * 有兜底后最坏情况是按设计时长跑，不会退化成闪现。
   */
  const DEFAULT_TIMING = {
    '--hero-product-out-dur': 450,
    '--hero-text-start-offset': 220,
    '--hero-text-out-dur': 400,
    '--hero-text-stagger': 90,
    '--hero-bg-out-delay': 100,
    '--hero-bg-out-dur': 550,
    '--hero-next-in-dur': 600,
    '--hero-next-in-advance': 550,
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

    /**
     * 节奏参数每次切换现读（不缓存），保证样式晚到也能读到真值。
     * 读不到时回落 DEFAULT_TIMING。
     *
     * ⚠️⚠️ 必须按单位解析，不能直接 parseFloat —— 这是本项目踩过的真实事故：
     * CSS 压缩器会把 `550ms` 改写成 `.55s`（线上实测读到的就是 ".55s"），
     * 而 parseFloat('.55s') = 0.55，当成毫秒用 → setTimeout(fn, 0.55) ≈ 1ms
     * → 整条时间轴塌到 ~50ms，切换肉眼看就是瞬间完成。
     * 而 CSS 动画本身完全正常（animation-duration 仍是 0.55s），所以
     * DevTools 里一切看起来都对，只有 JS 编排是错的 —— 极难排查的形态。
     */
    #readParams() {
      const css = getComputedStyle(this);

      /** 把 "550ms" / ".55s" / "0.55s" / "550" 统一换算成毫秒；无法解析返回 undefined。 */
      const toMs = (raw) => {
        const match = /^(-?\d*\.?\d+)\s*(ms|s)?$/i.exec(String(raw).trim());
        if (!match) return undefined;
        const value = parseFloat(match[1]);
        if (!Number.isFinite(value)) return undefined;
        // 无单位按毫秒处理（本 section 的设计值全部以 ms 书写）
        return match[2] && match[2].toLowerCase() === 's' ? value * 1000 : value;
      };

      /* 时长读成 0 同样致命：四个时长全为 0 时 bgStart / nextStart 一起塌成 0，
         total 只剩末尾那 50ms。所以时长必须 > 0 才采信。
         偏移量（delay / advance）0 是合法值，只挡无法解析与负值。 */
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
      };
    }

    /**
     * 预载非首屏图片。
     * ⚠️ slide 初始带 hidden，里面的 loading="lazy" 图浏览器不会下载，
     * 切过去就是一片空白（观感上也像「闪一下」）。空闲时把 lazy 翻成 eager 触发加载。
     * 首屏保持 eager + fetchpriority=high 不动，不抢 LCP 带宽。
     */
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
      // slides < 2 时 connectedCallback 提前返回，timers 尚未初始化
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
      const { productOut, textStart, textOut, textStagger, bgDelay, bgOut, nextIn, nextAdvance } = this.#readParams();

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
