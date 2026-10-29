/**
 * 页头吸顶状态（2026-10-29 刘工）
 *
 * 需求：页头下方的投影只在**真的吸住时**才出现——页面停在顶部时页头与内容区
 * 之间干干净净，往下滚才浮起来。
 *
 * 判据不能写成「滚动了多少像素」：吸顶的触发点取决于页头上方还压着多少东西
 * （公告栏在不在、有没有被关掉），任何固定阈值都会在某种配置下错位。
 *
 * 这里改为观察吸顶块本身：root 顶部收进 1px、threshold 拉到 1，即要求整块
 * **完全可见**才算「未吸住」。吸住那一刻，块顶边正好压在那条 -1px 边界之外，
 * 条件立即不成立——这个判据不需要知道任何初始位置，所以刷新时落在页面中间、
 * 或公告栏后来被关掉，都不会算错。
 *
 * 代价（如实说明）：若吸顶块的高度超过视口，threshold 1 永远不成立，会退化成
 * 恒显示阴影。页头只有一行菜单，不会出现这种情况，故不做兜底。
 */
if (!customElements.get('nav-sticky')) {
  customElements.define(
    'nav-sticky',
    class NavSticky extends HTMLElement {
      connectedCallback() {
        // sticky 挂在 Shopify 的 section 包裹层上（schema "class"，见 BUG-032），
        // 本元素是它的后代，状态类也必须打在那个包裹层上。
        const target = this.closest('.main-nav-section');
        if (!target) return;

        this._observer = new IntersectionObserver(
          ([entry]) => {
            target.classList.toggle('is-stuck', !entry.isIntersecting);
          },
          { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
        );
        this._observer.observe(target);
      }

      disconnectedCallback() {
        if (this._observer) {
          this._observer.disconnect();
          this._observer = null;
        }
      }
    }
  );
}
