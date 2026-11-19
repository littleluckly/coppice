#!/usr/bin/env python3
"""facets 组件样式的离线命中验证（不是版式验证）。

标记不手抄：从 sections/search.liquid 抽真实的筛选表单块，从
snippets/faceted-filters.liquid 抽真实筛选组，去掉 Liquid 标签后拼成
静态 HTML；样式走真实的 assets/facets.css 与 critical.css（绝对 file://）。

用途：抓「选择器没命中 / 变量解析失败」这类静默问题——
theme check 不管 CSS，界面看着"没样式"时最难查的就是令牌没定义。

输出：/tmp/facets-harness.html，用无头 Chrome --dump-dom 取
#probe 里的 JSON 断言结果。
"""
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

TOKENS = """
  :root {
    --page-width: 1400px;
    --page-margin: 20px;
    --color-background: #ffffff;
    --color-foreground: #333333;
    --color-brand: #1e4b3c;
    --color-brand-accent: #2e6b4e;
    --color-foreground-muted: color-mix(in srgb, #333333 70%, transparent);
    --content-width: 1280px;
    --style-border-radius-inputs: 6px;
    --card-hover-shadow: 0 6px 20px rgb(0 0 0 / 10%);
    --card-hover-lift: -2px;
  }
"""


def strip_liquid(text):
    text = re.sub(r'\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}', '', text, flags=re.S)
    text = re.sub(r'\{%-?.*?-?%\}', '', text, flags=re.S)
    text = re.sub(r'\{\{.*?\}\}', '', text, flags=re.S)
    return text


def read(p):
    return (ROOT / p).read_text(encoding='utf-8')


