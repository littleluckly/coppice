# Coppice 项目长期记忆

> 项目事实与架构约定的沉淀。日常进展见同目录 `YYYY-MM-DD.md`。

## 架构约定：骨架配色（2026-10-16 确立）

- **页头组**（`<site-header>` 内的所有 section）与**页脚**共用一套可切换的骨架配色；内容区不受影响。
- 唯一出口是 `snippets/css-variables.liquid` 的 `--color-skeleton-background / -foreground / -accent`。
  这三个值由 `settings.skeleton_*_color` 渲染，**留空即回落全局色**（`| default:` 过滤器，不要给这三项写 schema default）。
- 映射规则在 `assets/critical.css`：`site-header, .site-footer { --color-background: var(--color-skeleton-background); … }`
  —— 靠 CSS 变量继承一次性翻转骨架内全部颜色，**不要**去逐条改各 section 的 `var(--color-*)`。
- **新增骨架类 section 时不要自己加颜色设置**：只要它是 `<site-header>` 的后代就自动继承。
  若新元素挂在 `<body>` 直系（如页脚），必须给它加 `.site-footer` 这类标记，并把它补进 critical.css 的映射选择器。
- 深色取值由 preset 提供（`config/settings_data.json` 的 `presets["Coppice Noir"]`），不是硬编码在 Liquid 里。

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
