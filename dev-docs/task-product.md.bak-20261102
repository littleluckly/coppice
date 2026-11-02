# 产品页（product.json）开发任务清单 — task-product.md

> **性质**：SDD 驱动开发的页面级任务清单（v1.0）。拆解自 `dev-docs/pages-ui.md` §3（产品页工单）与 `dev-docs/sdd.md` 对应章节（§6.2–§6.6 / §7.1 / §8.1 / §8.2 / §8.3），并以产品页效果图 v2（`dev-docs/local-assets/效果图/效果图-产品页-2.png`）为**视觉参照**。**不引入未经拍板的新决策**。
> **权威关系**：与 SDD / pages-ui 冲突时，以 `dev-docs/sdd.md` 为准。效果图与已核实事实冲突时，以事实为准；差异逐条记入 §2 并在 §6 说明代价。
> **范围**：`templates/product.json` + 其下 section / snippet / JS / locales 键 + `build_mower_csv.py` 新增对比价列。**不含** header-group、footer-group、购物车抽屉、移动端固定底栏、搜索页、对比页本体（对比页仅做入口联动冒烟）。
> **整理日期**：2026-10-28 ｜ 状态标记约定：`✅ 日期` 完成 / `🔄` 代码完成待验 / `⛔` 阻塞

---

## 1. 拍板记录（2026-10-28，Grill Me 12 问 + 5 项默认，刘工裁定）

| # | 议题 | 裁定 |
| --- | --- | --- |
| 1 | 权威关系 | **SDD 为准**，效果图仅作视觉参照；冲突逐条记入 §2 `与效果图差异`，不靠效果图改事实 |
| 2 | 折扣（`Save 17%`） | **做真的**：21 款主机补 `Compare-at price`（取值 = 现 `Price`，即已核实的 MSRP），现价 = MSRP × 0.95 **四舍五入取整到整数美元**（2026-10-28 刘工定）。**21 款主机显示折扣全部正好 5%**，脚本已按此重生成并断言校验（T-0.2）。**配件不打折**（同日拍定 A 方案）：配件 `Compare-at price` 留空 → 不出徽标，理由见 T-0.2 附表 |
| 3 | 评分星级 | **v1.0 不做**。产品页不渲染星级；口径与 `snippets/product-card.liquid` 一致（仅当存在官方 `reviews.rating` 时才有星，演示店无此数据 → 不出现）。judge.me 已由刘工于 2026-10-28 在后台卸载 → `product.json` 里的 `apps` 块只剩清理值（T-0.3） |
| 4 | 结构 | **不做 tab，也不做锚点条 —— 纯垂直平铺 + 滚动入场动画**（2026-10-28 二次拍板，推翻同日早先的"sticky 锚点条"方案）。理由不变：全量规格不被折叠、无 JS 可读、不会出现两个空 tab；锚点条被判定为**多余的一层导航**——只有 3 项、且紧跟在首屏产品图下方，实际滚动距离很短，用户不需要它来回跳 |
| 5 | 移动端固定底栏（Home/Shop/Account/Cart） | **v1.0 不做**。不在 22 项强制矩阵内；与既有 sticky 页头抢屏幕高度；跨 4 个页面级的选中态与购物车计数联动属于全局组件，若要做单独立项 |
| 6 | 两个 "Frequently Bought Together" | **拆两块并改名**：耗材区 → `Recommended Supplies`（数据驱动 `acc.consumables`）；四张整机 → `Similar Mowers`（官方 related 推荐）。**弃用 "Frequently Bought Together" 名称**——该词是购买关联算法语义，主题无订单关联数据，用了等于暗示不存在的能力（与「伪造库存紧张」同类问题）。**2026-10-28 追加**：两块拆成**两个独立 section、各占不同位置**（互补区紧跟买盒、耗材区在规格表之后），不再用 if/else 挤在同一处 |
| 7 | 耗材加购 | 单卡 `Add` + 底部 `Add all N items`（一次 `add` 多行）；**N = 1 时不出现底部按钮**；**不做捆绑折扣**（红线：买赠/捆绑定价不实现） |
| 8 | 对比入口语义 | **视觉照效果图（方框），DOM 用 `<button aria-pressed>`**（SDD §6.2.2 拍板不变） |
| 9 | 物流卡与信任行 | 物流卡**按 `shipping_class` 只出一档**（效果图双档并列是错的）；信任行三项：保修读 `spec.warranty_months`（无值不渲染）；运费门槛与退货政策**做成主题设置项由商家自填**（留空不渲染），**绝不写死** |
| 10 | 买盒三条 bullet 参数 | **不新增 metafield**。三条取自必填字段：切割宽度 / 动力（汽油机取 `displacement_cc`，电池机自动取 `power_w`）/ 驱动方式 → 21 款主机永不缺行 |
| 11 | 面包屑 | 做。仅在 `collection` 上下文存在时出三级带链接；直接打开商品页出两级纯文本。**禁止用 `product.collections.first`**（商品挂多集合时会指错分类） |
| 12 | 交付形态 | 本文件。格式对齐 `task-collection.md`，**按刘工要求不含人日估算与累加链** |
| D1 | 主图导航 | 桌面：左侧缩略图列 + 左右箭头；圆点**仅移动端**。效果图三套并存视为冗余，不照抄 |
| D2 | 变体选择器 | 照做（`product.options_with_values`）；演示店 21 款全为 `Default Title` → **页面永不出现**，验收靠自建测试商品 |
| D3 | 支付 | 加速结账 = `form` 的 `payment_button` 过滤器；分期横幅 = `form` 的 `payment_terms` 过滤器，**金额与资质全由平台渲染，主题不编数** |
| D4 | 单位换算 | 一律走 `snippets/spec-value.liquid`，产品页不自行换算 |
| D5 | JS 形态 | 新增交互一律 Custom Element + `<dialog>`；不写全局事件委托、不用 jQuery |

---

## 2. 与效果图的差异（拍板后的口径差，验收时以此为准）

