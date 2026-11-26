#!/usr/bin/env python3
"""移动端页头行核对稿：把 main-nav.liquid 的 {% stylesheet %} 原样抽出，
配上同构 DOM（☰ / 搜索 / 对比 / 购物车），在 375 与 320 两档宽度量几何。

为什么需要它：移动页头是**唯一没法在桌面预览里看到的行**（≤989px 才出现），
而它只有三个 44px 图标的位置预算 —— 加减一枚图标是否溢出、某个条件入口
（如对比入口只在角标 > 0 时出现）到底占不占位，只能在真实宽度下读
getBoundingClientRect 才知道。BUG-099 就是靠它确认的。

已知偏差（与 tools/gen-nav-drawer-preview.py 同一类）：
  · DOM 是手写的同构副本，不是 Liquid 渲染结果。**改 sections/main-nav.liquid
    的 .main-nav__mobile 行时必须同步这里的 `row()`**（图标、类名、顺序、
    data-* 属性），否则量的是一个不存在的页头。
  · 只测「有没有溢出 / 占多大 / 显不显示」，不测 Liquid 侧的条件渲染
    （那是主题渲染的事，这里没有 Liquid）。

依赖：Google Chrome（用 --headless=new 跑，无需 puppeteer）。

用法：
  python3 tools/preview-mobile-header.py            # 生成 /tmp 核对稿并打印几何
  python3 tools/preview-mobile-header.py --open     # 生成后用默认浏览器打开目视
  python3 tools/preview-mobile-header.py --shot     # 顺手出一张 PNG（/tmp/coppice-mobile-header.png）
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_HTML = Path('/tmp/coppice-mobile-header.html')
OUT_PNG = Path('/tmp/coppice-mobile-header.png')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
ICON = ''
WIDTHS = (375, 320)

TOKENS = """
:root {
  --color-background: #ffffff; --color-foreground: #333333; --color-brand: #1E4B3C;
  --color-foreground-muted: #666666; --color-header-surface: #ffffff;
  --header-shadow: 0 1px 2px rgb(0 0 0 / 12%); --page-margin: 16px;
  --icon-stroke-width: 1.5; --font-primary--family: -apple-system, sans-serif;
}
html, body { margin: 0; }
body { font-family: -apple-system, sans-serif; color: #333; background: #f3f3f0; padding: 12px 0; }
.stage { background: #fff; margin: 0 auto 16px; }
.stage > h3 { margin: 0; padding: 6px 8px; font: 600 12px/1.4 -apple-system, sans-serif; color: #666; }
.visually-hidden { position: absolute; inline-size: 1px; block-size: 1px; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
#out { font: 12px/1.5 ui-monospace, monospace; padding: 12px; }
"""

MEASURE = """
const result = {};
document.querySelectorAll('.stage').forEach(stage => {
  const q = s => stage.querySelector(s);
  const cs = el => getComputedStyle(el);
  const r = el => { const b = el.getBoundingClientRect();
    return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; };
  const entry = q('compare-entry');
  const badge = entry && entry.querySelector('.compare-entry__count');
  const row = q('.main-nav__mobile');
  result[stage.dataset.case] = {
    entryDisplay: cs(entry).display,
    badge: badge && !badge.hidden ? badge.textContent : null,
    search: r(q('.main-nav__search-toggle')),
    compare: r(entry),
    cart: r(q('.cart-entry')),
    rowScrollW: row.scrollWidth,
    rowClientW: row.clientWidth,
  };
});
document.getElementById('out').textContent = JSON.stringify(result, null, 1);
"""


def row(case, empty):
    """同构副本：必须与 sections/main-nav.liquid 的 .main-nav__mobile 对齐。"""
    attrs = ' data-max="4" data-empty data-pending' if empty else ' data-max="4"'
    badge = ('<span class="compare-entry__count" data-compare-count hidden aria-hidden="true"></span>'
             if empty else
             '<span class="compare-entry__count" data-compare-count aria-hidden="true">2</span>')
    return f"""
<div class="stage" data-case="{case}" style="--stage-w: {case.split('/')[0].strip()}px; width: {case.split('/')[0].strip()}px">
  <h3>{case}</h3>
  <div class="main-nav__mobile">
    <button type="button" class="main-nav__burger" aria-label="Menu">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <a href="/search" class="main-nav__search-toggle main-nav__search-toggle--mobile" aria-label="Search">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
    </a>
    <compare-entry class="compare-entry compare-entry--mobile"{attrs}>
      <a class="compare-entry__link" href="/pages/compare" aria-label="Compare products">{ICON}{badge}</a>
    </compare-entry>
    <div class="cart-entry cart-entry--mobile" data-cart-entry>
      <a class="cart-entry__link" href="/cart" aria-label="Cart">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6"/></svg>
        <span class="cart-entry__count" data-cart-count>1</span>
      </a>
    </div>
  </div>
</div>"""


def build():
    global ICON
    ICON = (ROOT / 'assets/icon-compare.svg').read_text()
    section = (ROOT / 'sections/main-nav.liquid').read_text()
    m = re.search(r'{% stylesheet %}(.*?){% endstylesheet %}', section, re.S)
    if not m:
        sys.exit('✗ main-nav.liquid 里没找到 {% stylesheet %} 块')
    css = m.group(1)

    stages = []
    for w in WIDTHS:
        stages.append(row(f'{w} / empty', True))
        stages.append(row(f'{w} / filled', False))
    OUT_HTML.write_text(
        '<!doctype html><html><head><meta charset="utf-8"><style>'
        + TOKENS + css + '</style></head><body>'
        + ''.join(stages)
        + f'<pre id="out"></pre><script>{MEASURE}</script></body></html>'
    )


def chrome(*flags):
    return subprocess.run(
        [CHROME, '--headless=new', '--disable-gpu', '--no-sandbox',
         '--user-data-dir=/tmp/chrome-mobile-header-check',
         '--window-size=500,1400', '--virtual-time-budget=1500', *flags],
        capture_output=True, text=True,
    )


def main():
    build()
    print(f'核对稿：{OUT_HTML}')

    if not Path(CHROME).exists():
        print('⚠️ 没找到 Chrome，无法自动量尺寸；用 --open 目视核对。')
        return 1

    dom = chrome('--dump-dom', str(OUT_HTML)).stdout
    m = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
    if not m:
        sys.exit('✗ 没读到测量结果（核对稿里的内联脚本没跑？）')
    data = json.loads(m.group(1).replace('&quot;', '"').replace('&amp;', '&'))

    ok = True
    for case, v in data.items():
        overflow = v['rowScrollW'] != v['rowClientW']
        print(f'{case:14s} entry={v["entryDisplay"]:11s} badge={v["badge"] or "-":2s} '
              f'搜索 {v["search"]["l"]}-{v["search"]["r"]}  对比 {v["compare"]["l"]}-{v["compare"]["r"]}  '
              f'购物车 {v["cart"]["l"]}-{v["cart"]["r"]}  行 {v["rowClientW"]}px'
              f'{"  ✗ 横向溢出" if overflow else ""}')
        if overflow:
            ok = False
        if case.endswith('empty') and v['entryDisplay'] != 'none':
            print('  ✗ 空清单时对比入口没有退场')
            ok = False
        if case.endswith('filled'):
            if v['compare']['w'] != 44:
                print('  ✗ 对比入口触摸目标不是 44px')
                ok = False
            if v['badge'] != '2':
                print('  ✗ 角标没显示款数')
                ok = False
            if v['search']['r'] > v['compare']['l'] or v['compare']['r'] > v['cart']['l']:
                print('  ✗ 图标重叠或顺序不对（应为 搜索 → 对比 → 购物车）')
                ok = False

    if '--shot' in sys.argv:
        chrome(f'--screenshot={OUT_PNG}', str(OUT_HTML))
        print(f'截图：{OUT_PNG}')

    if '--open' in sys.argv:
        subprocess.run(['open', str(OUT_HTML)])

    print('✓ 几何全部通过' if ok else '✗ 有断言失败，见上')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
