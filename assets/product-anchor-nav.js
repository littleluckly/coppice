
class ProductAnchorNav extends HTMLElement {
  connectedCallback() {

    if (this._started) return;
    this._started = true;

    this._links = [];
    this._targets = [];

    this.querySelectorAll('[data-anchor-link]').forEach((link) => {
      const target = document.getElementById(link.getAttribute('data-anchor-link'));
      if (!target) {
        const item = link.closest('li');
        if (item) item.remove();
        return;
      }
      this._links.push(link);
      this._targets.push(target);
    });

    if (this._links.length < 2) return;

    this._activeIndex = -1;
    this._offset = -1;

    this._controller = new AbortController();
    const { signal } = this._controller;

    window.addEventListener('scroll', () => this._queue(), { passive: true, signal });
    window.addEventListener('resize', () => this._queue(), { passive: true, signal });
    window.addEventListener('load', () => this._queue(), { signal });

    if ('ResizeObserver' in window) {
      this._observer = new ResizeObserver(() => this._queue());
      this._observer.observe(document.body);
    }

    this._sync();
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._started = false;
  }

  _queue() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this._sync();
    });
  }

  _sync() {
    const root = document.documentElement;

    const header = document.querySelector('.main-nav-section');
    const offset = header ? Math.round(header.getBoundingClientRect().height) : 0;

    if (offset !== this._offset) {
      this._offset = offset;
      root.style.setProperty('--anchor-nav-offset', `${offset}px`);
    }

    const desktop = typeof window.matchMedia === 'function'
      && window.matchMedia('(min-width: 990px)').matches;
    const scrollable = desktop && root.scrollHeight > window.innerHeight + 1;
    if (scrollable !== this.hasAttribute('data-scrollable')) {
      this.toggleAttribute('data-scrollable', scrollable);
    }

    if (!scrollable) {
      this._setActive(-1);
      return;
    }

    const line = offset + window.innerHeight * 0.35;
    const atBottom = window.innerHeight + window.scrollY >= root.scrollHeight - 2;

    let active = -1;
    for (let i = 0; i < this._targets.length; i += 1) {
      if (this._targets[i].getBoundingClientRect().top <= line) active = i;
    }

    if (atBottom) active = this._targets.length - 1;

    this._setActive(active);
  }

  _setActive(index) {
    if (index === this._activeIndex) return;
    this._activeIndex = index;

    this._links.forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
}

if (!customElements.get('product-anchor-nav')) {
  customElements.define('product-anchor-nav', ProductAnchorNav);
}
