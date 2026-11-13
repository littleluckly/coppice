# 主题商店合规对账清单 — task-compliance.md

> **性质**：跨页面、跨 section 的**提交前合规对账**（v1.0）。把官方 Theme Store Requirements 的 `must` / `must support` 条款逐条映射到当前主题源码，只记**有证据**的缺口与**明确无法静态验证**的待确认项。
> **权威关系**：功能口径以 `dev-docs/sdd.md` §7.1 为准；本清单只做"官方要求 ↔ 主题现状"的映射，不新增产品决策。修复方案涉及设计取舍时，回填对应页面清单（`task-product.md` / `task-collection.md` / `task-footer.md` 等）。
> **范围**：主题级必填项——section/block 能力、全局设置、模板页面完整性、强制功能落点。
> **不在范围**：各页面清单已覆盖的项（页脚 newsletter / 社交 / 国家语言 → `task-footer.md`；页头菜单与搜索 → `task-header.md`；购物车 → `task-cart.md`；集合页 → `task-collection.md`；产品页主体 → `task-product.md`）。**本清单只在它们漏掉的接缝处补位。**
> **版本**：v1.0 ｜ 2026-11-07 ｜ **不含工期**

---

## 0. 方法与判据

### 0.1 怎么核的

- 逐条读官方 Requirements 原文（`shopify.dev/docs/storefronts/themes/store/requirements`），截取 `must` / `must support` / `should` 三类措辞。
- 对每条在源码里找证据：`grep`、读文件、JSON 解析 `{% schema %}`、脚本全量扫描设置项。
- 结论只分三种：**缺口**（有反证）、**已符合**（有正证）、**待人工确认**（静态查不到，如 Lighthouse / 真机 / 后台配置）。

### 0.2 一个必须写下来的工具陷阱

**本机 `grep` 的 BRE 不支持 `a\|b` 这种多词或。** 第一轮核查里 `grep "payment_button\|additional_checkout_buttons"` 返回空，据此差点把"动态结账缺失"写成拒审级缺口——实际 `sections/main-product.liquid:548` 和 `sections/cart-summary.liquid:84` 都实现了。

**可执行规则**：多词匹配一律 `grep -rnE "a|b"`，或拆成多次单词 `grep`。本清单所有否定结论都用 `-E` 复核过。

### 0.3 严重度定义

| 级别 | 含义 | 判据 |
| --- | --- | --- |
| **S1 拒审级** | 官方 `must`，缺了直接不符合 | 无法用"设计选择"解释 |
| **S2 功能级** | 官方 `must support`，主题有替代路径但功能缺一半 | 能解释，但审查大概率追问 |
| **S3 缺陷级** | 不是条款问题，是代码引用了不存在的东西 | 有明确 bug 特征 |

---

## 1. 缺口总览

| 编号 | 缺口 | 官方条款 | 级别 |
| --- | --- | --- | --- |
| G-01 | 没有 Custom Liquid **section** | *"Themes must include a Custom Liquid section."* | **S1** |
| G-02 | 产品主 section 无 `@app` block | *"Themes must support app blocks (blocks of type `@app`) in the main product section and featured product section."* | **S1** |
| G-03 | 没有 favicon 设置 | *"Must have a favicon setting."* | **S1** |
| G-04 | 礼品卡页没有二维码 | *"Must show a QR code. The minimum size required is 120px x 120px."* | **S1** |
| G-05 | 图片焦点（focal point）未实现 | *"Make sure that your theme supports the focal point of an image."* | **S1** |
| G-06 | `theme_info` 作者与链接仍是 Skeleton 默认 | §Theme info（*"Must have a `theme_info` section"* 已满足，但内容错） | **S1** |
| G-14 | **缺 `page.contact.json` 联系表单模板**（且全站没有联系表单） | *"Themes must support the following templates … `page.contact.json`"* + Page requirements: *"Must include an alternate template for a contact form."* | **S1** |
| G-07 | 搜索页没有分面筛选 | *"You need to support faceted search filtering on collection pages and search pages."* | **S2** |
| G-08 | 集合页商品卡不显示单位价 | *"Unit pricing must be supported on: Collection page / Product page / Cart page."* | **S2** |
| G-09 | 礼品卡商品没有"寄给收件人"字段 | *"Gift card products must have the option to send the card to a recipient."* + `form.email` / `form.name` / `form.message` / `gift_card.send_on` | **S2** |
| G-10 | 没有 Custom Liquid **block** | *"Introduce Custom Liquid blocks into certain sections."* | **S2** |
| G-11 | 密码页没有 logo / `shop.name` | Password page requirements: *"the logo or `shop.name`"* | **S2** |
| G-12 | 产品页无法选择订阅计划 | §Selling plans 只要求购物车**显示**；但选不了 ⇒ 显示逻辑永远是死代码 | **S2** |
| G-13 | 礼品卡模板引用不存在的 `settings.logo` | 非条款问题 | **S3** |

