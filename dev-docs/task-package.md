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

还有一层：`shopify://shop_images/xxx` 指向的是**演示店「文件」里上传的图片**，它不在主题包内（主题包只带 `assets/`）。`shopify://collections|pages|blogs/xxx` 是按 handle 引用商家自己的资源。**这两类引用默认都会解析为空**——唯一的例外是新店恰好上传了**同名文件**（2026-11-20 实测：benchmark 店传入同名 `banner-bg_webp.webp` 后，`shopify://shop_images/banner-bg_webp.webp` 立即生效）。商家店不可能有这个巧合，所以打包照旧必须清。

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
| 9 | `sections/header-group.json` | `main-nav` 的 `brand_name` | `"Northbark"`（演示店写入） | 清空。新店会回落 `shop.name`——schema 里那个 `"default": "Northbark"` 已于 2026-11-19 删除（`sections/main-nav.liquid`），但**演示店的存值仍会写回 JSON**，不清就等于硬编码别人的品牌名 |
| 10 | `sections/footer-group.json` | `brand` block 的 `email` | `support@northbark.example` | 清空（假邮箱，装到商家店里会被当成真实客服地址） |
| 11 | `templates/page.contact.json` | `info_email` | `support@northbark.example` | 清空 → 信息卡四项全空时走 `contact__grid--single` 单列降级，不会裂版 |

> 合计：`sections/` 3 处（header-group 2 + footer-group 1）+ `templates/` 21 处（index 20 + collection 1）+ `config/settings_data.json` 2 处 = **26 处 `shopify://` 引用**（2026-11-19 扫描；11-08 为 25 处，多出来的是页脚背景图）。
>
> **`grep shopify://` 抓不到的还有三处**：`config/settings_data.json` 的 `compare_collections`（四个演示店集合 handle 的**裸 handle 数组**）、上面 #9 的 `brand_name`、`templates/index.json` 里 `"button_link": "shopify://collections/…"` 属于 url 类型故能被抓到。打包前必须单独核 `compare_collections`。

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

`config/settings_schema.json` 的 `theme_info`，**2026-11-19 已改**（备份 `config/settings_schema.json.bak-20261119`）：

```json
{
  "name": "theme_info",
  "theme_name": "Coppice",
  "theme_version": "0.1.0",
  "theme_author": "Coppice Studio",
  "theme_documentation_url": "https://littleluckly.github.io/coppice-docs/",
  "theme_support_email": "hncu1900@gmail.com"
}
```

> ⚠️ **两个硬约束**：
> 1. **`theme_support_email` 与 `theme_support_url` 只能二选一**——两个都写平台直接报错（官方 settings_schema.json 文档原文）。现取邮箱，别再补 URL。
> 2. **文档 URL 已上线**（2026-11-19 实测 `curl` 返回 **200**，站点 `https://littleluckly.github.io/coppice-docs/`，仓库 `littleluckly/coppice-docs`，Pages source = `master` / 根目录）。内容为初版单页，子页面待补 → `dev-docs/task-docs.md`。
>
> 📌 `theme_author` = **`Coppice Studio`**（2026-11-19 刘工定）。初版曾写成 `Coppice`（与 `theme_name` 完全同名），因"作者 = 主题名"容易被审核当成未填真实身份而改掉；加 `Studio` 后缀后与产品名区分开，且不引入新主体。

- [x] `theme_author` 改成真实作者名 → `Coppice Studio`（2026-11-19）
- [x] `theme_documentation_url` / 支持渠道换成自己的 → GitHub Pages 预定地址 + 支持邮箱（**站点待建，见 `task-docs.md`**）
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
| `AGENTS.md` / `README.md` / `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `LICENSE.md` | 仓库文档 | 排除。`AGENTS.md` 在打包分支上用 `git rm` 删掉（§7 第 2 步），比靠 `zip -d` 兜底可靠 |
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
   git checkout -b release/package
   ```
   > ⚠️ **这个分支只用来出包，不要合并回 `main`。** 下一步会删掉全部注释，而注释里记着几乎所有的设计取舍与踩坑结论（"为什么不能改成绝对定位"、"为什么这里必须 `!important`"）——那些是项目的记忆，主线必须留着。

2. **删仓库文档与备份**（这些不该进包）
   ```bash
   git rm AGENTS.md
   find . \( -name "*.bak*" -o -name ".DS_Store" \) \
        -not -path "./.git/*" -not -path "./dev-docs/*" -delete
   ```

