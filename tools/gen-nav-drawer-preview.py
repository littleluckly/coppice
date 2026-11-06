#!/usr/bin/env python3
"""临时核对稿：把 main-nav.liquid 的 stylesheet + critical.css 的 bottom-sheet 段
抽出来，配上同构 DOM，用于 390/500px 下核对移动端抽屉的手风琴与抓手。

只用于本地目视核对，不参与主题打包（.workbuddy 外的临时文件用完即删）。
"""
import re
from pathlib import Path

root = Path('/Users/mac/workspaces/coppice')
section = (root / 'sections/main-nav.liquid').read_text()
css = re.search(r'{% stylesheet %}(.*?){% endstylesheet %}', section, re.S).group(1)

critical = (root / 'assets/critical.css').read_text()
sheets = re.search(
    r'/\* =+\n\s*bottom-sheet.*?(?=\n/\*|\Z)', critical, re.S)
sheet_css = sheets.group(0) if sheets else ''

tokens = """
:root {
  --color-background: #ffffff;
  --color-foreground: #333333;
  --color-brand: #1E4B3C;
  --color-brand-accent: #2E6B4E;
  --color-foreground-muted: #666666;
  --color-header-surface: #ffffff;
  --header-shadow: none;
  --card-hover-lift: -2px;
  --card-hover-shadow: none;
  --card-glow-1: transparent;
  --card-glow-2: transparent;
  --card-glow-3: transparent;
  --style-border-radius-inputs: 4px;
  --content-width: 1200px;
  --page-margin: 16px;
  --font-primary--family: -apple-system, "Helvetica Neue", sans-serif;
}
html, body { margin: 0; height: 100%; }
body { font-family: -apple-system, "Helvetica Neue", sans-serif; color: var(--color-foreground); background: #f3f3f0; }
.visually-hidden { position: absolute; inline-size: 1px; block-size: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.page-note { padding: 24px; font-size: 14px; color: #555; }
"""

GROUP_ICON = (
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" '
    'stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" '
    'stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>'
)
close_icon = (
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" '
    'stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" '
    'stroke-linejoin="round" d="M6 6l12 12M18 6L6 18" /></svg>'
)
cart_icon = (
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" '
    'stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" '
    'stroke-linejoin="round" d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" /></svg>'
)
search_icon = (
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" '
    'stroke-width="1.5" stroke="currentColor"><circle cx="11" cy="11" r="7" />'
    '<path stroke-linecap="round" d="m20 20-3.5-3.5" /></svg>'
)


def group(title, subs, sub_open=False, deep=None):
    """一级分组：button + 可展开列表"""
    inner = ''.join(subs)
    cls = 'nav-drawer__sub is-open' if sub_open else 'nav-drawer__sub'
    return f"""
      <li class="nav-drawer__item">
        <button type="button" class="nav-drawer__link nav-drawer__link--group"
          data-nav-toggle aria-expanded="{'true' if sub_open else 'false'}">
          <span>{title}</span>
          <span class="nav-drawer__chevron" aria-hidden="true">{GROUP_ICON}</span>
        </button>
        <div class="{cls}">
          <div class="nav-drawer__sub-inner">
            <ul class="nav-drawer__sublist" role="list">{inner}</ul>
          </div>
        </div>
      </li>"""


def leaf(title, current=False):
    return f"""
          <li class="nav-drawer__item nav-drawer__item--sub">
            <a class="nav-drawer__link nav-drawer__link--sub{' nav-drawer__link--current' if current else ''}"
               href="#">{title}</a>
          </li>"""


def deep_group(title, leaves, open_=False):
    inner = ''.join(f"""
                  <li class="nav-drawer__item nav-drawer__item--sub">
                    <a class="nav-drawer__link nav-drawer__link--sub" href="#">{t}</a>
                  </li>""" for t in leaves)
    return f"""
          <li class="nav-drawer__item nav-drawer__item--sub">
            <button type="button" class="nav-drawer__link nav-drawer__link--sub nav-drawer__link--group"
              data-nav-toggle aria-expanded="{'true' if open_ else 'false'}">
              <span>{title}</span>
              <span class="nav-drawer__chevron" aria-hidden="true">{GROUP_ICON}</span>
            </button>
            <div class="nav-drawer__sub{' is-open' if open_ else ''}">
              <div class="nav-drawer__sub-inner">
                <ul class="nav-drawer__sublist nav-drawer__sublist--deep" role="list">{inner}</ul>
              </div>
            </div>
          </li>"""


