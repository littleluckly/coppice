/**
 * pickup-availability — 门店自提可挂性（task-product T-2.1，强制项 #12）。
 *
 * Skeleton 没有任何自提 UI，这里按平台能力自建：
 *   · 首帧由 Liquid 用 `variant.store_availabilities` 直接渲染（无 JS 也有内容）
 *   · 切变体后库存不同 → 用 Section Rendering API 重取这一段：
 *       /products/<handle>?variant=<id>&section_id=<sectionId>
 *     只解析回包里的 `[data-pickup-block]` 并整体替换，不整页刷新。
 *
 * 替换的是**整个 block 节点**而不是它的 innerHTML —— 新节点里的
 * `<pickup-availability>` 会重新 upgrade 并重新订阅，旧节点的监听随 DOM 一起销毁，
 * 不会叠加（与集合页局部刷新的处理同源）。
 *
 * 失败静默降级：取不到就保留上一次的文案，并在区块上标 aria-busy，不阻塞加购。
 */
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
      /* 静默：保留旧文案，不打断购买主流程 */
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
