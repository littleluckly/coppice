/**
 * supplies-bundle — 耗材区「Add all N items」（task-product T-2.3）。
 *
 * 一次 `POST /cart/add.js` 提交多行（`items: [{id, quantity}]`）。
 * 数量来自各卡片的隐藏 `[data-supply-qty]`，所以单卡上改过数量也能带上 —— 目前卡内
 * 不暴露数量输入（配件一口价一件），留这个读取口是为了将来加步进器时不用改本文件。
 *
 * **不做捆绑折扣**：只提交多行，价格与平台完全一致。买赠/捆绑定价是审核红线。
 *
 * 事件沿用 quick-add.js 契约：cart:added（点击即冒泡，飞入动画）+ cart:updated（角标）。
 * 无 JS：按钮不出现（`<supplies-bundle>` 由 Liquid 只在 N>1 时输出，且按钮本身不给表单
 * 提交兜底 —— 单卡各自可加购，功能不缺失）。
 */
class SuppliesBundle extends HTMLElement {
  static REVERT_DELAY_MS = 2500;

  _controller = new AbortController();
  _revertTimer = null;

  connectedCallback() {
    this._button = this.querySelector('[data-bundle-add]');
    this._status = this.querySelector('[data-bundle-status]');
    this._scope = this.closest('.product-supplies') || document;
    if (!this._button) return;

    this._defaultLabel = this._button.textContent.trim();
    this._button.addEventListener('click', this._onClick, { signal: this._controller.signal });
  }

  disconnectedCallback() {
    this._controller.abort();
    if (this._revertTimer) clearTimeout(this._revertTimer);
  }

  _collectItems() {
    const nodes = this._scope.querySelectorAll('[data-supply-qty]');
    const map = new Map();
    nodes.forEach((node) => {
      const id = Number(node.dataset.supplyId || node.value);
      if (!Number.isFinite(id) || id <= 0) return;
      const qty = Math.max(1, parseInt(node.value, 10) || 1);
      map.set(id, qty);
    });
    return Array.from(map, ([id, quantity]) => ({ id, quantity }));
  }

  _onClick = async () => {
    if (this._button.disabled) return;
    const items = this._collectItems();
    if (items.length === 0) return;

    this._button.disabled = true;
    this._button.dataset.state = 'pending';
    this._button.textContent = this._button.dataset.addingLabel || this._defaultLabel;
    this._announce('');

    this.dispatchEvent(
      new CustomEvent('cart:added', { bubbles: true, detail: { button: this._button } })
    );

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items }),
        signal: this._controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this._button.dataset.state = 'added';
      this._button.textContent = this._button.dataset.addedLabel || this._defaultLabel;
      this._revertTimer = setTimeout(() => this._reset(), SuppliesBundle.REVERT_DELAY_MS);
      this._syncCartCount();
    } catch (error) {
      if (error.name === 'AbortError') return;
      delete this._button.dataset.state;
      this._button.disabled = false;
      this._button.textContent = this._defaultLabel;
      this._announce(this._button.dataset.errorLabel || '');
    }
  };

  _reset() {
    delete this._button.dataset.state;
    this._button.disabled = false;
    this._button.textContent = this._defaultLabel;
    this._announce('');
  }

  _announce(message) {
    if (this._status) this._status.textContent = message;
  }

  async _syncCartCount() {
    try {
      const response = await fetch('/cart.js', {
        headers: { Accept: 'application/json' },
        signal: this._controller.signal,
      });
      if (!response.ok) return;
      const cart = await response.json();
      if (typeof cart.item_count !== 'number') return;
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: cart.item_count } }));
    } catch (error) {
      if (error.name !== 'AbortError') return;
    }
  }
}

if (!customElements.get('supplies-bundle')) {
  customElements.define('supplies-bundle', SuppliesBundle);
}
