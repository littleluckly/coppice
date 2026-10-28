/**
 * nav-pill — 桌面主导航的滑动药丸指示器（2026-10-12 刘工需求）。
 *
 * 行为：
 * - 深色药丸（视觉由 main-nav.liquid 的 .main-nav__pill 控制）默认隐藏；
 *   鼠标悬浮 / 键盘焦点进入某个一级导航项时，药丸滑动到该项下方，
 *   该项文字同步反色（CSS :hover / :focus-within 配合）。
 * - 鼠标离开整个列表 / 焦点全部移出列表时，药丸隐藏、面板延迟 200ms 关闭
 *   （飞越间隙保护：200ms 内鼠标回到导航 / 面板即取消关闭，避免半路塌）。
 * - 当前页（aria-current）另有静态的品牌色文字指示（SDD §8.2 不能只靠
 *   悬浮态表达"你在哪"），本组件只负责交互反馈。
 *
 * 约定（AGENTS §6）：
 * - Custom Element 封装；事件绑在自身根上（非 document 全局委托），
 *   connectedCallback 绑定，disconnectedCallback 里 AbortController 一次拆除，
 *   主题编辑器 / Section Rendering 重渲染不会叠加监听。
 * - 无 JS 降级：本元素未升级时（无 nav-pill--ready 类），main-nav.liquid 里
 *   的 :not(.nav-pill--ready) 兜底规则让 hover 项自身显深色，功能不丢。
 * - 药丸 span 由本组件创建——无 JS 时 DOM 里不存在无效元素。
 */
