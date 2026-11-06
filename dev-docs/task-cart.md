# 购物车（cart.json）开发任务清单 — task-cart.md

> **性质**：SDD 驱动开发的页面任务清单（v1.0）。拆解自 `dev-docs/pages-ui.md` §10、`dev-docs/sdd.md` §4.1（第 10 行）/ §6.3 / §6.4 / §7.1 / §8.1 / §8.2，不引入新决策。
> **权威关系**：与 SDD 冲突时以 `dev-docs/sdd.md` 为准；本清单与 pages-ui §10 的**版式**冲突，以本清单 §0.3 为准（**§10 的线框需同步改**，见 §6），功能职责仍以 §10 为准。
> **范围**：`templates/cart.json` + 4 个购物车 section + 行项/摘要 snippet + 1 个 Custom Element + 相关 locale 键。
> **不在范围**：购物车抽屉（另立清单）、页尾（`task-footer.md`）、页头（`task-header.md`）、集合页（`task-collection.md`）、产品页配件捆绑（`task-product.md`）。
> **版本**：v1.0 ｜ 整理日期：2026-11-02
> **通用约束**（不逐任务重复）：文案走 `t:` 键（正文 `en.default.json` / schema `en.default.schema.json`，两个命名空间分开校验）、URL 走 `routes`、图片 `image_tag` + width/height、JS 一律 defer、类名 Skeleton 风格 BEM、设计令牌走 `css-variables.liquid`、颜色禁硬编码（`color-mix` + `var(--color-*)`）、RTL 用逻辑属性、可交互组件用 Custom Element（AGENTS.md §6）。

---

## 0. 前置事实与版式决策

### 0.1 外部依赖

| 依赖 | 现状（2026-11-02 核实） | 影响 | 处置 |
| --- | --- | --- | --- |
| `templates/cart.json` | 只有 `main` 一个 section，指向 `cart.liquid` | 需整体重排为 4 section | T-1.1 |
| `sections/cart.liquid` | **Skeleton 原始模板**：38 行，一个 `<table>` + 原生 POST + 无摘要/无推荐/无空态 | 不是改造，是重写 | T-1.1，旧文件删除 |
| 购物车抽屉 | **不存在**（`cart-entry.liquid` 注释明确「本期静态入口，不做抽屉」） | 加购后仍跳购物车页，不弹层 | 本清单不做，抽屉另立 |
| `assets/cart-badge.js` | ✅ 已完成（监听 `cart:updated`，回写页头角标） | 购物车页内改数量后必须**派发同名事件**，否则页头角标不跟着变 | T-2.1 必须接入 |
| `snippets/product-card.liquid` | ✅ 已完成（14 KB，含快速加购） | 推荐位直接复用，不新写卡片 | T-1.5 |
| 演示店配件集合 | ✅ **已建**（2026-11-02 刘工确认；11 款配件） | 推荐位 preset 的默认集合有可用示例内容 | 无 |
| Search & Discovery（complementary 关系） | **未配置**（`acc.consumables` 是本项目自建 metafield，**不等于** Shopify 的 complementary products） | B 路径（API）拿不到结果，回退 A 必须能用 | T-0.2 + T-1.5 |
| `sections/cart.liquid` 的 locale 键 | 只有 6 个：`cart_empty` / `cart_with_items` / `checkout` / `remove` / `title` / `update` | 新增 28 个键（清单见 §5） | T-1.1~T-1.6 逐节补，最后跑 `check-locale-keys.py` |

### 0.2 已核实事实（逐条带出处，实现前复核）

| # | 事实 | 出处／核实方式 |
| --- | --- | --- |
| C-1 | 页面模板由 `templates/cart.json` 定义，section 在 JSON 里平铺，`order` 决定 DOM 顺序 | 现有 `templates/cart.json`；Shopify JSON template 文档 |
| C-2 | `<body class="template-{{ template.name }}">` **已存在** | `layout/theme.liquid` 第 46 行，可直接用 `.template-cart` 门控，**不需改 layout** |
| C-3 | section schema 支持 `"class"`，会落到包装元素 `<div id="shopify-section-…">` 上 | 项目既有用法：`sections/collection.liquid:1573`、`main-nav.liquid:2538`、`main-product.liquid:1595` |
| C-4 | 购物车行项用 `item.key` 作 `/cart/change.js` 的 `id`；改数量不能传 `variant_id` | Shopify Ajax Cart API 文档；`item.key` 是唯一行标识（同一变体不同 properties 是两行） |
| C-5 | `cart.total_price` 是**已扣折扣、未含运费**的商品合计；`cart.items_subtotal_price` 是折扣前小计 | Shopify Liquid `cart` 对象文档 |
| C-6 | 运费**无法在主题侧计算**。`cart` 对象不含运费字段 | SDD §6.4「主题无权计算运费」；cart 对象字段清单无 shipping cost |
| C-7 | `{{ content_for_additional_checkout_buttons }}` 输出加速结账按钮（Shop Pay 等），颜色由平台控制 | SDD §7.1 #3；Shopify 文档 |
| C-8 | `recommendations` Liquid 对象**只在 product 上下文可用**；购物车页没有 | Shopify Liquid `recommendations` 文档（依赖 product 对象） |
| C-9 | 购物车页做「基于商品」的推荐只能调 `/recommendations/products?section_id=…&product_id=…&intent=complementary`，由 Section Rendering 返回 HTML | Shopify Product Recommendations API 文档 |
| C-10 | complementary 关系由商家在 **Search & Discovery app** 中配置；主题不能假设其存在 | Shopify 文档 + §0.1 现状 |
| C-11 | `item.unit_price` 仅在商品设置了「单位价格」时存在，配套 `item.unit_price_measurement` | SDD §7.1 #19；Liquid line item 文档 |
| C-12 | `item.selling_plan_allocation.selling_plan.name` / `.selling_plan_group` 用于显示订阅计划 | SDD §7.1 #17 |
| C-13 | 行级折扣在 `item.line_level_discount_allocations`，整单折扣在 `cart.cart_level_discount_applications` | SDD §7.1 #2 |
| C-14 | 折扣码**应用结果**可通过 `cart.discount_codes` / `cart.cart_level_discount_applications` 读出，但**输入框**的提交路径需另核官方 discount 文档 | 见 §6（本清单不做输入框） |
| C-15 | ✅ **已实测（2026-11-02）**：`variant.available` 在 `inventory_policy = continue` 时库存 0 仍返回 true——单用它会把空货架标成 In stock。正确判断 = `available and inventory_policy != 'continue'` | 演示店锯链导入后确认该开关已勾上；CSV 值 `CONTINUE`（大写，随官方模板写法）被平台接受 |
| C-16 | Ajax Cart API 的 `/cart/change.js` 支持 `sections` / `sections_url` 参数，响应含 `sections` 键（渲染后的 HTML） | Shopify Ajax Cart API 文档；T-2.1 的局部刷新依赖此事实，**实现前实测一次返回结构** |

