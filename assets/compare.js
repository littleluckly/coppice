
(() => {
  'use strict';

  const STORAGE_KEY = 'ib:compare:v1';
  const DEFAULT_MAX = 4;
  const TOAST_AUTO_HIDE_MS = 3000;

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

        u: typeof item.u === 'string' ? item.u : '',
      });
    });
    return out;
  }

  function writeList(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {

    }
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

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

  function comparePageUrl(group) {
    if (!group) return '';
    const entry = document.querySelector('compare-entry');
    if (!entry) return '';
    return entry.getAttribute(`data-url-${group}`) || '';
  }

  function showToast(options) {
    const toast = document.querySelector('compare-toast');
    if (!toast || typeof toast.show !== 'function') return;
    toast.show(options);
  }

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

      if (this.actions) this.actions.hidden = !hasAction;

      this.onPrimary = onPrimary || null;
      this.returnFocus = returnFocus || null;
      this.hidden = false;

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

  class CompareToggle extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.button = this.querySelector('button');
      if (!this.button) return;

      this.max = clampMax(this);
      this.controller = new AbortController();
      const { signal } = this.controller;

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

    sync() {
      if (!this.button) return;
      const inList = readList().some((item) => item.h === this.handle);
      this.button.setAttribute('aria-pressed', inList ? 'true' : 'false');
      this.toggleAttribute('data-in-list', inList);

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

    t(key) {
      const attr = `label${key.replace(/(^|_)(\w)/g, (_, __, c) => c.toUpperCase())}`;
      return this.dataset[attr] || '';
    }
  }

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

      const tip = this.closest('ui-tooltip');
      const tipTpl = count > 0 ? this.dataset.tipCount : this.dataset.tipEmpty;
      if (tip && tipTpl) {
        tip.setAttribute('label', tipTpl.replace('[count]', String(count)));
      }
    }
  }

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

    requestAnimationFrame(() => {
      const target = findTarget();
      if (!target) return;

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

  function upgradeImageWidth(url, width) {
    if (!url) return '';
    const target = String(width || 480);
    if (/[?&]width=\d+/.test(url)) return url.replace(/([?&])width=\d+/, `$1width=${target}`);
    return url + (url.includes('?') ? '&' : '?') + `width=${target}`;
  }

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

  function clearOutOfScopeHeader(headRow, index) {
    const th = headRow.children[index + 1];
    if (!th) return;
    th.classList.remove('compare-table__col--out-of-scope');
    const note = th.querySelector('.compare-table__out-of-scope');
    if (note) note.remove();
  }

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

  function backfillOutOfScope({ dataEl, rows, columns, tbody, headRow }) {
    const base = dataEl.dataset.productBase || '/products/';
    const pending = columns
      .map((col, index) => ({ col, index }))
      .filter((entry) => entry.col.outOfScope && entry.col.h);
    if (pending.length === 0) return;

    pending.forEach(({ col, index }) => {
      const url = `${base}${encodeURIComponent(col.h)}?sections=compare-lookup`;

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
      return;
    }
    if (!data || !Array.isArray(data.rows) || !Array.isArray(data.items)) return;

    const group = root.dataset.compareGroup || data.group;
    const empty = root.querySelector('[data-compare-empty]');
    const list = readList().filter((item) => item.g === group);

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

    wrap.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-compare-remove-col]');
      if (!btn) return;
      removeColumn(wrap, btn.dataset.compareRemoveCol);
    });

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

    const status = document.createElement('p');
    status.className = 'visually-hidden';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const loadedTpl = dataEl.dataset.labelLoaded || '';
    status.textContent = loadedTpl.replace('[count]', String(columns.length));
    root.appendChild(status);

    backfillOutOfScope({ dataEl, rows, columns, tbody, headRow });
  }

  customElements.define('compare-toggle', CompareToggle);
  customElements.define('compare-entry', CompareEntry);
  customElements.define('compare-toast', CompareToast);

  function announceAdded(event) {
    const node = document.querySelector('[data-compare-announcer]');
    if (!node) return;
    const tpl = node.dataset.labelAdded || '';
    if (!tpl) return;
    const count = (event.detail && event.detail.count) || readList().length;
    node.textContent = tpl.replace('[count]', String(count));
  }

  document.addEventListener('compare:added', announceAdded);

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
