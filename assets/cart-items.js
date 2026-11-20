
class CartItems extends HTMLElement {
  static DEBOUNCE_MS = 400;

  _controller = new AbortController();
  _inflight = new Map();
  _timer = null;

  connectedCallback() {

    if (!this.dataset.cartChangeUrl) return;

    const { signal } = this._controller;
    this.addEventListener('click', this._onClick, { signal });
    this.addEventListener('input', this._onInput, { signal });
    this.addEventListener('focusout', this._onNoteBlur, { signal });
  }

  disconnectedCallback() {
    this._controller.abort();
    clearTimeout(this._timer);
    clearTimeout(this._shakeTimer);
    this._inflight.forEach((controller) => controller.abort());
    this._inflight.clear();
  }

  _onClick = (event) => {
    const remove = event.target.closest('[data-cart-remove]');
    if (remove) {

      event.preventDefault();
      const input = remove.closest('.cart-line')?.querySelector('[data-cart-qty-input]');
      this._change(remove.dataset.lineKey, 0, remove, input ? input.value : null);
      return;
    }

    const step = event.target.closest('[data-cart-qty]');
    if (!step) return;

    const input = step.closest('.cart-line__qty')?.querySelector('[data-cart-qty-input]');
    if (!input) return;

    const previous = parseInt(input.value, 10) || 0;
    const next = Math.max(0, previous + parseInt(step.dataset.cartQty, 10));
    if (next === previous) return;

    input.value = next;
    this._change(input.dataset.lineKey, next, step, previous);
  };

  _onInput = (event) => {
    const input = event.target.closest('[data-cart-qty-input]');
    if (!input) return;
    this._schedule(input);
  };

  _schedule(input) {
    clearTimeout(this._timer);
    const previous = input.dataset.committed ?? input.defaultValue;
    this._timer = setTimeout(() => {
      const next = Math.max(0, parseInt(input.value, 10) || 0);
      if (String(next) === String(previous)) return;
      this._change(input.dataset.lineKey, next, input, Number(previous));
    }, CartItems.DEBOUNCE_MS);
  }

