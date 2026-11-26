/**
 * compare — 产品对比清单：状态层 + 两个自定义元素 + 飞入动画。
 *
 * 架构（SDD §6.2）：localStorage 存清单（key `ib:compare:v1`，只存 handle /
 * 分组键 / 标题 / 缩略图 URL，不存价格库存等易变数据）；服务端不知情，
 * 对比页由 `pages[<group>-compare]` 存在与否决定入口是否渲染（§6.2.1）。
 *
 * 元素分工（§6.2.8）：
 *   <compare-toggle>  商品卡 / 产品页的加入按钮容器（内部放原生 <button>）
 *   <compare-entry>   页头图标 + 角标（持久状态，加入成功的唯一可见反馈）
 *   <compare-toast>   冲突提示（跨组 / 已满），只承载「需要用户决定」的事
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
  const TOAST_AUTO_HIDE_MS = 3000;

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

  /**
   * 取某分组对比页的地址。
   *
   * URL 映射由 `compare-page-urls` 一次性输出在 `<compare-entry>` 上（每页只跑 4 次
   * `pages[handle]` 探测），这里直接读属性 —— **不在每张商品卡上重跑一遍探测**，
   * 集合页 24 张卡就是 96 次。
   * 未配置对比页 / 该组没有对比页 → 返回空串，调用方据此降级（不给入口）。
   */
  function comparePageUrl(group) {
    if (!group) return '';
    const entry = document.querySelector('compare-entry');
    if (!entry) return '';
    return entry.getAttribute(`data-url-${group}`) || '';
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
   * 只承载需要用户决定的事（跨组冲突 / 已达上限）；成功的加入反馈由页头角标
   * 的视觉变化 + `snippets/compare-announcer.liquid` 的播报承担。
   */
  class CompareToast extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      const { signal } = this.controller;

      this.message = this.querySelector('[data-compare-toast-message]');
      this.primary = this.querySelector('[data-compare-toast-primary]');
      this.actions = this.querySelector('.compare-toast__actions');
      this.close = this.querySelector('[data-compare-toast-close]');
      this.onPrimary = null;
      this.returnFocus = null;
      this.timer = null;
      this.skipFocusPause = false;

      /* 3 秒自动收起。但鼠标停上来、或键盘把焦点移进来时暂停计时 ——
         WCAG 2.2.1 要求时限可延长；何况这是「需要你决定」的提示，
         正在读/正要点的瞬间被抽走最恼人。 */
      this.addEventListener('mouseenter', () => this.clearTimer(), { signal });
      this.addEventListener(
        'mouseleave',
        () => {
          if (!this.hidden) this.startTimer();
        },
        { signal },
      );
      this.addEventListener(
        'focusin',
        () => {
          /* 打开时我们把焦点主动放到按钮上，这一次不算「用户进来了」 */
          if (this.skipFocusPause) return;
          this.clearTimer();
        },
        { signal },
      );
      this.addEventListener(
        'focusout',
        () => {
          requestAnimationFrame(() => {
            if (this.hidden || this.contains(document.activeElement)) return;
            this.startTimer();
          });
        },
        { signal },
      );

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
      this.clearTimer();
      if (this.controller) {
        this.controller.abort();
        this.controller = null;
      }
    }

    startTimer() {
      this.clearTimer();
      this.timer = setTimeout(() => this.hide(true), TOAST_AUTO_HIDE_MS);
    }

    clearTimer() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    }

    show({ message, primaryLabel, onPrimary, returnFocus }) {
      if (this.message) this.message.textContent = message || '';

      const hasAction = Boolean(primaryLabel);

      if (this.primary) {
        this.primary.textContent = hasAction ? primaryLabel : '';
        this.primary.hidden = !hasAction;
      }
      /* 没有主操作时整行塌陷，别留一条空白带 */
      if (this.actions) this.actions.hidden = !hasAction;

      this.onPrimary = onPrimary || null;
      this.returnFocus = returnFocus || null;
      this.hidden = false;

      /* 有主操作就把焦点交给它（屏读会先读 aria-describedby 指的提示文案）；
         没有主操作则落在关闭键上，键盘用户不会卡在一个没法响应的提示里 */
      const focusTarget = this.primary && !this.primary.hidden ? this.primary : this.close;
      this.skipFocusPause = true;
      if (focusTarget) focusTarget.focus();
      this.skipFocusPause = false;

      this.startTimer();
    }

    hide(restoreFocus) {
      this.clearTimer();
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

      /* 文案切换（2026-10-29 刘工）：加入对比后 "Add to compare" → "Added to compare"。
         初始文案存下来作「未加入」态，加入态文案由 Liquid 经 data-label-added 下发，
         前端不硬编码英文（AGENTS 红线）。label 元素可能因主题结构缺失，取不到就
         只切 aria-pressed 不切文案，不抛错。 */
      this.label = this.button.querySelector('.product-compare__label');
      this.labelIdle = this.label ? this.label.textContent.trim() : '';
      this.labelAdded = (this.dataset.labelAdded || '').trim();

      this.onClick = this.onClick.bind(this);
      this.button.addEventListener('click', this.onClick, { signal });
      document.addEventListener('compare:updated', () => this.sync(), { signal });

      this.sync();
    }

    disconnectedCallback() {
      if (this.conflictTimer) {
        clearTimeout(this.conflictTimer);
        this.conflictTimer = null;
      }
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

    /** aria-pressed 跟随清单状态（样式靠 [aria-pressed='true'] 命中）；文案同步切换 */
    sync() {
      if (!this.button) return;
      const inList = readList().some((item) => item.h === this.handle);
      this.button.setAttribute('aria-pressed', inList ? 'true' : 'false');
      this.toggleAttribute('data-in-list', inList);

      /* 加入/移除时切文案（2026-10-29 刘工）。data-label-added 缺失时保持原文案，
         只反映在 aria-pressed 上——文案不是本按钮的生命线，不能因它坏了功能。 */
      if (this.label && this.labelAdded) {
        this.label.textContent = inList ? this.labelAdded : this.labelIdle;
      }
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
    /**
     * 跨组冲突：按钮（连勾选框）转红并晃 0.5s。
     * toast 在屏幕顶部，而用户眼睛停在刚点的卡片上 —— 先给本地反馈，
     * 再让顶部提示说明原因，视线不用来回找。
     */
    flashConflict() {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.button.classList.add('is-conflict');
      clearTimeout(this.conflictTimer);
      this.conflictTimer = setTimeout(
        () => this.button.classList.remove('is-conflict'),
        reduce ? 1200 : 500,
      );
    }

    showCrossGroupConflict() {
      this.flashConflict();
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

    /**
     * 已满：不给一键替换 —— 牺牲哪一款是用户的判断，替用户猜是越权。
     *
     * 但「请先移除一款」得给得出移除的去处（2026-11-16 补）：底部对比条删除后，
     * 就地移除只剩「回商品卡取消勾选」和「进对比页」，比原来多绕一步。
     * 清单本来就摆在对比页上，主按钮直接送过去。
     * 没有对比页时**不给按钮** —— 指向一个不存在的页面比不给按钮更糟。
     */
    showFullConflict() {
      const url = comparePageUrl(this.group);
      showToast({
        message: this.t('conflict_full'),
        primaryLabel: url ? this.t('conflict_manage') : '',
        returnFocus: this.button,
        onPrimary: url
          ? () => {
              window.location.href = url;
            }
          : null,
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

      /* 页头那份外面包着 <ui-tooltip>（2026-11-15）：提示文案跟状态走——
         空态教「这东西怎么用」，有料说「点进去看到什么」，不复述 aria-label。
         这里写 attribute 而不是调组件方法：ui-tooltip 可能还没升级（两个脚本
         都是 defer，先后由页面决定），而 attribute 是纯数据，晚到的组件
         在 connectedCallback 里读到的就是对的。 */
      const tip = this.closest('ui-tooltip');
      const tipTpl = count > 0 ? this.dataset.tipCount : this.dataset.tipEmpty;
      if (tip && tipTpl) {
        tip.setAttribute('label', tipTpl.replace('[count]', String(count)));
      }
    }
  }

  // ------------------------------------------------------------- 飞入动画

  const FLY_DURATION_MS = 480;
  const FLY_SIZE = 56;
  const FLY_ARC_PX = 90;

  function findTarget() {
    /* 页头现在有两份（桌面工具区 / 移动行，2026-11-26），抽屉里那份躺在 <template>
       里不参与渲染。按文档顺序取第一个**真正有尺寸**的：另一份在断点外被
       display:none 包着，矩形是 0×0 —— 只取 querySelector 的第一个，移动端的
       飞入动画会永远落空（它拿到的是桌面那份的空盒子）。 */
    const entries = document.querySelectorAll('compare-entry');
    for (const entry of entries) {
      const icon = entry.querySelector('svg') || entry;
      const rect = icon.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return icon;
    }
    return null;
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

  /* 对比页策略：服务端默认表在无 JS / JS 报错时是最终答案；这里只在
     「清单里有本组商品」时用同一套 class 结构重建（SDD §6.2.4 要求两份标记
     逐项一致）。数据岛只含 metafield 值，缩略图取自加入时存下的 120px 派生图。 */
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

  /* --------------------------------------------- 变体差异说明（§6.2.4）定位

     数据岛里 note 只有一句话（metafield 是 single_line_text_field，没有结构化
     的行键），而它说明的是「某一个参数」随变体变化 ⇒ 该落在「该商品 × 该参数」
     那一格，不是产品标题下面。定位靠「note 里出现的数值 ↔ 该行显示值」：商家
     写这句话时必然引用这个参数的取值（"166 cc or 150 cc"），而该列该行显示的
     就是其中一个。命中唯一一行才落地；一个都对不上（没写数值）或对上两行
     （说不清是哪行）一律不猜，退回产品列头——宁可含糊，不可指错行。 */

  /** 文本里的数值片段（去千分位逗号、去结尾 .0，与 Liquid 侧同一口径） */
  function numberTokens(text) {
    const raw = String(text || '').match(/\d[\d,]*(?:\.\d+)?/g);
    const tokens = new Set();
    if (!raw) return tokens;
    raw.forEach((token) => {
      const value = token.replace(/,/g, '').replace(/\.0+$/, '');
      if (value) tokens.add(value);
    });
    return tokens;
  }

  /** 该说明挂在哪一行：行下标；-1 = 说不清（调用方退回列头） */
  function resolveNoteRow(note, values) {
    const noteNumbers = numberTokens(note);
    if (!noteNumbers.size || !Array.isArray(values)) return -1;
    const hits = [];
    values.forEach((value, index) => {
      const numbers = numberTokens(value);
      if ([...numbers].some((number) => noteNumbers.has(number))) hits.push(index);
    });
    return hits.length === 1 ? hits[0] : -1;
  }

  /** 差异说明本体（原生 details：自带展开态、键盘操作与 aria-expanded） */
  function buildNote(text, label) {
    const details = document.createElement('details');
    details.className = 'compare-table__note';
    const summary = document.createElement('summary');
    if (label) summary.setAttribute('aria-label', label);
    const mark = document.createElement('span');
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = 'i';
    summary.appendChild(mark);
    details.appendChild(summary);
    const body = document.createElement('p');
    body.textContent = text;
    details.appendChild(body);
    return details;
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

    /* 每列的差异说明该落在哪一行（-1 = 说不清，退回列头） */
    const noteRows = columns.map((col) => (col.n ? resolveNoteRow(col.n, col.v) : -1));

    columns.forEach((col, columnIndex) => {
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

      /* 定位不到行时才挂在列头（含糊，但不丢信息） */
      if (col.n && noteRows[columnIndex] < 0) {
        th.appendChild(buildNote(col.n, dataEl.dataset.labelVariantNote || ''));
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
        /* 差异说明跟着「该商品 × 该参数」这一格走，不是挂在产品标题下 */
        if (columns[index] && noteRows[index] === rowIndex) {
          td.appendChild(buildNote(columns[index].n, dataEl.dataset.labelVariantNote || ''));
        }
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
  customElements.define('compare-toast', CompareToast);

  // ------------------------------------------------------- 加入成功的播报

  /**
   * 加入对比成功后念一句（SDD §6.2.8，2026-11-16 补）。
   *
   * 底部对比条删除后，原本由它承担的这句播报没了：视觉上有飞入动画与角标数字变化，
   * 屏读用户却什么都听不到。挂在这里而不是组件内部，是因为两个候选位置都不成立：
   *   · `<compare-entry>` 未配置对比页时整块不渲染、移动端还要等角标 > 0，
   *     第一次加入时正好不在；
   *   · `<compare-toast>` 默认 `display: none`，live region 藏在里面不会被播报。
   * 所以目标是一个 layout 级常驻的 `visually-hidden` 空节点（compare-announcer）。
   *
   * 只播报「加入」；跨组 / 已满由 toast 自己的 `role="status"` 承担，避免念两句。
   */
  function announceAdded(event) {
    const node = document.querySelector('[data-compare-announcer]');
    if (!node) return;
    const tpl = node.dataset.labelAdded || '';
    if (!tpl) return;
    const count = (event.detail && event.detail.count) || readList().length;
    node.textContent = tpl.replace('[count]', String(count));
  }

  document.addEventListener('compare:added', announceAdded);

  /**
   * 浏览器「回退」命中 bfcache 时不会重新执行脚本，DOM 停在旧快照上 ——
   * 表现为：对比页删了商品，退回去页头角标还在、商品卡的勾选态还是旧的。
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
