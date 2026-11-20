/**
 * quick-view — 商品卡「Choose options」快速查看弹窗（2026-11-20 刘工）。
 *
 * 边界：本文件只管「开合 + 变体联动 + 缩略图切图 + 加购后收面板」，
 * **不实现加购提交**——提交归 product-form.js 的 <product-form>（含 BUG-083 的
 * cart:add-failed 收口、cart:added / cart:updated 事件约定）。所以消费卡片的
 * section 必须同时引入 product-form.js，否则表单会退化成原生 POST（不会坏，
 * 只是整页跳走）。
 *
 * 金额一律来自 Liquid 预格式化的 data-*（data-price / data-compare / data-unit），
 * 本文件只做替换，不拼货币符号与千分位——多货币市场由平台决定格式。
 *
 * 开合交给 <bottom-sheet>（与购物车抽屉同一套：Esc、遮罩、滑入滑出、焦点归还）。
 * 它没升级（脚本缺失 / 顺序意外）时退回原生 showModal()/close()，功能不丢。
 *
 * 事件：
 *   - 入口 <a> 点击 → preventDefault → 开面板；面板不存在时什么都不做，链接照常跳转
 *   - 提交后等 cart:updated / cart:add-failed 再收面板（失败时保留面板，
 *     data-form-status 里的错误文案才看得见；购物车抽屉由它自己的监听退出骨架）
 *
 * 重连幂等：监听全部挂在 AbortController 上，Section Rendering 换掉卡片后
 * 旧节点销毁、新节点重新 bind，不会叠加。
 */
class QuickView extends HTMLElement {
  connectedCallback() {
    this._trigger = this.querySelector('[data-quick-view-open]');
    if (!this._trigger) return;

    this._ac?.abort();
    this._ac = new AbortController();
    const { signal } = this._ac;

    this._trigger.addEventListener('click', this._onTriggerClick, { signal });

    /* 没有面板（订阅商品 / 礼品卡 / 售罄 / 标签写错）：入口就是个普通链接，不接管 */
    this._dialog = this.querySelector('dialog');
    if (!this._dialog) return;

    this._sheet = this.querySelector('bottom-sheet');
    this._select = this._dialog.querySelector('[data-quick-view-variant]');
    this._priceEl = this._dialog.querySelector('[data-quick-view-price]');
    this._compareEl = this._dialog.querySelector('[data-quick-view-compare]');
    this._saveEl = this._dialog.querySelector('[data-quick-view-save]');
    this._unitEl = this._dialog.querySelector('[data-quick-view-unit]');
    this._button = this._dialog.querySelector('[data-add-button]');
    this._stage = this._dialog.querySelector('[data-quick-view-stage]');
    this._saveTemplate = this._dialog.dataset.saveTemplate || '';
    this._unitTemplate = this._dialog.dataset.unitTemplate || '';

    this._dialog.addEventListener('click', this._onDialogClick, { signal });
    this._dialog.addEventListener('change', this._onChange, { signal });
    this._dialog.addEventListener('close', this._onDialogClose, { signal });

    const form = this._dialog.querySelector('form');
    if (form) form.addEventListener('submit', this._onSubmit, { signal });

    /* 两个终局信号都收面板：成功（有 count）与失败（抽屉退出骨架）——
       失败时保留面板更合理，但抽屉已经在收，面板留着会挡住它，所以一起收。 */
    document.addEventListener('cart:updated', this._onCartSettled, { signal });
    document.addEventListener('cart:add-failed', this._onCartSettled, { signal });

    /* 首次对齐：浏览器可能恢复了上次的 select 选中项 */
    this._sync();
  }

  disconnectedCallback() {
    this._ac?.abort();
  }

  open() {
    if (!this._dialog) return;
    if (typeof this._sheet?.open === 'function') this._sheet.open();
    else if (!this._dialog.open) this._dialog.showModal();
  }

  close() {
    if (!this._dialog?.open) return;
    if (typeof this._sheet?.close === 'function') this._sheet.close();
    else this._dialog.close();
  }

  /* ---- 内部 ---- */

  _onTriggerClick = (event) => {
    if (!this._dialog) return;
    event.preventDefault();
    this.open();
  };

  /** 遮罩点击：showModal 后点面板外部，target 就是 dialog 本身（面板内容填满它） */
  _onDialogClick = (event) => {
    if (event.target === this._dialog) {
      this.close();
      return;
    }

    if (event.target.closest?.('[data-quick-view-close]')) {
      this.close();
      return;
    }

    const thumb = event.target.closest?.('[data-quick-view-thumb]');
    if (thumb && this._dialog.contains(thumb)) {
      this._setImage(thumb.dataset.media);
      this._setActiveThumb(thumb);
    }
  };

  _onChange = (event) => {
    if (event.target === this._select) this._sync();
  };

  _onSubmit = () => {
    this._submitted = true;
  };

  _onCartSettled = () => {
    if (!this._submitted) return;
    this._submitted = false;
    this.close();
  };

  _onDialogClose = () => {
    this._submitted = false;
  };

  /** 把选中变体的价格 / 划线价 / 折扣 / 单位价 / 按钮态 / 变体图同步到面板 */
  _sync() {
    const option = this._select?.selectedOptions?.[0];
    if (!option) return;
    const data = option.dataset;

    if (this._priceEl) this._priceEl.textContent = data.price || '';

    if (this._compareEl) {
      if (data.compare) {
        this._compareEl.textContent = data.compare;
        this._compareEl.removeAttribute('hidden');
      } else {
        this._compareEl.setAttribute('hidden', '');
      }
    }

    if (this._saveEl) {
      const percent = Number(data.save || 0);
      if (data.compare && percent > 0 && this._saveTemplate) {
        this._saveEl.textContent = this._saveTemplate.replace('[percent]', String(percent));
        this._saveEl.removeAttribute('hidden');
      } else {
        this._saveEl.setAttribute('hidden', '');
      }
    }

    this._syncUnit(data);
    this._syncButton(data);

    /* 变体自带图才换；没有就保持当前图（不退回主图，避免选一下就跳回第一张） */
    if (data.media) {
      this._setImage(data.media);
      this._setActiveThumb(null);
    }
  }

  _syncUnit(data) {
    if (!this._unitEl) return;
    if (data.unit && this._unitTemplate) {
      this._unitEl.textContent = this._unitTemplate
        .replace('[price]', data.unit)
        .replace('[unit]', data.unitRef || '');
      this._unitEl.removeAttribute('hidden');
    } else {
      this._unitEl.setAttribute('hidden', '');
    }
  }

  _syncButton(data) {
    if (!this._button) return;
    const available = data.available === 'true';
    this._button.disabled = !available;
    this._button.textContent = available
      ? this._button.dataset.addLabel || ''
      : this._button.dataset.soldOutLabel || '';
    delete this._button.dataset.state;
  }

  /** 换主图：先摘掉 srcset/sizes，否则浏览器仍会按响应式候选挑回旧图 */
  _setImage(url) {
    const img = this._stage?.querySelector('img');
    if (!img || !url) return;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.src = url;
  }

  _setActiveThumb(thumb) {
    this._dialog.querySelectorAll('[data-quick-view-thumb]').forEach((item) => {
      const active = item === thumb;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  }
}

if (!customElements.get('quick-view')) {
  customElements.define('quick-view', QuickView);
}