### 0.3 版式决策：两栏（本清单取代 pages-ui §10 的线框）

**来源**：刘工 2026-11-02 提供的参考图（Northbark 风格购物车页）。定位为**结构参考**，不是像素复刻。

**借了什么**：左行项 + 右摘要卡（桌面）、摘要卡 `sticky`、行内数量步进、行内移除、下方推荐位。

**没借什么**（原因逐条）：

| 参考图元素 | 为什么不照搬 |
| --- | --- |
| `Shipping  FREE` | **伪造运费**（C-6）。主题无权报价，SDD §6.4 明令禁止伪装成实时运费 |
| `Estimated Tax  —` | 无信息量，且税费同样由结账计算 |
| 推荐位 4 台同类割草机 | 与本主题「主机 + 耗材」客单价结构（SDD §57 行）相悖；§6.3 定的是耗材补充建议 |
| 只有 Price / Quantity / Total 三列 | 缺 #2 折扣、#17 订阅计划、#19 单位价三个审核强制项 |
| 表格 `<table>` 布局 | 移动端必崩；且行的可编辑性/无障碍语义不适合 |

**保留的 SDD 卖点**（参考图没有）：顶部物流汇总条（§6.4）、行级物流提示（§6.4）。

**两栏实现方式（关键，避免踩坑）**：四个 section 在 `cart.json` 里**平铺**，用 schema `"class"`（C-3）精确定位到栅格，**不依赖 section 顺序**（商家可在编辑器上移下移）：

```css
.template-cart #MainContent {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  align-items: start;
  gap: 2rem;
}
.cart-banner-section,
.cart-recommendations-section { grid-column: 1 / -1; }
.cart-lines-section { grid-column: 1; min-inline-size: 0; }   /* 必须给 item 本身，见 AGENTS.md 已知坑 */
.cart-summary-section { grid-column: 2; }
@media (max-width: 749px) { .template-cart #MainContent { grid-template-columns: 1fr; } }
```

> **两条硬约束**：
> 1. `min-inline-size: 0` 必须加在 `.cart-lines-section`（grid item 本身）上。加在祖先无效，`overflow-x` 也不截断 min-content 传导 —— 这是本项目已经踩过的类别。
> 2. `sticky` 会因祖先 `overflow: hidden` 失效。摘要卡 `position: sticky; top: var(--header-height)` 前，先确认 `#MainContent` 祖先链没有 `overflow` 裁切。

---

## 1. 决策记录（2026-11-02 与刘工确认）

| # | 决策 | 结论 | 代价（明说） |
| --- | --- | --- | --- |
| D-1 | 参考图定位 | 结构参考，骨架照用，配色/字体/文案全走 Coppice 令牌 | 视觉上与参考图不像，这是预期的 |
| D-2 | 与 pages-ui §10 的关系 | 改版式层，不动功能层：4 个 section 全部保留，只把「上下堆叠」改为「左行项 + 右摘要」 | pages-ui §10 线框图必须同步重画（§6） |
| D-3 | 范围 | 只做购物车**页**；行项抽成 `snippets/cart-line.liquid` 供将来抽屉复用 | 加购后仍跳页，没有抽屉的即时反馈 |
| D-4 | 推荐位数据源 | **B 优先 + A 回退**：JS 先试 complementary API，无结果用商家指定集合；演示店默认填**配件集合** | 依赖 `product-card.liquid`；无 JS 时只显示集合（回退态），看不到个性化 |
| D-5 | 运费/税费 | **一行静态文案**：「运费与税费在结账时计算」，商家可改；`cart.taxes_included` 为真时改为「含税」表述 | 放弃免邮进度条（阈值易与真实运费规则脱节，反而是误导） |
| D-6 | 行内强制项 | 折扣、单位价、订阅计划**三个全做**（#2 #17 #19） | 行内信息密度上升，窄屏需折叠顺序 |
| D-7 | 数量/移除交互 | `<cart-items>` Custom Element + `/cart/change.js` + Section Rendering 局部刷新；无 JS 降级为原生表单整页提交 | 比纯表单多一层请求编排；换来无刷新与小计即时播报 |
| D-8 | 交付顺序 | 先出本清单；**清单已确认（2026-11-02），代码尚未开始** | — |

### 1.1 本清单代为拍板的三项（刘工可在审阅时一并否掉）

