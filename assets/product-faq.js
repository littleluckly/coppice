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
 * 用户点开某一条 ⇒ 那一条的进度条从 0 重新计时，到期继续开下一条。这里**没有**
 * 任何"用户接管就停播"的分支；唯一的"停"是用户把所有条目都收起（没有展开项
 * ⇒ 没有进度条 ⇒ 没有动画可跑），再点开任意一条即恢复。
 *
 * ⚠️ 两个必须显式处理的坑（BUG-088，都是"看着像自动播放坏了"）：
 *   ① **重启要靠 `_restartProgress()`，不能指望选择器重新匹配**：真 Chrome 实测，
 *      关掉再打开的条目会带着上一次的 finished 状态回来（进度条满格、不再派
 *      animationend），轮播就此停摆。
 *   ② **CSS 焦点暂停只能认 `:focus-visible`**：鼠标点开 <summary> 后焦点留在它身上，
 *      `:focus-within` 会一直为真 ⇒ 鼠标移开了倒计时还是挂起的。
 *
 * 悬停 / 键盘焦点暂停是纯 CSS（`:hover` / `:has(:focus-visible)`），不在这里——
 * 那两种状态浏览器判得比脚本准，也不会和 pointer 事件顺序打架。两条口径（2026-11-20）：
 *   · 悬停只认**当前展开的那一条**——鼠标停在别的条目上、或只是路过区块，都不暂停；
 *   · 键盘焦点按整块判——键盘用户在区块内任何位置操作都先停住画面（WCAG 2.2.2）。
 * 副作用要知道：点完某一条后光标还停在它上面时，倒计时是**暂停**的，移开即继续。
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

    /* 手动开合之后，那一条的倒计时必须**从头**计时（BUG-088）：
       只靠"选择器重新匹配"是不够的 —— 真 Chrome 实测，关掉再打开的条目，
       动画会带着上一次的 finished 状态回来（transform 直接是 1），进度条满格、
       也不会再派 animationend，轮播就此停摆。所以这里显式重启一次。
       原生 toggle 在 click 派发**之后**才生效，所以延后一拍再读展开态。 */
    this.addEventListener(
      'click',
      (event) => {
        if (!event.target.closest('summary')) return;
        setTimeout(() => {
          this._restartProgress(this._items.find((item) => item.open));
        }, 0);
      },
      { signal }
    );

    /* 动画结束冒泡到这里；只认进度条自己，别被将来加的别的动画带跑。
       手动打开的新条目也会走到这里——它的进度条被重启后跑完，照常切下一条，
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
    /* current 为 -1（全都收起）时从第一条接上：正常流程里走不到这里
       （没有展开项就没有进度条动画、没有 animationend），留着只为兜底 */
    const next = this._items[(current + 1) % this._items.length];
    /* 老浏览器不认 <details name>，这里显式关掉其余，行为与新浏览器一致 */
    this._items.forEach((item) => {
      item.open = item === next;
    });
    this._restartProgress(next);
  }

  /* 把某一条的倒计时从 0 重启：先内联 animation: none 摘掉动画、强制一次重排
     （把旧动画实例彻底丢掉），再撤掉内联值让样式表里的动画重新生效。
     不这么做的话，同一个元素第二次"开始"时会沿用上次的 finished 状态。 */
  _restartProgress(item) {
    if (!item) return;
    const bar = item.querySelector('.product-faq__progress-bar');
    if (!bar) return;
    bar.style.animation = 'none';
    void bar.offsetWidth;
    bar.style.animation = '';
  }
}

if (!customElements.get('product-faq')) {
  customElements.define('product-faq', ProductFaq);
}
