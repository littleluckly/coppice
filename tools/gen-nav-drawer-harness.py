#!/usr/bin/env python3
"""功能核对稿：加载真实的 bottom-sheet.js + nav-drawer.js，跑一遍开合 / 手风琴 / 拖拽收起。

只用于本地核对，不参与主题打包。
"""
import re
from pathlib import Path

root = Path('/Users/mac/workspaces/coppice')
section = (root / 'sections/main-nav.liquid').read_text()
css = re.search(r'{% stylesheet %}(.*?){% endstylesheet %}', section, re.S).group(1)
critical = (root / 'assets/critical.css').read_text()
sheet_css = re.search(r'/\* =+\n\s*bottom-sheet.*?(?=\n/\*|\Z)', critical, re.S).group(0)

tokens = """
:root {
  --color-background: #ffffff; --color-foreground: #333333;
  --color-brand: #1E4B3C; --color-brand-accent: #2E6B4E;
  --color-foreground-muted: #666666; --color-header-surface: #ffffff;
  --header-shadow: none; --card-hover-lift: -2px; --card-hover-shadow: none;
  --card-glow-1: transparent; --card-glow-2: transparent; --card-glow-3: transparent;
  --style-border-radius-inputs: 4px; --content-width: 1200px; --page-margin: 16px;
  --font-primary--family: -apple-system, sans-serif;
}
html, body { margin: 0; height: 100%; }
body { font-family: -apple-system, sans-serif; background: #f3f3f0; }
.visually-hidden { position: absolute; inline-size: 1px; block-size: 1px; margin: -1px; overflow: hidden; clip-path: inset(50%); }
"""

CHEV = ('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" '
        'stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" '
        'stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>')
CLOSE = ('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" '
         'stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" '
         'stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" /></svg>')

# 14 条占位行：把 Support（当前页分支）推到折叠线以下，
# 这样"打开时把当前项滚进可视区"才测得到（不然 scrollTop 恒为 0）
FILLERS = '\n'.join(
    f'''            <li class="nav-drawer__item">
              <a class="nav-drawer__link" href="#"><span>Item {i}</span></a>
            </li>'''
    for i in range(1, 15)
)

