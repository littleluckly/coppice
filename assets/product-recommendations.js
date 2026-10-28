/**
 * product-recommendations — 官方推荐区块的取数壳（task-product T-2.3 退化路径 + T-2.6）。
 *
 * 一个组件服务两种意图，靠元素的 `data-intent` 区分（related / complementary）：
 * 拉取 `data-url`（Liquid 侧已拼好 section_id + product_id + limit + intent），
 * 解析回包里的 `[data-recommendations-container]`，替换本地容器的 innerHTML。
 *
 * 为什么不在服务端直接渲染：产品页首次渲染时 `recommendations` 对象不存在，
 * 官方要求走 `/recommendations/products` 这条独立请求（会重跑一次该 section）。
 *
 * **空结果整块隐藏**：容器替换后若没有卡片，把外层 section 一起隐藏 ——
 * 否则页面上会留下一个"Similar Mowers"标题和一片空白（SDK 常见缺陷）。
 *
 * 失败静默：拿不到推荐只是少一个营销位，不该在购买主流程上报错。
 */
class ProductRecommendations extends HTMLElement {
  connectedCallback() {
    this._url = (this.dataset.url || '').trim();
    this._container = this.querySelector('[data-recommendations-container]');
    if (!this._url || !this._container) return;

    // 服务端首帧已有内容（比如被缓存过）就不再重复请求
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
        this._hide();
        return;
      }

      this._container.innerHTML = fresh.innerHTML;
      // 新注入的卡片需要重新初始化交互组件（tilt / quick-add 在 DOM 插入后自动升级，
      // 无需手动调用；但对比勾选的 aria-pressed 初始态由元素自身 connectedCallback 同步）
      this.dispatchEvent(new CustomEvent('recommendations:loaded', { bubbles: true }));
    } catch (error) {
      if (error.name === 'AbortError') return;
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
