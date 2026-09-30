# 割草机导入 CSV — 来源与口径说明

生成日期：2026-09-29 ｜ 生成脚本：`build_mower_csv.py` ｜ 产物：`mower-products-import.csv`

## 1. 文件口径

| 项 | 口径 |
| --- | --- |
| 列结构 | 官方 `product_template.csv` 核心子集 **28 列**（列名逐字取自模板，脚本内断言校验）+ **22 个 metafield 列** = **50 列** |
| metafield 取舍 | SDD §5.3 全部 23 个字段中，去掉链锯专用 `spec.bar_length_mm` → 22 个；其中 `acc.consumables` / `acc.fitment_note` 列保留但留空（见 §4） |
| 商品数 | 11 款，全部单变体（11 行） |
| 变体写法 | 单变体固定 `Option1 name=Title` / `Option1 value=Default Title` |
| 商品级字段 | 本文件每商品仅 1 行，全部商品级字段（含 metafield）在该行 |

### 商品清单与类型覆盖

| # | 型号 | 类型 | 动力源 | 对比分组 |
| --- | --- | --- | --- | --- |
| 1 | Honda HRN216PKA | 走步推式 | Gasoline | walk-behind-mower |
| 2 | Honda HRN216VKA | 走步自走（后驱） | Gasoline | walk-behind-mower |
| 3 | Toro 21465 Recycler 22" | 走步自走（Personal Pace） | Gasoline | walk-behind-mower |
| 4 | Toro 21332 Recycler 21" | 走步推式 | Gasoline | walk-behind-mower |
| 5 | Ryobi RY401150US 40V | 走步自走 | Battery (40V) | walk-behind-mower |
| 6 | Greenworks MO40L4210 40V | 走步推式 | Battery (40V) | walk-behind-mower |
| 7 | Kobalt 80V 21" | 走步自走 | Battery (80V) | walk-behind-mower |
| 8 | John Deere S100 | 草坪拖拉机 | Gasoline | riding-mower |
| 9 | Cub Cadet XT1 LT42 | 草坪拖拉机 | Gasoline | riding-mower |
| 10 | Husqvarna Z242F | 零转向 zero-turn | Gasoline | riding-mower |
| 11 | Troy-Bilt Pony 42X | 草坪拖拉机 | Gasoline | riding-mower |

覆盖了 SDD 定义的割草机类型：推式 / 自走式 / 骑乘（草坪拖拉机）/ 零转向；动力源覆盖汽油 + 电池（40V / 80V 两个平台）。

## 2. 口径约定（本文件自定的解释规则）

- **`area_coverage_sqft`**：取面积分段的**上限**；`Over 1 acre` 取 2 英亩推荐上限 **87,120**。映射：Under 5,000→5000；5,000–10,000→10000；10,000–1 acre→43560（1 英亩）；Over 1 acre→87120。这是分段的数字化口径，不是厂商实测值。
- **重量**：metafield `spec.weight_kg` 取厂商公布的**运转重量**（含油液）；Kobalt 取官方说明书的**裸机重量 58 lb（不含电池）**，描述中已注明。变体 `Weight value (grams)` 与 metafield 同源换算（1 lb = 453.592 g）。
- **保修**：一律取**家用（residential）**整机保修；Toro 不含 "3-Year Guaranteed to Start"（仅为启动保障）。
- **骑乘式 logistics**：`Freight LTL` + `needs_liftgate=TRUE` + `assembly_required=TRUE` + `lead_time_days=7`（Tractor Supply 页面载明 7–10 天发运）；走步式一律 `Parcel`。
- **`Product category`**：走步式用 `Home & Garden > Lawn & Garden > Outdoor Power Equipment > Lawn Mowers`；骑乘式用其子节点 `… > Lawn Mowers > Riding Mowers`（Shopify 标准分类法）。
- **`Type` 列**：自由文本，写 `Walk-behind mower` / `Riding mower`，仅作商家侧旁证；对比分组权威键是 `spec.compare_group`。

## 3. 逐款来源

### Honda HRN216PKA / HRN216VKA
- 官方产品页：https://powerequipment.honda.com/lawn-mowers/models/HRN216PKA ；https://direct.powerequipment.honda.com/lawn-mowers/models/hrn216vka
- 发动机 GCV170 166 cc：https://engines.honda.com/models/model-detail/gcv170
- MSRP：PKA $579、VKA $599；运转重量 76 / 82 lb；家用保修 3 年（36 个月）

### Toro 21465 / 21332
- 官方：https://www.toro.com/en-ca/homeowner/walk-behind-mowers/22-smartstow-personal-pace-21465 ；https://www.toro.com/en/homeowner/walk-behind-mowers/21-push-mower-21332
- 零售：https://www.homedepot.com/p/Toro-Recycler-22-in-Briggs-Stratton-SmartStow-Personal-Pace-High-Wheel-Drive-Gas-Walk-Behind-Self-Propelled-Lawn-Mower-21465/314426545
- 21465：150 cc Briggs、78 lb（官方手册 Model Weight）、$519、保修 2 年（24 个月）
- 21332：140 cc Briggs、62 lb（官方值；经销商标 71 lb 为包装重，已排除）、$369、保修 2 年