| # | 效果图元素 | 实际做法 | 差异原因 |
| --- | --- | --- | --- |
| 1 | `Compatible with 40V Platform` 卡 | 卡保留，但**读 `platform.battery_platform`，空值整卡不渲染**——演示款 NB-21P 是汽油机（`battery_platform` 为空），该卡在演示店不出现 | 效果图把电池卡贴在油机上，属数据错误 |
| 2 | `⭐4.9 (126)` + `Reviews` tab | 均不渲染 | 无评论数据源；依赖 App 撞红线（拍板 3/4） |
| 3 | `Overview / Specifications / What's Included / Reviews` 四 tab | **纯垂直平铺，无 tab、无锚点条**；**tab 名直接复用为分块标题**：规格表 = `Specifications`、耗材块 = `Supplies`（描述块 `Overview` 已于 2026-10-28 移除，见 T-2.5）。区块进视口时从下方 24px 淡入（`data-reveal` + `reveal-on-scroll.js`） | `What's Included` 无 metafield；`Reviews` 无数据；锚点条在 2026-10-28 二次拍板中被砍（拍板 4） |
| 4 | 两个 `Frequently Bought Together` | `Recommended Supplies` + `Similar Mowers` | 命名重复且语义不符（拍板 6） |
| 5 | 耗材三张卡：刀片 / 2L Oil / Engine Oil | 只渲染 `acc.consumables` 里实际挂载的（NB-21P = 1 件刀片）；机油类商品**不做**（已拍板） | 无数据 + 品类已否决 |
| 6 | `Shipping & Delivery` 同时列 Parcel 与 Freight | 只出当前商品的 `shipping_class` 一档 | 字段是单值枚举（拍板 9） |
| 7 | `30-day returns` / `Free shipping over $99` | 由主题设置项提供，**留空则不渲染** | 无对应字段，写死 = 替商家承诺 |
| 8 | `$699 / Save 17% / $499` | 划线价来自 `Compare-at price`（= MSRP），现价 = MSRP × 0.95 取整；百分比由模板算（`compare_at > price` 才算） | 不编定价（拍板 2） |
| 9 | 副标题 `21 in. Push Mower · 166 cc` | 由 spec 拼装：切割宽度 · 操作方式 · 排量/功率，缺值自动跳项 | 无副标题字段，拼装优于新增字段 |
| 10 | 移动端固定底栏 | 不实现 | 拍板 5 |
| 11 | `Quantity` 行被 Add to Cart 压住 | 正常两行排布 | 效果图自身缺陷 |
| 12 | 桌面缩略图列 + 箭头 + 圆点 | 圆点只在移动端 | 拍板 D1 |

---

## 3. 强制项覆盖表（本页需自证，22 项中属产品页的 11 项）

| # | 强制项 | 本页落点 | 验收方式 |
| --- | --- | --- | --- |
| 1 | Sections Everywhere | 全 JSON 模板 + 每块可增删拖动 | 编辑器内逐 section 增删不报错 |
| 3 | Accelerated checkout | `form` 的 `payment_button` 过滤器，品牌色不改 | 开发店实测按钮渲染 |
| 6 | Image focal points | 画廊 `image_url` 走焦点裁剪 | 后台设焦点后主图不裁偏 |
| 7 | Social sharing images | 复用 `snippets/meta-tags.liquid`（`page_image`） | 源码含 `og:image` |
| 12 | Pickup availability | 变体门店可挂性模块 + `?section_id` 局部刷新 | 有自提门店时可见 |
| 13 | Related recommendations | `product-recommendations`（`intent=related`）→ `Similar Mowers` | 无推荐时不渲染空壳 |
| 14 | Complementary recommendations | 官方 `intent=complementary`，作耗材区**退化路径**（见 §5 风险 5） | 留一款空耗材主机实测 |
| 15 | Rich product media | 画廊支持 image / video / external_video / model 四类 | 自建含 3D+视频的测试商品 |
| 17 | Selling plans | **未实现**（演示店无 selling plan，实现后无可验证路径）；购物车页显示不在本清单 | 见 §5 风险 13 |
| 18 | Shop Pay Installments | `form` 的 `payment_terms` 过滤器 | 平台资质存在时出横幅 |
| 19 | Unit pricing | `variant.unit_price_measurement` 渲染 | 测试商品设单位计价 |
| 20 | Variant images | 切换变体 → 主图联动到 `featured_media` | 多变体测试商品 |

> 21/22（`login_button` / `<shopify-account>`）属页头，不在本清单；2/5/8/9/10/11/16 属其他页面。

---

## 4. 任务分解

### P0 前置

#### T-0.1 效果图归档与文档级联

- [ ] 效果图纳入版本库：`dev-docs/local-assets/效果图/效果图-产品页-2.png`（已存在，v1 同日保留作历史对照）
- [ ] `pages-ui.md` §3 补记：锚点条替代 tab、`Recommended Supplies` / `Similar Mowers` 定名、物流单档、信任行设置化、面包屑口径 → 级联 SDD 版本号（`sdd.md.bak-YYYYMMDD` 先备份）
- [ ] `task-index.md` 依赖表追加一行：产品页 → `task-product.md`（当前该表只挂了 `task-header.md` / `task-footer.md`）

#### T-0.2 CSV 补对比价列 + 重导（拍板 2，2026-10-28 刘工定：**低 5%，取整**）

**定价规则（拍死）**：`Price(新) = round(MSRP × 0.95)` —— 四舍五入到整数美元；`Compare-at price(新) = MSRP(原 Price)`。折扣百分比由模板算，不落 CSV。

**21 款主机实测（已按规则算过，无一款偏离 5%）**：

| handle | MSRP | ×0.95 | 新价 | 显示 |
| --- | --- | --- | --- | --- |
| nb-21p | 579 | 550.05 | **550** | 5% |
| nb-21s | 599 | 569.05 | **569** | 5% |
| nb-22s | 519 | 493.05 | **493** | 5% |
| nb-21ph | 369 | 350.55 | **351** | 5% |
| nb-21bs | 749 | 711.55 | **712** | 5% |
| nb-21bp | 499.99 | 474.99 | **475** | 5% |
| nb-21b80 | 599 | 569.05 | **569** | 5% |
| nb-42t | 2399 | 2279.05 | **2279** | 5% |
| nb-42th | 2399 | 2279.05 | **2279** | 5% |
| nb-42z | 3799 | 3609.05 | **3609** | 5% |
| nb-42tc | 1999 | 1899.05 | **1899** | 5% |
| nb-t21 | 279.99 | 265.99 | **266** | 5% |
| nb-t27 | 229.99 | 218.49 | **218** | 5% |
| nb-t28 | 239.99 | 227.99 | **228** | 5% |
| nb-t40b | 249 | 236.55 | **237** | 5% |
| nb-t60b | 199.99 | 189.99 | **190** | 5% |
| nb-c16g | 199.99 | 189.99 | **190** | 5% |
| nb-c18g | 399.99 | 379.99 | **380** | 5% |
| nb-c20g | 729.95 | 693.45 | **693** | 5% |
| nb-c40b | 279 | 265.05 | **265** | 5% |
| nb-c80b | 429.99 | 408.49 | **408** | 5% |

**11 款配件：取整把小额价格放大了，4 款显示不是 5%**（这是数学结果，不是 bug）：

| handle | MSRP | ×0.95 | 新价 | 显示 |
| --- | --- | --- | --- | --- |
| nb-bl21 | 24.99 | 23.74 | 24 | **4%** |
| nb-bar16 | 29.99 | 28.49 | 28 | **7%** |
| nb-bar18 | 34.99 | 33.24 | 33 | **6%** |
| nb-ch18 | 23.99 | 22.79 | 23 | **4%** |
| nb-ch20 | 26.99 | 25.64 | 26 | **4%** |

