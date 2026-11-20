

const ChipDissolveFX = (() => {
  let canvas = null;
  let ctx = null;
  let dpr = 1;
  let rafId = null;
  const particles = [];

  const BASE_WIND = {
    ax: 0.11,
    ay: -0.075,
    drag: 0.99,
    maxSpeed: 11,
  };

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

      p.vx += p.wind.ax * dt;
      p.vy += p.wind.ay * dt;
      p.vx *= p.wind.drag;
      p.vy *= p.wind.drag;

      const sp = Math.hypot(p.vx, p.vy);
      if (sp > p.wind.maxSpeed) {
        p.vx = (p.vx / sp) * p.wind.maxSpeed;
        p.vy = (p.vy / sp) * p.wind.maxSpeed;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= p.decay * dt;

      if (p.life <= 0 || p.x > window.innerWidth + 40 || p.y < -40) {
        particles.splice(i, 1);
        continue;
      }

      const a = p.life;
      const s = p.size * (0.35 + p.life * 0.65);
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

  function burstFromRect(rect, colors, distance = 1, lifetimeMs = 450) {
    ensureCanvas();
    const area = rect.width * rect.height;

    const count = Math.min(220, Math.max(70, Math.floor(area / 22)));

    const wind = {
      ax: BASE_WIND.ax * distance,
      ay: BASE_WIND.ay * distance,
      drag: BASE_WIND.drag,
      maxSpeed: BASE_WIND.maxSpeed * distance,
    };

    const decayScale = 1 / Math.max(0.35, distance);

    const baseDecay = 1 / ((lifetimeMs / 1000) * 60);

    for (let i = 0; i < count; i++) {
      const px = rect.left + Math.random() * rect.width;
      const py = rect.top + Math.random() * rect.height;

      const baseAngle = -Math.PI * 0.3;
      const ang = baseAngle + (Math.random() - 0.5) * 0.9;
      const speed = (Math.random() * 2.2 + 0.8) * distance;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const ox = px - cx;
      const oy = py - cy;

      particles.push({
        x: px,
        y: py,
        vx: Math.cos(ang) * speed + ox * 0.012,
        vy: Math.sin(ang) * speed + oy * 0.012,
        size: Math.random() * 2.2 + 0.7,
        life: 1,

        decay: baseDecay * (0.9 + Math.random() * 0.2) * decayScale,
        color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        square: Math.random() < 0.35,
        wind,
      });
    }

    if (!rafId) {
      tick.last = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

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

  _dragClickGuard = 0;

  connectedCallback() {
    this._sectionId = this.dataset.sectionId;
    this._dialog = document.getElementById(`FacetsDialog-${this._sectionId}`);

    this._sheetEl = this._dialog?.closest('bottom-sheet') || null;

    if (
      !this.querySelector('[data-facets-form]') &&
      !this.querySelector('[data-facets-sort]')
    ) {
      return;
    }

    this.setAttribute('data-facets-ready', '');

    const { signal } = this._abort;
    this.addEventListener('submit', this._onSubmit, { signal });
    this.addEventListener('change', this._onChange, { signal });
    this.addEventListener('click', this._onClick, { signal });
    if (this._dialog) {

      this._dialog.addEventListener('submit', this._onSubmit, { signal });
      this._dialog.addEventListener('change', this._onChange, { signal });
      this._dialog.addEventListener('click', this._onClick, { signal });
      this._dialog.addEventListener('close', this._onDialogClose, { signal });
      this._dialog.addEventListener('pointerdown', this._onDragStart, { signal });
    }

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

    if (!inForm && !isSort) return;

    if (inForm && this._dialog?.open && this._dialog.contains(event.target)) return;

    const form = inForm || this._findForm();
    if (form) {

      form.requestSubmit();
      return;
    }

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

    if (this._dragClickGuard && performance.now() < this._dragClickGuard) return;
    const opener = event.target.closest('[data-facets-open]');
    if (opener) {
      this._openDialog();
      return;
    }
    if (event.target.closest('[data-facets-close]')) {
      this._closeSheet();
      return;
    }

    if (event.target === this._dialog) {
      this._closeSheet();
      return;
    }

    const link = event.target.closest('a[href]');
    if (
      link &&
      (link.closest('[data-facets-active]') || link.closest('[data-facets-form]'))
    ) {
      event.preventDefault();

      if (link.closest('[data-facets-active]')) {
        if (link.classList.contains('facets__chip')) this._dissolveChip(link);
        else if (link.classList.contains('facets__clear')) {
          this._dissolveAllChips();
        }
      }
      this._load(link.href);
      return;
    }

    if (event.target.closest('[data-facets-apply]')) {
      event.preventDefault();
      const form = this._findForm();
      if (form) {
        const requestUrl = this._buildUrl(form.action, new FormData(form));
        if (this._dialog?.open) this._closeSheet();
        this._load(requestUrl);
      }
    }
  };

  _findForm() {

    return (
      this.querySelector('[data-facets-form]') ||
      this._dialog?.querySelector('[data-facets-form]') ||
      null
    );
  }

  get _chipDistance() {
    const v = parseFloat(this.dataset.chipDistance);
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  get _chipLifetime() {
    const v = parseFloat(this.dataset.chipLifetime);
    return Number.isFinite(v) && v > 0 ? v : 450;
  }

  _chipColors(chip) {
    const style = getComputedStyle(chip);
    const textColor = style.color;
    const brand = style.getPropertyValue('--color-brand').trim();
    const accent = style.getPropertyValue('--color-brand-accent').trim();
    const c1 = CSS.supports('color', brand) ? brand : textColor;
    const c2 = CSS.supports('color', accent) ? accent : c1;
    const colors = ChipDissolveFX.sampleGradient(c1, c2);
    if (c2 !== c1) colors.push(c2, c2);
    return colors.length ? colors : [textColor];
  }

  _hideChip(chip) {
    chip.style.transition = 'none';
    chip.style.opacity = '0';
    chip.style.transform = 'scale(.92)';
    chip.style.pointerEvents = 'none';
  }

  _dissolveChip(chip) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = this._chipColors(chip);
    const rect = chip.getBoundingClientRect();
    this._hideChip(chip);
    ChipDissolveFX.burstFromRect(rect, colors, this._chipDistance, this._chipLifetime);
  }

  _dissolveAllChips() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const chips = this.querySelectorAll('[data-facets-active] .facets__chip');
    if (!chips.length) return;
    const colors = this._chipColors(chips[0]);
    const distance = this._chipDistance;
    const lifetime = this._chipLifetime;
    for (const chip of chips) {
      const rect = chip.getBoundingClientRect();
      this._hideChip(chip);
      ChipDissolveFX.burstFromRect(rect, colors, distance, lifetime);
    }
  }

  _buildUrl(base, formData) {
    const url = new URL(base, window.location.origin);
    for (const [key, value] of formData.entries()) {

      if (value !== '') url.searchParams.append(key, value);
    }
    url.searchParams.set('section_id', this._sectionId);
    return url;
  }

  _placeSort() {
    if (!this._mobileQuery) return;

    const toolbar = this.querySelector('[data-facets-toolbar]');
    const card = this.querySelector('.facets__sort-card');
    if (!toolbar || !card) return;

    if (this._mobileQuery.matches) {
      if (card.parentElement !== toolbar) {

        toolbar.insertBefore(card, toolbar.querySelector('[data-facets-count]'));
      }
      return;
    }
    const slot = this.querySelector('[data-facets-sort-slot]');
    if (slot && card.parentElement !== slot) slot.appendChild(card);
  }

  _onMediaChange = () => {
    if (this._dialog?.open) this._dialog.close();
    this._placeSort();
  };

  async _load(requestUrl) {
    if (this._fetchAbort) this._fetchAbort.abort();
    this._fetchAbort = new AbortController();
    this.setAttribute('aria-busy', 'true');

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

      const historyUrl = new URL(requestUrl, window.location.origin);
      historyUrl.searchParams.delete('section_id');
      history.replaceState({}, '', historyUrl);

      this._placeSort();

      if (this._dialog && this._dialog.open) this._moveFormIntoDialog();

      const results = this.querySelector('[data-facets-results]');
      if (results && !this._dialog?.open) results.focus({ preventScroll: true });
      if (this._dialog?.open) {
        this._dialog.querySelector('.facets__panel')?.focus?.();
      }
    } catch (error) {
      if (error.name === 'AbortError') return;

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

    const count = Math.min(
      Math.max(results.querySelectorAll('.product-card').length, 4),
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
    this._openSheet();
    this._dialog.querySelector('.facets__panel')?.setAttribute('tabindex', '-1');
    this._dialog.querySelector('.facets__panel')?.focus();
  }

  get _sheet() {
    const el = this._sheetEl;
    return el && typeof el.open === 'function' ? el : null;
  }

  _openSheet() {
    if (this._sheet) this._sheet.open();
    else if (this._dialog && !this._dialog.open) this._dialog.showModal();
  }

  _closeSheet(options) {
    if (this._sheet) this._sheet.close(options);
    else if (this._dialog?.open) this._dialog.close();
  }

  _moveFormIntoDialog() {
    if (!this._dialog) return;

    const form = this._findForm();
    if (!form) return;

    for (const stale of this._dialog.querySelectorAll('[data-facets-form]')) {
      if (stale !== form) stale.remove();
    }
    if (form.parentElement !== this._dialog) this._dialog.append(form);
  }

  _onDragStart = (event) => {
    if (event.button > 0) return;

    if (this._sheet?.isClosing) return;
    const handle = event.target.closest('.facets__grabber, .facets__mobile-head');
    if (!handle || event.target.closest('[data-facets-close]')) return;

    const dialog = this._dialog;
    const startY = event.clientY;
    let moved = false;

    const onMove = (moveEvent) => {
      const dy = moveEvent.clientY - startY;
      if (dy <= 0) return;
      moved = moved || dy > 8;

      dialog.style.animation = 'none';
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
        this._dragClickGuard = performance.now() + 350;

        this._closeSheet({ fromDrag: true });
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

    if (!this._dialog) return;

    const form = this._dialog.querySelector('[data-facets-form]');
    form?.reset();

    const slot = this.querySelector('[data-facets-form-slot]');
    if (form && slot) slot.append(form);

    this._placeSort();
  };
}

if (!customElements.get('collection-facets')) {
  customElements.define('collection-facets', CollectionFacets);
}