| # | 事项 | 取值 | 理由 |
| --- | --- | --- | --- |
| D-9 | 移动端行项形态 | **行卡片**：图左（88px）+ 右侧「名称 / 规格副标题 / 单价 → 数量步进 → 行小计 → 移除」，表头隐藏 | 表格在 <750px 必然横向溢出；卡片是 Shopify 主题通行解 |
| D-10 | 空车时是否显示摘要卡 | **不显示**，空态独占整页（标题 + 说明 + 主 CTA）；推荐位仍显示 | 空车挂一张 `$0.00` 的摘要卡是最常见的主题商店扣分点 |
| D-11 | 折扣码输入框 | **不做**（只显示已生效的折扣结果） | 提交路径需另核官方 discount 文档（C-14），且结账页本就有输入框；不做比做错好 |

---

## 2. 任务分解

### P0 前置

#### T-0.1 平台事实复核 · 依赖：无

- [ ] 逐条复核 §0.2 的 C-1 ~ C-15，把「文档记载」变成「本项目实测」；重点两条：
  - [ ] **C-15**：演示店找一件「允许超卖」的变体，加入购物车后打印 `item.variant.available`，确定 In stock 徽标口径
  - [ ] **C-9**：手搓一次 `GET /recommendations/products?section_id=cart-recommendations&product_id=<主机遇手>&intent=complementary&limit=4`，确认未配置 Search & Discovery 时的真实返回（空 HTML？空数组？）—— 这决定回退逻辑写成「空字符串判断」还是「卡数判断」
- [ ] 记录到本节下方「实测结果」小节，供后续任务引用

#### T-0.2 演示店数据准备 · 依赖：刘工后台操作

- [x] 配件集合已建且可访问（11 款：刀片 3 / 导板 3 / 锯链 3 / 打草绳 1 / 40V 电池 1），推荐位 preset 有可用示例内容（2026-11-02 刘工确认）
- [ ] 至少在 1 台主机上配 1 组 complementary 关系（Search & Discovery），用于验证 B 路径是否真的能出卡；**不配也能验收**（走 A 回退），但 B 路径就等于未测
- [ ] 选一件商品设置「单位价格」，用于 #19 验收
- [ ] 选一件商品配置订阅计划（selling plan），用于 #17 验收 —— 若演示店没有订阅类商品，需临时造一个（可用「每 3 个月配送机油」这类合理商品），标 ⚠️ 并说明是验收专用

### P1 section 实现

#### T-1.1 `cart.json` 重排 + 四 section 骨架 · 依赖：T-0.1

- [ ] `templates/cart.json` 改为四个 section：

```json
{
  "sections": {
    "banner":   { "type": "cart-summary-banner" },
    "lines":    { "type": "cart-lines" },
    "summary":  { "type": "cart-summary" },
    "upsell":   { "type": "cart-recommendations" }
  },
  "order": ["banner", "lines", "summary", "upsell"]
}
```

- [ ] 删除 `sections/cart.liquid`（Skeleton 原始模板）。**先确认无其他模板 render 它**（grep `'cart'` 的 render 调用）
- [ ] 四个 section 的 schema 均带 `"class"`：`cart-banner-section` / `cart-lines-section` / `cart-summary-section` / `cart-recommendations-section`
- [ ] 两栏栅格按 §0.3 写进 `assets/critical.css`（**不要**写在某个 section 的 `{% stylesheet %}` 里 —— 它跨四个 section，且属于模板级布局）
- [ ] 四个 section 均提供 preset；**至少一个 preset 名含 `Coppice`**（AGENTS.md §4 硬性要求；若首页已占位则不必重复）
- [ ] `{% stylesheet %}` 必须位于 section 顶层，每文件有且仅有一个（BUG-014 已二犯）

#### T-1.2 `sections/cart-lines.liquid` + 行项 snippet · 依赖：T-1.1

- [ ] 新建 `snippets/cart-line.liquid`，参数 `item`（+ 可选 `index`）；抽屉将来复用同一份
- [ ] 行项结构（桌面）：

```
[图 96×96]  名称（链到 item.url）
            规格副标题（2 个 metafield 拼；无值则不渲染副标题行）
            [物流徽标] [In stock 徽标]         ← 仅在「有货且未开超卖」时输出（C-15 已结案）
            订阅计划行（#17，有则显示）
            单价（$550.00）   ← 有折扣时：原价划线 + 实付价
            单位价（#19，$17.99 / L，小字，有则显示）
            [−] [ 1 ] [+]      ← 44×44 触摸目标
            行小计             ← 与数量同行右侧（桌面）
            移除（文字按钮，可访问名含商品名）
```

- [ ] **规格副标题的数据源必须先定**：用 `item.product.metafields.spec.*` 的哪两个字段？（建议 `power_source` + `displacement`/`bar_length`，按品类不同）→ 没有统一字段就退化为 `item.variant.title`（非 Default 时）
- [ ] 折扣渲染：`item.original_price > item.final_price` 时输出 `<s>` 原价 + 实付价；行级折扣金额取 `item.line_level_discount_allocations`，并在 `.cart-line__discount` 内列出折扣名（`discount_application.title`）
- [ ] 单位价：`item.unit_price_measurement` 存在时输出 `{{ item.unit_price | money }} / {{ measurement.reference_value }}{{ measurement.reference_unit }}`；**无值不渲染，不显示 0**
- [ ] 订阅计划：`item.selling_plan_allocation` 存在时输出计划名 + 频率；不渲染「无」
- [ ] 物流提示（§6.4，行级）：读 `item.product.metafields.logistics.shipping_class`，值为 `Oversized` / `Freight LTL` 时输出徽标 + `needs_liftgate` / `lead_time_days` 文案；未配置 → 整块不渲染
- [ ] 数量控件：`<button data-cart-qty="-1">` / `<input type="number" name="updates[]" value="{{ item.quantity }}" min="0">` / `<button data-cart-qty="1">`；数量为 0 = 移除（符合 Shopify 语义）
- [ ] 无 JS 降级：整个行项列表包在 `<form id="cart-form" action="{{ routes.cart_url }}" method="post" novalidate>` 内，保留 `updates[]` 与 `name="update"` 提交按钮（`.js` 门控下才隐藏）
  - `id="cart-form"` 是**跨 section 契约**：摘要卡的 Checkout 按钮靠 `form="cart-form"` 关联到它（两个 section 无法共用一个 form 元素，只能用 form 属性关联）
