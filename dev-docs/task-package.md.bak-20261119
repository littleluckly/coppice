# 提交打包前置清单 — task-package.md

> **性质**：只管"**打包 / 上传主题包前后的收尾动作**"——哪些必须清、必须删、必须改、必须核。**不记功能缺口**。
> **边界**：功能合规缺口（Custom Liquid section、图片焦点、礼品卡二维码等）见 `dev-docs/task-compliance.md`；逐页验收见 `task-header / product / collection / cart / footer`。
> **版本**：v1.0 ｜ 2026-11-08 ｜ 起因：页脚开发时实测到「演示店配置被写回主题 JSON」，顺带扫出 `templates/index.json` 里 15 处演示店私有引用。
> **定位前提**（见项目 MEMORY §〇）：本主题**只提交 Theme Store，不运营店铺**；开发者主体在中国大陆 ⇒ 支付图标与多币种**永久无实证**，按代码合规判定。

---

## 0. 这份清单为什么存在

**演示店 ≠ 主题包，但两者共用同一批 JSON 文件。**

Shopify 后台编辑器里的每一次改动（菜单、文案、图片、社交 URL、市场配置）都会**写回主题的 JSON**：

| 改动位置 | 写回文件 |
| --- | --- |
| 页面底部内容（页脚 block/设置） | `sections/footer-group.json` |
| 页面顶部内容（公告栏、页头导航） | `sections/header-group.json` |
| 首页 / 集合页 / 产品页的 section 设置 | `templates/*.json` |
| 主题设置、颜色、logo | `config/settings_data.json` |

`shopify theme pull` 会把这些拉回本地 ⇒ **直接打包当前工作区 = 把演示店的私货发给商家**。

还有一层：`shopify://shop_images/xxx` 指向的是**演示店「文件」里上传的图片**，它不在主题包内（主题包只带 `assets/`）。`shopify://collections|pages|blogs/xxx` 是按 handle 引用商家自己的资源。**这两类引用在任何其他店铺都必然解析为空。**

---

## 1. P0 · 必须清空（不清 = 商家装完带一堆别人的东西）

| # | 文件 | 键 / 位置 | 现值 | 动作 |
| --- | --- | --- | --- | --- |
| 1 | `sections/footer-group.json` | 5 个 `social` block 的 `url` | **目前是空串 `""`**（已核 2026-11-08）；演示店填 Shopify 账号（`https://x.com/shopify` 等）后会写回这里 | **清回 `""`**。F-5：装到商家店里不能出现预填的社交链接 |
| 2 | `sections/footer-group.json` | `contact` block 的 `page` | `shopify://pages/contact` | 清空。新店没有这个页面（代码有 `.title != blank` 兜底，不会 404，但导出的设置不该带别人的 handle） |
| 3 | `sections/header-group.json` | `announcement` block 的 `text` | `"2222Free freight on orders over $99"` | **删掉这个 block**（多余的测试残留，且开头 `2222` 是打字错误） |
| 4 | `sections/header-group.json` | `main-nav` 的 `logo` | `shopify://shop_images/logo_webp.webp` | 清空 → 回落 `shop.name` 文字 wordmark |
| 5 | `sections/header-group.json` | 两个公告 `link` | `shopify://blogs/maintenance-guides/…` | 清空（新店没有这个 blog） |
| 6 | `templates/index.json` | **16 处** `image` / `product_image` / 卡图 | `shopify://shop_images/…webp` 与 `…png` | 见 §2 决策 |
| 7 | `templates/index.json` | **4 处** `collection` | `shopify://collections/{walk-behind, riding, chainsaw, string-trimmer}` | 见 §2 决策 |
| 8 | `templates/collection.json` | `banner_background_image` | `shopify://shop_images/banner-bg.png` | 见 §2 决策 |

> 合计：`sections/` 4 处 + `templates/` 21 处 = **25 处 `shopify://` 引用**（2026-11-08 扫描）。

> 核实现状的命令（打包前跑一次，输出应为空）：
> ```bash
> grep -rn "shopify://" sections templates config
> ```

---

## 2. `shopify://` 该怎么处理（是决策，不是一刀切）

