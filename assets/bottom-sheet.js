/**
 * bottom-sheet — 底部滑入面板的公共行为（2026-11-03 抽取）。
 *
 * 原来「下拉收起」在三个文件里各写了一遍（faceted-filters / sort-select /
 * cart-drawer），阈值、起判距离、动画压制完全一样，只是热区选择器不同。
 * 已因复制漂移过：只有排序面板压掉了开面板动画，另两个在打开后的 0.28s 内
 * 拖不动。这里收成一份。
 *
 * 为什么不是 Custom Element：三个宿主本身就是三个不同的组件（集合页筛选、
 * 排序选择器、购物车抽屉），它们已经有各自的元素与生命周期。再包一层
 * <bottom-sheet> 只会变成一个必须同时容纳「底部通栏」和「桌面右侧栏」两种
 * 形态、靠开关分叉的壳——比三份复制更难读。所以这里只共享**行为**，
 * 外观在 assets/bottom-sheet.css，DOM 归属仍在各 section。
 *
 * 用法：
 *   const detach = window.BottomSheet.attachDragToDismiss(dialog, {
 *     handle: '.bottom-sheet__grabber, .bottom-sheet__head', // 默认值
 *     exclude: '[data-close]',   // 这些元素上按下不算拖拽起点
 *     isActive: () => bool,      // 桌面侧栏形态时返回 false
 *     onDismiss: () => {},       // 自定义关闭流程；缺省 dialog.close()
 *     onDragEnd: (moved) => {},  // 宿主设「防误触 click 窗口」
 *   });
 *
 * 约定：拖动期间把 animation 压成 none。滑入动画的 @keyframes transform
 * 优先级高于内联 style，不压的话写 transform 也不动（这是最容易漏的一步，
 * 实测过：不压时计算值仍是动画帧，压了才等于内联值）。
 */
(() => {
  const DEFAULT_HANDLE = '.bottom-sheet__grabber, .bottom-sheet__head';
  const START_THRESHOLD = 8; // px，小于这个位移视为抖动，不算拖拽
  const DRAG_CLICK_GUARD = 350; // ms，松手后屏蔽随之而来的 click

  /** 清掉拖拽留下的内联样式。关闭路径必须调，否则下次打开不重播滑入。 */
  function reset(dialog) {
    if (!dialog) return;
    dialog.style.animation = '';
    dialog.style.transform = '';
    dialog.style.transition = '';
  }

  function attachDragToDismiss(dialog, options = {}) {
    if (!dialog) return () => {};

    const handle = options.handle || DEFAULT_HANDLE;
    const exclude = options.exclude || null;
    const isActive = options.isActive || (() => true);

    const onPointerDown = (event) => {
      if (event.button > 0) return;
      if (!isActive()) return;

      const target = event.target.closest(handle);
      if (!target) return;
      /* 关闭按钮常常就在头部行里，不能把"点它"当成拖拽起点 */
      if (exclude && event.target.closest(exclude)) return;

      const startY = event.clientY;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let moved = false;

      const onMove = (moveEvent) => {
        const dy = moveEvent.clientY - startY;
        if (dy <= 0) return; /* 只响应下拉，上推不做事 */
        moved = moved || dy > START_THRESHOLD;
        dialog.style.animation = 'none';
        dialog.style.transition = 'none';
        dialog.style.transform = `translateY(${dy}px)`;
      };

      const onEnd = (endEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);

        const dy = endEvent.clientY - startY;
        /* 阈值：面板高的 30%，且不少于 120px —— 矮面板（排序列表）不至于
           轻轻一划就关掉，高的（筛选）也不会要拖太久 */
        const dismissAt = Math.max(120, dialog.offsetHeight * 0.3);

        if (moved && dy > dismissAt) {
          reset(dialog);
          if (options.onDismiss) options.onDismiss();
          else dialog.close();
        } else {
          /* 弹回：先给一段回弹过渡，再从内联样式收回。
             animation 保持 none 直到关闭——回弹结束后重播滑入会很突兀，
             复位统一走 reset()（关闭时由宿主或 close 事件调用）。 */
          if (moved && !reduce) dialog.style.transition = 'transform 0.22s ease-out';
          dialog.style.transform = '';
          window.setTimeout(
            () => {
              if (moved && !reduce) dialog.style.transition = '';
            },
            moved && !reduce ? 240 : 0
          );
        }

        if (moved) options.onDragEnd?.(performance.now() + DRAG_CLICK_GUARD);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    return () => dialog.removeEventListener('pointerdown', onPointerDown);
  }

  window.BottomSheet = { attachDragToDismiss, reset };
})();
