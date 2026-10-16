# 集合页（collection.json）开发任务清单 — task-collection.md

> **性质**：SDD 驱动开发的页面级任务清单（v1.0）。拆解自 `dev-docs/pages-ui.md` §4（集合页工单）与 `dev-docs/sdd.md` 对应章节（§6.1 / §6.2.2 / §8.1 / §8.2 / §8.3 / §13），并以 Northbark 集合页效果图（`dev-docs/ref-mockup-collection-northbark.jpg`）为视觉参照，**不引入未经拍板的新决策**。
> **权威关系**：与 SDD / pages-ui 冲突时，以 `dev-docs/sdd.md` 为准；本清单只负责把集合页工作切成可执行、可验收的任务。
> **范围**：仅 `templates/collection.json` 及其 section + `snippets/product-card.liquid` 的快加扩展（含首页复测连带）。header/footer group、搜索页接线、购物车抽屉**不在本清单内**（见 §0 外部依赖）。
> **版本**：v1.1（2026-10-14：拍板 8 侵入式白卡，T-2.1 +0.25）｜ 整理日期：2026-10-13 ｜ 总人日：**7.25**（累加链见 §3）
> **2026-10-13 拍板记录**（Grill Me 追问后刘工裁定）：
> 1. 商品卡**星级评分不做**（依赖评论 App 或伪造数据，双双撞红线）。
> 2. 商品卡**快速加购做，仅单变体款**；多变体款**不显示按钮**；逻辑**进共享 snippet，全局生效**（首页 featured-collection 同步获得，需复测首页）。
> 3. 商品卡**徽标（Best Seller / New）v1.0 不做**（无数据源，级联代价大，不在强制矩阵）。
> 4. **价格筛选走原生形态**（min/max 输入或滑杆；效果图的固定区间勾选需自研，撞"不自研 AJAX 筛选"红线，接受形态差异）。
> 5. **面包屑做**（效果图有、文档未提——按低成本补齐，随 T-0.2 级联回 pages-ui §4）。
> 6. **分页用数字分页**（原生 `paginate`，与效果图一致）。
> 7. **筛选器 UI 层完全自主重写**（DOM 结构 / 样式 / 交互壳不照搬 Dawn）；**数据层与更新机制仍走原生**——`collection.filters` + 原生 URL 参数 + Section Rendering API，**"不自研 AJAX 筛选"红线保留**（2026-10-13 拍板后同日更正确认；曾短暂提出删红线，已撤回）。
> 8. **横幅布局升级为"侵入式白卡"**（2026-10-14，效果图 v2 = `ref-mockup-collection-northbark-v2.jpg`）：面包屑 + H1 + 副标题置于白色圆角卡内，白卡上移侵入横幅；曲线**全部 CSS 实现**（border-radius + 伪元素 radial-gradient 反向弧），**图片保持矩形不烤形状**（复用 hero 矩阵、响应式自适应、商家换图不破样、LCP 不受影响）。T-2.1 人日 0.5 → 0.75。
> **通用约束**：以下不逐任务重复——文案走 `t:` 键、URL 走 `routes`、图片 `image_tag` + width/height + 焦点裁剪、JS 一律 defer/async、隐藏组件首次打开才建 DOM、JS 组件一律 Custom Element（`AbortController` 防重复绑定）、类名 Skeleton 风格 BEM、设计令牌走 `css-variables.liquid`（AGENTS.md §4/§6）。

---

## 0. 外部依赖（不在本清单内，但影响集合页）

