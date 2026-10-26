/**
 * compare — 产品对比清单：状态层 + 三个自定义元素 + 飞入动画。
 *
 * 架构（SDD §6.2）：localStorage 存清单（key `ib:compare:v1`，只存 handle /
 * 分组键 / 标题 / 缩略图 URL，不存价格库存等易变数据）；服务端不知情，
 * 对比页由 `pages[<group>-compare]` 存在与否决定入口是否渲染（§6.2.1）。
 *
 * 元素分工（§6.2.8）：
 *   <compare-toggle>  商品卡 / 产品页的加入按钮容器（内部放原生 <button>）
 *   <compare-entry>   页头图标 + 角标（持久状态）
 *   <compare-bar>     底部临时确认条（瞬时反馈，不设自动消失计时）
 *
 * 纪律：
 * - 全部逻辑收在 Custom Element 内，无全局委托、无 window 上的函数挂载
 * - 监听用 AbortController 统一拆除；disconnectedCallback 释放后重连会重新绑
 * - 状态用 attribute 反映（aria-pressed / hidden），样式与 :has() 挂钩
 * - 冲突提示就地展开，不用模态弹窗（打断成本高、视线离开商品）
 * - prefers-reduced-motion: reduce → 飞入动画整段跳过
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'ib:compare:v1';
  const DEFAULT_MAX = 4;

  // ---------------------------------------------------------------- 状态层

  /** 读取清单，逐条校验并去重（同 handle 只留一条，位置以首次出现为准） */
  function readList() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return [];
    }
    if (!raw) return [];
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];

    const seen = new Set();
    const out = [];
    parsed.forEach((item) => {
      if (!item || typeof item.h !== 'string' || typeof item.g !== 'string') return;
      if (!item.h || !item.g || seen.has(item.h)) return;
      seen.add(item.h);
      out.push({
        h: item.h,
        g: item.g,
        t: typeof item.t === 'string' ? item.t : '',
        i: typeof item.i === 'string' ? item.i : '',
        /* 商品页 URL：超范围降级列要靠它给出「去看这个商品」的出口 */
        u: typeof item.u === 'string' ? item.u : '',
      });
    });
    return out;
  }

  function writeList(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* 隐私模式或配额满：功能降级为「本次点击无效」，不抛错 */
    }
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  /** 统一写入口：写盘 + 广播。mutator 收到副本，返回新数组 */
  function commit(mutator) {
    const next = mutator(readList());
    writeList(next);
    emit('compare:updated', { list: next, count: next.length });
    return next;
  }

  function clampMax(node) {
    const raw = parseInt(node && node.dataset ? node.dataset.max : '', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX;
  }

// --------------------------------------------------------- 全局冲突提示

  /** 取页面里唯一的 <compare-toast>，把内容推给它 */
  function showToast(options) {
    const toast = document.querySelector('compare-toast');
    if (!toast || typeof toast.show !== 'function') return;
    toast.show(options);
  }

  /**
   * 冲突提示的宿主（2026-10-25 刘工改）。
   *
   * 原来提示就地在商品卡内展开：卡窄、文字挤、还把卡片撑高推动下面的卡。
   * 现在改成从屏幕上缘滑入的全局条 —— 卡片高度不变，提示也更醒目。
   * 只承载需要用户决定的事（跨组冲突 / 已达上限），不承担成功反馈
   * （那是底部确认条的职责）。
   */
  class CompareToast extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      const { signal } = this.controller;

      this.message = this.querySelector('[data-compare-toast-message]');
      this.primary = this.querySelector('[data-compare-toast-primary]');
      this.close = this.querySelector('[data-compare-toast-close]');
      this.onPrimary = null;
      this.returnFocus = null;

      if (this.primary) {
        this.primary.addEventListener(
          'click',
          () => {
            const action = this.onPrimary;
            this.hide(false);
            if (action) action();
          },
          { signal },
        );
      }

      if (this.close) {
        this.close.addEventListener('click', () => this.hide(true), { signal });
      }

      document.addEventListener(
        'keydown',
        (event) => {
          if (event.key === 'Escape' && !this.hidden) this.hide(true);
        },
        { signal },
      );
    }

    disconnectedCallback() {
      if (this.controller) {
        this.controller.abort();
        this.controller = null;
      }
    }

    show({ message, primaryLabel, onPrimary, returnFocus }) {
      if (this.message) this.message.textContent = message || '';

      if (this.primary) {
        const hasAction = Boolean(primaryLabel);
        this.primary.textContent = hasAction ? primaryLabel : '';
        this.primary.hidden = !hasAction;
      }

      this.onPrimary = onPrimary || null;
      this.returnFocus = returnFocus || null;
      this.hidden = false;

      /* 有主操作就把焦点交给它（屏读会先读 aria-describedby 指的提示文案）；
         没有主操作则落在关闭键上，键盘用户不会卡在一个没法响应的提示里 */
      const focusTarget = this.primary && !this.primary.hidden ? this.primary : this.close;
      if (focusTarget) focusTarget.focus();
    }

    hide(restoreFocus) {
      this.hidden = true;
      this.onPrimary = null;
      const target = this.returnFocus;
      this.returnFocus = null;
      if (restoreFocus && target && target.isConnected) target.focus();
    }
  }

  // ------------------------------------------------------------ compare-toggle

  class CompareToggle extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.button = this.querySelector('button');
      if (!this.button) return;

      this.max = clampMax(this);
      this.controller = new AbortController();
      const { signal } = this.controller;

      this.onClick = this.onClick.bind(this);
      this.button.addEventListener('click', this.onClick, { signal });
      document.addEventListener('compare:updated', () => this.sync(), { signal });

      this.sync();
    }

    disconnectedCallback() {
      if (this.controller) {
        this.controller.abort();
        this.controller = null;
      }
    }

    get group() {
      return (this.dataset.group || '').trim();
    }

    get handle() {
      return (this.dataset.handle || '').trim();
    }

    /** aria-pressed 跟随清单状态（样式靠 [aria-pressed='true'] 命中） */
    sync() {
      if (!this.button) return;
      const inList = readList().some((item) => item.h === this.handle);
      this.button.setAttribute('aria-pressed', inList ? 'true' : 'false');
      this.toggleAttribute('data-in-list', inList);
    }

    onClick() {
      const handle = this.handle;
      const group = this.group;
      if (!handle || !group) return;

      const list = readList();
      const existing = list.find((item) => item.h === handle);

      if (existing) {
        this.remove(handle);
        return;
      }

      if (list.length === 0) {
        this.add();
        return;
      }

      if (list[0].g !== group) {
        this.showCrossGroupConflict(list);
        return;
      }

      if (list.length >= this.max) {
        this.showFullConflict();
        return;
      }

      this.add();
    }

    remove(handle) {
      const next = commit((list) => list.filter((item) => item.h !== handle));
      emit('compare:removed', { handle, count: next.length });
    }

    add() {
      const item = {
        h: this.handle,
        g: this.group,
        t: (this.dataset.title || '').trim(),
        i: (this.dataset.image || '').trim(),
        u: (this.dataset.url || '').trim(),
      };
      const next = commit((list) => list.concat([item]));
      emit('compare:added', {
        handle: item.h,
        group: item.g,
        image: item.i,
        button: this.button,
        count: next.length,
      });
    }

    /** 跨组：清空是安全的，那几款本来就不能与新品同组比较 */
    showCrossGroupConflict() {
      showToast({
        message: this.t('conflict_cross_group'),
        primaryLabel: this.t('conflict_clear_and_add'),
        returnFocus: this.button,
        onPrimary: () => {
          commit(() => []);
          this.add();
        },
      });
    }

    /** 已满：不给一键替换 —— 牺牲哪一款是用户的判断，替用户猜是越权 */
    showFullConflict() {
      showToast({
        message: this.t('conflict_full'),
        returnFocus: this.button,
      });
    }

    /** 文案由 Liquid 通过 data-* 下发，前端不硬编码 */
    t(key) {
      const attr = `label${key.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase())}`;
      return this.dataset[attr] || '';
    }
  }

  // ------------------------------------------------------------- compare-entry

  class CompareEntry extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.link = this.querySelector('a');
      if (!this.link) return;

      this.controller = new AbortController();
      const { signal } = this.controller;

      this.max = clampMax(this);
      this.urls = this.parseUrls();

      document.addEventListener('compare:updated', () => this.sync(), { signal });
      /* 跨标签页同步：另一个标签页改了清单，这里跟着走 */
      window.addEventListener(
        'storage',
        (event) => {
          if (event.key === STORAGE_KEY) this.sync();
        },
        { signal },
      );

      this.sync();
    }

    disconnectedCallback() {
      if (this.controller) {
        this.controller.abort();
        this.controller = null;
      }
    }

    /**
     * 每组一个 data-url-<group> 属性（组名含连字符，dataset 驼峰化会撞名，
     * 故用 getAttribute 原样取），data-groups 列出实际有对比页的组。
     * Liquid 侧因此不需要拼 JSON 字符串——手拼引号是最容易出错的一环。
     */
    parseUrls() {
      const urls = {};
      const groups = (this.dataset.groups || '')
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean);
      groups.forEach((key) => {
        const value = this.getAttribute(`data-url-${key}`);
        if (value) urls[key] = value;
      });
      return urls;
    }

    /** 清单非空取首项的分组，空清单落到默认组（服务端给的第一个有对比页的组） */
    resolveGroup(list) {
      if (list.length > 0 && this.urls[list[0].g]) return list[0].g;
      const fallback = (this.dataset.defaultGroup || '').trim();
      if (fallback && this.urls[fallback]) return fallback;
      const keys = Object.keys(this.urls);
      return keys.length > 0 ? keys[0] : '';
    }

    sync() {
      const list = readList();
      const count = list.length;
      const group = this.resolveGroup(list);
      const url = group ? this.urls[group] : '';

      /* JS 已接管：撤掉 reserved 隐藏态，入口可以显示了 */
      this.removeAttribute('data-pending');

      const badge = this.querySelector('[data-compare-count]');
      if (badge) {
        badge.textContent = String(count);
        badge.hidden = count === 0;
      }

      this.toggleAttribute('data-empty', count === 0);

      if (url) {
        this.link.href = url;
        this.link.removeAttribute('aria-disabled');
      } else {
        this.link.setAttribute('aria-disabled', 'true');
      }

      const labelTpl = count > 0 ? this.dataset.labelCount : this.dataset.labelEmpty;
      if (labelTpl) {
        this.link.setAttribute('aria-label', labelTpl.replace('[count]', String(count)));
      }
    }
  }

  // --------------------------------------------------------------- compare-bar

  class CompareBar extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      const { signal } = this.controller;

      this.max = clampMax(this);
      this.built = false;
      /* 自己就在对比页时整条不显示（含胶囊）：那里不需要「去对比」的入口 */
      this.suppressed = Boolean(document.querySelector('[data-compare-page-marker]'));

      document.addEventListener('compare:added', (event) => this.announce(event), { signal });
      document.addEventListener('compare:updated', () => this.sync(), { signal });

      this.sync();
    }

    disconnectedCallback() {
      if (this.controller) {
        this.controller.abort();
        this.controller = null;
      }
    }

    /** 惰性构建：首次需要时才克隆 <template>，隐藏组件不提前占 DOM */
    build() {
      if (this.built) return;
      const tpl = this.querySelector('template');
      if (!tpl) return;
      this.appendChild(tpl.content.cloneNode(true));
      this.built = true;

      this.inner = this.querySelector('[data-compare-inner]');
      this.list = this.querySelector('[data-compare-items]');
      this.progress = this.querySelector('[data-compare-progress]');
      this.view = this.querySelector('[data-compare-view]');
      this.status = this.querySelector('[data-compare-status]');

      const collapseBtn = this.querySelector('[data-compare-collapse]');
      if (collapseBtn) collapseBtn.addEventListener('click', () => this.setCollapsed(true));

      this.pill = this.querySelector('[data-compare-expand]');
      if (this.pill) {
        this.pill.addEventListener('click', (event) => {
          /* 移动端：胶囊本身就是进对比页的入口，不拦截 */
          if (window.matchMedia('(max-width: 767px)').matches) return;
          event.preventDefault();
          this.setCollapsed(false);
        });
      }

      /* 单项移除用事件委托：条目是动态生成的，委托在容器上而非 document */
      if (this.list) {
        this.list.addEventListener('click', (event) => {
          const btn = event.target.closest('[data-compare-remove]');
          if (!btn) return;
          const handle = btn.dataset.compareRemove;
          commit((list) => list.filter((item) => item.h !== handle));
          emit('compare:removed', { handle });
        });
      }
    }

    /**
     * 收起 / 展开。底部条是常驻的（有对比项就在），收起只是让开内容，
     * 不持久化——刷新后回到展开态，避免用户「明明有对比项却找不到入口」。
     */
    setCollapsed(collapsed) {
      this.toggleAttribute('data-collapsed', collapsed);
      const target = this.querySelector(
        collapsed ? '[data-compare-expand]' : '[data-compare-collapse]',
      );
      if (target) target.focus();
    }

    /** 加入后只做播报，显隐交给 sync（常驻） */
    announce(event) {
      const label = this.dataset.labelAdded || '';
      if (!label || !this.status) return;
      const count = (event.detail && event.detail.count) || readList().length;
      this.status.textContent = label.replace('[count]', String(count));
    }

    sync() {
      if (this.suppressed) {
        this.hidden = true;
        return;
      }

      const list = readList();
      if (list.length === 0) {
        this.hidden = true;
        this.removeAttribute('data-collapsed');
        return;
      }

      this.build();
      if (!this.built) return;
      this.hidden = false;

      const pillCount = this.querySelector('[data-compare-pill-count]');
      if (pillCount) pillCount.textContent = String(list.length);

      if (this.pill) {
        const target = this.resolveUrl(list[0].g);
        if (target) this.pill.setAttribute('href', target);
      }

      this.list.textContent = '';
      list.forEach((item) => {
        const li = document.createElement('li');
        li.className = 'compare-bar__item';

        if (item.i) {
          const img = document.createElement('img');
          img.src = item.i;
          img.alt = '';
          img.width = 40;
          img.height = 40;
          img.loading = 'lazy';
          li.appendChild(img);
        }

        /* 允许删到空：清空即回到「没有选择」的状态，对比页会显示默认表 */
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'compare-bar__remove';
        remove.dataset.compareRemove = item.h;
        remove.setAttribute('aria-label', `${this.dataset.labelRemove || 'Remove'} ${item.t}`.trim());
        remove.textContent = '\u00d7';
        li.appendChild(remove);

        this.list.appendChild(li);
      });

      if (this.progress) {
        const tpl = this.dataset.labelProgress || '[count]/[max]';
        this.progress.textContent = tpl
          .replace('[count]', String(list.length))
          .replace('[max]', String(this.max));
      }

      const group = list[0].g;
      const url = this.resolveUrl(group);
      if (this.view) {
        if (url) {
          this.view.href = url;
          this.view.removeAttribute('aria-disabled');
        } else {
          this.view.setAttribute('aria-disabled', 'true');
        }
      }
    }

    resolveUrl(group) {
      if (!group) return '';
      return this.getAttribute(`data-url-${group}`) || '';
    }
  }

  // ------------------------------------------------------------- 飞入动画

  const FLY_DURATION_MS = 480;
  const FLY_SIZE = 56;
  const FLY_ARC_PX = 90;

  function findTarget() {
    const entry = document.querySelector('compare-entry');
    if (!entry) return null;
    const icon = entry.querySelector('svg') || entry;
    const rect = icon.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 ? icon : null;
  }

  function buildFlyFrames(from, to) {
    const half = FLY_SIZE / 2;
    const x1 = from.left + from.width / 2;
    const y1 = from.top + from.height / 2;
    const x2 = to.left + to.width / 2;
    const y2 = to.top + to.height / 2;
    const yc = Math.min(y1, y2) - FLY_ARC_PX;

    const frames = [];
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      const x = (1 - t) * x1 + t * x2;
      const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * yc + t * t * y2;
      frames.push({
        transform: `translate(${x - half}px, ${y - half}px) scale(${1 - 0.65 * t})`,
        opacity: i === 10 ? 0 : 1,
      });
    }
    return frames;
  }

  document.addEventListener('compare:added', (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const detail = event.detail || {};

    /* 第一次加入时页头图标刚从 display:none 变可见，等一帧再量坐标，
       否则可能拿到 0×0 的矩形而放弃动画（实测过） */
    requestAnimationFrame(() => {
      const target = findTarget();
      if (!target) return; /* 页头图标不存在（未配置对比页）→ 不播放 */

      const button = detail.button;
      const card = button ? button.closest('.product-card') : null;
      const sourceImg = card ? card.querySelector('.product-card__media img') : null;
      const source = sourceImg ? sourceImg.getBoundingClientRect() : null;
      if (!source || source.width === 0) return;

      const clone = document.createElement('img');
      clone.src = detail.image || sourceImg.currentSrc || sourceImg.src;
      clone.alt = '';
      clone.setAttribute('aria-hidden', 'true');
      Object.assign(clone.style, {
        position: 'fixed',
        insetBlockStart: '0',
        insetInlineStart: '0',
        width: `${FLY_SIZE}px`,
        height: `${FLY_SIZE}px`,
        objectFit: 'cover',
        borderRadius: '50%',
        zIndex: '9999',
        pointerEvents: 'none',
        boxShadow: '0 4px 14px rgb(0 0 0 / 25%)',
      });
      document.body.appendChild(clone);

      const animation = clone.animate(buildFlyFrames(source, target.getBoundingClientRect()), {
        duration: FLY_DURATION_MS,
        easing: 'linear',
        fill: 'forwards',
      });

      const cleanup = () => clone.remove();
      animation.addEventListener('finish', cleanup, { once: true });
      animation.addEventListener('cancel', cleanup, { once: true });
    });
  });

  // ------------------------------------------------- 对比页：客户端接管表格

  /**
   * 服务端默认表在无 JS / JS 报错时是最终答案；这里只在「清单里有本组商品」时
   * 用同一套 class 结构重建（SDD §6.2.4 要求两份标记逐项一致）。
   * 数据岛只含 metafield 值，缩略图取自加入时存下的 120px 派生图。
   */
  /**
   * 列切换导航（SDD §6.2.4）：移动端横向滚动对键盘/屏读用户不可用，
   * 这条「上一款 / 下一款」是等价路径。表格没溢出时整块不显示。
   */
  function initColumnNav(wrap) {
    const host = wrap.parentNode;
    const nav = host && host.querySelector('[data-compare-cols]');
    if (!nav) return;

    /* 表格可能被重建（JS 接管），重复初始化前先拆掉旧监听 */
    if (nav.__cleanup) nav.__cleanup();
    const controller = new AbortController();
    const { signal } = controller;
    nav.__cleanup = () => controller.abort();

    const table = wrap.querySelector('table');
    if (!table) return;

    const headerCells = Array.from(table.querySelectorAll('thead th')).slice(1);
    if (headerCells.length < 2) {
      nav.removeAttribute('data-overflow');
      return;
    }

    const prev = nav.querySelector('[data-compare-prev]');
    const next = nav.querySelector('[data-compare-next]');
    const status = nav.querySelector('[data-compare-col-status]');

    const overflow = wrap.scrollWidth - wrap.clientWidth > 4;
    nav.toggleAttribute('data-overflow', overflow);
    if (!overflow) return;

    let index = 0;

    const paint = () => {
      if (prev) prev.disabled = index <= 0;
      if (next) next.disabled = index >= headerCells.length - 1;
      if (status) status.textContent = `${index + 1} / ${headerCells.length}`;
    };

    const go = (target) => {
      index = Math.max(0, Math.min(headerCells.length - 1, target));
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      wrap.scrollTo({
        left: headerCells[index].offsetLeft,
        behavior: reduce ? 'auto' : 'smooth',
      });
      paint();
    };

    if (prev) prev.addEventListener('click', () => go(index - 1), { signal });
    if (next) next.addEventListener('click', () => go(index + 1), { signal });

    /* 用户直接横滚时也要让按钮状态跟上 */
    wrap.addEventListener(
      'scroll',
      () => {
        let best = 0;
        let bestDist = Infinity;
        headerCells.forEach((cell, i) => {
          const dist = Math.abs(cell.offsetLeft - wrap.scrollLeft);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });
        index = best;
        paint();
      },
      { passive: true, signal },
    );

    paint();
  }

  /**
   * 把清单里存的缩略图地址升到 480px 宽。
   *
   * 早期版本只存 120px 派生图，铺到表头（~400px）会糊；这里在渲染时统一改写
   * `width=` 参数，**已经加入过的旧条目也能变清晰**，不必让用户重新加一遍。
   */
  function upgradeImageWidth(url, width) {
    if (!url) return '';
    const target = String(width || 480);
    if (/[?&]width=\d+/.test(url)) return url.replace(/([?&])width=\d+/, `$1width=${target}`);
    return url + (url.includes('?') ? '&' : '?') + `width=${target}`;
  }

  /** 把补拉回来的值填进某一列（就地改单元格，不重建表格以免闪烁） */
  function fillColumn(tbody, index, values) {
    tbody.querySelectorAll('tr').forEach((tr, rowIndex) => {
      const cell = tr.children[index + 1];
      if (!cell) return;
      cell.classList.remove('compare-table__cell--out-of-scope');
      const value = values[rowIndex] || '';
      let span = cell.querySelector('.compare-table__value');
      if (!span) {
        span = document.createElement('span');
        cell.appendChild(span);
      }
      span.className = value
        ? 'compare-table__value'
        : 'compare-table__value compare-table__value--missing';
      span.textContent = value || '\u2014';
    });
  }

  /** 补拉成功后摘掉该列的表头提示与底色（th 第一个是角落格，列从 1 起） */
  function clearOutOfScopeHeader(headRow, index) {
    const th = headRow.children[index + 1];
    if (!th) return;
    th.classList.remove('compare-table__col--out-of-scope');
    const note = th.querySelector('.compare-table__out-of-scope');
    if (note) note.remove();
  }

  /** 值变了要重算差异标记（同一行各列去重后 ≤1 即视为相同） */
  function recomputeDiff(tbody) {
    const tableRows = Array.from(tbody.querySelectorAll('tr'));
    if (tableRows.length === 0) return;
    const columnCount = tableRows[0].children.length - 1;
    tableRows.forEach((tr) => {
      const values = [];
      for (let i = 0; i < columnCount; i += 1) {
        const cell = tr.children[i + 1];
        const text = cell ? cell.textContent.trim() : '';
        if (text && text !== '\u2014') values.push(text);
      }
      delete tr.dataset.compareSame;
      delete tr.dataset.compareDiff;
      if (new Set(values).size <= 1) tr.dataset.compareSame = '';
      else tr.dataset.compareDiff = '';
    });
  }

  /**
   * 表头 × ：从清单移除该商品并删掉这一列。
   * 允许删到空——清空清单是合法状态，但表格会变成零列，没有意义，
   * 所以删空后重新载入页面，让服务端默认表回来（这是唯一的边界操作）。
   */
  function removeColumn(wrap, handle) {
    const table = wrap.querySelector('table');
    if (!table) return;

    const ths = Array.from(table.querySelectorAll('thead th'));
    const index = ths.findIndex((th) => th.dataset.compareColumn === handle);
    if (index < 1) return;

    ths[index].remove();
    table.querySelectorAll('tbody tr').forEach((tr) => {
      if (tr.children[index]) tr.children[index].remove();
    });

    commit((list) => list.filter((item) => item.h !== handle));

    if (table.querySelectorAll('thead th').length <= 1) {
      window.location.reload();
      return;
    }

    recomputeDiff(table.querySelector('tbody'));
    initColumnNav(wrap);
  }

  /**
   * 超范围商品的按需补拉（SDD §6.2.6）。
   *
   * 数据岛受 `for` 循环 50 次硬限：集合超过 50 款时，排在后面的商品在岛里没有规格。
   * 这里对每一列单独拉一次产品页的 compare-lookup section 补齐。
   * 失败一律静默——占位本身就设计好的降级，不能让补拉失败变成更糟的状态。
   */
  function backfillOutOfScope({ dataEl, rows, columns, tbody, headRow }) {
    const base = dataEl.dataset.productBase || '/products/';
    const pending = columns
      .map((col, index) => ({ col, index }))
      .filter((entry) => entry.col.outOfScope && entry.col.h);
    if (pending.length === 0) return;

    pending.forEach(({ col, index }) => {
      const url = `${base}${encodeURIComponent(col.h)}?sections=compare-lookup`;
      /* ⚠️ 不要带 Accept: application/json —— 那会让 Shopify 把 /products/x
         当成 AJAX Product API 请求，返回 {"product":{...}}（不含 metafields），
         而不是 ?sections= 的 {"compare-lookup":"<section html>"}。 */
      fetch(url)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload) => {
          const html = payload && payload['compare-lookup'];
          if (!html) return;
          const match = html.match(/data-compare-lookup[^>]*>([\s\S]*?)<\/script>/);
          if (!match) return;

          let data;
          try {
            data = JSON.parse(match[1]);
          } catch {
            return;
          }
          if (!data || typeof data.v !== 'object' || data.v === null) return;

          columns[index].v = rows.map((row) => data.v[row.k] || '');
          columns[index].outOfScope = false;
          if (data.n) columns[index].n = data.n;

          fillColumn(tbody, index, columns[index].v);
          clearOutOfScopeHeader(headRow, index);
          recomputeDiff(tbody);
        })
        .catch(() => {
          /* 补拉失败保留占位，不打扰用户 */
        });
    });
  }

  function initComparePage() {
    const root = document.querySelector('[data-compare-page]');
    const dataEl = document.getElementById('cmp-data');
    if (!root || !dataEl) return;

    let data;
    try {
      data = JSON.parse(dataEl.textContent);
    } catch {
      return; /* 数据岛坏了就保留服务端表格，不抛错 */
    }
    if (!data || !Array.isArray(data.rows) || !Array.isArray(data.items)) return;

    const group = root.dataset.compareGroup || data.group;
    const empty = root.querySelector('[data-compare-empty]');
    const list = readList().filter((item) => item.g === group);

    /* 没有本组选择：什么都不渲染，让服务端的空状态留着（对比页已无默认表） */
    if (list.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }

    const rows = data.rows;
    const byHandle = new Map(data.items.map((item) => [item.h, item]));

    const columns = list.map((entry) => {
      const found = byHandle.get(entry.h);
      const image = upgradeImageWidth(entry.i, 480);
      if (found) return { ...found, image, outOfScope: false };
      /* 超出数据岛范围的 handle：显式降级，不静默丢列（§6.2.6） */
      return {
        h: entry.h,
        t: entry.t,
        u: entry.u || '',
        n: null,
        v: [],
        image,
        outOfScope: true,
      };
    });

    const wrap = root.querySelector('[data-compare-table-wrap]');
    if (!wrap) return;

    const table = document.createElement('table');
    table.className = 'compare-table';

    const caption = document.createElement('caption');
    caption.className = 'visually-hidden';
    caption.textContent = root.querySelector('.compare-page__title')?.textContent?.trim() || '';
    table.appendChild(caption);

    // ---- thead ----
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.scope = 'col';
    corner.className = 'compare-table__corner';
    headRow.appendChild(corner);

    columns.forEach((col) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.className = 'compare-table__col';

      if (col.outOfScope) {
        th.className = 'compare-table__col compare-table__col--out-of-scope';
        if (col.image) {
          const img = document.createElement('img');
          img.src = col.image;
          img.alt = '';
          /* 与 CSS 的 aspect-ratio: 4/3 对齐，避免属性尺寸把容器高度带偏 */
          img.width = 400;
          img.height = 300;
          img.loading = 'lazy';
          th.appendChild(img);
        }
        const note = document.createElement('p');
        note.className = 'compare-table__out-of-scope';
        note.textContent = dataEl.dataset.labelNotInScope || '';
        th.appendChild(note);
        const link = document.createElement('a');
        link.className = 'compare-table__product-title';
        link.href = col.u || '#';
        link.textContent = col.t || col.h;
        th.appendChild(link);
        headRow.appendChild(th);
        return;
      }

      const link = document.createElement('a');
      link.className = 'compare-table__product';
      link.href = col.u || '#';

      if (col.image) {
        const img = document.createElement('img');
        img.src = col.image;
        img.alt = '';
        img.width = 400;
        img.height = 300;
        img.loading = 'lazy';
        link.appendChild(img);
      }

      const title = document.createElement('span');
      title.className = 'compare-table__product-title';
      title.textContent = col.t || '';
      link.appendChild(title);
      th.appendChild(link);

      th.dataset.compareColumn = col.h;
      const removeCol = document.createElement('button');
      removeCol.type = 'button';
      removeCol.className = 'compare-table__col-remove';
      removeCol.dataset.compareRemoveCol = col.h;
      const removeLabel = dataEl.dataset.labelRemove || '';
      removeCol.setAttribute('aria-label', `${removeLabel} ${col.t || col.h}`.trim());
      removeCol.textContent = '\u00d7';
      th.appendChild(removeCol);

      if (col.n) {
        const details = document.createElement('details');
        details.className = 'compare-table__note';
        const summary = document.createElement('summary');
        summary.setAttribute('aria-label', dataEl.dataset.labelVariantNote || '');
        const mark = document.createElement('span');
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = 'i';
        summary.appendChild(mark);
        details.appendChild(summary);
        const noteText = document.createElement('p');
        noteText.textContent = col.n;
        details.appendChild(noteText);
        th.appendChild(details);
      }

      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // ---- tbody ----
    const tbody = document.createElement('tbody');
    rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');

      const labelCell = document.createElement('th');
      labelCell.scope = 'row';
      labelCell.className = 'compare-table__row-label';
      labelCell.textContent = row.l || '';
      tr.appendChild(labelCell);

      const values = columns.map((col) => (Array.isArray(col.v) ? col.v[rowIndex] || '' : ''));

      values.forEach((value, index) => {
        const td = document.createElement('td');
        td.className = 'compare-table__cell';
        if (columns[index] && columns[index].outOfScope) {
          td.className = 'compare-table__cell compare-table__cell--out-of-scope';
        }
        const span = document.createElement('span');
        if (value) {
          span.className = 'compare-table__value';
          span.textContent = value;
        } else {
          span.className = 'compare-table__value compare-table__value--missing';
          span.textContent = '\u2014';
        }
        td.appendChild(span);
        tr.appendChild(td);
      });

      /* 差异标记：同一行各列不全相同才算差异（§6.2.2 要求高亮差异、相同可折叠） */
      const distinct = new Set(values.filter(Boolean));
      if (distinct.size <= 1) {
        tr.dataset.compareSame = '';
      } else {
        tr.dataset.compareDiff = '';
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    wrap.textContent = '';
    wrap.appendChild(table);
    wrap.setAttribute('data-ready', '');
    if (empty) empty.hidden = true;
    initColumnNav(wrap); /* 表格换了，导航要按新的列数重装 */

    /* 表头 × 移除该列（委托挂在 wrap 上，列是动态生成的） */
    wrap.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-compare-remove-col]');
      if (!btn) return;
      removeColumn(wrap, btn.dataset.compareRemoveCol);
    });

    // ---- 只看差异（相同行折叠） ----
    if (tbody.querySelectorAll('tr[data-compare-same]').length > 0) {
      const toggle = document.createElement('label');
      toggle.className = 'compare-page__diff-toggle';
      const box = document.createElement('input');
      box.type = 'checkbox';
      const text = document.createElement('span');
      text.textContent = dataEl.dataset.labelDiffOnly || '';
      toggle.appendChild(box);
      toggle.appendChild(text);
      wrap.parentNode.insertBefore(toggle, wrap);

      box.addEventListener('change', () => {
        tbody.querySelectorAll('tr[data-compare-same]').forEach((tr) => {
          tr.hidden = box.checked;
        });
      });
    }

    /* 载入播报：不抢焦点，只让屏读用户知道表格换了（§6.2.4） */
    const status = document.createElement('p');
    status.className = 'visually-hidden';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const loadedTpl = dataEl.dataset.labelLoaded || '';
    status.textContent = loadedTpl.replace('[count]', String(columns.length));
    root.appendChild(status);

    backfillOutOfScope({ dataEl, rows, columns, tbody, headRow });
  }

  // ------------------------------------------------------------- 注册元素

  customElements.define('compare-toggle', CompareToggle);
  customElements.define('compare-entry', CompareEntry);
  customElements.define('compare-bar', CompareBar);
  customElements.define('compare-toast', CompareToast);

  /**
   * 浏览器「回退」命中 bfcache 时不会重新执行脚本，DOM 停在旧快照上 ——
   * 表现为：对比页删了商品，退回去底部条还在、商品卡的勾选态还是旧的。
   * 这里在 pageshow(persisted) 时重新读盘并广播一次，全部组件按新状态 sync。
   */
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    const list = readList();
    emit('compare:updated', { list, count: list.length });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComparePage, { once: true });
  } else {
    initComparePage();
  }
})();
