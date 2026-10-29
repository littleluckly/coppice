#!/usr/bin/env python3
"""产品页全量冒烟（T-2.x 全部模块）。

用法：python3 tools/smoke-product.py
依赖：本机正在运行 `shopify theme dev`（默认 127.0.0.1:9292），且 /tmp/jars.txt 已存店铺密码 cookie。
"""
import http.cookiejar
import re
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:9292"

jar = http.cookiejar.MozillaCookieJar("/tmp/jars.txt")
try:
    jar.load(ignore_discard=True, ignore_expires=True)
except Exception:
    pass
OPENER = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def get(path):
    return OPENER.open(BASE + path, timeout=45).read().decode("utf-8", "ignore")


def text_of(fragment):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", fragment)).strip()


def section_ids(html):
    return dict(re.findall(r'class="([a-z-]+)"[^>]*data-section-id="([^"]+)"', html))


CASES = [
    ("/collections/mower-popular/products/northbark-nb-21p", "汽油机（有耗材）"),
    ("/products/northbark-nb-21bs", "电池机 40V（有耗材）"),
    ("/products/northbark-nb-c16g", "链锯（无耗材 → 走 complementary）"),
    ("/products/northbark-nb-bl21", "配件（无分组无耗材）"),
]

for path, label in CASES:
    html = get(path)
    print("=" * 78)
    print(f"【{label}】{path}")

    # 面包屑
    bc = re.search(r'<nav class="main-product__breadcrumb".*?</nav>', html, re.S)
    print("  面包屑     :", text_of(bc.group(0)) if bc else "（无）")

    # 信息卡带
    cards = re.findall(r'<li\s[^>]*class="product-highlights__card[^"]*"[^>]*>(.*?)</li>', html, re.S)
    card_titles = [text_of(re.search(r"<h3[^>]*>(.*?)</h3>", c, re.S).group(1)) for c in cards if re.search(r"<h3", c, re.S)]
    print("  信息卡     :", card_titles or "（无）")
    qv_rows = re.findall(r'<dt class="spec-quickview__label">\s*(.*?)\s*</dt>\s*<dd class="spec-quickview__value">\s*(.*?)\s*</dd>', html, re.S)
    print("  速览参数   :", [f"{text_of(k)}={text_of(v)}" for k, v in qv_rows] or "（无）")

    # 锚点条
    anchors = re.findall(r'data-anchor="([^"]+)"', html)
    print("  锚点条     :", anchors or "（无）")

    # 描述 / 规格表 / 耗材 / 推荐
    print("  描述段     :", "有" if 'id="product-overview"' in html else "无")
    spec_rows = re.findall(r'<th class="product-spec-table__label"[^>]*>\s*(.*?)\s*</th>\s*<td class="product-spec-table__value">\s*(.*?)\s*</td>', html, re.S)
    print("  规格表行数 :", len(spec_rows))
    print("  规格表内容 :", [f"{text_of(k)}={text_of(v)}" for k, v in spec_rows][:12])

    supplies = re.findall(r'class="product-supplies__title"[^>]*>(.*?)</a>', html, re.S)
    print("  耗材卡     :", [text_of(x) for x in supplies] or "（无）")
    bundle = re.search(r'class="product-supplies__bundle-button"[^>]*>\s*(.*?)\s*</button>', html, re.S)
    print("  批量加购   :", text_of(bundle.group(1)) if bundle else "（不出现，N≤1 或未挂耗材）")
    print("  complementary 容器:", "有" if "data-intent=\"complementary\"" in html else "无")

    # 推荐接口实测（服务端渲染回包）
    ids = section_ids(html)
    rec_id = next((v for k, v in ids.items() if k == "product-recommendations"), None)
    handle = path.rsplit("/products/", 1)[-1].split("?")[0]
    try:
        prod_id = re.search(r'"id":\s*(\d+)', get(f"/products/{handle}.js"))
    except Exception:
        prod_id = None
    if rec_id:
        for intent in ("related", "complementary"):
            url = (
                "/recommendations/products?section_id=" + urllib.parse.quote(rec_id)
                + "&product_id=" + (prod_id.group(1) if prod_id else "")
                + "&limit=4&intent=" + intent
            )
            try:
                frag = get(url)
                n = len(re.findall(r'class="product-card"', frag))
                print(f"  推荐[{intent:13}]: {n} 张卡")
            except Exception as exc:
                print(f"  推荐[{intent:13}]: 请求失败 {exc}")
    print()
