# 产品导入 CSV — 来源与口径说明

生成日期：2026-09-29 ｜ **扩充：2026-10-26（打草机 5 + 链锯 5）／2026-10-27（配件 13）** ｜
生成脚本：`build_mower_csv.py` ｜ 产物两份：
`mower-products-import.csv`（第一遍，55 行）与 `mower-products-import.pass2-consumables.csv`（第二遍耗材反挂，19 台主机）

## 1. 文件口径

| 项 | 口径 |
| --- | --- |
| 列结构 | 官方 `product_template.csv` 核心子集 **28 列**（列名逐字取自模板，脚本内断言校验）+ **23 个 metafield 列**（SDD §5.3 全量，含链锯专用 `bar_length_mm`）= **51 列** |
| metafield 取舍 | 23 个字段全部保留。`cutting_width_mm` 给割草机（割台幅宽）与打草机（切割幅度），`bar_length_mm` 只给链锯，脚本 `validate()` 强制互斥；配件只用 `logistics` + `acc.fitment_note`，其余留空（见 §2） |
| 商品数 | **32 款 = 主机 21 + 配件 11**，全部单变体（32 主行 + 21 第二图行 = **53 行**） |
| 变体写法 | 单变体固定 `Option1 name=Title` / `Option1 value=Default Title` |
| 商品级字段 | 本文件每商品仅 1 行，全部商品级字段（含 metafield）在该行 |
| 列数变更 | 2026-10-26 前为 50 列（无 `bar_length_mm`）。旧产物已备份 `mower-products-import.csv.bak-20261026`；**导入前须先建好第 23 个 metafield 定义 `spec.bar_length_mm`**，否则该列被平台静默忽略 |

### 商品清单与类型覆盖（21 款）

| # | 型号 | 类型 | 动力源 | 对比分组 |
| --- | --- | --- | --- | --- |
| 1 | NB-21P | 走步推式 | Gasoline | walk-behind-mower |
| 2 | NB-21S | 走步自走（后驱） | Gasoline | walk-behind-mower |
| 3 | NB-22S | 走步自走（变速） | Gasoline | walk-behind-mower |
| 4 | NB-21PH | 走步推式（高轮） | Gasoline | walk-behind-mower |
| 5 | NB-21BS | 走步自走 | Battery (40V) | walk-behind-mower |
| 6 | NB-21BP | 走步推式 | Battery (40V) | walk-behind-mower |
| 7 | NB-21B80 | 走步自走 | Battery (80V) | walk-behind-mower |
| 8 | NB-42T | 草坪拖拉机 | Gasoline | riding-mower |
| 9 | NB-42TH | 草坪拖拉机（液压） | Gasoline | riding-mower |
| 10 | NB-42Z | 零转向 | Gasoline | riding-mower |
| 11 | NB-42TC | 草坪拖拉机（CVT） | Gasoline | riding-mower |
| 12 | **NB-T21** | 打草机（直杆） | Gasoline | **string-trimmer** |
| 13 | **NB-T27** | 打草机（直杆） | Gasoline | **string-trimmer** |
| 14 | **NB-T28** | 打草机（可拆杆） | Gasoline | **string-trimmer** |
| 15 | **NB-T40B** | 打草机（可接附件） | Battery (40V) | **string-trimmer** |
| 16 | **NB-T60B** | 打草机 | Battery (60V) | **string-trimmer** |
| 17 | **NB-C16G** | 链锯 16 in. | Gasoline | **chainsaw** |
| 18 | **NB-C18G** | 链锯 18 in. | Gasoline | **chainsaw** |
| 19 | **NB-C20G** | 链锯 20 in.（半专业） | Gasoline | **chainsaw** |
| 20 | **NB-C40B** | 链锯 16 in. | Battery (40V) | **chainsaw** |
| 21 | **NB-C80B** | 链锯 18 in. | Battery (80V) | **chainsaw** |
| 22 | **NB-BL21** | 刀片 21 in. | — | （配件，不进对比） |
| 23 | **NB-BL22** | 刀片 22 in. | — | （配件，不进对比） |
| 24 | **NB-BL42** | 刀组 42 in.（2 片） | — | （配件，不进对比） |
| 25 | **NB-BAR16** | 导板 16 in. | — | （配件，不进对比） |
| 26 | **NB-BAR18** | 导板 18 in. | — | （配件，不进对比） |
| 27 | **NB-BAR20** | 导板 20 in. | — | （配件，不进对比） |
| 28 | **NB-CH16** | 锯链 16 in.（56 DL） | — | （配件，不进对比） |
| 29 | **NB-CH18** | 锯链 18 in.（62 DL） | — | （配件，不进对比） |
| 30 | **NB-CH20** | 锯链 20 in.（70 DL） | — | （配件，不进对比） |
| 31 | **NB-TL095** | 打草绳 .095 in.（1 lb 卷） | — | （配件，不进对比） |
| 32 | **NB-B40** | 40V 4.0 Ah 电池 | — | （配件，不进对比） |