  async _change(lineKey, quantity, source, previousQuantity) {
    const changeUrl = this.dataset.cartChangeUrl;
    if (!changeUrl || !lineKey) return;

    this._inflight.get(lineKey)?.abort();
    const controller = new AbortController();
    this._inflight.set(lineKey, controller);

    const focus = this._captureFocus(source);
    this._clearLineError(source);
    this.setAttribute('aria-busy', 'true');

    try {
      const ids = this._sectionIds();
      const url = ids.length ? `${changeUrl}?sections=${encodeURIComponent(ids.join(','))}` : changeUrl;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: lineKey, quantity }),
        signal: controller.signal,
      });

      const cart = await response.json();
      if (!response.ok || cart.status) {
        throw new Error((cart && cart.description) || `cart change failed: ${response.status}`);
      }

      if (cart.item_count === 0) {
        window.location.reload();
        return;
      }

      if (cart.sections) {
        this._render(cart.sections);
      } else {
        window.location.reload();
        return;
      }

      this._restoreFocus(focus);
      this._announceTotal();
      this._announceCount(cart.item_count);
    } catch (error) {
      if (error.name === 'AbortError') return;

      if (previousQuantity !== null && previousQuantity !== undefined && source) {
        const input = source.matches('[data-cart-qty-input]')
          ? source
          : source.closest('.cart-line')?.querySelector('[data-cart-qty-input]');
        if (input) input.value = previousQuantity;
      }

      const reason = error.message || '';
      const message = reason.startsWith('cart change failed') ? this.dataset.errorMessage : reason;

      this._showLineError(source, message);
      this._announceMessage(message);
    } finally {
      if (this._inflight.get(lineKey) === controller) this._inflight.delete(lineKey);
      this.removeAttribute('aria-busy');
    }
  }

  _onNoteBlur = (event) => {
    const note = event.target.closest('[data-cart-note]');
    if (!note) return;
    if (note.value === note.defaultValue) return;
    this._saveNote(note);
  };

  async _saveNote(note) {
    const url = this.dataset.cartUpdateUrl;
    if (!url) return;

    const updates = {};
    this.querySelectorAll('[data-cart-qty-input]').forEach((input) => {
      const quantity = parseInt(input.value, 10);
      if (!Number.isNaN(quantity)) updates[input.dataset.lineKey] = quantity;
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ note: note.value, updates }),
      });
      if (!response.ok) throw new Error(String(response.status));
      note.defaultValue = note.value;
    } catch (error) {
      if (error.name === 'AbortError') return;
      this._announceMessage(this.dataset.errorMessage);
    }
  }

  _showLineError(source, message) {
    const line = source && source.closest ? source.closest('.cart-line') : null;
    if (!line) return;

    line.dataset.cartError = '';
    line.dataset.cartShake = '';

    let note = line.querySelector('[data-cart-line-error]');
    if (!note) {
      note = document.createElement('p');
      note.className = 'cart-line__error';
      note.setAttribute('role', 'alert');
      note.dataset.cartLineError = '';

      const container = line.querySelector('.cart-line__info') || line;
      container.appendChild(note);
    }
    note.textContent = message || '';

    window.clearTimeout(this._shakeTimer);
    this._shakeTimer = window.setTimeout(() => {

      line.removeAttribute('data-cart-shake');
    }, 1000);
  }

  _clearLineError(source) {
    const line = source && source.closest ? source.closest('.cart-line') : null;
    if (!line) return;
    window.clearTimeout(this._shakeTimer);
    delete line.dataset.cartError;
    delete line.dataset.cartShake;
    const note = line.querySelector('[data-cart-line-error]');
    if (note) note.remove();
  }

  _sectionIds() {
    return Array.from(document.querySelectorAll('[data-cart-section]'))
      .map((el) => el.dataset.cartSection)
      .filter(Boolean);
  }

  _render(sections) {
    Object.entries(sections).forEach(([id, html]) => {
      const target = document.querySelector(`[data-cart-section="${id}"]`);

      if (!html) {
        if (target) target.remove();
        return;
      }
      if (!target) return;

      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const next = parsed.querySelector(`[data-cart-section="${id}"]`) || parsed.body.firstElementChild;
      if (!next) return;

      target.replaceWith(next);
    });
  }

  _captureFocus(source) {
    if (!source || !source.isConnected) return null;

    let kind = null;
    if (source.matches('[data-cart-qty-input]')) kind = 'input';
    else if (source.matches('[data-cart-remove]')) kind = 'remove';
    else if (source.matches('[data-cart-qty]')) kind = `step${source.dataset.cartQty}`;

    if (!kind) return null;
    const line = source.closest('[data-line-key]');
    return { kind, lineKey: line ? line.dataset.lineKey : null };
  }

  _restoreFocus(descriptor) {
    if (!descriptor) return;

    const line = descriptor.lineKey
      ? document.querySelector(`[data-line-key="${descriptor.lineKey}"]`)
      : null;

    let target = null;
    if (line) {
      if (descriptor.kind === 'input') target = line.querySelector('[data-cart-qty-input]');
      else if (descriptor.kind === 'remove') target = line.querySelector('[data-cart-remove]');
      else target = line.querySelector(`[data-cart-qty="${descriptor.kind.replace('step', '')}"]`);
    }

    if (!target) target = document.querySelector('.cart-lines__title, .cart-drawer__title');

    if (target) target.focus({ preventScroll: true });
  }

  _announceTotal() {
    const template = this.dataset.cartLiveTemplate;

    const total = document.querySelector('.cart-summary__total-value, [data-cart-drawer-subtotal]');
    if (!template || !total) return;
    this._announceMessage(template.replace('[total]', total.textContent.trim()));
  }

  _announceMessage(message) {
    const live = document.querySelector('[data-cart-live]');
    if (!live || !message) return;

    live.textContent = '';
    requestAnimationFrame(() => {
      live.textContent = message;
    });
  }

  _announceCount(count) {
    if (typeof count !== 'number') return;
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { count, source: 'items' } }));
  }
}

if (!customElements.get('cart-items')) {
  customElements.define('cart-items', CartItems);
}
