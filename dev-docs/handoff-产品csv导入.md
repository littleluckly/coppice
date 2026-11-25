# Handoff：产品 CSV 导入流水线（Coppice 割草机样例集）

> 生成：2026-09-30 11:11 ｜ 下一会话聚焦：**完成割草机 CSV 的 Shopify 导入与导入后验证**

## Current state

**已交付**（均在 `/Users/xiongweiliu/workspaces/shopify/coppice/`，下称 `WS/`）：

- `dev-docs/mower-import/mower-products-import.csv` —— 割草机导入文件：**50 列（官方模板核心 28 列 + 22 个割草机适用 metafield 列）× 11 款真实机型**，全单变体（11 行）。已由用户导入 Shopify 开发店**成功**。
- `dev-docs/mower-import/build_mower_csv.py` —— 生成脚本（数据内嵌 PRODUCTS 表）。改动数据 = 改表重跑；自带预校验（8 个枚举值域断言、SKU/handle 唯一、单变体 Option1=Title/Default Title、数字列无单位、compare_group 与 Product category 交叉一致），当前 0 错误。
- `dev-docs/mower-import/sources-and-notes.md` —— 每款机器的参数来源 URL + 口径约定（sqft 分段上限映射、运转重量、家用保修、骑乘式 Freight LTL+liftgate+assembly）。
- `dev-docs/metafield-reference.md` —— 23 个 metafield 字段速查表（值域/必填/用途/CSV 列头对照/定义勾选矩阵/acc.consumables CSV 写法）。
- `dev-docs/pages-ui.md` —— 14 个模板页面的用途与 UI 开发工单（与 CSV 导入无直接依赖）。
- `dev-docs/mower-import/product2.csv` —— **用户侧新增**（来源未确认，疑似 Shopify 后台导出或用户改名副本）：12 行，列结构与生成文件一致。下一会话应先确认它的用途/内容差异，勿覆盖。

**已解决的坑（勿重蹈）**：

1. CSV 被电子表格软件保存成 XLSX（扩展名仍 .csv）→ Shopify 报 "Only CSV files are supported"。已重跑脚本恢复。**改数据一律走脚本；表格软件编辑必须"另存为 CSV UTF-8"**。
2. Troy-Bilt Pony 42X 的后台类目建议 "Lawn Tractors (in Tractors)" 是农业分支 → **刻意不采纳**，保留 `Lawn Mowers > Riding Mowers`（SDD §13 硬约束：主机分类全落 Home & Garden + Google 渠道映射 + 店内一致性）。
3. `noise_db` / `power_w` 全部留空——官方未公布，**不编数**（项目铁律）。

**关键口径**（细节见 sources-and-notes.md §2）：`area_coverage_sqft` 取分段上限（Over 1 acre→87120）；重量取运转重量（Kobalt 为裸机 58 lb）；Ryobi RY401150US 有 2025-02 CPSC 召回，描述已加注核批次。

## Next steps（按优先级）

1. **确认 `product2.csv` 是什么**（用户放的新文件，先问/先比对，不要假设）。
2. **导入后验证清单**（SDD §5.9 验收口径）：抽查 5 个商品，确认 6 个筛选维度（power_source / operation_type / drive_type / area_coverage / duty_level / battery_platform）在集合页筛选器出现且计数正确；`Product category` 无"未知分类"。
3. **metafield 定义勾选复核**：23 个定义应全勾 ①Admin API 筛选 ③Storefront 可见性；仅 `platform.battery_platform`、`spec.area_coverage_sqft`、`spec.power_source` 勾 ②用作集合条件；④Analytics 不勾。对照 `metafield-reference.md` §三/§四。
4. **图片导入**：每商品 2–4 张，一张图一行（只填 URL handle + Product image URL + Image position(1 起) + Image alt text）；position 1 = 主图；URL 须公开 https 直链；CSV 只增不删图。图片 URL 就绪后可扩展 `build_mower_csv.py` 加 `images` 字段自动展开图行（已向用户承诺）。
5. **`acc.consumables` 回填**：待配件商品入库后二次导入主机（值 = 商品 handle 逗号分隔整格加引号；handle 拼错静默忽略，导完必抽查渲染）。
6. **自动化集合搭建**：battery_platform（20V/40V/60V/80V）+ Gas Series（power_source=Gasoline）+ 面积范围集合（area_coverage_sqft > / <），对应 SDD §4.3 导航。