**事实**（不需要商榷）：这些引用指向的资源**永远不在主题包里**。所以只有三种处置：

| 方案 | 结果 | 代价 |
| --- | --- | --- |
| **A 清空** | 走主题自己的空态 / 预设默认值 | 首页会显得空一些；干净、不会给商家带错东西 |
| **B 换成 `assets/` 里的图** | 图随包走，商家装完就能看到演示效果 | 包体变大；且 `assets/` 只适合放小图，大 banner 会拖慢安装 |
| **C 保留原样** | 只有你自己的演示店能看到 | **不可取**：等于把演示店私有资源硬编码进提交包 |

**建议：A 为主，个别关键位用 B。** 判据不是"好不好看"，而是下面这条验收：

> **用一份空白测试店安装主题包**，逐页走一遍（首页 / 集合页 / 产品页 / 购物车 / 内容页），看有没有**坏图框、空块、塌掉的高度**。有就按 A 或 B 处理。

这一条比任何规则都硬——评审也会这么干。

---

## 3. P0 · 主题元信息（不改 = 直接拒审）

`config/settings_schema.json` 的 `theme_info`，**2026-11-08 实测现状**：

```json
{
  "name": "theme_info",
  "theme_name": "Coppice",
  "theme_version": "0.1.0",
  "theme_author": "Shopify",                                    ← 必须改成你自己
  "theme_documentation_url": "https://help.shopify.com/manual/online-store/themes",  ← 必须换成你的文档地址
  "theme_support_url": "https://support.shopify.com/"           ← 必须换成你的支持地址
}
```

- [ ] `theme_author` 改成真实作者名
- [ ] `theme_documentation_url` / `theme_support_url` 换成自己的（指向 Shopify 官方帮助中心 = 冒充，S1 拒审项）
- [ ] `theme_version` 在每次提交前升号
- [ ] **至少一个主题 preset 名 = 主题名**。现状 `config/settings_data.json` 的 `presets` 是 `Coppice` / `Coppice Noir` ⇒ 已满足
- [ ] 上传后 **主题名与 preset 名不可再修改**，上传前最后一次确认

---

## 4. P1 · 不该进包的文件

正式主题包只应包含 **7 个目录**：`assets/ blocks/ config/ layout/ locales/ sections/ snippets/ templates/`

