/**
 * tooltip — 通用轻提示（<ui-tooltip>，2026-11-15 刘工）
 *
 * 对标 antd Tooltip 的**可用子集**，只搬这个主题真会用到的那部分：
 *   · label      文案（纯文本一段）
 *   · placement  top(默认) / bottom / start / end
 *   · show-delay 悬停后多久出现，默认 120ms
 *   · hide-delay 指针离开后多久收起，默认 80ms
 *   · disabled   置上即静默（比从 Liquid 里删 DOM 更安全，不破坏宿主布局）
 *   · autoAdjustOverflow 恒开：贴视口左右边缘时横向平移，**不翻转**——
 *     页头上下都有空间，翻转只会让气泡跳到行内盖住 logo。
 *
 * 用法（宿主只做锚点，不接管子元素布局）：
 *   <ui-tooltip label="Pick products to compare" placement="bottom">
 *     <a href="…">…</a>
 *   </ui-tooltip>
 *
 * 触发元素 = 宿主内第一个 `[data-tooltip-trigger]`，没有则取第一个可聚焦元素
 * （a / button / input / select / textarea / [tabindex]）。文案由外部改 `label`
 * 属性即可：attributeChangedCallback 会在**元素升级前**就被调用，所以不依赖
 * 脚本加载先后——compare.js 可以直接写属性而不用等本组件升级完。
 *
 * 三条纪律：
 *   1. **不响应触摸**。触摸没有 hover，「点一下先弹提示」会和触发元素自己的
 *      点击（本例是跳转对比页）打架；触摸设备上本组件等于不存在。
 *   2. **键盘等价**。focus-visible 聚焦立刻显示（不吃 show-delay）、Esc 关闭、
 *      焦点移出宿主即收起；气泡通过 aria-describedby 挂在触发元素上，
 *      屏读用户听到的是「名字 + 描述」，不是一串悬空文字。
 *   3. **无 JS 时不存在**。气泡由脚本创建，label 只是 HTML 属性，不会裸露成正文。
 */