class NavPill extends HTMLElement {
  connectedCallback() {
    const list = this.querySelector('.main-nav__list');
    if (!list) return;

    this.classList.add('nav-pill--ready');
    this._list = list;
    this._current = null;

    /* 面板切换防抖（2026-10-27 刘工）：快速划过 mega 左列时不触发面板切换（重操作），
       鼠标在某分类上停留超过阈值才切；药丸滑动 + 文字反色走即时跟手（见 _moveMega）。
       只作用于鼠标路径（mouseover）；键盘 focus 为离散操作，保持即时响应。 */
    this._megaSwitchTimer = null;
    this._MEGA_HOVER_DELAY = 150;

    /* 面板延迟关闭（2026-10-27 刘工）：从一级导航"飞越间隙"移到 mega 面板途中，
       鼠标会短暂离开 .main-nav__list 的盒（面板 abs 定位在其外）→ 触发
       mouseleave。若立即关闭就半路塌了。延迟 _MEGA_CLOSE_DELAY 才撤 is-open，
       期间鼠标进入面板（mouseover 冒泡到 list）即取消关闭。 */
    this._closeTimer = null;
    this._MEGA_CLOSE_DELAY = 200;

    /* 显式锚点（第五轮，刘工）：[data-nav-pill-anchor] 是药丸与 mega 面板
       约定的定位父级（main-nav.liquid 里该元素同时持有 position: relative，
       即 CSS 包含块）。量测基准优先认它；若它不是 positioned、或药丸的
       实际包含块（offsetParent）与它不一致——说明结构改了没同步，
       回退到实际包含块并告警，而不是静默错位。 */
    this._anchor = this.closest('[data-nav-pill-anchor]');

    /* mega 面板分类切换（第九轮补，刘工）：左列 [data-mega-tab] 切换
       中区 [data-mega-panel]。渐进增强——组件升级前所有面板可见
       （无 JS 底线不破）；升级后默认第一组，hover / 键盘焦点切换，
       鼠标离开面板回默认组。

       2026-10-28 改：按 .main-nav__mega-inner 分作用域（scope）。
       原来 _tabs / _panels 是跨面板的扁平数组、药丸只建给第一个面板——
       导致 ① 第二个及之后的 mega 面板左列没有滑动高亮；② data-mega-panel
       在每个面板内独立编号，_switchTabs 会跨面板命中同号面板（切 Shop 的
       第 3 组时把 Platform 的第 3 组一起显示）。现在每个面板各持
       tabs / panels / pill / activeIndex / defaultIndex，互不干扰。 */
    this._scopes = Array.from(
      this.querySelectorAll('.main-nav__mega-inner')
    ).map((inner) => {
      const nav = inner.querySelector('.main-nav__mega-nav');
      const tabs = Array.from(inner.querySelectorAll('[data-mega-tab]'));
      const panels = Array.from(inner.querySelectorAll('[data-mega-panel]'));
      let pill = null;
      /* mega 左列滑动药丸（2026-10-27，复用本组件测量/滑动算法，纵向套用）：
         每个面板一个，垫在左列分类项下，hover 跟手滑动、松手停在激活项做常驻高亮。
         与顶部 .main-nav__pill 同源但独立实例，无 JS 时不存在。
         药丸建好但默认激活项的定位推迟到首次 _openGroup：此刻面板
         display:none（无 is-open），offsetParent 为 null 无法量测；
         面板真正展开（is-open → display:block）时坐标才可测。 */
      if (nav && tabs.length) {
        pill = document.createElement('span');
        pill.className = 'main-nav__mega-pill';
        pill.setAttribute('aria-hidden', 'true');
        nav.appendChild(pill);
      }
      return {
        inner,
        nav,
        tabs,
        panels,
        pill,
        defaultIndex: panels.length ? panels[0].dataset.megaPanel : null,
        activeIndex: null,
      };
    });

    for (const scope of this._scopes) {
      if (scope.tabs.length && scope.panels.length) {
        this.classList.add('nav-mega-tabs--ready');
        /* 升级即切默认组：无 JS 时所有面板可见，接管后每个面板只留第一组 */
        this._switchTabs(scope.defaultIndex, scope);
      }
    }

    /* 一级 group 项集合：鼠标路径延迟关闭时维护其 is-open 展开态 */
    this._groups = Array.from(this.querySelectorAll('.main-nav__item--group'));

    const pill = document.createElement('span');
    pill.className = 'main-nav__pill';
    pill.setAttribute('aria-hidden', 'true');
    this.appendChild(pill);
    this._pill = pill;

    const controller = new AbortController();
    this._controller = controller;
    const { signal } = controller;

    list.addEventListener(
      'mouseover',
      (event) => {
        const tab = event.target.closest('[data-mega-tab]');
        if (tab && this.contains(tab)) {
          this._moveMega(tab, true); /* 即时跟手：滑动药丸 + 同步 --lit 反色 */
          this._scheduleMegaSwitch(tab); /* 仅面板切换防抖，过滤快速划过 */
        }
        const item = event.target.closest('.main-nav__item');
        if (item && this.contains(item)) {
          this._cancelClose(); /* 鼠标回到导航内，取消延迟关闭 */
          this._move(item);
          /* 鼠标重新压上一级 trigger 时重置为默认组；
             面板内部移动不触发（面板内元素不在 .main-nav__link 里） */
          if (
            event.target.closest('.main-nav__link') &&
            item.classList.contains('main-nav__item--group')
          ) {
            const scope = this._scopeOf(item);
            if (scope) this._switchTabs(scope.defaultIndex, scope);
          }
          /* 鼠标进入某一级 group → 展开该组（is-open 拖尾由 _close 延时撤除），
             清掉其它组的 is-open，避免从 A 划到 B 时 A 残留展开 */
          if (item.classList.contains('main-nav__item--group')) {
            this._openGroup(item);
          }
        }
      },
      { signal }
    );

    list.addEventListener('mouseleave', () => {
      /* 不立即关：延迟关闭，给鼠标"飞越间隙"进入面板留余地（2026-10-27 刘工） */
      this._scheduleClose();
    }, { signal });

    list.addEventListener(
      'focusin',
      (event) => {
        const tab = event.target.closest('[data-mega-tab]');
        if (tab && this.contains(tab)) {
          const scope = this._scopeOf(tab);
          if (scope) this._switchTabs(tab.dataset.megaTab, scope);
          this._moveMega(tab, true);
        }
        const item = event.target.closest('.main-nav__item');
        if (item && this.contains(item)) this._move(item);
      },
      { signal }
    );

    /* 鼠标离开整个面板内容区（含左列与中区）→ 药丸停在当前激活项（常驻高亮），
       不再回默认组；面板本身保持在最后激活项（_switchTabs 已切过）。 */
    const megaInner = this.querySelector('.main-nav__mega-inner');
    if (megaInner) {
      megaInner.addEventListener('mouseleave', () => {
        /* 离开面板也延迟关，给"回一级项 / 回面板"留余地（2026-10-27 刘工） */
        this._scheduleClose();
      }, { signal });
    }

    list.addEventListener('focusout', (event) => {
      if (!list.contains(event.relatedTarget)) this._hide();
    }, { signal });

    const reposition = () => {
      if (this._isOn()) this._move(this._current);
      this._repositionMegaPills();
    };
    window.addEventListener('resize', reposition, { signal });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(reposition);
    }
  }

  disconnectedCallback() {
    if (this._controller) this._controller.abort();
    if (this._megaSwitchTimer) clearTimeout(this._megaSwitchTimer);
    if (this._closeTimer) clearTimeout(this._closeTimer);
    if (this._pill) this._pill.remove();
    for (const scope of this._scopes || []) {
      if (scope.pill) scope.pill.remove();
    }
    this._current = null;
  }

  _isOn() {
    return this._pill && this._pill.classList.contains('main-nav__pill--on');
  }

  _move(item) {
    if (!item || !this.contains(item)) return;
    const trigger = item.querySelector(':scope > .main-nav__link');
    if (!trigger) return;

    this._current = item;

    /* 量测基准 = 药丸的定位父级：
       1) [data-nav-pill-anchor]（校验过 position 非 static）且它就是
          药丸的实际包含块（offsetParent）→ 按约定量测；
       2) 属性缺失 / 失效 → 回退 offsetParent（CSS 实际包含块）；
       3) 两者不一致 → 中间层结构变了，实际包含块才是 CSS 真正认的锚点，
          按它量测（保证视觉正确）并告警（提醒同步结构）。 */
    const rect = trigger.getBoundingClientRect();
    const anchor = this._anchor;
    const anchorOk =
      anchor && getComputedStyle(anchor).position !== 'static';
    const containing = this._pill.offsetParent;
    if (anchorOk && containing && containing !== anchor) {
      console.warn(
        '[nav-pill] anchor mismatch: measured against actual containing block.',
        'expected:', anchor,
        'actual:', containing,
        '— check for a newly positioned element between them.'
      );
    }
    const baseEl =
      anchorOk && (!containing || containing === anchor)
        ? anchor
        : containing || this;
    const base = baseEl.getBoundingClientRect();
    const x = rect.left - base.left;
    const y = rect.top - base.top;
    const pill = this._pill;
    const wasOn = this._isOn();

    if (!wasOn) {
      /* 首次显示：先无动画定位到目标，再开透明度——避免药丸从列表起点滑穿整个导航 */
      pill.style.transition = 'none';
      pill.style.width = rect.width + 'px';
      pill.style.height = rect.height + 'px';
      pill.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      pill.getBoundingClientRect(); /* 强制 reflow，让下面的 transition 生效 */
      pill.style.transition = '';
      pill.classList.add('main-nav__pill--on');
    } else {
      pill.style.width = rect.width + 'px';
      pill.style.height = rect.height + 'px';
      pill.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    }
  }

  _hide() {
    if (!this._pill) return;
    this._pill.classList.remove('main-nav__pill--on');
    this._current = null;
  }

  /* 面板切换防抖（2026-10-27 刘工）：快速划过 mega 左列时不触发面板切换（重操作），
     鼠标在某分类上停留超过 _MEGA_HOVER_DELAY 才切；药丸滑动 + 文字反色由
     _moveMega 即时跟手（见 mouseover handler），不在防抖内。 */
  _scheduleMegaSwitch(tab) {
    if (this._megaSwitchTimer) clearTimeout(this._megaSwitchTimer);
    this._megaSwitchTimer = setTimeout(() => {
      this._megaSwitchTimer = null;
      const scope = this._scopeOf(tab);
      if (scope) this._switchTabs(tab.dataset.megaTab, scope);
    }, this._MEGA_HOVER_DELAY);
  }

  /* 找到元素所属的 mega 面板作用域（元素不在任何面板内时返回 null） */
  _scopeOf(el) {
    if (!el) return null;
    for (const scope of this._scopes) {
      if (scope.inner.contains(el)) return scope;
    }
    return null;
  }

  /* 重算所有"已点亮"药丸的位置（resize / 字体就绪后调用）。
     2026-10-28：药丸改为 per-scope，逐个重算。 */
  _repositionMegaPills() {
    for (const scope of this._scopes) {
      if (scope.pill && scope.pill.classList.contains('main-nav__mega-pill--on')) {
        this._moveMegaToIndex(scope.activeIndex, scope, false);
      }
    }
  }

  /* mega 左列药丸：滑动到指定作用域内、指定序号的 tab（无对应序号则跳过） */
  _moveMegaToIndex(index, scope, animate = true) {
    if (!scope || !index) return;
    const tab = scope.tabs.find((t) => t.dataset.megaTab === index);
    if (tab) this._moveMega(tab, animate);
  }

  /* mega 左列滑动药丸（2026-10-27）：与 _move 同源测量算法，纵向套用。
     target 相对药丸实际包含块（offsetParent，即 .main-nav__mega-nav）定位，
     只在 Y 方向滑动 + 高度自适应，宽度取目标满宽。首次/重算时无动画定位。
     2026-10-28：药丸 per-scope，按 tab 所属面板取对应那个，不再只认第一个。 */
  _moveMega(tab, animate = true) {
    const scope = this._scopeOf(tab);
    const pill = scope && scope.pill;
    if (!pill || !tab) return;
    const rect = tab.getBoundingClientRect();
    const container = pill.offsetParent;
    if (!container) return;
    const base = container.getBoundingClientRect();
    const x = rect.left - base.left;
    const y = rect.top - base.top;
    const wasOn = pill.classList.contains('main-nav__mega-pill--on');
    if (!wasOn || !animate) {
      pill.style.transition = 'none';
      pill.style.width = rect.width + 'px';
      pill.style.height = rect.height + 'px';
      pill.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      pill.getBoundingClientRect(); /* 强制 reflow，让下面的 transition 生效 */
      pill.style.transition = '';
      pill.classList.add('main-nav__mega-pill--on');
    } else {
      pill.style.width = rect.width + 'px';
      pill.style.height = rect.height + 'px';
      pill.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }
    /* 同步文字反色到药丸所在项（--lit），与药丸滑动同源触发，
       保证"文字变白"与"药丸滑到"同步，不抢拍（2026-10-27 修复 hover 文字先白 bug） */
    this._setLit(tab, scope);
  }

  /* 同步文字反色到药丸所在项：仅当前药丸垫底的项加 --lit（文字反色），其余移除。
     每次 _moveMega 调用都重算，覆盖初始 / hover / 移出回激活 / resize / fonts 就绪。
     2026-10-28：限定在 tab 所属面板内——跨面板遍历会把别的面板同名项一起反色。 */
  _setLit(tab, scope) {
    for (const t of scope.tabs) {
      t.classList.toggle('main-nav__mega-cat-link--lit', t === tab);
    }
  }

  /* 切换中区面板：index = 二级项在菜单里的序号（data-mega-tab/-panel 成对，
     序号在每个面板内独立编号，所以必须带 scope——否则会跨面板命中同号面板）。
     无对应 panel 的 tab（商家只配了图标没配内容）保持当前组不动。 */
  _switchTabs(index, scope) {
    if (!scope || !index || index === scope.activeIndex) return;
    if (!scope.panels.length) return;
    scope.activeIndex = index;
    for (const panel of scope.panels) {
      if (panel.dataset.megaPanel === index) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    }
    for (const tab of scope.tabs) {
      tab.classList.toggle(
        'main-nav__mega-cat-link--active',
        tab.dataset.megaTab === index
      );
    }
  }

  /* —— 面板延迟关闭（飞越间隙保护，2026-10-27 刘工）—— */

  /* 取消待执行的延迟关闭（鼠标回到导航 / 面板时调用） */
  _cancelClose() {
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
  }

  /* 离开一级导航或离开面板时，不立即关——延迟 _MEGA_CLOSE_DELAY 再关，
     给鼠标"飞越间隙"进入面板留余地。延迟期间鼠标回到导航 / 面板，
     mouseover 冒泡会 _cancelClose 取消；真正离开才关。 */
  _scheduleClose() {
    this._cancelClose();
    this._closeTimer = setTimeout(() => {
      this._closeTimer = null;
      this._close();
    }, this._MEGA_CLOSE_DELAY);
  }

  /* 真正关闭：撤除所有 group 的 is-open 拖尾（:hover 维持的项不受影响），
     顶部药丸隐藏、取消待切换、左列药丸回激活项常驻高亮。 */
  _close() {
    for (const g of this._groups) g.classList.remove('is-open');
    if (this._megaSwitchTimer) {
      clearTimeout(this._megaSwitchTimer);
      this._megaSwitchTimer = null;
    }
    this._hide();
    /* 各面板左列药丸回到各自激活项常驻高亮（从未切过的面板保持原位不动） */
    for (const scope of this._scopes) {
      if (scope.activeIndex) this._moveMegaToIndex(scope.activeIndex, scope, true);
    }
  }

  /* 鼠标进入某一级 group：展开该组（is-open），清掉其它组的拖尾 is-open，
     避免从 A 划到 B 时 A 残留展开。键盘路径（focusin）不调用本方法——
     键盘展开由 :focus-within 独立维持，否则 focusout 不会撤 is-open 致面板卡开。 */
  _openGroup(item) {
    /* 先记"展开前是否已 open"：仅首次展开该组时做药丸初始定位，
       同组内后续 mouseover 不再重钉——否则会覆盖当前 hover 的即时跟手
       （_moveMega(tab) 已在 handler 里执行），导致高亮停在上一格
       （回归：2026-10-27 把定位塞进本方法引入，mega 面板是 group 的后代，
       mouseover 冒泡使本方法每次悬停分类都被调用）。 */
    const wasOpen = item.classList.contains('is-open');
    for (const g of this._groups) {
      if (g !== item) g.classList.remove('is-open');
    }
    item.classList.add('is-open');
    if (!wasOpen) {
      /* 首次打开面板：把该面板左列滑动药丸定位到默认激活项（常驻高亮首帧不闪）。
         加 is-open 后面板已 display:block，坐标可测；用 scope.defaultIndex
         （一组刚展开时激活面板即默认第一项），不用过期的 activeIndex。
         修复"首次打开无默认选中高亮"：初始化时面板不可见无法定位。
         2026-10-28：按 item 找所属面板，不再用全局第一个面板的序号。 */
      const scope = this._scopeOf(item);
      if (scope) this._moveMegaToIndex(scope.defaultIndex, scope, false);
    }
  }
}

customElements.define('nav-pill', NavPill);
