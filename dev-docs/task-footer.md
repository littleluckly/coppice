# 页尾（footer-group）开发任务清单 — task-footer.md

> **性质**：SDD 驱动开发的全局组件任务清单（v3.1）。拆解自 `dev-docs/pages-ui.md` §1.2（页脚工单）、`dev-docs/sdd.md` §4.2 / §7.1 / §8.1 / §8.2，不引入新决策。
> **权威关系**：与 SDD / pages-ui 冲突时以 `dev-docs/sdd.md` 为准。本清单与 pages-ui §1.2 的**版式线框**不同（§0.3 已重排并回填该文件），功能职责仍以 §1.2 为准。
> **范围**：`sections/footer.liquid` + `sections/footer-group.json` + footer 专属 snippet（`snippets/footer-*`）+ 5 枚社交图标 + `assets/footer.js` + 两个 locale 命名空间的键。
> **不在范围**：页头（`task-header.md`）、购物车页与抽屉（`task-cart.md`）、集合页（`task-collection.md`）、产品页（`task-product.md`）、`layout/theme.liquid`（`{% sections 'footer-group' %}` 已就位）、回到顶部按钮（已挂 layout，属全站浮层）。
> **版本**：v3.1 ｜ 2026-11-11 ｜ **本清单不含工期估算**（去人日；执行顺序靠依赖关系约束，不靠日期）
> **v3.x 只改版式**：2026-11-08 按参考图从「品牌收口型」改为图片通栏型；2026-11-11 再改为**顶部景观带型**（v3.1，§0.3）——图片通栏那次把图压在文字下面，可读性算术上走不通。功能职责、平台事实（§0.2 的 F-1 ~ F-14）、红线三条全部不变；T-1.x 的验收点不变，增加 T-1.11 / T-1.12 两条新项。原件备份 `task-footer.md.bak-20261108f`。
> **取代**：v2.0（2026-11-07，品牌收口型）的**版式部分**已被本版取代；v1.0（2026-10-09，7.0 人日）不再参考。**不要按旧版实现**——旧版 T-1.4 的"纯 JS popover"、T-0.2 的"自绘 5 枚 + preset 放 0 个社交块"等口径已在 §1 更新。
> **通用约束**（不逐任务重复）：文案走 `t:` 键（正文 `en.default.json` / schema `en.default.schema.json`，两个命名空间分开校验）、URL 走 `routes`、JS 一律 defer、类名 Skeleton 风格 BEM、设计令牌走 `css-variables.liquid`、**颜色禁硬编码**（`color-mix` + `var(--color-*)`）、RTL 用逻辑属性、可交互组件用 Custom Element（AGENTS.md §4/§6）。
> **三条本文件专用红线**：
> 1. **`{% stylesheet %}` 必须位于 section 顶层**，每文件一个（BUG-014 已二犯）。
> 2. **任何 `{{ … | richtext }}` 或 `{{ xxx.content }}` 输出必须套 `<div class="rte">`**（BUG-064：reset 把块间距清零，不套就是"一坨"）。
> 3. **`.site-footer` 类名不可改**——`assets/critical.css` 的骨架配色映射选择器就是 `.site-footer`（见 §0.1），改名 = 深色骨架下页脚变白底黑字。

---

## 0. 前置事实与决策

### 0.1 代码现状（2026-11-07 实测）

| 文件 / 资源 | 现状 | 影响 | 处置 |
| --- | --- | --- | --- |
| `sections/footer.liquid` | **Skeleton 原版**：69 行，`<footer class="site-footer full-width">` 内三块横排（版权行 / 菜单链接 / 支付图标），无栅格、无 block、无 `{% schema %}` 的 blocks 段 | 不是改造，是重写 | T-1.1 起整节重写 |
| `sections/footer.liquid` 的 `menu` 设置 | `link_list` **缺 `default`** | 违反 F-2（官方强制），且新装店铺该列为空 | T-1.1 一并修 |
| `sections/footer-group.json` | 只挂一个 `footer` section，`settings.menu` 为空字符串 | 演示店页脚当前是空的链接列 | T-2.1 重写 |
| `assets/critical.css` 骨架映射 | `.shopify-section-group-header-group, .site-footer { --color-background: var(--color-skeleton-*) … }`（含 `--color-foreground-muted` 的重算） | **`.site-footer` 这个类名是深色骨架的唯一挂钩点** | 页脚根元素保留 `class="site-footer"`；样式全部走 `var(--color-*)`，自动跟随 preset |
| `snippets/css-variables.liquid` | 已输出 `--color-skeleton-background / -foreground / -accent`，留空即回落全局色 | 深色页脚（Coppice Noir）零成本，不需要新令牌 | 无 |
| `assets/icon-social-*.svg` | **一枚都没有**（28 个 SVG 全是搜索/购物车/规格/物流类） | 社交图标要自绘 | T-0.2 |
| `locales/en.default.schema.json` | 只有 `general.footer` = `Footer` 一个键 | 块名、设置标签、正文文案全部无落点 | T-2.2 |
| `locales/en.default.json` | **无任何 footer 键** | newsletter 成功/错误/同意语、选择器标签都缺 | T-2.2 |
| `snippets/back-to-top.liquid` + `assets/back-to-top.js` | 已挂在 `layout/theme.liquid` | 不属页脚，**不要在 footer 里再做一次** | 忽略 |
| `{% javascript %}` 标签 | 全主题 **0 处使用**，所有脚本都是 `<script src="{{ 'x.js' | asset_url }}" defer>` | 新增脚本按既有约定走 `assets/` + 手写 `defer` 标签 | T-1.7 |
| Custom Liquid section / `@app` block | **全主题 0 处** | 官方要求"主题必须包含 Custom Liquid section"（F-14），属**独立缺陷**，不在本清单修 | 已立项 → `task-compliance.md` G-01 / G-02 |

### 0.2 已核实官方事实（2026-11-07 重核，逐条带出处）

> v1.0 的 F-1 ~ F-11 是 2026-10-09 查的。本版全部重新核对：**修正 2 处表述、新增 3 条（F-12 ~ F-14）**。**实现前以本表为准。**

| # | 事实 | 出处 |
| --- | --- | --- |
| F-1 | *"Header and footer sections must be rendered within section groups."* 页脚 section 必须在 section group 内 | Requirements §Templates, sections, and blocks |
| F-2 | *"All settings of type `link_list` in the Header or Footer must have a `default` value of `main-menu` or `footer`, depending on the location of the setting."* | Requirements §Basic requirements（§22 重复一遍） |
| F-3 | 支付图标是**条件性**要求：*"If payment method logos are output, then use the `enabled_payment_types` property … The icons must be in full color."* 可以不输出；一旦输出必须走官方 filter + 全彩 | Requirements §Layout page requirements |
| F-4 | 社交图标是**无条件强制**：*"Must have a set of social media icons to choose from."* | Requirements §Social media |
| F-5 | *"Social media placeholder text must be left empty."* 社交占位必须留空 | Requirements §Social media |
| F-6 | 国家/语言选择器**仅在可选项 > 1 时输出**；两者都存在时**必须放在一起**（*"they should always be placed together"*）；放页脚时**位于 sub-footer 内容顶部、与页脚导航链接分离** | multiple-currencies-languages；country-language-ux §Selector placement |
| F-7 | 国家项格式：**全名 + 货币代码紧挨货币符号**，例 `United States (USD $)`、`United Kingdom (GBP £)` | country-language-ux §Country and currency format |
| F-8 | 实现：`{% form 'localization' %}` + `input[name="country_code"]` / `input[name="language_code"]`。官方明确 *"Your default solution should be a custom element that uses JavaScript …, however, you should also include a fallback in case JavaScript is disabled."* | multiple-currencies-languages |
| F-9 | newsletter 用 `{% form 'customer' %}` + `input[type=email][name="contact[email]"]`；提交成功即创建/更新客户并置 `accepts_marketing = true` | Email consent §Newsletter sign-up form |
| F-10 | 演示店：*"The `powered_by_link` link can't be altered and must contain only `powered_by_link`."* 且 *"Affiliate linking isn't allowed."* | Requirements §Demo store requirements |
| F-11 | 术语（做设置文案时逐条照抄，别自创）：**bottom bar**（不是 below footer / legal）、**footer menu**（不是 navigation / menu）、**social media icons**（不是 social buttons / 社交分享）、**navigation** 统称导航、**signup**（不是 sign-up / sign up） | Requirements §Terminology requirements |
| F-12 | 主题文案硬约束：**美式英语**；**禁用 `&` 符号**；section / preset / 分类名 **sentence case**；标题只出现一次主语（不写 "Footer" + "Footer colors"）；按钮文案以动词开头；**所有设置必须有 `label`** | Requirements §Terminology / §Writing guidelines |
| F-13 | 演示店必须用真实文案（禁 Lorem Ipsum、禁占位内容）；指向 Shopify 域名的链接必须带 `rel="nofollow"` | Requirements §Demo store requirements |
| F-14 | *"Themes must include a Custom Liquid section"*（含 `type: liquid` 设置）；*"Introduce Custom Liquid blocks into certain sections"* | Requirements §Templates, sections, and blocks |

