# 主题商店合规对账清单 — task-compliance.md

> **性质**：跨页面、跨 section 的**提交前合规对账**（v1.0）。把官方 Theme Store Requirements 的 `must` / `must support` 条款逐条映射到当前主题源码，只记**有证据**的缺口与**明确无法静态验证**的待确认项。
> **权威关系**：功能口径以 `dev-docs/sdd.md` §7.1 为准；本清单只做"官方要求 ↔ 主题现状"的映射，不新增产品决策。修复方案涉及设计取舍时，回填对应页面清单（`task-product.md` / `task-collection.md` / `task-footer.md` 等）。
> **范围**：主题级必填项——section/block 能力、全局设置、模板页面完整性、强制功能落点。
> **不在范围**：各页面清单已覆盖的项（页脚 newsletter / 社交 / 国家语言 → `task-footer.md`；页头菜单与搜索 → `task-header.md`；购物车 → `task-cart.md`；集合页 → `task-collection.md`；产品页主体 → `task-product.md`）。**本清单只在它们漏掉的接缝处补位。**
> **版本**：v1.1 ｜ 2026-11-12 ｜ **不含工期**
> **v1.1 变更**：G-03 / G-11 / G-13 已实现（全局 Brand 设置、favicon、品牌 logo）；§5.2 顾客端配色开关经刘工拍板**不做**。**剩余 11 条缺口，其中 S1 6 条。**

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
| ✅ G-03 | 没有 favicon 设置 | *"Must have a favicon setting."* | ~~S1~~ **已销 2026-11-12** |
| ✅ G-04 | 礼品卡页没有二维码 | *"Must show a QR code. The minimum size required is 120px x 120px."* | ~~S1~~ **已销 2026-11-17** |
| G-05 | 图片焦点（focal point）未实现 | *"Make sure that your theme supports the focal point of an image."* | **S1** |
| G-06 | `theme_info` 作者与链接仍是 Skeleton 默认 | §Theme info（*"Must have a `theme_info` section"* 已满足，但内容错） | **S1** |
| G-14 | **缺 `page.contact.json` 联系表单模板**（且全站没有联系表单） | *"Themes must support the following templates … `page.contact.json`"* + Page requirements: *"Must include an alternate template for a contact form."* | **S1** |
| G-07 | 搜索页没有分面筛选 | *"You need to support faceted search filtering on collection pages and search pages."* | **S2** |
| G-08 | 集合页商品卡不显示单位价 | *"Unit pricing must be supported on: Collection page / Product page / Cart page."* | **S2** |
| ✅ G-09 | 礼品卡商品没有"寄给收件人"字段 | *"Gift card products must have the option to send the card to a recipient."* + `form.email` / `form.name` / `form.message` / `form.send_on` | ~~S2~~ **已销 2026-11-17** |
| G-10 | 没有 Custom Liquid **block** | *"Introduce Custom Liquid blocks into certain sections."* | **S2** |
| ✅ G-11 | 密码页没有 logo / `shop.name` | Password page requirements: *"the logo or `shop.name`"* | ~~S2~~ **已销 2026-11-12** |
| G-12 | 产品页无法选择订阅计划 | §Selling plans 只要求购物车**显示**；但选不了 ⇒ 显示逻辑永远是死代码 | **S2** |
| ✅ G-13 | 礼品卡模板引用不存在的 `settings.logo` | 非条款问题 | ~~S3~~ **已销 2026-11-12** |

> **进度（2026-11-17）**：14 条缺口中 G-03 / G-04 / G-09 / G-11 / G-13 已实现，**剩余 9 条，其中 S1 5 条**（G-01 / G-02 / G-05 / G-06 / G-14）。下表保留全部原始行以便追溯，已销项以 ✅ 标记，落地记录见 §2.0 与 §2.0b。

> **G-10 与页脚清单重叠**：`task-footer.md` T-1.10 已规划在页脚加一个 `liquid` block，**能满足 G-10**。两边不重复做，谁先落地谁把这条勾掉。

---

## 2. 逐条详情

### 2.0 已实现项落地记录（2026-11-12）

