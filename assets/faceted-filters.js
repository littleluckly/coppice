/**
 * collection-facets — 集合页/搜索页筛选控制器（task-collection T-2.2/T-2.3）。
 *
 * 职责（红线对齐 SDD §6.1：前端零筛选逻辑，数据一律服务端重算）：
 * 1. 拦截 GET 表单提交/值变更/链接点击 → 组原生筛选 URL + `?section_id=`（Section
 *    Rendering API）→ fetch → 仅替换本元素内容 → history.replaceState。
 * 2. 移动端：<dialog>（原生焦点锁定/Esc/scroll-lock）承载与桌面同一份筛选 DOM
 *    （**筛选 form 整体**物理移入——dialog 在本元素之外，裸移 aside 会让控件
 *    脱离 form 归属，抽屉内提交/Apply/关闭按钮全部失效，BUG-041；无副本，
 *    输入状态不分裂）。2026-10-16：抓手横线 + 按住下拉收回（_onDragStart）。
 * 3. 无 JS 退化：单列布局 + 应用按钮整页 GET 提交，全功能可用。
 * 4. 加载反馈：fetch 期间在结果区叠骨架层（_showSkeleton，复用 aria-busy 时段），
 *    完成/失败/中止一律在 finally 摘除；prefers-reduced-motion 时静止灰块。
 * 5. 已选标签消散：点击胶囊移除时，从其矩形区域爆发粒子（ChipDissolveFX
 *    单例画布，参考 dev-docs/deepseek_html_20261017_cf4434.html）；颜色取
 *    胶囊文字色 → 品牌强调色的渐变采样，跟随主题令牌；reduced-motion 跳过。
 * 5. 排序卡落点随断点切换（_placeSort）：移动端移进工具条——pages-ui §4 的
 *    [筛选☰] [排序▾]，同一 DOM 节点不做副本；桌面回归左列第一张卡。
 *    select 恒带 form 属性，离开 form 子树后仍是表单成员，FormData 照常含
 *    sort_by（无 JS 时原生 GET 提交也带上）。无筛选集合没有 form，卡片本就在
 *    工具条，_placeSort 自然空操作。
 *
 * 实现纪律（AGENTS §6）：
 * - 监听全部委托到本元素（submit/change/click 冒泡），内部 form/网格被局部替换后无需重绑；
 * - 类字段箭头函数 + AbortController（BUG-030/033 预防：杜绝 this 漂移与重复绑定）；
 * - 隐藏组件惰性：dialog 常驻但空壳，panel 按需移入/移出。
 */
/* =====================================================================
 *  ChipDissolveFX — 已选筛选胶囊的粒子消散引擎（单例画布，按需创建）。
 *  移植自 dev-docs/deepseek_html_20261017_cf4434.html 的 ParticleFX：
 *  一张 fixed 定位画布（pointer-events:none，不拦截任何交互）挂 body，
 *  所有爆发共用；粒子物理（阻尼/重力/旋转/缩衰）与原实现一致，仅按
 *  胶囊的小尺寸收窄数量与粒径上限。颜色不硬编码：调用方从设计令牌
 *  采样后传入（见 CollectionFacets#_dissolveChip）。
 * ===================================================================== */
