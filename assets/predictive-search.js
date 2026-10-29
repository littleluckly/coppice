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
 * - Loading (两层，2026-10-29 刘工："抽屉里搜起来像没反应"）:
 *     1) 输入框下沿的细扫描线：`aria-busy` 在最新请求的生命周期内挂在当前元素上，
 *        CSS 挂在 `[aria-busy='true']` 上（**必须写字符串 'true'**——BUG-058：
 *        `toggleAttribute('aria-busy', true)` 写入的是**空值**，选择器永不命中，
 *        这条扫描线自 2026-10-10 起一次都没亮过）。
 *     2) 结果区骨架屏（_queueSkeleton）：面板本来是空的（首查 / 上次查无结果）时，
 *        延迟 120ms 后铺一组占位行；已有上一轮结果时保持原样不闪。
 *   superseded requests never clear a newer one's loading state (monotonic request token).
 * - Inline clear button: restored 2026-10-10 (styled to match the drawer's
 *   close button) after the native WebKit search-cancel X proved unstyleable;
 *   the drawer head keeps the only other close icon.
 * - Panel lifecycle follows the QUERY, not the focus: clicking blank space in
 *   the drawer keeps results visible (刘工 bug 反馈 2026-10-10). The panel
 *   closes when the query drops under 2 chars, when there are no results, or
 *   via Esc (panel → drawer) / Tab.
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

  /**
   * 骨架屏延迟出现（ms）。快网/命中缓存时 /search/suggest 常在 100ms 内回来，
   * 不延迟就是"骨架闪一下立刻消失"的视觉噪点。
   */
  static SKELETON_DELAY_MS = 120;

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
    // 骨架屏：当前铺在面板里的节点 + 延迟出现的定时器
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

  /** loading 状态：扫描线由 CSS 挂在 [aria-busy='true'] 上（也顺带对读屏声明忙碌）
   *  注意必须写字符串 'true'，不能用 toggleAttribute —— 它写入的是空值，
   *  `[aria-busy='true']` 选择器匹配不上（BUG-058，实测 a.matches() 返回 false） */
  _setBusy(busy) {
    if (busy) {
      this.setAttribute('aria-busy', 'true');
    } else {
      this.removeAttribute('aria-busy');
    }
  }

  /**
   * 骨架屏排程。三条判据，缺一条都不显示：
   *   1. 面板当前是空的——已有上一轮结果时保持原样。边搜边把列表换成骨架，
   *      等于每敲一次都闪一下，比"没有加载反馈"更难受。
   *   2. 延迟 SKELETON_DELAY_MS 再出现，避开"骨架一闪而过"。
   *   3. 仍是本次请求（token 校验）——过期请求不许顶掉新请求的骨架。
   * 骨架是纯视觉占位（aria-hidden），"正在加载"的语义由当前元素的 aria-busy 承担；
   * 不另加 role="status" 播报——aria-busy=true 的子树上做礼貌播报会被 AT 延后，等于重复。
   */
  _queueSkeleton() {
    if (!this._skeletonTemplate || this._skeleton || this._skeletonTimer) return;
    if (!this._results.hidden) return;

    const token = this._requestSeq;
    this._skeletonTimer = setTimeout(() => {
      this._skeletonTimer = null;
      if (token !== this._requestSeq || !this._results.hidden) return;

      this._skeleton = this._skeletonTemplate.content.cloneNode(true).firstElementChild;
      this._results.replaceChildren(this._skeleton);
      this._results.hidden = false;
      // 视觉上已经有一块面板在等结果，展开态跟着说实话
      this._input.setAttribute('aria-expanded', 'true');
    }, PredictiveSearch.SKELETON_DELAY_MS);
  }

  /** 摘除骨架（连同排队中的定时器）。面板因此变空就顺手收起，不留一块白板 */
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

  /** 清空按钮：显隐跟随输入框有无内容（hidden 属性驱动，无障碍树同步） */
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
    this._queueSkeleton();
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
      // 只有最新一次请求能收尾：过期请求既不能关别人的扫描线，也不能摘别人的骨架
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
