
const STORAGE_KEY = 'coppice:collection-view';
const ROOT = document.documentElement;

class ViewToggle extends HTMLElement {
  connectedCallback() {
    if (this._button) return;
    this._button = this.querySelector('button');
    if (!this._button) return;

    this._sync();
    this._controller = new AbortController();
    this._button.addEventListener('click', this._onClick, { signal: this._controller.signal });

    window.addEventListener('storage', this._onStorage, { signal: this._controller.signal });
  }

  disconnectedCallback() {
    this._controller?.abort();
    this._controller = null;
    this._button = null;
  }

  get isList() {
    return ROOT.dataset.collectionView === 'list';
  }

  _sync() {
    this._button.setAttribute('aria-pressed', this.isList ? 'true' : 'false');
  }

  _onClick = () => {
    const next = this.isList ? 'grid' : 'list';

    ROOT.dataset.collectionView = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {

    }
    this._sync();
  };

  _onStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    if (event.newValue === 'list' || event.newValue === 'grid') {
      ROOT.dataset.collectionView = event.newValue;
      this._sync();
    }
  };
}

if (!customElements.get('view-toggle')) {
  customElements.define('view-toggle', ViewToggle);
}