> 其余 6 款配件（`bl22` / `bl42` / `bar20` / `ch16` / `tl095` / `b40`）取整后正好 5%。
>
> **2026-10-28 刘工拍定 A：配件不打折。** 配件 `Price` 保持原值、`Compare-at price` 留空 → 配件页不出徽标。上面 5 行仅作"为什么不能给配件打折"的证据留档，不是待办。

**已落地（2026-10-28，脚本与产物均已重生成）**：

- [x] `product_template.csv` 已随仓库走：`dev-docs/mower-import/product_template.csv`（刘工导出）；脚本 `TEMPLATE_PATH` 默认值改指向该文件 → **逐字列名校验常态生效**，本次运行输出"已逐字校验"
- [x] 列名确认为 **`Compare-at price`**（模板原文 `Price,Compare-at price,Cost per item,…`），已插在 `OFFICIAL_KEEP` 的 `Price` 之后，输出 **52 列**（官方 29 + metafield 23）
- [x] 定价用 `Decimal` + `ROUND_HALF_UP`（**不用浮点 `round()`**——它是银行家舍入，711.55 这类边界会飘）
- [x] `validate()` 三条断言已加，并**做过反向测试**：主机改回原价 → 拦；配件加对比价 → 拦；折扣改成 10% → 拦
- [x] 重跑产物：`mower-products-import.csv` 32 款 / 53 行；**21 款主机徽标全部 5%**，11 款配件无对比价；校验 0 错误 0 警告
- [ ] **待刘工执行导入**（本清单不代操作）：先导 pass1（商品 + 价格 + 对比价）→ 再导 `pass2-consumables.csv`（耗材反挂）。导入后抽查 3 款：`nb-21p`（应 $550 / 划线 $579）、`nb-42z`（$3609 / $3799）、`nb-bl21`（$24.99 无划线）
- [ ] 同步 `metafield-reference.md` §5：注明 `Compare-at price` 非 metafield、但属导入契约，取值 = MSRP，且配件留空

#### T-0.3 `templates/product.json` 清理 apps 块（拍板 3）

> **前提已满足**：刘工 2026-10-28 已在后台**卸载 judge.me** → 不再有后台回写风险，直接改文件即可。

- [x] 移除 `"1791511954cea426ef"` 节点（judge.me `review_widget`, `sample_data`）及其在 `order` 里的条目；保留 `main` 与 `compare-lookup` ✅ 2026-10-28（文件只剩 `main` + `compare-lookup`，`order` 同步）
- [ ] 改完在主题编辑器保存一次并**复核文件未回写**（若 App 已卸但缓存残留，可能再生成一次）
- [ ] 复核 `compare-lookup` 仍正常输出（`northbark-nb-21p` 有 `compare_group`，应产出数据岛）

### P1 共享件

#### T-1.1 `snippets/compare-button.liquid` — 产品页对比入口（拍板 8）🔄 代码完成 2026-10-28

- [x] `<button type="button" aria-pressed="false">` + 方框图标 + 文案，视觉比对效果图的 checkbox（CSS 画方框，**不用 `<input type="checkbox">`**）
- [x] 输出 `data-compare-group`（来自 `spec.compare_group`）；`compare_group` 为空 或 `compare_hidden == 'TRUE'` → **整块不渲染**
- [x] 接线复用 `assets/compare.js` 既有契约（`<compare-toggle>` 的 dataset：group/handle/title/url/image/max + 4 条 conflict 文案），**脚本零改动**
- [x] 与页头 `compare-entry` 的角标联动（由 compare.js 的 `compare:updated` 事件驱动，本文件无需额外接线）
- [x] 文案键 `products.product.add_to_compare` 落 `en.default.json`；`check-locale-keys.py` 0 错误
- [ ] **样式待接线**：`.product-compare*` 的方框样式写在 T-2.1 的 `{% stylesheet %}`（snippet 不能自带样式块）
- [ ] T-2.1 接线后 `OrphanedSnippet` 警告消失（当前 2 条属预期）

#### T-1.2 锚点条 —— ⛔ 已撤销（2026-10-28 二次拍板：改纯垂直平铺 + 滚动入场动画）

> 曾按"sticky 锚点条 + scrollspy"实现过一版（`section` + JS 全套都写完了），同日刘工看过页面后判定多余：
> 只有 3 项、且紧贴首屏产品图下方，滚动距离本来就短，多这一层反而像"页面里塞了个导航条"。
> **文件已删除**（`sections/product-anchor-nav.liquid` / `assets/product-anchor-nav.js`），
> 换成**纯垂直平铺 + 区块滚动入场动画**（见 T-1.4）。
> 保留的只有落点 `id`（`#product-overview` / `#product-specs` / `#product-supplies`）——它们现在没有页内导航引用，
> 但仍可作深链，留着不碍事。

#### T-1.3 `snippets/spec-bullets.liquid` — 买盒三条决策参数（拍板 10）🔄 代码完成 2026-10-28

- [x] 三条固定顺序：切割宽度（`spec-value` length_mm）→ 动力（`power_source == 'Battery'` 取 `power_w` 转 hp，否则取 `displacement_cc` 原样）→ 驱动方式（`drive_type` 枚举原样）
- [x] **链锯兼容**：无 `cutting_width_mm` 时第一条自动改用 `bar_length_mm`（图标与文案同步切换），不出现空条
- [x] 缺值跳项，不占位、不显示 0；三条全空 → 整个列表不渲染；`drive_type = N/A` 同样视为空
- [x] 图标固定 SVG，新增 4 个：`icon-spec-width` / `icon-spec-bar` / `icon-spec-engine` / `icon-spec-drive`（24×24、stroke 1.5、currentColor，与既有图标同风格）
- [x] metafield 一律写全路径，不 `assign` namespace 对象（Shopify 未把 namespace 当可赋值 drop，仓库内也无先例）

> **前置扩展（2026-10-28 完成）**：`snippets/spec-value.liquid` 新增 `displacement_cc` 与 `power_w` 两种单位类型——原先只有 length/weight/area，动力参数没有换算出口。
> **一处口径偏离待刘工确认**：`displacement_cc` **两种单位制都输出 cc**，不转 cu in。理由：北美 OPE 厂商规格表与买家语言一律用 cc（"166 cc OHV"），cu in 不出现在割草机/链锯语境；`metafield-reference.md` §A 的 "cc → cu in" 属纸面推演。点头后同步改该文档。

#### T-1.4 区块滚动入场动画（2026-10-28 二次拍板新增，取代锚点条）✅ 完成

