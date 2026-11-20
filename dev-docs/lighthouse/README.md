# Lighthouse 实测数据与读法

> **性质**：验收证据归档 + 读法说明。`*.json` 是 Lighthouse 原始输出，**不要手改**。
> **最后更新**：2026-11-20（新增 benchmark 店数据 + BUG-081 修复前后对比）
> **验收线**（SDD §8.1 / §8.2 / 官方 Theme Store 要求）：Performance 三页双端平均 **≥ 60 准入 / ≥ 80 目标**；Accessibility **≥ 90 准入 / ≥ 95 目标**；LCP < 2.5s、INP < 200ms、CLS < 0.1。

---

## 1. 两条测试路径，用途不同

| | **benchmark 店**（官方口径） | 演示店（内容口径） |
| --- | --- | --- |
| 店铺 | `coppice-benchmark-b0qhynch.myshopify.com` | `coppice-gizo4hzt.myshopify.com` |
| 数据 | 官方 benchmark CSV：2000 商品 / 2000 图 / 20 集合 | 我们自己的 OPE 商品 + AI 图 |
| 用途 | **验收分数以这里为准** | 看真实商家观感（规格表、对比工具、平台卡） |
| 局限 | 无 `spec.*` metafield ⇒ OPE 专属模块走空态 | Shop Pay 预加载 + 演示图会拉低移动端分 |
| 文件 | `bench-*.json` | `home-*.json` / `product-*.json` / `collection-*.json` |

官方原文（Theme Store requirements §6）：

> "Themes must have a minimum average Lighthouse performance score of **60** across the theme's product, collection, and home page, for both desktop and mobile. Tests are run using a benchmark dataset."

**提交时不需要上传任何 Lighthouse 报告**——审核方自己用 benchmark 环境测。这里的数据是给我们自己提前发现问题用的。

---

## 2. 当前数据

### 2.1 benchmark 店（2026-11-20，Lighthouse 13.6.0）

| 页面 | 移动 | 桌面 | LCP（移动/桌面） | CLS（移动） |
| --- | --- | --- | --- | --- |
| 首页 `/` | **93** | 94 | 2.8s / 1.4s | 0.001 |
| 产品页 `/products/amazing-ice-sunglasses-collection20` | **97** | 96 | 2.2s / 1.2s | 0 |
| 集合页 `/collections/collection1` | **98** | 95 | 2.3s / 1.4s | 0 |

**平均：移动 96.0、桌面 95.0**；Accessibility 双端 98.2。

> 集合页移动端**修复前是 71 分 / CLS 0.339**，见 §5。`bench-collection-mobile.json` 已经是修复后的版本。

### 2.2 演示店（2026-11-19，对照用）

| 页面 | 移动 | 桌面 |
| --- | --- | --- |
| 首页 | 75 | 95 |
| 产品页 | 81 | 100 |
| 集合页 | 83 | 98 |

移动平均 79.7。**同一套代码在 benchmark 店是 96**——差距来自演示店的 Shop Pay 预加载（首页 113 个 `checkout-web` 请求）和 1.1 MB 的演示图，不是主题退化。

> `home-mobile.json`（42 分 / TBT 1230ms）与 `home-desktop.json` 作废：那两次撞上了开发店的 `perf-kit` 性能探针（脚本执行累计 3708ms），主题代码里 `grep` 不到它。保留文件只为追溯差异。

---

## 3. 怎么读这份数据

### 3.1 报告的 LCP 是模拟值，实测值在另一个字段

```
observedLargestContentfulPaint   1430 ms   ← 浏览器真实测量
largestContentfulPaint            5464 ms   ← lantern 按网络图推算（打分用这个）
```

首页那 62 KB 的 hero 图 1282ms 开始下载、1371ms 完成、priority High，`lcp-discovery-insight` 三项全绿——标记是对的，模拟值高是因为 lantern 把 349 个请求排进队列。

### 3.2 首页的图是齐的，LCP 落在 hero 图上

主题包里的 hero 图原本是 `shopify://shop_images/…`（演示店资源）。benchmark 店上传了同名文件后，这些引用**自动解析成功**——跑分时 4 张背景图 + 4 张产品岛图全部加载（62 KB / 118 KB / 91 KB…），LCP 元素就是首屏那张 `banner-bg`。

所以首页 93 分是**有效数据**，不是上限估计。

> 2026-11-20 曾误判为"hero 无图、分数偏乐观"，原因是检查脚本用了 `<img[^>]{0,200}>` 这种带长度上限的正则，真实标签因 srcset 超长而匹配不到。见 BUG-082。

### 3.3 TTFB 受测试者网络位置影响

从中国大陆测美国 edge，`server-response-time` 900ms 量级，直接吃掉模拟 LCP 的三分之一。换美国网络环境测会明显更低。

---

## 4. 哪些扣分不必追

