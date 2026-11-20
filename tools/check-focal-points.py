#!/usr/bin/env python3
"""
校验「图片焦点（focal point）」在主题里的生效条件，替代靠印象 grep 的判法（G-05）。

背景（2026-11-19）：
  第一次合规对账用 `grep focal_point` 得到 0 命中，据此把 G-05 记成「完全未实现」——
  这是**误判**。官方机制是：

      用 image_tag 渲染 + 容器 object-fit: cover  ⇒ 有焦点时 image_tag 自动写
      内联 style="object-position: X% Y%"
      （官方 image_tag filter 文档 + theme 开发检查清单「image focal points」双重确认）

  所以「主题有没有实现焦点」不能看主题里有没有 focal_point 字样，要看**有没有绕开 image_tag**：

  A. 含 object-fit: cover 的 liquid 文件里必须出现 image_tag（手写 <img> 拿不到内联焦点）
  B. 每个 <picture> 应配一个 --focal-m 声明（<source> 不能承载 object-position，
     <img> 上带的是桌面图的焦点，移动图焦点只能靠 CSS 变量按断点换回来）
     —— 只作**警告**：object-fit: contain 的图不裁剪，规范明确不必接焦点
        （如 hero 的产品岛：contain + center bottom 是设计对齐，接了反而会被 50% 50% 顶掉）
  C. 不许把 crop 传给 image_url 再接 image_tag（服务端定死裁剪后 object-position 无从生效）

用法：
  python3 tools/check-focal-points.py
退出码：0 = 通过（A/B/C 无违规），1 = 有违规（逐条列出 file:line）。
仅用标准库；所有匹配走 re，不用 shell grep（见 task-compliance.md §0.2 的工具陷阱）。
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCAN_DIRS = ["sections", "snippets", "blocks", "layout"]

COVER = re.compile(r"object-fit:\s*cover", re.I)
IMAGE_TAG = re.compile(r"image_tag")
PICTURE = re.compile(r"<picture\b")
FOCAL_M = re.compile(r"--focal-m\s*:")  # 只算声明，var(--focal-m) 的引用不算
CROP_ARG = re.compile(r"\bcrop\s*:")
FOCAL_POINT = re.compile(r"presentation\.focal_point")
OBJECT_POSITION = re.compile(r"object-position:\s*([^;}\n]+)")
COMMENT_BLOCK = re.compile(r"{%-?\s*comment\s*-?%}.*?{%-?\s*endcomment\s*-?%}", re.S)
DOC_BLOCK = re.compile(r"{%-?\s*doc\s*-?%}.*?{%-?\s*enddoc\s*-?%}", re.S)
# {% stylesheet %} / {% javascript %} 里的 /* */ 注释也会提到 <picture> / object-fit，
# 不抹掉会把注释当代码报违规（脚本第一版就是这么误报的）。
CSS_COMMENT = re.compile(r"/\*.*?\*/", re.S)
OUTPUT_STMT = re.compile(r"\{\{.*?\}\}", re.S)


def liquid_files():
    for d in SCAN_DIRS:
        base = ROOT / d
        if not base.is_dir():
            continue
        for p in sorted(base.rglob("*.liquid")):
            if ".bak-" in p.name:
                continue
            yield p


def blank_out(text: str, pattern: re.Pattern) -> str:
    """把匹配区间抹成等长空白（换行保留），行号因此不变。
    注释里提到 crop / object-fit 不算违规，这一步是为此。"""
    return pattern.sub(lambda m: re.sub(r"[^\n]", " ", m.group(0)), text)


def line_of(text: str, pos: int) -> int:
    return text.count("\n", 0, pos) + 1


def main() -> int:
    violations = []
    warnings = []
    stats = {"cover": 0, "picture": 0, "focal_m": 0, "focal_point": 0, "object_position": 0}
    fallbacks = []

    for path in liquid_files():
        raw = path.read_text(encoding="utf-8")
        # 只抹注释，正文与行号保持原样
        text = blank_out(blank_out(blank_out(raw, COMMENT_BLOCK), DOC_BLOCK), CSS_COMMENT)
        rel = path.relative_to(ROOT)

        covers = list(COVER.finditer(text))
        if covers:
            stats["cover"] += len(covers)
            if not IMAGE_TAG.search(text):
                violations.append(
                    f"{rel}:{line_of(text, covers[0].start())} object-fit: cover 但文件里没有 image_tag"
                    f" —— 手写 <img> 拿不到 image_tag 自动写的 object-position"
                )

        pictures = list(PICTURE.finditer(text))
        focal_ms = list(FOCAL_M.finditer(text))
        stats["picture"] += len(pictures)
        stats["focal_m"] += len(focal_ms)
        # B 按出现顺序配对，缺的进警告：<picture> 里的图若是 contain（不裁剪），不必接焦点
        for idx, m in enumerate(pictures):
            if idx >= len(focal_ms):
                warnings.append(
                    f"{rel}:{line_of(text, m.start())} <picture> 没有配 --focal-m"
                    f"（图若为 object-fit: contain / 保持比例则无需处理）"
                )

        # C 只针对「会走 object-position 的通道」：同一个 {{ … }} 里既有 crop: 又有 image_tag
        # 才是真冲突（例：image_url: width, height, crop | image_tag）。
        # favicon 那种只出 URL、不渲染 <img> 的固定方形裁剪不算——它本来就该居中裁。
        for m in CROP_ARG.finditer(text):
            stmt = next(
                (s for s in OUTPUT_STMT.finditer(text) if s.start() <= m.start() < s.end()),
                None,
            )
            if stmt is None or not IMAGE_TAG.search(stmt.group(0)):
                continue
            violations.append(
                f"{rel}:{line_of(text, m.start())} image_url 传了 crop: 且同一输出里接了 image_tag"
                f" —— 服务端定死裁剪会让 object-position（焦点）失效"
            )

        stats["focal_point"] += len(FOCAL_POINT.findall(text))
        for m in OBJECT_POSITION.finditer(text):
            stats["object_position"] += 1
            fallbacks.append(f"{rel}:{line_of(text, m.start())}  {m.group(1).strip()}")

    # assets/*.css 里的 cover 无法静态判断图片归属（Liquid 侧输出），只做提示
    css_cover = []
    for p in sorted((ROOT / "assets").glob("*.css")):
        t = p.read_text(encoding="utf-8", errors="ignore")
        n = len(COVER.findall(t))
        if n:
            css_cover.append(f"{p.name}（{n} 处）")

    print("== 焦点生效条件检查（G-05）==")
    print(f"liquid 内 object-fit: cover : {stats['cover']} 处")
    print(f"<picture> / --focal-m 声明 : {stats['picture']} / {stats['focal_m']}")
    print(f"presentation.focal_point    : {stats['focal_point']} 处（手写消费，非必需）")
    print(f"object-position 声明        : {stats['object_position']} 处")
    if css_cover:
        print(f"assets/*.css 里的 cover     : {', '.join(css_cover)}（图由 liquid 侧 image_tag 输出，脚本不判）")
    if fallbacks:
        print("\n-- object-position 落点（应全是「无焦点时的设计兜底」）")
        for f in fallbacks:
            print(f"   {f}")

    if warnings:
        print(f"\n! 警告 {len(warnings)} 条（可解释，见文件头 B 条）：")
        for w in warnings:
            print(f"   {w}")

    if violations:
        print(f"\n✗ 违规 {len(violations)} 条：")
        for v in violations:
            print(f"   {v}")
        return 1

    print("\n✓ A/B/C 全部通过：cover 图都走 image_tag、每个 <picture> 都交代了移动图焦点、没有 image_url crop。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