| 依赖 | 现状（2026-10-13） | 影响 | 处置 |
| --- | --- | --- | --- |
| CSV 重导（`task-index.md` T-0.1） | ✅ 已闭环（2026-10-13 刘工确认：Northbark 新 CSV 已导入、旧真实品牌商品与图已删，店内仅存 CSV 数据无脏数据；CSV 文件本体同日复检 0 错误，BUG-035——磁盘副本曾再损为 XLSX，导入前从脚本现生成） | 集合页数据前提已就绪 | 不再阻塞；**S&D 筛选源配置核查仍留在本清单 T-0.1**（店铺配置，重导不覆盖） |
| header-group cart 入口 | 本期仅跳转 `routes.cart_url`（pages-ui §1.1 拍板） | 快加后**无抽屉、无计数联动**——已拍板接受半截体验，v1.1 购物车抽屉立项后补 | 接受；快加反馈仅按钮态 + aria-live 播报 |
| Search & Discovery 筛选源配置 | ✅ **2026-10-13 刘工配置完成**（7 个筛选源 + Empty values=Hide + 搜索/联想/缺货设置；店铺配置，SDD §5.8 前置开关） | 6 维 metafield 筛选 + price 内置筛选已可在 `collection.filters` 中取到 | 已闭环；抽查归入 T-4.1 |
| `snippets/product-card.liquid` / `spec-value.liquid` | ✅ 已完成（task-index T-1.1/T-1.2） | 集合页商品卡直接复用 | T-1.1 只做扩展，不重写 |
| 搜索页 `search.json` 筛选接线 | 未开发（pages-ui §11 复用 faceted-filters） | 本清单的筛选 section 按**可复用**设计 | 搜索页接线另立清单，不在本清单验收 |

---

## 1. 任务分解

### P0 前置（数据、素材与文档级联）

#### T-0.1 演示数据与素材核查 · 0.5 人日 · 依赖：无（CSV 重导已闭环，task-index T-0.1 ✅ 2026-10-13）

- [x] Search & Discovery 配置筛选源 ✅ **2026-10-13 刘工后台配置完成**（**Add filter ×7**——`spec.power_source` / `spec.operation_type` / `spec.drive_type` / `spec.area_coverage` / `spec.duty_level` / `platform.battery_platform`（均 Product metafield，显示名 Power source / Operation / Drive type / Lawn area / Duty rating / Battery platform）+ **Price（内置）**；顺序拖成同此表（=效果图）；内置项只留 Price，不配 Availability/Tag/Vendor 等；**app 设置 → 筛选条件 → Empty values = 「Hide」✅ 同日确认**（平台层 0 值开关；主题侧 T-2.2 仍保留 `filter_value.count > 0` 防御性隐藏作双保险；上限事实：每店 ≤25 个筛选器、每来源仅一次）；Search results 三项全勾 / Predictive search 五项全勾 / Out of stock = At the end 同日配毕；**Grouped values 未使用**（拍板见 T-2.2）。**前置复查**：6 个筛选源 metafield 定义仍勾着 Online Store 渠道可见性（掉了 collection.filters 取不到，SDD §5.8）；**Content → Menus 出现"主题不支持筛选"提示属正常**（Skeleton 未渲染 filters，T-2.2 完成后消除）。**定性（2026-10-13 刘工问评分 2.7 是否引入）**：必装、无替代——官方免费 app 前台零注入，SDD §3.3 已核实"店铺配置不构成 App 依赖"；metafield 定义里的 Admin 筛选/集合条件/Storefront API/Analytics 开关均不产生前台集合页筛选器（作用域不同），S&D 是唯一配置入口
- [ ] 抽查：6 维筛选值全部出现在集合页筛选器且 `filter_value.count` 正确（对应 SDD §5.9 抽查 5 商品项；**验证前置**：Skeleton 不渲染筛选器，需 T-2.2 完成或临时推 Dawn 验证——归入 T-4.1 一起做）
- [ ] 集合横幅图：**复用 hero / 用例图矩阵**（同 task-index 平台卡做法，不出新图），上传为 `collection.image`（**操作**：后台 Products → Collections → Lawn Mowers → Collection image 区块，选 16:9 横图如 `mower-large-lawn-*-pc`；每集合各传各的，商家可换，主题无图时白卡退化贴顶——T-2.1 降级逻辑）
- [ ] Lawn Mowers 集合标题/描述按 Northbark 虚拟品牌口径填写（§9.1；描述即效果图副标题位）——**文案已备齐：16 个集合的描述见 `dev-docs/collection-descriptions.md`（2026-10-14），后台逐个粘贴即可**

#### T-0.2 文档级联 · 0.5 人日 · 依赖：无（拍板即改） ✅ 2026-10-15 完成