> **G-10 与页脚清单重叠**：`task-footer.md` T-1.10 已规划在页脚加一个 `liquid` block，**能满足 G-10**。两边不重复做，谁先落地谁把这条勾掉。

---

## 2. 逐条详情

### G-01 没有 Custom Liquid section

**官方原文**

> "Themes must include a Custom Liquid section. The section needs to include a setting of type `liquid`, and should be available on all templates that support sections. The Custom Liquid section can act as an insertion point for certain types of apps."

**现状证据**

- `grep -rnE "\"type\": \"liquid\"" sections/ blocks/` → **0 命中**
- `sections/` 下无 `custom-liquid.liquid` 一类文件

**影响**：商家装完主题没有任何地方能粘自定义代码；很多 App 的分发方式就是"复制这段代码粘到主题里"。这条是 `must`，缺了 = 不符合要求。

**做法**

- 新建 `sections/custom-liquid.liquid`：一个 `type: "liquid"` 设置 + `presets`（不写 `presets` 商家在"添加分区"里选不到）
- **不写 `enabled_on`**——写了就限制模板，等于没做
- 输出**不套 `.rte`**：它是商家粘的原始 Liquid，不是富文本

**坑**

- 不要往任何模板的默认内容里塞它（官方禁占位内容，且商家会看到一段来路不明的代码）
- 与 G-10 是两回事：section 能独立加进任意模板，block 只能活在宿主 section 里

---

### G-02 产品主 section 无 `@app` block

**官方原文**

> "Themes must support app blocks (blocks of type `@app`) in the main product section and featured product section."

**现状证据**

- `sections/main-product.liquid` 的 block 类型：`spec_bullets` / `trust_warranty` / `trust_item` / `pickup` / `compare` —— **无 `@app`**
- `grep -rnE "@app" sections/ blocks/ templates/` → **0 命中**

**影响**：App 想在产品页插一块（评价、捆绑、尺码表），主题没有插槽。这是评分表里被反复看的一条。

**做法**：`main-product.liquid` 的 schema 加 `{ "type": "@app" }`，渲染走 `{% render block %}`；`{% if block.type == '@app' %}` 时不要套自己的排版 class。

**待确认**（2026-11-07 已核实）：条款同时点了 *featured product section*，但官方**没有任何"必须包含 featured product section"的要求**——两处提及都是"该 section 存在时须支持 X"的被动条款（富媒体、`@app`）。本主题没有这个 section **不构成缺口**。要不要补一个属于产品决策，见 §6。

---

### G-03 没有 favicon 设置

**官方原文**

> "Must have a favicon setting."

**现状证据**

- `config/settings_schema.json` 解析后**没有任何 `image_picker` 设置**（唯一的资源型设置是 `compare_collections`）
- `layout/theme.liquid` 无 `rel="icon"` / `favicon` 输出

**影响**：商家在主题编辑器里传不了站点图标，只能在后台 Files 里折腾。`must`。

**做法**：全局设置加 `image_picker`（id 用 `favicon`，术语必须是 **favicon**，官方明确禁 "shortcut icon" / "website icon"），`<head>` 输出 32×32 与 180×180 两档。

---

### G-04 礼品卡页没有二维码

**官方原文**

> "Gift Card page requirements: Must support Apple Wallet. Must show a gift card code. Must show a QR code. The minimum size required is 120px x 120px. Must include the logo or `shop.name`."

**现状证据**：`templates/gift_card.liquid` 全文 73 行——余额、有效期、Apple Wallet、卡号、`shop.name` 都有，**唯独没有二维码**。

**影响**：礼品卡是要在收银台扫码核销的，没有二维码等于这张卡在演示店用不了。`must` + 明确尺寸。

**做法**：加二维码，渲染尺寸 ≥ 120×120 CSS px（**别只写 width 属性**，要保证实际渲染尺寸达标）。Apple Wallet 与卡号已符合，不要动。

