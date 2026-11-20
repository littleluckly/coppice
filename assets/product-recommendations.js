
class ProductRecommendations extends HTMLElement {
  connectedCallback() {
    this._url = (this.dataset.url || '').trim();
    this._container = this.querySelector('[data-recommendations-container]');
    if (!this._url || !this._container) return;

    if (this._container.querySelector('.product-card')) return;

    this._controller = new AbortController();
    this._section = this.closest('section');
    this._load();
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  async _load() {
    try {
      const response = await fetch(this._url, {
        headers: { Accept: 'text/html' },
        signal: this._controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fresh = doc.querySelector('[data-recommendations-container]');
      if (!fresh || !fresh.querySelector('.product-card')) {
        console.warn(
          '[product-recommendations] 接口返回 0 条推荐，本区块已隐藏。' +
            ' 常见原因：S&D 未配互补品 / 推荐商品缺货或未发布 / 价格 ≤ 0。url=',
          this._url
        );
        this._hide();
        return;
      }

      this._container.innerHTML = fresh.innerHTML;
      this.dispatchEvent(new CustomEvent('recommendations:loaded', { bubbles: true }));
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.warn('[product-recommendations] 拉取失败，本区块已隐藏：', this._url, error);
      this._hide();
    }
  }

  _hide() {
    if (this._section) this._section.hidden = true;
  }
}

if (!customElements.get('product-recommendations')) {
  customElements.define('product-recommendations', ProductRecommendations);
}
