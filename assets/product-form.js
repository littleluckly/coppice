/**
 * product-form — 买盒三件：变体选择、数量步进、加购提交（task-product T-2.1）。
 *
 * **两个宿主**（2026-11-21 起）：产品页买盒（sections/main-product.liquid）与商品卡
 * 快速查看弹窗（snippets/quick-view.liquid）。选择器标记在
 * snippets/variant-picker.liquid；本文件靠 `closest('[data-variant-scope]')` 找作用域，
 * 不认"哪个页面"——作用域里只要有那几个 data-* 钩子就工作（约定见 quick-view 的注释）。
 *
 * 三个 Custom Element 分居三职，互不越界：
 *   <variant-picker>  选变体 → 解析 variant → 回写隐藏 id / 价格 / 按钮态 → 派发 variant:change
 *   <quantity-input>  加减数量（下限 1，不写死上限：库存由平台在提交时判定）
 *   <product-form>    拦截提交 → POST /cart/add → 按钮态 + aria-live 播报 + 购物车角标同步
 *
 * **价格不自己拼货币格式**：变体 JSON 里的价格串是 Liquid 侧 `money` 过滤器的产物，
 * JS 只做替换。货币符号、千分位、小数点全由平台决定 —— 自己拼会在多货币市场露馅。
 *
 * 无 JS：变体是原生 radio（带 form 属性可随表单提交）、数量是原生 number、提交是真表单
 * POST /cart/add（跳转购物车页）——渐进增强底线（SDD §6.3 同源原则）。
 *
 * 购买选项（G-12，2026-11-18）：订阅计划选择不在这里实现，归 `selling-plan-picker`
 * （assets/selling-plan-picker.js）。本文件只做一件事——提交前调一次它的 `validate()`，
 * 强制订阅却没选计划就拦下。计划可用性、计划价、提示文案全在那一边，别在这重复实现。
 *
 * 事件约定沿用 quick-add.js（2026-10-16 起）：
 *   cart:added      点击即冒泡，detail.button —— fly-to-cart.js 飞入动画 + 抽屉开骨架
 *   cart:updated    document，detail.count —— cart-badge.js 角标 + 抽屉收骨架刷新
 *   cart:add-failed document（2026-11-20 BUG-083）—— 抽屉退出骨架等待
 *   variant:change  document，detail.{variantId, mediaId, available} —— product-gallery.js 切图
 */