### Ryobi RY401150US（40V）
- 官方支持页：https://support.ryobitools.com/products/details/40v-hp-brushless-dual-blade-mower
- Home Depot 套装价 $749（2×6.0Ah + 快充）；重量 75 lb（含两块电池）；保修 5 年工具 + 3 年电池（60 个月取工具保修）
- ⚠️ **召回提示**：RY401140US / RY401150US 在 2025-02 CPSC 召回清单（连接器过热，序列号 KC21032D010001–KC21327N999999）。描述中已加注"上架前核对批次"。

### Greenworks MO40L4210（40V）
- 官方系列页：https://www.greenworkstools.com/collections/40-volt/products/40v-brushless-21-inch-lawn-mower-2525202az
- 手册（重量 57.8 lb 含电池）：https://ru.manuals.plus/asin/B086PQ8R7B
- 价格 $499.99 来自聚合页（winnowl），**上架前建议在 Home Depot 再核一次实时价**
- 40V 平台保修 3 年（36 个月）；4 年保修属 80V 平台

### Kobalt 80V 21" 自走（5.0Ah 套装）
- Lowe's：https://www.lowes.com/pd/Kobalt-80-volt-Max-Brushless-Lithium-Ion-Self-propelled-21-in-Cordless-Electric-Lawn-Mower/1000698046
- 官方说明书（裸机 58 lb）：https://de.manuals.plus/m/d54450fad60cb6f6ad82428d8636a703ac90bd1c9f6efbb5b28b81b4d0a4e23f
- MSRP **$599**（多来源一致：ShopSavvy 标原价 $599；促销价 $359–$449 波动）。**CSV 取 $599 原价**，导入后请按店铺定价策略调整
- 保修 5 年工具 + 3 年电池；驱动为后轮自走（Slickdeals 条目与官方特性页一致）

### John Deere S100
- 官方：https://johndeere.com/en/mowers/lawn-tractors/100-series/s100-lawn-tractor/ （42 in、500 cc、414 lb 不含油、2 年/120 小时保修）
- 价格单：https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/lawn-garden/RLE_S100_S200_01Feb2024.pdf （$2,399）
- 驱动佐证：https://www.tractordata.com/lawn-tractors/004/2/4/4246-john-deere-s100.html

### Cub Cadet XT1 LT42（IntelliPOWER）
- 官方：https://www.cubcadet.com/en_US/riding-lawn-mowers/xt1-lt42-intellipower/13A6A9TS010.html （MSRP $2,399、547 cc、42 in、3 年不限小时家用保修）
- 重量 410 lb 来自 TractorData 聚合：https://www.tractordata.com/lawn-tractors/004/2/6/4262-cub-cadet-xt1-lt42.html —— **官方页不公布重量，此值为系列聚合参考值，可能有少量误差**

### Husqvarna Z242F（Special Edition）
- 官方：https://www.husqvarna.com/us/support/z242f-special-edition/970458801 （from $3,799、42 in、726 cc、582 lb）
- 保修：https://www.husqvarna.com/ca-en/products/zero-turn-mowers/z242f/967844702/ （3 年 homeowner）
- 注意：美国在售为 Kawasaki 发动机 Special Edition；部分地区门户标停产，重量随发动机变体 551–582 lb 不等

### Troy-Bilt Pony 42X
- 官方：https://www.troybilt.com/en_US/lawn-and-garden-tractors/pony-42x-riding-lawn-mower/13A877BS066.html （from $1,999、547 cc、42 in、3 年家用）
- 重量 420 lb：https://www.walmart.com/ip/Troy-Bilt-547cc-Pony-42-Gas-Riding-Lawn-Mower-13A877BS066/7962066125

## 4. 刻意留空的字段（不编数）

| 字段 | 留空原因 |
| --- | --- |
| `spec.noise_db`（全部 11 款） | 厂商官方产品页 / 规格表 / 手册均未公布操作位 dB(A)；第三方零星数值因非官方来源不采用 |
| `spec.power_w`（全部） | 官方均未公布电机额定功率 W；不用电压/安时反推 |
| `spec.spec_variance_note`（全部） | 本文件全部单变体，无"参数随变体变化"场景。多变体示例（含变体行结构 + Option 列写法）属 SDD 演示店 `nb-22sp` 的职责，不在本文件 |
| `spec.compare_hidden`（全部） | 默认 false，留空即不隐藏 |
| `acc.consumables`（全部） | `list.product_reference` 的值是商品 handle 引用，需目标商品已存在于店内；割草机文件先导入，耗材引用待配件商品导入后二次更新 |
| `acc.fitment_note`（全部） | 适配说明属配件/耗材侧字段，割草机主机不适用 |
| 图片列（全部） | 未附带图片 URL；导入后在 Shopify 后台补图，或改用自有 CDN 图片链接后重新导入 |

## 5. 使用步骤（对应 SDD §5.9 两遍制与 §5.8 前置条件）

1. **先建 metafield 定义**（23 个，CSV 不会自动创建），筛选源字段勾选 Storefront 可见性；`platform.battery_platform` 开启"用作集合条件"；筛选源字段配预设选项。
2. 第一遍导入本文件（商品 + 变体 + 核心字段 + metafield 一次完成；官方模板支持 metafield 列与商品创建同文件导入）。
3. 导入预览页确认所有 `Product category` 被平台识别（无"未知分类"）。
4. 配件商品就位后，二次导入更新 `acc.consumables` 列（必填列 `URL handle` + `Title`，勾选 Overwrite same handle）。
5. 价格为 2026-09-29 核实的 MSRP / 零售价，上架前按渠道现价复核。