const ChipDissolveFX = (() => {
  let canvas = null;
  let ctx = null;
  let dpr = 1;
  let rafId = null;
  const particles = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '9999',
    });
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize, { passive: true });
  }

  function tick(now) {
    const dt = Math.min((now - (tick.last || now)) / 16.67, 3);
    tick.last = now;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 0.06 * dt;
      p.rot += p.vr * dt;
      p.life -= p.decay * dt;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      const a = p.life;
      const s = p.size * (0.4 + p.life * 0.6);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;

      if (p.square) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-s, -s, s * 2, s * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    if (particles.length) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
      tick.last = 0;
    }
  }

  /** 在矩形区域内爆发粒子 */
  function burstFromRect(rect, colors) {
    ensureCanvas();
    const area = rect.width * rect.height;
    /* 胶囊远小于原参考的按钮：数量夹在 70–220，粒径上限 2.9px */
    const count = Math.min(220, Math.max(70, Math.floor(area / 22)));

    for (let i = 0; i < count; i++) {
      const px = rect.left + Math.random() * rect.width;
      const py = rect.top + Math.random() * rect.height;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const ang = Math.atan2(py - cy, px - cx) + (Math.random() - 0.5) * 0.9;
      const speed = Math.random() * 3.2 + 0.6;

      particles.push({
        x: px,
        y: py,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - Math.random() * 1.2,
        size: Math.random() * 2.2 + 0.7,
        life: 1,
        decay: Math.random() * 0.012 + 0.01,
        color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
        square: Math.random() < 0.35,
      });
    }

    if (!rafId) {
      tick.last = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  /** 从两色线性渐变采样色板（离屏 canvas，约 60 色） */
  function sampleGradient(c1, c2, w = 80, h = 32) {
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    const grad = tctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    tctx.fillStyle = grad;
    tctx.fillRect(0, 0, w, h);

    const data = tctx.getImageData(0, 0, w, h).data;
    const colors = [];
    const step = Math.max(1, Math.floor((w * h) / 60));
    for (let i = 0; i < data.length; i += step * 4) {
      if (data[i + 3] > 0) {
        colors.push(`rgba(${data[i]},${data[i + 1]},${data[i + 2]},1)`);
      }
    }
    return colors.length ? colors : [c1, c2];
  }

  return { burstFromRect, sampleGradient };
})();

class CollectionFacets extends HTMLElement {
  _abort = new AbortController();
  _fetchAbort = null;
  /* 拖拽收起弹窗后短暂屏蔽 click：松手位置可能落在勾选框/遮罩上，
     一次误触 click 会勾选筛选或触发"点遮罩关闭"分支 */
  _dragClickGuard = 0;

  connectedCallback() {
    this._sectionId = this.dataset.sectionId;
    this._dialog = document.getElementById(`FacetsDialog-${this._sectionId}`);
    /* 无筛选集合没有筛选表单，但排序 select 仍在工具条——控制器照常激活 */
    if (
      !this.querySelector('[data-facets-form]') &&
      !this.querySelector('[data-facets-sort]')
    ) {
      return;
    }

    /* JS 就绪标记：CSS 由此启用桌面两栏 / 移动抽屉（无 JS 时保持单列降级） */
    this.setAttribute('data-facets-ready', '');

    const { signal } = this._abort;
    this.addEventListener('submit', this._onSubmit, { signal });
    this.addEventListener('change', this._onChange, { signal });
    this.addEventListener('click', this._onClick, { signal });
    if (this._dialog) {
      /* 抽屉开着时筛选 form 整体在 dialog 里（dialog 是本元素的兄弟），事件
         不会再冒泡到本元素——同一组委托监听必须同时挂在 dialog 上 */
      this._dialog.addEventListener('submit', this._onSubmit, { signal });
      this._dialog.addEventListener('change', this._onChange, { signal });
      this._dialog.addEventListener('click', this._onClick, { signal });
      this._dialog.addEventListener('close', this._onDialogClose, { signal });
      this._dialog.addEventListener('pointerdown', this._onDragStart, { signal });
    }

    /* 排序卡落点：移动端工具条（pages-ui §4），桌面左列第一张卡 */
    this._mobileQuery = window.matchMedia('(max-width: 989.98px)');
    this._mobileQuery.addEventListener('change', this._onMediaChange, { signal });
    this._placeSort();
  }

  disconnectedCallback() {
    this._abort.abort();
    if (this._fetchAbort) this._fetchAbort.abort();
  }

  _onChange = (event) => {
    const inForm = event.target.closest('[data-facets-form]');
    const isSort = event.target.matches('[data-facets-sort]');
    /* 排序 select 在右列工具条，靠 form 属性关联表单（不在表单的 DOM 子树内） */
    if (!inForm && !isSort) return;
    /* 移动抽屉内（2026-10-16 刘工）：勾选只记录不提交，Apply 才提交并收起——
       逐项自动提交会每勾一项刷一次接口，且换入的新 DOM 把滚动位置顶回顶部 */
    if (inForm && this._dialog?.open && this._dialog.contains(event.target)) return;
    /* 现场重查表单：_load 的 replaceChildren 会替换整个容器，缓存的 form
       引用随即脱离 DOM，requestSubmit 不再生效——不能依赖 connectedCallback 缓存 */
    const form = inForm || this._findForm();
    if (form) {
      /* 筛选勾选 / 价格输入 / 排序——任何变更即按原生 URL 重算 */
      form.requestSubmit();
      return;
    }
    /* 无筛选集合没有表单可提交：排序单独局部更新（并回到第一页） */
    if (isSort) {
      const url = new URL(window.location.href);
      if (event.target.value) url.searchParams.set('sort_by', event.target.value);
      else url.searchParams.delete('sort_by');
      url.searchParams.delete('page');
      url.searchParams.set('section_id', this._sectionId);
      this._load(url);
    }
  };

