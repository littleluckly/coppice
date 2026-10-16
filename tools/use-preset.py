#!/usr/bin/env python3
"""本地切换 theme preset —— 不联网、不开主题编辑器。

原理
----
真正决定店铺渲染的只有 config/settings_data.json 的 `current`。
`presets` 只是候选方案。编辑器里「主题设置 → 主题风格」下拉做的唯一一件事，
就是把某个 preset 的值写进 current。所以本地直接改 current 等价，
而且不用等编辑器、不用 push。

用法
----
    python3 tools/use-preset.py --list            列出全部 preset 与当前激活项
    python3 tools/use-preset.py "Coppice Noir"    切到该 preset
    python3 tools/use-preset.py "Coppice Noir" -n 只预演，不落盘

保留范围
--------
切换只覆盖 settings_schema.json 里定义过的 theme settings（Shopify 称为
presentational settings）。current 中的 content_for_index / blocks /
sections 会原样保留 —— 所以 app embed（如 judge.me）不会被清掉。
这与官方对 preset 切换的定义一致。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "config" / "settings_data.json"
SCHEMA = ROOT / "config" / "settings_schema.json"

HEADER = """/*
 * ------------------------------------------------------------
 * IMPORTANT: The contents of this file are auto-generated.
 *
 * This file may be updated by the Shopify admin theme editor
 * or related systems. Please exercise caution as any changes
 * made to this file may be overwritten.
 * ------------------------------------------------------------
 */
"""

# 浅色 preset 里骨架三色为什么必须显式写空串，写回时注回文件。
SKELETON_NOTE = """      /* 显式置空（= 沿用上方全局色）。必须写出来：color 设置清空后
         存 ""，Liquid 侧返回 blank 并被 `| default:` 回落。而切换 preset 时
         Shopify 只把 preset 的值更新进 current，不会删除 preset 里缺席的键——
         不写的话，从 Coppice Noir 切回浅色会残留 #0F1012，页头页脚仍是黑的。 */
"""


def load(path: Path) -> dict:
    """读 JSON。容忍 Shopify 风格的块注释（任意位置）与尾随逗号。"""
    raw = path.read_text(encoding="utf-8")
    body = re.sub(r"/\*.*?\*/", "", raw, flags=re.S)
    body = re.sub(r",(\s*[}\]])", r"\1", body)  # 容忍尾随逗号
    return json.loads(body)


def schema_ids() -> list[str]:
    """settings_schema.json 中定义过的全部 setting id（即 presentational 键）。"""
    ids: list[str] = []
    for block in load(SCHEMA):
        for setting in block.get("settings", []):
            if "id" in setting:
                ids.append(setting["id"])
    return ids


def describe(preset: dict, ids: list[str]) -> str:
    bg = preset.get("skeleton_background_color") or ""
    if bg:
        return f"深色骨架 (骨架底色 {bg})"
    return "浅色骨架 (骨架跟随全局色)"


def detect(data: dict, ids: list[str]) -> tuple[str | None, dict]:
    """推断 current 当前对应哪个 preset。

    返回 (preset 名 或 None 或 '自定义', current 中实际存在的 setting 键值对)。
    注意：current 里没有的键无从判断，所以这里是宽松匹配。
    """
    id_set = set(ids)
    live = {k: v for k, v in data["current"].items() if k in id_set}
    if not live:
        return None, live

    for name, preset in (data.get("presets") or {}).items():
        if all(preset.get(k) == v for k, v in live.items()):
            return name, live

    return "自定义", live


def cmd_list(data: dict, ids: list[str]) -> int:
    active, live = detect(data, ids)
    print(f"settings_schema.json 共定义 {len(ids)} 个 theme setting\n")

    print("presets:")
    for name, preset in (data.get("presets") or {}).items():
        covered = len(set(preset) & set(ids))
        mark = " <- 当前" if name == active else ""
        warn = "" if covered == len(ids) else f"  [!] 仅覆盖 {covered}/{len(ids)} 个键"
        print(f"  - {name:<16} {describe(preset, ids)}{warn}{mark}")

    print("\ncurrent:")
    if not live:
        print("  (无 theme setting 键 —— 全部走 settings_schema.json 的默认值)")
        print("  提示：此时渲染结果等于默认值，不一定是某个 preset。")
    else:
        print(f"  已写入 {len(live)} 个键，匹配：{active}")
        for key in sorted(live):
            print(f"    {key} = {live[key]!r}")

    print("\n用法：python3 tools/use-preset.py \"<preset 名>\"")
    return 0


def cmd_activate(data: dict, ids: list[str], name: str, dry_run: bool) -> int:
    presets = data.get("presets") or {}
    if name not in presets:
        print(f"错误：没有名为 {name!r} 的 preset", file=sys.stderr)
        print("可用：" + "、".join(presets) if presets else "可用：（无）", file=sys.stderr)
        return 2

    id_set = set(ids)
    preset = presets[name]

    # 保留 current 中不是 theme setting 的键（content_for_index / blocks / ...）
    preserved = {k: v for k, v in data["current"].items() if k not in id_set}

    missing = sorted(id_set - set(preset))
    if missing:
        print(f"警告：preset {name!r} 未覆盖 {len(missing)} 个 setting，"
              f"切换后这些键会沿用 current 里的旧值：", file=sys.stderr)
        for key in missing:
            print(f"    {key}", file=sys.stderr)
        print(file=sys.stderr)

    new_current = dict(preserved)
    new_current.update(preset)
    data["current"] = new_current

    if dry_run:
        print(f"[预演] 将切到 {name!r} —— {describe(preset, ids)}")
        print(f"  保留的非设置键：{sorted(preserved) or '（无）'}")
        print(f"  写入设置键：{len(preset)} 个")
        return 0

    body = json.dumps(data, indent=2, ensure_ascii=False)
    # json.dumps 会丢掉注释，这里把说明注回浅色 preset 的骨架键上方
    body = body.replace(
        '      "skeleton_background_color": "",',
        SKELETON_NOTE + '      "skeleton_background_color": "",',
    )
    DATA.write_text(HEADER + body + "\n", encoding="utf-8")
    print(f"已切到 {name!r} —— {describe(preset, ids)}")
    print(f"  写入 {len(preset)} 个设置键，保留 {sorted(preserved) or '（无）'} 不动")
    print(f"  文件：{DATA.relative_to(ROOT)}")
    print("\n下一步：若正在跑 shopify theme dev，保存后浏览器会自动热重载；"
          "要让线上主题也用这套，需 push。")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="本地切换 theme preset（改 config/settings_data.json 的 current）")
    parser.add_argument("preset", nargs="?", help="要切换到的 preset 名，如 \"Coppice Noir\"")
    parser.add_argument("--list", action="store_true", help="列出 preset 与当前激活项")
    parser.add_argument("-n", "--dry-run", action="store_true", help="只预演，不写文件")
    args = parser.parse_args()

    if not DATA.exists():
        print(f"找不到 {DATA}", file=sys.stderr)
        return 1

    ids = schema_ids()
    data = load(DATA)

    if args.list or not args.preset:
        return cmd_list(data, ids)

    return cmd_activate(data, ids, args.preset, args.dry_run)


if __name__ == "__main__":
    raise SystemExit(main())