- [x] `assets/reveal-on-scroll.js`：IntersectionObserver 状态机，命中即 `shown` 并解除观察（只播一次，不来回闪）；`rootMargin: 0 0 -12% 0` 让触发点比"刚露头"更靠内，观感跟手
- [x] 样式进 `assets/critical.css`（`[data-reveal-state='pending' | 'shown']`）：只动 `opacity` + `transform: translateY(24px)`，**不动盒模型 → 零 CLS**
- [x] **无 JS 不隐藏**：初始隐藏态只由 JS 写入 `data-reveal-state`，脚本没跑时区块正常显示，不会白屏
- [x] **首屏不参与**：初始化时已在视口 90% 内的区块直接标 `shown` 且不加过渡 —— 否则 LCP 元素会被自己藏起来（`main-product` 本身也不挂 `data-reveal`）
- [x] **尊重系统设置**：`prefers-reduced-motion: reduce` 下不注册观察器，CSS 也直接给终态
- [x] 挂载范围 4 处：`product-highlights` / `product-description` / `product-spec-table` / `product-supplies`（**仅当该商品有耗材时**）
- [x] `product-recommendations` 与"无耗材时的 supplies"**故意不挂**：内容由 JS 异步拉回，给空容器播动画会看到"先浮上空气泡、再塞进卡片"
- [x] 主题编辑器 `shopify:section:load` 后给新节点补 `shown`，避免重新注入的区块永远停在透明
- [ ] **观感待肉眼验收**：触发时机、位移量、时长（0.5s）必须真机滚一遍；静态 HTML 只能验到 `data-reveal` 属性在位

### P2 产品页 sections（按页面自上而下）

#### T-2.1 `sections/main-product.liquid`（重写 `sections/product.liquid`）— 面包屑 + 画廊 + 买盒 🔄 代码完成 2026-10-28

**级联**：`product.json` 的 `"main".type` 由 `product` 改为 `main-product`；旧 `sections/product.liquid` **已删除**（不留双份实现）。JSON 模板内已显式列出 6 个 block（preset 只在编辑器手动添加时生效，模板必须自带）。

- [x] **面包屑**（拍板 11）：`collection` 存在 → `Home / 集合名 / 产品名`；否则两级。**实测两场景**：`/collections/mower-popular/products/northbark-nb-21p` 出三级，直接打开出两级
- [x] **画廊**：≥1100px 左侧垂直缩略图列 + 左右箭头；<1100px 圆点（缩略图列同步横排）；断点处只出现一套导航（D1）
- [x] 媒体四类：`image` / `video` / `external_video` / `model`；非图片媒体走 `<template>` 延迟实例化，首次激活才建播放器；离场即暂停
- [x] 3D：仅在商品带 model 媒体时才加载 `cdn.shopify.com/shopifycloud/model-viewer-ui`（Shopify 官方组件，已 curl 验证 200）；`model_viewer_tag` 由平台输出
- [x] 首图 `fetchpriority="high"` + eager，其余 lazy；缩略图 `object-fit: contain`（不裁剪 = 焦点不会被裁掉，#6）
- [x] **变体选择器**：`has_only_default_variant` → 整块不渲染；变体数据以 JSON 下发（价格串是 Liquid `money` 的产物，JS 不自己拼货币格式）；切换变体 → 回写隐藏 id / 价格 / 按钮态 → 派发 `variant:change` → 画廊按 `mediaId` 切图（#20）
- [x] **价格区**：现价 + 划线 + `Save N%`（`compare_at > price` 才算）；`unit_price_measurement` → 单位计价行（#19），切变体时同步增删
- [x] **副标题**：spec 拼装，**分隔符前置**（后置会在末项缺值时留一个孤零零的「·」）；电池机 `power_w` 缺值退到 `battery_platform`
- [x] **描述摘要**：纯文本截断（默认 40 词，setting 可调 20–80）
- [x] **数量**：`<quantity-input>`，`min="1"`，无 JS 为原生 number
- [x] **加购**：`{% form 'product' %}` + `aria-live="polite"` 播报；无 JS 整页 POST `/cart/add`；成功后派发 `cart:added` + `cart:updated`（沿用 quick-add 契约，角标与飞入动画直接复用）
- [x] **加速结账**：`form | payment_button`（#3，不改品牌色）；**分期**：`form | payment_terms`（#18，无资质时不输出）
- [x] **自提**（#12）：`store_availabilities` 静态渲染 + `<pickup-availability>` 用 `?section_id=` 补拉，切变体后整体替换 `[data-pickup-block]`
- [x] **信任行**（拍板 9）：保修读 `spec.warranty_months`（满 12 整除出「N-year」，否则「N-month」，无值不渲染）；运费门槛 / 退货政策 = `trust_item` block 的纯文本，**留空即不渲染**，不写死
- [x] **对比入口**：`{% render 'compare-button' %}`
- [ ] **订阅计划**（#17 产品页侧）：未实现 —— 演示店无 selling plan，实现后无任何可验证路径，延到有测试商品时补（见 §5 风险 12）
- [x] schema：5 种 block（`spec_bullets` / `trust_warranty` / `trust_item` / `pickup` / `compare`）+ 5 个 settings；preset 带默认 block

> **实现偏差（有意，已写进 section 头注释）**：pages-ui §3 把「媒体 / 变体 / 数量 / 买按钮 / 分期 / 自提」都列为 block。实际只把**买盒外部可选项** block 化，表单内部固定顺序 —— `form | payment_button` 与 `form | payment_terms` 依赖 `{% form %}` 作用域内的 `form` 变量，block 化后商家一拖就会得到「表单套表单」；变体/数量被拖到提交之后则直接坏功能。
>
> **渲染冒烟发现并修掉的 3 个缺陷**（真页面上看出来的，不是静态检查能发现的）：
> 1. `21.0 in` / `166.0 cc` —— `round: 1` 把整数变成带 `.0` 的字符串。修在 `spec-value` 出口统一清洗 `.0 `（`10.5`/`1.3` 不受影响）。
> 2. 电池机副标题尾部多一个孤立「·」—— 分隔符后置写法在末项缺值时留下残渣。改前置。
> 3. `Rear-wheel drive drive` —— 驱动值本身含 "drive" 还加标签。改为**值含 "drive" 时不加标签**。

#### T-0.4 电池机 `power_w`：官方不公布 → 刘工拍定填「演示合成值」（2026-10-28 结案）

- 7 款电池机里原本 6 款 `spec.power_w` 为空（仅 `nb-c80b` 有官方 2500W）：`nb-21bs` / `nb-21bp` / `nb-21b80` / `nb-t40b` / `nb-t60b` / `nb-c40b`
- **2026-10-28 六款基线官方页逐个复核**（Ryobi RY401150US / RY40270 / RY40570、Greenworks MO40L4210 / ST60L254、Kobalt 80V 21"）：全部**只标电压/安时/转速，不公布额定功率**。第三方数字来源不合规，不采用
- **处置**：刘工拍定「编个数据填进 CSV」→ 值定义在 `build_mower_csv.py` 顶部 `DEMO_POWER_W`（21BS 1100 / 21BP 900 / 21B80 1600 / T40B 500 / T60B 700 / C40B 600），脚本与 `sources-and-notes.md` §4 双处标注「**不是厂商数据**」
- 影响：产品页第二条参数与副标题的动力位现在有值（W → hp 由 `spec-value` 换算），不再走 `battery_platform` 兜底
- ⛔ **上架真实店铺前必须替换为厂商值或整块删除** `DEMO_POWER_W`（删掉即自动回到「留空 + 电压兜底」）；不得把这六个数字写进商家文档或营销文案

