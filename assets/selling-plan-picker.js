
class SellingPlanPicker extends HTMLElement {
  connectedCallback() {
    const dataEl = this.querySelector('[data-plan-json]');
    if (!dataEl) return;

    try {
      this._data = JSON.parse(dataEl.textContent);
    } catch (error) {

      return;
    }
    if (!this._data || typeof this._data !== 'object') return;

    this._section = this.closest('.main-product');
    if (!this._section) return;

    this._priceEl = this._section.querySelector('[data-price]');
    this._compareEl = this._section.querySelector('[data-compare-price]');
    this._saveEl = this._section.querySelector('[data-save-badge]');
    this._status = this._section.querySelector('[data-form-status]');
    this._saveTemplate = this.dataset.saveTemplate || '';
    this._oneTime = this.querySelector('[data-one-time]');
    this._variantId = String(this.dataset.variantId || '');

    this._controller = new AbortController();
    const { signal } = this._controller;

    this.addEventListener('change', this._onChange, { signal });

    document.addEventListener('variant:change', this._onVariantChange, { signal });

    this._sync(this._currentVariantId(), true);
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  _onChange = (event) => {
    if (!event.target.matches('[data-plan-radio]')) return;
    const variant = this._data[this._currentVariantId()];
    if (variant) this._renderPrice(variant);
  };

  _onVariantChange = (event) => {
    const detail = event.detail || {};
    if (detail.variantId === undefined || detail.variantId === null) return;

    const mySection = this._section ? this._section.dataset.sectionId : null;
    if (detail.sectionId) {
      if (!mySection || detail.sectionId !== mySection) return;
    } else if (!this._data[String(detail.variantId)]) {
      return;
    }

    this._sync(String(detail.variantId), true);
  };

  _currentVariantId() {
    const input = this._section.querySelector('[data-variant-input]');
    const value = input ? String(input.value) : '';
    return value || this._variantId;
  }

  _sync(variantId, resetSelection) {
    const variant = this._data[variantId];
    if (!variant) return;

    this._variantId = variantId;

    this.querySelectorAll('[data-plan-id]').forEach((radio) => {
      const allowed = Object.prototype.hasOwnProperty.call(variant.plans || {}, radio.dataset.planId);
      radio.disabled = !allowed;
      const option = radio.closest('[data-plan-option]');
      if (option) option.hidden = !allowed;
      if (!allowed && radio.checked) radio.checked = false;
    });

    if (this._oneTime) {
      const allowed = !variant.requiresPlan;
      this._oneTime.disabled = !allowed;
      const option = this._oneTime.closest('[data-plan-option]');
      if (option) option.hidden = !allowed;
      if (!allowed && this._oneTime.checked) this._oneTime.checked = false;
    }

    this.querySelectorAll('[data-plan-group]').forEach((group) => {
      const hasOption = Array.from(group.querySelectorAll('[data-plan-option]')).some((el) => !el.hidden);
      group.hidden = !hasOption;
    });

    if (
      resetSelection &&
      !this.querySelector('[data-plan-radio]:checked') &&
      this._oneTime &&
      !this._oneTime.disabled
    ) {
      this._oneTime.checked = true;
    }

    this._renderPrice(variant);
  }

  _renderPrice(variant) {
    const checked = this.querySelector('[data-plan-radio]:checked');
    const planId = checked && checked.dataset.planId;
    const plan = planId ? (variant.plans || {})[planId] : null;
    const price = plan || variant;

    if (this._priceEl && price.price) this._priceEl.textContent = price.price;

    if (this._compareEl) {
      if (price.compare) {
        this._compareEl.textContent = price.compare;
        this._compareEl.removeAttribute('hidden');
      } else {
        this._compareEl.setAttribute('hidden', '');
      }
    }

    if (this._saveEl) {
      if (price.compare && price.save > 0 && this._saveTemplate) {
        this._saveEl.textContent = this._saveTemplate.replace('[percent]', price.save);
        this._saveEl.removeAttribute('hidden');
      } else {
        this._saveEl.setAttribute('hidden', '');
      }
    }
  }

  validate() {
    const variant = this._data[this._currentVariantId()];
    if (!variant || !variant.requiresPlan) return true;
    if (this.querySelector('[data-plan-radio]:checked')) return true;

    const target = this.querySelector('[data-plan-radio]:not(:disabled)');
    if (target) target.focus();
    if (this._status && this.dataset.requiredMessage) {
      this._status.textContent = this.dataset.requiredMessage;
    }
    return false;
  }
}

if (!customElements.get('selling-plan-picker')) {
  customElements.define('selling-plan-picker', SellingPlanPicker);
}
