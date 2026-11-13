/**
 * search-field — 搜索结果页大搜索条的「输入 / 清空」行为（2026-11-12 刘工）。
 *
 * 职责只有一条：输入有内容时，在提交按钮左侧显示清空按钮；点击清空并回焦。
 * 不做搜索提交、不做联想（页头抽屉的 <predictive-search> 是另一套组件）。
 *
 * 渐进增强：无 JS / 脚本未加载时输入框仍是原生 type="search"，WebKit 自带的
 * 清除叉可用；组件升级后写 data-enhanced，CSS 据此把原生叉收掉，避免两个叉
 * 并排。显隐走 hidden 属性——无内容时按钮彻底离开无障碍树。
 *
 * 规范（AGENTS §6）：Custom Element 自包含、AbortController 一次性解绑、
 * 守卫只判 data-* 能力标记（不判页面专属 id）、状态靠 attribute 反映。
 */
class SearchField extends HTMLElement {
  connectedCallback() {
    // 元素被移动会触发 disconnect + connect；有 controller 说明还挂着，别重复绑
    if (this._controller) return;

    this._input = this.querySelector('[data-search-input]');
    this._clear = this.querySelector('[data-search-clear]');
    if (!this._input || !this._clear) return;

    this._controller = new AbortController();
    const { signal } = this._controller;
    this._input.addEventListener('input', this._onInput, { signal });
    this._clear.addEventListener('click', this._onClear, { signal });

    this.setAttribute('data-enhanced', '');
    this._sync();
  }

  disconnectedCallback() {
    this._controller?.abort();
    this._controller = null;
  }

  _sync() {
    this._clear.hidden = this._input.value.length === 0;
  }

  _onInput = () => {
    this._sync();
  };

  _onClear = () => {
    this._input.value = '';
    this._sync();
    this._input.focus();
  };
}

if (!customElements.get('search-field')) {
  customElements.define('search-field', SearchField);
}
