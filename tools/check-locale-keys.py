#!/usr/bin/env python3
"""
校验所有 Liquid 文件里的 `t:` 翻译键在 locale 文件中是否存在。

背景（BUG-025）：Shopify 有**两个独立的 locale 命名空间**——
  - 正文里的 't:general.foo'    → locales/en.default.json
  - schema 里的 "t:labels.foo"  → locales/en.default.schema.json
写 section 时只查前者就会漏后者，theme check 报 ValidSchemaTranslations。

用法：
  python3 tools/check-locale-keys.py
退出码：0 = 全部存在，1 = 有缺失（并列出缺失清单）。
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCALES = ROOT / "locales"
TARGET_DIRS = ["sections", "snippets", "blocks", "layout"]
# Shopify dev 会给 JSON 加 /* */ 注释头，且 section group 允许尾逗号
COMMENT_HEAD = re.compile(r"^\s*/\*.*?\*/\s*", re.S)
TRAILING_COMMA = re.compile(r",(\s*[}\]])")


def load(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    return json.loads(TRAILING_COMMA.sub(r"\1", COMMENT_HEAD.sub("", raw)))


def dotted_exists(data: dict, dotted: str) -> bool:
    cur = data
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return False
        cur = cur[part]
    return True


def collect_keys(src: str) -> tuple[set[str], set[str]]:
    """
    收集源码里引用的翻译键，分成两组命名空间。

    Shopify 有两套写法，两个命名空间：
      1. {% schema %} 里的 "t:general.foo"        → en.default.schema.json
      2. 正文里的 {{ 'x.y' | t }} 或 {{ 'x.y' | t: k: v }} → en.default.json

    BUG-027 的教训：早期版本只认第 1 种（带 `t:` 前缀），漏掉了第 2 种 ——
    而后者才是正文里的主流写法，导致 accessibility.skip_to_text 缺失
    却没被脚本发现。两种都必须匹配。
    """
    schema_block = re.search(r"\{% schema %\}(.*?)\{% endschema %\}", src, re.S)
    schema_src = schema_block.group(1) if schema_block else ""
    body_src = re.sub(r"\{% schema %\}.*?\{% endschema %\}", "", src, flags=re.S)

    schema_keys = set(re.findall(r'"t:([\w.]+)"', schema_src))

    # 正文两种写法：
    #   {{ 'a.b' | t }}
    #   {{ 'a.b' | t: count: n }}
    #   {% assign x = 'a.b' | t %}
    body_keys = set(re.findall(r"'([\w.]+)'\s*\|\s*t\b", body_src))
    # 带 t: 前缀的正文写法（少见但合法）
    body_keys |= set(re.findall(r"'t:([\w.]+)'\s*\|\s*t\b", body_src))

    return schema_keys, body_keys


def main() -> int:
    front = load(LOCALES / "en.default.json")
    schema = load(LOCALES / "en.default.schema.json")

    missing_front: dict[str, list[str]] = {}
    missing_schema: dict[str, list[str]] = {}

    files = [f for d in TARGET_DIRS for f in (ROOT / d).glob("*.liquid")]

    for path in files:
        src = path.read_text(encoding="utf-8")
        name = path.name

        schema_keys, body_keys = collect_keys(src)

        for key in sorted(body_keys):
            if not dotted_exists(front, key):
                missing_front.setdefault(key, []).append(name)

        for key in sorted(schema_keys):
            if not dotted_exists(schema, key):
                missing_schema.setdefault(key, []).append(name)

    ok = True

    if missing_front:
        ok = False
        print("前台 locale（en.default.json）缺失：")
        for key, where in sorted(missing_front.items()):
            print(f"  t:{key}  ← {', '.join(sorted(set(where)))}")
    else:
        print("前台 locale（en.default.json）：全部命中 ✓")

    if missing_schema:
        ok = False
        print("\nschema locale（en.default.schema.json）缺失：")
        for key, where in sorted(missing_schema.items()):
            print(f"  t:{key}  ← {', '.join(sorted(set(where)))}")
    else:
        print("schema locale（en.default.schema.json）：全部命中 ✓")

    print(f"\n已扫描 {len(files)} 个 .liquid 文件")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