> **v1.0 需要说清的两处**：① 旧版把 `social media` / `social media icons` 当成同一条，实际是两个不同条目——图标叫 `social media icons`，命名 section/setting 时用 `social media`；② 旧版称 `contact[tags]` 是"社区惯例"，这一条**仍然成立**：官方 email-consent 文档只要求 `contact[email]`，`contact[tags]` 不在官方文档里，写注释标明来源，别当规范。

### 0.3 版式决策：顶部景观带型（v3.1，2026-11-11 定案）

**结构一句话**：一条横跨整幅的景观带开场 → 下面一条内容带，带内再分三区 → 底栏回页面左边距。
**图片与文字完全不重叠**——这是版面能同时成立的前提。

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    景观带（通栏，底部渐隐入纸面）                           │
├──────────────────────────────────────────────────────────────────────────┤
│  coppice                     │ SHOP    SUPPORT  COMPANY │ FOLLOW US       │
│  Built for the backyard.     │ ·Chain… ·Shipping …      │ [f][ig][yt]     │
│  Powerful tools. A greener…  │ ·Trimm… ·Returns  …      │ [支付图标]       │
│  [✉ email____][ Subscribe ]  │ ·Acces… ·Warranty …      │                 │
│  🌿 Get the latest tips…     │ ·Parts… ·Maintenance …   │                 │
├──────────────────────────────────────────────────────────────────────────┤
│ © 2026 Coppice. All rights reserved. · Powered by Shopify   🌐 United States (USD $) ⌄ │ A English ⌄ │
└──────────────────────────────────────────────────────────────────────────┘
```

**移动端**：同一条带的矮版（9rem）→ 品牌 + newsletter → 菜单列 2 列网格 → 社交 → 底栏纵排。
桌面与移动是**同一套结构**，只有带宽和间距不同——不再需要"绝对定位 / 流内"两套分支。

**与 v2.0 的差异（逐条，带代价）**

| 项 | v2.0 品牌收口型 | **v3.1 顶部景观带型（现行）** | 代价 / 已知损失 |
| --- | --- | --- | --- |
| 图片位置 | 无 | **顶部通栏带**（`clamp(8rem, 16vw, 12rem)`，底部渐隐） | 页脚高出一条带（1440 下约 192px）；不再是"左侧竖图"的构图 |
| 品牌区 | wordmark 独占一行 | 服务 brand block 的第一区，**newsletter 挂在其下方** | 品牌区高度增加；`text` block 仍在列区，不能拖进第一区 |
| newsletter | sub-footer 顶部与选择器同排 | 第一区，品牌说明之后 | 与选择器不再相邻（F-6 只管选择器彼此相邻，不受影响） |
| 支付图标 | 底栏右侧 | **第三区，社交图标下方** | 无社交时整区由支付图标单独撑起；支付为空则整区消失 |
| 选择器 | sub-footer，带描边盒子 | **底栏右侧，裸排（图标 + 文字 + 小箭头）** | 仍需原生 `<select>` + 可见提交按钮做无 JS fallback；按钮在增强后才收起 |
| 回到顶部 | 不提供（全站浮层已有） | **也不提供**（v3.0 首版做过页脚圆钮，2026-11-08 撤掉） | 页脚圆钮距页底 28px、与 fixed FAB 几乎同一条横线，末屏实测重叠 36×32px（占圆钮 89%）⇒ 与其让 FAB 让位或加 44px 空白，不如只留全站那一个 |
| 行高 | 链接 44px | **细指针 24px / 触摸 44px**（`@media (pointer: coarse)`） | 桌面更紧凑（显式取舍，见下），桌面档落到 WCAG 2.5.8 AA 下限而非 2.5.5 的 44 |
| 底色 | 纯色 | 品牌色 5% 混背景色（`--footer-surface`） | 无 |

**为什么是"上面一条带"——三版试错，结论是几何决定的**

| 试过的做法 | 结果 | 否掉的原因 |
| --- | --- | --- |
| ① 左侧竖图 + 内容带让位 | 图清晰、字干净 | **文字从图片右侧起排，与上方商品网格对不齐**（刘工 2026-11-08 否掉） |
| ② 左侧竖图 + 内容贴左，图压成底纹 | 对齐对了 | 模糊救不了：模糊只改细节不改亮度。12–13px 次级文字要 4.5:1 ⇒ 底色须 ≥ #C7 ⇒ 照片得压到 **80% 纸色蒙层** ⇒ **图只剩 15 个色阶的色差**（实测 `#E5EAE3` vs `#F4F6F5`），等于白传一张图 |
| ③ **顶部横带，文字整体下移** | **图清晰 + 对齐不变 + 零对比度问题** | 页脚高出一条带 |

**为什么不能只靠"白字 + 投影"救 ②**：那是 hero 移动端的做法，只有在大字号上成立（白字压浅色草地约 2:1，靠一层 32% 黑投影抬到 3:1 的大字线）。页脚里 12–13px 的说明、同意语、版权行都是正文口径（4.5:1），白字 + 投影站不住。

**桌面行高为什么敢压到 24px**：AGENTS §8 的 44×44 是**触摸目标**口径。参考图是细密的信息型页脚，44px 行高会把它撑成两倍高、彻底跑形。做法是按指针类型分档——细指针 24px（WCAG 2.5.8 AA 要求 24×24，达标），粗指针 44px（2.5.5 AAA）。这不是省事，是明确知道在放弃什么。

**以下为 v2.0 留档（版式已废，功能职责仍可参考）**

pages-ui §1.2 的原线框是「三栏 + newsletter + 选择器 + 社交支付」的功能型页脚。v2.0 曾改为品牌收口型，理由与代价摊平如下：

