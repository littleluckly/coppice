#!/usr/bin/env python3
"""
检查 section/snippet 的 HTML 标签是否配对（theme check 的本地补充）。

为什么需要它：theme check 的 LiquidHTMLSyntaxError 靠 Liquid 解析器判断，
Agent 侧跑不了 CLI（沙箱不可见）。本脚本做**近似**检查，用于改动后自查。

⚠️ 已知的不可靠点（务必知道，否则会误判）：
  1. 必须先剥掉 {% comment %} 块与所有 {% %} 标签——否则注释里提到的
     <dialog>、<template> 等标签名会被当成真实标签计入（已踩坑 4 次）。
  2. 剥离 Liquid 后，属性值里的 > 会打断标签解析，例如
     {{ 'icon.svg' | inline_asset_content }} 之类。属性里含 > 时可能误报"多余 </a>"。
  3. 条件渲染块（{% if %} 内含标签）会被当成必然输出，配对可能仍然平衡，
     但不代表运行时正确。

结论优先级：theme check > 本脚本 > 肉眼。本脚本只用于"快速发现明显缺口"。

用法：
  python3 tools/check-tag-balance.py [文件路径...]
  不带参数则检查 sections/ 与 snippets/ 全部 .liquid
退出码：0 = 全部平衡，1 = 有未闭合。
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
        "param", "source", "track", "wbr", "path", "circle", "rect"}


def strip_liquid(src: str) -> str:
    # 1) 先删 Liquid 注释块（{% comment %} ... {% endcomment %}，含 {%- -%} 变体）
    src = re.sub(r"\{%-?\s*comment\s*-?%\}.*?\{%-?\s*endcomment\s*-?%\}", "", src, flags=re.S)
    # 2) 再删 HTML 注释（<!-- ... -->）——同样会提到标签名
    src = re.sub(r"<!--.*?-->", "", src, flags=re.S)
    # 3) 删除完整配对的 Liquid 块（{% stylesheet %}…{% endstylesheet %} 等）。
    #    必须配对删除：非贪婪的单标签正则遇到未闭合的 {% stylesheet %} 时会一路
    #    吞到文件末尾，把后面真正要检查的标记吃掉。
    for opener, closer in (("stylesheet", "endstylesheet"),
                           ("javascript", "endjavascript"),
                           ("schema", "endschema")):
        pattern = r"\{%-?\s*" + opener + r"\s*-?%\}.*?\{%-?\s*" + closer + r"\s*-?%\}"
        src = re.sub(pattern, "", src, flags=re.S)
    # 4) 剩余的 Liquid 标签（含未配对的）一律按单标签删除
    src = re.sub(r"\{%.*?%\}", "", src, flags=re.S)
    return src


def neutralise_attributes(src: str) -> str:
    """
    清掉开标签属性里的内容，但保留标签名与 < > 分隔。

    为什么：属性值可能含 > （如 aria-label 里的一句英文、data-note="a > b"）。
    标签正则遇到第一个 > 就截断，后面的 </a> 就成了"孤立项" → 假警报。
    先把属性整段替换成空格，配对逻辑不受影响。
    """
    def repl(m):
        tag = m.group(2)
        return f"<{m.group(1)}{tag} {(' ' * 4)}>"

    return re.sub(r"<(/?)([a-zA-Z][\w-]*)([^>]*?)>", repl, src)


def check(path: Path) -> list[str]:
    raw = path.read_text(encoding="utf-8")
    # 只检查 markup 区（{% stylesheet %} 之前的部分）
    idx = raw.find("{% stylesheet %}")
    body = raw[:idx] if idx > 0 else raw
    body = strip_liquid(body)
    body = neutralise_attributes(body)

    stack: list[tuple[str, int]] = []
    errors: list[str] = []

    for lineno, line in enumerate(body.split("\n"), 1):
        for m in re.finditer(r"<(/?)([a-zA-Z][\w-]*)([^>]*)>", line):
            closing, tag, rest = m.group(1), m.group(2), m.group(3)
            if tag.lower() in VOID or rest.rstrip().endswith("/"):
                continue
            if closing:
                if stack and stack[-1][0] == tag:
                    stack.pop()
                elif any(t == tag for t, _ in stack):
                    while stack and stack.pop()[0] != tag:
                        pass
                    errors.append(f"L{lineno}: </{tag}> 配对失败（多标签同行时可能误报）")
                else:
                    errors.append(f"L{lineno}: 多余 </{tag}>")
            else:
                stack.append((tag, lineno))

    for tag, lineno in stack:
        errors.append(f"L{lineno}: <{tag}> 未闭合")
    return errors


def rel(path: Path) -> str:
    """相对仓库根显示；传入的路径可能已经是相对的。"""
    try:
        return str(path.resolve().relative_to(ROOT))
    except ValueError:
        return str(path)


def main() -> int:
    if len(sys.argv) > 1:
        files = [Path(a) for a in sys.argv[1:]]
    else:
        files = sorted(list((ROOT / "sections").glob("*.liquid"))
                       + list((ROOT / "snippets").glob("*.liquid")))

    total = 0
    for f in files:
        if not f.exists():
            print(f"跳过（不存在）：{f}")
            continue
        errs = check(f)
        if errs:
            total += len(errs)
            print(f"✗ {rel(f)}")
            for e in errs:
                print(f"    {e}")

    if total == 0:
        print(f"✓ {len(files)} 个文件标签全部平衡")
        return 0
    print(f"\n共 {total} 处疑似问题（属性里的 > 可能造成误报，以 theme check 为准）")
    return 1


if __name__ == "__main__":
    sys.exit(main())
