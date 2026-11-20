
class SearchDrawer extends HTMLElement {
  constructor() {
    super();

    this._dialog = null;
    this._lastOpener = null;
    this._closeButton = null;

    this._abort = new AbortController();
    this._onClose = this._onClose.bind(this);
    this._onDialogClick = this._onDialogClick.bind(this);
  }

  connectedCallback() {
    this._build();
    if (!this._dialog) return;

    const { signal } = this._abort;

    this._dialog.addEventListener('close', this._onClose, { signal });
    this._dialog.addEventListener('click', this._onDialogClick, { signal });

    const openers = this.closest('nav')?.querySelectorAll('[data-search-drawer-open]');
    openers?.forEach((opener) => {
      opener.addEventListener('click', () => this.open(opener), { signal });
    });

    this._closeButton = this._dialog.querySelector('[data-search-drawer-close]');
    this._closeButton?.addEventListener('click', this._onClose, { signal });
  }

  disconnectedCallback() {
    this._abort.abort();
  }

  _build() {
    this._dialog = this.querySelector('dialog[data-search-drawer]');
    if (!this._dialog) return;

    const template = this._dialog.querySelector('template[data-search-drawer-template]');
    if (!template) return;

    if (this._dialog.dataset.built === 'true') return;

    this._dialog.append(template.content.cloneNode(true));
    this._dialog.dataset.built = 'true';

    this._dialog.setAttribute('scroll-lock', '');
  }

  open = (opener = null) => {
    if (!this._dialog || this._dialog.open) return;

    this._lastOpener = opener;
    this._dialog.showModal();

    this._dialog.querySelector('.predictive-search__input')?.focus();
  };

  _onDialogClick(event) {
    if (event.target === this._dialog) this._close();
  }

  _onClose() {
    if (!this._dialog?.open) return;

    this._dialog.close();

    this._lastOpener?.focus();
  }
}

customElements.define('search-drawer', SearchDrawer);