| | 方案 A 功能型三栏（pages-ui 原案） | ~~方案 B 品牌收口型~~（v2.0，已被 v3.0 取代） |
| --- | --- | --- |
| 顶行 | 无 | **wordmark 一行**（`shop.name`，或商家上传的 logo）+ 可选一句定位语 |
| 列区 | 售后文本 / 耗材菜单 / 联系方式 | 菜单组（可多列）+ 文本 / 联系方式 / 社交，网格自动排 |
| 中间 | newsletter 横条 → 选择器 | **newsletter 与选择器同排**（sub-footer 顶部，符合 F-6） |
| 底栏 | 社交 · 支付 · 版权 | 版权 + `powered_by_link` · 支付图标 |
| 优点 | 实现最省；和任何现代电商主题一致 | 全站每页都出现的收口位，是"遮住品牌名还认得出"成本最低的落点（SDD §4.4 反向验收） |
| **代价** | **没有任何品牌记忆点**，与 SDD §4.4 的反向验收相悖 | 竖向更长；移动端 6 列要收成 2 列网格 + 全宽块；wordmark 吃一行高度 |

**线框（桌面）**

```
NORTHBARK                                              ← wordmark 一行
Built for the backyard.                                ← 定位语（可空）

Shop         Support      Company     Contact     Follow us
· Blades…    · Shipping…  · About     · 电话      · 图标行
· Batteries  · Warranty   · Contact   · 邮箱
· All acc.   · Guides                 · 联系页

[email__________] [Signup]      United States (USD $) ▾   English ▾    ← sub-footer 顶部
© 2026 Northbark · Powered by Shopify                  [Visa][MC][Amex]…  ← bottom bar
```

**移动端**：wordmark 全宽 → 列区 2 列网格（菜单组并排）→ 文本/联系方式/社交全宽（`grid-column: 1 / -1`）→ newsletter 单列 → 选择器单列 → 底栏纵排居中。**不做折叠手风琴**（要 JS 或 `<details>` 强制展开，收益不抵风险，见 §6）。

### 0.4 概念澄清（刘工 2026-11-07 问起，写进文档备查）

**「CAD 市场」是什么**：`CAD` 是加拿大元的 ISO 4217 代码。Shopify 的 **market（市场）**不是"国家清单"，而是**一套商业条款的容器**——一个国家或地区分组，绑一套货币、一套语言、一个域名/子目录、一套价格调整、一套税费与支付配置、一份可售商品目录。加一个 `Canada / CAD` 市场 = 让这家店能按加元、在加拿大域名路径下卖货。

**为什么验收必须靠它**：`localization.available_countries` 只包含"店铺实际可售的国家"。单市场时这个数组长度为 1，而 F-6 明文要求**只在大于 1 时输出**选择器 ⇒ 代码写对了也**整块不渲染**，强制项 #8 / #9 在演示店里肉眼验不了、截图也拿不出。这不是选择，是官方规则把验收路径锁死了。

**2026-11-07 实测修订：`Canada / CAD` 这条在演示店走不通，验收改走 B1 + B2**

货币自定义**挂在 Shopify Payments 上**：没激活时市场货币下拉是禁用的，提示 *"Complete your account setup to customize currency for markets"*。而这家店的国家设的是**美国**，Shopify Payments 个人主体在 KYC 第 3 步要 **SSN / ITIN**、第 4 步要**美国银行账户**——没有美国身份就断在那里（编税号是拿合作伙伴账号冒险，不值）。中国大陆主体更直接：官方 `Setting up payments for merchants in China` 的表格里，Mainland China 的 Shopify Payments 列就是 **Not available**。

⇒ `Canada (CAD $)` 这一幕**在演示店产出不了**。改用等价拆解（2026-11-07 已跑通）：

- **B1（验 #8 / F-7 格式）**：把 Canada 并进现有的 **United States 市场**（共用 USD）→ `available_countries.size == 2` → 国家选择器出现，格式 `Canada (USD $)`。
- **B2（验 #9 / F-6 相邻）**：`设置 → 语言 → 添加语言（French）→ 发布`（**不必先翻译**）→ `available_languages.size == 2` → 语言选择器出现，选项显示 `Français`（`endonym_name`）。

两条合起来覆盖 #8 / #9 / F-6（两个选择器相邻）/ F-7（**全名 + 代码 + 符号**这个格式本身）。**唯一没验到的是"币种真能从 USD 换成 CAD"**——这是环境能力问题，不是代码缺口：主题那三个值（`country.name` / `currency.iso_code` / `currency.symbol`）全部取自平台对象，换币种不需要改一行代码。

**2026-11-08 刘工补充前提（决定了上面这条的处置）**：本主题的**唯一目标是提交 Shopify Theme Store，不是运营店铺**；开发者主体在**中国大陆**，Shopify Payments 永久不可用。因此：
- `CAD` 实证与**支付图标实证**都属于"演示店永远拿不到"，**不再投入**，一律按"代码符合官方写法"判定；
- **支付图标**在演示店不输出 = F-3 条款未触发（条件性要求），不是缺陷，已定案；
- **社交图标要分两层看**（2026-11-08 刘工拿 Concept 官方演示店举证后修正）：F-5 原文是 *"Social media **placeholder text** must be left empty"*——管的是**主题默认值 / 占位文字**，**主题包里必须空**（否则商家装完得到一堆指向别人的链接）。但**演示店本身可以填真实可打开的链接**，Concept 的官方演示店就填了（指向 Shopify 自己的账号），F-13"演示店必须用真实内容、禁占位"反过来支持这么做。
  ⚠️ **操作坑**：在后台编辑器里给演示店填了 URL，改动会写回 `sections/footer-group.json` ——**打包前必须把 URL 清空**，否则默认值被污染、等于随包预置了别人的社交链接；
- 演示店该保留的是 **Canada（USD）+ French 已发布**——它们证明 #8 / #9 的选择器条件渲染与切换真的生效，这比币种是不是 CAD 重要得多；
- 演示店的**社交图标可以填**（提升演示完整度），**支付图标填不了**（无支付方式）—— 一条能补、一条只能空着，别混为一谈。

**社交图标是什么**：就是「一枚图标 + 一个 `<a href>`」，指向商家在各平台的官方主页。**不登录、不拉 feed、不嵌 iframe、不调任何 API**。它不连接"品牌账号"的技术身份，只是替顾客指路（售后找客服、看教程、看新品）。官方强制它存在，是因为换主题不能让商家的社交入口凭空消失；官方同时禁止预填占位（F-5），因为一个假的 `@yourbrand` 就是死链。

---

## 1. 决策记录（2026-11-07）

| # | 决策 | 代价 / 已知损失 |
| --- | --- | --- |
| D-1 | **版式走方案 B 品牌收口型**（§0.3），wordmark 只占一行不铺屏 | 页脚变高；移动端 6 列要收成 2 列网格 |
| D-2 | **单 section + 多 block**（沿用 v1.0 结论）。pages-ui §1.2 那张表的 5 行读作"5 类职责"，不是 5 个 section 文件 | 页脚内部顺序由 block 顺序决定，编辑器里不是拖 section 那么直观 |
| D-3 | **国家/语言用原生 `<select>` + 提交按钮，JS 只做"选完即提交、把按钮收起来"**，不做 popover | 外观不如 popover 精致；换来零 JS 可用、零焦点陷阱风险（官方把"custom element + noscript fallback"写成默认解法，原生 select 是官方 UX 指南明确许可的基线） |
| D-4 | **社交图标自绘 5 枚单色**（facebook / instagram / youtube / tiktok / pinterest），24×24 `fill="currentColor"` | 不追求品牌字形 1:1；审核看的是"有一组可选"，不是像不像 |
| D-5 | **preset 与 group JSON 都预置社交 block，URL 一律留空**（= 不渲染，符合 F-5） | 演示店看不到社交图标；验收用临时 URL 法（§4） |
| D-6 | **页脚菜单用「一个 `footer` 菜单 + 一组一列」渲染**：一级项带子项 → 该项自成一列 | **列由后台菜单树决定，编辑器不能单独拖列**；商家把 footer 菜单建成平铺，页脚就渲染成一列（不是 bug） |
| D-7 | **本清单去人日**，执行顺序只靠依赖关系约束 | 无法从文档读出"还剩多少工作量"，排期要看 TASKS 或口头约定 |

