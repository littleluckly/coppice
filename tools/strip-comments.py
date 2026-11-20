#!/usr/bin/env python3
"""剥离主题代码注释，用于生成提交用的主题包。

用法（必须在 release/* 分支上）：
    python3 tools/strip-comments.py            # 预演，只统计
    python3 tools/strip-comments.py --apply    # 写盘

只动 7 个主题目录里的文件，不碰 dev-docs/ tools/。

安全边界：
- JS 的**行内** `//` 一律不删 —— 字符串里的 `'https://…'` 含 `//`，正则删除必出错。
  只删块注释 `/* */` 与"独占一整行的 `//`"。
- Liquid 的 `{% comment %}` 整块删除（含标签），块内内容本来就不输出。
- 删除后压缩连续空行、去行尾空白；这三步都会改变行号，但不动代码语义。

删完必须验证（缺一不可）：
    shopify theme check
    node --check assets/*.js
    git diff 逐行核对：删除行是否都是注释、新增行是否只是"代码去掉行尾注释"
    真渲染一次（推送到测试店，看 console 错误与关键元素）
"""
import re
import subprocess
import sys
import glob

APPLY = '--apply' in sys.argv

LIQUID = (glob.glob('sections/*.liquid') + glob.glob('snippets/*.liquid')
          + glob.glob('blocks/*.liquid') + glob.glob('layout/*.liquid')
          # templates/ 下只有一个 gift_card.liquid，第一版漏了它，
          # 包内残留 10 处注释（2026-11-20 复扫才发现）
          + glob.glob('templates/*.liquid'))
CSS = glob.glob('assets/*.css')
JS = glob.glob('assets/*.js')
JSON = glob.glob('templates/*.json') + glob.glob('config/*.json') + glob.glob('sections/*.json')

RE_LIQ_BLOCK = re.compile(r'\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}', re.S)
RE_LIQ_HASH = re.compile(r'\{%-?\s*#(?:[^%]|%(?!\}))*?-?%\}')
# `{% liquid %}` 块内以 # 开头的行是注释（Liquid 官方语法）。
# 注意它**没有 endliquid**，到第一个 %} 结束——第一版按 endliquid 写导致漏扫 87 行。
RE_LIQ_TAG = re.compile(r'(\{%-?\s*liquid\b)(.*?)(-?%\})', re.S)
# `{% doc %}…{% enddoc %}` 是组件文档，不输出，一并删
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

    # {% liquid %} 块内逐行删 # 注释（必须在 {% # %} 之后：前者是标签，后者是块内行）
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


def main():
    branch = subprocess.run(['git', 'branch', '--show-current'],
                            capture_output=True, text=True).stdout.strip()
    if APPLY and not branch.startswith('release/'):
        sys.exit(f'拒绝在分支 `{branch}` 上执行 --apply。'
                 f'先 git checkout -b release/package，注释是主线上的项目记忆。')

    targets = ([(f, strip_liquid) for f in LIQUID]
               + [(f, strip_css) for f in CSS]
               + [(f, strip_js) for f in JS]
               + [(f, strip_json) for f in JSON])

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

    print('模式:', 'APPLY' if APPLY else 'DRY-RUN', '| 分支:', branch or '(detached)')
    print('处理文件:', len(targets), '| 有变化:', changed)
    for k, (n, b) in sorted(stat.items(), key=lambda x: -x[1][1]):
        print('  %-22s %5d 处  %7.1f KB' % (k, n, b / 1024))
    print('  合计移除 %.1f KB' % (sum(b for _, b in stat.values()) / 1024))
    if APPLY:
        # 自检：本脚本按扩展名清单扫，漏掉一类文件就会像 2026-11-20 那样
        # 把 templates/gift_card.liquid 的注释带进包。打完包必须用下面的命令
        # 对**整个包**再扫一遍，那才是权威判据。
        print('\n下一步：')
        print('  1) shopify theme check')
        print('  2) node --check assets/*.js')
        print('  3) git diff 核对删除行是否都是注释')
        print('  4) 打包后全包扫描（必须为空）：')
        print('     unzip -q -d /tmp/pkgchk Coppice-*.zip && \\')
        print('     grep -rlE "\\{%-? *comment|/\\*" --include="*.liquid" '
              '--include="*.css" --include="*.js" /tmp/pkgchk')


if __name__ == '__main__':
    main()