3. **剥离注释**（可选，只减体积不改语义）
   ```bash
   python3 tools/strip-comments.py            # 预演，看会删多少
   python3 tools/strip-comments.py --apply    # 写盘（脚本拒绝在非 release/* 分支执行）
   ```
   实测（2026-11-20）：**272.4 KB / 105 个文件**，包体积 823 KB → 547 KB。
   脚本只删块注释与"独占整行的 `//`"；**行内 `//` 一律不碰**（字符串里的 `'https://…'` 含 `//`，正则删必出错）。删除后顺带压缩连续空行、去行尾空白。

4. **按 §1 / §3 / §4 清演示店引用**，再跑 §6 检查。删注释后必须补跑这两条：
   ```bash
   node --check assets/*.js              # 33 个 JS 全部通过才算
   git diff -U0 | grep "^-[^-]" | sed 's/^-//' | sed 's/^ *//' \
     | grep -oE "^(//|/\*|\*|\{%-? *comment|-->)" | sort | uniq -c
   ```
   第二条是核对"删掉的每一行是不是注释"。预期输出只有 `*` / `/*` / `{%- comment` / `//` 这几类；**出现别的前缀立刻回滚**。
   新增的非空行应当是"代码去掉了行尾注释"，例如 `-if (!x) return; /* 说明 */` → `+if (!x) return;`。

5. **打包 + 清理 + 验证（三步缺一不可）**
   ```bash
   shopify theme package
   # CLI 4.9.4 不认 .shopifyignore 的文件级规则（BUG-080），必须手动清
   zip -d Coppice-<version>.zip "*.DS_Store" "*.bak*" "AGENTS.md" \
          "README.md" "LICENSE.md" "CONTRIBUTING.md" "CODE_OF_CONDUCT.md"
   unzip -l Coppice-<version>.zip | grep -E "\.bak|DS_Store|\.md"   # 必须为空
   ```
   **再对整包扫一遍注释残留**——不要只信剥离脚本，它按扩展名清单扫描，漏一类文件就会带进包（2026-11-20 漏了 `templates/gift_card.liquid`，包内残留 10 处）：
   ```bash
   rm -rf /tmp/pkgchk && unzip -q -d /tmp/pkgchk Coppice-<version>.zip && \
   grep -rlE "\{%-? *comment|/\*" --include="*.liquid" --include="*.css" \
        --include="*.js" /tmp/pkgchk          # 必须为空
   ```
   > **解压必须在项目外（`/tmp`）**。2026-11-20 在项目根解压了一个 `Coppice-0.1.0/` 目录，`theme check` 把这份副本也扫了进去，`85 files / 1 warning` 变成 **`170 files / 378 offenses`**，看起来像全主题崩了，实际是重复扫描。另外这堆副本还会让"包里有没有注释"的判断失去参照——看到的那份可能根本不是包里的。
   > `AGENTS.md` 会被打进包、而 `README.md` / `LICENSE.md` 目前不会 —— CLI 对根目录 `.md` 有一份不公开的排除名单。**新增任何根目录文件后都要重新看 `unzip -l`**，`zip -d` 里那串 `.md` 是保险。

6. **解压核对**：只应有 §4 那 7 个目录，没有 `res.json` / `dev-docs/` / `tools/`。（`dev-docs/lighthouse/`、`dev-docs/benchmark/` 都在 `dev-docs/` 下，一并排除。）

7. **真渲染验证**（theme check 抓不到 CSS 语义与 JS 运行时错误，必须跑一次）。推到 benchmark 店但**排除模板与配置**，否则会把店里配好的图冲掉：
   ```bash
   shopify theme push -e benchmark \
     --ignore "templates/*" --ignore "config/*" --ignore "sections/*.json" --allow-live
   ```
   然后看三件事：console 无报错（`/favicon.ico` 404 属正常，新店没传图标）、关键元素数量正常（hero 图、商品卡）、`getComputedStyle` 读到的布局值没退化（例：商品卡 `aspect-ratio: 1 / 1`）。

8. **用空白测试店装一次**，逐页看坏图 / 空块（§2 的验收）。

9. **上传**，记录演示店 URL（提交表单要填）。

> 2026-11-20 实测走完全流程的耗时：删注释 + 验证约 20 分钟，其中真渲染那步最值得——静态检查全绿而 CSS 被删坏的情况是完全可能的（对比 BUG-065）。

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
