

(() => {
  'use strict';

  let seq = 0;

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

      if (this.controller) return;

      this.trigger =
        this.querySelector('[data-tooltip-trigger]') ||
        this.querySelector('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');

      if (!this.trigger) return;

      this.controller = new AbortController();
      const { signal } = this.controller;

      this.showTimer = 0;
      this.hideTimer = 0;
      this.open = false;
      this.bubble = this.build();

      this.trigger.addEventListener(
        'pointerenter',
        (event) => {
          if (event.pointerType === 'touch') return;
          this.schedule(true);
        },
        { signal },
      );
      this.trigger.addEventListener('pointerleave', () => this.schedule(false), { signal });

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

          if (event.relatedTarget && this.contains(event.relatedTarget)) return;
          this.schedule(false, 0);
        },
        { signal },
      );
      this.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Escape' && this.open) {

            this.hideNow();
          }
        },
        { signal },
      );

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
      if (this.bubble) {
        this.bubble.removeAttribute('data-open');
        this.bubble.style.removeProperty('--tooltip-shift');
        this.bubble.style.removeProperty('--tooltip-arrow');
      }
    }

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

      const initial = (this.getAttribute('label') || '').trim();
      text.textContent = initial;
      this.toggleAttribute('data-blank', initial === '');

      const described = (this.trigger.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(Boolean);
      if (!described.includes(bubble.id)) described.push(bubble.id);
      this.trigger.setAttribute('aria-describedby', described.join(' '));

      return bubble;
    }

    setText(value) {
      const text = (value || '').trim();
      this.toggleAttribute('data-blank', text === '');
      if (!this.bubble) return;
      this.bubble.querySelector('.tooltip__text').textContent = text;
      if (!text) this.hideNow();
    }

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

      this.adjust();
      this.open = true;
      this.bubble.toggleAttribute('data-open', true);
    }

    hideNow() {
      this.clearTimers();
      if (!this.open) return;
      this.open = false;
      this.bubble.removeAttribute('data-open');
      this.bubble.style.removeProperty('--tooltip-shift');
      this.bubble.style.removeProperty('--tooltip-arrow');
    }

    adjust() {
      if (this.placement === 'start' || this.placement === 'end') return;

      const bubble = this.bubble;
      const prevTranslate = bubble.style.translate;
      const prevTransition = bubble.style.transition;
      bubble.style.transition = 'none';
      bubble.style.translate = 'none';
      bubble.style.removeProperty('--tooltip-shift');
      bubble.style.removeProperty('--tooltip-arrow');

      const rect = bubble.getBoundingClientRect();

      const viewport = document.documentElement.clientWidth;
      const gap = 8;
      let shift = 0;
      if (rect.width) {
        if (rect.left < gap) shift = gap - rect.left;
        else if (rect.right > viewport - gap) shift = viewport - gap - rect.right;
      }

      if (shift) {
        const rounded = Math.round(shift);
        const limit = Math.max(0, rect.width / 2 - 12);
        const arrow = Math.max(-limit, Math.min(limit, -rounded));
        bubble.style.setProperty('--tooltip-shift', `${rounded}px`);
        bubble.style.setProperty('--tooltip-arrow', `${Math.round(arrow)}px`);
      }
      bubble.style.translate = prevTranslate;
      bubble.style.transition = prevTransition;
    }
  }

  if (!customElements.get('ui-tooltip')) {
    customElements.define('ui-tooltip', UiTooltip);
  }
})();
