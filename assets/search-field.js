
class SearchField extends HTMLElement {
  connectedCallback() {
    if (this._controller) return;

    this._input = this.querySelector('[data-search-input]');
    this._clear = this.querySelector('[data-search-clear]');
    if (!this._input || !this._clear) return;

    this._controller = new AbortController();
    const { signal } = this._controller;
    this._input.addEventListener('input', this._onInput, { signal });
    this._clear.addEventListener('click', this._onClear, { signal });

    this.setAttribute('data-enhanced', '');
    this._sync();
  }

  disconnectedCallback() {
    this._controller?.abort();
    this._controller = null;
  }

  _sync() {
    this._clear.hidden = this._input.value.length === 0;
  }

  _onInput = () => {
    this._sync();
  };

  _onClear = () => {
    this._input.value = '';
    this._sync();
    this._input.focus();
  };
}

if (!customElements.get('search-field')) {
  customElements.define('search-field', SearchField);
}
