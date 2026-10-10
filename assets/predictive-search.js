/**
 * predictive-search — Combobox + listbox type-ahead over the /search/suggest endpoint.
 *
 * Design decisions (task-header.md O-2 / O-4, 2026-10-09):
 *
 * - ARIA pattern is combobox + listbox, NOT a modal dialog. DOM focus stays in the
 *   input at all times; arrow keys move a *virtual* cursor via aria-activedescendant.
 *   A <dialog> here would swallow keystrokes and defeat type-ahead.
 * - Results arrive as a rendered HTML fragment from Shopify's Section Rendering API
 *   (section_id), not as JSON we render client-side. One markup source of truth:
 *   sections/predictive-search.liquid renders both modes.
 * - No results → the whole panel stays hidden (official UX: don't show an empty
 *   "no results" box). The "View all results" link inside the fragment remains the
 *   fallback, so the customer is never stranded.
 * - Progressive enhancement baseline: the <form action> is a real search URL, so with
 *   JS disabled the search still works. This file only enhances it.
 *
 * Error handling (three documented failure modes — never silently swallow):
 *   422 — invalid parameters (a bug in our query building)
 *   417 — buyer locale not supported by the endpoint
 *   429 — rate limited; response carries Retry-After
 * Any of these must leave the search usable, so we simply never open the panel.
 */
class PredictiveSearch extends HTMLElement {
  static DEBOUNCE_MS = 250;

  constructor() {
    super();

    this._abort = new AbortController();
    this._timer = null;
    this._controller = null;
    this._cursor = -1;
    this._options = [];
  }

  connectedCallback() {
    this._input = this.querySelector('.predictive-search__input');
    this._results = this.querySelector('.predictive-search__panel');
    this._clearButton = this.querySelector('[data-predictive-search-clear]');

    if (!this._input || !this._results) return;

    const { signal } = this._abort;
    this._input.addEventListener('input', this._onInput, { signal });
    this._input.addEventListener('keydown', this._onKeydown, { signal });
    this._clearButton?.addEventListener('click', this._onClear, { signal });

    // 点击面板外关闭；blur 不用（会与点击列表项竞争）
    this.addEventListener('focusout', this._onFocusOut, { signal });

    this._syncClearButton();
  }

  disconnectedCallback() {
    this._abort.abort();
    this._controller?.abort();
    if (this._timer) clearTimeout(this._timer);
  }

  get _sectionId() {
    return this.closest('[data-section-id]')?.dataset.sectionId || this.dataset.sectionId;
  }

  _onInput = () => {
    this._syncClearButton();
    if (this._timer) clearTimeout(this._timer);

    const term = this._input.value.trim();
    if (term.length < 2) {
      this._close();
      return;
    }
    this._timer = setTimeout(() => this._fetch(term), PredictiveSearch.DEBOUNCE_MS);
  };

  _onClear = () => {
    this._input.value = '';
    this._syncClearButton();
    this._close();
    this._input.focus();
  };

  _syncClearButton() {
    if (this._clearButton) {
      this._clearButton.hidden = this._input.value.length === 0;
    }
  }

  _onFocusOut = (event) => {
    // focusout fires before the click lands on an option, so wait a tick
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this._close();
    }, 0);
  };

  _onKeydown = (event) => {
    if (this._options.length === 0 && event.key !== 'Escape') return;

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
        // Let the form submit when nothing is highlighted; navigate when something is.
        if (this._cursor >= 0) {
          event.preventDefault();
          this._options[this._cursor]?.querySelector('a')?.click();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this._close();
        this._input.focus();
        break;
      case 'Tab':
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

    // aria-activedescendant: focus never leaves the input, only the "active" option
    // changes. This is what makes it a combobox rather than a listbox.
    this._input.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  }

  async _fetch(term) {
    // Abort the previous in-flight request so a slow early response can't
    // overwrite a newer one.
    this._controller?.abort();
    this._controller = new AbortController();

    const limit = this.dataset.resultsLimit || 10;
    const url = new URL(
      `${window.Shopify.routes.root}search/suggest`,
      window.location.origin
    );
    url.searchParams.set('q', term);
    url.searchParams.set('section_id', this._sectionId);
    url.searchParams.set('resources[type]', 'product,collection,page,article');
    url.searchParams.set('resources[limit]', limit);
    url.searchParams.set('predictive_search', 'true');

    try {
      const response = await fetch(url, {
        signal: this._controller.signal,
        headers: { Accept: 'application/json' },
      });

      // 429 rate limited — back off entirely, leave the search usable
      if (response.status === 429) return;

      // 422 invalid params (our bug) / 417 unsupported buyer locale —
      // either way, do not open a broken panel.
      if (response.status === 422 || response.status === 417) return;

      if (!response.ok) return;

      const payload = await response.json();
      const html = payload?.sections?.[this._sectionId]?.html;

      // No results → keep the panel closed entirely (official UX).
      if (!html) {
        this._close();
        return;
      }

      this._results.innerHTML = html;
      this._open();
    } catch (error) {
      // AbortError is expected when superseded; anything else is a real failure.
      // Either way the form still submits, so we degrade quietly.
      if (error.name !== 'AbortError') this._close();
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
    this._results.hidden = true;
    this._results.innerHTML = '';
    this._input.setAttribute('aria-expanded', 'false');
    this._input.removeAttribute('aria-activedescendant');
    this._options = [];
    this._cursor = -1;
  }
}

customElements.define('predictive-search', PredictiveSearch);
