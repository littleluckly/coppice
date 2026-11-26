/**
 * quick-view — 商品卡「Choose options」快速查看弹窗（2026-11-20 刘工）。
 *
 * 边界：本文件只管「开合 + 缩略图 / 变体图切换」。**变体联动不在这里**——
 * 选项渲染由 snippets/variant-picker.liquid 出，选中后改价格 / 划线价 / 折扣 /
 * 单位价 / 按钮态 / 隐藏 id 全归 product-form.js 的 <variant-picker>
 * （2026-11-21 抽取，与产品页共用一份）。本文件只接它的 `variant:change` 事件，
 * 把「变体自带图」换成主图（弹窗的图库只有一张主图，不是 product-gallery，
 * 所以这一小段仍归宿主）。
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
 *   - 加购后的收场按断点分流：移动端抽屉整块盖在面板上、面板不收；桌面端抽屉
 *     是右侧窄栏盖不住，仍收面板（详见文件下半段"加购结果"）
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
    document.addEventListener('variant:change', this._onVariantChange, { signal });

    const form = this._dialog.querySelector('form');
    if (form) form.addEventListener('submit', this._onSubmit, { signal });
    this._dialog.addEventListener('close', this._onDialogClose, { signal });

    document.addEventListener('cart:updated', this._onCartUpdated, { signal });
    document.addEventListener('cart:add-failed', this._onCartFailed, { signal });
  }

  disconnectedCallback() {
    this._ac?.abort();
  }

  open() {
    if (!this._dialog) return;

    /* 每次打开都是一张干净的面板（2026-11-26 刘工）：[data-form-status] 里那句
       "was added to your cart" / 失败提示是给当时那一下看的，不该带到下一次
       开面板——它落在按钮和 Buy it now 之间，紧挨着上下元素，看着像多了一块内容。
       product-form 那边会让成功文案随按钮态 2.5s 退场；失败文案是刻意留在面板上
       让人看清原因的，所以这里再兜一层：**开面板即清**，覆盖所有来源。 */
    const status = this._dialog.querySelector('[data-form-status]');
    if (status) status.textContent = '';

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

  /* ---- 加购结果 ----
     移动端（≤989.98px）：抽屉是底部通栏、88dvh（与面板的 max-height 同值），
     整块盖在面板上面 —— 面板**不收**，顾客关掉抽屉就落回这个商品继续挑。
     桌面端（≥990px）：抽屉是右侧 26rem 窄栏，盖不住居中的弹窗；两个浮层并排
     立在屏幕上、面板还被第二层遮罩压暗，看着像"这个弹窗已经失效了" ——
     那里仍然收面板（2026-11-26 之前的形态）。
     分界 989.98px 跟着抽屉换挡走（与 cart-drawer.js 的拖拽收起同一个断点）。 */

  /* 提交事件冒到 dialog 才标记（product-form 在前台先跑，它拦下默认提交并发请求）。
     这个标记只用来回答一件事：后面那个 cart:updated 是不是"我这次提交"引起的。 */
  _onSubmit = () => {
    this._submitted = true;
  };

  _onCartUpdated = () => {
    if (!this._submitted) return;
    this._submitted = false;
    if (window.matchMedia('(max-width: 989.98px)').matches) return;
    this.close();
  };

  /** 失败：面板本来就留着（product-form 把错误文案写进 [data-form-status]），
      只把标记清掉 —— 免得之后别的 cart:updated（比如在抽屉里改数量）把面板收走。 */
  _onCartFailed = () => {
    this._submitted = false;
  };

  _onDialogClose = () => {
    this._submitted = false;
  };

  /** 变体切换：只负责"变体自带图 → 主图"。
      价格 / 划线价 / 折扣 / 单位价 / 按钮态全在 <variant-picker> 那边改完了，
      这里再动一遍就是两套逻辑（原来 select 版本正是这么漂的）。
      面板没打开时忽略：首屏直出时 <variant-picker> 也会 dispatch 一次，
      那次不该把服务端渲染的主图换掉（会闪一下）。 */
  _onVariantChange = (event) => {
    if (!this._dialog.open) return;
    const token = this._dialog.dataset.sectionId;
    if (token && event.detail?.sectionId !== token) return;

    const mediaId = event.detail?.mediaId;
    if (!mediaId) return;
    const thumb = this._dialog.querySelector(`[data-quick-view-thumb][data-media-id="${mediaId}"]`);
    if (!thumb) return; /* 变体图不在前 5 张缩略图里：保持当前图，不猜 */
    this._setImage(thumb.dataset.media);
    this._setActiveThumb(thumb);
  };

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