---

### G-05 图片焦点未实现

**官方原文**

> "Make sure that your theme supports the focal point of an image. Focal points can be set in the theme editor `image_picker` setting, or from the Files page."

**现状证据**

- `grep -rnE "focal_point|presentation" sections/ snippets/ assets/` → **0 命中**
- `snippets/image.liquid` 只用 `image_url: width, height, crop`，`crop` 传的是 `center` 之类的固定值
- 官方 `image_url` 文档：`crop` 只接受 `top` / `center` / `bottom` / `left` / `right` / `region` —— **没有焦点参数**（已核官方文档）

**影响**：商家在后台设的焦点被完全忽略。裁成方形的图（商品卡、hero、集合 banner）会把主体切掉——这正是焦点功能存在的理由。

**做法**：焦点只能靠 CSS 应用——`object-position: {{ image.presentation.focal_point }}`。落点：

- 会裁剪的地方优先（hero、集合 banner、商品卡、产品画廊、博客卡）
- 不裁剪的（`object-fit: contain` 或保持原始比例）**不用改**，改了没效果还增加噪音

**坑**：全站 **24 处直接 `image_tag`** + 5 处 `{% render 'image' %}`，**不要逐个手改**——先收敛到一个输出点（扩 `snippets/image.liquid` 或新建专用 snippet），否则第三份副本出现时就开始漂移（同 BUG-064 的教训）。

---

### G-06 `theme_info` 作者与链接还是 Skeleton 默认

**现状证据**（`config/settings_schema.json`）

```json
"theme_name": "Coppice",
"theme_version": "0.1.0",
"theme_author": "Shopify",
"theme_documentation_url": "https://help.shopify.com/manual/online-store/themes",
"theme_support_url": "https://support.shopify.com/"
```

**影响**：这不是官方逐字条款，但主题信息会直接显示在商家后台，**"作者 Shopify" 是冒充**，且文档/支持链接把商家导去 Shopify 官方帮助而不是本主题。提审必被问。

**做法**：作者改为实际提交方；版本号按真实阶段；文档与支持链接指向真实可达的主题文档（没有就先建一页）。**不要留 Skeleton 默认值。**

---

### G-07 搜索页没有分面筛选

**官方原文**

> "You need to support faceted search filtering on collection pages and search pages."

**现状证据**

- `sections/search.liquid` = **Skeleton 原版 70 行**：一个 `<form>` + 结果列表，无排序、无筛选、无商品卡复用
- `grep -nE "filter|facet" sections/search.liquid` → 0
- `templates/search.json` 只挂 `search` 一个 section
- 对比：集合页 `sections/collection.liquid:82` 有 `{%- if collection.filters.size > 0 -%}`（已符合）

**影响**：集合页符合、搜索页不符合——条款是**并列**的，不是二选一。

**做法**

- 好消息：`snippets/faceted-filters.liquid` **已经是通用件**——它的 `{% doc %}` 写明 `@param {object} filters` 接受 `collection.filters` **或 `search.filters`**（集合页与搜索页共用，2026-10-16 起）。**不需要改这个 snippet。**
- 要补的是搜索页**宿主**：GET 表单 + `{% render 'faceted-filters', filters: search.filters, sort_card: … %}` + 排序卡
- 排序用 `search.sort_options` / `search.sort_by`（官方已核：`search.filters` 返回 `filter` 数组，与 `collection.filters` 同构；`search.sort_options` 提供可选排序）
- 顺带把结果列表换成 `snippets/product-card.liquid`——现在搜索页的自制结果项既没有参数也没有对比勾选，与全站卡片不一致

**坑**：这仍是**页面级重写**（`sections/search.liquid` 是 Skeleton 原版 70 行），不是加两行。表单结构必须与集合页一致（筛选 + 排序一起提交、URL 可分享），否则同一个组件在两种页面上行为会分叉。

---

### G-08 集合页商品卡不显示单位价

**官方原文**

> "Unit pricing must be supported on the following pages: Collection page / Product page / Cart page."

**现状证据**

- 产品页 ✓：`sections/main-product.liquid:420` `current_variant.unit_price_measurement`
- 购物车 ✓：`snippets/cart-line.liquid:218` `item.unit_price_measurement`
- **商品卡 ✗**：`snippets/product-card.liquid` 无 `unit_price`

**影响**：三处要求做两处。部分地区（如欧盟）单位价是法规要求，不是装饰。