class VariantPicker extends HTMLElement {
  connectedCallback() {
    const dataEl = this.querySelector('[data-variant-json]');
    if (!dataEl) return;

    try {
      this._variants = JSON.parse(dataEl.textContent);
    } catch (error) {
      this._variants = [];
      return;
    }
    if (!Array.isArray(this._variants) || this._variants.length === 0) return;

    /* 作用域：产品页是 <section class="main-product" data-variant-scope>，
       商品卡快速查看是 <dialog class="quick-view" data-variant-scope> ——
       两处用同一套元素约定（2026-11-21 抽取时定的），所以本组件不认识"页面"，
       只认识"最近的作用域"。找不到就退化为不工作，不猜。 */
    this._scope = this.closest('[data-variant-scope]');
    if (!this._scope) return;

    this._formInput = this._scope.querySelector('[data-variant-input]');
    this._priceEl = this._scope.querySelector('[data-price]');
    this._compareEl = this._scope.querySelector('[data-compare-price]');
    this._saveEl = this._scope.querySelector('[data-save-badge]');
    this._saveTemplate = this.dataset.saveTemplate || this._scope.dataset.saveTemplate || '';
    this._button = this._scope.querySelector('[data-add-button]');

    this._controller = new AbortController();
    this.addEventListener('change', this._onChange, { signal: this._controller.signal });

    // 首次进入按当前选中项对齐一次（浏览器可能恢复了上次的表单状态）
    this._apply(this._resolve());
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  _onChange = () => {
    this._apply(this._resolve());
  };

  /** 按 option 位置顺序取当前选中值，逐项与 variant.options 比对 */
  _resolve() {
    const inputs = Array.from(this.querySelectorAll('input[data-option-position]:checked'));
    if (inputs.length === 0) return null;

    const selected = inputs
      .slice()
      .sort((a, b) => Number(a.dataset.optionPosition) - Number(b.dataset.optionPosition))
      .map((input) => input.value);

    return (
      this._variants.find(
        (variant) =>
          Array.isArray(variant.options) &&
          variant.options.length === selected.length &&
          variant.options.every((value, i) => value === selected[i])
      ) || null
    );
  }

  _apply(variant) {
    if (!variant) return;

    if (this._formInput) this._formInput.value = variant.id;

    if (this._priceEl) this._priceEl.textContent = variant.price;

    if (this._compareEl) {
      if (variant.compare) {
        this._compareEl.textContent = variant.compare;
        this._compareEl.removeAttribute('hidden');
      } else {
        this._compareEl.setAttribute('hidden', '');
      }
    }

    if (this._saveEl) {
      if (variant.compare && variant.save > 0 && this._saveTemplate) {
        this._saveEl.textContent = this._saveTemplate.replace('[percent]', variant.save);
        this._saveEl.removeAttribute('hidden');
      } else {
        this._saveEl.setAttribute('hidden', '');
      }
    }

    this._syncUnitPrice(variant);

    if (this._button) {
      const soldOutLabel = this._button.dataset.soldOutLabel || '';
      const addLabel = this._button.dataset.addLabel || '';
      this._button.disabled = !variant.available;
      this._button.textContent = variant.available ? addLabel : soldOutLabel;
      delete this._button.dataset.state;
    }

    document.dispatchEvent(
      new CustomEvent('variant:change', {
        detail: {
          variantId: variant.id,
          mediaId: variant.mediaId,
          available: variant.available,
          /* 带上所属作用域：同页可能存在第二个产品块（编辑器里加了两个 main-product）
             或一堆快速查看弹窗，监听方据此丢弃别人的变体事件。2026-11-18 桩测发现。
             值就是作用域元素上的 data-section-id —— 产品页是 section.id，
             弹窗是 product.id，只当不透明令牌用。 */
          sectionId: this._scope.dataset.sectionId || null,
        },
      })
    );
  }

  /** 单位计价：多变体价格时也要跟着变；原本没有这块就补一个，放在价格区后面。
      新建时的类名取作用域上的 data-unit-class（产品页默认 main-product__unit-price，
      快速查看是 quick-view__unit）—— 否则弹窗里会冒出一个只有产品页才有的类名，
      样式不生效，等于一行裸文本。 */
  _syncUnitPrice(variant) {
    let el = this._scope.querySelector('[data-unit-price]');
    if (!variant.unitPrice) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('p');
      el.className = this._scope.dataset.unitClass || 'main-product__unit-price';
      el.dataset.unitPrice = '';
      const priceBlock = this._scope.querySelector('[data-price-block]');
      if (priceBlock && priceBlock.parentNode) {
        priceBlock.parentNode.insertBefore(el, priceBlock.nextSibling);
      }
    }
    el.textContent = `${variant.unitPrice} / ${variant.unitReference || ''}`.trim();
  }
}

