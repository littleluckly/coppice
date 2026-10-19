# Bug report — Theme editor silently drops a large pure-ASCII header section

> 待提交到 Shopify（community.shopify.dev 的 bug report 分类，或 Partner Support 工单）。
> 配合 `minimal-repro/` 目录使用。报告语言：英文。

---

## Title

Theme editor silently drops a large header section whose rendered HTML is pure ASCII

## Summary

A header section that renders a **large amount of markup** (~24 KB) is silently removed
from the theme editor canvas when its rendered HTML contains **only ASCII bytes**. The
storefront and "Preview" are unaffected. The same section renders fine in the editor as
soon as the first child node of its `<nav>` contains a single non-ASCII byte (e.g. `→`,
`é`, a CJK character). There are no console errors, no failed network requests, and no
"HTML error found" banner — the group is dropped silently.

## Environment

- New theme editor canvas iframe at `online-store-web.shopifyapps.com`
- Store: `coppice-gizo4hzt.myshopify.com`
- Reproduced on unpublished themes pushed via `shopify theme push --unpublished`
- The issue is deterministic (not a cache/timing artifact) — reproduced across 20+
  single-variable comparison themes over two days.

## Reproduction

Two self-contained themes under `minimal-repro/`, byte-identical except for **one line**
(the first child node of the header section's `<nav>`):

| Variant | `sections/trigger.liquid` first child | Result in editor canvas |
|---|---|---|
| `ascii/` | `<div>hello</div>` | header group missing (blank) |
| `non-ascii/` | `<div>→</div>` (literal U+2192) | header group renders |

Steps:

1. Push each variant as an unpublished theme:
   ```
   shopify theme push --store coppice-gizo4hzt.myshopify.com --unpublished --theme "repro-ascii"    --path minimal-repro/ascii
   shopify theme push --store coppice-gizo4hzt.myshopify.com --unpublished --theme "repro-nonascii" --path minimal-repro/non-ascii
   ```
2. Open each theme in the editor (Customize).
3. `repro-ascii` shows a blank header area; `repro-nonascii` shows the trigger content.

The trigger section is padded with 250 pure-ASCII `<div>` rows to ~24 KB of rendered
markup, which is necessary to cross the size threshold (see below). The padding content
is irrelevant to the bug; it only amplifies the size.

## Key evidence

Inspecting the editor canvas DOM (DevTools → Elements) on the failing variant:

- The section wrapper (`shopify-section-*`) and the `<!-- END sections: header-group -->`
  comment are **missing**.
- The section's own trailing `<script>` tags **are present** — proving the server-side
  Liquid rendered the section completely, and the editor's client removed the nodes.
- Zero matches for the section's content class; zero console errors; zero failed
  network requests; no "HTML error found" banner.

## What was ruled out (bisection over 20+ comparison themes)

The trigger is **not** any of the following (each was tested in isolation):

- **Not CJK-specific** — a single `é` (2 bytes) works; any non-ASCII byte (≥0x80) suffices.
- **Not byte-length** — 6 ASCII bytes (`helloo`) still fails while 6 bytes of `欢迎` works.
- **Not visibility** — a visually-hidden (clipped) non-ASCII span still works; the failure
  tracks the *text content* (empty/ASCII), not `display`/`block-size`.
- **Not HTML entities** — `&#27426;&#36808;` (ASCII source bytes decoding to `欢迎`) fails,
  so the check happens **before** entity decoding, at the byte level.
- **Not `{% stylesheet %}` in snippets / `<dialog>` / `<template>` / custom elements** —
  these were ruled out in earlier rounds (a real `{% stylesheet %}`-in-snippet bug was
  fixed separately and is unrelated).
- **Not small sections** — a pure-ASCII footer (~0.6 KB), announcement bar (~2.8 KB), and
  home sections (≤6 KB) render fine. Only the large (~24–28 KB) header section is affected.

## Conclusion / suspected area

The editor's client appears to take a size- and encoding-sensitive code path when
assembling a large section's markup: a large payload that is pure ASCII is dropped
silently, while the presence of any non-ASCII byte (making the payload unambiguously
UTF-8) causes it to be assembled correctly. This looks like a charset-detection /
transcoding regression in the new editor ("Dux" iframe) rather than a theme authoring
error.

## Workaround (for theme developers)

Place a single non-ASCII byte in the first child node of the affected section's root
element — e.g. a visually-hidden, `aria-hidden` span containing a literal `→`:

```liquid
<nav class="main-nav" aria-label="Menu">
  <span class="visually-hidden" aria-hidden="true">→</span>
  <!-- ... -->
</nav>
```

This unblocks the editor with zero visual or accessibility impact, but it is clearly a
hack around a platform bug, not a legitimate fix.

## Related reproduction themes (on the store)

- `coppice-chk-v23` (`<div>helloo</div>`) — fails
- `coppice-chk-v24` (`<div>é</div>`) — works
- (the minimal pair `repro-ascii` / `repro-nonascii` can be pushed from `minimal-repro/`)