#### T-2.2 `sections/product-highlights.liquid` — 信息卡带（合并 ①②③ 三个 section）🔄 代码完成 2026-10-28

> **合并理由**：三张卡在桌面同排、Key Specifications 跨两列、需等高对齐；跨 section 无法共享网格行（与 `sections/collection.liquid` 合并主体同一判断）。职责由 block 类型区分，仍满足 Sections Everywhere。

- [ ] **block `platform_compat`**：读 `platform.battery_platform`；空值 → **整卡不渲染**；非空 → "Compatible with {platform} Platform" + 说明句 + `View compatible tools →` 链到 block setting 选的集合（`collection` 类型设置）；无集合设置 → 只出文案不出链接
- [ ] **block `logistics`**：按 `shipping_class` **单档**渲染（`Parcel` / `Oversized` / `Freight LTL`）；叠加 `needs_liftgate`（尾板）、`assembly_required`（需组装）、`lead_time_days`（备货 N 天，`0` = 当日发）；四个字段全空 → 整卡不渲染；卡底小字「参考信息，以结账为准」
- [ ] 时效文案（3–5 天 / 7–14 天）走 section setting，**商家可改**，默认值仅作演示
- [ ] **block `spec_quickview`**：参数行 block（可增删排序 + 字段下拉白名单：cutting_width / displacement / power / weight / noise / bar_length / area / duty / operation / drive / warranty）；值经 `spec-value`；缺值跳行；卡内 2 列网格；**任何情况不显示 0**
- [ ] 桌面 4 列（`spec_quickview` 占 2 列），平板 2 列，移动 1 列；卡片等高
- [ ] 三种 block 全部删除 → section 自身不输出（不留空壳）

#### T-2.3 耗材区 + 互补区（**已拆成两个 section**，2026-10-28 二次拍板）🔄 代码完成

> 原先合成一个 section 用 if/else 二选一 —— 结果是"同一块位置"承担两种语义，标题还得跟着换。
> 现在拆开、各占页面不同位置：
> · `sections/product-supplies.liquid`（耗材）→ 排在 **Specifications 之后**
> · `sections/product-complementary.liquid`（互补整机）→ 排在 **概览之前、紧跟买盒**
> 两者**互斥**：有耗材 → 互补区整块不出；无耗材 → 耗材区整块不出。

**耗材区 `product-supplies`**

- [x] 主数据源 `acc.consumables`（`list.product_reference`）→ 卡片：图 + 标题 + 配件侧 `acc.fitment_note` + 价格 + `Add`
- [x] `fitment_note` 读**配件自己的** metafield（写在配件侧，主机不填）；空则不出现该行
- [x] 单卡 `Add` 复用 `<quick-add>`（它读整张表单的 FormData，卡内数量自然随单卡提交），成功态 + `aria-live` 播报
- [x] 底部 `Add all N items`：一次 POST 多个 `items`，**N ≤ 1 时按钮不出现**；**不做任何折扣/捆绑价**（红线）
- [x] 无耗材 → **整个 section 不输出**（不留空壳，也不再靠 `hidden` 属性兜着）
- [x] 标题默认 `Supplies`；`data-reveal` 常挂（内容由服务端渲染）

**互补区 `product-complementary`**

- [x] 仅当 `acc.consumables` 为空才渲染（与耗材区互斥），数据走 `/recommendations/products?intent=complementary`
- [x] 标题默认 **Pairs well with**（独立 locale 键，不再复用耗材区的 "Supplies"）
- [x] 卡片复用 `product-card`，空结果由 JS 连标题一起隐藏
- [x] **不挂 `data-reveal`**：内容异步拉回，给空容器播入场动画会"先浮空气泡再塞卡片"
- [ ] 批量加购（`Add all`）仍无实测条件：演示店每台主机只挂 1 件耗材，N 恒为 1

#### T-2.4 `sections/product-spec-table.liquid` — 全规格表 🔄 代码完成 2026-10-28

- [ ] **行定义与对比页同源**：复用 `snippets/compare-row-keys.liquid`（按 `compare_group` 取行序）+ `compare-row-label.liquid` / `compare-cell.liquid`（`as_text: true`），**不另建一份字段表**——避免产品页与对比页字段漂移
- [ ] 标记：`<table>` + `<caption>` + 首列 `<th scope="row">`；移动端转块级布局或横滑（横滑容器注意 §5 风险 3）
- [ ] `spec.spec_variance_note` 非空 → 表头提示按钮 `aria-expanded`，展开显示说明；空 → 不出现提示
- [ ] 缺值行不出现（**不显示 0、不显示空行**）；整表无行 → section 不输出
- [ ] `compare_group` 为空（如配件）→ 走完整 23 字段兜底行序，不崩

#### T-2.5 `sections/product-description.liquid` — 富文本 + 图（editorial 两栏）✅ 启用（2026-10-28 定稿）

> **最终做法**：**关掉买盒摘要**（`main-product` 的 `show_description: false`）+ **保留本 section 全文**。
> 页面上描述只出现一次，且出现的是富文本全文而不是截断纯文本。
>
> **重复的根因（重要，别再当成模板缺陷）**：演示数据里 `product.description` **只有 38 词左右**，
> 而买盒摘要是 `truncatewords: 40` —— 阈值比正文还长，摘要==全文，看起来当然重复。
> 真实商家写 2–3 段时，摘要是"导语"、Overview 是"正文"，两处并存本来是合理的信息分层。
> **若以后把演示描述写长**（≥120 词），可以把 `show_description` 重新打开，买盒就又有导语了。

- [ ] 左列 `product.description` 富文本（`rte` 类，标题层级从 `h2` 起，不与 `h1` 争位）；右列图片来自 section setting（`image_picker`，尊重焦点）
- [ ] 图片留空 → 单栏全宽；描述为空 → section 不输出
- [ ] 标题默认 `Built for a Cleaner, Healthier Lawn`（locale 键，可改/可清空）
- [ ] 移动端上下堆叠（先文后图）

#### T-2.6 `sections/product-recommendations.liquid` — `Similar Mowers`（强制项 13）🔄 代码完成 2026-10-28

- [ ] `<product-recommendations data-intent="related">` + `limits=4`；卡片复用 `snippets/product-card.liquid`（`sizes` 必传，4 列取 `'25vw/32vw/45vw'`）
- [ ] 推荐结果为空 → 整块（含标题）不渲染
- [x] 卡片自带对比勾选与快加，行为继承集合页（不重复实现）
- [x] **标题随品类自适应**：`compare_group` 非空（主机）→ `Similar mowers`；为空（配件/电池）→ `You may also like`。为此**去掉了该设置项的 schema `default`** —— 设置一旦有默认值，Liquid 里的兜底分支永远不会执行（踩过一次）
- [ ] 首屏外 → 图片 lazy

