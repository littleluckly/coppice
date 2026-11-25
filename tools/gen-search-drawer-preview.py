#!/usr/bin/env python3
"""搜索抽屉（2026-11-24 参考图改版）本地目视核对稿。

抽出 sections/search-drawer.liquid 的 stylesheet、sections/predictive-search.liquid 的
结果片段样式、assets/critical.css 的 .btn-solid 段，配上与真实 markup 同构的 DOM。

生成两份页面：
  <out>          —— 2×2 舞台：idle / results / idle+实拍图 / 375 窄屏（iframe）
  <out>-narrow   —— iframe 内的窄屏页（媒体查询要按 375 视口求值，不能按窗口）

只用于本地核对，不参与主题打包。

用法：python3 tools/gen-search-drawer-preview.py [out.html]
截图："/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        --headless=new --window-size=1200,1760 --virtual-time-budget=2000 \
        --screenshot=/tmp/search-drawer.png file:///tmp/search-drawer.html
"""
import re
import sys
from pathlib import Path

ROOT = Path('/Users/mac/workspaces/coppice')
DEMO_IMAGE = (ROOT / 'dev-docs/local-assets/55555.webp').as_uri()


def read(p):
    return (ROOT / p).read_text(encoding='utf-8')


def stylesheet_of(path):
    return re.search(r'{% stylesheet %}(.*?){% endstylesheet %}', read(path), re.S).group(1)


drawer_css = stylesheet_of('sections/search-drawer.liquid')
results_css = stylesheet_of('sections/predictive-search.liquid')

critical = read('assets/critical.css')
btn_css = re.search(r'\.btn-solid \{.*?(?=\n\.btn-solid--quiet:hover)', critical, re.S).group(0)
quiet_css = re.search(r'\.btn-solid--quiet \{.*?(?=\n/\*)', critical, re.S).group(0)


def icon(name):
    return re.sub(r'\s+', ' ', read(f'assets/{name}')).strip()


TOKENS = """
:root {
  --color-background: #ffffff;
  --color-foreground: #333333;
  --color-brand: #1E4B3C;
  --color-brand-accent: #2E6B4E;
  --color-foreground-muted: color-mix(in srgb, #333333 70%, transparent);
  --color-sale: #c62828;
  --color-sale-surface: #ffebeb;
  --style-border-radius-inputs: 4px;
  --content-width: 1200px;
  --page-margin: 16px;
  --font-primary--family: -apple-system, "Helvetica Neue", Arial, sans-serif;
  /* 卡片 hover 签名（抄自 snippets/css-variables.liquid 的 :root 浅底分支）——
     不补这几个变量，@media (hover) 里的 translate/box-shadow 会因变量未定义
     整条失效，静态截图看不出、hover 探针会全部 FAIL。 */
  --color-brand-light: #74C4A7;
  --card-hover-lift: -2px;
  --card-hover-shadow: 0 6px 20px color-mix(in srgb, var(--color-brand-light) 30%, transparent);
}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; }
body {
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
  color: var(--color-foreground);
  background: #ececea;
  padding: 24px;
}
.visually-hidden {
  position: absolute; inline-size: 1px; block-size: 1px; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;
}
.stages { display: grid; grid-template-columns: repeat(2, 552px); gap: 24px; align-items: start; }
.stage { display: flex; flex-direction: column; gap: 8px; }
.stage__label { margin: 0; font: 600 11px/1 var(--font-primary--family); letter-spacing: .1em; text-transform: uppercase; color: #777; }
.stage--narrow iframe { border: 0; display: block; }

/* ---- 预览外壳：把 <dialog> 的固定定位状态摆成普通容器 ---- */
.search-drawer {
  position: relative !important;
  inset: auto !important;
  inline-size: 552px !important;
  block-size: 800px !important;
  translate: 0 0 !important;
  margin: 0 !important;
  border: 1px solid #ddd !important;
  border-radius: 20px;
  overflow: hidden;
  display: block;
}
body.is-narrow { padding: 0; }
body.is-narrow .search-drawer {
  inline-size: 375px !important;
  block-size: 780px !important;
  border-radius: 18px;
}
"""

PILL_TEXTS = ['Lawn mower', 'Battery', 'Trimmer', 'Chainsaw', 'Parts']

QUICK_LINKS = [
    ('icon-mower.svg', 'Walk-behind mowers', 'Explore our full range'),
    ('icon-mower.svg', 'Riding mowers', 'Cover more ground'),
    ('icon-chainsaw.svg', 'Chainsaws', 'Power through timber'),
    ('icon-trimmer.svg', 'String trimmers', 'Keep edges clean'),
]