> **为什么 D-6 不用"三个 menu block 各指一个菜单"**：`link_list` 的 `default` 必须是 `footer`（F-2），三个 block 默认全指同一个菜单 ⇒ 装完三列内容一模一样；要各不相同就得预填 `footer-shop` / `footer-support` 这类 handle，而新装店铺没有这些菜单 ⇒ 三列全空。一组一列只用一次后台建菜单动作，装完即用。

---

## 2. 任务分解

> **实现状态（2026-11-07）**：T-0.2 / T-0.4 / T-1.1 ~ T-1.10 / T-2.1 / T-2.2 / T-3.1 已完成（勾选见下）。
> **待刘工执行**：T-0.3（后台：`footer` 菜单、Support 三页发布、Canada/CAD 市场）与 T-3.2 / T-3.3（上机验收）。
> 与下文描述不一致的实现手法集中记在 §7，每条都带实测依据。


### P0 前置（事实、素材、店侧数据）

#### T-0.1 官方事实复核 ✅ 2026-11-07 完成

- [x] 重核 F-1 ~ F-14，逐条填入 §0.2（v1.0 的 11 条全部复核，修正 2 条、新增 3 条）
- [x] 核实 `localization` 对象字段：`available_countries` / `available_languages` / `country` / `language` 存在；`country.currency.iso_code` / `.symbol`、`language.endonym_name` / `.iso_code` 存在
- [x] 复核 `country` 对象**无 `url` 属性** ⇒ 切换国家只能表单提交，不能 `<a href>` 直跳（决定 T-1.7 的实现形态）
- [x] 发现两处 v1.0 未记的缺口：**主题缺 Custom Liquid section**（F-14，独立缺陷）、**`{% javascript %}` 标签全站 0 使用**（脚本约定已固定，见 §0.1）

#### T-0.2 社交图标自绘 5 枚 · 依赖：无

- [x] `assets/icon-facebook.svg` / `icon-instagram.svg` / `icon-youtube.svg` / `icon-tiktok.svg` / `icon-pinterest.svg`
- [x] 统一规格：`viewBox="0 0 24 24"`、`fill="currentColor"`、单色、无文字、无外框；与现有 `icon-cart.svg` 等放在同一目录
- [x] **不得从外部下载或引用**（AGENTS §4 资源红线）；自绘简化字形，不追求品牌 1:1
- [x] 在 `sections/footer.liquid` 用 `inline_asset_content` 输出（走 CDN，`asset_url` 家族），不用 `<img>`
- [x] 社交图标的可访问名走 `aria-label` + `t:` 键（图标是**链接**不是按钮），**不用 `title`**

#### T-0.3 店侧数据准备（**刘工后台操作**，主题只消费） · 依赖：无，可与开发并行

- [x] 后台 **Navigation** 建/改 `footer` 菜单（一个菜单，一级项分组，供 D-6 的"一组一列"）：✅ 2026-11-07
  - `Shop` → Blades & Bars / Batteries / All accessories
  - `Support` → Shipping & oversized delivery / Warranty / Maintenance guides
  - `Company` → About / Contact
  - **不挂** Filters（空集合）；**不挂** Oils & Fuel（无对应集合，已于 2026-10-27 决定不做）
  - 📌 **实测建了 2 组**：Shop → Chainsaws / Trimmers / Accessories；Support → Ship & Oversized Delivery / Warranty / Maintenance Guides。
    **没有 Company 组** ⇒ 页脚渲染成 4 列（2 菜单列 + text + contact），不是线框里的 5 列。要 5 列就再补一个一级项（Company → About / Contact）
- [x] `Support` 三项指向的 2 个 page + 1 个 blog **必须已发布并填实质内容**（F-13 禁空页；否则页脚挂出 404）。✅ 2026-11-07 刘工已发布
- [x] ~~加第二个市场 **Canada / CAD**~~ ⛔ **改走降级路径，已跑通（见 §0.4）**：Canada 并进 United States 市场（共用 USD）+ 发布 French 语言。
  原路径被平台卡死：货币自定义要 Shopify Payments，美国主体的 KYC 要 SSN + 美国银行账户。
- [x] 记下：两个选择器**均已在演示店出现**（2026-11-07 刘工确认）。⚠️ 实测字符串待回填——预期国家项为 `Canada (USD $)`（不是 `CAD`），语言项为 `Français`

#### T-0.4 页脚文案定稿 · 依赖：无

- [x] wordmark 下方定位语一句（Northbark 口径，不含真实商标）
- [x] newsletter 标题 + 说明 + 成功态 + 错误态 + 同意语（同意语必须写明可退订）
- [x] 联系列：电话（`555-01xx` 段，**不编真实号码**）、邮箱、联系页
- [x] **全部文案遵守 F-12**：美式英语、**不含 `&`**、sentence case、按钮以动词开头

### P1 section 实现

#### T-1.1 `sections/footer.liquid` 骨架与栅格 · 依赖：T-0.1

- [x] 重写整节（现为 Skeleton 原版 69 行）。根元素**保留** `<footer class="site-footer full-width">`——`.site-footer` 是骨架配色的映射钩子（§0.1），改名即深色 preset 崩
- [x] 四段结构：`wordmark 行` → `列区（grid）` → `sub-footer（newsletter + 选择器）` → `bottom bar（版权 + 支付）`
- [x] 列区：`display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`；**menu block 的包装元素用 `display: contents`**，让菜单组直接成为 grid item（否则 D-6 的多列无法与其它 block 对齐）
- [x] 移动端（`max-width: 749px`，与本主题既有断点 750 / 990 / 1280 对齐）：列区 `repeat(2, 1fr)`；文本 / 联系方式 / 社交 / newsletter / 选择器 `grid-column: 1 / -1`；底栏纵排居中
- [x] 间距、`margin-block-start` 用现有节奏变量或 `clamp()`；**初值上机微调**，不要在文档里编死数字
- [x] `{% stylesheet %}` 位于 section 顶层（BUG-014）；颜色全部 `var(--color-*)` / `color-mix`，不写 `rgb()` / hex
- [x] schema：`name` 走 `t:sections.footer.name`；`"class"` 加 `footer-section`；`"enabled_on": { "groups": ["footer"] }`（照 `announcement-bar.liquid` 的写法）
- [x] **修 F-2 缺陷**：所有 `link_list` 设置加 `"default": "footer"`
- [x] 空态总则：**任何一个 block 无内容 → 该 block 不渲染**，不留空列、不留空壳、不输出 0（AGENTS §6）

#### T-1.2 `brand` block：wordmark · 依赖：T-1.1

- [x] 有 `image_picker`（logo）→ 输出图（`image_tag` + width/height + alt=shop.name）；**无图 → 回落到 `shop.name` 文本**做 wordmark
- [x] wordmark 是指向 `routes.root_url` 的链接，可访问名用 `shop.name`（不靠"点这里"）
- [x] 可选 `tagline` 文本设置；为空则不留空行
- [x] 字号用 `clamp()`，**待上机微调**；`letter-spacing` 收一点（v1.0 旧文档写的具体数值已删除，避免无出处参数）
- [x] **wordmark 不用 `h1`**（全页只允许一个 h1，且属主内容）

#### T-1.3 `menu` block：菜单组（一组一列） · 依赖：T-0.3、T-1.1