### P3 组装与文案

#### T-3.1 重写 `templates/product.json` + locales 键 🔄 代码完成 2026-10-28

- [ ] 顺序：`main-product` → `product-highlights` → `product-anchor-nav`（sticky，逻辑上跟随首屏）→ `product-description` → `product-supplies` → `product-spec-table` → `product-recommendations` → `compare-lookup`（**保持在末尾**，数据岛不阻塞渲染）
- [x] ~~锚点条位置与 scrollspy 目标顺序一致~~ —— 锚点条已移除，本项作废；改为核对 7 个 section 的垂直顺序（main → highlights → description → supplies → spec-table → recommendations → compare-lookup）
- [ ] 所有文案键落 `locales/en.default.json`（正文）+ `locales/en.default.schema.json`（编辑器）；`python3 tools/check-locale-keys.py` 退出码 0
- [ ] 每个 section 提供可用 preset，默认值即演示内容（不留占位符）
- [ ] 可选：`Product` JSON-LD（`offers` / `aggregateRating` 不伪造，无评分则不出该字段）；不阻塞验收

### P4 验收

#### T-4.1 产品页验收 🔄 部分完成 2026-10-28（自动化项已过，人工项待跑）

- [ ] `shopify theme check` 涉产品页文件 **0 Error**（`OrphanedSnippet` / `ValidScopedCSSClass` 已知误报除外，判定依据见 `bugs.md` 尾）
- [ ] **强制项 11 条逐条实测**（§3 表），3D/视频/多变体/订阅 4 项需自建测试商品（演示店全单变体、无 3D 素材）
- [ ] Lighthouse：Performance 桌面+移动 ≥ 60 准入 / ≥ 80 目标，LCP < 2.5s，INP < 200ms，CLS < 0.1；Accessibility ≥ 90 准入 / ≥ 95 目标——**实测值回填本清单**
- [ ] 六种商品状态逐个过：单变体 / 多变体 / 售罄 / 无电池平台 / 无耗材（走 complementary）/ 物流字段全空
- [ ] 无 JS：画廊可看、变体可切、可加购、锚点可跳、规格表完整
- [ ] 键盘：Tab 顺序 = DOM 顺序、无正 `tabindex`、`autofocus` 为零、对比按钮 `aria-pressed` 可播报
- [ ] 主流程冒烟：集合页 → 产品页 → 加入对比 → 加购（主机 + 耗材）→ 购物车 → 结账（SDD §8.3）
- [ ] 动态区域（加购结果、Add all 结果、变体切换、对比计数）`aria-live="polite"`
- [ ] 商品页 URL 无自拼查询参数；canonical 由平台输出

---

## 5. 风险与待实测（写清楚，别到时候才发现）

| # | 风险 | 影响 | 处置 |
| --- | --- | --- | --- |
| 1 | 3D 媒体依赖平台提供的 `model-viewer` UI 资源，主题侧不能引第三方 CDN | 强制项 15 只覆盖图片/视频，3D 不达标 | 实现前查官方文档确认资源入口；不可用 → 降级封面图 + "View in 3D" 链接，并在 `bugs.md` 记录判定 |
| 2 | Skeleton 无自提 UI，需自建 `<pickup-availability>` + `?section_id` 端点 | 强制项 12 不达标 | 复用采集端 `store_availabilities`；无门店 → 模块不渲染 |
| 3 | 规格表横滑容器在 grid/flex item 下永不触发滚动 | 「滚动条不出现、表格被裁」 | 给**横滑元素自身**加 `min-inline-size: 0`（`bugs.md` 已两次踩坑），不放祖先 |
| 4 | `product.json` 会被后台主题编辑器回写 | 手工改的 apps 块删除可能被覆盖 | judge.me 已卸载（2026-10-28），回写源已断；仍需「改完 → 编辑器保存 → 复核文件」走一遍 |
| 5 | complementary 作为耗材区退化路径 | 商家不配 S&D 互补品时，强制项 14 在演示店看不到 | 演示店**保留一款不填 `acc.consumables` 的主机**（建议非主推款）用于实测；商家文档说明两条路径 |
| 6 | 演示店 21 款全为 `Default Title` | 变体选择器、变体图切换无法在演示店验收 | 自建 1 款多变体测试商品（验收后隐藏/删除） |
| 7 | 对比价列引入后，脚本与后台数据可能不一致 | 页面折扣与实际定价不符 | 重导后抽查 3 款；`validate()` 断言 `compare_at >= price` 且回算 MSRP 误差 ≤ $1 |
| 8 | ~~锚点条与 sticky 页头叠高~~ **已消除**（2026-10-28 锚点条整体移除） | — | — |
| 9 | ~~对比价列名未经官方模板逐字校验~~ **已消除**（2026-10-28） | 列名写错 → 整批导入失败 | 模板已随仓库走（`dev-docs/mower-import/product_template.csv`），`TEMPLATE_PATH` 默认指向它，本次生成已打印"已逐字校验"；列名实为 `Compare-at price` |
| 10 | ~~5% + 取整在低价商品上被放大~~ **已定案**（2026-10-28 选 A） | 配件若打折会出现 4%/6%/7% 徽标 | 配件不打折、`Compare-at price` 留空；脚本 `validate()` 已加断言拦截"配件带对比价" |
| 11 | CSV 重导会顺带覆盖库存与图片 | 库存被打回 25、图片可能重复 | 导入时选 Overwrite existing products 前先确认；导入后抽查 3 款价格 + 图片数 |
| 12 | **多变体链路未实测**（演示店 21 款全 `Default Title`） | 变体选择、变体图切换、价格/按钮态更新、自提补拉四段逻辑只过了代码评审，没跑过真实多变体商品 | 建 1 款 2 变体测试商品（含变体专属图 + 变体专属价）跑一遍，实测后回填本节；未实测前不得在验收单上打勾 |
| 13 | **订阅计划（#17）未实现** | 有 selling plan 的商品加购不带订阅选项 | 需要 1 款挂订阅计划的测试商品才能验证渲染与加购；在此之前保持现状并在 §3 该行标注「未实现」 |

---

## 6. 代价说明（拍板换来了什么、丢掉了什么）

- **不做 tab**：换来规格全量可索引、无 JS 可读；丢掉的是「页面更短」的观感，长页靠锚点条缓解。
- **不做移动底栏**：换来不新增全局组件、不与 sticky 页头抢空间；丢掉的是效果图那种 App 式导航观感。
- **星级不做**：换来零 App 依赖、零伪造数据；丢掉的是社会证明——这个位置只能空着，直到商家自己装评论 App。
- **耗材区数据驱动**：换来精准适配（`fitment_note`）与一键加购；代价是**演示店只有 1 件耗材时视觉单薄**，且 FBT 式"多件组合"的观感消失。
- **物流单档**：换来不误导（一个商品只有一种发运方式）；丢掉的是「一张卡讲清全部物流档位」的信息密度。
- **面包屑限制在 collection 上下文**：换来永不指错分类；丢掉的是直接打开商品页时缺少中间层级。
- **全店 5% 折扣（取整）**：换来价格区有真实折扣、21 款主机徽标一致为 5%；丢掉的是主机线全线 5% 毛利。
- **配件不打折**：换来全店徽标一致（不会出现 4%/6%/7%）；丢掉的是配件的"促销感"，且配件页价格区比主机朴素——这是主动选择，不是漏做。