| 路径 | 现状 | 处置 |
| --- | --- | --- |
| `res.json` | 13KB GraphQL 响应 dump（`MediaImage` 节点），2026-10-28 调试残留 | ✅ **已删除 2026-11-08**。内容早已留档：`dev-docs/mower-import/files-export-20261028/accessories.json`（同 13817 字节），删除无损 |
| `dev-docs/` | 280 个文件（含 png/webp/mp4 与 4 份 `.bak-*`） | 排除，不进包 |
| `docs/` | 5 份 md | 排除 |
| `tools/` | 8 个 py | 排除 |
| `AGENTS.md` / `README.md` / `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `LICENSE.md` | 仓库文档 | 排除 |
| `shopify.theme.toml` | CLI 本地环境配置（`theme = "coppice/main"`） | 排除（留在仓库里无害，但不进包） |

> `dev-docs/*.bak-*` 是**有意保留**的历史备份（AGENTS §1），不要清理仓库，只是不进包。

---

## 5. P2 · 红线复核（现状已通过，打包后再核一遍）

| 项 | 现状（2026-11-08 实测） | 命令 |
| --- | --- | --- |
| 不含 `config/markets.json` | ✅ 不存在 | `ls config/markets.json` |
| 不含 `robots.txt.liquid` | ✅ 不存在 | `find . -name 'robots.txt.liquid'` |
| 无 `.scss` / `.scss.liquid` | ✅ 无 | `find . -name '*.scss*' -not -path './dev-docs/*'` |
| 无压缩版 `.css` / `.js` | ✅ 无 `.min.*` | `find assets -name '*.min.*'` |
| 无外部 CDN / API 引用 | ⬜ **待核** | `grep -rnE "https?://" assets sections snippets blocks`（允许：schema 注释里的文档链接；禁止：`<script src>` / `url()` / `<img src>` 指向外域） |
| 未改动 / 未解析 `content_for_header` | ✅ 未见 | `grep -rn "content_for_header" layout snippets sections` |
| 合并冲突标记残留 | ✅ 无（BUG-065 已修） | `grep -rn '^\(<<<<<<<\|=======\|>>>>>>>\)' --include=*.css --include=*.js --include=*.liquid --include=*.json .` |

---

## 6. 自动化检查（打包前必跑，三条都要绿）

```bash
shopify theme check                     # 必须 0 offenses
python3 tools/check-locale-keys.py      # 退出码 0（两个命名空间）
python3 tools/check-tag-balance.py      # 近似检查，只允许 compare-* 那 8 处已知误报
grep -rn "shopify://" sections templates config   # 必须为空（§1 §2 做完之后）
```

> `shopify theme check` **看不见** CSS 语义错误与 JS 运行时错误（BUG-065 实测：带合并冲突标记仍报 0 offenses）。CSS/JS 改动仍需真渲染 / 真跑。

---

## 7. 操作顺序（建议照抄）

1. **在干净分支上打包，不要在当前工作区直接打**
   ```bash
   git status                     # 先确认没有未完成的合并（看 .git/MERGE_HEAD）
   git checkout -b release/1.0    # 或打 tag
   ```
2. 按 §1 / §3 / §4 改完，**跑 §6 三条检查**
3. 打包
   ```bash
   shopify theme package
   ```
4. **解压核对**：只应有 §4 那 7 个目录，没有 `res.json` / `dev-docs/` / `tools/`
5. 用**空白测试店**装一次，逐页看坏图 / 空块（§2 的验收）
6. 上传
7. 记录演示店 URL（提交表单要填）

---

## 8. 长期预防：别让演示店再污染打包

这次的问题是结构性的——**演示店和主题包是同一份文件**，只要你在后台动一下，本地就脏了。

三条可执行的做法：

1. **打包前必看 diff**：`git diff` 里凡是 `sections/*-group.json`、`templates/*.json`、`config/settings_data.json` 的改动，逐条判断"这是我要的默认值，还是演示店的私货"。
2. **`shopify theme pull` 之后立刻 `git diff`**，把演示店专属的改动（社交 URL、logo 引用、页面/blog 链接）当场清掉，别攒到打包前。
3. **维护一份 `release` 分支**：只在它上面做清空动作，演示店的持续调整留在 `main`。两边不要互相覆盖。

---

## 9. 状态汇总

> **处置原则（2026-11-08 刘工拍板）**：主题尚未开发完成，**除 `res.json` 外一律不现在动**，全部按「暂缓 · 跟踪」挂在这里，等开发收口、准备提交时统一处理。
> 理由：现在清掉的演示值，下一轮开发又会被演示店的同步覆盖；边开发边清理是白做。

| 阶段 | 状态 |
| --- | --- |
| §1 P0 清空 8 项 | ⏸ **暂缓**（3/4/5 当前就脏；社交 URL 目前干净，演示店填完后需清回） |
| §2 `shopify://` 决策（25 处） | ⏸ **暂缓**（建议 A 为主，空白店安装后逐页判） |
| §3 主题元信息 3 项 | ⏸ **暂缓**（`theme_author` 现为 `Shopify`，提交前必改） |
| §4 不该进包的文件 | 🟢 `res.json` **已删**（2026-11-08）；其余目录等打包时排除 |
| §5 红线复核 | 🟡 6 项已过，1 项待核（外部 http(s) 引用） |
| §6 自动化检查 | 🟢 三项全绿（2026-11-08） |
| §7 操作顺序 | ⏸ 打包时执行 |
| §8 长期预防 | ⏸ 建议落地（`release` 分支），可与 §7 同批做 |

**触发时机**：当主题进入"只修 bug、不加功能"的收口阶段时，本文从第 1 节开始逐条执行一遍，全部转 🟢 才允许打包。

---

## 维护规则

打包流程有变（Shopify 后台改了写回行为、CLI 改了打包命令）时更新本文；新增"必须清"的项时同步 §9 的计数。功能性缺口不要写进本文，写 `task-compliance.md`。