**做法**：商品卡在价格下面补一行单位价，取 `card_product.selected_or_first_available_variant.unit_price_measurement`；缺值不渲染（不留空行、不输出 0）。

---

### G-09 礼品卡商品没有"寄给收件人"字段

**官方原文**

> "Gift card products must have the option to send the card to a recipient. The following attributes of the `form` object must be used: `form.email` / `form.name` / `form.message`. The following attribute of the `gift_card` object must be used: `send_on`."

**现状证据**：`grep -rnE "form\.(email|name|message)|send_on" sections/ snippets/` 只命中 `sections/article.liquid` 的评论表单（无关）。

**影响**：礼品卡商品加购时无法填收件人，礼品卡的核心场景断掉。

**做法**：产品表单在 `product.gift_card?` 为真时渲染收件人字段块（收件人姓名 / 邮箱 / 留言 / 送达日期）。字段名必须逐字对齐 `form.email` 等，**拼错就是静默不生效**。

---

### G-10 没有 Custom Liquid block

**官方原文**

> "Introduce Custom Liquid blocks into certain sections. Add a Custom Liquid block anywhere you'd consider adding an app block, because the Custom Liquid block can act as an insertion point for certain types of apps."

**现状证据**：`"type": "liquid"` 全站 0 命中。

**处置**：**与 `task-footer.md` T-1.10 是同一件事**，不要做两遍。落地后把这条勾掉。

---

### G-11 密码页没有 logo / `shop.name`

**官方原文**

> "Password page requirements: the logo or `shop.name`"

**现状证据**：`sections/password.liquid` 全文无 `shop.name`、无 `logo`。

**影响**：密码页显示的是通用标题 + 密码框，顾客看不出这是哪家店。

**做法**：标题上方补 `shop.name`（或 logo）。密码页是 `{% layout none %}` 类独立页，注意不要把主主题的导航结构带进来。

---

### G-12 产品页无法选择订阅计划

**官方原文**（只有购物车）

> "Selected selling plans need to be shown to customers in the cart."

**现状证据**

- 购物车 ✓：`snippets/cart-line.liquid:132` 显示 `selling_plan_allocation.selling_plan.name`
- 产品页 ✗：`sections/main-product.liquid` 无 `selling_plan`

**影响**：严格按字面，这条**算符合**；但产品页选不了计划 ⇒ 购物车那段显示逻辑**永远跑不到**。等于写了一个死分支。审查不一定抓，但这是"实现了却没有路径"的典型。

**做法**：产品页加 selling plan 选择（`product.selling_plan_groups` 单选组），选中的值随加购提交 `selling_plan` id。**优先级低于 S1**，但它决定 G-12 是"真功能"还是"死代码"。

---

### G-13 礼品卡模板引用不存在的 `settings.logo`

**现状证据**

- `templates/gift_card.liquid:41` `{% if settings.logo %}`
- `config/settings_schema.json` **没有任何 `image_picker`**（G-03 已证）⇒ `settings.logo` 永远为 nil

**影响**：条件恒假，永远走 Shopify 内置 `gift-card/card.svg` 兜底。删掉这段不影响渲染，但它是"看起来处理了、实际从没生效"的代码——同类问题排查时非常费时间。

**做法**：两种都行——① 补一个全局 `logo` 设置（顺带让商家能在全局换 logo）；② 删掉分支，直接用兜底图。**2026-11-07 已定：走 ①，做法见 §5.1。**

---

### G-14 缺 `page.contact.json` 联系表单模板

**官方原文**

> "Themes must support the following templates and their formats: … `page.json` / `page.contact.json` / `password.json` …"
>
> Page requirements: "Must include `page.title` / `page.content`. **Must include an alternate template for a contact form.**"

**现状证据**

- `ls templates/` → 13 个文件，**无 `page.contact.json`**
- `grep -rnE "form 'contact'"` → **全站 0 命中**：不是"模板缺了但表单还在别处"，是联系表单压根没实现

**影响**：`page.contact.json` 在官方模板清单里是**逐字列出**的必需项，不是可选加分。商家建"联系我们"页面后没有可用模板，只能把表单硬塞进普通 page（而普通 page 只渲染富文本）。

**做法**

