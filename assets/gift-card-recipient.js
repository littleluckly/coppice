/**
 * gift-card-recipient — 礼品卡产品页的「寄给收件人」开关（合规项 G-09）。
 *
 * 无 JS 底线（Skeleton 渐进增强同源原则）：
 *   复选框出厂 disabled → 不提交；隐藏域提交 if_present → 平台按
 *   「有收件人信息就寄给收件人」处理；四个字段始终可填。
 * 脚本接管后（本文件）反过来：
 *   复选框恢复可提交、隐藏域禁用，字段默认收起、勾选才展开并可提交。
 *
 * 时区偏移：properties[__shopify_offset] 填 new Date().getTimezoneOffset()（分钟，
 * 东八区 = -480）。平台靠它把「寄送日期」落到收件人那天的投递窗口，
 * 不填或填反会让排期差一天。
 *
 * 状态一律走属性：宿主上的 `open` 表示「正在寄给收件人」，样式靠
 * `:defined:not([open])` 收放字段——不用 JS 切 class，也不用内联样式。
 */
class GiftCardRecipient extends HTMLElement {
  _controller = null;

  connectedCallback() {
    if (this._controller) return;

    this._checkbox = this.querySelector('[data-recipient-checkbox]');
    this._fields = this.querySelector('[data-recipient-fields]');
    this._control = this.querySelector('[data-recipient-control]');
    this._offset = this.querySelector('[data-recipient-offset]');
    if (!this._checkbox || !this._fields) return;

    this._inputs = Array.from(this._fields.querySelectorAll('input, textarea'));

    this._controller = new AbortController();
    this.addEventListener('change', this._onChange, { signal: this._controller.signal });

    // 接管提交口径：复选框可用、兜底隐藏域退场
    this._checkbox.disabled = false;
    if (this._control) this._control.disabled = true;
    if (this._offset) this._offset.value = String(new Date().getTimezoneOffset());

    this._setLocalMinDate();

    // 首次同步不清空字段：服务端回填过的值（出错重提交）要留着
    this._sync(this._checkbox.checked, false);
  }

  /**
   * 寄送日期的下限用**本地日期**，覆盖 Liquid 写进去的服务器日期。
   *
   * Liquid 侧的 `{{ 'now' | date: '%Y-%m-%d' }}` 取的是店铺所在服务器时区，
   * 与收件人本地日期最多差一天：西半球店铺的下午（UTC 已跨天）会把 min 写成"明天"，
   * 顾客当天就选不了。平台真正用来解释日期的是 properties[__shopify_offset]，
   * 所以下限也应当按同一把尺子（本地时区）来定。无 JS 时仍保留 Liquid 的 min 兜底。
   */
  _setLocalMinDate() {
    const sendOn = this._fields.querySelector('input[type="date"]');
    if (!sendOn) return;
    const today = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    sendOn.min = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  _onChange = () => {
    this._sync(this._checkbox.checked, !this._checkbox.checked);
  };

  /**
   * @param {boolean} open 是否寄给收件人
   * @param {boolean} clear 是否清空已填内容（用户主动取消时清，初始化时不清）
   */
  _sync(open, clear) {
    this.toggleAttribute('open', open);

    this._inputs.forEach((input) => {
      input.disabled = !open;
    });
    if (this._offset) this._offset.disabled = !open;

    if (!open && clear) {
      // 取消寄送后残值不能跟着下一单走：字段已禁用，值也一并抹掉
      this._inputs.forEach((input) => {
        input.value = '';
      });
    }
  }
}

if (!customElements.get('gift-card-recipient')) {
  customElements.define('gift-card-recipient', GiftCardRecipient);
}