- [ ] `aria-live="polite"` 的播报容器放在小计旁（`data-cart-live`），内容由 JS 写入
- [ ] 空车分支：`cart.item_count == 0` → 渲染空态（见 T-1.6），**不进 for 循环**

#### T-1.3 `sections/cart-summary.liquid` 摘要卡 · 依赖：T-1.1

- [ ] `cart.item_count == 0` → **整个 section 输出空**（D-10）
- [ ] 卡片内容顺序：

```
Subtotal            {{ cart.items_subtotal_price | money }}
（有整单折扣时）Discounts   −{{ cart.total_discount | money }}
                    + 逐条 cart_level_discount_applications
Shipping & tax      运费与税费在结账时计算      ← D-5，商家可改文案
                    （cart.taxes_included 为真 → 「含税」表述）
─────────────────
Total               {{ cart.total_price | money }}
[ Checkout ]        ← 主按钮，品牌色
{{ content_for_additional_checkout_buttons }}   ← #3，不改品牌配色
[ Continue shopping ]  ← 次按钮，描边
```

- [ ] **不出现任何金额形式的运费**（C-6，SDD §6.4 红线）；文案由设置项 `shipping_note` 控制，默认值即上面那句
- [ ] `cart.taxes_included` 为真时，文案改为「价格已含税，运费在结账时计算」——**两个文案分开走两个 `t:` 键**，不在 Liquid 里拼字符串
- [ ] 整单折扣逐条渲染 `cart_level_discount_applications`（折扣名 + 金额），金额取负号；**金额为 0 的条目不渲染**
- [ ] Checkout 按钮 `<button type="submit" name="checkout" form="cart-form">`（若在 form 外）或放 form 内；禁用态在有未完成请求时置 `aria-busy`
- [ ] `sticky`：`position: sticky; top: calc(var(--header-height, 0px) + 1rem)`，移动端取消
- [ ] 设置项：`heading`（默认 "Order summary"）、`shipping_note`、`show_checkout_note`
- [ ] 下方可选一行小字：支付图标（`shop.enabled_payment_types` + `payment_type_svg_tag`），**商家可关**（F-3 条件性要求：输出就必须全彩官方 filter）

#### T-1.4 `sections/cart-summary-banner.liquid` 物流汇总条 · 依赖：T-1.2

- [ ] 循环 `cart.items` 判定：任一 `logistics.shipping_class` ∈ {`Oversized`, `Freight LTL`} → `has_oversized = true`
- [ ] 文案分档：仅 Oversized / 含 Freight LTL / 含 `needs_liftgate` 三种情况给不同句子（**逐条 `t:` 键带变量**，如 `{{ count }} item(s)`)
- [ ] 无超大件 → **section 输出空**（连包裹 div 都不要，避免空栅格行拉出 gap）
- [ ] 文案必须含「参考信息，最终运费与时效以结账为准」（SDD §6.4 验收线）
- [ ] `role="status"`，改数量后若判定结果变化需重新播报（JS 在 T-2.1 里一并处理）
- [ ] 视觉：浅色描边 + 警示图标（`assets/icon-*.svg` 既有图标集里选，无合适则自绘 24×24 单色）

#### T-1.5 `sections/cart-recommendations.liquid` 推荐位 · 依赖：T-0.2

- [ ] 服务端**先渲染 A**（商家设置的 collection，`limit` 默认 4）；`collection == blank` 或 `collection.products_count == 0` → section 输出空
- [ ] 设置项：`heading`（默认 "You may also like"）、`collection`、`products_to_show`（默认 4，上限 8）、`enable_personalized`（checkbox，默认 true）
- [ ] 卡片**复用 `snippets/product-card.liquid`**，不新写卡片样式；确认其 quick-add 在购物车页能正常工作（它派发 `cart:updated`，页头角标会跟着变）
- [ ] 排除已在车内的商品：服务端过滤 A 的列表（`cart.items` 的 product id 集合），JS 替换 B 结果后同样过滤
- [ ] B 路径（T-0.2 若未配 complementary，此路径等于未测）：`enable_personalized` 为真且有车内商品时，JS 取**车内第一个非耗材商品**的 id → `fetch('/recommendations/products?section_id=cart-recommendations&product_id=…&intent=complementary&limit=4')` → 返回 HTML 非空则替换网格；**失败/空 → 保持 A，不报错、不闪烁**（先隐藏再替换会造成 CLS，用 opacity 过渡）
- [ ] 移动端：横滑（`scroll-snap`），显示 1.2 张卡暗示可滑；桌面 4 列网格
- [ ] 标题层级：`<h2>`（页面唯一 `h1` 在 cart-lines 的「Cart」）

#### T-1.6 空态 · 依赖：T-1.2