## Relevant artifacts

- `dev-docs/sdd.md` —— SDD v4.2，权威文档（§5.9 CSV 流水线、§5.8 定义前置、§3.5 CSV 平台边界）
- `dev-docs/metafield-reference.md` —— 字段速查 + 勾选矩阵
- `dev-docs/mower-import/` —— CSV 本体、生成脚本、来源口径、product2.csv（待确认）
- `dev-docs/pages-ui.md` —— 页面 UI 工单（导入后建页/建集合时参考）
- `.workbuddy/memory/2026-09-29.md`、`2026-09-30.md` —— 过程日志（事故记录、口径决定）

## Suggested skills

- `find-skills` —— 若下一会话需要直连 Shopify 后台操作（建集合/上传图片），先搜有没有 Shopify 连接器/技能，避免纯手工
- `handoff` —— 若导入验证中发现新问题需要再次交接

---

## 2026-11-21 变更：6 款主机带变体轴（导入前必读）

**改了什么**：`build_mower_csv.py` 新增 `VARIANTS` 表，给 6 款主机各追加 1 个变体
（电池机 `Motor power`、汽油机 `Engine displacement`）。商品总数不变（32），文件行数
**55 → 60**（含表头；数据行 = 主行 32 + 变体行 6 + 图片行 21 = 59）。决策与边界见 `sdd.md` §5.4「演示店落地」。

**新的行结构**（一个多变体商品占 3 类行）：

| 行类型 | 特征 | 带哪些列 |
| --- | --- | --- |
| 主行 | 有 `Title` | 全部（含 Option1 name/value、全部商品级 metafield、主图 position 1） |
| 变体行 | **无 `Title`、有 `SKU`** | 只有 `URL handle` / `Option1 value` / SKU / Price / Compare-at / 库存 / 重量 / 税务与履约开关 |
| 图片行 | 无 `Title`、**无 `SKU`** | 只有 `URL handle` + `Image position` / `Product image URL` / `Image alt text` |

顺序：主行 → 变体行 → 图片行。校验器按"有无 SKU"区分变体行与图片行，并会拦截
"变体行误带商品级列"（那会把首行写的 metafield 覆盖掉）。

**导入后必须手工核对**（CSV 校验器管不到平台行为）：

1. 商品数仍 **32**，其中 **6 款是 2 个变体**；没有多出来的商品（若变体被拆成独立商品，
   说明 `Option1 name` 写在了错误的位置）。
2. 抽 `northbark-nb-21b80`：`Power (W)` 仍为 **1600**、`Battery platform` 仍为 **80V**
   —— 证明变体行没有把商品级 metafield 清空。
3. 产品页变体选择器出现两个选项（1,600 W / 1,200 W；166 cc / 150 cc），切换时价格、
   按钮态、单位价跟着变；卡面显示 **From** 且没有折扣胶囊。
4. **第二遍耗材文件必须用新生成的那份**：`pass2` 里的 `Option1` 现在会随轴变化
   （如 `Motor power` / `1,600 W`）。用旧的 `Title / Default Title` 重导会重建变体、
   variant ID 全变，购物车与对比里已加入的项会失效。
5. 变体图**没挂**（`Variant image URL` 列未启用）：mock 变体是同一台机器的另一个功率/排量，
   外观相同，挂别的图反而是错图。要验"变体图联动"需另建带变体专属图的测试商品。
