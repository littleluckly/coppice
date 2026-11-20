
class PickupAvailability extends HTMLElement {
  connectedCallback() {
    this._block = this.closest('[data-pickup-block]');
    this._url = (this.dataset.url || '').trim();
    this._sectionId = (this.dataset.sectionId || '').trim();
    this._variantId = (this.dataset.variantId || '').trim();

    if (!this._block || !this._url || !this._sectionId) return;

    this._controller = new AbortController();
    document.addEventListener('variant:change', this._onVariantChange, {
      signal: this._controller.signal,
    });
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  _onVariantChange = async (event) => {
    const variantId = event.detail && event.detail.variantId;
    if (!variantId || String(variantId) === String(this._variantId)) return;

    this._variantId = String(variantId);
    this._block.setAttribute('aria-busy', 'true');

    try {
      const url = `${this._url}?variant=${encodeURIComponent(variantId)}&section_id=${encodeURIComponent(
        this._sectionId
      )}`;
      const response = await fetch(url, {
        headers: { Accept: 'text/html' },
        signal: this._controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fresh = doc.querySelector('[data-pickup-block]');
      if (!fresh) return;

      this._block.replaceWith(fresh);
      document.dispatchEvent(new CustomEvent('pickup:updated'));
    } catch (error) {
      if (error.name === 'AbortError') return;

    } finally {
      if (this._block && this._block.isConnected) {
        this._block.removeAttribute('aria-busy');
      }
    }
  };
}

if (!customElements.get('pickup-availability')) {
  customElements.define('pickup-availability', PickupAvailability);
}
