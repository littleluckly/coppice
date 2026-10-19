# y7 —— 能渲染出页头的最小可用组合（供手动调试基线）

主题：`coppice-chk-y7` `#191903137835`（普通未发布主题，非 development）
基线代码：工作区 `main` 分支（= live `#191063490603` 的文件内容，逐字节 diff 过）

**只有两个文件与基线不同**：`sections/header-group.json`、`sections/main-nav.liquid`。
`layout/theme.liquid`、`assets/critical.css`、`assets/site-header.js`、两个 snippet、
其它 sections **一字未改**。

---

## 改动 1：`sections/header-group.json`

`order` 只剩 `["main-nav"]`，`sections` 里删掉 `announcement-bar` 与 `utility-bar` 两段。
`main-nav` 自己那一整段（`logo` / `brand_name` / `menu` / `customer_account_menu` /
`show_follow_on_shop` / `results_limit` + 4 个 `mega_category_icon` block + `block_order`）
**原样保留**——所以 y7 里的 logo、菜单、mega 面板数据都是真实的，不是写死的。

## 改动 2：`sections/main-nav.liquid`

基线 2298 行 → y7 2009 行。改动全部发生在 `<nav>` 这一段里：

| 基线行号 | 内容 | y7 处理 |
|---|---|---|
| 65–71 | 两段 `{%- comment -%}` 说明 | 删除（纯注释） |
| **64** | `<nav class="main-nav full-width">` | **保留** |
| — | — | **新增 1 行绿条**（见下） |
| 72–455 | `<div class="main-nav__desktop" data-nav-pill-anchor>` 整个桌面块 | **原样保留**（含 logo / `<nav-pill>` 菜单 / 4 个 mega 面板 / 搜索·账户·购物车三枚工具） |
| 458–697 | `<div class="main-nav__mobile">`（汉堡 + 搜索两枚按钮，内含 `<nav-drawer>` + `<dialog>` + `<template>`） | **整段删除** |
| 711–738 | `<search-drawer>`（含 `<dialog>` + `<template>`，内 render `predictive-search-entry`） | **整段删除** |
| 739 | `</nav>` | 保留 |
| 741–744 | 四个 `<script src=…>`（nav-pill / nav-drawer / predictive-search / search-drawer） | **原样保留** |
| 746–2162 | `{% stylesheet %}` 整块（1400+ 行，含从 snippet 迁入的预测搜索样式） | **原样保留** |
| 2163–2298 | `{% schema %}`（含 `presets`、`enabled_on.groups = header`） | **原样保留** |

新增的那一行（`<nav>` 的第一个子节点，y7 第 65 行）：

```html
<div style="background:#0a0;color:#fff;font:700 13px/1.6 system-ui;padding:6px 10px;text-align:center">Y7 标记 · 只放桌面块</div>
```

**它是纯诊断物**：一根绿条，用来在画布上区分「section 渲染成功」和「整段被丢弃」。
它没有 class、不参与任何样式表、不影响布局宽度。**正式修法里不会出现它。**

---

## 在画布上应该看到什么

绿条（Y7 标记）→ 白色导航行：左 `Northbark` + logo、中 `Shop / Shop by Platform / Support`、
右 搜索 / 账户 / 购物车 三枚图标 → 下面接 hero。

⚠️ 注意断点：`.main-nav__desktop` 只在 `min-width: 990px` 下 `display: block`
（`sections/main-nav.liquid` 的样式块里），画布大约 900–1050px，所以在窄一点的画布上
桌面块会被 `display: none` —— 那时**只能看到绿条**，这是正常现象，不代表失败。
判断生死一律以**绿条有没有出现**为准。

---

## 往上加回去的顺序（建议）

1. **加 `<search-drawer>`（711–738）** —— 必须保持它是 `<nav>` 的直接子级（BUG-029：
   祖先 `display:none` 时 `<dialog>` 不开盒子，抽屉永远看不见）。
2. **加 `.main-nav__mobile`（458–697，含 `<nav-drawer>`）** —— 加完在画布上看绿条是否还在；
   桌面块此时仍然可见（≥990px）。
3. **把 `announcement-bar` / `utility-bar` 加回 `header-group.json`** ——
   `utility-bar` 没有 block，`sections/utility-bar.liquid` 第 15 行是
   `{% if section.blocks.size > 0 %}` 整段门控，所以它本来就输出零字节，画布没有它是正确的。

每加一步都**先看绿条**：绿条没了 = 这一步把整段弄挂了；绿条在而桌面导航没了 = 只是断点问题。

---

## 附带的观察（供调试时参考，暂未证实是因果）

19 个对照主题里，凡是**绿条作为 `<nav>` 第一个子节点**的全部渲染成功；其余形态
（空 div / 1px div / 纯文字 div / 无前置元素 / 绿条放在末尾）全部整段消失。
`r1`（y17 原样复制，无绿条）也是消失 —— 说明这个现象**可复现、不是偶发**，
但绿条在服务端不可能影响任何东西，所以真正起作用的是我们还没看到的那一层判断。