| 编号 | 做法 | 主要文件 |
| --- | --- | --- |
| G-03 | `config/settings_schema.json` 新增 `favicon` (`image_picker`)；`layout/theme.liquid` 与 `gift_card.liquid` 的 `<head>` 输出 32×32 `rel="icon"` 与 180×180 `apple-touch-icon`（`image_url` 同时给 width/height 才能 `crop: center`） | `settings_schema.json`、`theme.liquid:49`、`gift_card.liquid:16` |
| G-13 | 全局 `logo` 设置真实存在后，`gift_card.liquid` 的死分支接上 `snippets/brand-logo.liquid`，无 logo 时仍回落 Shopify 内置卡图 | `gift_card.liquid:56` |
| G-11 | `password.liquid` 标题上方补全局 logo，无 logo 时显示 `shop.name`；**不新增第二个 `h1`** | `password.liquid:7` |

三项共用新建的 `snippets/brand-logo.liquid`（选图 + 输出单个 `<img>`）。页头桌面行与移动抽屉头部也一并改用它，并删除 section 级 `image_picker`。完整取舍与实现清单见 §5.1。

**验证**：`shopify theme check` → **78 files / 0 offenses**；`tools/check-locale-keys.py` 两套命名空间全命中；所有 JSON 与 `{% schema %}` 可解析；两个 preset 键集合仍完全相同（各 13 个）且不含图片设置。`check-tag-balance.py` 报的 8 处全是既有 `compare-*` snippet 的属性 `>` 误报，**本次改动的 5 个文件均不在列表内**。

### 2.0b 已实现项落地记录（2026-11-17）

| 编号 | 做法 | 主要文件 |
| --- | --- | --- |
| G-04 | 礼品卡页补二维码（内容 `gift_card.qr_identifier`，渲染 160×160），同时补打印样式与 `Print` 按钮；整页改为居中卡片布局 | `templates/gift_card.liquid` |
| G-09 | 礼品卡商品的收件人字段块（Custom Element + `properties[...]` 平台字段），商品主 section 增加开关设置 | `snippets/gift-card-recipient.liquid`、`assets/gift-card-recipient.js`、`sections/main-product.liquid` |

**G-04 细节**

- 码内容取 `gift_card.qr_identifier`（经 `| json` 落进 JS 字面量），**不是 `shop.url`**：收银台扫的是这张卡的身份串。
- 渲染库是 `{{ 'vendor/qrcode.js' | shopify_asset_url }}` —— Shopify 自托管的官方资产，不是外部 CDN；官方 `gift_card.liquid` 文档给的就是这条路径。`script_tag` filter 不支持 `defer`，直接用它会被 theme check 判 `ParserBlockingScript`，所以手写 `<script src=… defer>`，初始化放 `DOMContentLoaded`（defer 脚本一定先于它执行）。
- **尺寸下限的落点**：`.gift-card__qr` 固定 `160px × 160px`，库的 `width/height` 参数同为 160 —— 实际渲染尺寸 160，高于 120 的硬下限。
- 白底板 + 黑码写死（`colorDark` / `colorLight` + 白色托板）：Noir 预设下页面底色是深色，跟随配色的码扫不出来。
- 打印：`@media print` 强制白底黑字、去阴影、隐藏动作按钮 —— 固定色值是有意例外（输出介质固定，不能跟随预设）。
- 无 JS：二维码不渲染（与官方示例同构），余额与卡号仍在，收银台可手输卡号。

**G-09 细节（平台字段名照 Dawn 官方实现核对，比条款文字更精确）**

| 提交键 | 作用 |
| --- | --- |
| `properties[Recipient email]` | 收件人邮箱 |
| `properties[Recipient name]` | 收件人姓名 |
| `properties[Message]` | 留言（`maxlength=200`） |
| `properties[Send on]` | 寄送日期 |
| `properties[__shopify_send_gift_card_to_recipient]` | 开关。隐藏域 `value="if_present"` 是无 JS 口径；有 JS 时隐藏域被禁用，改由复选框提交 |
| `properties[__shopify_offset]` | 收件人时区偏移（`getTimezoneOffset()`，分钟）—— 排期差一天就是它没填对 |