(() => {
  'use strict';

  /* 气泡 id 自增：同一页可能有多个实例，id 撞了 aria-describedby 会指错 */
  let seq = 0;

  /**
   * `:focus-visible` 在 Chrome 86 / Safari 15.4 / FF 85 之前是未知伪类，
   * `matches()` 会抛 SyntaxError —— 那时退回「是 focus 就算键盘」，宁可多显示
   * 也不要让键盘用户失去提示（WCAG 2.2.1 的等价性要求）。
   */
  function isKeyboardFocus(el) {
    try {
      return el.matches(':focus-visible');
    } catch {
      return true;
    }
  }

  class UiTooltip extends HTMLElement {
    static get observedAttributes() {
      return ['label', 'placement'];
    }

    /* ⚠️ upgrade 时属性回调先于 connectedCallback 触发，两个方法都必须容忍
       `this.bubble` 还不存在（否则主题编辑器里一挂载就抛 TypeError）。 */
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name === 'label') {
        this.setText(newValue);
        return;
      }
      if (name === 'placement' && this.bubble) {
        this.bubble.dataset.placement = this.placement;
      }
    }

    get placement() {
      const value = this.getAttribute('placement');
      return value === 'bottom' || value === 'start' || value === 'end' ? value : 'top';
    }

    connectedCallback() {
      /* Section Rendering / 编辑器重挂载会再进一次：重复绑定会让一次悬停开两个计时器 */
      if (this.controller) return;

      this.trigger =
        this.querySelector('[data-tooltip-trigger]') ||
        this.querySelector('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      /* 没有触发元素就没有锚点，整块静默退出（不抛错、不留空壳） */
      if (!this.trigger) return;

      this.controller = new AbortController();
      const { signal } = this.controller;

      this.showTimer = 0;
      this.hideTimer = 0;
      this.open = false;
      this.bubble = this.build();

      /* hover 能力实时跟随：可拆键盘的平板接上鼠标后不必刷新页面 */
      const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)');
      this.canHover = hoverable.matches;
      hoverable.addEventListener(
        'change',
        (event) => {
          this.canHover = event.matches;
          if (!this.canHover) this.hideNow();
        },
        { signal },
      );

      if (this.canHover) {
        /* 触屏笔记本（主指针 fine、但有触摸屏）在触摸时同样发 pointerenter：
           那种「手指按下去」不是悬停，按不了提示的意图，直接跳过。 */
        this.trigger.addEventListener(
          'pointerenter',
          (event) => {
            if (event.pointerType === 'touch') return;
            this.schedule(true);
          },
          { signal },
        );
        this.trigger.addEventListener('pointerleave', () => this.schedule(false), { signal });
      }

      this.addEventListener(
        'focusin',
        (event) => {
          if (isKeyboardFocus(event.target)) this.showNow();
        },
        { signal },
      );
      this.addEventListener(
        'focusout',
        (event) => {
          /* 焦点还在宿主内（鼠标点上来又移去别处）就不收起 */
          if (event.relatedTarget && this.contains(event.relatedTarget)) return;
          this.schedule(false, 0);
        },
        { signal },
      );
      this.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Escape' && this.open) {
            /* 只收气泡、不阻断冒泡：外层若有 <dialog>，它的 Esc 仍要照常关闭 */
            this.hideNow();
          }
        },
        { signal },
      );

      /* 滚动 = 用户在移动视线，气泡留着只会跟丢；直接收比逐帧重算便宜 */
      window.addEventListener('scroll', () => this.open && this.hideNow(), { passive: true, signal });
      window.addEventListener('resize', () => this.open && this.adjust(), { passive: true, signal });
    }

    disconnectedCallback() {
      this.clearTimers();
      if (this.controller) {
        this.controller.abort();
        this.controller = null;
      }
      this.open = false;
    }

    /**
     * 建气泡。**不做惰性实例化**：气泡必须先在 DOM 里，`aria-describedby` 才有
     * 指向；而且它只有 div + span 两个节点，省下的这点构建成本换不来任何东西。
     * 视觉显隐由 CSS 的 [data-open] 控制，这里不写样式（状态靠 attribute）。
     */
    build() {
      const existing = this.querySelector(':scope > .tooltip');
      if (existing) return existing;

      const bubble = document.createElement('div');
      bubble.className = 'tooltip';
      bubble.id = `tooltip-${(seq += 1)}`;
      bubble.setAttribute('role', 'tooltip');
      bubble.dataset.placement = this.placement;

      const text = document.createElement('span');
      text.className = 'tooltip__text';
      bubble.appendChild(text);
      this.appendChild(bubble);

      /* 气泡是「描述」不是「名字」→ aria-describedby（不是 labelledby）。
         触发元素自带 aria-label 时两者会连着朗读，所以文案要写增量信息
         （怎么用 / 点进去是什么），不要复述它自己的名字。 */
      const described = (this.trigger.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(Boolean);
      if (!described.includes(bubble.id)) described.push(bubble.id);
      this.trigger.setAttribute('aria-describedby', described.join(' '));

      this.setText(this.getAttribute('label'));
      return bubble;
    }

    /** 文案为空 = 没东西可提示：既不留空气泡，也别让它占着 aria-describedby */
    setText(value) {
      const text = (value || '').trim();
      this.toggleAttribute('data-blank', text === '');
      if (!this.bubble) return;
      this.bubble.querySelector('.tooltip__text').textContent = text;
      if (!text) this.hideNow();
    }

    /** 属性里的毫秒数，非法或缺省一律回落默认值 */
    delayOf(attr, fallback) {
      const raw = Number.parseFloat(this.getAttribute(attr));
      return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
    }

    clearTimers() {
      clearTimeout(this.showTimer);
      clearTimeout(this.hideTimer);
      this.showTimer = 0;
      this.hideTimer = 0;
    }

    schedule(show, overrideDelay) {
      this.clearTimers();
      if (show && (this.hasAttribute('disabled') || this.hasAttribute('data-blank'))) return;
      const delay =
        overrideDelay !== undefined
          ? overrideDelay
          : show
            ? this.delayOf('show-delay', 120)
            : this.delayOf('hide-delay', 80);
      const run = show ? () => this.showNow() : () => this.hideNow();
      if (delay === 0) {
        run();
        return;
      }
      if (show) this.showTimer = setTimeout(run, delay);
      else this.hideTimer = setTimeout(run, delay);
    }

    showNow() {
      if (this.hasAttribute('disabled') || this.hasAttribute('data-blank')) return;
      this.clearTimers();
      if (this.open) return;
      this.open = true;
      this.bubble.toggleAttribute('data-open', true);
      /* 先开再量：visibility: hidden 的元素量不到布局盒，必须已经可见 */
      this.adjust();
    }

    hideNow() {
      this.clearTimers();
      if (!this.open) return;
      this.open = false;
      this.bubble.removeAttribute('data-open');
      this.bubble.style.removeProperty('--tooltip-shift');
    }

    /**
     * 贴边修正：气泡默认水平居中于锚点，页头工具区靠右时右侧会出界。
     * 先清掉上一次的偏移再量——量偏移过的盒子算出来是错的，两次会叠着跑。
     *
     * 只对 top / bottom 生效：start / end 的气泡在锚点侧边、被垂直居中，
     * 水平方向本来就贴着内容走，把水平偏移量套上去只会把它推离锚点。
     */
    adjust() {
      this.bubble.style.removeProperty('--tooltip-shift');
      if (this.placement === 'start' || this.placement === 'end') return;

      const rect = this.bubble.getBoundingClientRect();
      if (!rect.width) return;

      const viewport = document.documentElement.clientWidth;
      const gap = 8; /* 与页面最小边距同量级，贴边不留缝也不会切掉圆角 */
      let shift = 0;
      if (rect.left < gap) shift = gap - rect.left;
      else if (rect.right > viewport - gap) shift = viewport - gap - rect.right;
      if (shift) this.bubble.style.setProperty('--tooltip-shift', `${Math.round(shift)}px`);
    }
  }

  if (!customElements.get('ui-tooltip')) {
    customElements.define('ui-tooltip', UiTooltip);
  }
})();
