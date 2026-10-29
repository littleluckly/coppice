/**
 * 页头吸顶状态（2026-10-29 刘工）
 *
 * 需求：页头下方的投影只在**真的吸住时**才出现——页面停在顶部时页头与内容区
 * 之间干干净净，往下滚才浮起来。
 *
 * 为什么不用 IntersectionObserver：实测（2026-10-29，无头 Chrome）Chrome 对
 * position: sticky 元素的交集计算**不把吸附位移算进去**——吸住后
 * boundingClientRect.top 已经是 0，但 IO 仍按文档布局位置算交集比例，
 * 恒等于 1，threshold 永不跨越，回调在初始那次之后再也不来。此路不通。
 *
 * 判据只有一条且不需要缓存任何位置：
 *   sticky 块的 getBoundingClientRect().top <= 0.5  ⇒  已经贴住视口顶
 * 它读的就是视觉位置，天然自适应公告栏高度变化、是否被关闭、刷新时落在页面
 * 中间等一切情况。
 *
 * 为什么不在 scroll 里再包一层 requestAnimationFrame：scroll 事件本身就与渲染
 * 帧对齐（每帧至多派发一次），再包 rAF 只会把阴影的出现推迟一帧——滚动停住的
 * 那一刻阴影慢半拍浮起，观感是"闪"。同步判据 + 只在状态翻转时写 class，
 * 每帧至多一次 rect 读取、至多一次 DOM 写入，开销与 rAF 方案等价。
 *
 * 移动端（< 990px）没有 sticky，CSS 只在该断点消费 is-stuck，此处不判断断点。
 */
if (!customElements.get('nav-sticky')) {
  customElements.define(
    'nav-sticky',
    class NavSticky extends HTMLElement {
      connectedCallback() {
        // sticky 挂在 Shopify 的 section 包裹层上（schema "class"，见 BUG-032），
        // 本元素是它的后代，状态类也必须打在那个包裹层上。
        this._target = this.closest('.main-nav-section');
        if (!this._target) return;

        this._stuck = false;
        this._onScroll = () => this._sync();
        window.addEventListener('scroll', this._onScroll, { passive: true });
        window.addEventListener('resize', this._onScroll, { passive: true });
        this._sync();
      }

      disconnectedCallback() {
        window.removeEventListener('scroll', this._onScroll);
        window.removeEventListener('resize', this._onScroll);
      }

      _sync() {
        const stuck = this._target.getBoundingClientRect().top <= 0.5;
        if (stuck !== this._stuck) {
          this._stuck = stuck;
          this._target.classList.toggle('is-stuck', stuck);
        }
      }
    }
  );
}