- `sections/contact-form.liquid`：`{% form 'contact' %}` + 姓名 / 邮箱 / 电话 / 留言，提交成功态与错误态（`form.posted_successfully?` / `form.errors`），`aria-live="polite"`
- `templates/page.contact.json`：`main` → 新建 contact section，title/content 照 `page.liquid` 的做法（`.rte` 包裹，BUG-064）
- 注意：表单字段名必须走官方约定（`contact[name]` / `contact[email]` / `contact[body]`），拼错即静默不提交

**坑**：不要用 `{% form 'customer' %}` 顶替——那是订阅，不进商家后台的联系消息列表。

---

## 3. 任务分解

### P1 S1 拒审级（先做这批）

- [ ] **T-1.1** `sections/custom-liquid.liquid`（G-01）· 依赖：无
- [ ] **T-1.2** `main-product.liquid` 补 `@app` block（G-02）· 依赖：无
- [ ] **T-1.3** 全局品牌设置：`favicon` + `logo` / `logo_dark` + 亮度自动选图（G-03 / G-13 / §5.1）· 依赖：无
- [ ] **T-1.4** 礼品卡二维码（G-04）· 依赖：无
- [ ] **T-1.5** 图片焦点：先收敛输出点，再按"会裁剪处"逐个接（G-05）· 依赖：无 · **改动面最大**
- [ ] **T-1.6** `theme_info` 更正（G-06）· 依赖：真实作者名与文档地址
- [ ] **T-1.7** 联系表单 section + `page.contact.json` 模板（G-14）· 依赖：无

### P2 S2 功能级

- [ ] **T-2.1** 搜索页重写：筛选 + 商品卡复用 + 排序（G-07）· 依赖：与 `task-collection.md` 的筛选实现协调
- [ ] **T-2.2** 商品卡单位价（G-08）· 依赖：无
- [ ] **T-2.3** 礼品卡收件人字段（G-09）· 依赖：`main-product` 表单区块结构
- [ ] **T-2.4** 密码页补 `shop.name` / logo（G-11）· 依赖：无
- [ ] **T-2.5** 产品页订阅计划选择器（G-12）· 依赖：T-2.3 同区（都在表单内）

### P3 S3 缺陷与收尾

- [ ] **T-3.1** `gift_card.liquid` 改用全局 logo（G-13，T-1.3 落地后一并接）· 依赖：T-1.3
- [ ] **T-3.2** 复跑本清单的对账脚本（见 §4.2），确认新增缺口为 0

---

## 4. 已符合项（抽样，避免重复核查）

### 4.1 已核通过

| 条款 | 证据 |
| --- | --- |
| JSON 模板覆盖（例外：礼品卡 / 结账 / 账户页） | `templates/` 12 个 JSON + `gift_card.liquid` —— **但缺 `page.contact.json`**，见 G-14 |
| 页眉页脚在 section group 内 | `layout/theme.liquid:65 / 111` |
| 动态结账（产品页 + 购物车，默认开启） | `main-product.liquid:548` `form \| payment_button`；`cart-summary.liquid:84` `content_for_additional_checkout_buttons` |
| Shop Pay 分期 | `main-product.liquid:552` `form \| payment_terms` + `show_payment_terms` 设置 |
| Pickup availability | `pickup-availability.js` + `main-product` 的 `pickup` block |
| 相关推荐 / 互补推荐 | `product-recommendations.liquid`（`intent=related`）+ `product-complementary.liquid` |
| 预测搜索 | `sections/predictive-search.liquid`（`/search/suggest`） |
| 集合页分面筛选 | `collection.liquid:82` `collection.filters.size > 0` |
| 多级菜单 | `main-nav.liquid`（mega 面板） |
| 账户组件 `<shopify-account>` | `snippets/account-entry.liquid:18` |
| 富媒体（3D / 视频 / 外链视频） | `main-product.liquid:150/192/194` |
| 产品页单位价 | `main-product.liquid:420` |
| 购物车单位价 + 订阅计划显示 | `cart-line.liquid:218 / 132` |
| 所有设置都有 `label` | 脚本全量扫描 `sections/` + `blocks/`：**0 缺** |
| 文案无 `&` 符号 | `locales/*.json` 无 `&amp;` |
| 无 `.scss` / 无压缩产物（启发式：<5 行且 >2KB 的文件 0 个） | `find` + 行数/字节比 |
| 无外部 http 资源 | 仅注释里的文档 URL 与 `fonts.shopifycdn.com` preconnect |
| 提交包不含 `robots.txt.liquid` / `config/markets.json` | `ls config/` 仅两个 JSON |
| 未改动 `content_for_header` | `theme.liquid:48` 原样输出 |
| preset 名含主题名 | `hero-slideshow.liquid:1031` `"name": "Coppice"` |
| logo 支持不同宽高比 | `main-nav.liquid:98` 按比例缩放，非固定 40×40 |
| 礼品卡：Apple Wallet / 卡号 / `shop.name` | `gift_card.liquid` |
| 字体用 `font_picker` | `settings_schema.json:18` |

