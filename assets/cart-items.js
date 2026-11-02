/**
 * cart-items — 购物车行项的增删改（task-cart T-2.1）。
 *
 * 为什么是 Custom Element：AGENTS.md §6 的硬性约定——可交互组件自包含，
 * 不用 document 级全局委托。所有监听挂在元素自身，元素被局部替换时
 * disconnectedCallback 一次性 abort，不会在 Section Rendering 之后重复绑定。
 *
 * 刷新策略：POST /cart/change.js?sections=<本页所有 section id>
 *   · 服务端渲染回来的 HTML 直接换掉三个区域的根节点（行项 / 摘要 / 物流条）；
 *   · 不手写「把这个数字改成那个数字」——折扣、物流提示、订阅计划都是条件渲染，
 *     手改 DOM 必然漏条件。
 *   · 响应里没有 `sections`（老 API / 平台变更）→ 整页刷新兜底，不静默失败。
 *   · 删空购物车 → 整页刷新：空态与正常态的栅格差异太大，局部替换不划算。
 *
 * 无障碍：替换会让焦点消失，所以替换前记下「类型 + 所属行」，替换后找回来；
 * 目标行已被删则落到购物车标题。小计变化写进 [data-cart-live] 的 role="status"，
 * 文案模板由 Liquid 渲进 data 属性，脚本不硬编码英文。
 */
class CartItems extends HTMLElement {
  static DEBOUNCE_MS = 400;

  _controller = new AbortController();
  _inflight = new Map();
  _timer = null;

  connectedCallback() {
    if (!this.querySelector('#cart-form')) return;

    const { signal } = this._controller;
    this.addEventListener('click', this._onClick, { signal });
    this.addEventListener('input', this._onInput, { signal });
  }

  disconnectedCallback() {
    this._controller.abort();
    clearTimeout(this._timer);
    this._inflight.forEach((controller) => controller.abort());
    this._inflight.clear();
  }

  /** 减号 / 加号 / 移除，三种都走 click */
  _onClick = (event) => {
    const remove = event.target.closest('[data-cart-remove]');
    if (remove) {
      /* 无 JS 时这个链接是 GET url_to_remove，能直接删；有 JS 才接管 */
      event.preventDefault();
      const input = remove.closest('.cart-line')?.querySelector('[data-cart-qty-input]');
      this._change(remove.dataset.lineKey, 0, remove, input ? input.value : null);
      return;
    }

    const step = event.target.closest('[data-cart-qty]');
    if (!step) return;

    const input = step.closest('.cart-line__qty')?.querySelector('[data-cart-qty-input]');
    if (!input) return;

    const previous = parseInt(input.value, 10) || 0;
    const next = Math.max(0, previous + parseInt(step.dataset.cartQty, 10));
    if (next === previous) return;

    input.value = next;
    this._change(input.dataset.lineKey, next, step, previous);
  };

  /** 键盘输入：input 事件已经覆盖逐字输入，400ms 防抖兜住连续敲键盘 */
  _onInput = (event) => {
    const input = event.target.closest('[data-cart-qty-input]');
    if (!input) return;
    this._schedule(input);
  };

  _schedule(input) {
    clearTimeout(this._timer);
    const previous = input.dataset.committed ?? input.defaultValue;
    this._timer = setTimeout(() => {
      const next = Math.max(0, parseInt(input.value, 10) || 0);
      if (String(next) === String(previous)) return;
      this._change(input.dataset.lineKey, next, input, Number(previous));
    }, CartItems.DEBOUNCE_MS);
  }

