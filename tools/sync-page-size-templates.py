#!/usr/bin/env python3
"""
把 templates/list-collections.json 的 sections.main 同步到三份档位副本。

背景（别改成"只同步 per_page"）：
  集合列表页的「每页系列数」顾客可切，靠的是 alternate template ——
  ?view=12 → templates/list-collections.12.json，section 里用 template.suffix 反查。
  后缀对应的文件不存在时 Shopify **静默回落默认模板且 suffix 变空**（实测），
  三档因此各需要一个副本文件；而副本的 settings 是独立一份 ——
  商家在编辑器里改了主模板的标题 / 列数 / 描述开关，副本不会跟着变，
  切档后就会看到另一套文案。这个脚本就是消掉这个漂移的。

用法：
  python3 tools/sync-page-size-templates.py          # 同步并报告
  python3 tools/sync-page-size-templates.py --check  # 只报告差异，有差异退出码 1

同步口径：settings 与 blocks 整体从主模板复制；type / order 也跟随主模板。
副本里刻意保留的差异只有一处（模板文件名里的后缀本身），不要往副本塞别的东西。
"""

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TPL = ROOT / "templates"
MASTER = TPL / "list-collections.json"
SUFFIXES = ("12", "24", "48")


def read(path):
    # Shopify 后台 / theme dev 会往模板 JSON 头部写一段 /* ... */ 说明，
    # 那不是合法 JSON —— 解析前先剥掉，否则这里永远报 "Expecting value"。
    raw = re.sub(r"/\*.*?\*/", "", path.read_text(encoding="utf-8"), flags=re.S)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise SystemExit("✗ %s 不是合法 JSON：%s" % (path.name, exc))


def sync_one(path, ref_section):
    data = read(path)
    sections = data.setdefault("sections", {})
    section = sections.setdefault("main", {})
    before = json.dumps(section, sort_keys=True, ensure_ascii=False)

    section["type"] = ref_section.get("type", "collections")
    section["settings"] = json.loads(json.dumps(ref_section.get("settings", {})))
    if "blocks" in ref_section:
        section["blocks"] = json.loads(json.dumps(ref_section["blocks"]))
    else:
        section.pop("blocks", None)

    after = json.dumps(section, sort_keys=True, ensure_ascii=False)
    return data, before != after


def main(argv):
    check_only = "--check" in argv
    master = read(MASTER)
    ref_section = master.get("sections", {}).get("main")
    if ref_section is None:
        raise SystemExit("✗ 主模板 %s 里没有 sections.main" % MASTER.name)

    drift = 0
    missing = 0
    for suffix in SUFFIXES:
        path = TPL / ("list-collections.%s.json" % suffix)
        if not path.exists():
            print("✗ 缺少 %s —— ?view=%s 会静默回落默认模板，该档位失效" % (path.name, suffix))
            missing += 1
            continue
        data, changed = sync_one(path, ref_section)
        if changed:
            drift += 1
            if check_only:
                print("≠ %s 与主模板不一致" % path.name)
            else:
                path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                                encoding="utf-8")
                print("✓ %s 已同步" % path.name)
        else:
            print("· %s 已一致" % path.name)

    if missing:
        return 1
    if check_only and drift:
        print("\n有 %d 份副本与主模板不一致 —— 跑一次不带 --check 的同步。" % drift)
        return 1
    print("\n完成：%d 份写盘，%d 份本来就一致。" % (0 if check_only else drift, len(SUFFIXES) - drift))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
