
class LocaleSelector extends HTMLElement {

  static SUBMIT_DELAY = 300;

  connectedCallback() {
    const form = this.querySelector('form');
    if (!(form instanceof HTMLFormElement)) return;

    const selects = this.querySelectorAll('select[name="country_code"], select[name="language_code"]');
    if (selects.length === 0) return;

    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;

    this._form = form;
    this._timer = null;

    selects.forEach((select) => {
      select.addEventListener('change', () => this._scheduleSubmit(), { signal });
    });

    this.setAttribute('data-enhanced', '');
  }

  disconnectedCallback() {
    this._abort?.abort();
    this._abort = null;
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _scheduleSubmit() {
    if (this._timer !== null) clearTimeout(this._timer);
    this._timer = window.setTimeout(() => {
      this._timer = null;
      this._submit();
    }, LocaleSelector.SUBMIT_DELAY);
  }

  _submit() {
    const form = this._form;
    if (!form) return;

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form.submit();
    }
  }
}

if (!customElements.get('locale-selector')) {
  customElements.define('locale-selector', LocaleSelector);
}
