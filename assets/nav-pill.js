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
        if (tab && this.contains(tab)) this._switchTabs(tab.dataset.megaTab);
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

    list.addEventListener('mouseleave', () => this._hide(), { signal });

    list.addEventListener(
      'focusin',
      (event) => {
        const tab = event.target.closest('[data-mega-tab]');
        if (tab && this.contains(tab)) this._switchTabs(tab.dataset.megaTab);
        const item = event.target.closest('.main-nav__item');
        if (item && this.contains(item)) this._move(item);
      },
      { signal }
    );

    /* 鼠标离开整个面板内容区（含左列与中区）→ 回默认组 */
    const megaInner = this.querySelector('.main-nav__mega-inner');
    if (megaInner) {
      megaInner.addEventListener('mouseleave', () => {
        this._switchTabs(this._defaultPanelIndex);
      }, { signal });
    }

    list.addEventListener('focusout', (event) => {
      if (!list.contains(event.relatedTarget)) this._hide();
    }, { signal });

    window.addEventListener('resize', () => {
      if (this._isOn()) this._move(this._current);
    }, { signal });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (this._isOn()) this._move(this._current);
      });
    }
  }

  disconnectedCallback() {
    if (this._controller) this._controller.abort();
    if (this._pill) this._pill.remove();
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
}

customElements.define('nav-pill', NavPill);