### 4.2 建议固化成脚本

这轮核查里最容易出错的是"多词 grep 漏判"（§0.2）。把否定结论固化成脚本，比下次再手敲一遍可靠：

```
tools/check-compliance.py
  ├─ 检查 "type": "liquid" / "@app" 是否存在
  ├─ 检查 settings_schema.json 是否有 image_picker(favicon)
  ├─ 检查 templates/gift_card.liquid 是否含二维码
  ├─ 检查 focal_point / presentation 是否有消费点
  ├─ 检查 product-card 是否有 unit_price
  └─ 所有 grep 内部用 re 模块，不用 shell
```

---

## 5. 待人工确认（静态查不到）

| 项 | 为什么查不到 | 怎么确认 |
| --- | --- | --- |
| **Lighthouse 性能 / 无障碍** | 需真实渲染 | `shopify theme dev` + Lighthouse，三页双端 |
| **主题名与 Shopify 产品/公司/行业名冲突** | 需比对 Theme Store 在售主题 | 提审前人工查一遍 Theme Store |
| **preset 数量上限（≤5）** | 需数全站 presets | 脚本可数，见 T-3.2 |
| **资源型设置默认值指向的资源是否存在** | 依赖演示店真实数据 | 后台逐项点开 |
| **RTL 实测** | 需渲染 | 临时 `dir="rtl"` 看三个主页面 |

> ~~featured product section 是否必须存在~~ → **2026-11-07 已核实：不强制**（见 G-02）。
> ~~是否要全局 `logo` 设置~~ → **2026-11-07 刘工拍板：要**，落点见 §5.1。

### 5.1 全局 logo 与双配色（2026-11-07）

**已定**：加全局 `logo`，统一给页头、礼品卡、密码页消费（G-13 走"补设置"这一支，不删分支）。

**要解决的真问题**：主题有两个 preset（Coppice 浅底 `#FFF` / Coppice Noir 深底 `#0F1012`），同一张深色 logo 在白底上清楚、在 Noir 上就是一块黑。**但 CSS 选不了图**——

- preset 切换改的是颜色值，不是媒体查询，`@media (prefers-color-scheme)` 与它无关；
- 浏览器端没有"当前用哪张 logo"的钩子，靠 JS 切图会有首屏闪烁。

**可选做法**

| | 做法 | 代价 |
| --- | --- | --- |
| A | **两套设置**：`logo` + `logo_dark`，Liquid 按骨架背景亮度自动选 | 商家多传一张图；需要亮度判断 |
| B | 一套设置 + "反白"开关（`filter: brightness(0) invert(1)`） | 对单色 logo 完美，**彩色 logo 会被压成纯白剪影** |
| C | 一套设置，要求商家自己保证深浅底都可读 | 等于把问题推给商家，preset 切换时必有一半场景难看 |

**亮度怎么判断**：`color_brightness` filter 仍可用（2026-11-07 核官方文档：返回 0–255 数值，无废弃提示）。骨架背景取自 `settings.skeleton_background_color | default: settings.background_color`，亮度低于阈值即视为深色骨架。**阈值待实测确定，不写死猜测值。**

**配套回落链**（必须定，否则商家忘传就露空）：`logo_dark` 空 → 用 `logo` → 再空 → `shop.name` 文字 wordmark（文字自动跟随 `--color-foreground`，两个 preset 天然都对）。

**与现有页头设置的关系**：`sections/main-nav.liquid:56` 现在读 `section.settings.logo`（section 级）。**2026-11-07 刘工拍板：删掉 section 级 logo 设置，只留全局**——两个入口会让商家困惑"改了没生效"。代价：已保存的演示数据要重新传图，`settings_data.json` 里的旧值被静默忽略（不报错）。

**⚠️ 前置条件**：此处"按亮度自动选图"依赖**服务端已知当前配色**。若将来做成"顾客在页头自己切换明暗"（运行时切换，见 §5.2），服务端就不知道顾客选了什么，**本节的 Liquid 判断会失效**，logo 要改成"两套图都输出 + 按根属性 `[data-theme]` 显隐"。

