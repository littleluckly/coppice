/**
 * predictive-search — Combobox + listbox type-ahead over the /search/suggest endpoint.
 *
 * Design decisions (2026-10-09 O-2 / O-4; revised 2026-10-10, drawer refactor):
 *
 * - ARIA pattern is combobox + listbox. DOM focus stays in the input at all
 *   times; arrow keys move a *virtual* cursor via aria-activedescendant. The
 *   form lives inside the search drawer (a modal <dialog>), but the combobox
 *   behaviour is unchanged. Escape is layered: with results open it closes the
 *   panel; with the panel closed it bubbles to the dialog and closes the drawer.
 * - Results arrive as a rendered HTML fragment from Shopify's Section Rendering
 *   API. Per the official Predictive Search API reference, `section_id` takes
 *   the SECTION FILE name and the response is HTML wrapped in
 *   `#shopify-section-<section_id>` — parse it with DOMParser, do NOT read it
 *   as JSON. One markup source of truth: sections/predictive-search.liquid
 *   (BUG-028: the pre-drawer version fetched main-nav's instance id and read
 *   response.json(), which always threw on the HTML response).
 * - No results → the whole panel stays hidden (official UX: don't show an empty
 *   "no results" box). The "View all results" link inside the fragment remains the
 *   fallback, so the customer is never stranded.
 * - Progressive enhancement baseline: the <form action> is a real search URL, so with
 *   JS disabled the search still works. This file only enhances it.
 *
 * - Loading: `aria-busy` is toggled on this element for the duration of the
 *   newest request (CSS paints a thin sweep line); superseded requests never
 *   clear a newer one's loading state (monotonic request token).
 * - No inline clear button (2026-10-10 刘工: only one close icon in the drawer).
 *
 * Error handling (three documented failure modes — never silently swallow):
 *   404 — section id not found in the theme (a bug in our wiring)
 *   417 — buyer locale not supported by the endpoint
 *   422 — invalid parameters (a bug in our query building)
 *   429 — rate limited; response carries Retry-After
 * Any of these must leave the search usable, so we simply never open the panel.
 */
class PredictiveSearch extends HTMLElement {
  static DEBOUNCE_MS = 250;

  /** Section FILE name — what /search/suggest re-renders for the results fragment. */
  static SECTION_ID = 'predictive-search';

  constructor() {
    super();

    this._abort = new AbortController();
    this._timer = null;
    this._controller = null;
    this._cursor = -1;
    this._options = [];
    // 递增序号：只有"最新一次请求"才允许关掉 loading（过期请求的 finally 不算数）
    this._requestSeq = 0;
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

    // 注意：不监听 focusout 关面板（2026-10-10 刘工 bug 反馈）——
    // 点抽屉空白处会把焦点移出输入框，结果列表跟着消失，反直觉。
    // 面板的生命周期跟查询词走：词 <2 字、无结果、Esc/Tab 才收起。
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
      // 掐掉在途请求并立即结束 loading——面板关闭时不能留着扫描线空转
      this._controller?.abort();
      this._setBusy(false);
      this._close();
      return;
    }
    this._timer = setTimeout(() => this._fetch(term), PredictiveSearch.DEBOUNCE_MS);
  };

  /** loading 状态：扫描线由 CSS 挂在 [aria-busy] 上（也顺带对读屏声明忙碌） */
  _setBusy(busy) {
    this.toggleAttribute('aria-busy', busy);
  }

  _onFocusOut = (event) => {
    // focusout fires before the click lands on an option, so wait a tick
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this._close();
    }, 0);
  };

  _onKeydown = (event) => {
    // Tab 总是收起面板（焦点移动即离开联想上下文）。
    if (event.key === 'Tab') {
      this._close();
      return;
    }

    // 面板未开时不拦任何键——尤其是 Escape：让它冒泡给外层
    // <dialog>（search-drawer），实现「面板关 → 抽屉关」的分层退出。
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
        // Let the form submit when nothing is highlighted; navigate when something is.
        if (this._cursor >= 0) {
          event.preventDefault();
          this._options[this._cursor]?.querySelector('a')?.click();
        }
        break;
      case 'Escape':
        // 面板开着时 Esc 只收面板（不再往外冒），焦点留在输入框。
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
    const token = ++this._requestSeq;

    const limit = this.dataset.resultsLimit || 10;
    const url = new URL(
      `${window.Shopify.routes.root}search/suggest`,
      window.location.origin
    );
    url.searchParams.set('q', term);
    // 官方 API：section_id 传 section 文件名，响应该 section 的渲染结果
    url.searchParams.set('section_id', PredictiveSearch.SECTION_ID);
    url.searchParams.set('resources[type]', 'product,collection,page,article');
    url.searchParams.set('resources[limit]', limit);
    url.searchParams.set('predictive_search', 'true');

    // loading 从发请求亮到本请求生命周期结束；被更新请求顶替时
    // token 不匹配，finally 不会把新请求的 loading 关掉
    this._setBusy(true);
    try {
      // 注意：section_id 请求返回的是 HTML（不是 JSON）——官方示例即用 text() + DOMParser
      const response = await fetch(url, { signal: this._controller.signal });

      // 429 rate limited — back off entirely, leave the search usable
      if (response.status === 429) return;

      // 422 invalid params (our bug) / 417 unsupported buyer locale —
      // either way, do not open a broken panel.
      if (response.status === 422 || response.status === 417) return;

      if (!response.ok) return;

      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      const wrapper = doc.querySelector(
        `#shopify-section-${PredictiveSearch.SECTION_ID}`
      );
      const html = (wrapper ?? doc.body).innerHTML.trim();

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
    } finally {
      if (token === this._requestSeq) this._setBusy(false);
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