- [x] SDD §6.1 / §8.1 补记快加决策（2026-10-13：仅单变体款、多变体无按钮、进共享 snippet 全局生效、aria-live 播报、无 JS 表单降级），SDD 版本号级联（v4.3 → **v4.4**，§6.1 增补快加/筛选 UI/面包屑/横幅布局四行）✅ 2026-10-15
- [x] pages-ui §4 补记：侵入式白卡布局 + 面包屑行 + 商品卡快加注记 + 价格筛选原生形态说明（与效果图差异）+ 筛选实现形态（snippet 通用件 + 单 GET form）✅ 2026-10-15（备份 pages-ui.md.bak-20261015 / sdd.md.bak-20261015）
- [x] 效果图存档 `dev-docs/ref-mockup-collection-northbark.jpg` ✅ 已随本清单归档（2026-10-13）；v2 归档 `ref-mockup-collection-northbark-v2.jpg`（2026-10-14）

### P1 共享组件扩展

#### T-1.1 `snippets/product-card.liquid` 扩展：快速加购 · 1.0 人日 · 依赖：T-0.2 🔄 代码完成（2026-10-15），待 theme check + 开发店实测后转 ✅

- [ ] **单变体且 available** → 渲染快加按钮：Custom Element 封装，`fetch /cart/add.js` 提交，成功后按钮短暂 "Added" 态 + `aria-live="polite"` 播报（SDD §8.2 动态区域硬规定）
- [ ] **多变体款 → 不渲染任何 CTA**（拍板 2；卡面右下角留白，转化路径走产品页）
- [ ] 售罄 → 按钮显示 Sold out 并 `disabled` 置灰（缺值/缺货通用行为，pages-ui §0）
- [ ] **无 JS 降级**：按钮包在产品表单内，无 JS 时 POST `/cart/add` 跳 `routes.cart_url`（SDD §6.3 降级原则同源）
- [ ] 快加数量固定 1，不出现数量选择器
- [ ] 触摸目标 ≥ 44×44px；文案键落 `locales/` 双文件（`en.default.json` + `en.default.schema.json`）
- [ ] **首页复测**：featured-collection 卡片行为变更 → 复测快加三态（单变体/多变体/售罄）+ 回填 `task-index.md` T-4.1 状态

### P2 集合页 sections（pages-ui §4 线框自上而下）

#### T-2.1 `sections/collection-banner`（并入 collection 主体或独立 section，实现时定） · 0.75 人日 · 依赖：T-0.1 🔄 代码完成（2026-10-15），待 theme check + 实测

- [ ] **侵入式白卡布局**（拍板 8，效果图 v2）：面包屑 + 集合标题 + 描述置于白色圆角面板内，面板 `margin-top` 负值上移侵入横幅；圆角走 `border-radius` + 设计令牌；面板与横幅相交处的反向弧用伪元素 + `radial-gradient`；**横幅图保持矩形原样输出**（`image_tag` + 焦点裁剪 + width/height；首屏图 eager）
- [ ] **面包屑**（拍板 5）：`<nav aria-label="Breadcrumb">`，Home / 集合名，纯文本链接走 `routes.root_url`；页内唯一 `h1` 仍是集合标题（在白卡内）
- [ ] 集合无图 → 白卡退化为普通区块贴顶（不侵入、不裂版）；显隐设置（pages-ui §4 collection-banner 行）
- [ ] **移动端降级**（✅ 2026-10-14 拍板：方案 A）：`<990px` 白卡**不侵入**，正常贴横幅下方堆叠（`margin-top: 0`），圆角保留；桌面端（≥990px）负 margin 侵入 + 反向弧全量生效

#### T-2.2 `sections/faceted-filters`（§6.1 本页最重任务） · 1.5 人日 · 依赖：T-0.1 🔄 代码完成（2026-10-15），待 theme check + 实测（实现形态变更：筛选为 snippet 通用件，见 T-3.1 注）

