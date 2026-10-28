#!/usr/bin/env python3
"""
gen-accessory-images.py — 用即梦（火山方舟 Seedream）API 批量生成配件图候选。

════════ 为什么是这个形状 ════════

数据流（唯一出口在台账，不另建提示词副本）：

    docs/demo-store/asset-provenance.md §4c
            │  解析表格 → {文件名, 提示词, alt, 状态}
            ▼
    ┌─ 每条调用 N 次 ────────────────────────────┐
    │ POST ark .../images/generations            │  文生图，白底
    │   watermark: false      ← 必须显式关       │
    │   output_format: png                       │
    └────────────────┬───────────────────────────┘
                     ▼  下载（url 24h 有效）
                 raw/v1.png … vN.png            白底原图，留档
                     ▼  rembg 抠图
                 cut/v1.png …                  透明 PNG
                     ▼  按 alpha 裁边 → 等比缩放 → 居中贴到画布
                 final/v1-<台账文件名>.webp     2048×2048 透明底
                     ▼
              manifest.json + report.md         人工挑图用

════════ 三个必须知道的坑（都踩过或会踩） ════════

1. **watermark 默认 true**。方舟接口不传就是开着的，右下角打「AI生成」标。
   台账 §2 记的第一批翻车（"豆包AI生成"水印）就是这一类。本脚本强制 false。

2. **纯文生图拿不到透明底**。`background: "transparent"` 只支持**图生图**，
   且要求输入的图**本身已带透明通道**。所以「白底直出透明 PNG」这条路不存在，
   必须在本地抠图。（走「先粗抠→再图生图让模型精修边缘」也能通，但模型会顺手
   改形——细长的刀片、锯链最危险，不建议。）

3. **不假设 API 返回尺寸**。`size` 是"分辨率档"（1K/2K/…）不是像素值，
   实际宽高由模型按提示词里的比例推。所以一律在本地归一到 canvas（默认 2048），
   三张配件图在网格里才能看起来一样大。

════════ 用法 ════════

  # 0) 装依赖（只要 PIL；抠图另需 rembg）
  python3 -m venv ~/.venvs/coppice-img
  ~/.venvs/coppice-img/bin/pip install pillow rembg
  # rembg 首次运行会下模型（birefnet-general ≈ 900MB，u2net ≈ 176MB）

  # 1) 先看请求体，不花钱
  ARK_API_KEY=xxx ~/.venvs/coppice-img/bin/python tools/gen-accessory-images.py --dry-run

  # 2) 单款试水，先确认抠图边缘和"刻字"是否翻车（推荐！）
  ARK_API_KEY=xxx python3 tools/gen-accessory-images.py --only nb-bl21 --variants 2

  # 3) 全量：11 款 × 3 版
  ARK_API_KEY=xxx python3 tools/gen-accessory-images.py --variants 3

  # 4) 抠图崩了（锯链最可能）→ 保住白底原图，手工救
  ARK_API_KEY=xxx python3 tools/gen-accessory-images.py --only nb-ch16 --no-rmbg

选图后：改名为台账里的正式文件名 → 上传 Shopify Files → 回填台账 URL
与 build_mower_csv.py 的 IMAGES（second 保持空串）。

════════ 模型与成本（2026-10 查证，价格随官方调整） ════════

  doubao-seedream-5-0-flash-260915   0.12 元/张  2K   默认（批量首选，便宜 5 倍）
  doubao-seedream-5-0-pro-260628     0.60 元/张  2K   重出/精修用（>261 万像素档）
  doubao-seedream-5-0-lite-260128    0.22 元/张  2K/3K/4K
  doubao-seedream-4-5-251128         0.25 元/张  仅 jpeg（别用，抠图要 png）
  doubao-seedream-4-0-250828         0.20 元/张  仅 jpeg

  11 款 × 3 版 × flash ≈ 4 元；× pro ≈ 20 元。
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import random
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import datetime
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LEDGER = ROOT / "docs" / "demo-store" / "asset-provenance.md"
DEFAULT_OUT = ROOT / "dev-docs" / "local-assets" / "accessories"

ARK_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/images/generations"

# 模型能力表 —— 传错参数会直接 4xx，所以按表出参，不硬编码
MODELS = {
    "doubao-seedream-5-0-flash-260915": {
        "sizes": ["1K", "1.5K", "2K"],
        "fmts": ["png", "jpeg"],
        "price_2k": 0.12,
        "note": "批量首选：2K / 0.12 元",
    },
    "doubao-seedream-5-0-pro-260628": {
        "sizes": ["1K", "1.5K", "2K"],
        "fmts": ["png", "jpeg"],
        "price_2k": 0.60,  # 2K 方图 ≈ 419 万像素，落在 >261 万档
        "note": "重出用：2K / 0.60 元；支持 optimize_prompt_options",
        "prompt_opt": True,
    },
    "doubao-seedream-5-0-lite-260128": {
        "sizes": ["2K", "3K", "4K"],
        "fmts": ["png", "jpeg"],
        "price_2k": 0.22,
        "note": "2K / 0.22 元;支持 2048x2048 像素直传",
        "pixel_size": True,
    },
    "doubao-seedream-4-5-251128": {
        "sizes": ["2K", "4K"],
        "fmts": ["jpeg"],
        "price_2k": 0.25,
        "note": "仅 jpeg——抠图链路不要用",
    },
    "doubao-seedream-4-0-250828": {
        "sizes": ["1K", "2K", "4K"],
        "fmts": ["jpeg"],
        "price_2k": 0.20,
        "note": "仅 jpeg——抠图链路不要用",
    },
}
DEFAULT_MODEL = "doubao-seedream-5-0-flash-260915"


# ─────────────────────────── 台账解析 ───────────────────────────


@dataclass
class Item:
    seq: str
    filename: str  # product-accessory-nb-bl21-1-main_rmbg_webp.webp
    prompt: str
    alt: str
    status: str = ""
    variants: list[Path] = field(default_factory=list)

    @property
    def model_key(self) -> str:
        """product-accessory-nb-bl21-1-main_... → nb-bl21

        型号自身含连字符（nb-bl21 / nb-tl095），所以必须锚定到后面的"-序号-"
        再非贪婪回溯；用 `[a-z0-9]+` 会在第一个连字符处截断成 "nb"。
        """
        m = re.search(r"product-accessory-(.+?)-\d+-", self.filename)
        return m.group(1) if m else self.filename


def parse_ledger(path: Path) -> list[Item]:
    """只解析 `## 4c. 配件图台账` 一节里的表格行。

    收窄范围是必要的：§4 / §4b 的表格列结构不同（有的没有 Files URL 列），
    全文正则会把它们一起抓进来。
    """
    text = path.read_text(encoding="utf-8")
    start = text.find("## 4c.")
    if start < 0:
        sys.exit(f"[x] 台账里找不到 `## 4c.` 配件图台账一节：{path}")
    tail = text[start + 4 :]
    end = re.search(r"\n##\s|\n---\s*\n\s*\n##", tail)
    section = tail[: end.start()] if end else tail

    items: list[Item] = []
    for line in section.splitlines():
        line = line.strip()
        if not line.startswith("|") or "product-accessory-" not in line:
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 6:
            print(f"[!] 列数不足，跳过：{line[:60]}…", file=sys.stderr)
            continue
        seq, filename, _url, prompt, alt, status = cells[:6]
        if not prompt or prompt in {"—", "-"}:
            print(f"[!] {filename} 提示词为空，跳过", file=sys.stderr)
            continue
        items.append(Item(seq=seq, filename=filename, prompt=prompt, alt=alt, status=status))

    if not items:
        sys.exit("[x] 4c 一节里没解析到任何配件行——表格格式可能变了")
    return items


# ─────────────────────────── HTTP ───────────────────────────


def _request(req: urllib.request.Request, timeout: int) -> bytes:
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def build_payload(item: Item, args) -> dict:
    cap = MODELS[args.model]
    payload = {
        "model": args.model,
        "prompt": item.prompt,
        "size": args.size,
        "response_format": "url",
        # ↓ 这条是本脚本存在的理由之一：不传就是 true
        "watermark": False,
    }
    fmt = args.format
    if fmt not in cap["fmts"]:
        sys.exit(f"[x] {args.model} 不支持 output_format={fmt}（可选 {cap['fmts']}）")
    payload["output_format"] = fmt
    if cap.get("prompt_opt") and args.fast:
        payload["optimize_prompt_options"] = {"mode": "fast"}
    return payload


def generate(payload: dict, api_key: str, timeout: int = 180, retries: int = 3) -> str:
    """返回图片 URL。对 429/5xx 做指数退避重试；4xx 业务错不重试。"""
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    last = None
    for attempt in range(retries):
        req = urllib.request.Request(
            ARK_ENDPOINT,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )
        try:
            raw = _request(req, timeout)
            data = json.loads(raw)
            return data["data"][0]["url"]
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:400]
            last = f"HTTP {e.code}: {detail}"
            if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(2**attempt + random.random())
                continue
            raise RuntimeError(last) from e
        except (KeyError, IndexError) as e:
            raise RuntimeError(f"返回结构异常：{raw[:400]!r}") from e
        except (urllib.error.URLError, TimeoutError) as e:
            last = f"网络错误：{e}"
            if attempt < retries - 1:
                time.sleep(2**attempt + random.random())
                continue
            raise RuntimeError(last) from e
    raise RuntimeError(last or "未知失败")


def download(url: str, dest: Path, timeout: int = 120) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "coppice-asset-pipeline"})
    dest.write_bytes(_request(req, timeout))
    return dest


# ─────────────────────────── 图像处理 ───────────────────────────

_rembg_session = None


def cutout(png_bytes: bytes, model: str):
    """rembg 抠图。会话复用——每次 new_session 都会重新载模型，慢到无法接受。"""
    global _rembg_session
    try:
        from rembg import new_session, remove
    except ImportError:
        sys.exit(
            "[x] 没装 rembg。装：pip install rembg\n"
            "    或者先跳过抠图：--no-rmbg（保住白底原图，手工救）"
        )
    from PIL import Image

    if _rembg_session is None or getattr(_rembg_session, "_name", None) != model:
        print(f"[i] 载入抠图模型 {model}（首次会下载权重）…", file=sys.stderr)
        _rembg_session = new_session(model)
        _rembg_session._name = model

    src = Image.open(BytesIO(png_bytes)).convert("RGBA")
    out = remove(src, session=_rembg_session, post_process_mask=True)
    if isinstance(out, bytes):
        out = Image.open(BytesIO(out))
    return out.convert("RGBA")


def normalize(img, canvas: int, fill: float, crop_alpha: bool = True):
    """按 alpha 裁掉空白 → 等比缩放到长边 = canvas×fill → 居中贴到正方形透明画布。

    配件是平铺小物件（刀片/导板/锯链/电池），居中即可；不像整机图那样贴底。

    crop_alpha=False 用于 --no-rmbg 的白底图：白底不透明，alpha 全是 255，
    裁边等于没裁，硬裁反而把白底裁出一个洞——所以跳过裁边、整图等比塞进画布。
    """
    from PIL import Image

    if crop_alpha:
        bbox = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
        if bbox:
            img = img.crop(bbox)
    w, h = img.size
    if w == 0 or h == 0:
        raise ValueError("裁边后为空——抠图把主体吃掉了")
    target = int(canvas * fill)
    scale = target / max(w, h)
    img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)

    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    out.paste(img, ((canvas - img.width) // 2, (canvas - img.height) // 2), img)
    return out


def save_webp(img, dest: Path, quality: int) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=quality, method=6)
    return dest.stat().st_size


# ─────────────────────────── 主流程 ───────────────────────────


def out_name(item: Item, variant: int, no_rmbg: bool) -> str:
    """候选文件名 = v{n}-<台账文件名>。

    没抠图时把 `_rmbg_` 换成 `_whitebg_`——不让文件名撒谎，否则过两周没人记得
    这批到底抠没抠。
    """
    name = item.filename
    if no_rmbg:
        name = name.replace("_rmbg_", "_whitebg_")
    return f"v{variant}-{name}"


def run_one(item: Item, variant: int, args, api_key: str) -> dict:
    t0 = time.time()
    payload = build_payload(item, args)
    url = generate(payload, api_key)

    stem = f"{item.model_key}-v{variant}"
    raw = download(url, args.out / "raw" / f"{stem}.{args.format}")
    rec = {
        "model_key": item.model_key,
        "seq": item.seq,
        "source_file": item.filename,
        "variant": variant,
        "prompt": item.prompt,
        "alt": item.alt,
        "raw": str(raw.relative_to(ROOT)),
        "seconds": round(time.time() - t0, 1),
    }

    if args.no_rmbg:
        from PIL import Image

        img = Image.open(raw).convert("RGBA")
        # 白底图不裁边、整图塞满画布，留着让手工救
        final = normalize(img, args.canvas, 1.0, crop_alpha=False)
    else:
        img = cutout(raw.read_bytes(), args.rmbg_model)
        final = normalize(img, args.canvas, args.fill)

    dest = args.out / "final" / out_name(item, variant, args.no_rmbg)
    size = save_webp(final, dest, args.quality)
    rec["final"] = str(dest.relative_to(ROOT))
    rec["bytes"] = size
    rec["seconds"] = round(time.time() - t0, 1)
    return rec


def main() -> int:
    ap = argparse.ArgumentParser(
        description="用即梦（Seedream）API 批量生成配件图候选",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--model", default=DEFAULT_MODEL, choices=list(MODELS))
    ap.add_argument("--size", default="2K", help="分辨率档；模型支持 1K/1.5K/2K（lite 支持 2K/3K/4K）")
    ap.add_argument("--format", default="png", choices=["png", "jpeg"])
    ap.add_argument("--variants", type=int, default=3, help="每款出几版候选（默认 3）")
    ap.add_argument("--only", default="", help="只跑指定型号，逗号分隔，如 nb-bl21,nb-ch16")
    ap.add_argument("--workers", type=int, default=3, help="并发数（官方限流 IPM 500，别超 5）")
    ap.add_argument("--canvas", type=int, default=2048, help="输出画布边长（台账规格 2048）")
    ap.add_argument("--fill", type=float, default=0.86, help="主体长边占画布比例")
    ap.add_argument("--quality", type=int, default=82, help="WebP 质量（台账单张 140–200 KB 对应 80–85）")
    ap.add_argument("--rmbg-model", default="birefnet-general", help="rembg 模型：birefnet-general / isnet-general-use / u2net")
    ap.add_argument("--no-rmbg", action="store_true", help="跳过抠图，只出白底方图（调试/兜底）")
    ap.add_argument("--fast", action="store_true", help="极速提示词优化（仅 pro 生效）")
    ap.add_argument("--dry-run", action="store_true", help="只打印请求体与预估费用，不发请求")
    args = ap.parse_args()

    items = parse_ledger(args.ledger)
    if args.only:
        keep = {s.strip() for s in args.only.split(",") if s.strip()}
        items = [i for i in items if i.model_key in keep]
        if not items:
            sys.exit(f"[x] --only 没匹配到任何行：{args.only}")

    args.out = args.out if args.out.is_absolute() else ROOT / args.out
    total = len(items) * args.variants
    cost = MODELS[args.model]["price_2k"] * total

    print(f"[i] 台账 {args.ledger.name} → {len(items)} 款配件")
    print(f"[i] 模型 {args.model}（{MODELS[args.model]['note']}）· size {args.size} · 每款 {args.variants} 版")
    print(f"[i] 合计 {total} 张，预估 {cost:.2f} 元 → {args.out}")
    if args.no_rmbg:
        print("[!] --no-rmbg：输出为白底方图，文件名改标 _whitebg_")

    if args.dry_run:
        for item in items:
            p = build_payload(item, args)
            print(f"\n── #{item.seq} {item.model_key} ──")
            print(json.dumps(p, ensure_ascii=False, indent=2))
        print(f"\n[i] dry-run 结束，未发请求。去掉 --dry-run 即真跑。")
        return 0

    api_key = os.environ.get("ARK_API_KEY", "").strip()
    if not api_key:
        sys.exit("[x] 缺 ARK_API_KEY。控制台：https://ark.volcengine.com/region:cn-beijing/apikey")

    jobs = [(item, v) for item in items for v in range(1, args.variants + 1)]
    records, failures = [], []

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(run_one, it, v, args, api_key): (it, v) for it, v in jobs}
        for fut in as_completed(futures):
            item, v = futures[fut]
            try:
                rec = fut.result()
                records.append(rec)
                print(f"  ✓ {item.model_key} v{v}  {rec['seconds']}s  {rec['bytes'] // 1024} KB")
            except Exception as e:  # noqa: BLE001 —— 单张失败不该拖垮整批
                failures.append({"model_key": item.model_key, "variant": v, "error": str(e)})
                print(f"  ✗ {item.model_key} v{v}  {e}", file=sys.stderr)

    records.sort(key=lambda r: (int(r["seq"]), r["variant"]))
    manifest = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "model": args.model,
        "size": args.size,
        "format": args.format,
        "canvas": args.canvas,
        "fill": args.fill,
        "rmbg": not args.no_rmbg,
        "rmbg_model": None if args.no_rmbg else args.rmbg_model,
        "ledger": str(args.ledger.relative_to(ROOT)),
        "candidates": records,
        "failures": failures,
    }
    manifest_path = args.out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    # 人肉挑图用的速查表
    lines = [
        f"# 配件图候选 — {manifest['generated_at']}",
        "",
        f"模型 `{args.model}` · size {args.size} · 画布 {args.canvas} · 抠图 {'否' if args.no_rmbg else args.rmbg_model}",
        "",
        "| # | 型号 | 候选文件 | 大小 | 耗时 | 定稿（勾） |",
        "| -- | --- | --- | --- | --- | --- |",
    ]
    for r in records:
        lines.append(
            f"| {r['seq']} | {r['model_key']} | `{Path(r['final']).name}` | "
            f"{r['bytes'] // 1024} KB | {r['seconds']}s | ☐ |"
        )
    if failures:
        lines += ["", "## 失败", ""]
        lines += [f"- {f['model_key']} v{f['variant']}：{f['error']}" for f in failures]
    lines += [
        "",
        "> 挑定后：改名为台账里的正式文件名（去掉 `v1-` 前缀）→ 上传 Shopify Files",
        "> → 回填 `asset-provenance.md` §4c 的 URL 与状态 → 回填 `build_mower_csv.py` 的 `IMAGES`。",
    ]
    (args.out / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"\n[i] manifest: {manifest_path.relative_to(ROOT)}")
    print(f"[i] 挑图表:   {(args.out / 'report.md').relative_to(ROOT)}")
    if failures:
        print(f"[!] {len(failures)} 张失败，详见 manifest.failures", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