覆盖：4 个对比分组全部非空；动力源覆盖汽油 / 电池（40V / 60V / 80V 三个平台）；`duty_level` 覆盖 Residential + Semi-pro（NB-C20G）。
**未覆盖**：`Corded electric`（v1.0 演示店不含插电款）、20V 平台、`Commercial` 强度。
配件侧刻意不覆盖 60V / 80V 电池（缺官方单件定价锚，不外推，见 §3c）。
配件只保留**全部落在 Home & Garden 内**的品类：空气滤芯与火花塞因分类法缺叶子已在 2026-10-27 删除（§2）。

> 与 SDD §9.4「最终 80–120 个商品、主机 40–60 + 耗材/配件 40–60」的差距：
> 本文件是**核心子集**：主机 21（目标 40–60）、配件 13（目标 40–60）。机油、充电器、打草头等尚未建立
> （机油/充电器在 Shopify 分类法里没有合适叶子节点，见 §2）。

## 2. 口径约定（本文件自定的解释规则）

- **`area_coverage_sqft`**：取面积分段的**上限**；`Over 1 acre` 取 2 英亩推荐上限 **87,120**。映射：Under 5,000→5000；5,000–10,000→10000；10,000–1 acre→43560（1 英亩）；Over 1 acre→87120。这是分段的数字化口径，不是厂商实测值。
- **重量**：metafield `spec.weight_kg` 取厂商公布的**运转重量**（含油液）；Kobalt 取官方说明书的**裸机重量 58 lb（不含电池）**，描述中已注明。变体 `Weight value (grams)` 与 metafield 同源换算（1 lb = 453.592 g）。
- **保修**：一律取**家用（residential）**整机保修；Toro 不含 "3-Year Guaranteed to Start"（仅为启动保障）。
- **骑乘式 logistics**：`Freight LTL` + `needs_liftgate=TRUE` + `assembly_required=TRUE` + `lead_time_days=7`（Tractor Supply 页面载明 7–10 天发运）；走步式一律 `Parcel`。
- **`Product category`**：走步式用 `Home & Garden > Lawn & Garden > Outdoor Power Equipment > Lawn Mowers`；骑乘式用其子节点 `… > Lawn Mowers > Riding Mowers`（Shopify 标准分类法）。**刻意不采纳后台 Shopify Magic 的 "Lawn Tractors (in Tractors)" 建议**：那是农业机械分支（Business & Industrial），不符合 SDD §13"主机分类全部落在 Home & Garden"的硬约束，且会导致 Google 渠道映射与店内 4 台骑乘机类目一致性出问题。导入实测（2026-09-30）：Riding Mowers 被平台正常识别，建议提示为 Magic 猜测，可忽略。
- **`Type` 列**：自由文本，写 `Walk-behind mower` / `Riding mower` / `String trimmer` / `Chainsaw`，仅作商家侧旁证；对比分组权威键是 `spec.compare_group`。
- **`Product category`（打草机 / 链锯，2026-10-26 新增）**：取自 Shopify Standard Product Taxonomy `dist/en/categories.txt`（当日拉取核对）——
  链锯 = `Home & Garden > Lawn & Garden > Outdoor Power Equipment > Chainsaws`（`hg-12-3-1`）；
  打草机 = `… > Outdoor Power Equipment > Weed Trimmers`（`hg-12-3-15`）。
  **平台把打草机命名为 `Weed Trimmers`，不叫 "String Trimmers"** —— 后者只用在 `compare_group` 键与店内集合命名上，两者不要混用。
- **`area_coverage` = `N/A`（打草机 5 + 链锯 5，全部）**：厂商口径里没有"适用面积"，只有割草机按草坪面积推荐机型。
  按「查不到就留空、不编数」的纪律，写值域内的 `N/A`，且 `area_coverage_sqft` 必须**真空**（不能落 0，否则排序与集合 `>`/`<` 会把 0 当真值）。
  代价明说：这两组不进"适用面积"筛选，对比表"适用面积"行显示 `—`。这是数据诚实换来的，不是缺陷。