- [x] 设置：`link_list`（`default: "footer"`）+ 可选的整组标题
- [x] 渲染规则（D-6）：遍历 `section.settings.menu.links`；**带子项的一级项** → 各自渲染成一个 `<nav>` 列（列标题 = 一级项标题，用 `<h2>` + `id`，`<nav aria-labelledby>`）；**不带子项的一级项** → 归入一个"平铺列"
- [x] 每列最多渲染 8 条，超出截断（`limit`），**不折叠、不"更多"**（避免第二条交互路径）
- [x] 空菜单 / `link_list` 未选 → 整个 block 不渲染（不留空列标题）
- [x] 链接行高与内距使触摸目标 ≥ 44×44 px；`aria-current="page"` 由 `link.current` 给出
- [x] 类名：`footer__menu` / `footer__column` / `footer__column-title` / `footer__link`

#### T-1.4 `text` block：售后 / 保修说明 · 依赖：T-0.4

- [x] 设置：标题（`text`）+ 富文本（`richtext`）
- [x] **输出必须套 `<div class="rte">`**（BUG-064：本主题 reset 把 `h*/p/ul` 块间距清零，不套就是"一坨"）
- [x] 富文本里的字重只用 400 / 700（本主题只 `font_face` 两档，500/600 会掉到 400，见 BUG-064 预防第 5 条）
- [x] 标题或正文任一为空 → 该部分不渲染；两者都空 → block 不渲染
- [x] **文案不得含保修承诺的具体法规措辞**（虚拟品牌口径，见 T-0.4）

#### T-1.5 `contact` block：联系方式 · 依赖：T-0.4

- [x] 设置：标题、电话（`tel:`）、邮箱（`mailto:`）、联系页（`page` 类型设置，**不手拼路径**）
- [x] 全空 → block 不渲染；单项空 → 该项不渲染（不留空行、不输出 `—`）
- [x] `tel:` / `mailto:` 的可见文本与链接一致（不做"联系我们"这种不可读的链接文本）

#### T-1.6 `newsletter` block · 依赖：T-0.4 · 对应强制项 **#11**

- [x] `{% form 'customer' %}` + `<input type="email" name="contact[email]" required>`（F-9；字段名错则表单静默不提交）
- [x] `<input type="hidden" name="contact[tags]" value="newsletter">` —— **社区惯例，非官方文档要求**，代码里写注释标明来源，别当规范
- [x] 成功态：`form.posted_successfully?` → 原位确认文案，容器 `aria-live="polite"`
- [x] 错误态：读 `form.errors`，`aria-invalid="true"` + `aria-describedby` 指向错误文本，**保留用户已填邮箱**
- [x] 同意语一行（说明可随时退订），走 `t:` 键
- [x] 双 opt-in 提示：文案写"需查收确认邮件"（是否开启由后台 Settings → Notifications 决定，主题只能提示）
- [x] **无 JS 必须可提交**：`{% form %}` 输出真实 `<form>`，不做成纯 JS 交互
- [x] `label` 必须可见或 `visually-hidden` 关联，不用 placeholder 当标签
- [x] 按钮文案以动词开头、用 `Signup`（F-11/F-12）

#### T-1.7 `localization` block：国家 / 语言选择器 · 依赖：T-0.3 · 对应强制项 **#8 #9**

- [x] `{% form 'localization' %}` 包裹；国家输入 `name="country_code"`、语言输入 `name="language_code"`（F-8）
- [x] 条件输出：`localization.available_countries.size > 1` 才出国家选择器；`localization.available_languages.size > 1` 才出语言选择器（F-6，**不是优化，是官方规则**）；两者都不出 → block 不渲染
- [x] **基线（D-3）**：原生 `<select>` + 可见的提交按钮（`t:sections.footer.labels.update`）→ 无 JS 完全可用（F-8 要求的 fallback 本身就是这条基线）
- [x] JS 增强（`assets/footer.js`，Custom Element `<locale-selector>`，`defer`）：`change` 即提交、把提交按钮收成 `visually-hidden`；**JS 失败时按钮必须在**（先渲染、后隐藏，不要默认隐藏）
- [x] 国家项格式 `{{ country.name }} ({{ country.currency.iso_code }} {{ country.currency.symbol }})`（F-7）；当前项 `selected`
- [x] 语言项用 `endonym_name`，加 `hreflang` + `lang`；当前项 `selected`
- [x] **不硬编码 URL**：`country` 无 `url` 属性（§0.1 已核），切换只能表单提交；站内链接一律 `routes`
- [x] 位置：**sub-footer 顶部、与页脚导航列分离**（F-6）——放 newsletter 同一排的右端
- [x] 触摸目标 ≥ 44×44 px；`<select>` 样式借用主题下拉态（`appearance: none` + 自有 chevron），hover/focus 与其它控件一致

#### T-1.8 `social` block：社交图标 · 依赖：T-0.2 · 对应 **F-4 F-5**

- [x] 设置：平台（`select`，5 个选项走 `t:` 键）+ URL（`url` 类型，**由商家填，主题不预置任何网址**）
- [x] **URL 为空 → 该图标不渲染**；全部为空 → block 不渲染（F-5 + AGENTS §6）
- [x] 链接：`target="_blank"` + `rel="noopener"`；可访问名 = 平台名（`t:` 键），图标本身 `aria-hidden="true"`
- [x] 触摸目标 ≥ 44×44 px；图标尺寸与现有图标同规格
- [x] 设置命名用 `social media`（F-11），不写 "social buttons"

#### T-1.9 bottom bar：版权 + 支付图标 · 依赖：T-1.1

- [x] 版权：`© {{ 'now' | date: '%Y' }} {{ shop.name }}`（`shop.name` 链 `routes.root_url`）
- [x] `{{ powered_by_link }}` **原样输出，不得包裹、不得改文案**（F-10）
- [x] 确认该对象自身输出带 `rel="nofollow"`（指向 Shopify 域名的链接必须带，F-13）。若缺，**报告而不是自行拼一段 `<a>`**——拼接会违反"只能含 `powered_by_link`"
- [x] 支付图标：`{% for type in shop.enabled_payment_types %}{{ type | payment_type_svg_tag }}{% endfor %}`，**必须全彩**（F-3）；无启用支付方式 → 整块不渲染
- [x] 图标组用 `<ul role="list">` + 群组 `aria-label`；单个图标 `aria-hidden="true"` + 同项 `visually-hidden` 支付方式名
- [x] 术语用 **bottom bar**（F-11）；底栏文字不可用 `--color-foreground-muted` 之外更淡的值（对比度按 AGENTS §8 算，两个 preset 都要验）

#### T-1.10 `custom_liquid` block（推荐，非阻塞）· 依赖：T-1.1

- [x] 加一个 `type: "liquid"` 的 block（F-14 的 "Custom Liquid blocks into certain sections"）
- [x] 空值 → 不渲染；输出不加 `rte`（它是原始 Liquid，不是富文本）
- [x] **注意**：这不解决主题缺 Custom Liquid **section** 的缺陷（§0.1），那个另行立项

#### T-1.11 背景图通栏 + 品牌说明（v3.0 新增）· 依赖：T-1.1

- [x] section 级 `image_picker`（`background_image`）：绝对定位在页脚左侧，宽度 = 页边距 + `--footer-rail`
- [x] 淡出用**三层底色渐变叠加**，不用 `mask-image`（Safari 需要前缀、`mask-composite` 两派写法）：右侧淡出 / 顶部淡出 / 底部实色压住版权行
- [x] 纯装饰层 `aria-hidden="true"` + `alt: ""` + `pointer-events: none`；移动端（<750）改为流内 9rem 横幅
- [x] 让位 padding 只加在 `.footer__main`；**不能加在 `.footer__inner`**（会连底栏一起推右）
- [x] brand block 增加 `description`（richtext，必须套 `.rte`，BUG-064）；preset 不预填营销文案，演示值只留在 `footer-group.json`
- [x] 无图片时整层不渲染、无让位、无浮叶 —— 退化为纯色页脚，不留空壳

