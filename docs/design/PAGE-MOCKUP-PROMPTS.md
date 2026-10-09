# Coppice 页面设计图 AI 生图工单（PAGE-MOCKUP-PROMPTS）

> **性质**：用 AI 图像工具生成**每个模板页面设计图**的逐页工单——每页含内容结构（区块自上而下）与可直接复制的生图提示词。
> **权威关系**：内容结构以 `dev-docs/pages-ui.md`（SDD v4.2 页面视角重组）为参照；视觉方向遵循 SDD §4.4（现代电商式 + 参数区保留工程化呈现）；品牌遵循 SDD §9.1（虚拟品牌 Northbark）。
> **提示词哲学**：**只锁底线，不锁细节。** 每条提示词自包含三层——项目背景 → 页面身份与职责 → 核心模块清单；布局比例、配图内容、装饰细节、卡片数量等**交给生图工具发挥**。画面文字本来就不进实现，精确数值无意义，锚值仅作可选参考。
> **设计稿边界**（SDD §4.4）：产出是**方向稿 + 开发参考稿**——不是上架素材、不是令牌来源、不是验收依据。
> 创建日期：2026-10-08（同日改版：放开限制，自包含三段式） ｜ 覆盖：13 个页面 + 全局外壳

---

## 0. 使用规则（每页通用，读一次）

1. **拼接方式**：每条页面提示词 = **§0.1 项目背景前缀（原样复制）** + 该页提示词。前缀负责"我们在做什么项目"；页面段负责"这是哪一页、它要干什么"；模块清单负责"画面里必须有谁"。
2. **比例**：桌面图 16:9；移动图 9:16 或 3:4。除注明"桌面/移动结构相同"的页面外，每页出双端两张。
3. **发挥空间**：提示词只约束**区块的存在与先后关系**。区块的具体形态（几张卡、图怎么拍、留白多少、组件圆角深浅、配图是草坪还是车库场景）由生图工具自定——出图多样是好事，不是偏差。
4. **文字不可信**：AI 出图里的正文/参数值是乱码近似，**只看布局与区块关系，不抄画面文字**；实际文案一律走 `locales/`。
5. **仅有的两条硬线**（其余全部放开）：① 画面不得出现真实品牌 logo / 商标（Honda、Deere、Husqvarna、Stihl 等）；② 整体保持浅色现代电商观感，参数/数据区不做成软绵绵的营销卡片（这是本主题的差异化，丢了方向就不对）。
6. **归档**：出图存 `docs/design/mockups/<template>-<desktop|mobile>.png`；每张在 §15 台账补一行。设计稿不进 `asset-provenance.md`（那是演示店上架素材台账）。

### 0.1 项目背景前缀 STYLE-BASE（每条提示词开头原样拼接）

```text
You are illustrating a page design mockup for "Coppice" — a vertical e-commerce
theme built for outdoor power equipment stores (lawn mowers, chainsaws, string
trimmers). The demo store, fictional brand "Northbark", sells gas and battery
powered machines plus recurring consumables (blades, oils, filters, batteries) to
North American homeowners. Visual direction: modern e-commerce — light warm
background, generous whitespace, large real-world product photography, one
restrained forest-green accent — EXCEPT spec and data areas, which keep a precise,
engineering-like feel (clean tables, spec chips, thin rules). Module order matters;
everything else — exact proportions, photo subjects, decorative details — is yours
to decide creatively. Flat crisp UI rendering, no real trademarks anywhere.
```

### 0.2 负面提示词 NEGATIVE（工具支持时附加）

```text
no real brand logos or trademarks (Honda, John Deere, Husqvarna, Stihl), no
watermark, no dark theme, no walls of garbled long text
```

### 0.3 可选内容锚（取用随意，不取也可自拟合理示意值）

| 锚 | 值 | 说明 |
| --- | --- | --- |
| 走步汽油款 | Northbark NB-21P · 21 in. · 166 cc | 想要具体型号感时可用 |
| 骑乘旗舰 | Northbark NB-42Z · 42 in. · zero-turn | "大件"场景可用 |
| 电池款 | Northbark NB-21BS · 40V | 电池平台场景可用 |
| 平台卡阵容 | 40V / 80V / Gas Series | 首页与集合列表页的平台卡可从这三张里取；想画 4–5 张也行 |

---

## 1. 全局外壳 `header-group` + `footer-group`

**内容结构**（每页顶部/底部复用）：

- 顶部：公告栏横幅 → 导航行（LOGO ｜ 三个下拉菜单 ｜ 搜索框 ｜ 账户 ｜ 购物车）
- 底部：链接列组（售后 / 耗材分类 / 联系）→ Newsletter 订阅 → 国家/货币/语言选择 → 社交 + 支付图标