- **`cutting_width_mm` 语义随品类变**：割草机 = 割台幅宽（in.×25.4）；打草机 = 切割幅度（cutting swath，官方标 17 in. → 432 mm）。链锯一律不填（改填 `bar_length_mm`）。
- **打草机 / 链锯 logistics**：全部 `Parcel`（最重的 NB-C20G 也仅 13.2 lb），`lead_time_days=3` 与走步式割草机同档。
- **保修口径（新增 10 款）**：取**消费者/家用**整机保修；ECHO 与 STIHL 官方都区分 consumer/commercial，取 consumer 那档。

### 配件的口径（2026-10-27 新增，与主机根本不同）

| 项 | 口径与理由 |
| --- | --- |
| **只填 3 个 metafield** | `logistics.shipping_class = Parcel`、`logistics.lead_time_days = 3`、`acc.fitment_note`。其余 20 个字段**全部真空** |
| `spec.power_source` / `spec.duty_level` 为什么留空 | 这两个字段的值域里**没有 `N/A`**，刀片和机油根本填不了（SDD §5.7 已定：耗材走「缺值 → 该维度下不出现」，**不要为它们加 N/A 选项**） |
| `spec.compare_group` 为什么留空 | 空值 = 不进对比、不兜底（SDD §5.3 C）。配件进对比没有意义，且会让商品卡出现一个点了没用的 Compare 按钮。脚本 `validate()` 强制配件必须为空 |
| `spec.operation_type` / `drive_type` / `area_coverage` 为什么留空 | 值域里有 N/A，但配件填 N/A 是**假数据**（刀片没有操作姿态），比留空更糟 |
| 重量为什么留空 | 厂商普遍不公布配件重量。宁可空着（Shopify 允许），也不用材质密度反推 |
| `acc.consumables` 为什么不在本文件 | 它的值是**目标商品 handle**，目标必须已在店内 ⇒ 必须第二遍导入。见 §5 与 `mower-products-import.pass2-consumables.csv` |
| 分类法节点 | 刀片 → `… Outdoor Power Equipment Accessories > Lawn Mower Accessories > Lawn Mower Blades`；导板/锯链 → `… > Chainsaw Accessories > Chainsaw Bars / Chainsaw Chains`；打草绳 → `… > Weed Trimmer Accessories > Weed Trimmer Blades & Spools > Weed Trimmer Lines`；电池 → `… > Outdoor Power Equipment Batteries`。**全部在 Home & Garden 内** |
| **降级类目（已否决）** | 空滤与火花塞在 Lawn & Garden 分支下**确实没有节点**（2026-10-27 逐条查过 `categories.txt`），唯一出路是降级到 `Vehicles & Parts`。**2026-10-27 刘工拍板不做**：少这 2 款换全店 100% 落在 Home & Garden。耗材演示由刀片 / 锯链 / 打草绳承担（**结论留档，别再翻**） |
| 为什么没有机油 / 充电器 / 滤芯 / 火花塞 | 全部是分类法缺叶子：`Lubricants > Oil` 在 `Hardware > Building Consumables` 下，充电器只有 `Electronics` 的通用节点，滤芯与火花塞的叶子在 `Vehicles & Parts`。**宁可不做，不用错类目**。对应集合（Filters / Oils & Fuel）空着、暂不挂菜单 |

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

## 3b. 逐款来源（2026-10-26 新增 10 款）

> 口径与 §3 一致：**型号是 Northbark 虚拟型号，参数取自下列真实机型的公开官方页**（SDD §9.1 允许）。
> 所有数值均于 2026-10-26 当日重新核对；冲突或查不到的一律留空，见 §4。

### NB-T21（参数基线：ECHO SRM-225）
- 官方/授权商页：https://www.echo-usa.com/trimmers-brushcutters/srm-225 ｜https://www.supplyworks.com/Sku/100675439/echo-212-cc-gas-2-stroke-straight-shaft-string-trimmer-743184510971-srm-225
- 21.2 cc、17 in. 切割幅度（→432 mm）、干重 11.5 lb（含切割头、不含背带）、$279.99、5 年消费者保修（60 个月）

