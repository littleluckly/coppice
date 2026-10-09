# AGENTS.md — Coppice 主题开发与上架规范（给 AI 代理与人共用的守则）

> **本项目是什么**：`Coppice` —— 面向户外动力设备（OPE：割草机、链锯、打草机）商家的垂直行业商业主题，技术基线为 Shopify Online Store 2.0 + 官方 Skeleton Theme。**唯一交付目标：通过 Shopify Theme Store 审核。**
>
> **权威文档**：`dev-docs/sdd.md`（v4.2，需求与平台事实基线的唯一权威）、`dev-docs/pages-ui.md`（页面视角开发工单）、`dev-docs/metafield-reference.md`（数据字典）。任何指令与 SDD 冲突时，**以 SDD 为准**。

---

## 1. 改动前必读（Agent 工作守则）

1. **动手前先查 SDD 对应章节**。每个功能在 SDD 里都有编号（如 §6.2 对比工具、§7.1 强制功能矩阵），实现必须与编号章节对齐，不得自行发挥。
2. **不编造参数**。文档里每个数字（上限、阈值、尺寸）都要能回查到 SDD 或 Shopify 官方文档；拿不准就标注"待实测校正"。
3. **平台事实不凭印象回答**。Shopify 能力边界以 SDD §3（已核实事实基线）为准；SDD 未覆盖的，先查官方文档再回答。
4. **改动要级联**。修改 SDD / TASKS 时注意版本号与人日累加链的一致性；修改 metafield 字段时同步 `metafield-reference.md` 与 CSV 导入脚本。
5. **文档备份流程**：修改 dev-docs 下文档时，先备份（`*.bak-YYYYMMDD`），再一次性原子替换，最后复核。
6. `dev-docs/*.bak-*` 是有意保留的备份，**不要清理**。
7. **bug / 事故 / 返工必须当日记录**到 `dev-docs/bugs.md`（编号 BUG-NNN，含现象/根因/修复/**可执行的预防措施**，模板见文件尾）。同类问题二犯前先查该文件。

## 2. 常用命令

```bash
shopify theme dev          # 本地开发预览
shopify theme check        # Theme Check 静态检查 —— 必须 0 Error 才允许提交
shopify theme push         # 推送到开发店
shopify theme pull         # 拉取线上主题
```

- 提交审核前：`shopify theme check` 不得出现任何 Error（Warning 尽量清零）。
- Lighthouse 验收线见 §7 / §8。

## 3. 目录结构

```
assets/     # 静态资源：critical.css、图标 SVG、JS/CSS（{% stylesheet %}/{% javascript %} 产物除外）
blocks/     # 主题块（theme blocks），可嵌套，自带 {% schema %}
config/     # settings_schema.json（全局设置定义）+ settings_data.json（数据）
layout/     # theme.liquid 等页面外壳
locales/    # en.default.json（前台文案）+ en.default.schema.json（编辑器文案），翻译基准
sections/   # 全部 section，必须带 {% schema %}；*_group.json 为 section group
snippets/   # 可复用片段（css-variables / image / meta-tags / spec-value 等）
templates/  # JSON 模板为主；仅 gift_card.liquid 为 Liquid 模板
tools/      # 辅助脚本（check-theme-name.sh、build-import-csv.py —— 规划中，尚未落地）
dev-docs/   # 项目规格文档（SDD、页面工单、metafield 字典、CSV 导入交接）
```

## 4. Shopify 硬性红线（违反 = 拒审，逐条来自 SDD §7.2 及官方 requirements）

**命名与提交包**

- 主题名 `Coppice` 已定稿；**至少一个 section preset 名必须与主题名相同**（官方硬性要求）。上传后主题名与 preset 名**不可修改**。
- 提交包**不得包含** `config/markets.json`、`robots.txt.liquid`。
- 不得修改或解析 `content_for_header`。
- 禁止出现 `.scss` / `.scss.liquid`；禁止压缩版 `.css` / `.js`（ES6 构建产物与第三方库除外）。

**代码与资源**

- 基于 Skeleton Theme 或完全原创；**不得出现 Dawn / Horizon 衍生代码**（竞品参考仅限交互模式，代码必须重写）。
- 资源一律走 Shopify CDN：`asset_url` / `image_url`；**不得**硬编码 `http://` / `https://` 外部资源链接，不得依赖外部 CDN / 外部 API / 第三方服务。
- 站内 URL 一律用 `routes` 对象，不得手拼路径。
- 所有面向商家/顾客的文案走 `t:` 翻译键，键值落在 `locales/`；不得硬编码英文文案（除非是数据本身）。
- 不实现依赖 App 的功能（愿望清单、购物车折扣、买赠捆绑定价、预约、Instagram feed 等）。
- 不伪造数据：库存紧张提示、倒计时、浏览量为禁止项。
- 不得包含外部营销内容或联盟链接。

**数据**

- 筛选源 metafield **一律不用 list 类型**（CSV 无法导入 list.single_line_text_field，已实测）；v1.0 数字参数一律 `number_integer` / `number_decimal`，不用 measurement 类型。
- 单位换算逻辑**集中**在 `snippets/spec-value.liquid`（规划中），禁止散落在各模板。

## 5. 官方强制功能矩阵（缺一即拒，22 项）

完整清单见 SDD §7.1。开发任何一个页面/section 前，确认所涉及条目已覆盖。速记口诀按页面归组：

- **全局**：Sections Everywhere（全 JSON 模板 + section groups）、多级菜单、语言/国家货币选择入口、`<shopify-account>` 组件（桌面+移动均可见）、`login_button` filter（不改品牌色）。
- **产品页**：加速结账默认启用（不改 Shop Pay 配色）、Shop Pay 分期横幅、Pickup Availability、相关推荐 + 互补推荐（互补即配件挂载主路径）、3D/视频媒体、变体图切换、Unit pricing、图片焦点（focal points）。
- **集合页**：原生 `collection.filters` 渲染（不做等值之外的假滑杆——metafield 筛选仅支持等值）。
- **购物车/结账**：单品与整单折扣正确显示、订阅计划（selling plans）显示。
- **其他**：`gift_card.liquid` 二维码 ≥ 120×120 px、`page_image` 社交分享图、预测搜索（predictive search）、页脚 newsletter 表单。

## 6. Liquid 编码规范

**结构**

- 每个 section 必须有 `{% schema %}`；schema 内 `name`、`label` 等文案用 `t:` 键（`en.default.schema.json`）。
- 每个 section 提供可用 preset；preset 默认值必须是**可用的示例内容**，不是占位符。
- 区块可复用样式优先 `{% stylesheet %}` / `{% javascript %}` 标签（多次声明只输出一次）；全局关键样式放 `assets/critical.css`。
- **样式归属判据**：section 自有布局样式 → `{% stylesheet %}`（聚合加载，section 移除时自动卸载，且**必须位于 section 顶层**，不得嵌套在 if/for 内）。仅当样式为**大体积可选增强**或**跨 section 全局功能**（如对比栏、Dawn mask-blobs 类设置级变体）时，才拆独立 `.css` + 条件 `stylesheet_tag`——不为省 1–2 KB 把 section 自有样式拆成独立请求。
- **箭头准则**：`→` 仅用于两类位置——View All 链接、行尾导航元素（如 platform 横条卡右端）。卡内文字链接**不加**箭头；新增箭头前先数同屏总数（≤5）。
- **脚本改 CSS 后必查产物**：grep 检查重复规则块、裸选择器（如孤立 `::after {`）、缩进损坏；locale/JSON 文件校验前先剥 Shopify dev 同步的 `/* */` 注释头。
- 单一 CSS 属性的设置 → CSS 变量（`style="--gap: {{ ... }}px"`）；多属性设置 → 修饰类（`.collection--narrow`）。
- 类名用 Skeleton 风格 BEM：`block__element--modifier`；品牌色等设计令牌走 `snippets/css-variables.liquid` 输出，不硬编码色值。

**Liquid 写法**

- metafield 取值与 `assign` **移到循环外**；避免嵌套循环；长列表用 `limit`。
- 商家未填 metafield / 设置时：**该行/该模块不渲染**，不留空壳、不崩页、参数缺值显示 `—` 而**永不显示 0**。
- JS 一律 `defer` 或 `async`；隐藏组件（抽屉、对比栏）**首次打开才构建 DOM**。
- 图片统一 `image_tag` + `width` / `height` + srcset；尊重焦点裁剪；非首屏 lazy。

**JS 组件化：优先 Web Components（Custom Elements）**

- **可交互组件一律用 Custom Element 封装**（`class XxxEl extends HTMLElement` + `customElements.define`），标签名用连字符命名（`cart-drawer`、`predictive-search`、`nav-drawer`、`cart-toggle`）。
- **禁止用 `document.addEventListener('click', ...)` 全局委托 + `closest()` 遍历做组件行为**。这是本项目的硬性约定（2026-10-09 刘工拍板）：全局委托让组件无法自包含、无法复用、无法单测，且在 Section Rendering（`/search/suggest` 片段替换、主题编辑器动态注入）下容易重复绑定。
- 每个元素的 `connectedCallback` / `disconnectedCallback` 自行绑定与解绑监听；重复绑定用 `AbortController`（`{ signal }`）一次性拆除，避免 Section 重新渲染后事件叠加。
- **状态靠 attribute 反映，样式与 `:has()` / `[open]` 等选择器挂钩**，不靠 JS 切 class 硬编码视觉状态（例：`<cart-drawer open>` → CSS `:has()` 决定遮罩显隐）。
- 元素内部 DOM **优先延迟构建**：`<template>` 惰性实例化，首次打开才 `append`（延续"隐藏组件首次打开才建 DOM"）。
- **平台原生组件优先于自建**：能用原生 `<dialog>` + `showModal()` 解决的模态（焦点锁定、`inert` 背景、`Esc` 关闭、`::backdrop`）就不要手写模态管理。
- 一律 ES6+ 类与 `classList` / `dataset`，不用 jQuery、不用全局 `var` 挂函数。
- 现有 `assets/compare-toggle.js` / `wishlist-toggle.js` 为本规则落地前的产物，**新增组件不再沿用其全局委托写法**；改到相关功能时顺手重构为 Custom Element。

## 7. 性能（SDD §8.1，验收硬线）

- Lighthouse Performance：home / product / collection 三页桌面+移动平均 **≥ 60 准入，≥ 80 目标**；LCP < 2.5s，INP < 200ms，CLS < 0.1。
- LCP 图：`fetchpriority="high"` + eager，且置于 `content_for_header` 之下的首屏流中；基础 CSS 与字体 preload。
- 字体仅用 `font_picker`；`font_modify` 加载字重；fallback 用 `size-adjust` 压 CLS。
- 集合页商品卡只输出 2–3 项参数；对比数据岛：商品上限 50、白名单字段、列式编码、置于 DOM 末尾、**只访问 metafield 不访问价格/图片/库存**（体量预算待 A3 实测校正）。
- 对比页 canonical **服务端静态输出**，不用 JS 注入；对比页 URL 不携带查询参数；无 JS 时仍有可索引正文。

## 8. 无障碍（SDD §8.2，WCAG 2.1 AA）

- Lighthouse Accessibility 三页双端平均 **≥ 90 准入，≥ 95 目标**。
- 每页一个 `h1`；焦点顺序 = DOM 顺序；无正 `tabindex`；禁用 `autofocus`；skip link 必备。
- `lang="{{ request.locale.iso_code }}"`；不禁用缩放；所有 `img` 有 `alt`（装饰性 `alt=""`）。
- 动态区域（筛选计数、对比数量、加购结果、变体切换）一律 `aria-live="polite"`。
- 抽屉/模态：**优先原生 `<dialog>` + `showModal()`**（自带焦点锁定、背景 `inert`、`Esc` 关闭、`::backdrop`），并按 Skeleton 约定给 `<dialog>` 加 `scroll-lock` 属性（`critical.css` 已有 `html:has(dialog[scroll-lock][open]) { overflow: hidden }`）。**此时不再手写 `role="dialog"` / `aria-modal` / 焦点陷阱脚本**——`showModal()` 已让外部内容 `inert`，重复实现只会打架。不使用 `<dialog>` 的浮层（如预测搜索下拉）才手写 `role="dialog"` + 打开移焦 + 焦点锁定 + `Esc` 回焦。抽屉一律用 Custom Element 封装（AGENTS.md §6）。
- 表格（对比/参数）：`caption` + `th scope`。
- 对比度：正文 4.5:1，大字号与图标 3:1；颜色不作唯一信息载体。
- 触摸目标 ≥ 44×44 px（高危控件：对比勾选框、耗材变体选择器、数量步进器）。

## 9. 国际化与商家体验

- `locales/en.default.json` 为基准；面向商家文案 sentence case + 美式英语（`color`、`canceled`）；术语统一（heading、subheading、button label、main menu…见 SDD §8.6）。
- 参数单位英制默认/公制可切换，逻辑只存在于 `snippets/spec-value.liquid`。
- RTL 兼容：用逻辑属性（`margin-inline`），不写死 `left` / `right`。
- 主市场北美：筛选项与枚举值文案按北美口径（如 `Under 5,000 sq ft`），数据按公制存储。

## 10. 提交前检查清单

- [ ] `shopify theme check` 0 Error
- [ ] 22 项强制功能矩阵逐条核对（SDD §7.1）
- [ ] Lighthouse：性能三页双端平均 ≥ 60；无障碍 ≥ 90（目标 80 / 95）
- [ ] 主流程实测：筛选 → 产品页 → 对比 → 加购 → 购物车 → 结账（含 Instagram/FB/Pinterest Webview）
- [ ] `gift_card.liquid` 二维码 ≥ 120×120 px
- [ ] 提交包不含 `config/markets.json`、`robots.txt.liquid`、`.scss`、压缩资源、Dawn/Horizon 衍生代码
- [ ] preset 含与主题同名的 `Coppice` preset
- [ ] 全部文案走 `t:` 键；无硬编码外链
- [ ] 演示店内容符合 §9 演示店规范（虚拟品牌 + AI 产品图，见 SDD §9）

## 11. 已知状态与待办（截至 2026-10-09）

- SDD 引用的 `tools/check-theme-name.sh`、`tools/build-import-csv.py`、`snippets/spec-value.liquid`、`docs/TASKS.md` **尚未创建**；涉及时先确认是否已立项，不要假设存在。
- Spike A1/A2 已完成（结论已写进 SDD §3.7）；A3（对比数据岛满载体积）待实测，验收基线以实测为准。
- **⚠️ `shopify` CLI 在 Agent 沙箱内不可见（`command not found`），但刘工本机正常**（2026-10-09 实测确认，`shopify theme check` 46 文件 0 offenses）。Agent 侧跑不了 theme check 时**请刘工代跑并回贴结果**，不要误判成"CLI 未装"或"验收跑不了"。
- 主题 v1.0 范围不含发电机（演示店仅含 Hardware 分支配件分类 2 条）。
- `assets/wishlist-toggle.js` 与 §4 红线「不实现愿望清单」冲突，**提交前必须移除**（其交互可迁至商品卡的对比/加购按钮）。`assets/compare-toggle.js` 待按 §6 新规重构为 Custom Element。
- 页头任务清单见 `dev-docs/task-header.md`；O-1 ~ O-5 已于 2026-10-09 拍板（结论写在该文件 §1）。
- **cart 交互本期不做**（抽屉本体、`<cart-toggle>`、计数 AJAX 同步、`cart_action` 配置项），后续单独开任务清单；页头 T-1.6 仅做静态入口 + 服务端计数，开工前先确认该清单是否已立项。