- [ ] 位置：`cart-lines` 的空车分支内（不是独立 section）
- [ ] 内容：`<h1>{{ 'cart.title' | t }}</h1>` 保留（页面必须有 h1）+ 一句说明 + 主 CTA「继续选购」→ `routes.all_products_collection_url`
- [ ] 不显示摘要卡（D-10）、不显示物流条（T-1.4 自然为空）
- [ ] 推荐位仍在下方显示（§6.3 的补充建议在空车时同样有用）
- [ ] 空态不出现任何金额、不出现「你的购物车是空的」之外的伪造信息（不得加「快去抢购」类倒计时/库存话术）

### P2 交互

#### T-2.1 `assets/cart-items.js` · 依赖：T-1.2 / T-1.4

- [ ] **Custom Element** `class CartItems extends HTMLElement`，`customElements.define('cart-items', CartItems)`；标签挂在 `cart-lines` 的行项容器上
- [ ] `connectedCallback` 用 `AbortController` 绑定，`disconnectedCallback` 一次性 `abort()`（AGENTS.md §6，禁止全局 click 委托）
- [ ] 变更请求：`POST /cart/change.js?sections=cart-lines,cart-summary,cart-summary-banner`，body `{"id": item.key, "quantity": n}`，`Content-Type: application/json`
- [ ] 响应里 `sections` 逐块替换：用 `DOMParser` 解析后替换**对应 section 的内容节点**（不是整个 `#shopify-section-*`，避免编辑器/样式作用域问题）
- [ ] 替换后必须：
  - [ ] 重新派发 `document.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: cart.item_count } }))`（`cart-badge.js` 靠它同步页头角标）
  - [ ] 把新小计写入 `[data-cart-live]`（`aria-live="polite"`），文案走 `data-*` 里的 `t:` 模板，**不在 JS 里硬编码英文**
  - [ ] 焦点保持：被点的那行若仍在，焦点回到同 `item.key` 的按钮；若该行被删，焦点移到相邻行或空态容器（**不能丢焦点到 body**）
- [ ] 防抖：`<input type="number">` 输入 400ms 后提交；`+/-` 按钮立即提交但请求中禁用（`aria-busy`）
- [ ] 并发：同一行的进行中请求用 `AbortController` 取消（连点 + 不产生乱序覆盖）
- [ ] 失败态：还原输入值 + 行内错误提示（`role="alert"`），不整页崩
- [ ] 移除按钮：`quantity: 0`；成功后若购物车为空，**整页 location.reload()**（空态布局与栅格差异大，局部替换不划算 —— 这是有意的取舍）
- [ ] 无 JS：`.js` 类不存在 → 整个 `cart-items` 不定义、按钮的 AJAX 属性不生效、原生表单照常工作（表单提交后整页刷新）
- [ ] `defer` 加载，挂在 `cart-lines` section 内（不是 `theme.liquid` —— 只有购物车页需要）

### P3 验收

#### T-3.1 三端 + 无 JS + 无障碍 · 依赖：全部前置

- [ ] 桌面 1440 / 平板 990 / 移动 375 各走一遍：加 2 件（1 主机 + 1 配件）→ 改数量 → 移除 → 加回 → 结账
- [ ] **无 JS**（Chrome 禁 JS）全流程可完成：改数量、移除、结账（整页提交）
- [ ] 强制项逐条验：折扣显示（#2）、加速结账按钮出现且配色未改（#3）、订阅计划行（#17）、单位价（#19）
- [ ] 物流：纯小件车 → 汇总条与行级提示**完全不出现**；含 `Freight LTL` → 两处都出现且文案一致
- [ ] 推荐位：未配 complementary → 显示设置集合；配了 → 显示 API 结果；车内商品不出现在推荐里
- [ ] 键盘：Tab 顺序 = 视觉顺序；数量输入框与按钮均可达；移除按钮可访问名含商品名
- [ ] 屏幕阅读器：改数量后小计变化被播报（`aria-live`），且**不重复播报**（多次替换只播一次）
- [ ] Lighthouse（移动）：Performance ≥ 60、Accessibility ≥ 90（SDD §8.1/§8.2 准入线）
- [ ] 编辑器中：四个 section 可增删排序、移动端预览正常、拖动 section 顺序后**栅格不错位**（§0.3 的 class 定位方案的关键验收）
- [ ] `shopify theme check` 0 Error；`python3 tools/check-locale-keys.py` 通过

---

## 3. 验收锚点对照

| 任务 | pages-ui | SDD | 官方强制项 |
| --- | --- | --- | --- |
| T-0.1 | — | §3 事实基线 | Ajax Cart API / recommendations / unit price |
| T-0.2 | §10 数据源 | §9 演示店 | — |
| T-1.1 | §10 整体 | §4.1 第 10 行 | Sections Everywhere |
| T-1.2 | §10 cart-lines 行 | §7.1 #2 #17 #19、§6.4 | Discounts / Selling plans / Unit pricing |
| T-1.3 | §10 cart-footer 行 | §7.1 #2 #3 | Accelerated checkout / Discounts |
| T-1.4 | §10 cart-summary-banner 行 | §6.4 | — |
| T-1.5 | §10 cart-upsell 行 | §6.3 | — |
| T-1.6 | §10 状态要点 | §8.2 | — |
| T-2.1 | §10 状态要点 | §8.1、§8.2 | — |
| T-3.1 | §10 全节 | §7.1、§8.1、§8.2 | 全部 |

---

## 4. 逐项验收清单（可勾选，提交前跑）