### NB-T27（参数基线：STIHL FS 56 RC-E）
- 官方：https://www.stihlusa.com/products/trimmers-and-brushcutters/homeowner-trimmers/fs56rce
- 27.2 cc、切割圆 420 mm（官方公制值，16.5 in.）、不含燃油重量 10.6 lb、$229.99
- 保修 24 个月：STIHL 美国消费者保修 2 年（**这一条按厂商保修政策取值，非产品页逐字**，上架前请在 STIHL 保修政策页复核）

### NB-T28（参数基线：Husqvarna 128LD）
- 官方：https://www.husqvarna.com/us/products/trimmers/128ld/952711953/
- 28 cc、17 in. 切割幅度（→432 mm）、不含切割装置重量 12.7 lb、$239.99、2 年家用保修（24 个月）
- `noise_db = 95`：官方规格表"Sound pressure level at operators ear (LpA) 95 dB(A)"——**本文件唯一填了噪音的一款**，因为厂商公布了操作位耳旁值

### NB-T40B（参数基线：Ryobi RY40270）
- 官方：https://www.ryobitools.com/products/details/40v-brushless-expand-it-attachment-capable-string-trimmer
- 40V、18→15 in. 可调切割幅度（取最大 15 in. →381 mm）、含电池重量 11.6 lb、5 年工具保修（60 个月）
- 价格 $249.00：官方页与 Home Depot **均未给稳定标价**（促销波动 $199–$299），取渠道中间价，**上架前必须复核**

### NB-T60B（参数基线：Greenworks 60V ST60L254）
- 官方：https://www.greenworkstools.com/products/pro-60v-brushless-string-trimmer-2122802
- 60V、16 in. 切割幅度（→406 mm）、不含电池重量 7.9 lb、4 年工具+电池保修（48 个月）、$199.99（活动价，标价 $179.99 为纯工具版）
- `power_w` 留空：Greenworks 60V 系列页对 ST60L02 标 0.8 kW，但**不是同一 SKU**，不跨型号挪用

### NB-C16G（参数基线：STIHL MS 170）
- 官方：https://www.stihlusa.com/products/chain-saws/homeowner-saws/ms170/ （读数经授权经销商页复现：https://frontdeskreview.com/product/chainsaws/stihl-ms-170）
- 30.1 cc、16 in. 导板（→406 mm）、动力头重量 8.6 lb（不含导板与链条）、$199.99、保修 24 个月（同上，按 STIHL 消费者保修政策）

### NB-C18G（参数基线：ECHO CS-400）
- 官方手册（PDF）：https://www.echo-usa.com/getattachment/07628055-6ed6-492b-9057-0bce6550dbed/CS-400es_1112_120913.pdf ｜https://www.echo-usa.com/chainsaws/cs-400
- 40.2 cc、18 in. 导板（→457 mm）、干重 4.6 kg / 10.1 lb（**不含导板与链条**）、5 年消费者保修（60 个月）
- 价格 $399.99：授权经销商标价区间 $299.99–$399.95，取建议零售价上限，**上架前复核**

### NB-C20G（参数基线：ECHO CS-590 Timber Wolf）
- 来源：ECHO 经销商规格汇整 http://islandsawandturf.com/index.php/chainsaws/echo-chainsaws
- 59.8 cc、20 in. 导板（→508 mm）、干重 13.2 lb（不含导板与链条）、$729.95、5 年消费者保修（60 个月）
- `duty_level = Semi-pro`：20 in. / 59.8 cc 属农场-半专业档，是本文件唯一非 Residential 的主机
- ⚠️ 该款参数取自经销商汇总页而非 ECHO 官方产品页，**上架前建议用 echo-usa.com 复核 cc 与重量**

### NB-C40B（参数基线：Ryobi RY40570）
- 官方：https://www.ryobitools.com/products/details/40v-brushless-16-in-cordless-chainsaw
- 40V、16 in. 导板（→406 mm）、5 年工具保修（60 个月）
- 重量 11.2 lb：**官方页与第三方评测口径不一致**（第三方实测含电池运转重量 12.8 lb）。取 11.2 lb 作为**裸机值**，文案已写 "bare tool" 并说明含电池另有公布值；**上架前须以包装/手册重量复核**
- 价格 $279.00：渠道价 $250–$310 波动，取中间价，上架前复核

### NB-C80B（参数基线：Greenworks 80V CS80L417）
- 官方：https://www.greenworkstools.com/products/80v-18-2-5kw-cordless-battery-chainsaw-w-1-4ah-battery-2a-charger
- 80V、2.5 kW 无刷、18 in. 导板（→457 mm）、产品重量 9.5 lb（**裸机，不含电池**，描述中已注明）、4 年工具+电池保修（48 个月）、$429.99
- `power_w = 2500`：官方标 2.5 kW，是本文件唯一填了额定功率的一款

