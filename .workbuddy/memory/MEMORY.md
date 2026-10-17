# Coppice 项目长期记忆

> 项目事实与架构约定的沉淀。日常进展见同目录 `YYYY-MM-DD.md`。

## 架构约定：preset 配色（2026-10-17 更新，覆盖 10-16 的"内容区不动"）

- **Coppice Noir 是整页深色**（2026-10-17 刘工拍板，推翻 10-16"只有骨架翻转"）：
  内容区 bg #0F1012 / fg #E9E9EC / brand lime #A3E635 / accent #BEF264（hover 亮档，待定稿）；
  骨架三色同值。Coppice 保持白底深绿。
- **配色纪律**：落在卡面/页面上的颜色一律从 `--color-background / -foreground / -brand*`
  派生（`color-mix(... N%, transparent)` 调 alpha），**禁止 rgb(0 0 0 / x) / rgb(255 255 255 / x) 硬编码**。
  仅两类合法例外：压在商品图上的元素（跟图不跟主题）、投影（永远黑）。
- **表单控件必须显式给 color**（2026-10-17 踩坑）：input/select/textarea 默认不继承
  color（UA 固定黑），Noir 下会黑字贴黑底——写控件样式时 `font: inherit` 之外必须
  补 `color: var(--color-foreground)`，placeholder 另用派生色。
- 遗留：55 处硬编码 alpha 分布 9 文件（collection/blog-posts/platform-cards/
  use-case-grid/utility-bar/predictive-search×2/main-nav/hero-slideshow），逐步清；
  压图类（hero 白字、banner 渐变）合法保留。
- `--color-brand-light`（css-variables.liquid，oklch from 品牌色相，亮度定值 0.76）：
  Noir 下品牌变 lime，它自动跟随成亮 lime，无需另设。

## 架构约定：骨架配色机制（2026-10-16 确立）

- **页头组**（`<site-header>` 内的所有 section）与**页脚**共用一套可切换的骨架配色；内容区不受影响。
- 唯一出口是 `snippets/css-variables.liquid` 的 `--color-skeleton-background / -foreground / -accent`。
  这三个值由 `settings.skeleton_*_color` 渲染，**留空即回落全局色**（`| default:` 过滤器，不要给这三项写 schema default）。
- 映射规则在 `assets/critical.css`：`site-header, .site-footer { --color-background: var(--color-skeleton-background); … }`
  —— 靠 CSS 变量继承一次性翻转骨架内全部颜色，**不要**去逐条改各 section 的 `var(--color-*)`。
- **新增骨架类 section 时不要自己加颜色设置**：只要它是 `<site-header>` 的后代就自动继承。
  若新元素挂在 `<body>` 直系（如页脚），必须给它加 `.site-footer` 这类标记，并把它补进 critical.css 的映射选择器。
- 深色取值由 preset 提供（`config/settings_data.json` 的 `presets["Coppice Noir"]`），不是硬编码在 Liquid 里。

## 设计令牌：浅品牌绿（2026-10-17）

- `--color-brand-light` 在 `snippets/css-variables.liquid`：`oklch(from {{ settings.brand_color }} 0.76 0.09 h)`
  ——取品牌色相、亮度独立定值（换任何品牌绿都得到同色相浅绿，当前 ≈ #74C4A7）；
  上一行静态 fallback `#74C4A7` 承接不支持相对颜色语法的浏览器。
- **教训（2026-10-17 三/五轮）**：满幅 cover 照片上叠任何光晕遮罩都会把产品罩灰——
  demo 的"产品浮在光晕里"只在图片带 alpha 时成立。光晕只能垫底（::before 在 img 之下），
  靠图片透明区域透出；遮罩层（::after 盖图上）是死路。演示店商品图 = koutu alpha webp
  （`dev-docs/local-assets/product-koutu/product-alpha-webp/`，已验证 VP8X alpha flag，
  1536×1536 方图）；白底版（product-whitebg/、常规 _webp.webp）无 alpha，光晕自动隐没。

## 集合页布局约定（2026-10-16 刘工定）

- **左列 = 两张卡堆叠**：排序卡（`.facets__sort-card`）在上、筛选卡（`.facets__aside`，桌面加卡面）在下，
  同属 `.facets__form`。
- **排序 select 必须恒带 `form="FacetsForm-{{ section.id }}"`**（即使它就写在 form 里）：
  移动端 `_placeSort()` 会把这张卡搬进工具条（pages-ui §4 的 `[筛选☰] [排序▾]`），
  离开 form 子树后靠这个属性保持表单成员资格，`FormData` 才含 `sort_by`。**不要删**。