class QuantityInput extends HTMLElement {
  connectedCallback() {
    this._input = this.querySelector('[data-quantity-input]');
    this._minus = this.querySelector('[data-quantity-minus]');
    this._plus = this.querySelector('[data-quantity-plus]');
    if (!this._input) return;

    this._controller = new AbortController();
    const { signal } = this._controller;

    if (this._minus) this._minus.addEventListener('click', () => this._step(-1), { signal });
    if (this._plus) this._plus.addEventListener('click', () => this._step(1), { signal });
    this._input.addEventListener('change', () => this._clamp(), { signal });
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  _step(delta) {
    const current = this._value();
    const next = current + delta;
    if (next < this._min()) return;
    this._input.value = String(next);
  }

  _clamp() {
    const value = this._value();
    if (!Number.isFinite(value) || value < this._min()) {
      this._input.value = String(this._min());
    }
  }

  _min() {
    const min = Number(this._input.min);
    return Number.isFinite(min) && min > 0 ? min : 1;
  }

  _value() {
    const value = parseInt(this._input.value, 10);
    return Number.isFinite(value) ? value : this._min();
  }
}

class ProductForm extends HTMLElement {
  static REVERT_DELAY_MS = 2500;

  _controller = new AbortController();
  _revertTimer = null;

  connectedCallback() {
    this._form = this.querySelector('form');
    this._button = this.querySelector('[data-add-button]');
    this._status = this.querySelector('[data-form-status]');
    this._defaultLabel = this._button ? this._button.textContent.trim() : '';
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
    if (this._button.dataset.state === 'pending') return;

    /* 购买选项（G-12）：变体强制订阅却没选计划 → 就地拦住并提示。
       按官方 UX 指南，这类错误**不要**用禁用按钮表达（那会让人以为商品不可买），
       让按钮可点、点完说明原因。校验逻辑归 <selling-plan-picker>，这里只调用。 */
    const planPicker = this.querySelector('selling-plan-picker');
    if (planPicker && typeof planPicker.validate === 'function' && !planPicker.validate()) return;

    this._button.dataset.state = 'pending';
    this._button.disabled = true;

    // 飞入动画不等接口（与 quick-add 同口径）：点击即飞，弱网下不迟滞
    this.dispatchEvent(
      new CustomEvent('cart:added', { bubbles: true, detail: { button: this._button } })
    );

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
      /* 成功播报与按钮的「已加入」同寿：2.5s 后一起退场。
         文案是给"点下去那一下"看的即时反馈，不是页面内容 —— 不清掉的话它会
         永久留在 [data-form-status] 里，:empty 的隐藏也就永久失效：
         快速查看弹窗关掉再打开，上次那句"was added to your cart"还在，
         紧挨着新面板的按钮（2026-11-26 刘工）。
         只有这一条路径清（失败路径的 _reset 不清，错误提示要留在眼前）。 */
      this._revertTimer = setTimeout(() => {
        this._announce('');
        this._reset();
      }, ProductForm.REVERT_DELAY_MS);

      this._syncCartCount();
    } catch (error) {
      if (error.name === 'AbortError') return;
      /* 通知抽屉退出骨架等待（BUG-083：抽屉只等 cart:updated，失败时永远等不到） */
      document.dispatchEvent(new CustomEvent('cart:add-failed', { detail: { button: this._button } }));
      delete this._button.dataset.state;
      this._button.disabled = false;
      this._announce(this._button.dataset.errorMessage || '');
      this._reset();
    }
  };

  /** 按钮文字回到「加购」或「售罄」——售罄态由变体选择器维护，这里只恢复可用标签 */
  _reset() {
    delete this._button.dataset.state;
    if (!this._button.dataset.addLabel) {
      this._button.textContent = this._defaultLabel;
    }
    this._button.disabled = false;
  }

  /**
   * 播报：写进面板/买盒里的 [data-form-status]（aria-live 容器）。
   * **空串也是有效入参**（表示"撤掉播报"）——不能写成 `if (message)`，
   * 那样成功文案的退场就清不掉，`:empty` 的隐藏也回不来。
   */
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
      if (error.name !== 'AbortError') return; /* 其他错误静默：主流程已完成 */
    }
  }
}

if (!customElements.get('variant-picker')) {
  customElements.define('variant-picker', VariantPicker);
}
if (!customElements.get('quantity-input')) {
  customElements.define('quantity-input', QuantityInput);
}
if (!customElements.get('product-form')) {
  customElements.define('product-form', ProductForm);
}
