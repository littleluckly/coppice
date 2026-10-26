# 集合描述文案台账 — collection-descriptions.md

> **性质**：店铺侧数据文案（粘贴源）。集合描述（`collection.description`）在主题中消费于两处：集合页白卡副标题位（T-2.1）+ `list-collections` 集合卡介绍（pages-ui §5）。
> **口径**：Northbark 虚拟品牌（tagline "Better Tools. Greener Tomorrow."）、sentence case、美式英语、1–2 句（SDD §9.1 / AGENTS §9）；"含义"列取自 task-index §1.1.1 菜单树（SDD §4.3），确保文案与集合定位一致。
> **整理日期**：2026-10-14 ｜ 对应任务：`task-collection.md` T-0.1
> **使用方法**：后台 Products → Collections → 打开对应集合 → Description 字段粘贴 → 保存。空集合（20V/60V/品类类）同样粘贴——描述随集合数据存着，导入商品后即用。

---

## 主演示集合

| 集合（handle 建议） | 状态 | 描述文案 | 含义依据 |
| --- | --- | --- | --- |
| Lawn Mowers（`lawn-mowers`） | 主集合，挂 mega 面板/效果图主口径 | Every Northbark mower in one place — gas, battery, push, and riding. Compare cutting widths, runtime, and warranty to find the right fit for your yard. | 全部 11 款割草机的总集合 |
| Most Popular（`most-popular`） | mega 面板 popular 阵列用（task-header T-1.7 第九轮） | The models our customers reach for first — proven picks across every platform and price point. | mega 中区组头 + 产品阵列数据源 |

## 品类子集合（Shop → Mowers）

| 集合 | 状态 | 描述文案 | 含义依据 |
| --- | --- | --- | --- |
| Walk-behind Mowers | 挂菜单（Walk-behind 且非 Push → Self-propelled 另分） | Lightweight mowers you guide from behind. A straightforward match for small and mid-size lawns. | 人力推着走，适合小院与轻中庭 |
| Self-propelled Mowers | 挂菜单 | The mower drives forward — you steer and set the pace. Less pushing on mid-size lawns, slopes, and thicker grass. | 机器自走、人扶方向，中庭院 |
| Riding Mowers | 挂菜单 | Seat-down mowing with steering-wheel or lap-bar control. Built for large lawns, acreage, and open ground. | 有驾驶位/方向盘，大片草坪与斜坡 |

## 平台集合（Shop by Platform）

| 集合 | 状态 | 描述文案 | 含义依据 |
| --- | --- | --- | --- |
| 20V Battery | 空集合，建而暂不挂（含菜单项同理） | Compact 20V power for light yard work — trimming, edging, and quick cleanups around the house. | 入门电压档，轻量单电池 |
| 40V Battery | 非空，必建（4 款：BS/BP/T40B/C40B） | One 40V battery runs the whole lineup — swap the same pack from trimmer to self-propelled mower and charge once. | 主力电压档，家用中大草坪，兼容工具最多 |
| 60V Battery | 非空（1 款：NB-T60B），建且可挂 | Mid-to-high voltage power for bigger yards, sitting between our 40V and 80V platforms. | 中高电压档，较大作业面 |
| 80V Battery | 非空，必建（2 款：21B80/C80B） | Our highest-voltage battery line. Gas-like power and extended runtime for large lawns — no fuel, no fumes, no pull cords. | 高压旗舰档，接近汽油机动力 |
| Gas Series | 非空，必建（13 款，条件 `power_source = Gasoline`：割草机 7 + 打草机 3 + 链锯 3） | Gasoline engines for long run times and heavy work — no charging, ready for large properties and all-day jobs. | 汽油机线，长时间大作业 |

> **计数口径**：以上数字对应 `dev-docs/mower-import/mower-products-import.csv`（2026-10-26 版，21 款主机）。
> 新增商品只要填好 metafield，自动集合的计数自己会变——**本表数字是核对用的，不是配置项**。

## 品类集合（2026-10-26 起 Chainsaws / String Trimmers 非空，可挂菜单；其余仍建而暂不挂）

| 集合 | 状态 | 描述文案 | 含义依据 |
| --- | --- | --- | --- |
| Chainsaws | **非空（5 款），可挂菜单** — 挂之前先给集合填 metafield `custom.compare_group = chainsaw` | Gas and battery chainsaws for felling, limbing, and storm cleanup — matched by bar length and power class. | 伐木、砍枝、清理倒木与堆料 |
| String Trimmers | **非空（5 款），可挂菜单** — 挂之前先给集合填 metafield `custom.compare_group = string-trimmer` | Trim and edge where the mower can't reach — lightweight shafts built for fences, beds, and slopes. | 修边、割灌木，细窄轻量 |
| Accessories: Blades & Bars | 建集合暂不挂 | Wear parts that keep you cutting — mower blades, chainsaw bars, and chains sized to fit your model. | 磨损件：割草刀、锯条，最常复购 |
| Accessories: Filters | 建集合暂不挂 | Air and oil filters on a replacement schedule — pick by model to keep your engine breathing clean. | 保养件：空气/机油滤芯，按周期更换 |
| Accessories: Batteries & Chargers | 建集合暂不挂 | Extra packs and chargers for every Northbark platform — keep one charged while the other works. | 平台配件：同电池跨工具复用 |
| Oils & Fuel | 已移出主导航（SDD v4.3），集合与商品照常导入 | Engine oil, bar oil, and fuel treatments matched to Northbark engines and their service intervals. | 机油与燃油，经产品页耗材关联与 footer 承载 |

---

> **维护规则**：文案变更直接改本文件并在后台同步粘贴；新增集合时追加行。空集合不挂菜单的规则见 task-index §1.1.1（防空页，SDD §9.4）——描述先备好不等于要展示。
