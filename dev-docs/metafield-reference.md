# Coppice 产品 Metafield 速查表

> 来源：`dev-docs/sdd.md` v4.2 §5.2–§5.7 ｜ 整理日期：2026-09-29
> 共 **23 个字段**（spec 16 + platform 1 + logistics 4 + acc 2），全部为 **Product metafield**。
> CSV 列头格式：`显示名 (product.metafields.命名空间.key)`；CSV 导入前必须先建 metafield 定义（§5.8）。

---

## 一、总览（23 字段一张表）

| # | 字段 key | 类型 | 必填 | 单位/值域 | 筛选源 | 入对比表 | 一句话用途 |
| - | -------- | ---- | ---- | --------- | ------ | -------- | ---------- |
| 1 | `spec.power_source` | single_line_text | **必填** | 4 选 1 枚举 | ✅ | ✅ | 动力源（烧什么），第一筛选维度 |
| 2 | `spec.operation_type` | single_line_text | **必填** | 5 选 1 枚举 | ✅ | ✅ | 操作姿态（人怎么用），第二筛选维度 |
| 3 | `spec.drive_type` | single_line_text | **必填** | 6 选 1 枚举 | ✅ | ✅ | 驱动方式（谁提供推进力），第三筛选维度 |
| 4 | `spec.area_coverage` | single_line_text | **必填** | 5 选 1 枚举 | ✅ | ✅ | 适用面积分段（筛选用，标签干净） |
| 5 | `spec.duty_level` | single_line_text | **必填** | 3 选 1 枚举 | ✅ | ✅ | 使用强度（家用/半专业/商用） |
| 6 | `spec.displacement_cc` | number_decimal | — | cc | — | ✅ | 发动机排量；汽油机填，电池机留空 |
| 7 | `spec.power_w` | number_integer | — | W | — | ✅ | 额定功率；电池/电动机填，汽油机留空 |
| 8 | `spec.cutting_width_mm` | number_integer | — | mm | — | ✅ | 切割宽度（割台幅宽/切割直径/切割幅度） |
| 9 | `spec.bar_length_mm` | number_integer | — | mm | — | ✅ | 导板长度，**链锯专用** |
| 10 | `spec.weight_kg` | number_decimal | — | kg | — | ✅ | 整机重量（须注明是否含电池） |
| 11 | `spec.noise_db` | number_decimal | — | dB(A) | — | ✅ | 操作位噪音（须注明测量距离） |
| 12 | `spec.area_coverage_sqft` | number_integer | — | sq ft | — | ✅ | 适用面积数字版（排序 + 自动化集合 >/< 条件） |
| 13 | `spec.warranty_months` | number_integer | — | month | — | ✅ | 家用保修月数 |
| 14 | `spec.compare_group` | single_line_text | **必填** | 4 预设，可扩展 | — | — | 对比分组键，决定对比页路由与表格行定义 |
| 15 | `spec.compare_hidden` | boolean | — | true / false | — | — | true 时该商品不进对比勾选入口 |
| 16 | `spec.spec_variance_note` | single_line_text | — | 自由文本一句 | — | — | 参数随变体变化时的人话说明 |
| 17 | `platform.battery_platform` | single_line_text | **电池类必填** | 20V/40V/60V/80V/N/A | ✅ | — | 电池平台电压，驱动平台导航 + 自动化集合 |
| 18 | `logistics.shipping_class` | single_line_text | **必填** | 3 选 1 枚举 | — | — | 物流等级，决定产品页徽标 + 购物车提示 |
| 19 | `logistics.needs_liftgate` | boolean | — | true / false | — | — | 需尾板/叉车卸货（超大件） |
| 20 | `logistics.assembly_required` | boolean | — | true / false | — | — | 到货后需买家自行组装 |
| 21 | `logistics.lead_time_days` | number_integer | — | 天（0 = 当日发） | — | — | 备货准备天数 |
| 22 | `acc.consumables` | list.product_reference | — | 商品引用列表 | — | — | 关联耗材（刀片/滤芯/机油/火花塞） |
| 23 | `acc.fitment_note` | single_line_text | — | 自由文本一句 | — | — | 适配说明（配件适用哪款主机） |