MARKUP = f"""
<nav aria-label="Menu">
  <button type="button" id="burger" data-nav-drawer-open>menu</button>

  <nav-drawer>
    <bottom-sheet>
      <dialog class="nav-drawer" data-nav-drawer scroll-lock aria-labelledby="nav-drawer-title">
        <template data-nav-drawer-template>
          <div class="nav-drawer__grabber" aria-hidden="true"></div>
          <div class="nav-drawer__head nav-drawer__head--root">
            <a class="nav-drawer__brand" href="#"><span class="nav-drawer__brand-name">Northbark</span></a>
            <h2 class="nav-drawer__title visually-hidden" id="nav-drawer-title">Menu</h2>
            <button type="button" class="nav-drawer__search" aria-label="Search" data-nav-search>x</button>
            <button type="button" class="nav-drawer__close" aria-label="Close" data-nav-drawer-close>{CLOSE}</button>
          </div>

          <ul class="nav-drawer__list" role="list">
            <li class="nav-drawer__item">
              <button type="button" class="nav-drawer__link nav-drawer__link--group" data-nav-toggle
                aria-expanded="false" aria-controls="sec-nav-sub-1">
                <span>Shop</span>
                <span class="nav-drawer__chevron" aria-hidden="true">{CHEV}</span>
              </button>
              <div class="nav-drawer__sub" id="sec-nav-sub-1" inert>
                <div class="nav-drawer__sub-inner">
                  <ul class="nav-drawer__sublist" role="list">
                    <li class="nav-drawer__item nav-drawer__item--sub">
                      <button type="button" class="nav-drawer__link nav-drawer__link--sub nav-drawer__link--group"
                        data-nav-toggle aria-expanded="false" aria-controls="sec-nav-sub-1-1">
                        <span>Mowers</span>
                        <span class="nav-drawer__chevron" aria-hidden="true">{CHEV}</span>
                      </button>
                      <div class="nav-drawer__sub" id="sec-nav-sub-1-1" inert>
                        <div class="nav-drawer__sub-inner">
                          <ul class="nav-drawer__sublist nav-drawer__sublist--deep" role="list">
                            <li class="nav-drawer__item nav-drawer__item--sub">
                              <a class="nav-drawer__link nav-drawer__link--sub" href="#"><span>Walk-behind</span></a>
                            </li>
                            <li class="nav-drawer__item nav-drawer__item--sub">
                              <a class="nav-drawer__link nav-drawer__link--sub" href="#"><span>Ride-on</span></a>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </li>
                    <li class="nav-drawer__item nav-drawer__item--sub">
                      <a class="nav-drawer__link nav-drawer__link--sub" href="#"><span>Trimmers</span></a>
                    </li>
                  </ul>
                </div>
              </div>
            </li>
            {FILLERS}
            <li class="nav-drawer__item">
              <button type="button" class="nav-drawer__link nav-drawer__link--group" data-nav-toggle
                aria-expanded="false" aria-controls="sec-nav-sub-2" data-nav-branch>
                <span>Support</span>
                <span class="nav-drawer__chevron" aria-hidden="true">{CHEV}</span>
              </button>
              <div class="nav-drawer__sub" id="sec-nav-sub-2" inert>
                <div class="nav-drawer__sub-inner">
                  <ul class="nav-drawer__sublist" role="list">
                    <li class="nav-drawer__item nav-drawer__item--sub">
                      <a class="nav-drawer__link nav-drawer__link--sub nav-drawer__link--current" href="#"><span>Contact</span></a>
                    </li>
                  </ul>
                </div>
              </div>
            </li>
            <li class="nav-drawer__item">
              <a class="nav-drawer__link" href="#"><span>Journal</span></a>
            </li>
          </ul>

          <div class="nav-drawer__footer">
            <div class="account--in-drawer">Account</div>
            <div class="cart-entry--in-drawer">Cart</div>
          </div>
        </template>
      </dialog>
    </bottom-sheet>
  </nav-drawer>
</nav>
"""

