
class VariantPicker extends HTMLElement {
  connectedCallback() {
    const dataEl = this.querySelector('[data-variant-json]');
    if (!dataEl) return;

    try {
      this._variants = JSON.parse(dataEl.textContent);
    } catch (error) {
      this._variants = [];
      return;
    }
    if (!Array.isArray(this._variants) || this._variants.length === 0) return;

    this._section = this.closest('.main-product');
    if (!this._section) return;

    this._formInput = this._section.querySelector('[data-variant-input]');
    this._priceEl = this._section.querySelector('[data-price]');
    this._compareEl = this._section.querySelector('[data-compare-price]');
    this._saveEl = this._section.querySelector('[data-save-badge]');
    this._saveTemplate = this._section.dataset.saveTemplate || '';
    this._button = this._section.querySelector('[data-add-button]');

    this._controller = new AbortController();
    this.addEventListener('change', this._onChange, { signal: this._controller.signal });

    this._apply(this._resolve());
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  _onChange = () => {
    this._apply(this._resolve());
  };

  _resolve() {
    const inputs = Array.from(this.querySelectorAll('input[data-option-position]:checked'));
    if (inputs.length === 0) return null;

    const selected = inputs
      .slice()
      .sort((a, b) => Number(a.dataset.optionPosition) - Number(b.dataset.optionPosition))
      .map((input) => input.value);

    return (
      this._variants.find(
        (variant) =>
          Array.isArray(variant.options) &&
          variant.options.length === selected.length &&
          variant.options.every((value, i) => value === selected[i])
      ) || null
    );
  }

  _apply(variant) {
    if (!variant) return;

    if (this._formInput) this._formInput.value = variant.id;

    if (this._priceEl) this._priceEl.textContent = variant.price;

    if (this._compareEl) {
      if (variant.compare) {
        this._compareEl.textContent = variant.compare;
        this._compareEl.removeAttribute('hidden');
      } else {
        this._compareEl.setAttribute('hidden', '');
      }
    }

    if (this._saveEl) {
      if (variant.compare && variant.save > 0 && this._saveTemplate) {
        this._saveEl.textContent = this._saveTemplate.replace('[percent]', variant.save);
        this._saveEl.removeAttribute('hidden');
      } else {
        this._saveEl.setAttribute('hidden', '');
      }
    }

    this._syncUnitPrice(variant);

    if (this._button) {
      const soldOutLabel = this._button.dataset.soldOutLabel || '';
      const addLabel = this._button.dataset.addLabel || '';
      this._button.disabled = !variant.available;
      this._button.textContent = variant.available ? addLabel : soldOutLabel;
      delete this._button.dataset.state;
    }

    document.dispatchEvent(
      new CustomEvent('variant:change', {
        detail: {
          variantId: variant.id,
          mediaId: variant.mediaId,
          available: variant.available,

          sectionId: this._section ? this._section.dataset.sectionId : null,
        },
      })
    );
  }

  _syncUnitPrice(variant) {
    let el = this._section.querySelector('[data-unit-price]');
    if (!variant.unitPrice) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('p');
      el.className = 'main-product__unit-price';
      el.dataset.unitPrice = '';
      const priceBlock = this._section.querySelector('.main-product__price');
      if (priceBlock && priceBlock.parentNode) {
        priceBlock.parentNode.insertBefore(el, priceBlock.nextSibling);
      }
    }
    el.textContent = `${variant.unitPrice} / ${variant.unitReference || ''}`.trim();
  }
}

class QuantityInput extends HTMLElement {
  connectedCallback() {
    this._input = this.querySelector('[data-quantity-input]');
    this._minus = this.querySelector('[data-quantity-minus]');
    this._plus = this.querySelector('[data-quantity-plus]');
    if (!this._input) return;

    this._controller = new AbortController();
    const { signal } = this._controller;

    if (this._minus) this._minus.addEventListener('click', () => this._step(-1), { signal });
    if (this._plus) this._plus.addEventListener('click', () => this._step(1), { signal });
    this._input.addEventListener('change', () => this._clamp(), { signal });
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  _step(delta) {
    const current = this._value();
    const next = current + delta;
    if (next < this._min()) return;
    this._input.value = String(next);
  }

  _clamp() {
    const value = this._value();
    if (!Number.isFinite(value) || value < this._min()) {
      this._input.value = String(this._min());
    }
  }

  _min() {
    const min = Number(this._input.min);
    return Number.isFinite(min) && min > 0 ? min : 1;
  }

  _value() {
    const value = parseInt(this._input.value, 10);
    return Number.isFinite(value) ? value : this._min();
  }
}

class ProductForm extends HTMLElement {
  static REVERT_DELAY_MS = 2500;

  _controller = new AbortController();
  _revertTimer = null;

  connectedCallback() {
    this._form = this.querySelector('form');
    this._button = this.querySelector('[data-add-button]');
    this._status = this.querySelector('[data-form-status]');
    this._defaultLabel = this._button ? this._button.textContent.trim() : '';
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
    if (this._button.dataset.state === 'pending') return;

    const planPicker = this.querySelector('selling-plan-picker');
    if (planPicker && typeof planPicker.validate === 'function' && !planPicker.validate()) return;

    this._button.dataset.state = 'pending';
    this._button.disabled = true;

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
      this._revertTimer = setTimeout(() => this._reset(), ProductForm.REVERT_DELAY_MS);

      this._syncCartCount();
    } catch (error) {
      if (error.name === 'AbortError') return;

      document.dispatchEvent(new CustomEvent('cart:add-failed', { detail: { button: this._button } }));
      delete this._button.dataset.state;
      this._button.disabled = false;
      this._announce(this._button.dataset.errorMessage || '');
      this._reset();
    }
  };

  _reset() {
    delete this._button.dataset.state;
    if (!this._button.dataset.addLabel) {
      this._button.textContent = this._defaultLabel;
    }
    this._button.disabled = false;
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
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: cart.item_count } }));
    } catch (error) {
      if (error.name !== 'AbortError') return;
    }
  }
}

if (!customElements.get('variant-picker')) {
  customElements.define('variant-picker', VariantPicker);
}
if (!customElements.get('quantity-input')) {
  customElements.define('quantity-input', QuantityInput);
}
if (!customElements.get('product-form')) {
  customElements.define('product-form', ProductForm);
}