#### T-1.12 底栏不提供「回到顶部」（v3.0 决议，2026-11-08 刘工定案）· 依赖：T-1.1

- [x] **页脚不做回到顶部圆钮**。全站浮动 FAB（`snippets/back-to-top.liquid` + `assets/back-to-top.js`）是唯一入口
- [x] 依据是实测不是感觉：页脚圆钮距页面底边 28px、横向与 FAB 近乎同一条线，滚到最底时
      1440 / 1024 / 500 三档实测重叠 **36×32px = 圆钮面积的 89%**，等于被 FAB 整个盖住
- [x] **不许改 FAB**（刘工 2026-11-08 明确）：曾试过给 `back-to-top.js` 加 IntersectionObserver
      让它在页脚在场时收起，已整体回退，`assets/back-to-top.js` 与提交版逐字节一致
- [x] 底栏因此以语言选择器收尾；原本写在圆钮前的竖分隔线、`.footer__to-top` 全部样式、
      `sections.footer.to_top` 翻译键一并删除（无残留）
- [x] 如果将来一定要页脚自带入口：唯一不冲突的做法是**去掉全站的 FAB**，二选一，不并存

### P2 组装与文案

#### T-2.1 重写 `sections/footer-group.json` · 依赖：T-1.1 ~ T-1.10

- [x] 只放一个 `footer` section（D-2），保留 `type: "footer"` 与 `name: "t:general.footer"`
- [x] block 顺序按 §0.3 线框：`brand` → `menu` → `text` → `contact` → `social` → `newsletter` → `localization`
- [x] `menu` 设置指向 `footer` 菜单；`social` 预置 5 个 block 但 **URL 全空**（D-5）
- [x] JSON 里不留 Skeleton 遗留键（旧 `menu: ""` 必须改掉，否则页脚链接列永远是空的）
- [x] 所有 preexisting 键值必须能在 schema 里找到（Shopify 会静默忽略未知键，但会让人误判"设置没生效"）

#### T-2.2 locale 键（两个命名空间分开校验） · 依赖：T-2.1

- [x] `en.default.schema.json`：`sections.footer.name`、各 block 的 `name` 与全部 `labels`、平台选项名
- [x] `en.default.json`：newsletter 的 标题 / 说明 / `email_placeholder` / `submit` / `success` / `error` / `consent`；选择器的 `country` / `language` / `update`；社交的 `follow_us`
- [x] 跑 `python3 tools/check-locale-keys.py`，**退出码必须 0**（缺键即 1）
- [x] 校验前**先剥 Shopify dev 同步写入的 `/* */` 注释头**（BUG-021）
- [x] 全部文案过一遍 F-12：美式英语、**无 `&`**、sentence case、按钮以动词开头、标题不重复主语、所有设置都有 `label`

### P3 验收

#### T-3.1 静态检查与强制项对照 · 依赖：T-2.2

- [x] `shopify theme check` 涉及页脚文件 **0 Error**（沙箱内 CLI 不可见，请刘工代跑并回贴——AGENTS §2）
- [x] `python3 tools/check-tag-balance.py`（近似检查，最终以 theme check 为准）
- [x] `python3 tools/check-locale-keys.py` 退出码 0
- [x] **F-2 复核**：页脚所有 `link_list` 都有 `default`，值为 `footer`
- [x] **F-3 复核**：支付图标来自 `enabled_payment_types` 且全彩
- [x] **F-4 / F-5 复核**：5 个平台都可选；URL 空时图标消失；主题里 grep 不到任何预置社交网址
- [x] **F-10 复核**：`powered_by_link` 原样输出

#### T-3.2 上机验收 · 依赖：T-3.1

> **环境口径（2026-11-08 修正）**：静态渲染可在 `shopify theme dev` 里看，但**任何表单提交类验证都不能**——本地代理对 `POST /localization` 返回 401（`shopify/cli#1642`）。切换国家/语言、newsletter 提交必须在**真实店铺域名**（或 `?preview_theme_id=` 预览）下做。

- [x] **选择器条件渲染**：单市场时整块**不渲染**，加入 Canada 后出现 ✅ 2026-11-08（双向验证过；格式为 `Canada (USD $)` 而非 CAD，原因见 §0.4）
- [ ] 前后各截一张对比图存档（用于提交材料，非功能验收）
- [x] **两个选择器相邻**且位于 sub-footer 顶部、与导航列分离（F-6）✅ 2026-11-08
- [x] **无 JS · 选择器**：禁用 JS → 提交按钮**可见**，改选后点 `Update` **提交生效**，刷新后选择保持（持久性同验）✅ 2026-11-08
- [ ] **无 JS · newsletter**：禁用 JS → 填入邮箱点 `Signup` 能创建客户（#11，未验）
- [ ] **缺数据**：清空菜单 / 清空社交 URL / 清空电话 / 清空富文本 → 对应列或图标消失，无空壳、无 `0`、无报错
- [ ] **键盘**：全链路 Tab 可达、焦点可见、无正 `tabindex`、无 `autofocus`
- [ ] **断点** 375 / 768 / 1920：无横向溢出；移动端列区为 2 列网格、全宽块正确跨列
- [ ] **两个 preset**：Coppice（浅）与 Coppice Noir（深）各看一遍——**确认 `.site-footer` 骨架映射仍生效**（深色下不能出现白底黑字）
- [ ] **对比度**：底栏正文 ≥ 4.5:1，图标 ≥ 3:1（两个 preset 分别量）
- [ ] **RTL**：临时把 `dir="rtl"` 加上，列顺序与图标位置镜像正确（无写死的 `left` / `right`）
- [ ] **主流程冒烟**：任意页 → 页脚链接 → Support 三页不 404

#### T-3.3 性能与文档回填 · 依赖：T-3.2

- [ ] Lighthouse：home / product / collection 三页双端，Performance 均值 ≥ 60、Accessibility 均值 ≥ 90（SDD §8.1/§8.2），**页脚不引入首屏阻塞资源**（图标全 inline，无额外请求）
- [ ] 实测值回填 §4
- [x] 级联更新 `pages-ui.md` §1.2（版式线框已回填）✅ 2026-11-07（见 §5 表格）
- [x] 有 bug / 返工 → 当日记入 `dev-docs/bugs.md` ✅ BUG-065（critical.css 合并冲突标记）已记，含实测数据与可执行预防措施

---

## 3. 验收锚点对照

| 任务 | pages-ui | SDD | 官方事实 |
| --- | --- | --- | --- |
| T-0.1 | — | §3 | F-1 ~ F-14 |
| T-0.2 | §1.2 social 行 | §7.2 资源红线 | F-4 |
| T-0.3 | §1.1.1 菜单树、§1.2 数据源 | §4.2 / §4.3 / §9.4 | F-13 |
| T-0.4 | §1.2 文案 | §8.6 术语 | F-12 |
| T-1.1 | §1.2 整体线框 | §4.2 | F-1 F-2 |
| T-1.2 | §1.2 顶行 | §4.4 视觉方向 | — |
| T-1.3 | §1.2 footer menu | §4.3 | F-2 F-11 |
| T-1.4 | §1.2 售后文本 | §4.2 | — |
| T-1.5 | §1.2 联系方式 | §4.2 | — |
| T-1.6 | §1.2 newsletter | §7.1 #11 | F-9 |
| T-1.7 | §1.2 localization | §7.1 #8 #9 | F-6 F-7 F-8 |
| T-1.8 | §1.2 social | §7.2 红线 | F-4 F-5 F-11 |
| T-1.9 | §1.2 payment | §7.1 / §7.2 | F-3 F-10 |
| T-1.10 | — | §7.1 #1 | F-14 |
| T-2.1 | §1.2 | §4.2 | F-2 |
| T-2.2 | §1.2 | §8.6 | F-11 F-12 |
| T-3.1 ~ T-3.3 | §1.2 状态要点 | §8.1 / §8.2 / §8.3 / §13 | F-2 F-3 F-6 F-8 F-10 |