### 5.2 顾客端配色切换：可行性评估（2026-11-07 提出，未拍板）

**问题**：把两套主题色做成开关放页头，由访问用户切换。

**结论：技术上能做，但它不是"切换 preset"**——preset 是编辑器里的安装时配置，写进 `settings_data.json` 的 presentational settings，**运行时不可切**。要做顾客可切，得换一套机制：

```
<html data-theme="noir">        ← 运行时由 JS 切换
  ├─ :root        { --color-*: … }          ← 浅色一套
  └─ [data-theme="noir"] { --color-*: … }   ← 深色一套
      ↑ 两套值同时输出到 CSS，靠根属性切
```

配套三件事：`localStorage` 记住选择、`<head>` 内联脚本在首屏前应用（否则闪一下）、`request.design_mode` 时忽略用户偏好（否则商家改配色预览不变）。

**当前的实际成本（2026-11-07 实测）**

全站颜色基本都走 token 了，但还有 **6~9 处硬编码黑/白卡着深色**，全部是内容区的表面色与文字色：

| 文件 | 行 | 用法 |
| --- | --- | --- |
| `assets/product-card.css` | 48 / 51 | `rgb(255 255 255 / 85%)` 底 + `rgb(0 0 0 / 73%)` 字 |
| `sections/blog-posts.liquid` | 78 / 103 | `rgb(0 0 0 / 4%)` 卡底 + `rgb(0 0 0 / 65%)` 摘要字 |
| `sections/platform-cards.liquid` | 137 / 161 / 166 / 171 | `rgb(0 0 0 / 4%)` 卡底 + 三处 `rgb(0 0 0 / 45–60%)` 文字 |
| `sections/main-nav.liquid` | 1000 / 1640 | `border: 1px solid rgb(0 0 0 / 8–12%)`——深色骨架上等于没画 |

其余 `rgb(0 0 0 / x)` 多属合法例外（投影、压照片蒙层、遮罩），不用动。

**必须付的三笔账**

1. **首屏闪烁**：不内联脚本就会先白后黑。代价是 `<head>` 里多一段阻塞脚本（几行，可接受）。
2. **对比度重验**：深色下正文 4.5:1 / 图标 3:1 要全部重算，包括商品卡、筛选面板、规格表——这是 `AGENTS.md` §8 的验收线，不是"看着还行"。
3. **白底商品图**（本主题特有，最要命）：22 张产品图是**白底棚拍**（`docs/demo-store/asset-provenance.md`）。深色页面上商品卡会变成一块块白方块。通行做法是给图片容器保留浅底 + 圆角，但这样"深色"就只深到文字区——**视觉收益会打折**。

**建议（若要做）**

分两步，别一次全站翻：先落基础设施（双套 token + `data-theme` + 持久化 + 编辑器守卫），**只翻骨架与品牌色**验链路；再清上表那 6~9 处，把内容区拉进深色。两步之间可以先上演示店看观感——白底图那一关过不了就停，别把已经合规的页面改出新的对比度问题。

---

## 6. 本清单**不做**的事

- 不重做页头 / 页脚 / 购物车 / 集合 / 产品页的**主体**——各自清单负责，本清单只补接缝
- 不改 SDD：本清单是"官方要求 ↔ 现状"的映射，不改产品决策
- 不处理演示店内容质量（商品文案、图片、集合描述）——属 `docs/demo-store/` 范畴
- 不做性能优化专题（LCP 图、字体子集等）——属 SDD §8.1，另有验收
- 不为通过检查而"造"功能空壳：G-12 若决定不做，就明确写"不做"并接受购物车那段显示逻辑是死代码，**不要留一个假选项**
- **featured product section 先不做**（2026-11-07 刘工）。官方没有"必须包含"的要求（G-02 已核实），首页有 `featured-collection` 承接商品陈列。将来若要在落地页主推单个旗舰机型，再单独立项——**不要为了条款里出现过这个词就补一个 section**

---

## 维护规则

每次新增 section / 模板 / 全局设置后，重跑 §4.2 的脚本；条款变更（Shopify 更新 Requirements）时重核 §1 全表并更新版本号。发现新缺口按 `G-NN` 续号，**不要重排已有编号**——其他清单可能引用。修完的条目改为 `✅ 日期`，并把证据行号同步更新（行号会随改动漂移）。