```text
Page: the global page shell (header + footer) reused on every page of the store.
Core content: top — a slim dismissible announcement banner, then the nav row with
logo, three dropdown menus (Shop, Shop by Platform, Support), a search field,
account and cart icons. Bottom — a footer with link columns (support & warranty,
consumable parts, contact), an email newsletter form, a country/currency/language
selector, social and payment icons.
```

**底线**：账户与购物车入口在桌面和移动导航里都可见。

---

## 2. `index.json` — 首页

**内容结构**：header → **Hero 大图 + CTA**（LCP）→ **Shop by Platform 平台入口卡**（电池电压 + 汽油系列，含工具数）→ **按用途图文分区**（小院 / 大草坪等，导向对应集合）→ **精选集合商品卡网格**（卡上带少量参数 + 对比勾选）→ 选购指南博客卡 → footer。

```text
Page: the homepage — its job is to give visitors two fast ways in: shop by product
category, or shop by battery/gas platform, within seconds.
Core content: a full-width hero with a mower in a real lawn scene and one clear CTA;
a row of platform entry cards (battery voltages and a gas series, each with a tool
count); two or three alternating image-text use-case bands (small yard, large
lawn...); a featured product grid whose cards carry a couple of small spec chips and
a compare checkbox; a row of buying-guide blog cards.
```

**底线**：平台卡是"入口"不是装饰（能看出点进去是一组机器）；商品卡带参数条 + 对比勾选。

---

## 3. `product.json` — 产品页（主题灵魂页之一）

**内容结构**：header → 媒体画廊 ｜ 信息栏（H1、价、变体、数量、加购 + 加速结账、分期横幅、自提）→ 物流徽标条 → 平台兼容条 → 规格速览卡（图标 + 值）→ "Add to compare" → 耗材复购区 → 完整规格表 → 互补推荐 ｜ 相关推荐 ｜ 描述 → footer。

```text
Page: the product page — the soul of this theme. A mower is a spec-heavy machine,
so the page's job is to make its specifications scannable, comparable and
trustworthy, and to set delivery expectations for big items.
Core content: media gallery beside a buying column (title, price, variants, add to
cart, accelerated checkout, financing hint); below, a logistics badge strip (parcel
vs freight, liftgate, lead time); a battery-platform compatibility strip; a grid of
spec quick-view tiles with icons and precise values; an "add to compare" control; a
consumables area with its own quick-add buttons; then the full spec table and
related-product carousels.
```

**底线**：规格速览的"图标 + 值"工程感（本主题脸面）；物流徽标条；耗材区有独立加购。

---

## 4. `collection.json` — 集合页

**内容结构**：header → 标题 + 横幅图 → 筛选（动力源 / 操作方式 / 适用面积 / 电池平台 / 价格等）｜ 已选标签行 + 排序 + 计数 → **商品卡网格**（图 + 价 + 2–3 项参数 + 对比勾选）→ 分页 → footer。

```text
Page: the collection page — its job is to funnel a wide catalog down to a handful
of candidates through faceted filtering.
Core content: a banner with the collection title; a filter sidebar with groups like
power source, operation type, area coverage, battery platform and price; above the
grid, removable active-filter tags plus a sort dropdown and result count; the main
area is a product card grid where each card shows photo, price, a few compact spec
chips and a compare checkbox; pagination at the bottom.
```

**底线**：已选标签行（可逐个移除）；商品卡带参数——不是纯图文卡。

---

## 5. `list-collections.json` — 集合列表页

**内容结构**：header → H1 全部系列 → 平台大卡网格（图 + 介绍 + 工具数 + 热销缩略）→ footer。

```text
Page: the collections index — the landing page for "shop by platform" navigation.
Core content: a page title, then large platform cards (battery voltages, gas
series), each with photo background, short intro, tool count, and a few tiny
bestseller thumbnails. Imagery-forward, quiet layout.
```

**底线**：平台卡要能感到"这是一个机器家族"，不是普通分类链接。

---

## 6. `page.json` — 通用内容页

**内容结构**：header → 标题 + 富文本内容流（桌面限宽 ~720px）→ footer。

```text
Page: a generic content page (e.g. a static buying guide).
Core content: single centered reading column — title, paragraphs, an inline image
with caption, a link and a button. Calm editorial layout.
```

**底线**：无（普通内容流即可）。

---

## 7. `page.compare.json` — 对比页（主题灵魂页之二）

**内容结构**：header → H1 组标题 + 选型文案 → **对比表**（首列参数名，每款一列：缩略图 + 型号；差异值高亮，相同行可折叠）→ 覆盖范围说明条（可选）→ footer + 底部悬浮对比栏。

```text
Page: the product comparison page — the second soul of this theme, where 2-4
machines are compared side by side in one dense, engineering-grade table.
Core content: a heading with two sentences of buying guidance; a wide comparison
table — parameter names down the first column (power source, cutting width, engine,
weight...), each machine as a column headed by a thumbnail and model name, differing
values subtly highlighted, identical rows collapsed; below, a floating compare bar
with thumbnails and a green "Compare (n)" button. Table-first, precise, quietly
confident.
```

