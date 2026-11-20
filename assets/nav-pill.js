
class NavPill extends HTMLElement {
  connectedCallback() {
    const list = this.querySelector('.main-nav__list');
    if (!list) return;

    this.classList.add('nav-pill--ready');
    this._list = list;
    this._current = null;

    this._megaSwitchTimer = null;
    this._MEGA_HOVER_DELAY = 150;

    this._closeTimer = null;
    this._MEGA_CLOSE_DELAY = 200;

    this._anchor = this.closest('[data-nav-pill-anchor]');

    this._scopes = Array.from(
      this.querySelectorAll('.main-nav__mega-inner')
    ).map((inner) => {
      const nav = inner.querySelector('.main-nav__mega-nav');
      const tabs = Array.from(inner.querySelectorAll('[data-mega-tab]'));
      const panels = Array.from(inner.querySelectorAll('[data-mega-panel]'));
      let pill = null;

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

        this._switchTabs(scope.defaultIndex, scope);
      }
    }

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
          this._moveMega(tab, true);
          this._scheduleMegaSwitch(tab);
        }
        const item = event.target.closest('.main-nav__item');
        if (item && this.contains(item)) {
          this._cancelClose();
          this._move(item);

          if (
            event.target.closest('.main-nav__link') &&
            item.classList.contains('main-nav__item--group')
          ) {
            const scope = this._scopeOf(item);
            if (scope) this._switchTabs(scope.defaultIndex, scope);
          }

          if (item.classList.contains('main-nav__item--group')) {
            this._openGroup(item);
          } else {

            this._closeGroups();
          }
        }
      },
      { signal }
    );

    list.addEventListener('mouseleave', () => {

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
        if (item && this.contains(item)) {
          this._move(item);

          if (!item.classList.contains('main-nav__item--group')) this._closeGroups();
        }
      },
      { signal }
    );

    const megaInner = this.querySelector('.main-nav__mega-inner');
    if (megaInner) {
      megaInner.addEventListener('mouseleave', () => {

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

      pill.style.transition = 'none';
      pill.style.width = rect.width + 'px';
      pill.style.height = rect.height + 'px';
      pill.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      pill.getBoundingClientRect();
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

  _scheduleMegaSwitch(tab) {
    if (this._megaSwitchTimer) clearTimeout(this._megaSwitchTimer);
    this._megaSwitchTimer = setTimeout(() => {
      this._megaSwitchTimer = null;
      const scope = this._scopeOf(tab);
      if (scope) this._switchTabs(tab.dataset.megaTab, scope);
    }, this._MEGA_HOVER_DELAY);
  }

  _scopeOf(el) {
    if (!el) return null;
    for (const scope of this._scopes) {
      if (scope.inner.contains(el) || el.contains(scope.inner)) return scope;
    }
    return null;
  }

  _repositionMegaPills() {
    for (const scope of this._scopes) {
      if (scope.pill && scope.pill.classList.contains('main-nav__mega-pill--on')) {
        this._moveMegaToIndex(scope.activeIndex, scope, false);
      }
    }
  }

  _moveMegaToIndex(index, scope, animate = true) {
    if (!scope || !index) return;
    const tab = scope.tabs.find((t) => t.dataset.megaTab === index);
    if (tab) this._moveMega(tab, animate);
  }

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
      pill.getBoundingClientRect();
      pill.style.transition = '';
      pill.classList.add('main-nav__mega-pill--on');
    } else {
      pill.style.width = rect.width + 'px';
      pill.style.height = rect.height + 'px';
      pill.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    }

    this._setLit(tab, scope);
  }

  _setLit(tab, scope) {
    for (const t of scope.tabs) {
      t.classList.toggle('main-nav__mega-cat-link--lit', t === tab);
    }
  }

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

  _cancelClose() {
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
  }

  _scheduleClose() {
    this._cancelClose();
    this._closeTimer = setTimeout(() => {
      this._closeTimer = null;
      this._close();
    }, this._MEGA_CLOSE_DELAY);
  }

  _closeGroups() {
    for (const g of this._groups) g.classList.remove('is-open');
    if (this._megaSwitchTimer) {
      clearTimeout(this._megaSwitchTimer);
      this._megaSwitchTimer = null;
    }
  }

  _close() {
    this._closeGroups();
    this._hide();

    for (const scope of this._scopes) {
      if (scope.activeIndex) this._moveMegaToIndex(scope.activeIndex, scope, true);
    }
  }

  _openGroup(item) {

    const wasOpen = item.classList.contains('is-open');
    for (const g of this._groups) {
      if (g !== item) g.classList.remove('is-open');
    }
    item.classList.add('is-open');
    if (!wasOpen) {

      const scope = this._scopeOf(item);
      if (scope) this._moveMegaToIndex(scope.defaultIndex, scope, false);
    }
  }
}

customElements.define('nav-pill', NavPill);
