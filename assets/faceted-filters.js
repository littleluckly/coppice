/**
 * collection-facets — 集合页/搜索页筛选控制器（task-collection T-2.2/T-2.3）。
 *
 * 职责（红线对齐 SDD §6.1：前端零筛选逻辑，数据一律服务端重算）：
 * 1. 拦截 GET 表单提交/值变更/链接点击 → 组原生筛选 URL + `?section_id=`（Section
 *    Rendering API）→ fetch → 仅替换本元素内容 → history.replaceState。
 * 2. 移动端：<dialog>（原生焦点锁定/Esc/scroll-lock）承载与桌面同一份筛选 DOM
 *    （aside 物理移动，无副本，输入状态不分裂）。
 * 3. 无 JS 退化：单列布局 + 应用按钮整页 GET 提交，全功能可用。
 *
 * 实现纪律（AGENTS §6）：
 * - 监听全部委托到本元素（submit/change/click 冒泡），内部 form/网格被局部替换后无需重绑；
 * - 类字段箭头函数 + AbortController（BUG-030/033 预防：杜绝 this 漂移与重复绑定）；
 * - 隐藏组件惰性：dialog 常驻但空壳，panel 按需移入/移出。
 */
class CollectionFacets extends HTMLElement {
  _abort = new AbortController();
  _fetchAbort = null;

  connectedCallback() {
    this._sectionId = this.dataset.sectionId;
    this._dialog = document.getElementById(`FacetsDialog-${this._sectionId}`);
    /* 无筛选集合没有筛选表单，但排序 select 仍在工具条——控制器照常激活 */
    if (
      !this.querySelector('[data-facets-form]') &&
      !this.querySelector('[data-facets-sort]')
    ) {
      return;
    }

    /* JS 就绪标记：CSS 由此启用桌面两栏 / 移动抽屉（无 JS 时保持单列降级） */
    this.setAttribute('data-facets-ready', '');

    const { signal } = this._abort;
    this.addEventListener('submit', this._onSubmit, { signal });
    this.addEventListener('change', this._onChange, { signal });
    this.addEventListener('click', this._onClick, { signal });
    if (this._dialog) {
      this._dialog.addEventListener('close', this._onDialogClose, { signal });
    }
  }

  disconnectedCallback() {
    this._abort.abort();
    if (this._fetchAbort) this._fetchAbort.abort();
  }

  _onChange = (event) => {
    const inForm = event.target.closest('[data-facets-form]');
    const isSort = event.target.matches('[data-facets-sort]');
    /* 排序 select 在右列工具条，靠 form 属性关联表单（不在表单的 DOM 子树内） */
    if (!inForm && !isSort) return;
    /* 现场重查表单：_load 的 replaceChildren 会替换整个容器，缓存的 form
       引用随即脱离 DOM，requestSubmit 不再生效——不能依赖 connectedCallback 缓存 */
    const form = inForm || this.querySelector('[data-facets-form]');
    if (form) {
      /* 筛选勾选 / 价格输入 / 排序——任何变更即按原生 URL 重算 */
      form.requestSubmit();
      return;
    }
    /* 无筛选集合没有表单可提交：排序单独局部更新（并回到第一页） */
    if (isSort) {
      const url = new URL(window.location.href);
      if (event.target.value) url.searchParams.set('sort_by', event.target.value);
      else url.searchParams.delete('sort_by');
      url.searchParams.delete('page');
      url.searchParams.set('section_id', this._sectionId);
      this._load(url);
    }
  };

  _onSubmit = (event) => {
    const form = event.target.closest('[data-facets-form]');
    if (!form) return;
    event.preventDefault();
    this._load(this._buildUrl(form.action, new FormData(form)));
  };

  _onClick = (event) => {
    const opener = event.target.closest('[data-facets-open]');
    if (opener) {
      this._openDialog();
      return;
    }
    if (event.target.closest('[data-facets-close]')) {
      if (this._dialog) this._dialog.close();
      return;
    }
    /* 已选标签 / 清除全部：拦截站内跳转改走局部更新 */
    const link = event.target.closest('a[href]');
    if (link && link.closest('[data-facets-form]')) {
      event.preventDefault();
      this._load(link.href);
    }
  };

  _buildUrl(base, formData) {
    const url = new URL(base, window.location.origin);
    for (const [key, value] of formData.entries()) {
      if (value !== '') url.append(key, value);
    }
    url.searchParams.set('section_id', this._sectionId);
    return url;
  }

  async _load(requestUrl) {
    if (this._fetchAbort) this._fetchAbort.abort();
    this._fetchAbort = new AbortController();
    this.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(requestUrl, {
        headers: { Accept: 'text/html' },
        signal: this._fetchAbort.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const next = doc.querySelector('collection-facets');
      if (!next) throw new Error('Section payload missing');

      this.replaceChildren(...next.childNodes);

      /* 地址栏同步（去掉 section_id）——URL 可分享、刷新保留（SDD §6.1） */
      const historyUrl = new URL(requestUrl, window.location.origin);
      historyUrl.searchParams.delete('section_id');
      history.replaceState({}, '', historyUrl);

      /* 抽屉若开着，把新面板重新移入（DOM 在替换中回到了 form 内） */
      if (this._dialog && this._dialog.open) this._movePanelIntoDialog();

      /* 焦点不丢：网格区接管（aria-live 计数随新 DOM 播报） */
      const results = this.querySelector('[data-facets-results]');
      if (results && !this._dialog?.open) results.focus({ preventScroll: true });
      if (this._dialog?.open) {
        this.querySelector('.facets__panel')?.focus?.();
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      /* 局部更新失败 → 整页导航兜底（同样的 URL，服务端照常重算） */
      const fallbackUrl = new URL(requestUrl, window.location.origin);
      fallbackUrl.searchParams.delete('section_id');
      window.location.href = fallbackUrl.toString();
    } finally {
      this.removeAttribute('aria-busy');
    }
  }

  _openDialog() {
    if (!this._dialog) return;
    this._movePanelIntoDialog();
    this._dialog.showModal();
    this.querySelector('.facets__panel')?.setAttribute('tabindex', '-1');
    this.querySelector('.facets__panel')?.focus();
  }

  _movePanelIntoDialog() {
    const aside = this.querySelector('[data-facets-aside]');
    if (aside && this._dialog && aside.parentElement !== this._dialog) {
      this._dialog.append(aside);
    }
  }

  _onDialogClose = () => {
    /* 面板归位到筛选 form 内（aside 的常住位置，桌面侧栏原位），
       保持单一 DOM 副本 + 表单成员资格不移出 */
    const form = this.querySelector('[data-facets-form]');
    const aside = this._dialog.querySelector('[data-facets-aside]');
    if (form && aside) form.prepend(aside);
  };
}

if (!customElements.get('collection-facets')) {
  customElements.define('collection-facets', CollectionFacets);
}
