/**
 * nav-pill — 桌面主导航的滑动药丸指示器（2026-10-12 刘工需求）。
 *
 * 行为：
 * - 深色药丸（视觉由 main-nav.liquid 的 .main-nav__pill 控制）默认隐藏；
 *   鼠标悬浮 / 键盘焦点进入某个一级导航项时，药丸滑动到该项下方，
 *   该项文字同步反色（CSS :hover / :focus-within 配合）。
 * - 鼠标离开整个列表 / 焦点全部移出列表时，药丸隐藏，还原默认状态。
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

    /* hover 防抖（2026-10-27 刘工）：快速划过 mega 左列时不触发面板切换，
       鼠标在某分类上停留超过阈值才滑动药丸并切换面板，过滤"扫过"误触。
       只作用于鼠标路径（mouseover）；键盘 focus 为离散操作，保持即时响应。 */
    this._megaHoverTimer = null;
    this._MEGA_HOVER_DELAY = 150;

    /* 显式锚点（第五轮，刘工）：[data-nav-pill-anchor] 是药丸与 mega 面板
       约定的定位父级（main-nav.liquid 里该元素同时持有 position: relative，
       即 CSS 包含块）。量测基准优先认它；若它不是 positioned、或药丸的
       实际包含块（offsetParent）与它不一致——说明结构改了没同步，
       回退到实际包含块并告警，而不是静默错位。 */
    this._anchor = this.closest('[data-nav-pill-anchor]');

    /* mega 面板分类切换（第九轮补，刘工）：左列 [data-mega-tab] 切换
       中区 [data-mega-panel]。渐进增强——组件升级前所有面板可见
       （无 JS 底线不破）；升级后默认第一组，hover / 键盘焦点切换，
       鼠标离开面板回默认组。 */
    this._tabs = Array.from(this.querySelectorAll('[data-mega-tab]'));
    this._panels = Array.from(this.querySelectorAll('[data-mega-panel]'));
    this._defaultPanelIndex = this._panels.length
      ? this._panels[0].dataset.megaPanel
      : null;
    this._activePanelIndex = null;
    if (this._panels.length && this._tabs.length) {
      this.classList.add('nav-mega-tabs--ready');
      /* 升级即切默认组：无 JS 时所有面板可见，接管后只留第一个 */
      this._switchTabs(this._defaultPanelIndex);
    }

    /* mega 左列滑动药丸（2026-10-27，复用本组件测量/滑动算法，纵向套用）：
       一个药丸垫在左列分类项下，hover 跟手滑动，松手停在激活项做常驻高亮。
       与顶部 .main-nav__pill 同源但独立实例（不同包含块），无 JS 时不存在。 */
    this._megaPill = null;
    const megaNav = this.querySelector('.main-nav__mega-nav');
    if (megaNav && this._tabs.length) {
      const mp = document.createElement('span');
      mp.className = 'main-nav__mega-pill';
      mp.setAttribute('aria-hidden', 'true');
      megaNav.appendChild(mp);
      this._megaPill = mp;
      /* 初始：药丸停在默认激活项（常驻高亮，无动画定位） */
      this._moveMegaToIndex(this._defaultPanelIndex, false);
    }

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
          this._scheduleMegaHover(tab);
        }
        const item = event.target.closest('.main-nav__item');
        if (item && this.contains(item)) {
          this._move(item);
          /* 鼠标重新压上一级 trigger 时重置为默认组；
             面板内部移动不触发（面板内元素不在 .main-nav__link 里） */
          if (
            event.target.closest('.main-nav__link') &&
            item.classList.contains('main-nav__item--group')
          ) {
            this._switchTabs(this._defaultPanelIndex);
          }
        }
      },
      { signal }
    );

    list.addEventListener('mouseleave', () => {
      this._hide(); /* 顶部药丸隐藏 */
      /* 取消可能待执行的左列切换（快速划出时不该迟到触发） */
      if (this._megaHoverTimer) {
        clearTimeout(this._megaHoverTimer);
        this._megaHoverTimer = null;
      }
      /* mega 药丸停在激活项（常驻高亮，不隐藏） */
      this._moveMegaToIndex(this._activePanelIndex, true);
    }, { signal });

    list.addEventListener(
      'focusin',
      (event) => {
        const tab = event.target.closest('[data-mega-tab]');
        if (tab && this.contains(tab)) {
          this._switchTabs(tab.dataset.megaTab);
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
        if (this._megaHoverTimer) {
          clearTimeout(this._megaHoverTimer);
          this._megaHoverTimer = null;
        }
        this._moveMegaToIndex(this._activePanelIndex, true);
      }, { signal });
    }

    list.addEventListener('focusout', (event) => {
      if (!list.contains(event.relatedTarget)) this._hide();
    }, { signal });

    window.addEventListener('resize', () => {
      if (this._isOn()) this._move(this._current);
      if (this._megaPill && this._megaPill.classList.contains('main-nav__mega-pill--on')) {
        this._moveMegaToIndex(this._activePanelIndex, false);
      }
    }, { signal });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (this._isOn()) this._move(this._current);
        if (this._megaPill && this._megaPill.classList.contains('main-nav__mega-pill--on')) {
          this._moveMegaToIndex(this._activePanelIndex, false);
        }
      });
    }
  }

  disconnectedCallback() {
    if (this._controller) this._controller.abort();
    if (this._megaHoverTimer) clearTimeout(this._megaHoverTimer);
    if (this._pill) this._pill.remove();
    if (this._megaPill) this._megaPill.remove();
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

  /* mega 左列 hover 防抖（2026-10-27 刘工）：快速划过多个分类时，每次
     mouseover 都重置计时器，直到鼠标在某个项上停留超过 _MEGA_HOVER_DELAY
     才真正滑动药丸 + 切换面板。停下即触发，扫过不触发。 */
  _scheduleMegaHover(tab) {
    if (this._megaHoverTimer) clearTimeout(this._megaHoverTimer);
    this._megaHoverTimer = setTimeout(() => {
      this._megaHoverTimer = null;
      this._switchTabs(tab.dataset.megaTab);
      this._moveMega(tab, true);
    }, this._MEGA_HOVER_DELAY);
  }

  /* mega 左列药丸：滑动到指定序号的 tab（无对应序号则跳过） */
  _moveMegaToIndex(index, animate = true) {
    if (!index) return;
    const tab = this._tabs.find((t) => t.dataset.megaTab === index);
    if (tab) this._moveMega(tab, animate);
  }

  /* mega 左列滑动药丸（2026-10-27）：与 _move 同源测量算法，纵向套用。
     target 相对药丸实际包含块（offsetParent，即 .main-nav__mega-nav）定位，
     只在 Y 方向滑动 + 高度自适应，宽度取目标满宽。首次/重算时无动画定位。 */
  _moveMega(tab, animate = true) {
    const pill = this._megaPill;
    if (!pill || !tab || !this.contains(tab)) return;
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
  }

  /* 切换中区面板：index = 二级项在菜单里的序号（data-mega-tab/-panel 成对）。
     无对应 panel 的 tab（商家只配了图标没配内容）保持当前组不动。 */
  _switchTabs(index) {
    if (!index || index === this._activePanelIndex) return;
    if (!this._panels.length) return;
    this._activePanelIndex = index;
    for (const panel of this._panels) {
      if (panel.dataset.megaPanel === index) {
        panel.removeAttribute('hidden');
      } else {
        panel.setAttribute('hidden', '');
      }
    }
    for (const tab of this._tabs) {
      tab.classList.toggle(
        'main-nav__mega-cat-link--active',
        tab.dataset.megaTab === index
      );
    }
  }
}

customElements.define('nav-pill', NavPill);
