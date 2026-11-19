#!/usr/bin/env python3
"""把 sections/collection.liquid 里 {% stylesheet %} 的「筛选组件样式」
抽到 assets/facets.css，剩余内容（集合页布局）留在原处。

归属判据（白名单式，避免误伤集合页布局）：
  组件级 = 含 .facets / .collection__skeleton / [data-facets-ready]
           或 .collection__toolbar 下的 facets / [data-facets-count] / .view-toggle
           或 @keyframes skeleton-pulse
  布局级 = 含 .facets__form-slot（sticky 与无 JS 流内 padding 都是消费方的事）
  @media 递归拆解，组件规则单独重新包回同名 @media。

抽取前的三处选择器归一化（让同一套规则在搜索页也能命中，而不必沿用
.collection__ 前缀的类名）：
  .collection__facets[data-facets-ready]  → collection-facets[data-facets-ready]
  .collection__facets[aria-busy] .collection__results
                                          → collection-facets[aria-busy] [data-facets-results]
  .collection__toolbar .collection__count → .collection__toolbar [data-facets-count]

用法：python3 tools/split-facets-css.py   （只写 /tmp 与 .new，不覆盖源文件）
"""
import re
import sys

SRC = 'sections/collection.liquid'
OUT_SECTION = 'sections/collection.liquid.new'

REPLACEMENTS = [
    ('.collection__facets[data-facets-ready]', 'collection-facets[data-facets-ready]'),
    (".collection__facets[aria-busy='true'] .collection__results",
     "collection-facets[aria-busy='true'] [data-facets-results]"),
    ('.collection__toolbar .collection__count', '.collection__toolbar [data-facets-count]'),
]

HEADER = """/* =====================================================================
   facets — 筛选 / 排序组件样式（集合页与搜索页共用）
   ---------------------------------------------------------------------
   来源：2026-11-18 从 sections/collection.liquid 的 {% stylesheet %} 中
   整块抽出。原因：{% stylesheet %} 按 section 聚合、只随渲染它的 section
   加载，搜索页当时拿不到这套样式；同一组件两套外观必然分叉。

   消费方：
     sections/collection.liquid  → collection.filters.size > 0 or show_sort
     sections/search.liquid      → search.performed（搜索页只有结果态才有工具栏）

   分区：① 控制令牌 ② 表单骨架 ③ 排序卡与排序选择器 ④ 已选标签
        ⑤ 筛选组 / 价格 / 应用按钮 ⑥ 加载骨架 ⑦ 移动抽屉与面板头
        ⑧ 就绪态门控（data-facets-ready）

   落到这里之后必须遵守的两条：
   · 只放组件自足的东西。集合页特有的布局（左列粘性、工具栏行序、
     左列与右列等高）留在 collection.liquid——搜索页左列结构不同，
     粘性与行序照搬会打架。
   · 不再用 .collection__ 前缀做选择器锚点（已归一化为元素名
     collection-facets 与 data-* 钩子），否则搜索页得假装自己是集合页。
   ===================================================================== */

/* ① 控制令牌
   Filters 按钮 / 排序控件 / 视图切换共用的描边与圆角。原先定义在 .collection
   作用域里，抽出来后必须提到 :root，否则搜索页没有 .collection 祖先时
   var() 解析失败、整条 border/radius 声明静默失效（不报错，看起来像"没样式"）。
   仍然尊重商家设置，只用 max() 兜住 14px 下限：6px 在 44px 高的按钮上
   几乎看不出圆角，两个控件并排会像两个时代的产物。 */
:root {
  --facet-control-radius: max(var(--style-border-radius-inputs), 14px);
  --facet-control-border: 1px solid color-mix(in srgb, var(--color-foreground) 25%, transparent);
}
"""


def strip_comments(sel):
    return re.sub(r'/\*.*?\*/', '', sel, flags=re.S)


def selector_is_component(sel):
    """sel 是单个选择器（已去注释/空白）"""
    if '.facets__form-slot' in sel:
        return False
    if '.facets' in sel or '.collection__skeleton' in sel or '[data-facets-ready]' in sel:
        return True
    if '.collection__toolbar' in sel and (
        '[data-facets-count]' in sel or '.view-toggle' in sel
    ):
        return True
    return False


def is_component_selector_list(sel_text):
    parts = [strip_comments(p).strip() for p in sel_text.split(',')]
    parts = [p for p in parts if p]
    return bool(parts) and all(selector_is_component(p) for p in parts)


