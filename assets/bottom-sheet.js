
class BottomSheet extends HTMLElement {
  connectedCallback() {
    this._dialog = this.querySelector(':scope > dialog');
    if (!this._dialog) return;

    this._ac?.abort();
    this._ac = new AbortController();
    const { signal } = this._ac;
    this._dialog.addEventListener('cancel', this._onCancel, { signal });
    this._dialog.addEventListener('close', this._onClose, { signal });
  }

  disconnectedCallback() {
    this._ac?.abort();

    if (this._dialog?.open) this._dialog.close();
  }

  get isOpen() {
    return !!this._dialog?.open;
  }

  get isClosing() {
    return !!this._dialog?.classList.contains('is-closing');
  }

  open() {
    const dialog = this._dialog;
    if (!dialog) return;

    this._closeGen = (this._closeGen || 0) + 1;
    this._resetStyles();
    if (!dialog.open) dialog.showModal();
    this._playEnter();
  }

  close({ fromDrag = false } = {}) {
    const dialog = this._dialog;

    if (!dialog?.open || this.isClosing) return;

    dialog.style.animation = '';
    if (!this._animates) {
      dialog.close();
      return;
    }
    dialog.classList.remove('is-entering');
    dialog.classList.add('is-closing');
    const gen = (this._closeGen = (this._closeGen || 0) + 1);
    let done = false;
    const finish = () => {
      if (done || gen !== this._closeGen) return;
      done = true;
      dialog.close();
      this._reset();
    };
    if (fromDrag) {

      dialog.style.transition = 'transform 0.22s ease-in';
      dialog.style.transform = 'translateY(100%)';
      const onTransEnd = (event) => {
        if (event.target !== dialog || event.propertyName !== 'transform') return;
        dialog.removeEventListener('transitionend', onTransEnd);
        finish();
      };
      dialog.addEventListener('transitionend', onTransEnd);
    } else {
      dialog.classList.add('is-close-anim');
      const onAnimEnd = (event) => {

        if (event.pseudoElement) return;
        dialog.removeEventListener('animationend', onAnimEnd);
        finish();
      };
      dialog.addEventListener('animationend', onAnimEnd);
    }

    window.setTimeout(finish, 320);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  _onCancel = (event) => {

    event.preventDefault();
    this.close();
  };

  _onClose = () => {

    this._reset();
  };

  get _animates() {
    const media = this.getAttribute('media');
    if (media && !window.matchMedia(media).matches) return false;
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  _playEnter() {
    const dialog = this._dialog;
    if (!this._animates) return;
    dialog.classList.remove('is-entering', 'is-closing', 'is-close-anim');

    void dialog.offsetWidth;
    dialog.classList.add('is-entering');
    const stop = () => {
      dialog.removeEventListener('animationend', onEnd);
      dialog.classList.remove('is-entering');
    };
    const onEnd = (event) => {

      if (event.pseudoElement) return;
      stop();
    };
    dialog.addEventListener('animationend', onEnd);
    window.setTimeout(stop, 420);
  }

  _reset() {
    const dialog = this._dialog;
    if (!dialog) return;
    dialog.classList.remove('is-entering', 'is-closing', 'is-close-anim');
    this._resetStyles();
  }

  _resetStyles() {
    const dialog = this._dialog;
    if (!dialog) return;
    dialog.style.animation = '';
    dialog.style.transition = '';
    dialog.style.transform = '';
  }
}

if (!customElements.get('bottom-sheet')) {
  customElements.define('bottom-sheet', BottomSheet);
}