  async _change(lineKey, quantity, source, previousQuantity) {
    const changeUrl = this.dataset.cartChangeUrl;
    if (!changeUrl || !lineKey) return;

    /* 同一行连点：后一次取消前一次，避免乱序响应把旧数量盖回来 */
    this._inflight.get(lineKey)?.abort();
    const controller = new AbortController();
    this._inflight.set(lineKey, controller);

    const focus = this._captureFocus(source);
    this.setAttribute('aria-busy', 'true');

    try {
      const ids = this._sectionIds();
      const url = ids.length ? `${changeUrl}?sections=${encodeURIComponent(ids.join(','))}` : changeUrl;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: lineKey, quantity }),
        signal: controller.signal,
      });

      const cart = await response.json();
      if (!response.ok || cart.status) {
        throw new Error((cart && cart.description) || `cart change failed: ${response.status}`);
      }

      if (cart.item_count === 0) {
        window.location.reload();
        return;
      }

      if (cart.sections) {
        this._render(cart.sections);
      } else {
        window.location.reload();
        return;
      }

      this._restoreFocus(focus);
      this._announceTotal();
      this._announceCount(cart.item_count);
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (previousQuantity !== null && previousQuantity !== undefined && source) {
        const input = source.matches('[data-cart-qty-input]')
          ? source
          : source.closest('.cart-line')?.querySelector('[data-cart-qty-input]');
        if (input) input.value = previousQuantity;
      }
      this._announceMessage(this.dataset.errorMessage);
    } finally {
      if (this._inflight.get(lineKey) === controller) this._inflight.delete(lineKey);
      this.removeAttribute('aria-busy');
    }
  }

  /** 本页所有参与刷新的 section id（各自用 Liquid 输出在 data-cart-section 上） */
  _sectionIds() {
    return Array.from(document.querySelectorAll('[data-cart-section]'))
      .map((el) => el.dataset.cartSection)
      .filter(Boolean);
  }

  _render(sections) {
    Object.entries(sections).forEach(([id, html]) => {
      if (!html) return;
      const target = document.querySelector(`[data-cart-section="${id}"]`);
      if (!target) return;

      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const next = parsed.querySelector(`[data-cart-section="${id}"]`) || parsed.body.firstElementChild;
      if (!next) return;

      target.replaceWith(next);
    });
  }

  /** 记录焦点落点：类型 + 所属行，替换后按同一条件找回 */
  _captureFocus(source) {
    if (!source || !source.isConnected) return null;

    let kind = null;
    if (source.matches('[data-cart-qty-input]')) kind = 'input';
    else if (source.matches('[data-cart-remove]')) kind = 'remove';
    else if (source.matches('[data-cart-qty]')) kind = `step${source.dataset.cartQty}`;

    if (!kind) return null;
    const line = source.closest('[data-line-key]');
    return { kind, lineKey: line ? line.dataset.lineKey : null };
  }

  _restoreFocus(descriptor) {
    if (!descriptor) return;

    const line = descriptor.lineKey
      ? document.querySelector(`[data-line-key="${descriptor.lineKey}"]`)
      : null;

    let target = null;
    if (line) {
      if (descriptor.kind === 'input') target = line.querySelector('[data-cart-qty-input]');
      else if (descriptor.kind === 'remove') target = line.querySelector('[data-cart-remove]');
      else target = line.querySelector(`[data-cart-qty="${descriptor.kind.replace('step', '')}"]`);
    }

    /* 整行被删（数量归零）：落到标题，屏幕阅读器会重新念出「Cart」与数量 */
    if (!target) target = document.querySelector('.cart-lines__title');

    if (target) target.focus({ preventScroll: true });
  }

  _announceTotal() {
    const template = this.dataset.cartLiveTemplate;
    const total = document.querySelector('.cart-summary__total-value');
    if (!template || !total) return;
    this._announceMessage(template.replace('[total]', total.textContent.trim()));
  }

  _announceMessage(message) {
    const live = document.querySelector('[data-cart-live]');
    if (!live || !message) return;
    /* 同一句话连写两次不会重新播报——先清空再写，强制产生一次文本变更 */
    live.textContent = '';
    requestAnimationFrame(() => {
      live.textContent = message;
    });
  }

  /** 页头角标靠这个事件同步（assets/cart-badge.js） */
  _announceCount(count) {
    if (typeof count !== 'number') return;
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { count } }));
  }
}

if (!customElements.get('cart-items')) {
  customElements.define('cart-items', CartItems);
}