- **排序卡落点随断点切换**，同一 DOM 节点不做副本：移动端工具条（计数之前）、桌面左列第一张卡。
  由 `faceted-filters.js` 的 `_placeSort()` 驱动，`_load` 替换 DOM 后、抽屉关闭后都要重跑。
- 工具条行序由 `order` 控制，且**只在对应断点内生效**：桌面 = 标签(1) → 排序卡(2) → 计数(3)；
  移动端 = Filters(1) → 排序卡(2) → 计数(3，`margin-inline-start:auto` 靠行尾) → 标签(4)。
  order 若全局生效会把计数挤到第三行。
- 无筛选集合（`filters.size == 0`）没有左列也没有 form，排序常驻工具条，**不带** `form` 属性。
- 工具条内的排序卡是紧凑控件（横排 + 标签视觉隐藏），**不套卡面**——卡面规则限定 `.facets__form .facets__sort-card`。
- 桌面列宽 290px（2026-10-17 刘工定，260 → 280 → 290 两轮微调；卡面内边距占 2.5rem）。
  定宽轨道里的每一级（form/fieldset/flex item）都要 `min-width: 0`，否则
  select/fieldset 的 min-content 撑破轨道叠到产品列。预览文件：`dev-docs/collection-sidebar-preview.html`。

## 平台事实（已核实官方原文，勿凭印象改写）

- **theme preset ≠ color_scheme**：
  - `preset`（`config/settings_data.json` 的 `presets`）＝ 整套风格快照，商家在「主题设置 → 主题风格」一键切换；
    **一个 preset = Theme Store 上一个独立 listing + 一个独立演示店**。
  - `color_scheme`（`settings_schema.json` 的设置类型）＝ 给**单个 section** 挑配色。本主题**未采用**该体系。
- 多 preset 的主题 zip 必须带 `/listings/<preset-name>/`；单 preset 不需要。
- preset 命名：1–2 词、< 30 字符、仅可含单个空格；**至少一个与主题名相同**。
- **preset 切换的覆盖语义**（官方原文：*Selecting a theme preset updates the `current` object to use
  the associated theme preset values*）：只覆盖 **presentational settings**（checkbox / color /
  color_background / color_palette / color_scheme / color_scheme_group / font_picker / number /
  radio / range / select），且是"把 preset 的值更新进 current"——**不会删除 preset 里缺席的键**。
  ⇒ 同一主题的所有 preset 必须覆盖**完全相同**的 setting id 集合，漏一个键就是漏一条"切换残留"通道。
  `content_for_index` / `blocks`（app embed，如 judge.me）不受影响。一个主题最多 5 个 preset。
- **color 设置清空后存 `""`**（官方原文：*Clearing stores `""` in settings_data.json and returns
  blank in Liquid*）；color 类型另支持 `placeholder` 属性，用于空值时提示颜色角色（如 "Inherited"）。

## 工具与验收

- `tools/check-locale-keys.py`：扫 `sections/snippets/blocks/layout` 的 `.liquid` + `config/settings_schema.json`，
  校验两套 locale 命名空间（正文 → `en.default.json`；schema → `en.default.schema.json`）。
  **跑得通不等于验到了**——改动 locale 后必须实跑并核对退出码。
- `tools/check-tag-balance.py`：标签配对近似检查，最终以 theme check 为准。
- `tools/use-preset.py`：本地切换 theme preset（改写 `settings_data.json` 的 `current`，不联网、不开编辑器）。
  `--list` 看当前激活项与各 preset 的键覆盖度；`"<preset 名>"` 执行切换；`-n` 预演不落盘。
- **`shopify theme check` 本地可跑**：`/Users/mac/.nvm/versions/node/v24.22.0/bin/shopify`，
  纯静态检查、不联网、**不需登录**。**[2026-10-16 更正]** 此前记的"沙箱内 CLI 不可见"不成立，实测跑通
  （53 文件 0 offenses）。补一条硬证据：它的 `ValidJSON` 确实覆盖 `config/settings_data.json`
  （人为注入语法错误即报 error 并点名该文件），所以该文件里的 `/* */` 注释和尾随逗号是**官方工具链认可的**，
  可放心使用。仓库里"theme check 待刘工代跑"的历史待办，Agent 可自行清理。