- 条款写的 `gift_card.send_on` 是 `gift_card` 对象上的属性，**只在 gift_card 页与通知模板可用**，商品表单里拿不到；表单内的回填一律 `form.send_on`（`form.email` / `form.name` / `form.message` 同理）。
- 透明度策略：`product.gift_card?` 为假时既不渲染字段也不加载脚本，普通商品零增量。
- 无 JS：复选框出厂 `disabled`（不提交）、隐藏域提交 `if_present`、四个字段常显可填；有 JS 时反过来（复选框可提交、字段默认收起）。收起用 `:defined:not([open])` 判定，**不靠 JS 切 class**，也不用两套 DOM。
- 主题编辑器里对应开关是 `main-product` 的 `Show recipient information form for gift card products`（默认开），与官方帮助中心的同名能力对齐。
- **寄送日期框显示的语言不受主题控制**：`<input type="date">` 的空值占位（`mm/dd/yyyy` / `年/月/日`）由**浏览器 UI 语言（或系统区域）**决定，页面 `lang` 与 `request.locale` 都改不了 —— 已实测：同一页里 `lang="en"` 与 `lang="zh-CN"` 两个 date 输入显示完全一致。主题侧可控的只有值格式（`value` / `min` 一律 ISO `YYYY-MM-DD`，我们已如此）。演示截图里出现中文是操作系统的语言，不是缺陷；审核员用英文浏览器看到的即为英文格式。
- `min` 由脚本按**本地日期**覆盖 Liquid 的服务器日期（`_setLocalMinDate()`）：`{{ 'now' | date }}` 取店铺服务器时区，跨时区最多差一天，会让西半球店铺下午选不了"今天"；日期真正的解释权在 `properties[__shopify_offset]`，下限应当同源。无 JS 时保留 Liquid 的 `min` 兜底。
- ⚠️ **演示店验证限制**：演示店没有礼品卡商品、也没有可用支付网关，走不通「买卡 → 收件人收信 → 打开卡片页」。验收口径与支付图标一致 —— 按「模板/字段符合官方写法」判；实卡验证靠后台 `Products > Gift cards > Create gift card` 手动建卡（不收款）拿 `gift_card.url`。

**验证（2026-11-17）**：`shopify theme check` → **81 files / 1 warning**（唯一一条是既有的 `snippets/image.liquid` `OrphanedSnippet` 误报）、0 error；`tools/check-locale-keys.py` 两套命名空间全命中。交互与视觉用本地桩验收（标记与 CSS 从源文件抽取，教训见 `dev-docs/bugs.md` BUG-071）：字段展开/收起/清空/禁用、时区偏移、无 JS 兜底、二维码 160×160 容器，全部通过 `--dump-dom` 断言。


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

### ✅ G-03 没有 favicon 设置（2026-11-12 已实现，见 §2.0）

**官方原文**

> "Must have a favicon setting."

**现状证据**

- `config/settings_schema.json` 解析后**没有任何 `image_picker` 设置**（唯一的资源型设置是 `compare_collections`）
- `layout/theme.liquid` 无 `rel="icon"` / `favicon` 输出

**影响**：商家在主题编辑器里传不了站点图标，只能在后台 Files 里折腾。`must`。

**做法**：全局设置加 `image_picker`（id 用 `favicon`，术语必须是 **favicon**，官方明确禁 "shortcut icon" / "website icon"），`<head>` 输出 32×32 与 180×180 两档。

---

### ✅ G-04 礼品卡页没有二维码（2026-11-17 已实现）

**官方原文**

> "Gift Card page requirements: Must support Apple Wallet. Must show a gift card code. Must show a QR code. The minimum size required is 120px x 120px. Must include the logo or `shop.name`."

**原状**（2026-11-12 核查）：`templates/gift_card.liquid` 全文 73 行——余额、有效期、Apple Wallet、卡号、`shop.name` 都有，**唯独没有二维码**。没有二维码，这张卡在收银台核销不了。

**实现**：重写为居中卡片（logo → 店名 → 余额 `h1` → 过期/停用提示 → **二维码** → 卡号 → Print / Apple Wallet），二维码渲染 160×160（> 120 下限），细节见 §2.0b。

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

### ✅ G-09 礼品卡商品没有"寄给收件人"字段（2026-11-17 已实现）

**官方原文**

> "Gift card products must have the option to send the card to a recipient. The following attributes of the `form` object must be used: `form.email` / `form.name` / `form.message`. The following attribute of the `gift_card` object must be used: `send_on`."

**原状**（2026-11-12 核查）：`grep -rnE "form\.(email|name|message)|send_on" sections/ snippets/` 只命中 `sections/article.liquid` 的评论表单（无关）。礼品卡商品加购时无法填收件人，核心场景断掉。

**实现**：`snippets/gift-card-recipient.liquid` + `assets/gift-card-recipient.js` + `main-product` 开关设置。提交键是 `properties[Recipient email]` / `[Recipient name]` / `[Message]` / `[Send on]` 与两个平台隐藏域，`form.*` 只做错误回填。字段名逐字对齐官方实现，细节见 §2.0b。

---

