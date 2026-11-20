
class NavDrawer extends HTMLElement {
  _dialog = null;
  _opener = null;
  _sheetEl = null;
  _closeButton = null;

  _dragEndedAt = 0;

  _abort = new AbortController();

  get _sheet() {
    const el = this._sheetEl;
    return el && typeof el.open === 'function' ? el : null;
  }

  _onOpen = () => {
    if (!this._dialog) return;

    const sheet = this._sheet;
    if (this._dialog.open && !sheet?.isClosing) return;

    this._resetToCurrent();

    if (sheet) sheet.open();
    else if (!this._dialog.open) this._dialog.showModal();

    this._centerCurrent();

    this._closeButton?.focus();
  };

  _onClose = () => {
    if (!this._dialog?.open) return;
    const sheet = this._sheet;
    if (sheet) sheet.close();
    else this._dialog.close();
  };

  _onDialogClose = () => {
    if (this._opener?.isConnected) this._opener.focus({ preventScroll: true });
  };

  _onDialogClick = (event) => {

    if (this._dragEndedAt && performance.now() < this._dragEndedAt) return;
    if (event.target === this._dialog) this._onClose();
  };

  _onToggle = (button) => {
    const open = button.getAttribute('aria-expanded') === 'true';

    if (!open) {
      const item = button.closest('.nav-drawer__item');
      const list = item?.parentElement;
      if (list) {
        for (const sibling of list.children) {
          if (sibling === item) continue;
          const other = sibling.querySelector(':scope > [data-nav-toggle][aria-expanded="true"]');
          if (other) this._setExpanded(other, false);
        }
      }
    }

    this._setExpanded(button, !open);
  };

  _setExpanded = (button, open) => {
    button.setAttribute('aria-expanded', open ? 'true' : 'false');

    const sub = document.getElementById(button.getAttribute('aria-controls') || '');
    if (!sub) return;

    if (!open) {
      sub.querySelectorAll('[data-nav-toggle][aria-expanded="true"]').forEach((nested) => {
        this._setExpanded(nested, false);
      });

      if (sub.contains(document.activeElement)) button.focus({ preventScroll: true });
    }

    sub.classList.toggle('is-open', open);
    sub.inert = !open;
  };

  _collapseAll = () => {
    this._dialog?.querySelectorAll('[data-nav-toggle][aria-expanded="true"]').forEach((button) => {
      this._setExpanded(button, false);
    });
  };

  _resetToCurrent = () => {
    this._collapseAll();
    this._dialog?.querySelectorAll('[data-nav-branch]').forEach((button) => {
      this._setExpanded(button, true);
    });
  };

  _centerCurrent = () => {
    const list = this._dialog?.querySelector('.nav-drawer__list');
    const current = this._dialog?.querySelector('.nav-drawer__link--current');
    if (!list || !current) return;

    const top = current.offsetTop - list.offsetTop;
    const target = top - (list.clientHeight - current.offsetHeight) / 2;
    list.scrollTop = Math.max(0, target);
  };

  _onSearch = (button) => {
    this.closest('nav')?.querySelector('search-drawer')?.open(button);
  };

  _onDragStart = (event) => {
    if (event.button > 0) return;

    if (this._sheet?.isClosing) return;

    const handle = event.target.closest('.nav-drawer__grabber, .nav-drawer__head--root');

    if (!handle || event.target.closest('[data-nav-drawer-close], [data-nav-search]')) return;

    const dialog = this._dialog;
    const startY = event.clientY;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let moved = false;

    const onMove = (moveEvent) => {
      const dy = moveEvent.clientY - startY;
      if (dy <= 0) return;
      moved = moved || dy > 8;

      dialog.style.animation = 'none';
      dialog.style.transition = 'none';
      dialog.style.transform = `translateY(${dy}px)`;
    };

    const onEnd = (endEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);

      const dy = endEvent.clientY - startY;
      const dismissAt = Math.max(120, dialog.offsetHeight * 0.3);

      if (moved && dy > dismissAt) {
        this._dragEndedAt = performance.now() + 350;

        const sheet = this._sheet;
        if (sheet) sheet.close({ fromDrag: true });
        else this._dialog.close();
        return;
      }

      if (moved && !reduce) dialog.style.transition = 'transform 0.22s ease-out';
      dialog.style.transform = '';
      window.setTimeout(
        () => {
          dialog.style.transition = '';
        },
        moved && !reduce ? 240 : 0
      );
      if (moved) this._dragEndedAt = performance.now() + 350;
    };

    window.addEventListener('pointermove', onMove, { signal: this._abort.signal });
    window.addEventListener('pointerup', onEnd, { signal: this._abort.signal });
    window.addEventListener('pointercancel', onEnd, { signal: this._abort.signal });
  };

  connectedCallback() {
    this._build();
    if (!this._dialog) return;

    const { signal } = this._abort;

    this._dialog.addEventListener('close', this._onDialogClose, { signal });
    this._dialog.addEventListener('click', this._onDialogClick, { signal });
    this._dialog.addEventListener('pointerdown', this._onDragStart, { signal });

    const opener = this.closest('nav')?.querySelector('[data-nav-drawer-open]');
    if (opener) {
      this._opener = opener;
      opener.addEventListener('click', this._onOpen, { signal });
    }
  }

  disconnectedCallback() {
    this._abort.abort();
  }

  _build() {
    this._dialog = this.querySelector('dialog[data-nav-drawer]');
    if (!this._dialog) return;

    this._sheetEl = this.querySelector('bottom-sheet');

    const template = this._dialog.querySelector('template[data-nav-drawer-template]');
    if (!template) return;

    if (this._dialog.dataset.built === 'true') return;

    this._dialog.append(template.content.cloneNode(true));
    this._dialog.dataset.built = 'true';

    this._dialog.setAttribute('scroll-lock', '');

    const { signal } = this._abort;

    const closeButtons = this._dialog.querySelectorAll('[data-nav-drawer-close]');
    this._closeButton = closeButtons[0] ?? null;
    closeButtons.forEach((button) => {
      button.addEventListener('click', this._onClose, { signal });
    });

    this._dialog.querySelectorAll('[data-nav-toggle]').forEach((button) => {
      button.addEventListener('click', () => this._onToggle(button), { signal });
    });

    this._dialog.querySelectorAll('[data-nav-search]').forEach((button) => {
      button.addEventListener('click', () => this._onSearch(button), { signal });
    });
  }
}

if (!customElements.get('nav-drawer')) {
  customElements.define('nav-drawer', NavDrawer);
}