def drawer(expanded=False):
    shop = group('Shop', [
        deep_group('Mowers', ['Walk-behind', 'Ride-on', 'Robotic'], open_=expanded),
        leaf('Trimmers'),
        leaf('Chainsaws'),
        leaf('Batteries', current=True),
    ], sub_open=expanded)
    support = group('Support', [leaf('Contact'), leaf('Warranty'), leaf('Manuals')])
    return f"""
<nav-drawer>
  <bottom-sheet>
    <dialog class="nav-drawer" data-nav-drawer>
      <div class="nav-drawer__grabber" aria-hidden="true"></div>
      <div class="nav-drawer__head nav-drawer__head--root">
        <a class="nav-drawer__brand" href="#"><span class="nav-drawer__brand-name">Northbark</span></a>
        <h2 class="nav-drawer__title visually-hidden">Menu</h2>
        <button type="button" class="nav-drawer__search" aria-label="Search">{search_icon}</button>
        <button type="button" class="nav-drawer__close" aria-label="Close">{close_icon}</button>
      </div>
      <ul class="nav-drawer__list" role="list">
        {shop}
        {support}
        <li class="nav-drawer__item"><a class="nav-drawer__link" href="#"><span>Journal</span></a></li>
        <li class="nav-drawer__item"><a class="nav-drawer__link" href="#"><span>Contact</span></a></li>
      </ul>
      <div class="nav-drawer__footer">
        <div class="account--in-drawer">Account</div>
        <div class="cart-entry cart-entry--in-drawer" data-cart-entry>
          <a class="cart-entry__link" href="#">{cart_icon}
            <span class="cart-entry__label">Cart</span>
            <span class="cart-entry__count" aria-hidden="true">12</span>
          </a>
        </div>
      </div>
    </dialog>
  </bottom-sheet>
</nav-drawer>"""


SCRIPT = """
  /* ?header → 只看移动端页头行（抽屉不打开）：核对购物车角标压在图标的右上角 */
  if (location.search.includes('header')) {
    document.querySelector('nav-drawer').remove();
    document.querySelector('.page-note').textContent = '核对稿：移动端页头行（购物车角标应压在图标右上角）';
  } else {
    /* ?closed → 全部收起，用于核对首帧（列表滚动与底部固定行） */
    if (location.search.includes('closed')) {
      document.querySelectorAll('.nav-drawer__sub.is-open').forEach((sub) => {
        sub.classList.remove('is-open');
        sub.inert = true;
        sub.parentElement.querySelector('[data-nav-toggle]').setAttribute('aria-expanded', 'false');
      });
    }
    document.querySelector('dialog').showModal();
    /* showModal 会把焦点扔给第一个可聚焦元素（品牌链接），
       截图里会多出一圈黑色焦点框，核对版式时很碍眼 —— 挪开 */
    document.activeElement?.blur();
  }
"""

page = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>nav drawer 核对稿</title>
<style>{tokens}{sheet_css}{css}</style>
</head><body>
<div class="page-note">核对稿：移动端导航抽屉（手风琴 + 抓手）</div>
<div class="main-nav">
  <div class="main-nav__mobile">
    <button type="button" class="main-nav__burger" aria-label="Menu">
      <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" fill="none"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    </button>
    <button type="button" class="main-nav__search-toggle main-nav__search-toggle--mobile" aria-label="Search">{search_icon}</button>
    <div class="cart-entry cart-entry--mobile" data-cart-entry>
      <a class="cart-entry__link" href="#">{cart_icon}<span class="cart-entry__count" aria-hidden="true">12</span></a>
    </div>
  </div>
</div>
{drawer(expanded=True)}
<script>{SCRIPT}</script>
</body></html>"""

out = root / 'dev-docs/nav-drawer-preview.html'
out.write_text(page)
print('written', out, len(page))