  _onSubmit = (event) => {
    const form = event.target.closest('[data-facets-form]');
    if (!form) return;
    event.preventDefault();
    this._load(this._buildUrl(form.action, new FormData(form)));
  };

  _onClick = (event) => {
    /* 拖拽收起手势刚结束：屏蔽松手落点产生的 click（见 _dragClickGuard 注释） */
    if (this._dragClickGuard && performance.now() < this._dragClickGuard) return;
    const opener = event.target.closest('[data-facets-open]');
    if (opener) {
      this._openDialog();
      return;
    }
    if (event.target.closest('[data-facets-close]')) {
      if (this._dialog) this._dialog.close();
      return;
    }
    /* 点遮罩关闭：target 是 dialog 本体即背景点击（对齐 nav-drawer 行为） */
    if (event.target === this._dialog) {
      this._dialog.close();
      return;
    }
    /* 已选标签 / 清除全部：拦截站内跳转改走局部更新。
       标签在工具条（data-facets-active），不在 form 子树内——旧条件
       closest('[data-facets-form]') 永远不命中，点击实际走的是整页跳转、
       没有骨架（2026-10-16 刘工 BUG）。分页链接故意不拦：replaceState
       不留历史，分页的前进后退语义要整页导航。 */
    const link = event.target.closest('a[href]');
    if (
      link &&
      (link.closest('[data-facets-active]') || link.closest('[data-facets-form]'))
    ) {
      event.preventDefault();
      /* 胶囊消散要在 _load 之前：getBoundingClientRect 必须赶在 DOM
         被局部替换前取证，粒子画布独立于替换过程存活 */
      if (link.classList.contains('facets__chip')) this._dissolveChip(link);
      this._load(link.href);
      return;
    }
    /* Apply（2026-10-16 刘工）：抽屉内的唯一提交入口——先取 URL，再关抽屉，
       最后请求。关抽屉会触发 _onDialogClose 的 form 归位与 reset（FormData
       必须在 reset 前取证）；骨架层落在抽屉后面的结果区，反馈不中断。 */
    if (event.target.closest('[data-facets-apply]')) {
      event.preventDefault(); /* 阻断原生表单提交，否则 _onSubmit 与这里双请求 */
      const form = this._findForm();
      if (form) {
        const requestUrl = this._buildUrl(form.action, new FormData(form));
        if (this._dialog?.open) this._dialog.close();
        this._load(requestUrl);
      }
    }
  };

  _findForm() {
    /* form 可能在本元素内（抽屉关闭/桌面），也可能整体在 dialog 里（抽屉开着） */
    return (
      this.querySelector('[data-facets-form]') ||
      this._dialog?.querySelector('[data-facets-form]') ||
      null
    );
  }

  /**
   * 已选胶囊的粒子消散（参考 dev-docs/deepseek_html_20261017_cf4434.html）。
   * 颜色全部来自设计令牌的运行时取值，不硬编码：主色板 = 胶囊文字色
   * （getComputedStyle，preset 换色自动跟随）→ 品牌强调色（--color-brand-accent）
   * 的渐变采样，另掺两份主品牌色（--color-brand）加层次。令牌缺失或值非法时
   * 回落文字色，粒子永远不会用错色。胶囊本体立即隐藏（粒子顶替其视觉，
   * 工具条不跳动），随后 _load 换入的新 DOM 自然移除它。reduced-motion 直接
   * 跳过——消散是纯装饰，动画降级不挡功能（与骨架层同一纪律）。
   */
  _dissolveChip(chip) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const style = getComputedStyle(chip);
    const textColor = style.color;
    const accent = style.getPropertyValue('--color-brand-accent').trim();
    const brand = style.getPropertyValue('--color-brand').trim();
    const accentColor = CSS.supports('color', accent) ? accent : textColor;
    const colors = ChipDissolveFX.sampleGradient(textColor, accentColor);
    if (CSS.supports('color', brand)) colors.push(brand, brand);

