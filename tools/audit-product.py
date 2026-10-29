#!/usr/bin/env python3
"""产品页整页结构 / 无障碍体检（T-4.1 的自动化部分）。

用法：python3 tools/audit-product.py [handle]
依赖：本机 `shopify theme dev` 在 127.0.0.1:9292，且 /tmp/jars.txt 存着店铺密码 cookie。
"""
import http.cookiejar
import re
import sys
import urllib.request

BASE = "http://127.0.0.1:9292"
HANDLE = sys.argv[1] if len(sys.argv) > 1 else "northbark-nb-21p"

jar = http.cookiejar.MozillaCookieJar("/tmp/jars.txt")
try:
    jar.load(ignore_discard=True, ignore_expires=True)
except Exception:
    pass
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
html = opener.open(f"{BASE}/products/{HANDLE}", timeout=45).read().decode("utf-8", "ignore")

# 只体检内容区：页头页脚是既有实现，不归本清单
start = html.find('class="main-product"')
start = html.rfind("<section", 0, start) if start >= 0 else 0
end = html.find("</footer>", start)
block = html[start:end] if end > 0 else html[start:]

# 真正的 id 属性（`data-section-id` 里的 "id=" 不算）
IDS = re.compile(r'(?<![\w-])id="([^"]+)"')
ids = IDS.findall(block)
dupes = sorted({i for i in ids if ids.count(i) > 1})

IMGS = re.findall(r"<img\b[^>]*>", block)
no_alt = [tag for tag in IMGS if not re.search(r"\salt=", tag)]


def form_depth(fragment):
    """用栈判定 form 嵌套：峰值 > 1 才是真的套娃。

    不能只写 `<form[\\s\\S]*?<form` —— 那会把「前一个 form 已闭合、后面又开一个」
    误判成嵌套（本页 supplies 卡各自的表单就是这样被误报过一次）。
    """
    depth = 0
    peak = 0
    for m in re.finditer(r"<(/?)form\b", fragment):
        if m.group(1) == "":
            depth += 1
            peak = max(peak, depth)
        else:
            depth -= 1
    return peak, depth


peak, final_depth = form_depth(block)
BTN_NO_TYPE = re.compile(r"<button(?![^>]*\btype=)[^>]*>")
buttons_no_type = BTN_NO_TYPE.findall(block)

h1_count = len(re.findall(r"<h1[\s>]", html))
print(f"页面：/products/{HANDLE}（内容区 {len(block)} 字节）")
print(f"  h1 数量（全页）      : {h1_count}  → 应为 1")
print(f"  form 数量            : {len(re.findall(r'<form[\s>]', block))}")
print(f"  form 嵌套峰值 / 收尾 : {peak} / {final_depth}  → 峰值应为 1、收尾应为 0")
print(f"  重复 id              : {dupes or '无'}")
print(f"  img 总数 / 缺 alt    : {len(IMGS)} / {len(no_alt)}")
print(f"  aria-live 区域       : {len(re.findall(r'aria-live=', block))}")
print(f"  aria-pressed 按钮    : {len(re.findall(r'aria-pressed=', block))}")
print(f"  正 tabindex          : {re.findall(r'tabindex=\"[1-9]', block) or '无'}")
print(f"  无 type 的 button    : {len(buttons_no_type)}")
print(f"  lazy / eager 图      : {block.count('loading=\"lazy\"')} / {block.count('loading=\"eager\"')}")
print(f"  fetchpriority=high   : {block.count('fetchpriority=\"high\"')}")
print(f"  懒加载媒体 template  : {block.count('<template>')}")

bad = []
if h1_count != 1:
    bad.append("h1 数量不为 1")
if peak > 1 or final_depth != 0:
    bad.append("form 结构异常（嵌套或未闭合）")
if dupes:
    bad.append(f"重复 id: {dupes}")
if no_alt:
    bad.append(f"{len(no_alt)} 张图缺 alt")
if re.findall(r'tabindex="[1-9]', block):
    bad.append("存在正 tabindex")
if buttons_no_type:
    bad.append(f"{len(buttons_no_type)} 个 button 缺 type")

print("\n结论：", "全部通过" if not bad else "需修 → " + "；".join(bad))