**底线**：是**表**不是卡片墙；底部悬浮对比栏出现。

---

## 8. `blog.json` — 博客列表

**内容结构**：header → 博客标题 → 文章卡网格（图 / 标题 / 摘要 / 日期）→ 分页 → footer。

```text
Page: the blog index — buying guides and maintenance tutorials.
Core content: blog title, then a card grid of articles with landscape photos,
titles, short excerpts and dates. Editorial, spacious.
```

**底线**：无特殊要求。

---

## 9. `article.json` — 文章页

**内容结构**：header → 标题 / 日期 → 单列正文（含图、表格）→ 相关文章 → footer。

```text
Page: an article page — a maintenance guide or buying guide with real substance
(tables, photos).
Core content: a single reading column with title, date, paragraphs, an inline photo,
maybe a maintenance-interval table; related articles below. Clean editorial
typography.
```

**底线**：无特殊要求。

---

## 10. `cart.json` — 购物车

**内容结构**：header → H1 → 顶部物流汇总条（含超大件时）→ 行项（图 + 价 + 行级物流提示 + 数量步进 + 移除；订阅计划若有）→ 耗材补充横滑 → 小计 / 折扣 / 合计 → 加速结账 + 结账 → footer。

```text
Page: the cart — its job is to set delivery expectations up front (a riding mower
ships freight, not parcel) and to nudge consumable add-ons.
Core content: heading with item count; a slim summary banner about oversized-item
delivery; line items each with photo, price, quantity stepper, and a small freight/
lead-time badge where relevant; a horizontal consumables suggestion strip; subtotal,
discount field, total; accelerated checkout plus a green checkout button. Logistics
info as small engineering badges, not marketing banners.
```

**底线**：行级物流提示用"徽标"语言（与产品页物流条同族）。

---

## 11. `search.json` — 搜索页

**内容结构**：header（含搜索框）→ 搜索词 + 结果计数 → 筛选侧栏（同集合页）→ 商品结果网格 → 页面/文章结果分组 → footer。

```text
Page: search results — visually consistent with the collection page.
Core content: the query and result count; a filter sidebar like the collection
page; product result cards with spec chips and compare checkboxes; below, a
grouped list of matching pages and articles as simple text results.
```

**底线**：与集合页共用卡片语言（一眼同族）。

---

## 12. `404.json` — 错误页

**内容结构**：header → "页面不存在" + 404 → 搜索框 → 用途入口卡 → [回首页] → footer。桌面/移动结构相同。

```text
Page: the 404 page — its job is to route a lost visitor back into the funnel by
use-case.
Core content: centered "404" moment, a short apologetic line, a search input, a few
small category entry cards (walk-behind, riding, chainsaw...), and a back-to-home
button. Minimal and friendly.
```

**底线**：入口卡导向用途集合（不是死链接堆砌）。

---

## 13. `gift_card.liquid` — 礼品卡

**内容结构**：header → 礼品卡卡面（品牌卡面 + 余额）+ 大尺寸二维码 + 到期日/适用店 → [打印] [加入钱包] → footer。

```text
Page: the gift card page.
Core content: a beautifully designed physical card visual (dark forest-green face
with subtle pattern, brand wordmark, balance), a clearly visible QR code, expiry
line, and quiet "print" / "add to wallet" buttons. Premium and restrained. The QR
code should be rendered generously large — it is a scannability requirement.
```

**底线**：二维码画面上要明显大（≥120px 的审核硬约束）。

---

## 14. `password.json` — 密码页

**内容结构**：无 header/footer——居中单屏：LOGO → 开店预告文案 → 密码输入 + [进入] → 错误提示位 → Newsletter（可选）→ 社交图标。

```text
Page: the password / coming-soon page — a single centered screen shown before the
store opens.
Core content: centered logo, a one-line teaser, a password input with an enter
button, optionally a newsletter signup and social icons. Extremely minimal, no
navigation, no footer.
```

**底线**：独立布局（不带全站 header/footer）。

---

## 15. 出图台账

> 每出一张补一行；重出不另起行，改"重出"列。设计稿不入 `asset-provenance.md`。

| 页面 | 端 | 文件 | 工具 | 日期 | 重出 |
| --- | --- | --- | --- | --- | --- |
| （待补） | | | | | |

---

## 16. 维护规则

- `pages-ui.md` 页面结构变更 → 同步对应页的"内容结构"段与提示词中模块清单（只列区块，不加参数级细节）。
- T2.1 令牌定稿 → 只改 §0.1 风格前缀（强调色、底色），逐页提示词不动。
- 出图如果某页连续翻车（区块缺失/方向不对），优先在该页提示词里**加一句描述**补强，而不是收紧成参数级规格——收紧会杀掉多样性和发挥空间。
- SDD §4.4 视觉方向变更 → 改 §0.1 与 §0.2，全量重出受影响页。