- [ ] 渲染 `collection.filters` **全部商家配置来源**（metafield + price + 内置项），不自研筛选逻辑、不发明数据（红线 §11 风险 7）
- [ ] **UI 层完全自主**（拍板 7）：DOM 结构、样式、交互壳自研，不照搬 Dawn 结构——但筛选状态、计数、结果全部来自后端重算，前端零筛选逻辑
- [ ] **S&D "Grouped values" v1.0 不使用**（2026-10-13 拍板：演示值少语义清晰，分组伤 URL 可读性与数据核对；将来值域膨胀或商家要营销分类时再启用——届时先实测组在 `collection.filters` 对象里的暴露形态，再定渲染方案）
- [ ] 每个筛选值显示 `filter_value.count`；**0 值按设置置灰或隐藏**（SDD §6.1）
- [ ] 三布局：桌面**侧栏** + 移动**抽屉**（拍板范围；横条布局留 schema 预留项，v1.0 不实现）
- [ ] 移动抽屉：**原生 `<dialog>` + `showModal()`** + `scroll-lock` 属性锁背景滚动；Esc 关闭回焦；**首次打开才建 DOM**；不手写焦点陷阱
- [ ] **无刷新**：筛选表单提交走 **Section Rendering API（`?section_id=`）** 局部更新网格 + 计数 + 已选标签；URL 用原生筛选参数——可分享、刷新保留（SDD §6.1）
- [ ] 价格筛选：**原生 min/max 输入或滑杆形态**（拍板 4，与效果图区间勾选不一致，接受）
- [ ] JS 组件 Custom Element 封装，`AbortController` 一次性拆绑（AGENTS.md §6）
- [ ] 动态区域（结果计数变化）`aria-live="polite"`

#### T-2.3 `sections/active-facets` · 0.5 人日 · 依赖：T-2.2 🔄 代码完成（2026-10-15），待 theme check + 实测（实现为 snippet，见 T-3.1 注）

- [ ] 已选标签逐个移除（✕）+ Clear all 全部清除；标签数据来自当前 URL 参数（pages-ui §4 active-facets 行）
- [ ] 移除/清除后同走 Section Rendering 局部更新；操作结果 aria-live 播报

#### T-2.4 `sections/product-grid` + 工具条 · 1.0 人日 · 依赖：T-1.1 🔄 代码完成（2026-10-15），待 theme check + 实测（并入主体 section，见 T-3.1 注）

- [ ] 商品卡网格消费 `snippets/product-card.liquid`（图 + 标题 + 价格 + 2–3 参数 + 对比勾选 + 快加，SDD §8.1 体量约束）；循环内不做 metafield assign
- [ ] 排序：`collection.sort_options` 原生表单，提交同走 Section Rendering 局部更新
- [ ] 结果计数（"X products"）aria-live 播报
- [ ] **数字分页**（拍板 6）：`{% paginate %}` + `default_pagination`，与效果图一致
- [ ] 空态两场景：**筛选无结果** → 空态文案 + 清除筛选入口；**空集合** → 空态 + 推荐集合入口（pages-ui §4 状态要点）

### P3 组装与文案

#### T-3.1 重写 `templates/collection.json` + locales 键 · 0.5 人日 · 依赖：T-2.1 ~ T-2.4 🔄 代码完成（2026-10-15），待 theme check + 实测

> **实现形态（2026-10-15，最终落地）**：`sections/collection.liquid` **单主体 section**（横幅 + 侵入白卡 + 面包屑 + 两栏 + 工具条 + 网格 + 分页 + 空态 + 移动 dialog），**复用单元走 snippet**——`faceted-filters.liquid`（筛选组）、`active-facets.liquid`（已选标签）、`product-card.liquid`（卡）——搜索页复用 snippet 而非 section。跨 section 两栏布局不可行（每 section 有独立包裹层），故不再拆 facet/grid 独立 section；"筛选 section 可复用" 的验收口径由 snippet 承接。卡片样式迁至共享 `assets/product-card.css`（首页/集合页/搜索页三处消费，AGENTS §6 跨 section 判据）。JS：`assets/faceted-filters.js`（`<collection-facets>` 控制器，委托监听 + Section Rendering 局部替换 + replaceState + dialog 面板移动）、`assets/quick-add.js`（`<quick-add>`）。templates/collection.json 沿用基线引用（settings 走 schema 默认值）。