TEST = r"""
const log = [];
const ok = (name, pass, extra) => log.push([name, pass ? 'PASS' : 'FAIL', extra === undefined ? '' : extra]);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const d = document.querySelector('dialog');
const $ = (s) => document.querySelector(s);

/* 无头 + virtual-time 下 CSS 过渡不推进（最小用例已验证），先把手风琴的过渡
   压掉，否则量到的是 0fr→1fr 的中间值 0px，会被误判成"没展开" */
document.head.insertAdjacentHTML('beforeend',
  '<style>.nav-drawer__sub { transition: none !important; }</style>');

(async () => {
  // 1. 打开：走 <bottom-sheet>，应挂 is-entering 并锁背景滚动
  $('#burger').click();
  await wait(60);
  ok('open', d.open === true, { open: d.open });
  ok('enter-anim', d.classList.contains('is-entering'), d.className);
  ok('scroll-lock', d.hasAttribute('scroll-lock'));
  ok('focus-on-close', document.activeElement === $('[data-nav-drawer-close]'));

  await wait(400);
  ok('enter-class-cleared', !d.classList.contains('is-entering'), d.className);

  // 1b. 当前页分支：Support 带 data-nav-branch，打开即展开，其余保持收起
  ok('branch-auto-open', $('[aria-controls="sec-nav-sub-2"]').getAttribute('aria-expanded') === 'true'
    && $('[aria-controls="sec-nav-sub-1"]').getAttribute('aria-expanded') === 'false');
  ok('branch-not-inert', $('#sec-nav-sub-2').inert === false);

  // 1c. 当前项被滚进可视区（Support 已被占位行推到折叠线以下）
  const list = $('.nav-drawer__list');
  const cur = $('.nav-drawer__link--current');
  const rel = cur.offsetTop - list.offsetTop;
  ok('center-scrolled', list.scrollTop > 0, Math.round(list.scrollTop));
  ok('center-visible',
    rel >= list.scrollTop && rel + cur.offsetHeight <= list.scrollTop + list.clientHeight,
    { rel, top: Math.round(list.scrollTop), h: list.clientHeight });

  // 2. 手风琴：展开 Shop
  const shop = $('[aria-controls="sec-nav-sub-1"]');
  const shopSub = $('#sec-nav-sub-1');
  const h0 = shopSub.getBoundingClientRect().height;
  shop.click();
  await wait(400);
  ok('shop-expanded', shop.getAttribute('aria-expanded') === 'true');
  ok('shop-open-class', shopSub.classList.contains('is-open'));
  ok('shop-not-inert', shopSub.inert === false);
  ok('shop-has-height', shopSub.getBoundingClientRect().height > 40, { h0: Math.round(h0), h1: Math.round(shopSub.getBoundingClientRect().height) });

  // 3. 三级：展开 Mowers，再收起 Shop（后代必须一起收）
  const mowers = $('[aria-controls="sec-nav-sub-1-1"]');
  const mowersSub = $('#sec-nav-sub-1-1');
  mowers.click();
  await wait(400);
  ok('mowers-expanded', mowers.getAttribute('aria-expanded') === 'true' && mowersSub.classList.contains('is-open'));

  // 焦点进入子树后收起父级：焦点必须先被挪出，不能留在 inert 里
  mowersSub.querySelector('a').focus();
  shop.click();
  await wait(400);
  ok('shop-collapsed', shop.getAttribute('aria-expanded') === 'false' && !shopSub.classList.contains('is-open'));
  ok('descendant-collapsed', mowers.getAttribute('aria-expanded') === 'false' && !mowersSub.classList.contains('is-open'));
  ok('descendant-inert', shopSub.inert === true && mowersSub.inert === true);
  ok('focus-escaped', mowersSub.contains(document.activeElement) === false, document.activeElement.className);

  // 4. 同层互斥：展开 Shop 后点 Support，Shop 应自动收起
  shop.click();
  await wait(400);
  const support = $('[aria-controls="sec-nav-sub-2"]');
  support.click();
  await wait(400);
  ok('sibling-accordion', shop.getAttribute('aria-expanded') === 'false' && support.getAttribute('aria-expanded') === 'true');

  // 5. 拖拽收起：抓手往下拖 400px
  const grabber = $('.nav-drawer__grabber');
  const startY = 200;
  const down = new PointerEvent('pointerdown', { bubbles: true, button: 0, clientY: startY, pointerId: 1 });
  grabber.dispatchEvent(down);
  for (const dy of [40, 120, 220, 320, 400]) {
    window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientY: startY + dy, pointerId: 1 }));
  }
  const dragged = getComputedStyle(d).transform;
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientY: startY + 400, pointerId: 1 }));
  await wait(60);
  ok('drag-moved', dragged !== 'none' && dragged !== 'matrix(1, 0, 0, 1, 0, 0)', dragged);
  const closing = d.classList.contains('is-closing');
  await wait(500);
  ok('drag-closed', d.open === false, { closingAtCheck: closing });

  // 6. 关闭后焦点回汉堡 —— 实现挂在原生 close 事件上，而无头模式不派发该事件
  //    （最小用例：showModal → close() 后 fired=false），故此处只记录不断言
  log.push(['focus-back-to-burger', 'SKIP', 'headless 不派发 dialog close 事件']);

  // 7. 重开：所有展开态被清零
  $('#burger').click();
  await wait(60);
  ok('reopen', d.open === true);
  // 重开后应回到"只有当前页分支展开"，用户上次手动展开的组不复位回来
  ok('reopen-branch-only',
    document.querySelectorAll('[data-nav-toggle][aria-expanded="true"]').length === 1
      && support.getAttribute('aria-expanded') === 'true',
    document.querySelectorAll('[data-nav-toggle][aria-expanded="true"]').length);
  ok('reopen-no-inline-style', d.style.transform === '', d.style.transform);

  document.title = JSON.stringify(log);
})();
"""

page = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>pending</title>
<style>{tokens}{sheet_css}{css}</style>
</head><body>
{MARKUP}
<script src="../assets/bottom-sheet.js"></script>
<script src="../assets/nav-drawer.js"></script>
<script>{TEST}</script>
</body></html>"""

out = root / 'dev-docs/nav-drawer-harness.html'
out.write_text(page)
print('written', out)
