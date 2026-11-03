/**
 * facet-sort — 排序选择器（2026-10-17 刘工效果图：描边按钮 + 浮层 listbox）。
 *
 * 2026-11-03 刘工：移动端也改成底部滑入面板，与集合页筛选抽屉同一套动效。
 * 原先移动端刻意保留原生 <select>（触屏原生选择器），但筛选与排序并排时
 * 一个开抽屉、一个弹系统选择器，同一次操作出现两种界面语言。现在两者一致。
 *
 * 渐进增强（红线对齐：数据仍来自平台 sort_options，前端零排序逻辑）：
 * - 服务端渲染原生 <select data-facets-sort>：无 JS 全功能（GET 表单提交）；
 * - 有 JS：构建按钮，隐藏 select 但保留在表单里（name/value/form 属性不动，
 *   FormData 照常含 sort_by）；
 * - ≥990px 开浮层 listbox（锚在按钮下方）；<990px 开 <dialog> 底部面板。
 *   选项 DOM 只有一份，开面板时搬进对应容器，收起时搬回——不复制选项，
 *   也不会出现"两份 listbox 各记一套选中态"。
 *
 * 值变更同步回隐藏 select 并派发冒泡 change——collection-facets 的委托
 * 监听（有表单 requestSubmit / 无表单独立局部更新）零改动复用。
 *
 * 实现纪律（AGENTS §6）：
 * - AbortController 一次性拆绑；listbox 与面板首次打开才构建（惰性 DOM）；
 * - _placeSort 在工具条 ↔ 左列间搬移卡片会触发本元素断开/重连——
 *   connectedCallback 幂等（重连只重挂监听，不重复构建）；
 * - 键盘：方向键/Home/End 移动、Enter/Space 选中、Esc 关闭、Tab 走默认。
 */
const CHECK_SVG =
  '<svg class="facets__sort-check" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 5"/></svg>';
const CHEVRON_SVG =
  '<svg class="facets__sort-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6l4.5 4.5L12.5 6"/></svg>';

class FacetSort extends HTMLElement {
  _abort = null;
  _built = false;
  _open = false;
  _activeIndex = -1;

  connectedCallback() {
    this._select = this.querySelector('select[data-facets-sort]');
    if (!this._select) return;

    /* 重连幂等：先拆旧监听再重挂（_placeSort 搬移 = 断开 + 重连） */
    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;

    this._mq = window.matchMedia('(min-width: 990px)');
    this._mq.addEventListener('change', this._onMq, { signal });
    this.addEventListener('click', this._onClick, { signal });
    this.addEventListener('keydown', this._onKeydown, { signal });
    /* 点外面收起：挂在 document，随本元素销毁一并拆除 */
    document.addEventListener('pointerdown', this._onDocPointerDown, { signal });

    this._enhance();
  }

  disconnectedCallback() {
    /* document 级监听随 signal 一起拆除；开着时被搬移/替换则视为收起。
       _placeSort 搬移卡片会走这条路径——面板开着被搬走必须关掉，
       否则会留下一个悬浮在 top layer、已经脱离文档的 dialog。 */
    this._abort?.abort();
    this._open = false;
    if (this._sheet?.open) this._sheet.close();
  }

  /* ---- 构建 ---- */

  /** 全断点都接管：移动端开底部面板，桌面开浮层（2026-11-03 改） */
  _enhance() {
    if (!this._built) this._build();
    this._select.classList.add('visually-hidden');
    this._select.tabIndex = -1;
    this._btn.hidden = false;
    this._btn.tabIndex = 0;
    this._syncLabel();
  }

  _build() {
    this._uid = `sort-${Math.random().toString(36).slice(2, 8)}`;
    const label = this.closest('.facets__sort-card')
      ?.querySelector('.facets__sort-card-label')
      ?.textContent.trim();
    /* 标签在移动端是视觉隐藏的（只给读屏用），这里留一份给底部面板当标题——
       面板里没有那个 label 元素，不能现取 */
    this._label = label || '';

    this._btn = document.createElement('button');
    this._btn.type = 'button';
    this._btn.className = 'facets__sort-btn';
    this._btn.hidden = true;
    if (label) this._btn.setAttribute('aria-label', label);
    this._btn.setAttribute('aria-haspopup', 'listbox');
    this._btn.setAttribute('aria-expanded', 'false');
    const value = document.createElement('span');
    value.className = 'facets__sort-value';
    this._btn.innerHTML = CHEVRON_SVG;
    this._btn.prepend(value);

    this.prepend(this._btn);
    this._built = true;
    this._syncLabel();
  }