## 3c. 配件定价锚（2026-10-27）

**性质**：配件没有"官方 MSRP 可照抄"这回事（同一刀片在不同渠道 $16–$35）。所以这里给**定价锚**——
一个能回查的市场价位，CSV 的价格是据此做出的**定价决策**，不是厂商标价。改价直接改脚本。

| 型号 | 定价 | 锚点（2026-10-27 核实） | 来源 |
| --- | --- | --- | --- |
| NB-BL21 | $24.99 | Toro 21 in. 替换刀 $20.38 / Honda 21 in. 套装 $29.98 / Toro 21 in. $35.15 | repairclinic、Home Depot |
| NB-BL22 | $26.99 | Toro 22 in. Recycler 刀 $19.98–$25.99 | Home Depot / repairclinic |
| NB-BL42 | $42.99 | John Deere 42 in. 刀组（2 片）$43.97；Power Care 42 in. 刀组 $25.96 | Home Depot |
| NB-BAR16 / 18 / 20 | $29.99 / $34.99 / $39.99 | Oregon 16 in. bar+chain 套装 $29.53；20 in. bar+chain 套装 $45.49（单 bar 低于套装） | consumerssmart 汇总（Amazon 价） |
| NB-CH16 / 18 / 20 | $21.99 / $23.99 / $26.99 | 按同系列 bar+chain 套装价减 bar 价推算的量级 | 同上 |
| NB-TL095 | $19.99 | ECHO .095 in. × 250 ft 大卷 $19.47–$19.97；Rino-Tuff 同规格 $19.97 | Home Depot |
| NB-B40 | $119.99 | Ryobi 40V 4.0 Ah 单电池 $119.95（Amazon 追踪价，2026-10-23） | outletpicks 价格追踪 |

**刻意没做的两款电池**：Greenworks 60V 2.5 Ah 与 80V 4.0 Ah 只在**套装**里出现（$199.99 / $429.99 含工具），
找不到单件官方价。按「不编数」直接不做，而不是拿套装价拆分反推。补法：等厂商单件页出现，或按 Wh 单价明确标注为"估算"再补。

**锯链 DL 数的口径（待实物核对）**：16 / 18 / 20 in. 分别写 56 / 62 / 70 drive links，取的是 Oregon 91PX
低反弹系列对应长度的常见配置，**不是**逐型号实测。上架前拿实物链条数一遍，或直接改成供应商给的 DL 数——
这一列写错不会报错，只会让顾客买回去装不上。

## 4. 刻意留空的字段（不编数）

| 字段 | 留空原因 |
| --- | --- |
| `spec.noise_db`（除 NB-T28 外全部 20 台主机） | 厂商官方产品页 / 规格表 / 手册均未公布操作位 dB(A)；第三方零星数值因非官方来源不采用。只有 NB-T28 的基线机型官方给了 LpA 95 dB(A) |
| `spec.power_w`（除 NB-C80B 外全部 20 台主机） | 汽油机按口径填 cc 不填 W；电池款多数官方未公布电机额定功率，不用电压/安时反推 |
| `spec.spec_variance_note`（全部 21 台主机） | 本文件全部单变体，无"参数随变体变化"场景。多变体示例（含变体行结构 + Option 列写法）属 SDD 演示店 `nb-22sp` 的职责，不在本文件 |
| `spec.compare_hidden`（全部） | 默认 false，留空即不隐藏 |
| `acc.consumables`（第一遍全部留空） | 值是**目标商品 handle**，目标必须已在店内 ⇒ 走第二遍。已单独产出 `mower-products-import.pass2-consumables.csv`（19 台主机 → 耗材），见 §5 |
| `acc.fitment_note`（主机全部留空） | 适配说明属配件侧字段，主机不适用。**11 款配件已全部填写**（如 `Fits NB-21P / NB-21S / ... (21 in. decks)`） |
| `spec.area_coverage_sqft`（打草机 5 + 链锯 5） | 对应 `area_coverage = N/A`，数字版必须真空（落 0 会被当成"适用 0 平方英尺"的真值） |
| 图片列（2026-10-26 的 10 款） | **2026-10-26 已补齐**：20 张全部上传 Shopify Files，URL 已回填 `build_mower_csv.py` 的 `IMAGES` 并重跑（21 款 × 2 张 = 42 行，0 错误 0 警告）。文件名形如 `product-<品类>-<型号>-<序>-<内容>_rmbg_webp.webp`，实际为**去背透明底**（与旧 22 张一致，抽测角像素 alpha=0），展示底色由商品卡 CSS 提供 |
| 图片列（11 款配件） | **2026-10-28 已补齐**：11 张上传 Files，URL 回填 `IMAGES` 并重跑（32 款 / 53 行，**0 错误 0 警告**）。配件只配 1 张主图，无第二图行。文件名 `product-accessory-<型号>-1-main_rmbg_webp.webp` |
| 重量（11 款配件） | 变体克重与 `spec.weight_kg` 双空。配件厂商普遍不公布重量，不按材质密度反推 |

