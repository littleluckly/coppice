
class GiftCardRecipient extends HTMLElement {
  _controller = null;

  connectedCallback() {
    if (this._controller) return;

    this._checkbox = this.querySelector('[data-recipient-checkbox]');
    this._fields = this.querySelector('[data-recipient-fields]');
    this._control = this.querySelector('[data-recipient-control]');
    this._offset = this.querySelector('[data-recipient-offset]');
    if (!this._checkbox || !this._fields) return;

    this._inputs = Array.from(this._fields.querySelectorAll('input, textarea'));

    this._controller = new AbortController();
    this.addEventListener('change', this._onChange, { signal: this._controller.signal });

    this._checkbox.disabled = false;
    if (this._control) this._control.disabled = true;
    if (this._offset) this._offset.value = String(new Date().getTimezoneOffset());

    this._setLocalMinDate();

    this._sync(this._checkbox.checked, false);
  }

  _setLocalMinDate() {
    const sendOn = this._fields.querySelector('input[type="date"]');
    if (!sendOn) return;
    const today = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    sendOn.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  _onChange = () => {
    this._sync(this._checkbox.checked, !this._checkbox.checked);
  };

  _sync(open, clear) {
    this.toggleAttribute('open', open);

    this._inputs.forEach((input) => {
      input.disabled = !open;
    });
    if (this._offset) this._offset.disabled = !open;

    if (!open && clear) {
      this._inputs.forEach((input) => {
        input.value = '';
      });
    }
  }
}

if (!customElements.get('gift-card-recipient')) {
  customElements.define('gift-card-recipient', GiftCardRecipient);
}
