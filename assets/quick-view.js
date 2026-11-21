/**
 * quick-view — 商品卡「Choose options」快速查看弹窗（2026-11-20 刘工）。
 *
 * 边界：本文件只管「开合 + 缩略图 / 变体图切换 + 加购后收面板」。
 * **变体联动不在这里**——选项渲染由 snippets/variant-picker.liquid 出，
 * 选中后改价格 / 划线价 / 折扣 / 单位价 / 按钮态 / 隐藏 id 全归 product-form.js
 * 的 <variant-picker>（2026-11-21 抽取，与产品页共用一份）。本文件只接它的
 * `variant:change` 事件，把「变体自带图」换成主图（弹窗的图库只有一张主图，
 * 不是 product-gallery，所以这一小段仍归宿主）。
 * 加购提交同理归 <product-form>（含 BUG-083 的 cart:add-failed 收口、
 * cart:added / cart:updated 事件约定）。所以消费卡片的 section 必须同时引入
 * product-form.js，否则表单会退化成原生 POST（不会坏，只是整页跳走）。
 *
 * 开合交给 <bottom-sheet>（与购物车抽屉同一套：Esc、遮罩、滑入滑出、焦点归还）。
 * 它没升级（脚本缺失 / 顺序意外）时退回原生 showModal()/close()，功能不丢。
 *
 * 事件：
 *   - 入口 <a> 点击 → preventDefault → 开面板；面板不存在时什么都不做，链接照常跳转
 *   - 收到 variant:change（来自 <variant-picker>，document 级）→ 若实例令牌对得上，
 *     按 mediaId 找对应缩略图并换图；面板没打开时一律忽略（否则首屏直出的主图
 *     会被"首次对齐"那次事件换成变体图，闪一下）
 *   - 提交后按结果分流：cart:updated → 收面板；cart:add-failed → **不收**，
 *     让 product-form 写进 data-form-status 的错误文案留在眼前（抽屉自己退出骨架）
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
    this._stage = this._dialog.querySelector('[data-quick-view-stage]');

    this._dialog.addEventListener('click', this._onDialogClick, { signal });
    this._dialog.addEventListener('close', this._onDialogClose, { signal });
    document.addEventListener('variant:change', this._onVariantChange, { signal });

    const form = this._dialog.querySelector('form');
    if (form) form.addEventListener('submit', this._onSubmit, { signal });

    /* 两个终局信号分开处理：
       cart:updated    → 加购成功，收面板（购物车抽屉已经带着新数量开好了）
       cart:add-failed → **不收**。product-form 把错误文案写进面板里的
         [data-form-status]，收掉面板等于把唯一的失败提示藏起来；抽屉那边
         自己会退出骨架（BUG-083），用户回到面板时能看到"试试重试"。 */
    document.addEventListener('cart:updated', this._onCartUpdated, { signal });
    document.addEventListener('cart:add-failed', this._onCartFailed, { signal });

    /* 首次对齐：浏览器可能恢复了上次的 select 选中项。
       传 initial 让主图**不跟着换**——服务端渲染的主图是商品首图（与卡片一致），
       一打开就跳成变体图会闪一下，而且缩略图里的首张会对不上。 */
    this._sync({ initial: true });
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

  _onCartUpdated = () => {
    if (!this._submitted) return;
    this._submitted = false;
    this.close();
  };

  /** 失败：面板留着（错误文案在面板里），只把"等结果"的标记清掉，免得后续
      别的 cart:updated（比如抽屉里改了数量）把面板顺手收走 */
  _onCartFailed = () => {
    this._submitted = false;
  };

  _onDialogClose = () => {
    this._submitted = false;
  };

  /** 把选中变体的价格 / 划线价 / 折扣 / 单位价 / 按钮态 / 变体图同步到面板 */
  _sync({ initial = false } = {}) {
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
    if (!initial && data.media) {
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