---

## 4. 逐项验收清单（可勾选，提交前跑）

**强制功能矩阵**

- [x] #8 Country / currency selection — 选择器**已出现**（B1：Canada 并入 US 市场）✅ 2026-11-07
  - [x] 出现条件正确（单市场时不渲染，加完才出现 —— F-6 的"大于 1 才输出"由此得到双向验证）
  - [x] 当前项 `selected` 正确（下拉里 United States 带勾）✅ 2026-11-08
  - [x] 切换生效 + 持久性：真实域名下切到 `Canada (USD $)`，刷新/重开后仍是 Canada ✅ 2026-11-08（断 JS 状态下点 `Update` 同样生效）
  - ℹ️ 注：`shopify theme dev`（127.0.0.1:9292）里这条验不了，`POST /localization` 返回 401，见 §7
  - [ ] ⛔ 格式里的 `CAD` 未验到：演示店只有 USD（§0.4 的平台限制）。格式规则本身见 F-7 行
- [x] #9 Language selection — 语言选择器**已出现**（B2：发布 French，未翻译）✅ 2026-11-07
  - [x] **切换生效 + 持久性**：切到法语后 URL 变 `/fr`，刷新后保持 ✅ 2026-11-08 真实店铺域名（断 JS 点 `Update` 同样生效）
  - [x] 当前项 `selected` 正确（`/fr` 下显示 `Français`）。先前在 dev 显示 Français 是代理丢 cookie 所致，真实环境正常
  - [x] 选项文字走 `endonym_name`（显示 `Français` 而非 "French"）
  - [ ] option 上的 `lang` / `hreflang` 未看 DOM 确认
  - [x] 已知无害现象：切到法语后正文仍是英语 —— 没有译文，回落默认语言，符合预期
- [ ] #11 Newsletter forms — 提交成功创建客户、`accepts_marketing = true`、tag = `newsletter`；错误态保留邮箱

**官方硬性条款**

- [x] 页脚 section 渲染在 section group 内（F-1）✅ 代码核：`footer-group.json` 挂载 + `enabled_on.groups: ["footer"]`
- [x] 所有 `link_list` 的 `default` = `footer`（F-2）✅ 代码核：schema 里 `"default": "footer"`
- [x] 支付图标来自 `enabled_payment_types` 且全彩（F-3）✅ 代码核：`{% for type in shop.enabled_payment_types %}{{ type | payment_type_svg_tag }}`，无滤镜/灰阶。**演示店永久无实证**（§0.4）
- [x] 社交图标 5 平台可选（F-4）—— `social` block 的 `select` 有 5 个平台选项
- [x] 无预置 URL、无占位文案（F-5）✅ `footer-group.json` 里 5 个 block 的 `url` 均为空串（2026-11-08 核）
  ℹ️ 演示店可以填真实链接，但**打包前必须清回空串**（后台改动会写回该 JSON）
- [x] 选择器"大于 1 才输出"（F-6）✅ —— 双向验证：单市场/单语言时整块不渲染，B1/B2 之后才出现
- [x] 两个选择器**相邻**、位于 sub-footer 顶部、与导航列分离（F-6）✅ 2026-11-08 刘工实测确认
- [x] 国家格式全名 + 代码 + 符号（F-7）✅ 实测渲染 `Canada (USD $)` / `United States (USD $)` —— 全名 + ISO 代码 + 货币符号，格式规则成立。
  **币种是 USD 而非 CAD**：Canada 并进了 United States 市场（同一市场 = 同一货币），原因见 §0.4
- [x] 无 JS 可用（F-8）—— 断 JS 后 `Update` 按钮**可见**、**点了提交生效**、刷新后选择保持 ✅ 2026-11-08（国家 + 语言都验过）
- [x] `powered_by_link` 原样（F-10）✅ 代码核：无包裹、无改写
- [x] 术语：bottom bar / footer menu / social media icons / signup（F-11）✅ 文案核：`Footer menu` / `Social media` / `Signup` 均按官方术语
- [x] 文案：美式英语、无 `&`、sentence case、设置全有 `label`（F-12）✅ footer 范围内核过（其他 section 仍存既有 `&`，不属本清单）

**工程与无障碍**

- [x] theme check 0 Error；locale 校验 0 缺键 ✅ 2026-11-08：78 files / 0 offenses；locale 退出码 0
- [ ] 空态：菜单 / 电话 / 富文本 为空 → 对应元素消失（**社交 URL 空已验**：演示店 FOLLOW US 整列不渲染；其余三项未逐项验）
- [x] `<div class="rte">` 包裹所有富文本输出（BUG-064）✅ 代码核：`<div class="rte footer__rte">`
- [x] `{% stylesheet %}` 在 section 顶层（BUG-014）✅ 每文件一个、位于顶层
- [x] 颜色无硬编码 ✅ `grep` 0 命中；全部 `var(--color-*)` / `color-mix`
- [x] 触摸目标 ≥ 44×44；焦点可见；无正 `tabindex` ✅ 代码核：链接/按钮/图标均 44px；`:focus-visible` 走全局规则
- [x] 深浅两个 preset 下 `.site-footer` 骨架映射均生效 ✅ 2026-11-08 无头渲染双预设核过（深色底 + 浅色字，无白底黑字）
- [x] 无横向溢出 ✅ 静态渲染核过 375 / 768 / 1440（375 档 `scrollWidth == clientWidth`）；1920 未单独跑，≥1280 共用同一套 auto-fit 规则
- [ ] Lighthouse 三页双端达标（实测值：性能 ____ / 无障碍 ____）

---

## 5. 级联文档改动

| 文件 | 改动 | 状态 |
| --- | --- | --- |
| `dev-docs/task-footer.md` | v1.0 → v2.0：重排为品牌收口型、去人日、F 表重核、任务重编号 | ✅ 2026-11-07 |
| `dev-docs/pages-ui.md` §1.2 | 线框图与 section 表按 §0.3 重排（顶行 wordmark、4+ 列区、newsletter 与选择器同排） | ✅ 2026-11-07 |
| `dev-docs/task-index.md` §0 | 外部依赖表里 footer 那行的引用去人日 | ✅ 2026-11-07 |
| `dev-docs/sdd.md` §4.2 | **不改**：该节列的是页脚"职责"（售后 / 耗材入口 / newsletter / 社交 / 支付），本版只细化版式，职责未变；#8/#9 由 §7.1 覆盖 | 有意不动 |
| `AGENTS.md` §6 | **不改**：Custom Element / `<dialog>` / 样式归属规则已覆盖本清单所有实现 | 有意不动 |

---

## 6. 本清单**不做**的事（防范围蔓延）

