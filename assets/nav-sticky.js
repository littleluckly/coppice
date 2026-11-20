
if (!customElements.get('nav-sticky')) {
  customElements.define(
    'nav-sticky',
    class NavSticky extends HTMLElement {
      connectedCallback() {
        this._target = this.closest('.main-nav-section');
        if (!this._target) return;

        this._stuck = false;
        this._onScroll = () => this._sync();
        window.addEventListener('scroll', this._onScroll, { passive: true });
        window.addEventListener('resize', this._onScroll, { passive: true });
        this._sync();
      }

      disconnectedCallback() {
        window.removeEventListener('scroll', this._onScroll);
        window.removeEventListener('resize', this._onScroll);
      }

      _sync() {
        const stuck = this._target.getBoundingClientRect().top <= 0.5 && window.scrollY > 0.5;
        if (stuck !== this._stuck) {
          this._stuck = stuck;
          this._target.classList.toggle('is-stuck', stuck);
        }
      }
    }
  );
}