| 审计项 | 归属 | 结论 |
| --- | --- | --- |
| `third-party-cookies` / `inspector-issues`（Cookie） | 平台（`cdn/wpm/`、`shop.app` 账户） | 主题无权控制 |
| `unused-javascript` 39 KB | `cdn/wpm/`（web pixels） | 同上 |
| `page-prevented-bfcache` | 平台 analytics | 同上 |
| `unused-css-rules` 18 KB | **主题**（`compiled_assets/styles.css`） | 单页测量必然把别的断点算作未用；收益小于维护成本，不改 |

Best Practices 三页稳定在 73，扣分全部来自上面两条平台项，不是代码问题。

---

## 5. 已通过这套数据抓到并修掉的问题

**BUG-081：移动端集合页/搜索页 CLS 0.34**

- 现象：集合页移动端 CLS 0.339、Perf 71
- 根因：`assets/facets.css` 用 `[data-facets-ready]` 控制"筛选表单移入抽屉后隐藏"，而这个属性由组件 `connectedCallback` 写入，**晚于首帧** ⇒ 首帧表单占 397px，就绪后消失，下方内容上跳
- 证据：puppeteer 抓到 `div.collection__content` 在 2838ms 从 `y=656,h=259` 变成 `y=259,h=656`
- 修复：门控换成 `html.js`（`<head>` 内联脚本在首次绘制前加），同时把 `.facets__form-slot` 的 20px 内边距也改挂 `html.js`
- 结果：CLS 0.339 → **0**，Perf 71 → **98**；禁 JS 复测表单仍 `display:block`、高 378px（渐进增强未破）

---

## 6. 复现步骤

### 6.1 benchmark 店（推荐）

两个开发店都有密码墙，`?preview_theme_id=` 和主域名对匿名请求都会被 302 到 `/password`。用 storefront cookie 绕过：

```bash
# 1) 换 cookie（每次测之前跑一遍，Shopify 会轮换）
curl -s -D /tmp/bm.txt -o /dev/null \
  -X POST "https://coppice-benchmark-b0qhynch.myshopify.com/password" \
  --data-urlencode "form_type=storefront_password" \
  --data-urlencode "utf8=✓" \
  --data-urlencode "password=<benchmark 店 storefront 密码>"

CK=$(grep -i "^set-cookie: _shopify_essential" /tmp/bm.txt \
     | sed 's/^[Ss]et-[Cc]ookie: //' | cut -d';' -f1)

# 2) 自检：必须 200，302 说明 cookie 没拿到
curl -s -o /dev/null -w "%{http_code}\n" -H "Cookie: $CK" \
  "https://coppice-benchmark-b0qhynch.myshopify.com/"

# 3) 测（移动端默认；桌面加 --preset=desktop）
npx lighthouse "https://coppice-benchmark-b0qhynch.myshopify.com/collections/collection1" \
  --extra-headers="{\"Cookie\":\"$CK\"}" \
  --output=json --output-path=dev-docs/lighthouse/bench-collection-mobile.json \
  --chrome-flags="--headless=new --no-sandbox" --quiet
```

密码不入库（仓库是 public）。改完代码要先推到店里才生效——用 `shopify.theme.toml` 里配好的环境，别手打 `--store`（少一个参数就会落到演示店）：

```bash
shopify theme push -e benchmark \
  --only assets/facets.css --only sections/collection.liquid --allow-live
```

`benchmark` 环境指向 `#191882166593`（benchmark 店已发布的那个主题），演示店是 `-e coppice`。

### 6.2 演示店

同 §6.1，把域名与密码换掉即可。

### 6.3 不要用这两个

- `http://127.0.0.1:9292`（`theme dev` 本地代理）：资源路径被改写成 `/cdn/s/files/…/assets/x.js?v=`，与生产不是同一套；分数方向不可控
- `?preview_theme_id=…`：只认后台会话，匿名 302

---

## 7. 结论

- **benchmark 店**：移动 96.0 / 桌面 95.0，双端都远超 80 目标；A11y 98.2；CLS 全 0。三页的 LCP 元素都是真实图片（hero 图 / 商品主图 / 商品卡图），不是退化成文字测出来的。
- **演示店**：移动 79.7，是店铺配置（Shop Pay 预加载 + 1.1 MB 演示图）造成的，不代表主题。
- **两套环境的结论别混用**：验收看 benchmark，观感看演示店。

**复测策略**：每次改动后至少跑 `bench-collection-mobile` + `bench-product-mobile`。若分数掉，先看 `observedLargestContentfulPaint` 与 `layout-shifts`——只涨模拟值不动实测值，说明是注入变了不是主题退化；CLS 涨了则一定是布局问题，用 puppeteer 抓 `PerformanceObserver` 的 `sources`（`previousRect` vs `currentRect`）定位，别靠猜。