### G-10 没有 Custom Liquid block

**官方原文**

> "Introduce Custom Liquid blocks into certain sections. Add a Custom Liquid block anywhere you'd consider adding an app block, because the Custom Liquid block can act as an insertion point for certain types of apps."

**现状证据**：`"type": "liquid"` 全站 0 命中。

**处置**：**与 `task-footer.md` T-1.10 是同一件事**，不要做两遍。落地后把这条勾掉。

---

### ✅ G-11 密码页没有 logo / `shop.name`（2026-11-12 已实现，见 §2.0）

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

### ✅ G-13 礼品卡模板引用不存在的 `settings.logo`（2026-11-12 已实现，见 §2.0）

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
- [x] **T-1.3** 全局品牌设置：`favicon` + `logo` / `logo_dark` + 亮度自动选图（G-03 / G-13 / §5.1）· 依赖：无
- [x] **T-1.4** 礼品卡二维码（G-04）· 依赖：无
- [ ] **T-1.5** 图片焦点：先收敛输出点，再按"会裁剪处"逐个接（G-05）· 依赖：无 · **改动面最大**
- [ ] **T-1.6** `theme_info` 更正（G-06）· 依赖：真实作者名与文档地址
- [ ] **T-1.7** 联系表单 section + `page.contact.json` 模板（G-14）· 依赖：无

### P2 S2 功能级

- [ ] **T-2.1** 搜索页重写：筛选 + 商品卡复用 + 排序（G-07）· 依赖：与 `task-collection.md` 的筛选实现协调
- [ ] **T-2.2** 商品卡单位价（G-08）· 依赖：无
- [x] **T-2.3** 礼品卡收件人字段（G-09）· 依赖：`main-product` 表单区块结构
- [x] **T-2.4** 密码页补 `shop.name` / logo（G-11）· 依赖：无
- [ ] **T-2.5** 产品页订阅计划选择器（G-12）· 依赖：T-2.3 同区（都在表单内）

### P3 S3 缺陷与收尾

- [x] **T-3.1** `gift_card.liquid` 改用全局 logo（G-13，T-1.3 落地后一并接）· 依赖：T-1.3
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
| 文案无 `&` 符号 | 两个 locale 全文无裸 `&`；2026-11-12 修掉 `general.header_skeleton` 的 `Header & footer colors`（旧核查只查 `&amp;`，漏了裸 `&`） |
| 无 `.scss` / 无压缩产物（启发式：<5 行且 >2KB 的文件 0 个） | `find` + 行数/字节比 |
| 无外部 http 资源 | 仅注释里的文档 URL 与 `fonts.shopifycdn.com` preconnect |
| 提交包不含 `robots.txt.liquid` / `config/markets.json` | `ls config/` 仅两个 JSON |
| 未改动 `content_for_header` | `theme.liquid:48` 原样输出 |
| preset 名含主题名 | `hero-slideshow.liquid:1031` `"name": "Coppice"` |
| logo 支持不同宽高比 | `snippets/brand-logo.liquid` 用 `image_tag` 输出固有比例，CSS 只固定 `block-size` |
| 礼品卡：Apple Wallet / 卡号 / `shop.name` | `gift_card.liquid` |
| 字体用 `font_picker` | `settings_schema.json:18` |
| favicon 设置与两档输出（G-03） | `settings_schema.json` 的 `favicon` + `theme.liquid` / `gift_card.liquid` 的 `<head>` |
| 全局 logo 单一入口（G-13） | `t:general.brand` 分组；页头 / 抽屉 / 礼品卡 / 密码页统一 `render 'brand-logo'` |
| 密码页有 logo 或店名（G-11） | `password.liquid` 标题上方；不产生第二个 `h1` |

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
| **切换 preset 后已上传的 logo 是否保留** | 依赖编辑器行为，静态推不出来 | 在 Brand 分组传图后切一次 `Coppice` ↔ `Coppice Noir`，确认图没丢（见 §5.1） |

> ~~featured product section 是否必须存在~~ → **2026-11-07 已核实：不强制**（见 G-02）。
> ~~是否要全局 `logo` 设置~~ → **2026-11-07 刘工拍板：要；2026-11-12 已实现**，落点见 §5.1。

### 5.1 全局 logo 与双配色（2026-11-07 拍板，2026-11-12 实现）

**状态：已实现。** 全局 `logo` / `logo_dark` / `favicon` 三个 `image_picker` 落在 `config/settings_schema.json` 新增的 `t:general.brand` 分组；页头桌面行、移动抽屉头部、礼品卡、密码页统一消费。

