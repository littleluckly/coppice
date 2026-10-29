/**
 * announcement-bar — 公告栏的关闭持久化、手动切换与自动循环。
 *
 * 挂在 [data-announcement] 元素上（Liquid 里是 <aside class="announcement-bar">，
 * 不是自定义元素标签），用 attribute 反映状态，CSS 用 [data-*] 选择器挂钩。
 *
 * 关键行为：关闭态不闪空条
 *   朴素做法是服务端先渲染、JS 读 localStorage 后再隐藏 —— 关闭状态的用户会先看到
 *   一条公告栏再消失（CLS + 视觉闪跳）。这里的做法是：
 *   1) Liquid 照常输出 <aside>（无 JS 时仍可读）；
 *   2) <aside> 之前一段内联同步脚本在**首次绘制前**读 sessionStorage，
 *      命中关闭态就把 section 包裹层 style.display 设为 none（BUG-056）；
 *   3) 本文件（defer）只负责后续交互与"同一次访问里点关闭"这条路径。
 *   sessionStorage 读两次是有意的：内联那段解决"加载时闪"，这里解决
 *   "编辑器重新渲染 section / 脚本晚到"时状态补齐，两者都幂等。
 *
 * 关闭持久化（sessionStorage，key 带 section.id）：
 *   用 sessionStorage 而非 localStorage —— 公告是促销内容，关闭是本次会话的
 *   临时意愿，localStorage 会让商家更新文案后老访客永远看不到。
 *   key 里带 section.id：商家改文案或重建 section 后 id 变、关闭态自动重置，
 *   老访客能看到新公告（Shopify 官方最佳实践，避免"永久隐藏"）。
 *
 * 自动循环（autoplay）：
 *   由商家开关控制（schema 设置 → Liquid 渲染进 data-announcement-autoplay），
 *   默认关闭（Shopify 无障碍指南：轮播默认不自动播放）。开启后为满足 WCAG 2.2.2
 *   （自动移动的内容必须可暂停/停止）提供三重防护：
 *   1) hover / focus 时暂停；
 *   2) 用户手动切换后停止自动播放（尊重用户接管）；
 *   3) 尊重 prefers-reduced-motion：减少动态效果的用户不自动播放。
 *   手动「上一条 / 下一条」按钮始终可用，不因自动播放被剥夺。
 */
(function () {
  'use strict';

  const MOTION_QUERY = window.matchMedia('(prefers-reduced-motion: reduce)');

  function init(root) {
    if (!root || root.dataset.announcementInitialized) return;
    root.dataset.announcementInitialized = 'true';

    const dismissButton = root.querySelector('[data-announcement-dismiss]');
    const list = root.querySelector('[data-announcement-list]');
    const items = Array.from(root.querySelectorAll('.announcement-bar__item'));
    const current = root.querySelector('[data-announcement-current]');
    const prev = root.querySelector('[data-announcement-prev]');
    const next = root.querySelector('[data-announcement-next]');

    // 商家开关：自动循环（Liquid 渲染进 data 属性，JS 不硬编码开关）
    const autoplay = root.dataset.announcementAutoplay === 'true';
    const interval = Number(root.dataset.announcementInterval) || 5000;

    // 关闭持久化 key 由 Liquid 渲染进 data-announcement-key（与 section 内联脚本同源）：
    // 商家改文案/改 section 后 key 变，关闭态自动重置，老访客能看到新公告
    // （官方最佳实践，见文件头注释）。fallback 只为兜住手写 HTML 的场景。
    const storageKey =
      root.dataset.announcementKey ||
      `coppice:announcement:closed:${root.dataset.sectionId || 'default'}`;

    let index = 0;
    let timer = null;

    // ---- 关闭（读存储）----
    // 编辑器画布里不恢复关闭态：否则商家自己点过一次关闭，之后在编辑器里
    // 就再也看不到这个 section，无从编辑。与 section 内联脚本同一判据。
    const inDesignMode = Boolean(window.Shopify && window.Shopify.designMode);
    let dismissed = null;
    try {
      dismissed = sessionStorage.getItem(storageKey);
    } catch (error) {
      /* 存储不可用：按未关闭处理 */
    }
    if (dismissed === '1' && !inDesignMode) root.dataset.announcementClosed = 'true';

    // ---- 关闭（写存储）----
    dismissButton?.addEventListener('click', () => {
      try {
        sessionStorage.setItem(storageKey, '1');
      } catch (error) {
        /* 静默降级：本次会话仍然可关闭 */
      }
      root.dataset.announcementClosed = 'true';
      stopAutoplay();
    });

    // 单条或无列表时，切换与自动播放都不需要
    if (!list || items.length < 2) return;

    function render() {
      items.forEach((item, i) => {
        item.setAttribute('aria-hidden', i === index ? 'false' : 'true');
      });
      // 横向位移用 transform 而非 left/right（RTL 兼容）
      list.style.transform = `translateX(-${index * 100}%)`;
      if (current) current.textContent = String(index + 1);
    }

    function go(delta) {
      index = (index + delta + items.length) % items.length;
      render();
    }

    prev?.addEventListener('click', () => {
      stopAutoplay();
      go(-1);
    });
    next?.addEventListener('click', () => {
      stopAutoplay();
      go(1);
    });

    // 键盘可达：条子获得焦点时左右方向键切换
    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        stopAutoplay();
        go(-1);
        event.preventDefault();
      } else if (event.key === 'ArrowRight') {
        stopAutoplay();
        go(1);
        event.preventDefault();
      }
    });

    // ---- 自动循环 ----
    function startAutoplay() {
      if (timer !== null) return;
      if (!autoplay) return; // 商家关闭自动循环
      if (MOTION_QUERY.matches) return; // 减少动态偏好：不自动播
      timer = window.setInterval(() => go(1), interval);
    }

    function stopAutoplay() {
      if (timer === null) return;
      window.clearInterval(timer);
      timer = null;
    }

    // hover / 键盘聚焦时暂停，离开时恢复（若用户没手动接管过）
    const pause = () => stopAutoplay();
    const resume = () => startAutoplay();

    root.addEventListener('mouseenter', pause);
    root.addEventListener('mouseleave', resume);
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', resume);

    // 初始渲染 + 启动自动循环（autoplay=false 或 reduced-motion 时自然不启动）
    render();
    startAutoplay();
  }

  // 直接初始化已存在的公告栏
  document.querySelectorAll('[data-announcement]').forEach(init);

  // 主题编辑器里 section 被重渲染时，Shopify 派发 shopify:section:load，
  // 新 DOM 里的公告栏需要重新初始化（幂等守卫防重复绑定）。
  document.addEventListener('shopify:section:load', (event) => {
    const root = document.getElementById(`shopify-section-${event.detail.sectionId}`);
    root?.querySelectorAll('[data-announcement]').forEach(init);
  });
})(window);
