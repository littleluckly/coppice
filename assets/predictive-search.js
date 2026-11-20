
class PredictiveSearch extends HTMLElement {
  static DEBOUNCE_MS = 250;

  static SKELETON_DELAY_MS = 120;

  static SECTION_ID = 'predictive-search';

  constructor() {
    super();

    this._abort = new AbortController();
    this._timer = null;
    this._controller = null;
    this._cursor = -1;
    this._options = [];
    this._requestSeq = 0;
    this._skeleton = null;
    this._skeletonTimer = null;
  }

  connectedCallback() {
    this._input = this.querySelector('.predictive-search__input');
    this._results = this.querySelector('.predictive-search__panel');
    this._clearButton = this.querySelector('[data-predictive-search-clear]');
    this._skeletonTemplate = this.querySelector('[data-predictive-search-skeleton]');

    if (!this._input || !this._results) return;

    const { signal } = this._abort;
    this._input.addEventListener('input', this._onInput, { signal });
    this._input.addEventListener('keydown', this._onKeydown, { signal });
    this._clearButton?.addEventListener('click', this._onClear, { signal });

  }

  disconnectedCallback() {
    this._abort.abort();
    this._controller?.abort();
    if (this._timer) clearTimeout(this._timer);
  }

  get _sectionId() {
    return PredictiveSearch.SECTION_ID;
  }

  _onInput = () => {
    this._syncClearButton();
    if (this._timer) clearTimeout(this._timer);

    const term = this._input.value.trim();
    if (term.length < 2) {
      this._controller?.abort();
      this._setBusy(false);
      this._close();
      return;
    }
    this._timer = setTimeout(() => this._fetch(term), PredictiveSearch.DEBOUNCE_MS);
  };

  _setBusy(busy) {
    if (busy) {
      this.setAttribute('aria-busy', 'true');
    } else {
      this.removeAttribute('aria-busy');
    }
  }

  _queueSkeleton() {
    if (!this._skeletonTemplate || this._skeleton) return;
    if (!this._results.hidden) return;

    if (this._skeletonTimer) clearTimeout(this._skeletonTimer);

    const token = this._requestSeq;
    this._skeletonTimer = setTimeout(() => {
      this._skeletonTimer = null;
      if (token !== this._requestSeq || !this._results.hidden) return;

      this._skeleton = this._skeletonTemplate.content.cloneNode(true).firstElementChild;
      this._results.replaceChildren(this._skeleton);
      this._results.hidden = false;
      this._input.setAttribute('aria-expanded', 'true');
    }, PredictiveSearch.SKELETON_DELAY_MS);
  }

  _hideSkeleton() {
    if (this._skeletonTimer) {
      clearTimeout(this._skeletonTimer);
      this._skeletonTimer = null;
    }
    this._skeleton?.remove();
    this._skeleton = null;

    if (this._results.childElementCount === 0) {
      this._results.hidden = true;
      this._input.setAttribute('aria-expanded', 'false');
    }
  }

  _onClear = () => {
    this._input.value = '';
    this._syncClearButton();
    this._controller?.abort();
    this._setBusy(false);
    this._close();
    this._input.focus();
  };

  _syncClearButton() {
    if (this._clearButton) {
      this._clearButton.hidden = this._input.value.length === 0;
    }
  }

  _onKeydown = (event) => {
    if (event.key === 'Tab') {
      this._close();
      return;
    }

    if (this._options.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this._move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._move(-1);
        break;
      case 'Enter':
        if (this._cursor >= 0) {
          event.preventDefault();
          this._options[this._cursor]?.querySelector('a')?.click();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this._close();
        break;
      default:
    }
  };

  _move(delta) {
    const next = this._cursor + delta;

    if (next < 0) {
      this._cursor = this._options.length - 1;
    } else if (next >= this._options.length) {
      this._cursor = 0;
    } else {
      this._cursor = next;
    }

    this._options.forEach((option, i) => {
      const active = i === this._cursor;
      option.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const active = this._options[this._cursor];
    if (!active) return;

    this._input.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  }

  async _fetch(term) {
    this._controller?.abort();
    this._controller = new AbortController();
    const token = ++this._requestSeq;

    const limit = this.dataset.resultsLimit || 10;
    const url = new URL(
      `${window.Shopify.routes.root}search/suggest`,
      window.location.origin
    );
    url.searchParams.set('q', term);
    url.searchParams.set('section_id', PredictiveSearch.SECTION_ID);
    url.searchParams.set('resources[type]', 'product,collection,page,article');
    url.searchParams.set('resources[limit]', limit);
    url.searchParams.set('predictive_search', 'true');

    this._setBusy(true);
    this._queueSkeleton();
    try {
      const response = await fetch(url, { signal: this._controller.signal });

      if (response.status === 429) return;

      if (response.status === 422 || response.status === 417) return;

      if (!response.ok) return;

      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const wrapper = doc.querySelector(
        `#shopify-section-${PredictiveSearch.SECTION_ID}`
      );
      const html = (wrapper ?? doc.body).innerHTML.trim();

      if (!html) {
        this._close();
        return;
      }

      this._results.innerHTML = html;
      this._open();
    } catch (error) {
      if (error.name !== 'AbortError') this._close();
    } finally {
      if (token === this._requestSeq) {
        this._setBusy(false);
        this._hideSkeleton();
      }
    }
  }

  _open() {
    this._results.hidden = false;
    this._input.setAttribute('aria-expanded', 'true');
    this._cursor = -1;
    this._input.removeAttribute('aria-activedescendant');
    this._options = Array.from(this._results.querySelectorAll('[role="option"]'));
    this._options.forEach((o) => o.setAttribute('aria-selected', 'false'));
  }

  _close() {
    this._hideSkeleton();
    this._results.hidden = true;
    this._results.innerHTML = '';
    this._input.setAttribute('aria-expanded', 'false');
    this._input.removeAttribute('aria-activedescendant');
    this._options = [];
    this._cursor = -1;
  }
}

customElements.define('predictive-search', PredictiveSearch);
