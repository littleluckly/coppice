/**
 * view-toggle — 集合页「网格 / 列表」视图切换（2026-11-03 刘工）。
 *
 * 用法：
 *   <view-toggle class="view-toggle">
 *     <button type="button" class="view-toggle__button" aria-pressed="false"
 *             aria-label="…">两个图标</button>
 *   </view-toggle>
 *
 * 状态放在 <html data-collection-view="list">，**不放在 section 根节点**：
 * 集合页筛选走 Section Rendering，会把 <collection-facets> 的子节点整块换掉，
 * 状态挂在被替换的子树里刷新一次就丢了。挂在 html 上还能被首帧内联脚本
 * （layout/theme.liquid）先读出来，避免「先渲染网格、脚本到了再跳成列表」的闪动。
 *
 * 持久化：localStorage['coppice:collection-view']，值 'list' | 'grid'。
 * 与收藏（ib:wishlist:v1）同一套做法：只在本机生效，不承诺跨设备同步。
 *
 * 无障碍：单一按钮按 WAI-ARIA toggle button 处理——aria-pressed 表示
 * 「列表态是否开启」，标签恒定（"List view"），不随状态改词；图标由 CSS
 * 按 aria-pressed 切换，脚本不碰 DOM 结构。
 *
 * 未升级时（无 JS / 脚本未加载）按钮整块隐藏，见 collection.liquid 的
 * `view-toggle:not(:defined)` —— 留一个按不动的按钮比不显示更糟。
 */
const STORAGE_KEY = 'coppice:collection-view';
const ROOT = document.documentElement;

class ViewToggle extends HTMLElement {
  connectedCallback() {
    if (this._button) return;
    this._button = this.querySelector('button');
    if (!this._button) return;

    this._sync();
    this._controller = new AbortController();
    this._button.addEventListener('click', this._onClick, { signal: this._controller.signal });
    /* 另一标签页切了视图：跟着同步，不用刷新 */
    window.addEventListener('storage', this._onStorage, { signal: this._controller.signal });
  }

  disconnectedCallback() {
    this._controller?.abort();
    this._controller = null;
    this._button = null;
  }

  get isList() {
    return ROOT.dataset.collectionView === 'list';
  }

  _sync() {
    this._button.setAttribute('aria-pressed', this.isList ? 'true' : 'false');
  }

  _onClick = () => {
    const next = this.isList ? 'grid' : 'list';
    /* 写 grid 也写 localStorage（而不是删键）：显式记住「我要网格」，
       否则下次读到 null 又回到默认值——默认值将来若改成 list，用户的选择会失效。 */
    ROOT.dataset.collectionView = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      /* 隐私模式 / 存储被禁：仅在本次会话生效，不阻断切换 */
    }
    this._sync();
  };

  _onStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    if (event.newValue === 'list' || event.newValue === 'grid') {
      ROOT.dataset.collectionView = event.newValue;
      this._sync();
    }
  };
}

if (!customElements.get('view-toggle')) {
  customElements.define('view-toggle', ViewToggle);
}
