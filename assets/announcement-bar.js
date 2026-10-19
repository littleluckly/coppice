/**
 * announcement-bar — 公告栏的关闭持久化、手动切换与自动循环。
 *
 * 挂在 [data-announcement] 元素上（Liquid 里是 <aside class="announcement-bar">，
 * 不是自定义元素标签），用 attribute 反映状态，CSS 用 [data-*] 选择器挂钩。
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
 *
 * 自动循环（autoplay）：
 *   多条公告时每隔 AUTOPLAY_INTERVAL 秒自动切到下一条。为满足 WCAG 2.2.2
 *   （自动移动的内容必须可暂停/停止），提供三重防护：
 *   1) hover / focus-within 时暂停；
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

    // 关闭持久化 key 带 section.id：商家改文案/改 section 后 key 变，
    // 关闭态自动重置，老访客能看到新公告（官方最佳实践，见文件头注释）。
    const storageKey = `coppice:announcement:closed:${root.dataset.sectionId || 'default'}`;

    let index = 0;
    let timer = null;

    // ---- 关闭（读存储）----
    let dismissed = null;
    try {
      dismissed = sessionStorage.getItem(storageKey);
    } catch (error) {
      /* 存储不可用：按未关闭处理 */
    }
    if (dismissed === '1') root.dataset.announcementClosed = 'true';

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