- [ ] collection.json 按 pages-ui §4 顺序组装：collection-banner → faceted-filters → active-facets → product-grid（工具条/分页并入 grid 或独立 section，按实现定，保持 section 职责单一）
- [ ] 替换 Skeleton 基线 `sections/collection.liquid` 现有实现（h1 + 简单网格）
- [ ] 所有文案键落 `locales/en.default.json` + `en.default.schema.json`；`python3 tools/check-locale-keys.py` 0 错误

### P4 集合页验收

#### T-4.1 集合页验收 · 1.0 人日 · 依赖：T-3.1

- [ ] `shopify theme check` 涉集合页文件 0 Error
- [ ] **6 维筛选全部出现且计数正确**（SDD §13 验收项；缺配置暂停报商家侧问题）
- [ ] 筛选后 URL 可分享、刷新保留；canonical 无自拼伪路径（§6.1 SEO 行）
- [ ] 移动抽屉：键盘可达、焦点锁定、Esc 回焦、触摸目标 ≥ 44px、首次打开才建 DOM
- [ ] 快加冒烟：单变体款加购成功 + aria-live 播报；多变体款无按钮；售罄置灰；**无 JS 可整页表单加购**
- [ ] 对比勾选：集合页勾选 → 对比栏出现（与 compare 体系联动冒烟，§6.2.2）
- [ ] Lighthouse：Performance 桌面+移动 ≥ 60 准入/80 目标、LCP < 2.5s、CLS < 0.1；Accessibility ≥ 90/95——**实测值回填本清单**
- [ ] 空态两场景实测（筛选无结果 / 空集合）
- [ ] 无 JS 底线：网格可看、筛选表单可整页提交、商品卡可点进产品页
- [ ] 主流程冒烟：筛选 → 产品页 → 对比 → 加购 → 购物车 → 结账（SDD §8.3 验收路径，集合页为起点）

---

## 2. 验收锚点对照

| 任务 | pages-ui | SDD | 效果图拍板 |
| --- | --- | --- | --- |
| T-0.1 | §0 前置开关 | §5.3 A、§5.8、§5.9 | — |
| T-0.2 | §4（级联回写） | §6.1、§8.1 | 拍板 1/2/4/5 |
| T-1.1 | §4 product-grid 行 | §8.1、§8.2、§6.3 | 拍板 2（快加/多变体/无按钮） |
| T-2.1 | §4 collection-banner 行 | §7.1（Sections Everywhere）、§8.2 | 拍板 5（面包屑）、拍板 8（侵入式白卡/CSS 曲线） |
| T-2.2 | §4 faceted-filters 行 | §6.1 全部、§8.2、§11 风险 7 | 拍板 4（价格原生形态） |
| T-2.3 | §4 active-facets 行 | §6.1 已选标签行 | — |
| T-2.4 | §4 sort/count/pagination 行 | §8.1（卡 2–3 参数）、§8.2 | 拍板 1/3（无评分/无徽标）、拍板 6（分页） |
| T-3.1 | §4 全页 | §7.1 #1 | — |
| T-4.1 | §4 状态要点 | §6.1 五条、§8.1/§8.2/§8.3/§13 | 全部 6 项复核 |

## 3. 人日累加链

```
T-0.1 0.5 + T-0.2 0.5 = 1.0
+ T-1.1 1.0 = 1.0   （累计 2.0）
+ T-2.1 0.75 + T-2.2 1.5 + T-2.3 0.5 + T-2.4 1.0 = 3.75   （累计 5.75）
+ T-3.1 0.5   （累计 6.25）
+ T-4.1 1.0   （累计 7.25）
────────────────────────────
合计 7.25 人日（v1.0→v1.1：T-2.1 因拍板 8 侵入式白卡布局 0.5→0.75；其余估算同 v1.0）
```

> **维护规则**：SDD / pages-ui 变更时同步本清单对应任务；任务状态变更（完成/阻塞）在条目后加 `✅ 日期` / `⛔ 原因` 标注；追加任务插入对应阶段并重编号前先检查锚点表引用。首页复测结论回填 `task-index.md` T-4.1。
