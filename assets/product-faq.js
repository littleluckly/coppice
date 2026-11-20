/**
 * product-faq — 产品页 FAQ 手风琴的自动播放层（2026-11-20 刘工）。
 *
 * 展开 / 收起、键盘操作、互斥全部交给原生 `<details name>`，这里只做两件事：
 *
 *   1. **播完切下一条**：进度条动画跑完（`animationend`）→ 开下一条、关其余。
 *      刻意**不用 JS 计时器**：动画时长写在 CSS 里（`--product-faq-interval`），
 *      计时器再写一份必然漂移——暂停 / 恢复、标签页切后台、减少动效这三种情况
 *      光靠计时器同步不回来。动画跑完事件天然只在"真的播完了"时触发；
 *      动画被 `prefers-reduced-motion` 摘掉时永远不触发，自动播放也就自然失效。
 *
 *   2. **看不见就别播**：离开视口（IntersectionObserver）或标签页切到后台
 *      （visibilitychange）⇒ 打 data-paused，CSS 用 animation-play-state 挂起。
 *      挂起不重置进度，回来接着播。
 *
 * **手动点击之后照常轮播**（2026-11-20 刘工退回"点过就停"的初版）：
 * 用户点开某一条 ⇒ 那一条的进度条从 0 重新计时，到期继续开下一条。
 * 这里**没有**任何"用户接管就停播"的分支——不需要：手动打开的新条目本来就会
 * 因为 `[data-playing] > details[open]` 重新匹配而重启动画，轮播自己接得上。
 * 唯一的"停"是用户把所有条目都收起（没有展开项 ⇒ 没有进度条 ⇒ 没有动画可跑），
 * 再点开任意一条即恢复。这也是初版那条 `_stopAutoplay()` 被删掉的原因：
 * 它一票否决了上面这套天然行为，用户点一下手风琴，整块就再也不动了。
 *
 * 悬停 / 焦点暂停是纯 CSS（`:hover` / `:focus-within`），不在这里——那两种状态
 * 浏览器判得比脚本准，也不会和 pointer 事件顺序打架。注意它的副作用：
 * 点完手风琴光标还停在卡片上时，倒计时是**暂停**的（这是"别在用户眼皮底下换内容"
 * 的保护），移开光标即继续。
 *
 * 无 JS：首条 open，其余可点开，进度条恒为填满态。整块依然可用。
 */
class ProductFaq extends HTMLElement {
  connectedCallback() {
    /* Section Rendering / 编辑器重挂载会再进一次，重复绑定会让 animationend 翻倍 */
    if (this._started) return;
    this._started = true;

    /* 只认直接子节点：将来若在条目里再嵌 details（比如答案里折叠一段），
       不该被当成轮播目标 */
    this._items = Array.from(this.children).filter((el) => el.tagName === 'DETAILS');

    /* 一条问答谈不上"轮播"：播完就没了，只会让内容自己跳一下 */
    if (this._items.length < 2) return;
    if (this.getAttribute('data-autoplay') === 'off') return;

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    this._inView = true;
    this._controller = new AbortController();
    const { signal } = this._controller;

    /* 动画结束冒泡到这里；只认进度条自己，别被将来加的别的动画带跑。
       手动打开的新条目也会走到这里——它的进度条重启动画、跑完照常切下一条，
       所以这里不需要区分"是不是用户点的"。 */
    this.addEventListener(
      'animationend',
      (event) => {
        if (!event.target.classList.contains('product-faq__progress-bar')) return;
        this._advance();
      },
      { signal }
    );

    document.addEventListener('visibilitychange', () => this._syncPaused(), { signal });

    if ('IntersectionObserver' in window) {
      this._observer = new IntersectionObserver(
        (entries) => {
          this._inView = entries[0].isIntersecting;
          this._syncPaused();
        },
        { threshold: 0.25 }
      );
      this._observer.observe(this);
    }

    /* 这个属性才是动画的开关（CSS 只对 [data-playing] 下的进度条挂 animation） */
    this.setAttribute('data-playing', '');
    this._syncPaused();
  }

  disconnectedCallback() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    /* 重挂载后属性会留在宿主上 ⇒ 新实例还没判过条件就已经"在播"了，一并摘掉 */
    this.removeAttribute('data-playing');
    this.removeAttribute('data-paused');
    this._started = false;
  }

  _syncPaused() {
    /* document.hidden 时不推进：后台标签页里把四条轮完，用户回来看到的是第 3 条——
       既莫名其妙又白烧 CPU */
    const paused = this._inView === false || document.hidden;
    this.toggleAttribute('data-paused', paused);
  }

  _advance() {
    const current = this._items.findIndex((item) => item.open);
    /* 当前没有展开项（用户全关了，但已停播 ⇒ 走不到这里）也照常从第一条接上 */
    const next = this._items[(current + 1) % this._items.length];
    /* 老浏览器不认 <details name>，这里显式关掉其余，行为与新浏览器一致 */
    this._items.forEach((item) => {
      item.open = item === next;
    });
  }

  _stopAutoplay() {
    if (this.hasAttribute('data-stopped')) return;
    this.setAttribute('data-stopped', '');
    this.removeAttribute('data-playing');
    this.removeAttribute('data-paused');
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
  }
}

if (!customElements.get('product-faq')) {
  customElements.define('product-faq', ProductFaq);
}