---

## 二、按命名空间详查

### A. `spec` 命名空间（16 个）

#### 筛选源字段（5 个）

| 字段 | 值域（写死，北美口径） | 缺值行为 |
| ---- | ---------------------- | -------- |
| `spec.power_source` | `Gasoline` / `Corded electric` / `Battery` / `Propane` | 该商品不出现在"动力源"筛选 |
| `spec.operation_type` | `Walk-behind` / `Riding` / `Remote-controlled` / `Handheld` / `N/A` | 同上 |
| `spec.drive_type` | `Push` / `Self-propelled` / `Front-wheel drive` / `Rear-wheel drive` / `All-wheel drive` / `N/A` | 同上（v4.2 起必填） |
| `spec.area_coverage` | `Under 5,000 sq ft` / `5,000–10,000 sq ft` / `10,000–1 acre` / `Over 1 acre` / `N/A` | 同上 |
| `spec.duty_level` | `Residential` / `Semi-pro` / `Commercial` | 同上（**无 N/A 选项**，耗材不填） |

#### 参数型字段（8 个，进对比表，不做筛选）

| 字段 | 存储 → 北美展示 | 填写规则 |
| ---- | --------------- | -------- |
| `spec.displacement_cc` | cc → cu in | 汽油机填；电池机留空（与 power_w 互补） |
| `spec.power_w` | W → hp | 电池/电动机填；汽油机留空 |
| `spec.cutting_width_mm` | mm → in | 割草机=割台幅宽；打草机=切割直径 |
| `spec.bar_length_mm` | mm → in | **只给链锯**，其他品类一律留空 |
| `spec.weight_kg` | kg → lb | 取运转重量；Kobalt 类裸机值须在文案注明不含电池 |
| `spec.noise_db` | dB(A) → dB(A) | 厂商很少公布；查不到就留空，**不编数** |
| `spec.area_coverage_sqft` | sq ft → sq ft | 与 `area_coverage` 成对出现；供排序与集合 `>`/`<` |
| `spec.warranty_months` | month → month | 取家用保修；商用保修不同时取该型号实际值 |

#### 对比控制字段（3 个）

| 字段 | 规则 |
| ---- | ---- |
| `spec.compare_group` | 预设 `walk-behind-mower` / `riding-mower` / `chainsaw` / `string-trimmer`，商家可扩展。**空值 = 该商品不可加入对比，不兜底**；是跨类型校验的唯一权威键（不用 product_type） |
| `spec.compare_hidden` | `true` = 停产款/订制品排除出对比勾选入口；默认 false |
| `spec.spec_variance_note` | 仅当关键参数随变体变化时填（如 `Deck width varies by variant: 20 in or 22 in`）；非空 → 对比表该列表头出提示图标；为空 → 不渲染任何提示。**注意：本方案没有变体级 metafield，但商品仍可有变体（Option 列）；此字段是"参数只存产品级"的诚实补丁——差异是选购核心就拆独立产品，拆不值得才用它标注** |

### B. `platform` 命名空间（1 个）

| 字段 | 规则 |
| ---- | ---- |
| `platform.battery_platform` | 值域 `20V` / `40V` / `60V` / `80V` / `N/A`。`power_source = Battery` 时**条件必填**。驱动「Shop by Platform」导航与自动化集合（集合条件 = 该字段 is equal to 值）；做筛选源需在定义里开 Storefront 可见性 + 用作集合条件 |

### C. `logistics` 命名空间（4 个）

| 字段 | 规则 |
| ---- | ---- |
| `logistics.shipping_class` | 必填。`Parcel` / `Oversized` / `Freight LTL` 三档；决定产品页物流徽标与购物车汇总提示 |
| `logistics.needs_liftgate` | `true` = 需尾板/叉车卸货；Freight LTL 主机通常为 true |
| `logistics.assembly_required` | `true` = 到货需买家装配 |
| `logistics.lead_time_days` | 整数天；`0` 表示通常当日发出 |

