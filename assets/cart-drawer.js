
class CartDrawer extends HTMLElement {

  static PENDING_TIMEOUT_MS = 12000;

  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    if (!this.dialog) return;

    this._panel = this.querySelector('.cart-drawer__panel');
    this._ac = new AbortController();
    const { signal } = this._ac;

    document.querySelectorAll('[data-cart-drawer-open]').forEach((trigger) => {
      trigger.addEventListener('click', this._onOpen, { signal });
    });

    const closeButton = this.querySelector('[data-cart-drawer-close]');
    if (closeButton) closeButton.addEventListener('click', () => this._closeSheet(), { signal });

    this._sheetEl = this.dialog.closest('bottom-sheet');

    this.dialog.addEventListener('click', this._onBackdropClick, { signal });
    this.dialog.addEventListener('pointerdown', this._onDragStart, { signal });
    this.dialog.addEventListener('close', this._onClose, { signal });

    document.addEventListener('cart:added', this._onAdded, { signal });
    document.addEventListener('cart:add-failed', this._onAddFailed, { signal });
    document.addEventListener('cart:updated', this._onCountChange, { signal });
  }

  disconnectedCallback() {
    this._ac.abort();
    window.clearTimeout(this._pendingTimer);
  }

  _onOpen = (event) => {
    event.preventDefault();
    this._lastTrigger = event.currentTarget;
    this._show();
  };

  _onAdded = () => {
    this._showPending();
  };

  _onAddFailed = () => {
    if (!this._isPending()) return;
    this._refresh();
  };

  _show() {
    if (!this.dialog.open) this._openSheet();

    if (this._isPending()) return;
    this._refresh();
  }

  _showPending() {
    this._beginPending();
    if (!this.dialog.open) this._openSheet();
  }

  _isPending() {
    return this.dataset.cartLoading !== undefined;
  }

  _beginPending() {

    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = window.setTimeout(() => {

      this._refresh();
    }, CartDrawer.PENDING_TIMEOUT_MS);

    this.dataset.cartLoading = '';

    if (this._panel) this._panel.setAttribute('aria-busy', 'true');
  }

  _endPending() {
    window.clearTimeout(this._pendingTimer);
    this._pendingTimer = null;
    delete this.dataset.cartLoading;
    if (this._panel) this._panel.removeAttribute('aria-busy');
  }

  get _sheet() {
    const el = this._sheetEl;
    return el && typeof el.open === 'function' ? el : null;
  }

  _openSheet() {
    if (this._sheet) this._sheet.open();
    else if (!this.dialog.open) this.dialog.showModal();

    document.documentElement.dataset.cartDrawerOpen = '';
  }

  _closeSheet(options) {
    if (this._sheet) this._sheet.close(options);
    else if (this.dialog.open) this.dialog.close();
  }

  _onCountChange = (event) => {
    const detail = event.detail || {};
    const count = detail.count;
    const el = this.querySelector('[data-cart-drawer-count]');
    if (el && typeof count === 'number') el.textContent = `(${count})`;

    if (detail.source === 'items') return;
    if (this._isPending() || this.dialog.open) this._refresh();
  };

  _onBackdropClick = (event) => {

    if (this._dragEndedAt && performance.now() < this._dragEndedAt) return;

    if (event.target === this.dialog) this._closeSheet();
  };

  _onDragStart = (event) => {
    if (event.button > 0) return;
    if (!window.matchMedia('(max-width: 989.98px)').matches) return;

    if (this._sheet?.isClosing) return;

    const handle = event.target.closest('.cart-drawer__grabber, .cart-drawer__header');

    if (!handle || event.target.closest('[data-cart-drawer-close]')) return;

    const dialog = this.dialog;
    const startY = event.clientY;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let moved = false;

    const onMove = (moveEvent) => {
      const dy = moveEvent.clientY - startY;
      if (dy <= 0) return;
      moved = moved || dy > 8;

      dialog.style.animation = 'none';
      dialog.style.transition = 'none';
      dialog.style.transform = `translateY(${dy}px)`;
    };

    const onEnd = (endEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);

      const dy = endEvent.clientY - startY;
      const dismissAt = Math.max(120, dialog.offsetHeight * 0.3);

      if (moved && dy > dismissAt) {
        this._dragEndedAt = performance.now() + 350;

        this._closeSheet({ fromDrag: true });
        return;
      }

      if (moved && !reduce) dialog.style.transition = 'transform 0.22s ease-out';
      dialog.style.transform = '';
      window.setTimeout(
        () => {
          dialog.style.transition = '';
        },
        moved && !reduce ? 240 : 0
      );
      if (moved) this._dragEndedAt = performance.now() + 350;
    };

    window.addEventListener('pointermove', onMove, { signal: this._ac.signal });
    window.addEventListener('pointerup', onEnd, { signal: this._ac.signal });
    window.addEventListener('pointercancel', onEnd, { signal: this._ac.signal });
  };

  _onClose = () => {

    delete document.documentElement.dataset.cartDrawerOpen;

    this._endPending();
    if (this._lastTrigger && this._lastTrigger.isConnected) {
      this._lastTrigger.focus({ preventScroll: true });
    }
  };

  async _refresh() {
    const id = this.dataset.sectionId;
    if (!id) return;

    const seq = (this._refreshSeq = (this._refreshSeq || 0) + 1);

    try {
      const response = await fetch(`${window.location.pathname}?sections=${encodeURIComponent(id)}`, {
        cache: 'no-store',
      });

      if (seq !== this._refreshSeq) return;

      const payload = response.ok ? await response.json() : null;
      const html = payload && payload[id];

      if (seq !== this._refreshSeq) return;

      if (html) {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const next = parsed.querySelector(`[data-cart-section="${id}"]`);
        const current = this.querySelector(`[data-cart-section="${id}"]`);
        if (next && current) current.replaceWith(next);
        return;
      }

      const cart = await fetch(`${this.dataset.root || '/'}cart.js`, {
        headers: { Accept: 'application/json' },
      }).then((r) => (r.ok ? r.json() : null));

      if (cart && typeof cart.item_count === 'number') {
        const shown = Number((this.querySelector('[data-cart-drawer-count]')?.textContent || '').replace(/\D/g, ''));
        if (shown !== cart.item_count && this.dataset.cartUrl) {
          window.location.href = this.dataset.cartUrl;
        }
      }
    } catch {

    } finally {

      if (seq === this._refreshSeq) this._endPending();
    }
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define('cart-drawer', CartDrawer);
}