- [ ] 纯小件购物车：无物流提示（汇总条 + 行级均无）
- [ ] 含 Freight LTL：汇总条出现 + 该行行级提示出现
- [ ] 未配物流 metafield 的商品：不产生空模块
- [ ] 有折扣：行内原价划线 + 实付价 + 折扣名
- [ ] 有订阅计划：行内显示计划名与频率
- [ ] 有单位价：行内显示 `/ L` 之类单位
- [ ] 空车：不显示摘要卡、显示空态 + 继续选购 CTA
- [ ] 推荐位：车内商品不重复出现
- [ ] 改数量：页头角标同步、小计播报、无整页刷新
- [ ] 禁 JS：全流程可用
- [ ] 运费：全站购物车页不存在任何金额形式的运费

---

## 5. 级联文档改动（2026-11-02 已执行）

| 文件 | 改动 | 状态 |
| --- | --- | --- |
| `dev-docs/pages-ui.md` §10 | 线框图重画为两栏；section 表保留 4 行但改名（`cart-lines` / `cart-summary` / `cart-summary-banner` / `cart-recommendations`）；状态要点补「空车不显示摘要卡」 | ✅ 2026-11-02 已执行 |
| `dev-docs/sdd.md` §4.1 第 10 行 + 版本行 | 职责列补「两栏版式 / 空态 / 耗材补充建议 / 订阅计划 / 单位价」；版本行升 **v4.18** 并留痕（功能边界未变） | ✅ 2026-11-02 已执行 |
| `locales/en.default.json` | 新增 28 个 `cart.*` 键：`title` `empty_desc` `continue_shopping` `summary` `subtotal` `discount` `total` `shipping_note` `tax_included_note` `checkout_note` `remove_label` `quantity_label` `quantity_decrease` `quantity_increase` `unit_price` `selling_plan` `line_discount` `oversized_banner` `freight_banner` `liftgate_note` `lead_time` `recommendations` `in_stock` `update_cart` `note_label` `note_placeholder` `backorder` `partial_backorder` | 随代码 |
| `locales/en.default.schema.json` | 新增 `general.cart_*` schema 文案键 | 随代码 |
| `AGENTS.md` §2 命令 | 无需改 | — |

---

## 6. 本清单**不做**的事（防范围蔓延）

| 不做 | 理由 |
| --- | --- |
| ~~购物车抽屉 / 侧滑面板~~ | ✅ 2026-11-02 已实现（原计划的"独立清单"直接并进来了），见 §7.6 |
| 免邮进度条 | D-5 已弃。阈值与真实运费规则脱节即误导 |
| 折扣码输入框 | D-11。提交路径需另核官方文档，且结账页已有 |
| 伪造运费 / 预估税费金额 | SDD §6.4 红线 |
| 保存稍后购买 / 收藏移入购物车 | 依赖 App 或需自建持久化，超出主题边界 |
| 赠品留言 / 订单备注 | 非强制项，且与「不伪造」无关但会拉长表单；如需要另立 |
| 交叉销售定价（买赠、满减、捆绑折扣） | SDD §7.2 明令禁止（App 功能） |
| 库存紧迫话术（「仅剩 2 件」） | 伪造数据红线 |
| 同类主机推荐（照参考图的做法） | D-4 已定耗材/配件路径，同类主机转化低 |
| `sections/cart.liquid` 兼容层 | 直接删除。主题未上架，无历史商家 |

---

## 7. 实现记录（2026-11-02）

### 7.1 文件

| 文件 | 动作 |
| --- | --- |
| `templates/cart.json` | 重写为四 section（banner / lines / summary / upsell） |
| `sections/cart-lines.liquid` | 新建（行项列表 + 空态 + 无 JS 表单） |
| `sections/cart-summary.liquid` | 新建（摘要卡 + 结账 + 加速结账 + 支付图标） |
| `sections/cart-summary-banner.liquid` | 新建（大件物流汇总条） |
| `sections/cart-recommendations.liquid` | 新建（集合回退 + complementary 替换） |
| `snippets/cart-line.liquid` | 新建（单行渲染，抽屉将来复用） |
| `assets/cart-items.js` | 新建（`<cart-items>` Custom Element） |
| `assets/cart-recommendations.js` | 新建（个性化替换层） |
| `assets/critical.css` | 追加购物车两栏栅格（模板级，跨四个 section） |
| `locales/en.default.json` | `cart.*` 新增 24 键 |
| `locales/en.default.schema.json` | 新增 4 组 section 文案键 |
| `sections/cart.liquid` | **删除**（Skeleton 原表格式模板，无引用） |

### 7.2 静态检查

- `shopify theme check --path .` → **77 files, 0 offenses**
- `python3 tools/check-locale-keys.py` → 两套命名空间全命中（57 个 .liquid）
- `python3 tools/check-tag-balance.py` → 剩余 8 处全部是 `compare-*` 的既有误报（doc 注释里的尖括号与自定义元素），与本次无关
- `node --check` → 两个脚本语法通过

### 7.3 实现中修掉的三个问题（供后续页面参考）

1. **单列网格的隐式列**：`.shopify-section > *` 全局是 `grid-column: 2`；把 section 内网格改成单列后，这一条会创建隐式第二列、内容整体右移一列宽。**改 `--content-grid: 1fr` 必须同时把子元素改回 `grid-column: 1`**，少一条就错位。
2. **空 section 的旧节点残留**：局部刷新时，若某个 section 现在渲染为空（例：大件被移出，物流条整节不输出），返回的是空字符串——只跳过替换会让旧提示条赖在页面上。必须**主动摘掉**目标节点。
3. **推荐位空网格**：集合里的商品可能已全在车内。先数一遍可用项，为 0 则整个模块不输出，避免标题下面挂一片空白。
4. **grid 里的 sticky 粘不住**：`position: sticky` 的元素必须比它的包含块矮。grid item 默认按内容收缩，摘要卡的容器高度正好等于卡片本身，于是滚动时直接跟着走。两处都要改：包装层 `align-self: stretch`（撑满整行）+ 卡片 `align-self: start`（不被拉伸）。缺一条就失效，且**没有任何报错**。

