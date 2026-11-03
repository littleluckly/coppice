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
/* 箭头与 Filters 按钮用的 assets/icon-chevron-down.svg **同一组几何参数**
   （24 视图 / 同一条 path / 描边 2 ⇒ 显示 16px 时都是 1.33px）。
   两处不能共用一个文件：这里是 JS 构建的按钮，那边是服务端 inline 的，
   所以形状得手工对齐——改动其中一处时另一处要跟着改。 */
const CHEVRON_SVG =
  '<svg class="facets__sort-chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>';
/* 关闭 X 与筛选抽屉/购物车抽屉用的是同一文件 assets/icon-close.svg
   （服务端 inline），这里 JS 构建只能手抄同一组几何参数——同 CHEVRON_SVG
   的纪律，改其中一处时另一处要跟着改（2026-11-03 三面板关闭钮统一，
   同日刘工追改：X 外加圆圈，Heroicons x-circle 同一条 path）。 */
const CLOSE_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>';

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

  /**
   * 底部面板（移动端）：同样惰性构建。
   * 用 <dialog> + showModal()，焦点锁定、背景 inert、Esc 关闭都由平台给
   * （AGENTS §8）——与集合页筛选抽屉、购物车抽屉是同一套做法。
   *
   * 挂在 <facet-sort> 自己身上而不是 document.body：_placeSort 搬移卡片时
   * 它跟着走，元素销毁时一起消失，不留孤立节点。关着时 UA 的 display:none
   * 保证它不占任何布局。
   */
  _ensureSheet() {
    if (this._sheet) return;

    const sheet = document.createElement('dialog');
    sheet.className = 'facets__sort-sheet';
    sheet.setAttribute('scroll-lock', '');

    /* 抓手横线（2026-11-03 刘工：与筛选面板保持一致）。类名复用 .facets__grabber，
       视觉定义在 collection.liquid 的样式块里一处维护。
       有了抓手就必须能拖——只画不拖是假承诺，所以下面挂了拖拽收起。 */
    const grabber = document.createElement('div');
    grabber.className = 'facets__grabber';
    grabber.setAttribute('aria-hidden', 'true');
    sheet.appendChild(grabber);

    const head = document.createElement('div');
    head.className = 'facets__sort-sheet-head';
    if (this._label) {
      const title = document.createElement('p');
      title.className = 'facets__sort-sheet-title';
      title.id = `${this._uid}-sheet-title`;
      title.textContent = this._label;
      head.appendChild(title);
      sheet.setAttribute('aria-labelledby', title.id);
    }
    /* X 图标关闭钮（2026-11-03 刘工：与筛选抽屉、购物车抽屉三处统一）。
       文案走宿主 data-label-close（JS 拿不到 | t 翻译，data-* 传参是
       compare.js / cart-badge.js 的既有惯例），缺失时英文兜底。 */
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'facets__sort-sheet-close';
    closeBtn.setAttribute('aria-label', this.dataset.labelClose || 'Close');
    closeBtn.innerHTML = CLOSE_SVG;
    head.appendChild(closeBtn);
    sheet.appendChild(head);

    const body = document.createElement('div');
    body.className = 'facets__sort-sheet-body';
    sheet.appendChild(body);

    /* 遮罩点击 = 点在 dialog 自身（面板盖满了内部）。走 _closePanel 收口
       （_open 状态与 aria 一起复位），收起动画期间忽略——点击已被
       pointer-events:none 吞掉，这里只是双保险 */
    sheet.addEventListener('click', (event) => {
      if (event.target === sheet && !this._closing) this._closePanel();
    });
    /* Esc：拦下原生立即关闭，走下滑动画收场（与其他关闭路径同路） */
    sheet.addEventListener('cancel', (event) => {
      event.preventDefault();
      this._closePanel();
    });
    /* 下拉收起：热区 = 抓手 + 头部行（样式里给了 touch-action:none） */
    sheet.addEventListener('pointerdown', this._onSheetDragStart);
    /* 真正关闭后的统一收口：清内联样式（拖拽压掉的 animation:none、
       收起路径的 transition）与 is-closing 摘除，listbox 归位隐藏。
       不在这里做的话，下次打开会带着上一手的 translateY、不重播滑入。 */
    sheet.addEventListener('close', () => {
      sheet.style.animation = '';
      sheet.style.transform = '';
      sheet.style.transition = '';
      sheet.classList.remove('is-closing');
      this._closing = false;
      this._list.hidden = true;
      if (this._list.parentElement !== this) this.append(this._list);
    });

    this._sheet = sheet;
    this._sheetBody = body;
    this.append(sheet);
  }

  /* ---- 开合与绘制 ---- */

  _isMobile() {
    return !this._mq.matches;
  }

  _openPanel() {
    this._ensureList();
    /* 先保证 listbox 回到组件内：上一次若在面板里被关闭（例如跨断点收起），
       它可能还挂在已关闭的 dialog 里——桌面分支只把 hidden 去掉，
       挂在关闭的 dialog 里等于永远看不见。 */
    if (this._list.parentElement !== this) this.append(this._list);

    this._open = true;
    this._activeIndex = this._select.selectedIndex;

    if (this._isMobile()) {
      this._ensureSheet();
      /* 收起动画进行中又被打开：作废未完成的关闭（finish 的代次校验让它空转），
         清掉关闭路径留下的内联样式与 is-closing，面板回位 */
      this._closing = false;
      this._closeGen = (this._closeGen || 0) + 1;
      this._sheet.classList.remove('is-closing');
      this._sheet.style.animation = '';
      this._sheet.style.transform = '';
      this._sheet.style.transition = '';
      /* 选项 DOM 搬进面板——只此一份，桌面浮层同时不可能开着 */
      this._sheetBody.append(this._list);
      this._list.hidden = false;
      this._paint();
      if (!this._sheet.open) this._sheet.showModal();
    } else {
      this._list.hidden = false;
      this._btn.setAttribute('aria-expanded', 'true');
      this._paint();
      this._list.focus();
    }
    this._optionEls[this._activeIndex]?.scrollIntoView({ block: 'nearest' });
  }

  _closePanel(refocus = true, fromDrag = false) {
    if (!this._open) return;
    this._open = false;
    this._btn.setAttribute('aria-expanded', 'false');
    this._btn.setAttribute('aria-activedescendant', '');
    if (refocus) this._btn.focus();
    /* 移动端面板：向下滑出（2026-11-03 刘工），动画播完才真正 close()——
       listbox 归位隐藏与内联样式清理由 close 事件统一收口，提前搬走会让
       下滑过程里选项凭空消失 */
    if (this._sheet?.open) {
      this._closeSheetAnimated(fromDrag);
      return;
    }
    /* 桌面浮层（或面板尚未建立）：维持瞬时收起。listbox 搬回组件内——
       留在 dialog 里的话，下次桌面开浮层找不到绝对定位祖先，
       浮层会跑到 body 的坐标体系里 */
    this._list.hidden = true;
    if (this._list.parentElement !== this) this.append(this._list);
  }

  /**
   * 底部面板动画收口关闭（2026-11-03 刘工：关闭从闪现改为向下滑出，与滑入对称）。
   * 机制同筛选抽屉 _closeDialogAnimated：原生 close() 即 display:none，
   * 动画必须赶在 close() 之前播。常规路径挂 .is-closing 播下滑 keyframes；
   * 拖拽路径（fromDrag）transform 已在下拉途中，transition 顺势滑到屏外，
   * 不跳回原位重播。reduced-motion 直接 close()。
   * setTimeout 兜底 animationend/transitionend 偶发不触发（无头浏览器虚拟时间）；
   * 代次计数让"收起途中又被打开"作废未完成的关闭（见 _openPanel）。
   */
  _closeSheetAnimated(fromDrag = false) {
    const sheet = this._sheet;
    if (!sheet?.open || this._closing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      sheet.close();
      return;
    }
    this._closing = true;
    const gen = (this._closeGen = (this._closeGen || 0) + 1);
    let done = false;
    const finish = () => {
      if (done || gen !== this._closeGen) return;
      done = true;
      sheet.close();
    };
    if (fromDrag) {
      sheet.style.transition = 'transform 0.22s ease-in';
      sheet.style.transform = 'translateY(100%)';
      const onTransEnd = (event) => {
        if (event.target !== sheet || event.propertyName !== 'transform') return;
        sheet.removeEventListener('transitionend', onTransEnd);
        finish();
      };
      sheet.addEventListener('transitionend', onTransEnd);
    } else {
      sheet.classList.add('is-closing');
      const onAnimEnd = (event) => {
        /* ::backdrop 的动画也以 sheet 为 target，按 keyframes 名字区分 */
        if (event.animationName !== 'facets-sort-sheet-down') return;
        sheet.removeEventListener('animationend', onAnimEnd);
        finish();
      };
      sheet.addEventListener('animationend', onAnimEnd);
    }
    window.setTimeout(finish, 320);
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
    /* 下拉手势刚结束：浏览器还会补一个 click，落点可能正好在某个选项上——
       不挡掉的话，「往下拽到一半又弹回」会顺手把排序改掉。 */
    if (this._dragEndedAt && performance.now() < this._dragEndedAt) return;
    /* 头部行是拖拽热区，关闭钮在它里面：点按（无位移）不会触发拖拽收起，
       这里显式接住 click 关面板（与遮罩点击同走 _closePanel 收口状态） */
    if (event.target.closest('.facets__sort-sheet-close')) {
      this._closePanel();
      return;
    }
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
    /* 面板是模态的，遮罩点击由 dialog 自己的监听处理（target 是 dialog 本身，
       而 dialog 在 this 内部，这里本来也不会命中） */
    if (this._open && !this.contains(event.target)) this._closePanel(false);
  };

  /**
   * 下拉收起（与集合页筛选面板同一套手感）。
   * 热区只有抓手与头部行（样式里给了 touch-action:none）；选项列表不参与——
   * 那里的手势属于滚动，抢过来顾客就没法翻长列表了。
   * 越过阈值（面板高的 30%，至少 120px）→ 关闭；未过 → 弹回原位。
   *
   * 拖动期间必须把 animation 压成 none：开面板时的滑入动画优先级高于内联
   * transform，不压掉的话写 transform 也不动。清理由 close 事件统一收口。
   */
  _onSheetDragStart = (event) => {
    if (event.button > 0) return;
    const sheet = this._sheet;
    if (!sheet || !sheet.open) return;

    const handle = event.target.closest('.facets__grabber, .facets__sort-sheet-head');
    if (!handle) return;
    /* 收起动画进行中：面板已不可交互，不再接受新的拖拽 */
    if (this._closing) return;

    const startY = event.clientY;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let moved = false;

    const onMove = (moveEvent) => {
      const dy = moveEvent.clientY - startY;
      if (dy <= 0) return; /* 只响应下拉 */
      moved = moved || dy > 8;
      sheet.style.animation = 'none';
      sheet.style.transition = 'none';
      sheet.style.transform = `translateY(${dy}px)`;
    };

    const onEnd = (endEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);

      const dy = endEvent.clientY - startY;
      const dismissAt = Math.max(120, sheet.offsetHeight * 0.3);

      if (moved && dy > dismissAt) {
        this._dragEndedAt = performance.now() + 350;
        /* fromDrag：从当前拖拽位置顺势滑出（transition 收尾），不跳回原位，
           也不再原地闪没——与滑入对称（2026-11-03 刘工） */
        this._closePanel(true, true);
        return;
      }

      /* 弹回：animation 保持 none 直到关闭，避免回弹结束后又重播一次滑入 */
      if (moved && !reduce) sheet.style.transition = 'transform 0.22s ease-out';
      sheet.style.transform = '';
      window.setTimeout(
        () => {
          if (moved && !reduce) sheet.style.transition = '';
        },
        moved && !reduce ? 240 : 0
      );
      if (moved) this._dragEndedAt = performance.now() + 350;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  };

  _onMq = () => {
    /* 跨断点：容器形态从浮层换成面板（或反之），开着就直接收起。
       不收起的话，绝对定位的浮层会失去定位祖先，跑到 body 坐标里。 */
    if (this._open) this._closePanel(false);
  };
}

if (!customElements.get('facet-sort')) {
  customElements.define('facet-sort', FacetSort);
}