def parse_units(text):
    """切出单元：(trivia, head, body, raw)，raw 含完整原文"""
    units = []
    i, n = 0, len(text)
    trivia = ''
    while i < n:
        if text.startswith('/*', i):
            j = text.find('*/', i + 2)
            j = n if j == -1 else j + 2
            trivia += text[i:j]
            i = j
            continue
        if text[i] in ' \t\r\n':
            j = i
            while j < n and text[j] in ' \t\r\n':
                j += 1
            trivia += text[i:j]
            i = j
            continue

        j = i
        depth_paren = 0
        while j < n:
            c = text[j]
            if c == '(':
                depth_paren += 1
            elif c == ')':
                depth_paren -= 1
            elif c in '{;' and depth_paren == 0:
                break
            elif c == '}' and depth_paren == 0:
                raise ValueError('unbalanced } at offset %d' % j)
            j += 1

        if j >= n:
            units.append((trivia, text[i:], None, trivia + text[i:]))
            break

        head = text[i:j]
        if text[j] == ';':
            units.append((trivia, head + ';', None, trivia + head + ';'))
            trivia = ''
            i = j + 1
            continue

        k = j + 1
        depth = 1
        while k < n and depth > 0:
            if text[k] == '{':
                depth += 1
            elif text[k] == '}':
                depth -= 1
            k += 1
        if depth != 0:
            raise ValueError('unbalanced block starting at offset %d' % j)

        units.append((trivia, head, text[j + 1:k - 1], trivia + head + text[j:k]))
        trivia = ''
        i = k
    return units


def classify(units):
    comp, sec = [], []
    for trivia, head, body, raw in units:
        h = strip_comments(head).strip()
        if body is None:
            sec.append(raw)
            continue
        if h.startswith('@media'):
            c_inner, s_inner = classify(parse_units(body))
            # 拼接时保证每个内部单元以换行收尾：单元的尾随换行属于下一个单元的
            # trivia，直接 join 会把两条规则粘成 `}}`（合法但产物难看，
            # 且不利于后续 grep 复核）
            indent = re.search(r'[ \t]*$', trivia).group(0)

            def join(units):
                return ''.join(u if u.endswith('\n') else u + '\n' for u in units)
            if c_inner:
                comp.append(trivia + head + '{\n' + join(c_inner) + indent + '}')
            if s_inner:
                sec.append(trivia + head + '{\n' + join(s_inner) + indent + '}')
            continue
        if h.startswith('@keyframes'):
            (comp if 'skeleton' in h else sec).append(raw)
            continue
        if h.startswith('@'):
            sec.append(raw)
            continue
        (comp if is_component_selector_list(h) else sec).append(raw)
    return comp, sec


def dedent(css):
    lines = css.split('\n')
    if all(not ln.strip() or ln.startswith('  ') for ln in lines):
        lines = [ln[2:] if ln.startswith('  ') else ln for ln in lines]
    return '\n'.join(lines)


def main():
    src = open(SRC, encoding='utf-8').read()
    m = re.search(r'\{%\s*stylesheet\s*%\}(.*?)\{%\s*endstylesheet\s*%\}', src, re.S)
    if not m:
        sys.exit('未找到 {% stylesheet %} 块')

    css = m.group(1)
    for old, new in REPLACEMENTS:
        if old not in css:
            sys.exit('归一化目标缺失，脚本与源码不同步：%s' % old)
        css = css.replace(old, new)

    comp, sec = classify(parse_units(css))
    comp_css = dedent(''.join(comp).strip('\n'))
    sec_css = ''.join(sec).strip('\n')

    open('/tmp/facets-extracted.css', 'w', encoding='utf-8').write(HEADER + '\n' + comp_css + '\n')
    open('/tmp/collection-remainder.css', 'w', encoding='utf-8').write(sec_css + '\n')
    new_src = src[:m.start(1)] + '\n' + sec_css + '\n' + src[m.end(1):]
    open(OUT_SECTION, 'w', encoding='utf-8').write(new_src)

    print('组件层 %d 行 | 集合页剩余 %d 行' % (comp_css.count('\n') + 1, sec_css.count('\n') + 1))
    # 自检：每个带 body 的单元，其 head 都不能是空白（防止 raw 漏拼 head 的回归）
    for trivia, head, body, raw in parse_units(css):
        if body is not None and not strip_comments(head).strip():
            print('⚠️ 选择器丢失：%r' % raw[:60])


if __name__ == '__main__':
    main()