> 物流字段全部**条件渲染**：没填 → 整个物流模块不出现；提示须声明"参考信息，以结账为准"。

### D. `acc` 命名空间（2 个）

| 字段 | 规则 |
| ---- | ---- |
| `acc.consumables` | `list.product_reference`。挂刀片/滤芯/机油/火花塞等复购品；⚠️ 官方 CSV 导入支持该类型（与实测翻车的 list.single_line_text_field 不同），CSV 值 = **目标商品 handle**，多个逗号分隔整格加引号（如 `"honda-21-blade,oil-filter-hf"`）；引用目标必须已存在 → 配件导入后**二次导入更新主机**；handle 拼错**静默忽略**不报错，导入后须抽查渲染。后台亦可手工点选 |
| `acc.fitment_note` | 一句话适配说明，如 `Fits 21 in deck models 2022 and later`；写在**配件侧**，主机不填 |

---

## 三、必填收敛（约束主机，7 必填 + 1 条件必填）

```
spec.power_source · spec.operation_type · spec.drive_type · spec.area_coverage
spec.duty_level · spec.compare_group · logistics.shipping_class
＋ platform.battery_platform（power_source = Battery 时）
```

- 只约束**主机**；耗材/配件因 `power_source`、`duty_level` 无适配值，走"缺值 → 该维度下不出现"，**不要为它们加 N/A**。
- 主题侧无法强制必填 → 交付物是「录入检查清单 + 校验脚本」（SDD §5.7）。

## 四、通用行为约定（速记）

| 场景 | 行为 |
| ---- | ---- |
| 参数缺值 | 规格表/对比表**该行不出现**；对比表显示 `—`，**任何情况不得显示 0** |
| 值域之外 | 平台 CSV **静默忽略**（不报错）——改用 `build-import-csv.py` 预校验 |
| 空值 | 必须真正留空（不能是 `""`、空格、`null` 字符串） |
| 定义建后 | **不得改 key 或类型**（改了等于商家数据失联） |
| 公制存储 | mm / cc / kg / dB / sq ft 存储公制或规范单位；英制展示由 `snippet/spec-value.liquid` 统一换算 |
| 筛选 6 维 | 5 个 spec 筛选源 + `platform.battery_platform`，全部在 Search & Discovery 里由商家配置 |
| 对比表白名单 | walk-behind/riding = 11 行字段；chainsaw/string-trimmer = 10 行（无 drive_type，链锯用 bar_length_mm） |

## 五、CSV 列头对照（导入用）

```
Power source (product.metafields.spec.power_source)
Operation type (product.metafields.spec.operation_type)
Drive type (product.metafields.spec.drive_type)
Area coverage (product.metafields.spec.area_coverage)
Duty level (product.metafields.spec.duty_level)
Compare group (product.metafields.spec.compare_group)
Compare hidden (product.metafields.spec.compare_hidden)
Spec variance note (product.metafields.spec.spec_variance_note)
Displacement (cc) (product.metafields.spec.displacement_cc)
Power (W) (product.metafields.spec.power_w)
Cutting width (mm) (product.metafields.spec.cutting_width_mm)
Bar length (mm) (product.metafields.spec.bar_length_mm)
Weight (kg) (product.metafields.spec.weight_kg)
Noise (dB A) (product.metafields.spec.noise_db)
Area coverage (sq ft) (product.metafields.spec.area_coverage_sqft)
Warranty (months) (product.metafields.spec.warranty_months)
Battery platform (product.metafields.platform.battery_platform)
Shipping class (product.metafields.logistics.shipping_class)
Needs liftgate (product.metafields.logistics.needs_liftgate)
Assembly required (product.metafields.logistics.assembly_required)
Lead time (days) (product.metafields.logistics.lead_time_days)
Consumables (product.metafields.acc.consumables)
Fitment note (product.metafields.acc.fitment_note)
```

> 实际导入样例见 `dev-docs/mower-import/mower-products-import.csv`（割草机 22 列版，无 bar_length_mm）与配套 `sources-and-notes.md`。
