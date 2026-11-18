/**
 * selling-plan-picker — 产品页购买选项（订阅 / 预购 / 试用后再买）。
 *
 * 职责三件，全部围绕「选中计划」这一个状态：
 *  1. 按当前变体禁用/隐藏不适用的计划（平台事实：变体之间可支持的销售计划不同）
 *  2. 选中计划时把价格区换成 allocation 价（含划线价与 Save N%），未选时回到变体价
 *  3. 变体强制订阅却没选计划时，拦住提交并给出可读提示（官方 UX 指南要求：
 *     不要靠禁用按钮表达，要允许点击后说明原因）
 *
 * 数据来自 Liquid 侧的数据岛（`[data-plan-json]`）：每变体的基础价 + 该变体各计划的
 * allocation 价 + `requiresPlan`。不额外请求，不在 JS 里拼货币格式。
 *
 * **价格区归属**：变体切换时 `variant-picker` 先写变体价，本组件在 `variant:change`
 * （同步派发）里覆盖成计划价。顺序由事件同步性保证，不是巧合——要改这条链，
 * 先读 `assets/product-form.js` 的 VariantPicker._apply。
 *
 * 无 JS：radio 是原生表单控件，选中项随 form 提交 `selling_plan`；价格区由 Liquid 按
 * `product.selected_selling_plan_allocation` 渲染。降级路径不需要本文件。
 */
class SellingPlanPicker extends HTMLElement {
  connectedCallback() {
    const dataEl = this.querySelector('[data-plan-json]');
    if (!dataEl) return;

    try {
      this._data = JSON.parse(dataEl.textContent);
    } catch (error) {
      /* 数据岛坏了就整块不接管：radio 仍是原生控件，表单照常可提交 */
      return;
    }
    if (!this._data || typeof this._data !== 'object') return;

    this._section = this.closest('.main-product');
    if (!this._section) return;

    this._priceEl = this._section.querySelector('[data-price]');
    this._compareEl = this._section.querySelector('[data-compare-price]');
    this._saveEl = this._section.querySelector('[data-save-badge]');
    this._status = this._section.querySelector('[data-form-status]');
    this._saveTemplate = this.dataset.saveTemplate || '';
    this._oneTime = this.querySelector('[data-one-time]');
    this._variantId = String(this.dataset.variantId || '');

    this._controller = new AbortController();
    const { signal } = this._controller;

    /* 组件内部的事件委托（不跨元素、不碰 document 的 click） */
    this.addEventListener('change', this._onChange, { signal });

    /* 变体切换由 variant-picker 派发，契约见 product-form.js 头部注释 */
    document.addEventListener('variant:change', this._onVariantChange, { signal });

    this._sync(this._currentVariantId(), true);
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  _onChange = (event) => {
    if (!event.target.matches('[data-plan-radio]')) return;
    const variant = this._data[this._currentVariantId()];
    if (variant) this._renderPrice(variant);
  };

  _onVariantChange = (event) => {
    const variantId = event.detail && event.detail.variantId;
    if (variantId === undefined || variantId === null) return;
    this._sync(String(variantId), true);
  };

  /** 当前变体以表单里的隐藏 id 为准（variant-picker 会回写它），数据岛 id 作兜底 */
  _currentVariantId() {
    const input = this._section.querySelector('[data-variant-input]');
    const value = input ? String(input.value) : '';
    return value || this._variantId;
  }

  /**
   * @param {string} variantId
   * @param {boolean} resetSelection 变体切换（或首次渲染）时，若选中项失效要落到一次性购买
   */
  _sync(variantId, resetSelection) {
    const variant = this._data[variantId];
    if (!variant) return;

    this._variantId = variantId;

    this.querySelectorAll('[data-plan-id]').forEach((radio) => {
      const allowed = Object.prototype.hasOwnProperty.call(variant.plans || {}, radio.dataset.planId);
      radio.disabled = !allowed;
      const option = radio.closest('[data-plan-option]');
      if (option) option.hidden = !allowed;
      if (!allowed && radio.checked) radio.checked = false;
    });

    if (this._oneTime) {
      const allowed = !variant.requiresPlan;
      this._oneTime.disabled = !allowed;
      const option = this._oneTime.closest('[data-plan-option]');
      if (option) option.hidden = !allowed;
      if (!allowed && this._oneTime.checked) this._oneTime.checked = false;
    }

    /* 组内一个可用选项都没有就整组收掉（否则会留下只有标题的空壳） */
    this.querySelectorAll('[data-plan-group]').forEach((group) => {
      const hasOption = Array.from(group.querySelectorAll('[data-plan-option]')).some((el) => !el.hidden);
      group.hidden = !hasOption;
    });

    if (
      resetSelection &&
      !this.querySelector('[data-plan-radio]:checked') &&
      this._oneTime &&
      !this._oneTime.disabled
    ) {
      this._oneTime.checked = true;
    }

    this._renderPrice(variant);
  }

  /**
   * 价格区：选中的是计划就用 allocation 价，否则用变体自身的价。
   * 与 VariantPicker._apply 的价格段同口径——改这里要同步 `assets/product-form.js`。
   */
  _renderPrice(variant) {
    const checked = this.querySelector('[data-plan-radio]:checked');
    const planId = checked && checked.dataset.planId;
    const plan = planId ? (variant.plans || {})[planId] : null;
    const price = plan || variant;

    if (this._priceEl && price.price) this._priceEl.textContent = price.price;

    if (this._compareEl) {
      if (price.compare) {
        this._compareEl.textContent = price.compare;
        this._compareEl.removeAttribute('hidden');
      } else {
        this._compareEl.setAttribute('hidden', '');
      }
    }

    if (this._saveEl) {
      if (price.compare && price.save > 0 && this._saveTemplate) {
        this._saveEl.textContent = this._saveTemplate.replace('[percent]', price.save);
        this._saveEl.removeAttribute('hidden');
      } else {
        this._saveEl.setAttribute('hidden', '');
      }
    }
  }

  /**
   * 提交前校验：变体强制订阅（`variant.requires_selling_plan`）却没有选中计划 → false。
   * 由 `<product-form>` 在 submit 里调用（同 section 内的显式协作，不是全局委托）。
   * 提示走买盒已有的 `[data-form-status]`（role="status"），并把焦点送到第一个可用选项。
   */
  validate() {
    const variant = this._data[this._currentVariantId()];
    if (!variant || !variant.requiresPlan) return true;
    if (this.querySelector('[data-plan-radio]:checked')) return true;

    const target = this.querySelector('[data-plan-radio]:not(:disabled)');
    if (target) target.focus();
    if (this._status && this.dataset.requiredMessage) {
      this._status.textContent = this.dataset.requiredMessage;
    }
    return false;
  }
}

if (!customElements.get('selling-plan-picker')) {
  customElements.define('selling-plan-picker', SellingPlanPicker);
}