---

## 7. 编码完成记录（2026-10-28）

### 7.1 落地文件

| 任务 | 文件 |
| --- | --- |
| T-1.1 | `snippets/compare-button.liquid` |
| ~~T-1.2~~ | 已撤销：`sections/product-anchor-nav.liquid` 与 `assets/product-anchor-nav.js` **已删除**；改为 `assets/reveal-on-scroll.js` + `critical.css` 的 `[data-reveal-state]` 规则 |
| T-1.3 | `snippets/spec-bullets.liquid` + `assets/icon-spec-{width,bar,engine,drive}.svg` |
| T-2.1 | `sections/main-product.liquid` + `assets/product-gallery.js` + `assets/product-form.js` + `assets/pickup-availability.js` + `assets/icon-{play,truck,return,warranty}.svg`（旧 `sections/product.liquid` 已删） |
| T-2.2 | `sections/product-highlights.liquid` + `assets/icon-battery.svg` |
| T-2.3 | `sections/product-supplies.liquid`（耗材）+ `sections/product-complementary.liquid`（互补整机）+ `assets/supplies.js` + `assets/product-recommendations.js` |
| T-2.4 | `sections/product-spec-table.liquid` |
| T-2.5 | `sections/product-description.liquid`（**本模板未启用**，文件保留 + preset 可加回） |
| T-2.6 | `sections/product-recommendations.liquid` + `assets/product-recommendations.js` |
| T-3.1 | `templates/product.json`（8 个 section 全接）+ 两个 locale 文件 |
| 共享件 | `snippets/spec-value.liquid`（+`displacement_cc`/`power_w`、`.0` 清洗）、`snippets/compare-cell.liquid`（`.0` 清洗） |
| 工具 | `tools/smoke-product.py`（4 场景内容冒烟）、`tools/audit-product.py`（结构/无障碍体检） |

### 7.2 实测结果（本地 theme dev + 真 HTML 解析）

| 商品 | 面包屑 | 信息卡 | 速览参数 | 规格表 | 耗材 | 推荐 related |
| --- | --- | --- | --- | --- | --- | --- |
| `nb-21p` 汽油 | 三级（集合进） | 运输 + 关键规格 | 4 行 | 9 行 | 1 件 | 4 张 |
| `nb-21bs` 40V | 两级 | **平台 + 运输 + 关键规格** | 3 行 | 8 行 | 1 件 | 4 张 |
| `nb-c16g` 链锯 | 两级 | 运输 + 关键规格 | 3 行 | 7 行 | 1 条锯链 | 4 张 |
| `nb-bl21` 配件 | 两级 | 运输 | 0（整卡不出） | 0（整块不出） | 无 → complementary 容器 | 4 张 |

结构体检四款全部通过：`h1` 唯一、form 嵌套峰值 1 收尾 0、无重复 id、img 全有 alt、无正 `tabindex`、按钮全带 `type`、首图 eager + `fetchpriority=high`、其余 lazy。

`shopify theme check` **0 error / 1 warning**（`main-nav` 的 `childTitle` 未使用，既有问题，非本清单引入）。

### 7.3 这一轮实测抓到的缺陷（静态检查看不见）

1. `21.0 in` / `166.0 cc` —— 整数带 `.0`。`spec-value` 与 `compare-cell` 两处出口统一清洗。
2. 电池机副标题尾部孤立「·」 —— 分隔符后置写法，末项缺值留残渣；改前置。
3. `Rear-wheel drive drive` —— 值本身含 "drive" 还加标签；改为值含 "drive" 时不加。
4. **配件页出现空卡「Key specifications」** —— 所有参数为空但卡片照出。改为先攒行、有行才出卡。
5. 三个脚本层面的误判（不是页面缺陷，但会误导验收）：`<li class="…">` 换行匹配失败、`\bid=` 误命中 `data-section-id`、`<form.*<form` 把「先后两个表单」误判为嵌套。均已改成栈式/边界式判定。

### 7.4 仍待人工验收（不勾选）

- Lighthouse Performance / Accessibility 三页双端实测（沙箱跑不了，需刘工本机）
- 多变体链路（变体选择 → 价格/按钮态 → 变体图切换 → 自提补拉）：演示店全 `Default Title`，**四段逻辑未跑过真实商品**（风险 12）
- 3D / 视频媒体：演示店无素材（风险 1）
- 订阅计划 #17：未实现（风险 13）
- **滚动入场动画的观感与触发时机**：`data-reveal` 标记已确认落到 4 个区块（配件页 2 个，因为无规格表与耗材），但"跟手不跟手"必须肉眼在浏览器里滚一遍——静态 HTML 只能验到属性在
- 购物车角标联动 / 飞入动画：需真实加购
- **`Add all N items`（批量加购）**：演示店每台主机只挂 1 件耗材，N 永远 = 1 → 按钮按设计不出现，`assets/supplies.js` 这段逻辑**一次都没在真页面跑过**。要么给一款主机挂 2 件耗材，要么接受未实测

### 7.5 店铺侧待办（不在代码范围）

| # | 事项 | 影响 |
| --- | --- | --- |
| 1 | 在 Search & Discovery 配置 **Complementary products** | 否则配件类商品（无耗材）的互补推荐拿回 0 条，整块隐藏，强制项 14 在演示店看不到 |
| 2 | 描述区右侧配图（`product-description` 的 image 设置） | 不配则单栏全宽，效果图的两栏编辑式排版不成立 |
| 3 | 补 6 款电池机的 `power_w`（T-0.4） | 现用 `battery_platform` 兜底，非假数据但不精确 |
| 4 | 自提门店（若有） | 无门店时自提块显示「Not available for pickup」 |

---

## 8. 变更记录