def discovery(with_image):
    pills = ''.join(
        f'<li><a class="search-discovery__pill" href="#">{t}</a></li>' for t in PILL_TEXTS
    )
    cards = ''.join(
        f'''<li class="search-discovery__card">
              <a class="search-discovery__card-link" href="#">
                <span class="search-discovery__card-icon" aria-hidden="true">{icon(i)}</span>
                <span class="search-discovery__card-text">
                  <span class="search-discovery__card-title">{t}</span>
                  <span class="search-discovery__card-subtitle">{s}</span>
                </span>
              </a>
            </li>''' for i, t, s in QUICK_LINKS
    )
    if with_image:
        promo_cls = 'search-discovery__promo'
        media = f'<img class="search-discovery__promo-image" src="{DEMO_IMAGE}" alt="">'
    else:
        promo_cls = 'search-discovery__promo search-discovery__promo--text'
        media = f'<span class="search-discovery__promo-mark" aria-hidden="true">{icon("icon-leaf.svg")}</span>'
    return f'''
        <div class="search-discovery">
          <div class="search-discovery__block">
            <h3 class="search-discovery__label">Popular Searches</h3>
            <ul class="search-discovery__pills" role="list">{pills}</ul>
          </div>

          <a class="{promo_cls}" href="#">{media}
            <div class="search-discovery__promo-body">
              <p class="search-discovery__promo-title">Find the right equipment</p>
              <p class="search-discovery__promo-text">Get personalized recommendations for your yard.</p>
              <span class="btn-solid search-discovery__promo-cta">Take the quiz <span aria-hidden="true">&rarr;</span></span>
            </div>
          </a>

          <div class="search-discovery__block">
            <div class="search-discovery__block-head">
              <h3 class="search-discovery__label">Quick Links</h3>
              <a class="search-discovery__more" href="#">View all <span aria-hidden="true">&rarr;</span></a>
            </div>
            <ul class="search-discovery__grid" role="list">{cards}</ul>
          </div>

          <div class="search-discovery__help">
            <span class="search-discovery__help-icon" aria-hidden="true">{icon('icon-support.svg')}</span>
            <span class="search-discovery__help-text">
              <span class="search-discovery__help-title">Need Help?</span>
              <span class="search-discovery__help-note">Our support team is here to help.</span>
            </span>
            <a class="btn-solid btn-solid--quiet search-discovery__help-cta" href="#">Contact Us <span aria-hidden="true">&rarr;</span></a>
          </div>
        </div>'''


RESULT_ROW = '''
              <li class="predictive-search__item" role="option" aria-selected="false">
                <a class="predictive-search__link" href="#">
                  <span class="predictive-search__text">
                    <span class="predictive-search__title">{title}</span>
                    <span class="predictive-search__price">
                      <span class="predictive-search__price-current">{price}</span>
                    </span>
                  </span>
                </a>
              </li>'''


def form(panel_open):
    if panel_open:
        rows = ''.join(
            RESULT_ROW.format(title=t, price=p)
            for t, p in [
                ('Timberline 46 Petrol Walk-Behind Mower', '$1,299.00'),
                ('Timberline 46 Battery Walk-Behind Mower', '$1,149.00'),
                ('Ridgeway 92 Riding Mower', '$3,499.00'),
            ]
        )
        panel = f'''
      <div class="predictive-search__panel" id="predictive-search-results-preview">
        <h3 class="predictive-search__heading">Products</h3>
        <ul class="predictive-search__list" role="list">{rows}</ul>
      </div>'''
    else:
        panel = '\n      <div class="predictive-search__panel" hidden></div>'

    return f'''
    <predictive-search class="predictive-search" data-results-limit="10">
      <form class="predictive-search__form" action="#" method="get" role="search" onsubmit="return false">
        <div class="predictive-search__field">
          <span class="predictive-search__icon" aria-hidden="true">{icon('icon-search.svg')}</span>
          <input class="predictive-search__input" type="search" name="q"{' value="mower"' if panel_open else ''}
                 placeholder="Search articles, pages, or products">
          <button type="button" class="predictive-search__clear" aria-label="Clear search"{'' if panel_open else ' hidden'}>
            {icon('icon-close.svg')}
          </button>
          <button type="submit" class="predictive-search__submit" aria-label="Search">
            {icon('icon-arrow-right.svg')}
          </button>
        </div>{panel}
      </form>
    </predictive-search>'''


def drawer(label, panel_open, with_image=False, with_label=True):
    frame = f'<p class="stage__label">{label}</p>' if with_label else ''
    body = form(panel_open) + (discovery(with_image) if not panel_open else '')
    return f'''
      <div class="stage">
        {frame}
        <div class="search-drawer" open>
          <div class="search-drawer__inner">
            <div class="search-drawer__head">
              <h2 class="search-drawer__title">Search</h2>
              <button type="button" class="search-drawer__close" aria-label="Close">
                {icon('icon-close.svg')}
              </button>
            </div>
            <div class="search-drawer__body">{body}
            </div>
          </div>
        </div>
      </div>'''


HEAD = f'''<style>{TOKENS}</style>
<style>/* critical.css · .btn-solid */{btn_css}</style>
<style>/* critical.css · .btn-solid--quiet */{quiet_css}</style>
<style>/* main-nav.liquid · stylesheet */{drawer_css}</style>
<style>/* predictive-search.liquid · 结果片段 */{results_css}</style>'''


def page(title, body, narrow=False):
    cls = ' class="is-narrow"' if narrow else ''
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
{HEAD}
</head>
<body{cls}>{body}
</body>
</html>
'''


out = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/search-drawer.html')
narrow_out = out.with_name(out.stem + '-narrow.html')

narrow_out.write_text(
    page('Search drawer 375', drawer('', False, with_label=False), narrow=True), encoding='utf-8'
)

main_body = f'''
<div class="stages">
  {drawer('Idle - discovery（无图退路）', False)}
  {drawer('Results - panel open', True)}
  {drawer('Idle - promo 有图', False, with_image=True)}
  <div class="stage stage--narrow">
    <p class="stage__label">375 窄屏（iframe 视口）</p>
    <iframe src="{narrow_out.name}" width="375" height="780" title="narrow"></iframe>
  </div>
</div>'''

out.write_text(page('Search drawer preview', main_body), encoding='utf-8')
print(f'wrote {out}')
print(f'wrote {narrow_out}')