### 7.3.1 栅格与吸顶的实测（无头 Chrome + 真实 stylesheet 拼接）

| 视口 | main | 行项列 | 摘要列 | 文档宽 / 视口 | 横向溢出 |
| --- | --- | --- | --- | --- | --- |
| 1440 | 1352 | 960 | 360 | 1440 / 1440 | 无 |
| 500 | 452 | 452（单列） | 452（单列） | 500 / 500 | 无 |

吸顶几何（1440，滚动 700）：`summaryH=340`、`sectionH=513`、`computeStyle.position=sticky`、`alignSelf=start`，卡片在父容器范围内粘住、到边界后随行项离开——符合预期。

### 7.3.2 官方 §7「Cart page requirements」逐条对照

来源：shopify.dev → Themes → Store requirements → §7 Pages → Cart page（2026-11-02 核对原文）。

| 官方要求（原文要点） | 实现 |
| --- | --- |
| 展示 `line_item` 的 `title` / `unit_price` / `image` / `final_price` / `quantity` / `options_with_values` | `snippets/cart-line.liquid`：标题、单位价、图、行价、数量输入、选项值逐项输出 |
| `cart.total_price` 必须可见 | `cart-summary` 的 Total 行 |
| 必须用 `cart.taxes_included` 给出含税提示 | `cart-summary` 二选一文案（含税 / 结账时计算） |
| 必须有提交购物车表单的结账按钮 | `<button type="submit" name="checkout" form="cart-form">` |
| 数量更新后必须刷新**所有**行项以保证总价正确 | Section Rendering 整块替换 `cart-lines` + `cart-summary`，不是逐个改数字 |
| 必须能改每行数量 | `−` / 输入框 / `+`，44px 触摸目标 |
| 空购物车必须显示消息 | `cart-lines` 空态分支 |
| 必须支持 cart notes | `.cart-lines__note` 的 `textarea[name="note"]`，无 JS 随表单提交、有 JS 失焦即存 |
| 必须支持 selling plans | `item.selling_plan_allocation` → 行内计划行 |
| 必须支持自动折扣显示 | 行级 `line_level_discount_allocations` + 整单 `cart_level_discount_applications` |
| 加速结账按钮必须默认启用、品牌色不可改 | `content_for_additional_checkout_buttons` 原样输出，无任何颜色覆盖 |
| Unit pricing | `item.unit_price_measurement` |

> **补记（同日）**：初版漏了两条——`options_with_values` 只显示了 `variant.title`（等价但不合规），以及 cart notes 完全没做（原清单 §6 把它误列为「不做」）。两处已修：选项值逐项输出并过滤 `Default Title`；备注用 `name="note"` 走平台约定字段，`/cart/update.js` 保存时必须带上全部行数量（该接口是替换语义，只传 note 会清空行项）。

### 7.6 购物车抽屉（2026-11-02 追加）

| 文件 | 动作 |
| --- | --- |
| `sections/cart-drawer.liquid` | 新建：改用 **布局级静态 section**（`theme.liquid` 里 `{% section %}`），因为局部刷新需要 `section.id`，snippet 拿不到 |
| `assets/cart-drawer.js` | 新建：`<cart-drawer>` 自定义元素 |
| `assets/cart-line.css` | **从 `cart-lines.liquid` 抽出**——行项同时出现在购物车页和全站抽屉，section 的样式块抽屉拿不到；按 AGENTS.md §6「跨 section 全局功能」的判据该独立成文件 |
| `snippets/cart-entry.liquid` | 入口 `<a>` 加 `data-cart-drawer-open`；**链接本身保留**，无 JS 就跳 `/cart` |
| `layout/theme.liquid` | 末尾 `{% section 'cart-drawer' %}`（放在 back-to-top 之后） |

**实现要点**

- `<dialog>` + `showModal()`：焦点锁定、背景 `inert`、`Esc`、`::backdrop` 全由平台给，不手写焦点陷阱；配 `scroll-lock` 属性用 critical.css 里已有的滚动锁。
- 打开即刷新：`?sections=<自身 id>` 取回本 section 渲染，替换 `[data-cart-section]`（连小计与按钮一起换）。
- 加购自动打开：监听 document 的 `cart:added`（quick-add 派发，项目既有约定）。
- 抽屉内改数量/删除复用 `cart-items.js`；脚本**由本 section（抽屉）全站加载**，购物车页不再单独引入（2026-11-03：只在 cart-lines 引入时，商品页/集合页上的抽屉是个没有行为的空元素）。
- **结构约束（2026-11-03）**：`<cart-items>` 必须在**外**、`[data-cart-section]` 在**内**。反过来（旧做法）会让「改数量 → 整块替换」把发出请求的元素自己也换掉：监听器、按行去重表、在飞的请求一起丢。外壳用 `display: contents` 退出布局。
- **兜底**：`?sections=` 拿不到结果时用 `/cart.js` 核对 `item_count`，与标题计数不符就跳 `/cart` —— 绝不让顾客加了东西却看到抽屉写着"购物车是空的"。
- 关闭后焦点还给触发按钮；点遮罩关闭（`event.target === dialog`）。

**移动端形态（2026-11-02 追加，对齐集合页筛选面板）**

