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

- header section 的 **`<nav>`（或对应首节点）首子节点文本**含任意非 ASCII 字节（≥0x80）→ 编辑器正常；
- 首子节点文本为纯 ASCII 或空 → 整组被静默丢弃；
- 非 ASCII 落在**深处嵌套**（如 mega 面板里）**无效**，必须落在首子节点（2026-10-19 刘工实测）。
- 且只在 section 体积**较大**时发生（实测 main-nav 渲染 ≈28KB 踩中；页脚 ≈0.6KB、
  公告条 ≈2.8KB、首页各 section ≤6KB 都是纯 ASCII 却不踩）。
- HTML 实体（`&#2192;` / `&rarr;`）**无效** —— 判据在实体解码**之前**的字节层；
  `é`（2 字节）就够，与 CJK 专属、字节长度阈值无关。可见性非变量（`display:none`/零高度
  不影响文本字节，死因一律是 ASCII/空文本）。

## 两个变体（唯一差异：一行）

| 变体 | `sections/trigger.liquid` 首子节点 | 预期 |
|---|---|---|
| `ascii/` | `<div>hello</div>` | 编辑器画布**空白**（bug 复现） |
| `non-ascii/` | `<div>→</div>`（字面量 U+2192，UTF-8 三字节） | 编辑器画布**正常** |

两个目录其余文件（layout / group json / config / templates / locales）逐字节一致，
`diff -r ascii non-ascii` 只输出 trigger.liquid 的那一行。

`trigger.liquid` 用 250 个纯 ASCII 的 `<div>` 填充到渲染输出 ≈24KB，以跨越
"小载荷不踩中"的体积门槛（同时远低于 64KB 渲染上限）。填充内容与 bug 无关，
只用于放大体积。

## 复现步骤

1. 把 `ascii/` 与 `non-ascii/` 分别 `shopify theme push --unpublished` 成两个主题：
   ```bash
   shopify theme push --store <store> --unpublished --theme "repro-ascii"    --path minimal-repro/ascii
   shopify theme push --store <store> --unpublished --theme "repro-nonascii" --path minimal-repro/non-ascii
   ```
2. 分别打开两个主题的编辑器（Customize）。
3. **预期**：`repro-ascii` 画布里 header 区空白（trigger 的 250 行都不见）；
   `repro-nonascii` 画布里能看到 trigger 内容。
4. 关键佐证：在两个画布的 DevTools → Elements 里搜 `trigger-section` 或
   `<!-- END sections: header-group -->` —— ascii 变体为 0 命中，non-ascii 变体正常命中。

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