    const rect = chip.getBoundingClientRect();
    chip.style.transition = 'none';
    chip.style.opacity = '0';
    chip.style.transform = 'scale(.92)';
    chip.style.pointerEvents = 'none';
    ChipDissolveFX.burstFromRect(rect, colors);
  }

  _buildUrl(base, formData) {
    const url = new URL(base, window.location.origin);
    for (const [key, value] of formData.entries()) {
      /* URL 对象没有 .append()，参数必须挂 searchParams——此行写错时筛选
         从未提交成功过（BUG-040，自文件创建起） */
      if (value !== '') url.searchParams.append(key, value);
    }
    url.searchParams.set('section_id', this._sectionId);
    return url;
  }

  /**
   * 排序卡落点：同一 DOM 节点在两个容器间搬移，不做副本（状态不分裂）。
   * 移动端 → 工具条计数之前；桌面 → form 内首位（左列第一张卡）。
   * 卡片靠 form 属性与表单关联，所以脱离 form 子树后提交照常。
   */
  _placeSort() {
    if (!this._mobileQuery) return;
    const toolbar = this.querySelector('.collection__toolbar');
    const card = this.querySelector('.facets__sort-card');
    if (!toolbar || !card) return;

    if (this._mobileQuery.matches) {
      if (card.parentElement !== toolbar) {
        toolbar.insertBefore(card, toolbar.querySelector('.collection__count'));
      }
      return;
    }
    const form = this.querySelector('[data-facets-form]');
    if (form && card.parentElement !== form) form.prepend(card);
  }

  /**
   * 跨断点：抽屉开着先关闭。否则 form 会留在 dialog 里，桌面左列空掉
   * （dialog 在本元素之外，桌面两栏 CSS 找不到它）。dialog.close() 的 close
   * 事件是异步任务，form 归位与随后的排序卡重排由 _onDialogClose 收尾。
   */
  _onMediaChange = () => {
    if (this._dialog?.open) this._dialog.close();
    this._placeSort();
  };

  async _load(requestUrl) {
    if (this._fetchAbort) this._fetchAbort.abort();
    this._fetchAbort = new AbortController();
    this.setAttribute('aria-busy', 'true');
    /* 骨架层：fetch 期间盖住结果区，完成/失败/中止都在 finally 摘除 */
    const skeleton = this._showSkeleton();

    try {
      const response = await fetch(requestUrl, {
        headers: { Accept: 'text/html' },
        signal: this._fetchAbort.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const next = doc.querySelector('collection-facets');
      if (!next) throw new Error('Section payload missing');

      this.replaceChildren(...next.childNodes);

      /* 地址栏同步（去掉 section_id）——URL 可分享、刷新保留（SDD §6.1） */
      const historyUrl = new URL(requestUrl, window.location.origin);
      historyUrl.searchParams.delete('section_id');
      history.replaceState({}, '', historyUrl);

      /* 换入的是新 DOM：排序卡在新 form 里，先按断点归位——顺序不能反，
         卡片一旦随 form 进了 dialog（本元素之外）就查不到了 */
      this._placeSort();

      /* 抽屉若开着，把新 form 重新移入（顺带清掉 dialog 里被换下的旧 form） */
      if (this._dialog && this._dialog.open) this._moveFormIntoDialog();

      /* 焦点不丢：网格区接管（aria-live 计数随新 DOM 播报） */
      const results = this.querySelector('[data-facets-results]');
      if (results && !this._dialog?.open) results.focus({ preventScroll: true });
      if (this._dialog?.open) {
        this._dialog.querySelector('.facets__panel')?.focus?.();
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      /* 局部更新失败 → 整页导航兜底（同样的 URL，服务端照常重算） */
      const fallbackUrl = new URL(requestUrl, window.location.origin);
      fallbackUrl.searchParams.delete('section_id');
      window.location.href = fallbackUrl.toString();
    } finally {
      this.removeAttribute('aria-busy');
      skeleton?.remove();
    }
  }

  _showSkeleton() {
    const results = this.querySelector('[data-facets-results]');
    if (!results) return null;
    /* 骨架卡数对齐当前页（夹在 4–12），高度不与完成后差太多 */
    const count = Math.min(
      Math.max(results.querySelectorAll('.collection__item').length, 4),
      12
    );
    const layer = document.createElement('div');
    layer.className = 'collection__skeleton';
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'collection__skeleton-card';
      card.innerHTML =
        '<div class="sk-img"></div><div class="sk-line"></div>' +
        '<div class="sk-line sk-line--short"></div>' +
        '<div class="sk-line sk-line--price"></div>';
      layer.appendChild(card);
    }
    results.appendChild(layer);
    return layer;
  }

  _openDialog() {
    if (!this._dialog) return;
    this._moveFormIntoDialog();
    this._dialog.showModal();
    this._dialog.querySelector('.facets__panel')?.setAttribute('tabindex', '-1');
    this._dialog.querySelector('.facets__panel')?.focus();
  }

  _moveFormIntoDialog() {
    if (!this._dialog) return;
    /* 整体移动 form（而非裸 aside）：控件随 DOM 子树保留 form 归属，
       FormData / requestSubmit / 原生提交在抽屉内继续成立——裸 aside 移入
       dialog 后控件脱离 form，抽屉筛选与 Apply 全部失效（BUG-041） */
    const form = this._findForm();
    if (!form) return;
    /* 局部更新可能在抽屉开着时换入新 form：先清掉 dialog 里残留的旧 form */
    for (const stale of this._dialog.querySelectorAll('[data-facets-form]')) {
      if (stale !== form) stale.remove();
    }
    if (form.parentElement !== this._dialog) this._dialog.append(form);
  }

  /**
   * 下拉收回弹窗（2026-10-16 刘工，iPhone 底部抽屉同款）。
   * 热区 = 抓手横线 + 头部行（含 touch-action:none）；滚动区不参与——
   * 筛选列表自身的滚动不被抢（手势归属由初始触点元素的 touch-action 决定）。
   * 越过阈值（弹窗高 30%，至少 120px）→ close()，transform 清理由
   * _onDialogClose 统一收口；未过阈值 → 弹回（reduced-motion 直接归位）。
   */
  _onDragStart = (event) => {
    if (event.button > 0) return;
    const handle = event.target.closest('.facets__grabber, .facets__mobile-head');
    if (!handle || event.target.closest('[data-facets-close]')) return;

    const dialog = this._dialog;
    const startY = event.clientY;
    let moved = false;

    const onMove = (moveEvent) => {
      const dy = moveEvent.clientY - startY;
      if (dy <= 0) return; /* 只响应下拉 */
      moved = moved || dy > 8;
      dialog.style.transition = 'none';
      dialog.style.transform = `translateY(${dy}px)`;
    };

    const onEnd = (endEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      const dy = endEvent.clientY - startY;
      const dismissAt = Math.max(120, dialog.offsetHeight * 0.3);
      if (moved && dy > dismissAt) {
        dialog.close();
        return;
      }
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) dialog.style.transition = 'transform 0.22s ease-out';
      dialog.style.transform = '';
      setTimeout(() => {
        dialog.style.transition = '';
      }, reduce ? 0 : 240);
      if (moved) this._dragClickGuard = performance.now() + 350;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  };

  _onDialogClose = () => {
    /* form 归位为布局的第一个 grid item（桌面侧栏原位；单一 DOM 副本不变） */
    if (!this._dialog) return;
    /* 拖拽残留的内联位移清零（弹回/收起两条路径的公共收口） */
    this._dialog.style.transform = '';
    this._dialog.style.transition = '';
    /* 没点 Apply 就收起（下拉/Esc/遮罩）：表单回滚到最近一次生效的筛选
       （checked/value 属性来自上次 section payload，reset 即回到该状态），
       避免"勾选状态与结果不一致"；Apply 路径的 FormData 已在关窗前取证 */
    const form = this._dialog.querySelector('[data-facets-form]');
    form?.reset();
    const layout = this.querySelector('[data-facets-layout]');
    if (form && layout) layout.prepend(form);
    /* 归位后按当前断点重排排序卡：跨越断点时（resize / 旋转）form 刚回到布局，
       _onMediaChange 那次 _placeSort 还查不到 form，由这里补上 */
    this._placeSort();
  };
}

if (!customElements.get('collection-facets')) {
  customElements.define('collection-facets', CollectionFacets);
}