- **≤ 989.98px 从底部上滑**，不是右侧滑出。断点取 989.98 而不是常见的 749：筛选面板的 `_mobileQuery` 是 `(max-width: 989.98px)`、导航的移动形态在 990 换挡。抽屉若在 750–989px 仍走右侧，会出现「页头是移动形态、抽屉是桌面形态」的错位。
- 参数与 `.facets__dialog` 逐项一致：通栏 `100vw`（必须显式覆盖 `max-inline-size`，UA 对 `dialog:modal` 默认 `max-width: calc((100% - 6px) - 2em)`）、`border-radius: 16px 16px 0 0`、`max-block-size: 85vh`、`animation 0.28s ease-out`、遮罩 `rgb(0 0 0 / 40%)`、抓手 40×5。
- **下拉收起**：抓手与头部行是热区（`touch-action: none`），越过「抽屉高 30% / 至少 120px」即关闭，未过则弹回；`prefers-reduced-motion` 下不播回弹过渡。列表区不参与拖拽——那里的手势属于滚动。拖拽松手会补一个 click，用 `_dragEndedAt` 挡掉，避免"拽回一半顺手把抽屉关了"。
- 实测（无头 Chrome，等动画 `finished` 后取值）：500 宽 `w=500 x=0 y=149 h=751 bottom=900=v h`、`dialogScroll=751/751`（dialog 自身无滚动条）、列表 `462/402`（只有列表滚）、`html.overflowY=hidden`；900 宽同样 `x=0 / w=vw / bottom=vh`；1440 宽仍是 `w=416 x=1013` 的右侧抽屉、抓手下高 0。

**风险（未实测）**：`?sections=` 对 layout 里的静态 section 是否有效，没有实机验证过。无效时会走上面那条 `/cart.js` 兜底，表现为"加购后跳到购物车页"而不是"抽屉打开"。

### 7.4 未验证（需 `shopify theme dev` 实机确认）

- [x] 两栏栅格：mock 实测 1440 / 500 两档，列宽与横向溢出均符合预期（见 §7.3.1）
- [x] 摘要卡吸顶：几何测量确认 sticky 生效、活动范围正确（见 §7.3.1）
- [ ] 真实主题下的观感（页头实际高度、字体、Coppice Noir 深色预设）
- [ ] 数量增减的局部刷新：Section Rendering 返回结构是否与 `_render` 的假设一致（C-16 待实测）
- [ ] 焦点恢复：+/- 连点、整行删除后焦点落到标题
- [ ] 数量超限的真实 422 响应（`description` 文案是否即顾客想看的句子）、晃动动画观感
- [x] C-15 已实测结案：允许超卖时 `available` 仍为 true，代码用 `inventory_policy != 'continue'` 排除（2026-11-02）
- [ ] complementary 路径：未配 Search & Discovery 时的真实返回
- [ ] Lighthouse 移动端三项（Performance ≥ 60 / Accessibility ≥ 90）
- [ ] 编辑器内拖动 section 顺序后栅格是否稳定
- [ ] 移动端抽屉下拉收起的手感：真机（iOS/Android）上抓手与头部行的手势是否被浏览器滚动/下拉刷新抢走
- [ ] 移动端吸顶页头的 CLS：地址栏收起/展开时页头高度跳变的影响（原 O-1 遗留项，现在移动端也吸顶，必须复测）

### 7.5 与清单的偏差

- locale 键从 23 增到 **24**：实现时补了 `in_stock`（库存徽标文案）与 `update_cart`（无 JS 的提交按钮），删掉了规划里未被使用的 `price_was`（`<s>` 本身有语义，再加隐藏文案反而重复播报）。
- **超卖行级提示（2026-11-02）**：`inventory_policy = continue` 且 `inventory_quantity < 本行数量` 时输出黄胶囊
  （全超卖 `Backordered — ships when restocked` / 部分超卖 `{{ available }} in stock · rest backordered`）。
  三个前提缺一不可：`inventory_management` 非 shopify 的商品不跟踪库存，`inventory_quantity` 恒为 0，
  只判 policy 会把它们全部误标成缺货。与 In stock 徽标互斥，一行里不会同时出现。
- **数量失败态（2026-11-02）**：`/cart/change.js` 返回 422 时，行加 `data-cart-error` —— 数量框红描边、
  行小计转红、晃动 1 秒（`prefers-reduced-motion` 下不晃），并在信息区插一条 `role="alert"` 的说明。
  文案优先用 Shopify 返回的 `description`（"You can only add 25 … to your cart"），拿不到才退回通用文案。
  红色保留到顾客下一次操作该行，不自动消失。

- **版式改为四列表格（2026-11-02 刘工参考图）**：桌面「Product / Price / Quantity / Total」+ 表头分隔线 + 圆角容器；
  行内 5 个平级子项直接落在 grid 列上（不再套 body/numbers 层）。列宽写死 96 / 1fr / 120 / 132 / 100 px——
  用 auto 时一行有折扣一行没有，整张表就左右错位。窄屏退化为卡片，数量与小计并排、小计贴右。
  表头 `aria-hidden`，每个数值列自带 visually-hidden 列名，窄屏无表头时仍可理解。
- 行内右侧由 5 项（价格 / 单位价 / 数量 / 小计 / 移除）压到 4 项：移除并入数量行（`.cart-line__controls`）。
  移除与数量都是 44px 触摸目标，各占一行等于每行白送 44px + 间距；窄屏用 `space-between` 把两者拉到两端防误触。
- 规格胶囊（`cart-line__meta li`）参数逐值对齐商品卡 `.product-card__tag`，hover 取 `.product-card:hover .product-card__tag` 同一组值，触发范围是整行。

- T-1.2 的「规格副标题数据源」按 `variant.title` → `spec.power_source` → `cutting_width_mm` / `bar_length_mm` 的顺序取值，**每个字段最多出现一次**，与集合页商品卡同一口径。