- 不做页头、移动导航抽屉、搜索与预测搜索（`task-header.md`）
- 不做购物车页与购物车抽屉（`task-cart.md`）
- 不做对比栏 / 对比勾选（集合页与商品卡）
- 不做礼品卡二维码（`gift_card.liquid`）
- 不做愿望清单等依赖 App 的功能（AGENTS §4 红线）；**不做 Instagram feed、社交登录**——社交图标只是链接
- **不做移动端手风琴折叠**：要么 JS 控 `open`、要么 `<details>` 强制展开，两条路都会引入状态与焦点问题，而收益只是省一屏高度。列为后续可选优化
- 不做「回到顶部」按钮（已在 layout）
- **不修 Custom Liquid section 缺失**（F-14）：这是主题级缺口，与页脚无关，已立项 → `task-compliance.md` G-01；T-1.10 只在页脚提供一个 `liquid` block（对应那边 G-10）
- 不改 `layout/theme.liquid`
- 不新建 `config/markets.json`（提交包红线，市场配置只在后台做）

---

## 7. 实现偏差记录（2026-11-07）

> 只记「与上文任务描述不一致」的地方。功能范围没变，变的是实现手法；每条都有实测支撑。

| # | 任务 | 文档原写法 | 实际实现 | 原因（实测） |
| --- | --- | --- | --- | --- |
| B-1 | T-1.1 列区 | `repeat(auto-fit, minmax(160px, 1fr))` 一路到底 | ≥1280px 用该写法；**750–1279px 改成 `repeat(3, minmax(0, 1fr))`**，正文 `span 2`、联系占 1 列、社交整行 | auto-fit 下列宽 = 内容宽 ÷ item 数。6 个 block 在 768 上每列只有 ≈182px，`support@northbark.example`（≈187px）被 `overflow-wrap: anywhere` 拆成两行；1440 上每列 ≈216px 才刚好放得下。属 §0.3 授权的「初值上机微调」 |
| B-2 | T-1.1 社交列表 | — | `gap: 0`（间距由 44px 盒内 11px 留白提供）+ `margin-inline-start: -0.6875rem` 让首枚图标与列标题左对齐 | 5 枚 × 44px = 220px。加 `gap: .125rem` 后在 160–240px 的列里折成 4+1 两行（1440 实测） |
| B-3 | T-1.9 支付图标可访问名 | 「图标 `aria-hidden="true"` + 同项 `visually-hidden` 支付方式名」 | **两者都不做**，只给 `<ul>` 一个 `aria-label` | 官方 `payment_type_svg_tag` 输出的 SVG 自带 `role="img"` + `aria-labelledby` + `<title>Visa</title>`。加 `aria-hidden` 会直接抹掉可访问名；再补一份 visually-hidden 会让每张图标被念两遍 |
| B-4 | T-1.6 错误态保留邮箱 | 「保留用户已填邮箱」 | `value="{{ form.email }}"`，并在代码里注明是尽力而为 | `{% form 'customer' %}` 是整页 POST，平台未承诺回填已提交的邮箱（`new_comment` 有 `form.email`，customer 表单没有对应文档）。无 JS 路径下服务器端报错会清空输入框——**平台限制，主题侧无法可靠控制** |
| B-5 | T-1.7 语言项 | 「加 hreflang + lang」 | 两者都写在 `<option>` 上 | 官方 UX 指南把它们写在 `<a>` 上；`hreflang` 不是 `<option>` 的合法属性，但浏览器与读屏都忽略未知属性，保留只为与文档措辞一致 |
| B-6 | T-1.1 schema `class` | 加 `"class": "footer-section"` | 已加，但目前**没有任何 CSS 依赖它** | 预留钩子；critical.css 的 vertical rhythm `:is(...)` 列表没有纳入（页脚自带 `margin-block-start`） |

**顺带修掉的既有缺陷**：`assets/critical.css` 的未解决合并冲突（**BUG-065**）。开工时该文件处于 `UU` 状态，`.rte th` 的 `color` 声明被冲突标记吞掉，Noir 预设下正文表格表头会黑底黑字。已先修再写页脚，否则深色验收没有意义。

**本次新增文件**：`assets/icon-facebook.svg` / `icon-instagram.svg` / `icon-youtube.svg` / `icon-tiktok.svg` / `icon-pinterest.svg`（24×24、`fill="currentColor"`、单色实心、文件内自带 `aria-hidden` 与 `focusable="false"`）、`assets/footer.js`（`<locale-selector>`，300ms 防抖提交 + 增强后收起按钮）。

**验收缺口（2026-11-07 更新）**：单市场 + 单语言的演示店上，选择器按 F-6 **整块不渲染**，所以必须先造出"多于一个"的环境。原计划是加 `Canada / CAD` 市场，**被平台卡死**（货币自定义要 Shopify Payments，美国主体的 KYC 要 SSN + 美国银行账户），已改走 B1 + B2 降级路径并跑通，两条选择器都已在演示店出现。仍然缺的三条：

1. **`CAD` 币种实证** —— 环境能力问题，非代码缺口（§0.4）。**本主题定位是提交主题商店、不是店铺运营，开发者主体在中国大陆 ⇒ Shopify Payments 永久不可用 ⇒ 这一条不再追实证**，按"代码符合官方写法"判定。
2. **option 上的 `lang` / `hreflang`** —— 还没看 DOM 确认。不影响功能（`hreflang` 本就不是 `<option>` 的合法属性，见 B-5），但要确认属性确实输出了。
3. ~~切国家/语言是否生效、断 JS 点 `Update` 是否真能提交~~ ✅ **2026-11-08 全部验过**：真实域名下切换生效且刷新保持；断 JS 时按钮可见、点击提交生效（国家与语言都验）。

> ⚠️ **`shopify theme dev`（`127.0.0.1:9292`）里任何表单提交类验证都做不了**：本地代理对 `POST /localization` 返回 **401**，浏览器直接跳到 `127.0.0.1:9292/localization` 一页 401。这是 CLI 的已知问题（`shopify/cli#1642`；社区帖 "CLI Theme Dev cart ajax 401" 有逐字一致的描述），**不是主题的 bug**——选择器是标准 `{% form 'localization' %}`，与 Dawn 同构。
> **判据**：报错 URL 是 `127.0.0.1:9292` ⇒ 环境问题；是店铺域名 ⇒ 真 bug。
> **解法**：在店铺域名或 `?preview_theme_id=<id>` 预览下验（经过真实 storefront 才会写 localization cookie）。同源问题也会打掉 `shopify theme dev` 里的 newsletter 提交（#11），别在 dev 里验表单类功能。
4. **支付图标（F-3）同样无实证** —— `shop.enabled_payment_types` 只收录**真实在线支付方式**；`Test payment gateway` 与手动支付方式（货到付款/银行转账）都**不会**产出品牌图标。没有 Shopify Payments（大陆主体不可用）或第三方网关（需真实商户账户）⇒ 演示店这一段恒为空。**这一条同样永久不追**，理由同第 1 条。
   这不是缺陷：F-3 是**条件性条款**（*"If payment method logos are output, then …"*），不输出不构成缺口；`{% for type in shop.enabled_payment_types %}{{ type | payment_type_svg_tag }}{% endfor %}` 已按官方写法就位。**但评审若要求看到图标，只能等有真实支付能力时再补截图。**

撤销 B2 的副作用提醒：语言一栏 `...` → **Unpublish** 即可，选择器会立刻消失——这本身就是 F-6 条件渲染的活证据。**不要点 `Translate`**：机器译文会写进主题的 `locales/fr.json`，提交包多出一份未校审译文，且 `MatchingTranslations` 会因缺键把 theme check 从 0 offenses 打回有警告。

---

## 维护规则

SDD / pages-ui 变更时同步本清单对应任务；任务状态变更（完成 / 阻塞）在条目后加 `✅ 日期` / `⛔ 原因`；bug / 返工当日记入 `dev-docs/bugs.md`（BUG-NNN 编号）。**新增任务插入对应阶段并重编号前，先检查 §3 锚点表与 §4 清单的引用。** 本清单不记工期，排期以 `AGENTS.md` / 口头约定为准。