**要解决的真问题**：主题有两个 preset（Coppice 浅底 `#FFF` / Coppice Noir 深底 `#0F1012`），同一张深色 logo 在白底上清楚、在 Noir 上就是一块黑。**但 CSS 选不了图**——

- preset 切换改的是颜色值，不是媒体查询，`@media (prefers-color-scheme)` 与它无关；
- 浏览器端没有"当前用哪张 logo"的钩子，靠 JS 切图会有首屏闪烁。

**当时的取舍**（保留供回溯）

| | 做法 | 代价 |
| --- | --- | --- |
| **A ✅ 采用** | **两套设置**：`logo` + `logo_dark`，Liquid 按骨架背景亮度自动选 | 商家多传一张图；需要亮度判断 |
| B | 一套设置 + "反白"开关（`filter: brightness(0) invert(1)`） | 对单色 logo 完美，**彩色 logo 会被压成纯白剪影** |
| C | 一套设置，要求商家自己保证深浅底都可读 | 等于把问题推给商家，preset 切换时必有一半场景难看 |

**亮度判据（阈值问题已收口）**：`color_brightness` 返回 0–255（2026-11-07 核官方文档，无废弃提示）。骨架背景取自 `settings.skeleton_background_color | default: settings.background_color`，算出亮度后与 **128（0–255 明暗中线）** 比较，取不到色值时 `| default: 255` 按浅色处理。

**128 不是拍脑袋定的**：`snippets/css-variables.liquid` 的 `header_luma` 早已用同一个值决定页头底色与两套阴影，本次直接对齐——两处阈值若漂移，深色页头会配上浅底 logo。两个 preset 的实际亮度分别是 `#FFFFFF → 255` 与 `#0F1012 → ≈16`（`(15×299 + 16×587 + 18×114)/1000`），离 128 极远，阈值在大区间内不敏感，**无需再实测校正**。该约束已写进 `snippets/brand-logo.liquid` 的 LiquidDoc。

**回落链**：深色骨架且 `logo_dark` 有值 → 用 `logo_dark`；否则 → `logo`；两者都空 → 不输出 `<img>`，由各调用方显示文字或兜底图（页头 = `brand_name`、密码页 = `shop.name`、礼品卡 = Shopify 内置卡图）。文字跟随 `--color-foreground`，两个 preset 天然都对。

**一处刻意保留的例外**：`sections/footer.liquid` 的 `brand` block 仍有自己的 `image_picker`（`block.settings.logo`）。它是页脚专属的大尺寸 wordmark（220px / 160px），与页头 40px 图标不是同一个设计元素，商家可能想放不同的图；留空时回落 `shop.name` 文字，不会露空。全局 Brand 分组的 `info` 已写明只覆盖页头 / 礼品卡 / 密码页，避免"改了全局页脚没变"的误解。

**顾客端配色开关已否决（2026-11-12 刘工）** ⇒ 服务端始终知道当前配色，"按亮度只输出一张图"成立，不需要双图 + `[data-theme]` 显隐，也没有首屏闪烁问题。详见 §5.2。

#### 编辑器里的落点

`config/settings_schema.json` 渲染成编辑器左侧栏的 **Theme settings（⚙ 齿轮）**，与当前在编辑哪个页面无关；`sections/*.liquid` 的 schema 才渲染成"点开某个分区后的设置"。两者的数据作用域不同：

- 全局 `settings.<id>`：所有 section / snippet / 模板都能读。
- `section.settings.<id>`：**只在定义它的那个 section 文件里可读**——礼品卡模板、密码页都读不到页头分区的设置。`gift_card.liquid` 原来那句 `{% if settings.logo %}` 恒假就是这个原因：它写的是全局，而全局从未定义过。

**已删**：`sections/main-nav.liquid` 的 section 级 `image_picker` 及其 `assign`；`sections/header-group.json` 里遗留的 `"logo": "shopify://shop_images/logo_webp.webp"` 一并清掉（schema 没了，键已孤立，且是演示店资源引用）。**代价**：演示店页头现在只剩 "Northbark" 文字，需在 Theme settings → Brand 重新传图。

