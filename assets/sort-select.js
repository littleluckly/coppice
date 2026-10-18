/**
 * facet-sort — 排序下拉增强组件（2026-10-17 刘工效果图：描边按钮 + 浮层
 * listbox，hover 高亮、选中项品牌色 + 对勾）。
 *
 * 渐进增强（红线对齐：数据仍来自平台 sort_options，前端零排序逻辑）：
 * - 服务端渲染原生 <select data-facets-sort>：无 JS 全功能（GET 表单提交）；
 * - <990px 保留原生 select——触屏上原生选择器（滚轮/半屏面板）是更好的交互；
 * - ≥990px 由本元素接管：构建按钮 + 浮层列表，隐藏 select 但保留在
 *   表单里（name/value/form 属性不动，FormData 照常含 sort_by）。
 *
 * 值变更同步回隐藏 select 并派发冒泡 change——collection-facets 的委托
 * 监听（有表单 requestSubmit / 无表单独立局部更新）零改动复用。
 *
 * 实现纪律（AGENTS §6）：
 * - AbortController 一次性拆绑；listbox 首次打开才构建（隐藏组件惰性 DOM）；
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

    if (this._mq.matches) this._enhance();
    else this._restore();
  }

  disconnectedCallback() {
    /* document 级监听随 signal 一起拆除；开着时被搬移/替换则视为收起 */
    this._abort?.abort();
    this._open = false;
  }

  /* ---- 构建 ---- */

  _enhance() {
    if (!this._built) this._build();
    this._select.classList.add('visually-hidden');
    this._select.tabIndex = -1;
    this._btn.hidden = false;
    this._btn.tabIndex = 0;
    this._syncLabel();
  }

  /** 移动端 / 降级：还原原生 select，收起浮层 */
  _restore() {
    if (this._open) this._closePanel(false);
    if (this._btn) {
      this._btn.hidden = true;
      this._btn.tabIndex = -1;
    }
    this._select.classList.remove('visually-hidden');
    this._select.tabIndex = 0;
  }

  _build() {
    this._uid = `sort-${Math.random().toString(36).slice(2, 8)}`;
    const label = this.closest('.facets__sort-card')
      ?.querySelector('.facets__sort-card-label')
      ?.textContent.trim();

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
