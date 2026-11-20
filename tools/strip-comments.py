#!/usr/bin/env python3
"""剥离主题代码注释，用于生成提交用的主题包。

用法：
    python3 tools/strip-comments.py                      # 预演，只统计
    python3 tools/strip-comments.py --apply              # 写盘（限 release/* 分支）
    python3 tools/strip-comments.py --root=/tmp/x --apply --force   # 在任意目录跑

只在 7 个主题目录里动文件，不碰 dev-docs/ tools/ docs/。

**覆盖的七类注释**（2026-11-20 逐次补齐，每类都是踩过才发现漏的）：
  1. `{% comment %}…{% endcomment %}`
  2. `{% # 行内标签 %}`
  3. `{% liquid %}` 块内以 `#` 开头的行 —— **注意没有 endliquid，到第一个 `%}` 结束**
  4. `{% doc %}…{% enddoc %}`（组件文档，不输出）
  5. `/* … */`（Liquid 内嵌 / CSS / JS）
  6. `<!-- … -->`（保留 IE 条件注释）
  7. JS 里独占一整行的 `//`

安全边界：
- JS 的**行内** `//` 一律不删 —— 字符串里的 `'https://…'` 含 `//`，正则删除必出错。
- 删除后压缩连续空行、去行尾空白；会改变行号，不动代码语义。

删完必须验证（缺一不可）：
    shopify theme check
    node --check assets/*.js
    git diff 逐行核对：删除行是否都是注释
    python3 tools/verify-package.py <zip>     ← 整包七类扫描，权威判据
"""
import glob
import os
import re
import subprocess
import sys

APPLY = '--apply' in sys.argv
FORCE = '--force' in sys.argv
ROOT = '.'
for _a in sys.argv:
    if _a.startswith('--root='):
        ROOT = _a.split('=', 1)[1]
        break


def collect(root):
    """返回 (liquid, css, js, json) 四组文件路径。"""
    def g(p):
        return glob.glob(os.path.join(root, p))
    return (
        g('sections/*.liquid') + g('snippets/*.liquid')
        + g('blocks/*.liquid') + g('layout/*.liquid')
        # templates/ 下只有 gift_card.liquid，第一版漏了它
        + g('templates/*.liquid'),
        g('assets/*.css'),
        g('assets/*.js'),
        g('templates/*.json') + g('config/*.json') + g('sections/*.json'),
    )


RE_LIQ_BLOCK = re.compile(r'\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}', re.S)
RE_LIQ_HASH = re.compile(r'\{%-?\s*#(?:[^%]|%(?!\}))*?-?%\}')
# {% liquid %} 块内以 # 开头的行是注释（Liquid 官方语法）。
# 它**没有 endliquid**，到第一个 %} 结束——按 endliquid 写会一条都匹配不上。
RE_LIQ_TAG = re.compile(r'(\{%-?\s*liquid\b)(.*?)(-?%\})', re.S)
RE_DOC_BLOCK = re.compile(r'\{%-?\s*doc\s*-?%\}.*?\{%-?\s*enddoc\s*-?%\}', re.S)
RE_C_BLOCK = re.compile(r'/\*.*?\*/', re.S)
RE_HTML = re.compile(r'<!--(?!\[if).*?-->', re.S)
RE_JS_LINE = re.compile(r'^[ \t]*//[^\n]*\n', re.M)
RE_HASH_LINE = re.compile(r'^[ \t]*#[^\n]*\n?', re.M)

stat = {}


def note(kind, text):
    n, b = stat.get(kind, (0, 0))
    stat[kind] = (n + 1, b + len(text))


def make_repl(kind):
    def repl(m):
        note(kind, m.group(0))
        return ''
    return repl


def tidy(s):
    """压缩连续空行、去行尾空白。"""
    s = re.sub(r'[ \t]+\n', '\n', s)
    s = re.sub(r'\n[ \t]*\n(?:[ \t]*\n)+', '\n\n', s)
    return s


def strip_liquid(s):
    s = RE_DOC_BLOCK.sub(make_repl('liquid {% doc %}'), s)
    s = RE_LIQ_BLOCK.sub(make_repl('liquid {% comment %}'), s)
    s = RE_LIQ_HASH.sub(make_repl('liquid {% # %}'), s)

    def hash_in_block(m):
        body = m.group(2)
        new = RE_HASH_LINE.sub('', body)
        if len(new) != len(body):
            n, b = stat.get('liquid 块内 # 注释', (0, 0))
            stat['liquid 块内 # 注释'] = (n + 1, b + len(body) - len(new))
        return m.group(1) + new + m.group(3)
    s = RE_LIQ_TAG.sub(hash_in_block, s)

    s = RE_C_BLOCK.sub(make_repl('liquid 内嵌 /* */'), s)
    s = RE_HTML.sub(make_repl('HTML <!-- -->'), s)
    return tidy(s)


def strip_css(s):
    return tidy(RE_C_BLOCK.sub(make_repl('CSS /* */'), s))


def strip_js(s):
    s = RE_C_BLOCK.sub(make_repl('JS /* */'), s)
    return tidy(RE_JS_LINE.sub(make_repl('JS 整行 //'), s))


def strip_json(s):
    return tidy(RE_C_BLOCK.sub(make_repl('JSON /* */ 头'), s))


def current_branch(path):
    try:
        r = subprocess.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
                           capture_output=True, text=True, cwd=path)
        return r.stdout.strip() if r.returncode == 0 else None
    except OSError:
        return None


def main():
    branch = current_branch(ROOT)
    if APPLY and not FORCE and not (branch and branch.startswith('release/')):
        sys.exit(
            f'拒绝在 `{branch or "非 git 目录"}` 上执行 --apply。\n'
            '注释是主线上的项目记忆：要么切到 release/* 分支，'
            '要么显式加 --force（tools/package-theme.sh 会这么做，因为它操作的是临时副本）。'
        )

    liquid, css, js, json = collect(ROOT)
    targets = ([(f, strip_liquid) for f in liquid]
               + [(f, strip_css) for f in css]
               + [(f, strip_js) for f in js]
               + [(f, strip_json) for f in json])

    changed = 0
    for f, fn in targets:
        try:
            s = open(f, encoding='utf-8').read()
        except OSError as e:
            print('READ FAIL', f, e)
            continue
        out = fn(s)
        if out != s:
            changed += 1
            if APPLY:
                open(f, 'w', encoding='utf-8').write(out)

    print('模式:', 'APPLY' if APPLY else 'DRY-RUN', '| 根:', ROOT, '| 分支:', branch or '(非 git)')
    print('处理文件:', len(targets), '| 有变化:', changed)
    for k, (n, b) in sorted(stat.items(), key=lambda x: -x[1][1]):
        print('  %-22s %5d 处  %7.1f KB' % (k, n, b / 1024))
    print('  合计移除 %.1f KB' % (sum(b for _, b in stat.values()) / 1024))
    if APPLY:
        print('\n下一步：shopify theme check / node --check assets/*.js / '
              '打包后 python3 tools/verify-package.py <zip>')


if __name__ == '__main__':
    main()
