/**
 * quick-add — 商品卡快速加购（task-collection T-1.1）。
 *
 * 渲染条件（snippet 侧已裁）：仅单变体且 available 的商品卡输出本元素。
 * 行为：拦截表单提交 → POST /cart/add.js → 按钮短暂 "Added" 态 + role=status 播报。
 * 无 JS：表单原生 POST /cart/add（跳转购物车页）——渐进增强底线（SDD §6.3 同源原则）。
 * 可复用：Collection Rendering 替换 DOM 后重新 connected 也不会重复绑定
 *（监听挂在自身，元素被替换即随旧 DOM 销毁，AbortController 一次性拆除）。
 */
class QuickAdd extends HTMLElement {
  static REVERT_DELAY_MS = 2500;

  _controller = new AbortController();
  _revertTimer = null;

  connectedCallback() {
    this._form = this.querySelector('form');
    this._button = this.querySelector('button');
    this._status = this.querySelector('[data-quick-add-status]');
    this._defaultLabel = this._button ? this._button.textContent : '';
    if (!this._form || !this._button) return;
    this._form.addEventListener('submit', this._onSubmit, { signal: this._controller.signal });
  }

  disconnectedCallback() {
    this._controller.abort();
    if (this._revertTimer) clearTimeout(this._revertTimer);
  }

  _onSubmit = async (event) => {
    event.preventDefault();
    if (this._button.disabled) return;

    this._button.disabled = true;
    this._button.dataset.state = 'pending';

    try {
      const response = await fetch(this._form.action, {
        method: 'POST',
        body: new FormData(this._form),
        headers: { Accept: 'application/javascript' },
        signal: this._controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      this._button.dataset.state = 'added';
      this._button.textContent = this._button.dataset.addedLabel || this._defaultLabel;
      this._announce(this._button.dataset.addedMessage || '');
      this._revertTimer = setTimeout(() => this._reset(), QuickAdd.REVERT_DELAY_MS);

      /* 2026-10-16 刘工：加购后页头角标同步 + 飞入动画。
         cart:added —— 立即冒泡（fly-to-cart.js 监听，拿按钮定位来源卡片）；
         cart:updated —— /cart.js 查回准确 item_count 后派发（cart-badge.js 监听）。
         两个监听方都挂在 document，本元素被局部刷新替换也不影响订阅。 */
      this.dispatchEvent(
        new CustomEvent('cart:added', { bubbles: true, detail: { button: this._button } })
      );
      this._syncCartCount();
    } catch (error) {
      if (error.name === 'AbortError') return;
      this._button.dataset.state = '';
      this._announce(this._button.dataset.errorMessage || '');
      this._reset();
    }
  };

  _reset() {
    this._button.disabled = false;
    delete this._button.dataset.state;
    this._button.textContent = this._defaultLabel;
  }

  _announce(message) {
    if (this._status && message) this._status.textContent = message;
  }
}

if (!customElements.get('quick-add')) {
  customElements.define('quick-add', QuickAdd);
}
