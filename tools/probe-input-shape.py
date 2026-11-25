#!/usr/bin/env python3
"""输入框形状 / 聚焦态探针（2026-11-24：全站输入框向搜索抽屉看齐）。

为什么不用 --dump-dom：`:focus-visible` 是 UA 的启发式状态，脚本里的 `el.focus()`
在无头模式下**不会**让它命中（实测 13 条全红，边框仍是灰的）。项目里已经有
同样的教训（tools/probe-faq-autoplay.py：桩里不会移动焦点）。所以这里走
真 Chrome + CDP，用键盘 Tab 真实移动焦点，再读 getComputedStyle。

断言三件事：
  1) border-radius：单行 = 999px（胶囊），多行 = 1rem
  2) 聚焦后 border-color 与 box-shadow 都是期望色（主题色 / 错误态红）
  3) 控件自身 outline 为 0 —— 默认焦点框不许露出来（2026-11-24 购物车数量框
     那个黑方框就是这么来的：它比输入框还大，还溢出胶囊上下沿）

依赖：`pip3 install websocket-client`（本机已验证）
用法：`python3 tools/probe-input-shape.py [--shot x.png]`
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

import websocket

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 9788
PROFILE = "/tmp/coppice-input-probe-profile"

LIQUID_SOURCES = [
    "sections/contact-form.liquid",
    "sections/footer.liquid",
    "sections/article.liquid",
    "sections/blog.liquid",
    "sections/search.liquid",
    "sections/password.liquid",
    "sections/cart-lines.liquid",
    "sections/main-product.liquid",
    "sections/search-drawer.liquid",
]
PLAIN_SOURCES = ["assets/facets.css", "assets/cart-line.css", "assets/product-card.css"]

QTY_INNER = ('<button class="%s" type="button">−</button>'
             '<input class="%s" type="number" value="2">'
             '<button class="%s" type="button">+</button>')

# name, markup, shape_sel（形状/焦点环所在元素；None=控件自身）, 期望圆角,
# 期望环色(brand|sale), focus_sel（要 Tab 到的目标元素；None=容器内首个 input）
CASES = [
    ("contact-input", '<input class="contact__input" type="text">', None, "999px"),
    ("contact-textarea", '<textarea class="contact__input contact__textarea"></textarea>', None, "16px"),
    ("footer-newsletter", '<input class="footer__newsletter-input" type="email">', None, "999px"),
    ("blog-newsletter", '<div class="blog-index__newsletter-field"><input class="blog-index__newsletter-input" type="email"></div>', ".blog-index__newsletter-field", "999px"),
    ("article-input", '<div class="article__field"><input type="text"></div>', None, "999px"),
    ("article-textarea", '<div class="article__field"><textarea></textarea></div>', None, "16px"),
    ("password-input", '<input class="password__input" type="password">', None, "999px"),
    ("cart-note", '<textarea class="cart-lines__note-input"></textarea>', None, "16px"),
    ("gift-input", '<input class="gift-recipient__input" type="email">', None, "999px"),
    ("gift-textarea", '<textarea class="gift-recipient__input gift-recipient__textarea"></textarea>', None, "16px"),
    ("search-hero", '<search-field class="search-hero__field"><input class="search-hero__input" type="search"></search-field>', ".search-hero__field", "999px"),
    ("search-drawer", '<div class="predictive-search__field"><input class="predictive-search__input" type="search"></div>', ".predictive-search__field", "999px"),
    ("facets-price", '<label class="facets__price-field"><input type="number"></label>', ".facets__price-field", "999px"),
    # 数量步进器：整体一个控件，焦点环在容器上，中间那格不许出现默认焦点框
    ("cart-qty", '<div class="cart-line__qty">' + QTY_INNER % ("cart-line__qty-btn", "cart-line__qty-input", "cart-line__qty-btn") + "</div>",
     ".cart-line__qty", "999px", "brand", ".cart-line__qty-input"),
    ("cart-qty-btn", '<div class="cart-line__qty">' + QTY_INNER % ("cart-line__qty-btn", "cart-line__qty-input", "cart-line__qty-btn") + "</div>",
     ".cart-line__qty", "999px", "brand", ".cart-line__qty-btn"),
    ("product-qty", '<div class="quantity">' + QTY_INNER % ("quantity__button", "quantity__input", "quantity__button") + "</div>",
     ".quantity", "999px", "brand", ".quantity__input"),
    ("quickview-qty", '<div class="quick-view__qty">' + QTY_INNER % ("quick-view__qty-btn", "quick-view__qty-input", "quick-view__qty-btn") + "</div>",
     ".quick-view__qty", "999px", "brand", ".quick-view__qty-input"),
    # 错误态：边框与环一起转红（否则是"绿环套红框"两种信号打架）
    ("contact-invalid", '<input class="contact__input" type="email" aria-invalid="true">', None, "999px", "sale"),
    ("password-invalid", '<input class="password__input" type="password" aria-invalid="true">', None, "999px", "sale"),
    ("article-invalid", '<div class="article__field"><textarea aria-invalid="true"></textarea></div>', None, "16px", "sale"),
]

TOKENS = """<style>
:root {
  --color-brand: #1f6f3f;
  --color-brand-accent: #2a8a4f;
  --color-brand-light: #7fd6a0;
  --color-background: #ffffff;
  --color-foreground: #1a1a1a;
  --color-foreground-muted: #666666;
  --color-sale: #c0392b;
  --color-sale-surface: #fdecea;
  --style-border-radius-inputs: 4px;
  --input-radius: 999px;
  --input-radius-multiline: 1rem;
  --footer-hairline: rgba(26, 26, 26, 0.14);
  --page-margin: 1rem;
}
body { margin: 0; font-family: sans-serif; }
[data-case] { margin: 10px 14px; display: block; }
.case-name { font: 11px/1.4 ui-monospace, monospace; color: #888; margin-block-end: 4px; }
</style>"""

READ_JS = """
(() => {
  const self = document.activeElement;
  const host = self && self.closest ? self.closest('[data-case]') : null;
  if (!host) return null;
  const s = getComputedStyle(self);
  const shapeSel = host.dataset.shape || null;
  const shape = shapeSel ? host.querySelector(shapeSel) : self;
  const sh = getComputedStyle(shape);
  const wantFocus = host.dataset.focus || null;
  return {
    name: host.dataset.case,
    tag: self.tagName,
    isTarget: wantFocus ? self.matches(wantFocus) : true,
    radius: sh.borderTopLeftRadius,
    border: sh.borderTopColor,
    borderWidth: sh.borderTopWidth,
    outlineWidth: s.outlineWidth,
    outlineStyle: s.outlineStyle,
    shadowSelf: s.boxShadow,
    shadowShape: sh.boxShadow,
    focusVisible: self.matches(':focus-visible'),
  };
})()
"""


def extract(liquid):
    rx = re.compile(r"\{%-?\s*stylesheet\s*-?%\}(.*?)\{%-?\s*endstylesheet\s*-?%\}", re.S)
    return "\n".join(rx.findall(liquid))


def build_html():
    chunks = []
    for rel in LIQUID_SOURCES:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
            chunks.append(extract(fh.read()))
    for rel in PLAIN_SOURCES:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
            chunks.append(fh.read())

    body = "\n".join(
        '<div data-case="%s"%s%s><div class="case-name">%s</div>%s</div>'
        % (c[0],
           (' data-shape="%s"' % c[2]) if c[2] else "",
           (' data-focus="%s"' % c[5]) if len(c) > 5 else "",
           c[0], c[1])
        for c in CASES
    )
    return ("<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">"
            + TOKENS + "<style>" + "\n".join(chunks) + "</style></head><body>"
            + body + "</body></html>")


class Browser:
    def __init__(self):
        self.proc = subprocess.Popen(
            [CHROME, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
             "--remote-debugging-port=%d" % PORT, "--user-data-dir=" + PROFILE,
             "--window-size=1440,1600", "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self.seq = 0
        ws_url = None
        for _ in range(60):
            try:
                with urllib.request.urlopen("http://127.0.0.1:%d/json/list" % PORT, timeout=1) as r:
                    pages = [t for t in json.load(r) if t["type"] == "page"]
                if pages:
                    ws_url = pages[0]["webSocketDebuggerUrl"]
                    break
            except Exception:
                time.sleep(0.25)
        if not ws_url:
            raise SystemExit("拿不到 Chrome 调试目标（端口被占？先关掉旧的调试实例）")
        self.ws = websocket.create_connection(ws_url, timeout=30)
        self.call("Runtime.enable")
        self.call("Page.enable")

    def call(self, method, params=None):
        self.seq += 1
        self.ws.send(json.dumps({"id": self.seq, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.seq:
                return msg.get("result", {})

    def js(self, expr):
        r = self.call("Runtime.evaluate", {"expression": expr, "returnByValue": True})
        return r.get("result", {}).get("value")

    def goto(self, url, settle=1.5):
        self.call("Page.navigate", {"url": url})
        time.sleep(settle)

    def tab(self, settle=0.32):
        for kind in ("rawKeyDown", "keyUp"):
            self.call("Input.dispatchKeyEvent",
                      {"type": kind, "key": "Tab", "code": "Tab", "windowsVirtualKeyCode": 9})
        time.sleep(settle)

    def close(self):
        try:
            self.ws.close()
        finally:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except Exception:
                self.proc.kill()


def main():
    import argparse
    import tempfile
    ap = argparse.ArgumentParser()
    ap.add_argument("--shot", metavar="PNG", help="顺便出一张静态截图")
    args = ap.parse_args()

    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(build_html())
    tmp.close()

    if args.shot:
        subprocess.run(
            [CHROME, "--headless=new", "--no-sandbox", "--disable-gpu",
             "--hide-scrollbars", "--window-size=900,1700",
             "--screenshot=" + args.shot, "file://" + tmp.name],
            capture_output=True, text=True)
        print("截图：", args.shot)

    b = Browser()
    seen = {}
    try:
        b.goto("file://" + tmp.name)
        # 全页 Tab：按 DOM 顺序推进，只记录"落在该 case 目标元素上"的那一次
        for _ in range(48):
            b.tab()
            row = b.js(READ_JS)
            if not row or not row.get("isTarget") or row["name"] in seen:
                continue
            seen[row["name"]] = row
            if len(seen) == len(CASES):
                break
    finally:
        b.close()

    fails = 0
    palettes = {
        "brand": re.compile(r"rgba?\(31, 111, 63"),
        "sale": re.compile(r"rgba?\(192, 57, 43"),
    }
    for case in CASES:
        name, want_radius = case[0], case[3]
        want_color = case[4] if len(case) > 4 else "brand"
        row = seen.get(name)
        if not row:
            print("✗ %-18s 焦点没走到这个控件" % name)
            fails += 1
            continue
        want_rx = palettes[want_color]
        ring = row["shadowSelf"] if row["shadowSelf"] != "none" else row["shadowShape"]
        problems = []
        if row["radius"] != want_radius:
            problems.append("圆角 %s ≠ %s" % (row["radius"], want_radius))
        if not row["focusVisible"]:
            problems.append(":focus-visible 未命中")
        if not want_rx.search(ring or ""):
            problems.append("聚焦环颜色不对（%s）" % ring)
        # 只有真画了边框的元素才要求边框变色：填充式输入框（搜索抽屉、
        # 价格区间）border-width 为 0，它们的"框"由 box-shadow 实环表达
        if row["borderWidth"] != "0px" and not want_rx.search(row["border"] or ""):
            problems.append("聚焦时边框没变色（%s）" % row["border"])
        if row["outlineStyle"] != "none" and row["outlineWidth"] != "0px":
            problems.append("控件自身还有默认焦点框（outline %s %s）"
                            % (row["outlineWidth"], row["outlineStyle"]))
        if problems:
            print("✗ %-18s %s" % (name, "；".join(problems)))
            fails += 1
        else:
            print("✓ %-18s radius=%-6s border=%-18s ring=%s"
                  % (name, row["radius"], row["border"], (ring or "")[:40]))

    print("\n%d/%d 通过" % (len(CASES) - fails, len(CASES)))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