## 5. 使用步骤（对应 SDD §5.9 两遍制与 §5.8 前置条件）

1. **先建 metafield 定义**（23 个，CSV 不会自动创建），筛选源字段勾选 Storefront 可见性；`platform.battery_platform` 开启"用作集合条件"；筛选源字段配预设选项。
   **含 2026-10-26 新增的第 23 个 `spec.bar_length_mm`（number_integer，单位 mm）** —— 没建就先导入，链锯的导板长度会被静默丢弃。
2. 第一遍导入本文件（商品 + 变体 + 核心字段 + metafield 一次完成；官方模板支持 metafield 列与商品创建同文件导入）。
3. 导入预览页确认所有 `Product category` 被平台识别（无"未知分类"）；重点看 `Weed Trimmers`、`Chainsaws` 与四个配件节点。
   本文件**全部商品分类都在 Home & Garden 内**，预览页不应出现任何 `Vehicles & Parts` 类目。
4. **等第一遍确认商品全部创建成功**，再导入 `mower-products-import.pass2-consumables.csv`：
   5 列 = `Title` / `URL handle` / `Option1 name` / `Option1 value` / 耗材列，导入时勾
   **Overwrite any current products that have the same handle**。

   **为什么必须带 `Option1 name` / `Option1 value`（2026-10-28 踩坑，BUG-051）**：
   更新既有商品时，CSV 一旦触及变体相关数据却没给这两列，平台按「删掉现有变体、新建一个默认变体」处理，
   验证阶段直接整份拒收（`Product options input is required when updating variants`）。
   值必须与首次导入**逐字一致**（`Title` / `Default Title`）——改值同样会重建变体、换掉 variant ID。

   **两条覆盖规则记牢**（决定"多带一列"是安全还是灾难）：
   - **列不出现在 CSV 里 → 线上值保持原样**（所以更新型文件只放要改的列，价格/库存/图片不会被动）
   - **列出现但为空 → 线上值被覆盖成空**（所以绝不带空的价格列、库存列）

   为什么分两遍：`acc.consumables` 存的是**目标商品 handle**，同批导入时配件还没创建，平台会**静默忽略**（不报错）。
5. ⚠️ **导入后前台不会有任何变化** —— `acc.consumables` 的渲染模块（SDD §6.3「增强层」）**主题尚未开发**，
   产品页目前只有图库 + 变体 + 规格表。这份文件现在只能验证**数据层**：
   后台打开 NB-21P → Metafields → Consumables，应列出 `northbark-nb-bl21`（点得进去、指向正确商品）。
   要"在页面上看得见"，两条路二选一：① 开发 SDD §6.3 的耗材 section（分类展示 + fitment 说明 + 一键加购）；
   ② 先用 **Shopify 原生 Complementary products**（官方强制项，在 Search & Discovery 里配，主题已支持渲染）。
   两条路的语义分工见 SDD §6.3：原生管"常一起购买"，`acc.consumables` 管"耗材复购"。
6. 价格为核实的 MSRP / 零售价（割草机 2026-09-29、打草机与链锯 2026-10-26），上架前按渠道现价复核；§3b 中标"必须复核"的 4 处尤其要看。
   配件价格是定价决策（§3c），改价直接改脚本重跑，别在后台逐条手改——下次重跑会被覆盖回去。
7. 集合：打草机 / 链锯按 `spec.compare_group` 建自动化集合再挂主导航；配件按 `Product category` 建
   （`Accessories: Blades & Bars` = 刀片 + 导板 + 锯链 共 9 款；`Batteries` = 40V 电池 1 款；`Filters` 与 `Oils & Fuel` 空集合，暂不挂）。
