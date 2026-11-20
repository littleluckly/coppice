
const CHECK_SVG =
  '<svg class="facets__sort-check" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 5"/></svg>';

const CHEVRON_SVG =
  '<svg class="facets__sort-chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>';

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

    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;

    this._mq = window.matchMedia('(min-width: 990px)');
    this._mq.addEventListener('change', this._onMq, { signal });
    this.addEventListener('click', this._onClick, { signal });
    this.addEventListener('keydown', this._onKeydown, { signal });

    document.addEventListener('pointerdown', this._onDocPointerDown, { signal });

    this._enhance();
  }

  disconnectedCallback() {

    this._abort?.abort();
    this._open = false;
    if (this._sheet?.open) this._sheet.close();
  }

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

  _ensureSheet() {
    if (this._sheet) return;

    const sheet = document.createElement('dialog');
    sheet.className = 'facets__sort-sheet';
    sheet.setAttribute('scroll-lock', '');

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

    sheet.addEventListener('click', (event) => {
      if (event.target === sheet && !this._sheetEl?.isClosing) this._closePanel();
    });

    sheet.addEventListener('pointerdown', this._onSheetDragStart);

    sheet.addEventListener('close', () => {
      this._list.hidden = true;
      if (this._list.parentElement !== this) this.append(this._list);
    });

    const wrapper = document.createElement('bottom-sheet');
    wrapper.setAttribute('media', '(max-width: 989.98px)');
    wrapper.append(sheet);

    this._sheet = sheet;
    this._sheetEl = wrapper;
    this._sheetBody = body;
    this.append(wrapper);
  }

  _isMobile() {
    return !this._mq.matches;
  }

  _openPanel() {
    this._ensureList();

    if (this._list.parentElement !== this) this.append(this._list);

    this._open = true;
    this._activeIndex = this._select.selectedIndex;

    if (this._isMobile()) {
      this._ensureSheet();

      this._sheetBody.append(this._list);
      this._list.hidden = false;
      this._paint();
      this._openSheet();
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

    if (this._sheet?.open) {
      this._closeSheet({ fromDrag });
      return;
    }

    this._list.hidden = true;
    if (this._list.parentElement !== this) this.append(this._list);
  }

  _openSheet() {
    if (this._sheetEl && typeof this._sheetEl.open === 'function') this._sheetEl.open();
    else if (!this._sheet.open) this._sheet.showModal();
  }

  _closeSheet(options) {
    if (this._sheetEl && typeof this._sheetEl.close === 'function') this._sheetEl.close(options);
    else if (this._sheet.open) this._sheet.close();
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

    if (changed) this._select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  _onClick = (event) => {
    if (!this._built || this._btn.hidden) return;

    if (this._dragEndedAt && performance.now() < this._dragEndedAt) return;

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
        this._closePanel(false);
        break;
    }
  };

  _onDocPointerDown = (event) => {

    if (this._open && !this.contains(event.target)) this._closePanel(false);
  };

  _onSheetDragStart = (event) => {
    if (event.button > 0) return;
    const sheet = this._sheet;
    if (!sheet || !sheet.open) return;

    const handle = event.target.closest('.facets__grabber, .facets__sort-sheet-head');
    if (!handle) return;

    if (this._sheetEl?.isClosing) return;

    const startY = event.clientY;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let moved = false;

    const onMove = (moveEvent) => {
      const dy = moveEvent.clientY - startY;
      if (dy <= 0) return;
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

        this._closePanel(true, true);
        return;
      }

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

    if (this._open) this._closePanel(false);
  };
}

if (!customElements.get('facet-sort')) {
  customElements.define('facet-sort', FacetSort);
}
