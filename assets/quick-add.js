
class QuickAdd extends HTMLElement {
  static REVERT_DELAY_MS = 2500;

  _controller = new AbortController();
  _revertTimer = null;

  connectedCallback() {
    this._form = this.querySelector('form');
    this._button = this.querySelector('button');
    this._status = this.querySelector('[data-quick-add-status]');
    this._defaultLabel = this._button ? this._button.textContent : '';
    if (!this._form || !this._button) return;
    this._form.addEventListener('submit', this._onSubmit, { signal: this._controller.signal });
  }

  disconnectedCallback() {
    this._controller.abort();
    if (this._revertTimer) clearTimeout(this._revertTimer);
  }

  _onSubmit = async (event) => {
    event.preventDefault();
    if (this._button.disabled) return;

    this._button.disabled = true;
    this._button.dataset.state = 'pending';

    this.dispatchEvent(
      new CustomEvent('cart:added', { bubbles: true, detail: { button: this._button } })
    );

    try {
      const response = await fetch(this._form.action, {
        method: 'POST',
        body: new FormData(this._form),
        headers: { Accept: 'application/javascript' },
        signal: this._controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this._button.dataset.state = 'added';
      this._button.textContent = this._button.dataset.addedLabel || this._defaultLabel;
      this._announce(this._button.dataset.addedMessage || '');
      this._revertTimer = setTimeout(() => this._reset(), QuickAdd.REVERT_DELAY_MS);

      this._syncCartCount();
    } catch (error) {
      if (error.name === 'AbortError') return;

      document.dispatchEvent(new CustomEvent('cart:add-failed', { detail: { button: this._button } }));
      this._button.dataset.state = '';
      this._announce(this._button.dataset.errorMessage || '');
      this._reset();
    }
  };

  _reset() {
    this._button.disabled = false;
    delete this._button.dataset.state;
    this._button.textContent = this._defaultLabel;
  }

  _announce(message) {
    if (this._status && message) this._status.textContent = message;
  }

  async _syncCartCount() {
    try {
      const response = await fetch('/cart.js', {
        headers: { Accept: 'application/json' },
        signal: this._controller.signal,
      });
      if (!response.ok) return;
      const cart = await response.json();
      if (typeof cart.item_count !== 'number') return;
      document.dispatchEvent(
        new CustomEvent('cart:updated', { detail: { count: cart.item_count } })
      );
    } catch (error) {
      if (error.name !== 'AbortError') return;
    }
  }
}

if (!customElements.get('quick-add')) {
  customElements.define('quick-add', QuickAdd);
}
