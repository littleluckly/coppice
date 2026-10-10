/**
 * announcement-bar — 公告栏的关闭持久化与手动切换。
 *
 * Custom Element（AGENTS §6）：状态靠 attribute 反映，CSS 用 [data-*] 选择器挂钩。
 *
 * 关键行为：关闭态不闪空条
 *   朴素做法是服务端先渲染、JS 读 localStorage 后再隐藏 —— 关闭状态的用户会先看到
 *   一条公告栏再消失（CLS + 视觉闪跳）。这里的做法相反：
 *   1) Liquid 不输出 hidden，条子正常渲染；
 *   2) CSS 默认不隐藏任何状态；
 *   3) JS 若读到"已关闭"才写 data-announcement--closed，条子才消失。
 *   代价是关闭状态的用户会经历一次"渲染后立刻消失"，但因为 JS 是 defer 的，
 *   这发生在 HTML 解析完成之后、首屏绘制之前，肉眼基本不可见；
 *   而"先隐藏再显示"会让未关闭状态的用户看到空条——那才是更糟的闪跳。
 */
class AnnouncementBar extends HTMLElement {
  static STORAGE_KEY = 'coppice:announcement:closed';

  constructor() {
    super();
    this._abort = new AbortController();
  }

  connectedCallback() {
    const { signal } = this._abort;

    this._dismissButton = this.querySelector('[data-announcement-dismiss]');
    this._list = this.querySelector('[data-announcement-list]');
    this._items = Array.from(this.querySelectorAll('.announcement-bar__item'));

    this._readState();
    this._bind(signal);
    this._render();
  }

  disconnectedCallback() {
    this._abort.abort();
  }

  _bind(signal) {
    // 关闭：写存储 + 隐藏。存储失败（隐私模式等）时静默降级为本次会话有效
    this._dismissButton?.addEventListener(
      'click',
      () => {
        try {
          sessionStorage.setItem(AnnouncementBar.STORAGE_KEY, '1');
        } catch (error) {
          /* 静默降级：本次会话仍然可关闭 */
        }
        this.dataset.announcementClosed = 'true';
      },
      { signal }
    );

    if (!this._list || this._items.length < 2) return;

    // 计数播报：JS 只更新数字，分隔符由 locale 决定（多语言安全）
    const current = this.querySelector('[data-announcement-current]');

    const go = (delta) => {
      this._index = (this._index + delta + this._items.length) % this._items.length;
      this._render();

      // aria-live 区域内的数字变化会被读屏播报
      if (current) current.textContent = String(this._index + 1);
    };

    this.querySelector('[data-announcement-prev]')?.addEventListener('click', () => go(-1), { signal });
    this.querySelector('[data-announcement-next]')?.addEventListener('click', () => go(1), { signal });

    // 键盘可达：条子获得焦点时左右方向键切换
    this.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'ArrowLeft') {
          go(-1);
        } else if (event.key === 'ArrowRight') {
          go(1);
        } else {
          return;
        }
        event.preventDefault();
      },
      { signal }
    );
  }

  /**
   * 用 sessionStorage 而非 localStorage：
   * 公告栏的"关闭"是本次浏览会话的临时意愿（促销信息会换），
   * 永久隐藏会让商家更新文案后老访客永远看不到。sessionStorage 随标签页关闭失效。
   */
  _readState() {
    this._index = 0;

    let dismissed = null;
    try {
      dismissed = sessionStorage.getItem(AnnouncementBar.STORAGE_KEY);
    } catch (error) {
      /* 存储不可用：按未关闭处理，正常显示 */
      return;
    }

    if (dismissed === '1') this.dataset.announcementClosed = 'true';
  }

  _render() {
    if (!this._list) return;

    this._items.forEach((item, i) => {
      const active = i === this._index;
      item.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    // 横向位移用 transform 而非 left/right（RTL 兼容，AGENTS §9）
    this._list.style.transform = `translateX(-${this._index * 100}%)`;
  }
}

customElements.define('announcement-bar', AnnouncementBar);