  /** listbox 惰性构建：首次打开才建 DOM（AGENTS §6） */
  _ensureList() {
    if (this._list) return;
    this._list = document.createElement('ul');
    this._list.className = 'facets__sort-list';
    this._list.setAttribute('role', 'listbox');
    this._list.tabIndex = -1;
    this._list.hidden = true;
    this._optionEls = [...this._select.options].map((opt, i) => {
      const li = document.createElement('li');
      li.id = `${this._uid}-opt-${i}`;
      li.className = 'facets__sort-option';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', opt.selected ? 'true' : 'false');
      li.innerHTML = `<span class="facets__sort-option-text"></span>${CHECK_SVG}`;
      li.querySelector('.facets__sort-option-text').textContent = opt.textContent;
      this._list.appendChild(li);
      return li;
    });
    this._btn.setAttribute('aria-owns', this._list.id = `${this._uid}-listbox`);
    this.append(this._list);
  }

  /* ---- 开合与绘制 ---- */

  _openPanel() {
    this._ensureList();
    this._open = true;
    this._list.hidden = false;
    this._btn.setAttribute('aria-expanded', 'true');
    this._activeIndex = this._select.selectedIndex;
    this._paint();
    this._list.focus();
    this._optionEls[this._activeIndex]?.scrollIntoView({ block: 'nearest' });
  }

  _closePanel(refocus = true) {
    if (!this._open) return;
    this._open = false;
    this._list.hidden = true;
    this._btn.setAttribute('aria-expanded', 'false');
    this._btn.setAttribute('aria-activedescendant', '');
    if (refocus) this._btn.focus();
  }

  _paint() {
    const selected = this._select.selectedIndex;
    this._optionEls.forEach((li, i) => {
      li.setAttribute('aria-selected', i === selected ? 'true' : 'false');
      li.classList.toggle('is-active', i === this._activeIndex);
    });
    this._list.setAttribute(
      'aria-activedescendant',
      this._optionEls[this._activeIndex]?.id || ''
    );
  }

  _syncLabel() {
    if (!this._btn) return;
    const opt = this._select.options[this._select.selectedIndex];
    this._btn.querySelector('.facets__sort-value').textContent =
      opt ? opt.textContent : '';
  }

  /* ---- 交互 ---- */

  _move(delta) {
    const max = this._optionEls.length - 1;
    this._activeIndex = Math.min(max, Math.max(0, this._activeIndex + delta));
    this._paint();
    this._optionEls[this._activeIndex]?.scrollIntoView({ block: 'nearest' });
  }

  _pick(index) {
    const opt = this._select.options[index];
    if (!opt) return;
    const changed = this._select.value !== opt.value;
    this._select.value = opt.value;
    this._syncLabel();
    this._closePanel(false);
    this._btn.focus();
    /* 冒泡 change → collection-facets 委托：有表单 requestSubmit，无表单独立更新 */
    if (changed) this._select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  _onClick = (event) => {
    if (!this._built || this._btn.hidden) return;
    if (event.target.closest('.facets__sort-btn')) {
      this._open ? this._closePanel() : this._openPanel();
      return;
    }
    const option = event.target.closest('.facets__sort-option');
    if (option) {
      this._pick(this._optionEls.indexOf(option));
    }
  };

  _onKeydown = (event) => {
    if (!this._built || this._btn.hidden) return;

    /* 关闭态：按钮上方向键直接展开（Enter/Space 走原生 click → _onClick） */
    if (!this._open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        this._openPanel();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this._move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this._move(-1);
        break;
      case 'Home':
        event.preventDefault();
        this._activeIndex = 0;
        this._paint();
        break;
      case 'End':
        event.preventDefault();
        this._activeIndex = this._optionEls.length - 1;
        this._paint();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this._pick(this._activeIndex);
        break;
      case 'Escape':
        event.preventDefault();
        this._closePanel();
        break;
      case 'Tab':
        this._closePanel(false); /* 不拦默认：焦点照常移走，面板收起 */
        break;
    }
  };

  _onDocPointerDown = (event) => {
    if (this._open && !this.contains(event.target)) this._closePanel(false);
  };

  _onMq = (event) => {
    event.matches ? this._enhance() : this._restore();
  };
}

if (!customElements.get('facet-sort')) {
  customElements.define('facet-sort', FacetSort);
}
