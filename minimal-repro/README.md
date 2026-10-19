# Minimal reproduction — Shopify theme editor silently drops a large pure-ASCII header section

> 对应 BUG-044（`dev-docs/bugs.md`）。这是一个**自包含的最小复现**，用于向 Shopify
> 报 bug：两个主题，唯一差异是 header section 首子节点的一行文本，一个在编辑器画布
> 里渲染、一个整组静默消失。

## 现象（phenomenon）

店面（storefront）与「预览」都正常，**只有主题编辑器中间画布**不渲染 header-group：

- 组的 section 包裹层、`<!-- END sections: header-group -->` 全部消失；
- 但组内 section 末尾的 `<script>` 仍在（证明服务端 Liquid 完整渲染过）；
- 无 Console 报错、无失败 Network 请求、无「HTML error found」横幅 —— 编辑器**静默**丢弃。

## 判据（已用 20+ 对照主题单变量二分钉死，2026-10-18~19）

- header section **根元素（`<nav>` / `<header>`）的首子节点文本**含任意非 ASCII 字节（≥0x80）→ 编辑器正常；
- 首子节点文本为纯 ASCII 或空 → 整组被静默丢弃；
- 非 ASCII 落在**深处嵌套**（如 mega 面板里）**无效**，必须落在首子节点（2026-10-19 刘工实测）。
- 且只在 section 体积**较大**时发生（实测 main-nav 渲染 ≈28KB 踩中；页脚 ≈0.6KB、
  公告条 ≈2.8KB、首页各 section ≤6KB 都是纯 ASCII 却不踩）。
- HTML 实体（`&#2192;` / `&rarr;`）**无效** —— 判据在实体解码**之前**的字节层；
  `é`（2 字节）就够，与 CJK 专属、字节长度阈值无关。可见性非变量（`display:none`/零高度
  不影响文本字节，死因一律是 ASCII/空文本）。

## 两套复现（任选其一，推荐骨架版）

### 版本 A：自拼最小主题（`ascii/` 与 `non-ascii/`）

| 变体 | `sections/trigger.liquid` 首子节点 | 预期 |
|---|---|---|
| `ascii/` | `<div>hello</div>` | 编辑器画布**空白**（bug 复现） |
| `non-ascii/` | `<div>→</div>`（字面量 U+2192） | 编辑器画布**正常** |

8 个文件的最小主题，其余文件逐字节一致，`diff -r ascii non-ascii` 只输出那一行。
`trigger.liquid` 用 250 个纯 ASCII div 填充到 ≈24KB 跨体积门槛。

### 版本 B：基于官方 Skeleton 主题（`skeleton/ascii/` 与 `skeleton/non-ascii/`，**推荐**）

| 变体 | `sections/header.liquid` 首子节点 | 预期 |
|---|---|---|
| `skeleton/ascii/` | `<div>hello</div>` | 编辑器画布**空白**（bug 复现） |
| `skeleton/non-ascii/` | `<div>→</div>`（字面量 U+2192） | 编辑器画布**正常** |

官方 Skeleton Theme 的**完整主题**（39 文件），只改 `sections/header.liquid` 一处：
在 `<header>` 开标签后插入「探针行 + 250 个纯 ASCII 填充 div」，其余文件一字未动。
两变体唯一差异 = 探针那一行。**根元素是 `<header>` 而非 `<nav>`**，用来验证判据
与根元素类型无关（任何 section 根元素的首子节点都触发）。

## 复现步骤

1. 推送骨架版（推荐）：
   ```bash
   shopify theme push --store <store> --unpublished --theme "repro-skel-ascii"    --path minimal-repro/skeleton/ascii
   shopify theme push --store <store> --unpublished --theme "repro-skel-nonascii" --path minimal-repro/skeleton/non-ascii
   ```
   或推送自拼版：
   ```bash
   shopify theme push --store <store> --unpublished --theme "repro-ascii"    --path minimal-repro/ascii
   shopify theme push --store <store> --unpublished --theme "repro-nonascii" --path minimal-repro/non-ascii
   ```
2. 分别打开两个主题的编辑器（Customize）。
3. **预期**：ascii 变体画布里 header 区空白；non-ascii 变体画布里能看到填充内容。
4. 关键佐证：在两个画布的 DevTools → Elements 里搜 `repro-fill`（骨架版）或
   `trigger-section`（自拼版）、`<!-- END sections: header-group -->` ——
   ascii 变体为 0 命中，non-ascii 变体正常命中。

## 已在真实主题里验证的对应实例

- `coppice-chk-v23`（`<div>helloo</div>`）→ 死
- `coppice-chk-v24`（`<div>é</div>`）→ 活
- 修复见 BUG-044：在 `<nav>` 首子节点放一个 visually-hidden 的 guard span（字面量 `→`）。
  深处（mega 面板里的 `→`）无效，必须首子节点。

## 给 Shopify 的 bug 描述要点（英文）

- **Title**: Theme editor silently drops a large header section whose rendered HTML is pure ASCII
- **Repro**: two themes differing by a single line (`hello` vs `→`) in the header section's first child
- **Environment**: new editor canvas iframe at `online-store-web.shopifyapps.com`
- **Key evidence**: scripts render, section wrapper + END comment missing, no console/network errors