**已加**：`t:general.brand` 分组 + `en.default.schema.json` 的 `general.brand` 与 6 个 `labels.*` 键。分组名与 label 禁含 `&`（官方禁主题文案含 `&`、美式英语、sentence case）；顺带修掉既有 `general.header_skeleton = 'Header & footer colors'` → `Header and footer colors`（此前 §4.1 只查了 `&amp;`，漏了裸 `&`），以及过时的 `labels.logo_info`（原文案承诺"回落内置主题 logo"，代码从未实现）。

| 设置 | 类型 | 用途 |
| --- | --- | --- |
| `logo` | `image_picker` | 主 Logo，浅色骨架；页头 / 礼品卡 / 密码页 |
| `logo_dark` | `image_picker` | 深色骨架用；留空回落 `logo` |
| `favicon` | `image_picker` | G-03，浏览器标签栏与移动主屏，与页面配色无关，**不需要两套** |

商家**不需要**指定"哪个 preset 用哪张"——选图由 Liquid 完成。两个 logo 的 `info` 已写明用途与回落行为。

**preset 处理口径**：两个 preset（`Coppice` / `Coppice Noir`）在 `settings_data.json` 里是**平铺的 settings 字典**（不是 `{"settings":{…}}`），键集合目前完全相同（各 13 个），本次未改。**`logo` / `logo_dark` / `favicon` 一律不写进任何 preset**——主题包带不了图片资产，预置只会变成别人的图或空引用。按"preset 切换不删缺席键"的规则，商家上传的图在切换两个配色时应保留；**此点需切一次 preset 实测确认**，别只靠推断。

#### 实现清单

| 文件 | 改动 |
| --- | --- |
| `config/settings_schema.json` | 新增 `t:general.brand` 分组（3 个 `image_picker`），排在 `theme_info` 之后 |
| `locales/en.default.schema.json` | 补 `general.brand` 与 6 个 `labels.*`；修 `header_skeleton` 的 `&`；修 `labels.logo_info` |
| `snippets/brand-logo.liquid` | **新建**。统一选图 + 输出单个 `<img>`，LiquidDoc 标注 128 阈值必须与 `css-variables.liquid` 同步 |
| `sections/main-nav.liquid` | 删 section 级 `image_picker` 与 `assign`；桌面 Zone 0 与移动抽屉头部都改 `render 'brand-logo'` |
| `layout/theme.liquid` | `<head>` 输出 favicon 32×32（`rel=icon`）+ 180×180（`apple-touch-icon`） |
| `templates/gift_card.liquid` | G-13 死分支接上全局 logo；`{% layout none %}` 的独立 head 也补 favicon |
| `sections/password.liquid` | G-11：补全局 logo 或 `shop.name`，不新增第二个 `h1` |
| `sections/header-group.json` | 清掉孤立的演示店 `logo` 值 |

**⚠️ 改动时的教训**：删掉 `assign logo_image` 后，`main-nav.liquid` 里**第二处**消费点（移动抽屉头部，约 540 行）变成未定义变量——静态 grep 只搜 `section.settings.logo` 是找不到的。**是 `shopify theme check` 的 `UndefinedObject` 报出 7 条 warning 才抓到。** 结论：删变量前搜的是「变量名的所有引用」，不是「赋值语句里的那个表达式」。

### 5.2 顾客端配色开关：**不做**（2026-11-07 评估，2026-11-12 刘工否决）

> **2026-11-12 拍板：不做。** 以下是当时的可行性评估，保留作为决策依据，**不要再当待办推进**。
> 连带结论：服务端始终知道当前配色 ⇒ §5.1 的"Liquid 按亮度只输出一张图"成立，logo 不需要改成
> 双图 + `[data-theme]` 显隐，也不需要 `<head>` 内联主题脚本。评估里那 6~9 处硬编码黑白
> **不为开关而改**（其中 `main-nav.liquid` 两条黑边框在 Noir 骨架下本就不可见，属既有缺陷，单独按 bug 处理）。

**当时的问题**：把两套主题色做成开关放页头，由访问用户切换。

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
- **顾客端配色开关不做**（2026-11-12 刘工）：理由与三笔成本见 §5.2。连带：不引入 `data-theme` / `localStorage` / 首屏内联脚本，深色内容区那 6~9 处硬编码黑白也不为开关而改

---

## 维护规则

每次新增 section / 模板 / 全局设置后，重跑 §4.2 的脚本；条款变更（Shopify 更新 Requirements）时重核 §1 全表并更新版本号。发现新缺口按 `G-NN` 续号，**不要重排已有编号**——其他清单可能引用。修完的条目改为 `✅ 日期`，并把证据行号同步更新（行号会随改动漂移）。