def main():
    search = read('sections/search.liquid')

    # section 自身的 stylesheet 也要进探针：搜索页的新布局规则（260px 左列、
    # 工具栏 order、aside-col）都在里面。脚本自己抽，不依赖外部临时文件，
    # 这样改完 section 重跑一次就是最新结果。
    # 骨架卡内部结构从 faceted-filters.js 的 _showSkeleton 抽，不手抄：
    # harness 里少写一条线，就会漏测 sk-line--short / --price 的列表态宽度
    js = read('assets/faceted-filters.js')
    inner_expr = re.search(r"card\.innerHTML\s*=\s*([\s\S]*?);", js).group(1)
    sk_inner = ''.join(re.findall(r"'([^']*)'", inner_expr))
    assert sk_inner.count('class="sk-line') == 3, sk_inner

    own_css = re.search(
        r'\{%\s*stylesheet\s*%\}(.*?)\{%\s*endstylesheet\s*%\}', search, re.S
    ).group(1)
    pathlib.Path('/tmp/search-section.css').write_text(own_css, encoding='utf-8')

    # 1) 筛选表单块：从 <form ... data-facets-form 到 </form>
    form = re.search(r'<form\s+class="facets__form".*?</form>', search, re.S).group(0)
    form = strip_liquid(form)

    # 2) 真实筛选组片段（去掉 Liquid 后 if/else 两个分支都会留下，正好覆盖
    #    price_range 与 checkbox 两类规则）
    snippet = strip_liquid(read('snippets/faceted-filters.liquid'))
    snippet = snippet.replace('{{ sort_card }}', '')

    # 把 render 语句的位置换成真实片段（render 已被 strip_liquid 删掉，这里手动塞）
    form = form.replace('</form>', snippet + '\n</form>')

    # 3) 工具栏（真实类名与层级）
    toolbar = """
    <div class="search-page__toolbar" data-facets-toolbar>
      <nav class="search-page__types">
        <ul class="search-page__types-list" role="list">
          <li><a class="search-page__type" href="#">All results</a></li>
          <li><a class="search-page__type" aria-current="page" href="#">Products</a></li>
        </ul>
      </nav>
      <button type="button" class="facets__open" data-facets-open>
        Filters <svg width="16" height="16"></svg>
      </button>
      <div class="facets__sort-card">
        <label class="facets__sort-card-label" for="SortBy-probe">Sort by</label>
        <div class="facets__sort-select">
          <select id="SortBy-probe" name="sort_by" data-facets-sort>
            <option>Featured</option><option>Price, low to high</option>
          </select>
        </div>
      </div>
      <view-toggle class="view-toggle" data-view-toggle>
        <button type="button" class="view-toggle__button" aria-pressed="false" aria-label="List view">
          <span class="view-toggle__icon view-toggle__icon--grid">G</span>
          <span class="view-toggle__icon view-toggle__icon--list">L</span>
        </button>
      </view-toggle>
      <div class="facets__active" data-facets-active>
        <ul class="facets__chips" role="list">
          <li class="facets__chip-item"><a class="facets__chip" href="#">Greenworks <span class="facets__chip-x" aria-hidden="true">✕</span></a></li>
          <li class="facets__chip-item"><a class="facets__chip" href="#">40V <span class="facets__chip-x" aria-hidden="true">✕</span></a></li>
        </ul>
        <a class="facets__clear" href="#">Clear all</a>
      </div>
    </div>
    """

    html = f"""<!doctype html>
<html lang="en" data-collection-view="grid">
<head>
<meta charset="utf-8">
<title>facets probe</title>
<style>{TOKENS}</style>
<link rel="stylesheet" href="file://{ROOT}/assets/critical.css">
<link rel="stylesheet" href="file://{ROOT}/assets/facets.css">
<link rel="stylesheet" href="file://{ROOT}/assets/product-card.css">
<link rel="stylesheet" href="file:///tmp/search-section.css">
</head>
<body>
<!-- data-facets-ready: 模拟 JS 已挂载（门控抽屉与 Apply 隐藏） -->
<collection-facets class="search-page__facets" data-facets-ready data-section-id="probe">
  <div class="search-page__body">
    <div class="search-page__aside-col">
      <aside class="search-page__sidebar">
        <h2 class="search-page__sidebar-title">Categories</h2>
        <ul class="search-page__categories" role="list">
          <li class="search-page__category-item"><a class="search-page__category-link" href="#">Mowers</a></li>
        </ul>
      </aside>
      <div class="search-page__filters" data-facets-form-slot>
        {form}
      </div>
    </div>
    <div class="search-page__results" data-facets-results tabindex="-1">
      <ul class="search-page__grid" role="list">
        <li class="search-page__grid-item"><div class="product-card"><div class="product-card__media-wrap"><div class="product-card__media"></div></div><p class="product-card__title">Mower A</p></div></li>
        <li class="search-page__grid-item"><div class="product-card"><div class="product-card__media-wrap"><div class="product-card__media"></div></div><p class="product-card__title">Mower B</p></div></li>
        <li class="search-page__grid-item"><div class="product-card"><div class="product-card__media-wrap"><div class="product-card__media"></div></div><p class="product-card__title">Mower C</p></div></li>
      </ul>
      <div class="collection__skeleton" aria-hidden="true">
        <div class="collection__skeleton-card">{sk_inner}</div>
        <div class="collection__skeleton-card">{sk_inner}</div>
        <div class="collection__skeleton-card">{sk_inner}</div>
      </div>
    </div>
  </div>
  {toolbar}
</collection-facets>
<pre id="probe"></pre>
<script>
const cs = (sel, props) => {{
  const el = document.querySelector(sel);
  if (!el) return {{ sel, missing: true }};
  const s = getComputedStyle(el);
  const out = {{ sel }};
  for (const p of props) out[p] = s.getPropertyValue(p);
  return out;
}};
const results = [
  cs('.search-page__facets', ['display']),
  cs('.search-page__body', ['grid-template-columns']),
  cs('.facets__aside', ['border-radius', 'padding', 'box-shadow']),
  cs('.facets__sort-card select', ['border-top-width', 'border-radius', 'min-height']),
  cs('.facets__open', ['display', 'border-radius']),
  cs('.facets__apply', ['display', 'border-radius']),
  cs('.facets__chip', ['border-radius', 'min-height']),
  cs('.facets__value-label input', ['accent-color']),
  cs('.facets__form', ['display']),
  cs('.search-page__filters', ['display']),
  cs('.search-page__aside-col', ['display']),
  cs('.search-page__count', ['color']),
  cs('.view-toggle__button', ['border-radius']),
  (() => {{
    const r = document.querySelector('[data-facets-results]').getBoundingClientRect();
    const s = document.querySelector('.collection__skeleton').getBoundingClientRect();
    return {{ sel: 'skeleton-vs-results',
      results: Math.round(r.width) + 'x' + Math.round(r.height) + '@' + Math.round(r.top),
      skeleton: Math.round(s.width) + 'x' + Math.round(s.height) + '@' + Math.round(s.top),
      viewport: window.innerWidth + 'x' + window.innerHeight }};
  }})(),
  (() => {{
    /* 列表视图：骨架必须单列 + 卡内「左图右线」，否则切列表后筛选会闪方格 */
    const sk = document.querySelector('.collection__skeleton');
    const card = document.querySelector('.collection__skeleton-card');
    const img = card.querySelector('.sk-img');
    const gridMode = getComputedStyle(sk).gridTemplateColumns;
    document.documentElement.setAttribute('data-collection-view', 'list');
    const listMode = getComputedStyle(sk).gridTemplateColumns;
    const cardCols = getComputedStyle(card).gridTemplateColumns;
    const r = img.getBoundingClientRect();
    const lines = [...card.querySelectorAll('.sk-line')].map(
      (l) => Math.round(l.getBoundingClientRect().width));
    return {{ sel: 'skeleton-list-view', gridMode, listMode, cardCols,
      img: Math.round(r.width) + 'x' + Math.round(r.height), lines }};
  }})()
];
document.getElementById('probe').textContent = JSON.stringify(results, null, 1);
</script>
</body>
</html>
"""
    out = pathlib.Path('/tmp/facets-harness.html')
    out.write_text(html, encoding='utf-8')
    print('写出', out, len(html), 'bytes')


if __name__ == '__main__':
    main()