| 日期 | 版本 | 变更 |
| --- | --- | --- |
| 2026-10-28 | v1.0 | 首版。基于产品页效果图 v2 + Grill Me 12 问裁定；按刘工要求**不含人日估算与累加链**。新增 §2 差异表、§3 强制项覆盖表、§5 风险表、§6 代价说明 |
| 2026-10-28 | v1.1 | 补两条裁定：① 折扣 = MSRP × 0.95 **取整到整数美元**，21 款主机实算全部正好 5%（明细表进 T-0.2）；11 款配件取整后有 4 款显示 4%/6%/7% → **三选一待拍**（推荐 A：配件不打折）。② judge.me 已在后台卸载 → T-0.3 去掉"先卸载"前置，改为直接改文件 + 复核；风险 4 降级、新增风险 9（列名未经官方模板逐字校验）与风险 10（取整误差） |
| 2026-10-28 | v1.2 | ① 配件定 A 方案（不打折），T-0.2 三选一结案。② 官方模板入仓 `dev-docs/mower-import/product_template.csv`，脚本 `TEMPLATE_PATH` 改指向它、逐字校验常态生效；列名确认 `Compare-at price`。③ 脚本已改并重生成 CSV（52 列 / 32 款 / 53 行 / 0 错 0 警），定价走 `Decimal + ROUND_HALF_UP`，`validate()` 三条断言经反向测试确认会拦。④ 风险 9/10 关闭，新增风险 11（重导覆盖库存与图片）。导入动作仍待刘工执行 |
| 2026-10-28 | v1.3 | 编码启动（刘工确认已导入 CSV）。① T-0.3 完成：`product.json` 移除 judge.me `apps` 块。② T-1.1 完成：`snippets/compare-button.liquid`（`<compare-toggle>` + `<button aria-pressed>`，复用 compare.js 契约，脚本零改动）。③ T-1.3 完成：`snippets/spec-bullets.liquid` + 4 个规格图标；顺带扩展 `spec-value` 的 `displacement_cc` / `power_w` 两种单位（原缺动力换算出口）。④ locale 加 6 键，`check-locale-keys.py` 0 错；`shopify theme check` **0 error**（3 warning：1 条既有 `UnusedAssign` + 2 条新 snippet 未接线的 `OrphanedSnippet`，接线后消失）。⑤ 待确认：cc 不转 cu in 的口径偏离 |
| 2026-10-28 | v1.11 | **改为"关摘要、留全文"**（刘工按推荐方案定稿）：`main-product` 的 `show_description` 设 `false`，`product-description` 加回模板并排在 `Specifications` 之前；页面上描述只出现一次，且是富文本全文。**根因订正**：重复不是模板缺陷——演示数据描述仅 38 词，而摘要是 `truncatewords: 40`，阈值比正文还长，摘要==全文。描述写长后（≥120 词）可重新打开摘要。`product.json` 回到 8 个 section |
| 2026-10-28 | v1.10 | **移除 Overview 描述块**（刘工：与买盒价格下方的描述重复）。`product.json` 从 8 个 section 降到 7 个；`sections/product-description.liquid` 保留（带 preset，商家可加回）。**已知代价**：页面只剩买盒里 38 词的纯文本摘要，富文本全文不再输出——若要两全，改为关闭 `main-product` 的 `show_description` 再把本 section 加回 |
| 2026-10-28 | v1.9 | **拆两个位置 + 顺序调整**（刘工拍定）：① 耗材区与互补区拆成 `product-supplies` / `product-complementary` 两个独立 section——前者排 Specifications 之后，后者排在概览之前紧跟买盒，两者互斥；② **Specifications 移到 Supplies 之前**；③ 新增 `sections.product_complementary` locale 键，删掉废弃的 `product_supplies.complementary_heading` / `fallback` / `fallback_info`；④ **推荐区标题随品类自适应**（主机 Similar mowers / 配件 You may also like），并去掉该设置项的 schema 默认值——否则 Liquid 兜底分支永不执行。实测：主机页 Overview → Specifications → Supplies；配件页 Pairs well with → Overview |
| 2026-10-28 | v1.8 | 互补推荐实测排查（刘工已配 5 个互补品仍"看不见"）：① 接口侧正常——`/recommendations/products?...&intent=complementary` 返回 **4 张卡**；② 看不见的原因不是接口，是**位置**：`product-supplies` 排在 `Overview` 之后（`product.json` 顺序），截图正好停在 Overview；③ 修掉两个真问题：互补路径原先复用了 "Supplies" 标题（下面推的却是整机）→ 新增 `complementary_heading` = **Pairs well with**；JS 空结果/失败原先**完全静默**→ 加 `console.warn` 便于商家排查。**待定**：互补块是否提到概览之前（紧贴买盒） |
| 2026-10-28 | v1.7 | **分块标题改用原 tab 名**：`product-description` → `Overview`、`product-spec-table` → `Specifications`、`product-supplies` → `Supplies`（两个 locale 文件都改，schema 默认值 + Liquid 兜底各一处）。四处分块标题字号统一为 1.25rem/500，页面读起来是「同级标题 + 内容」的垂直节奏。**待定**：当前顺序是 Overview → Supplies → Specifications，与标题语义不符，建议把 Specifications 提到 Supplies 之前 |
| 2026-10-28 | v1.6 | **拍板 4 二次修订**：去掉 Overview / Specifications / Supplies 锚点条 → 纯垂直平铺；新增滚动入场动画（`assets/reveal-on-scroll.js` + `critical.css`，只动 opacity/transform、零 CLS、无 JS 不隐藏、尊重 `prefers-reduced-motion`、首屏区块不参与）。删除 `sections/product-anchor-nav.liquid` 与 `assets/product-anchor-nav.js`，`product.json` 从 8 个 section 降到 7 个。T-1.2 标为撤销 |
| 2026-10-28 | v1.5 | **清单清零（编码部分）**：T-1.2 / T-2.2 / T-2.3 / T-2.4 / T-2.5 / T-2.6 / T-3.1 全部落地，`product.json` 8 个 section 接通。新增 §7 完成记录（落地文件、4 场景实测表、5 个实测缺陷、待人工验收项、店铺侧待办 4 条）。`shopify theme check` 0 error；四款商品结构体检全通过。T-4.1 标为部分完成——Lighthouse / 多变体 / 3D / 订阅 / 批量加购 仍未验 |
| 2026-10-28 | v1.4 | ① **T-2.1 完成**：`sections/main-product.liquid`（面包屑 / 画廊三导航 / 变体 / 价格 / 数量 / 加购 / 加速结账 / 分期 / 自提 / 信任行 / 对比）+ 3 个 JS（`product-gallery.js` / `product-form.js` / `pickup-availability.js`）+ 4 个图标；旧 `sections/product.liquid` 删除，`product.json` 切到 `main-product` 并内联 6 个 block。② 用本地主题 dev 服务实测 4 个场景（集合进 / 汽油机 / 电池机 / 配件）——发现并修掉 3 个真实渲染缺陷（`.0` 尾巴、副标题孤立「·」、"drive drive"）。③ 新增 T-0.4：7 款电池机里 6 款 `power_w` 为空，已用 `battery_platform` 兜底，补数据待定。④ 新增风险 12（多变体链路未实测）、风险 13（订阅计划未实现），§3 第 17 项标注未实现。⑤ theme check 0 error / 1 既有 warning；`tools/` 新增 `smoke-product.py` 与 `audit-product.py` 两个冒烟脚本 |

> **维护规则**：SDD / pages-ui 变更时同步本清单对应任务；任务状态变更在条目后加 `✅ 日期` / `⛔ 原因`；新增任务插入对应阶段（P0–P4）并同步 §3 覆盖表与 §4 锚点。
