/**
 * footer.js — 页脚的两处渐进增强（2026-11-07，task-footer.md T-1.7）。
 *
 * 只有一件事：<locale-selector>。
 *
 * 为什么要它
 *   官方 UX 指南把「国家/语言选择器」的默认解法写成 custom element + JS 提交，
 *   但同时明文要求「必须有不依赖 JS 的 fallback」。task-footer.md 的 D-3 因此
 *   把基线定成「原生 <select> + 可见的提交按钮」——不用 JS 也能选、也能提交。
 *   本文件只做两件增强，且两件都能在失败时无害退化：
 *     1) 改选即提交（省掉「选完再点一下 Update」这一步）；
 *     2) 增强成功后才把提交按钮收起来（`locale-selector[data-enhanced]`）。
 *
 * 顺序是刻意的：按钮由 Liquid 渲染、CSS 默认显示，本文件**跑通之后**才写
 * `data-enhanced`。脚本 404 / 抛错 / 浏览器不支持 → 按钮一直在，表单照常可用。
 * 反过来（默认隐藏、失败时再显示）会让无 JS 的顾客面对一个永远提交不了的表单。
 *
 * 为什么 change 要防抖 300ms
 *   macOS / Windows 上原生 <select> 每按一次方向键就派发一次 change。裸挂
 *   change → 提交，等于按三下方向键提交三次，页面刷新三次、焦点全丢，用户
 *   根本选不到目标项。防抖之后「停手即提交」的体感不变，但只提交最后一次的值。
 *   这不是优化，是原生 select 的必然后果——不能按「change 就当最终选择」来写。
 *
 * 与 AGENTS §6 的对应
 *   · Custom Element 自包含，connectedCallback 绑定、disconnectedCallback 拆绑
 *     （AbortController 一次性拆除，编辑器重新渲染 section 后不会叠加监听）；
 *   · 不碰全局委托、不挂 window 上的函数。
 */
class LocaleSelector extends HTMLElement {
  /** 提交延迟：原生 select 的方向键连发 change，停手 300ms 才认最终值 */
  static SUBMIT_DELAY = 300;

  connectedCallback() {
    const form = this.querySelector('form');
    if (!(form instanceof HTMLFormElement)) return;

    const selects = this.querySelectorAll('select[name="country_code"], select[name="language_code"]');
    if (selects.length === 0) return;

    /* 重连幂等：先拆旧监听再重挂（编辑器里 section 重新渲染会重连） */
    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;

    this._form = form;
    this._timer = null;

    selects.forEach((select) => {
      select.addEventListener('change', () => this._scheduleSubmit(), { signal });
    });

    /* 增强生效标记：CSS 据此收起提交按钮 */
    this.setAttribute('data-enhanced', '');
  }

  disconnectedCallback() {
    this._abort?.abort();
    this._abort = null;
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _scheduleSubmit() {
    if (this._timer !== null) clearTimeout(this._timer);
    this._timer = window.setTimeout(() => {
      this._timer = null;
      this._submit();
    }, LocaleSelector.SUBMIT_DELAY);
  }

  _submit() {
    const form = this._form;
    if (!form) return;

    /* requestSubmit() 走完整的提交流程（含校验、submit 事件）；
       老 Safari（< 16）没有它 —— 退回 submit()，跳过校验，对这个表单足够安全
       （两个 select 的值域由服务端渲染，不存在非法值）。 */
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form.submit();
    }
  }
}

if (!customElements.get('locale-selector')) {
  customElements.define('locale-selector', LocaleSelector);
}
