# 页尾（footer-group）开发任务清单 — task-footer.md

> **性质**：SDD 驱动开发的全局组件任务清单（v1.0）。拆解自 `dev-docs/pages-ui.md` §1.2（footer group 工单）与 `dev-docs/sdd.md` §4.2 / §7.1，不引入新决策。
> **权威关系**：与 SDD / pages-ui 冲突时，以 `dev-docs/sdd.md` 为准；本清单只负责把页尾工作切成可执行、可验收的任务。
> **范围**：`sections/footer.liquid` + `sections/footer-group.json` + footer 专属 snippet + 相关 locale 键。header group、购物车抽屉、对比栏**不在本清单内**（见 §0）。
> **版本**：v1.0 ｜ 整理日期：2026-10-09 ｜ 总人日：**7.0**（累加链见 §4）
> **通用约束**（不逐任务重复）：文案走 `t:` 键、URL 走 `routes`、图片 `image_tag` + width/height、JS 一律 defer/async、隐藏组件首次打开才建 DOM、类名 Skeleton 风格 BEM、设计令牌走 `css-variables.liquid`、RTL 用逻辑属性（AGENTS.md §4/§6/§9）。

---

## 0. 外部依赖与已核实平台事实

### 0.1 外部依赖（不在本清单内，但影响页尾）

| 依赖 | 现状（2026-10-09） | 影响 | 处置 |
| --- | --- | --- | --- |
| header group 改造（pages-ui §1.1） | Skeleton 默认结构，仅 `header.liquid` 一个 section | 页尾 `#8/#9` 若最终要跟账户/购物车就近放置，需header 就位才能对比版面 | 本清单按 SDD §4.2 落在页尾，不阻塞；header 清单另立 |
| 演示店 `footer` 菜单 | 后台未建 | `footer-menu` block 预设内容为空 → preset 不满足"可用示例内容"（AGENTS.md §6） | 待刘工后台建菜单，见 T-0.2 |
| 演示店多市场 / 多语言 | 未建（单市场单语言） | **官方规则：`localization.available_countries.size > 1` 才输出国家选择器，`available_languages.size > 1` 才输出语言选择器** → 单市场单语言下整块不渲染，`#8/#9` 在演示店里无法肉眼验收 | 见 T-0.3（必须解决，否则验收线无法执行） |
| `snippets/spec-value.liquid` | ✅ 已完成（2026-10-08） | 页尾不消费 | 无 |

### 0.2 已核实的官方平台事实（2026-10-09 查证，出处可回查）

| # | 事实 | 出处 |
| --- | --- | --- |
| F-1 | 页尾 section 必须渲染在 **section group** 内 | requirements §5 Templates/sections/blocks |
| F-2 | Header/Footer 中的 `link_list` 设置**必须**有 `default`，值为 `main-menu` 或 `footer` | requirements §14 Settings |
| F-3 | 支付图标是**条件性**要求：*"If payment method logos are output, then use `enabled_payment_types` … The icons must be in full color."* —— 可不输出；一旦输出必须走官方 filter + 全彩 | requirements §7 Layout page requirements |
| F-4 | 社交图标是**无条件强制**：*"Must have a set of social media icons to choose from."* 同章还要求 OG/Twitter card 标签（已由 `snippets/meta-tags.liquid` 覆盖） | requirements §13 Social media |
| F-5 | *"Social media placeholder text must be left empty."* —— 社交平台占位文案必须留空 | requirements §13 |
| F-6 | 国家/语言选择器**仅在可选项 > 1 时输出**；两个选择器若都存在**必须相邻放置**；页尾放置时**位于 sub-footer 内容顶部、与页尾导航链接分离** | multiple-currencies-languages / country-language-ux |
| F-7 | 国家选择器格式：*"include the full country name and include the currency code beside the currency symbol"*（如 `United States (USD $)`） | country-language-ux |
| F-8 | 实现方式：`{% form 'localization' %}` + `input[name="country_code"]` / `input[name="language_code"]`；官方要求 *"you should also include a fallback in case JavaScript is disabled"* | multiple-currencies-languages |
| F-9 | newsletter 用 `{% form 'customer' %}` + `input[type=email][name="contact[email]"]`，提交后创建/更新客户并置 `accepts_marketing = true` | email-consent |
| F-10 | 演示店要求：`powered_by_link` 不可改动、必须原样输出；不得含联盟链接 | requirements §20 Demo stores |
| F-11 | 术语：页尾底部法律区叫 **bottom bar**（不要用 legal / below footer）；页尾菜单叫 **footer menu**；社交叫 **social media / social media icons** | requirements §14 Terminology |

> **⚠️ 一处需要刘工拍板的边界**：AGENTS.md §4 红线写"不得硬编码 `http://` / `https://` 外部资源链接"。该红线针对的是**资源加载**（CSS/JS/图片/CDN），社交平台主页是商家在设置里填的 `<a href>` **超链接**，且 `url` 类型设置本身就是 Theme Store 标准做法 —— 不构成红线。**但"主题里预置任何指向具体网站的社交链接"绝对不行**（演示店是虚拟品牌 Northbark，且 F-5 要求占位留空）。清单按此口径执行，若刘工认为需要更保守，按 F-5 留空即可，已默认。

---

## 1. 架构决策：单 section 还是拆多个

这是本清单唯一需要先摊开的取舍，其余任务都建立在它上面。

| |方案 A：单 section + 多 block（**推荐**） | 方案 B：拆 5 个独立 section |
| --- | --- | --- |
| 文件 | `footer.liquid` 一个 section，内部 6 类 block | `footer-text` / `footer-menu` / `newsletter` / `localization` / `social-payment` 五个 section |
| 合规 | ✅ 满足 F-1（group 内渲染） | ✅ 同 |
| 版式确定性 | ✅ 三栏 + newsletter 横条 + bottom bar 的栅格在同一次渲染里算，preset 出来就是 pages-ui §1.2 线框 | ❌ 跨 section 无法共享栅格；商家一拖动顺序，"三栏并排"立刻塌 |
| 商家自由度 | block 级增删排序（粒度更细） | section 级增删排序（更粗，但更显眼） |
| 商家改坏了的风险 | 低 | 高 —— 页尾是全站每页都在的版面，最容易连带整站视觉崩 |
| 代价 | 页尾内部顺序调整必须在 section schema 内做，编辑器里不是拖 section 那么直观 | 排版确定性差；preset 默认排布难做漂亮 |

**结论：走 A。** pages-ui §1.2 那张表的 5 行读作"5 类职责"，不是"5 个 section 文件"；SDD §4.2 只要求"渲染在 section group 内，可动态增删排序"，block 级增删已满足。**这一条属于对 pages-ui §1.2 的解释而非推翻**，若刘工要求严格按表格拆 5 个文件，需重排栅格方案并重估人日（+0.5，且 T-1.1/F-1.1 验收项全改）。

---

## 2. 任务分解

### P0 前置（平台事实、素材、演示店数据）

#### T-0.1 平台事实核查 · 0.5 人日 · 依赖：无 ✅ 2026-10-09 完成

- [x] 官方 requirements 全文查证：F-1 ~ F-11 已填入 §0.2，每条带出处
- [x] 核实 `localization` / `country` / `shop_locale` / `currency` 对象属性：`available_countries`、`available_languages`、`country`、`language` 存在；`country.currency.iso_code` / `.symbol`、`language.endonym_name` / `.iso_code` 存在
- [x] 核实 `country` 对象**没有 `url` 属性** → 无法用 `<a href>` 直接跳国家页，**必须走表单提交**（这一条直接决定 T-1.4 的实现形态）
- [ ] **发现现存缺陷（待修）**：`sections/footer.liquid` 的 `menu` 设置**缺 `default`**，违反 F-2 → 随 T-1.1 重写一并修复

> **注意**：F-2 这条在 Skeleton 默认 footer 里就没有。它不是我们抄漏了，是官方 2025 年新增/收紧的要求，靠记忆做不出来 —— 这类事实必须查文档，不能推。

#### T-0.2 演示素材与菜单准备 · 0.5 人日 · 依赖：刘工后台操作

- [ ] 社交平台图标 SVG **5 枚自绘**（`assets/icon-social-{facebook,instagram,youtube,tiktok,pinterest}.svg`，24×24 viewBox，单色 `currentColor` 填充）
  - **不得从外部下载/引用**（AGENTS.md §4 资源红线）；自绘单色 path，不追求品牌字形 1:1 还原
  - 若要严格品牌字形：**追加 +0.5 人日**，本清单默认按单色简化
- [ ] 后台建 `footer` 菜单（供 F-2 的 `default` 与 preset 示例内容使用），建议分三组：**Shop**（耗材分类入口）/ **Support**（Shipping、Warranty、Maintenance Guides）/ **Company**（About、Contact）
  - 耗材入口指向自动化集合或 `Product category` 集合（对齐 pages-ui §1.1.1 的 Accessories 四个子类）
- [ ] 页尾售后/保修文案定稿（Northbark 虚拟品牌口径，不含真实商标、不含召回/保修承诺的具体法规措辞）
- [ ] 图标出图/绘制口径登记进 `docs/demo-store/asset-provenance.md`（AGENTS.md §9、§9.3）

#### T-0.3 演示店多市场 / 多语言配置 · 0.5 人日 · 依赖：刘工后台操作 🔴 **验收阻塞项**

- [ ] 依据 F-6：单市场单语言下国家/语言选择器**整块不渲染**，`#8/#9` 无从验收
- [ ] 处置方案（三选一，刘工拍板）：
  1. **建第二个 market（如 Canada / CAD）+ 发布第二个语言（如 Français / en-ca 视情况）** —— 最真实，能同时验证国家与货币格式（F-7）；成本：后台配置 + 演示店需有对应翻译
  2. **只建第二语言、不建第二市场** —— 能验证语言选择器，国家选择器仍不渲染
  3. **接受"代码路径已实现、演示店不可见"**，把 `#8/#9` 验收降级为"代码走查 + 官方示例逐条比对"，并在提交前自查表里标注 ⚠️
- [ ] **未决前 T-1.4 可以写完，但 T-3.1 的 `#8/#9` 验收项不能划掉**

### P1 section 实现

#### T-1.1 `sections/footer.liquid` 骨架与栅格 · 1.0 人日 · 依赖：T-0.1

- [ ] 重写现有 Skeleton 默认 footer（当前只有 copyright + menu + payment 三块横排，无栅格无 block）
- [ ] 结构固定为三段，对齐 pages-ui §1.2 线框：
  1. **sub-footer 顶部**：`localization` 选择器（**独立于导航链接**，F-6）→ 由 T-1.4 提供
  2. **主栏区**：左「售后与保修」文本块 + 中「耗材/支持链接」菜单组 + 右「联系方式」 → T-1.2 / T-1.5
  3. **bottom bar**：`newsletter` 表单（独立横条）+ 社交图标 + 支付图标 + `{{ powered_by_link }}` + 版权年 → T-1.3 / T-1.6
- [ ] 栅格：桌面 3 列、移动纵排；用 CSS grid，**RTL 用逻辑属性**（`grid-template-columns` 保持，`text-align: start`）
- [ ] `{% stylesheet %}` **必须位于 section 顶层**，不得嵌套在 `if`/`for` 内（BUG-014 已二犯，见 `dev-docs/bugs.md`）
- [ ] schema：`name` 走 `t:general.footer`；`class` 加 `footer-section` 并登记进 `assets/critical.css` 的 `:is()` 节奏列表（与首页各 section 一致）
- [ ] 修 F-2 缺陷：`link_list` 设置加 `"default": "footer"`
- [ ] 提供 preset，preset 名含 `Coppice`（AGENTS.md §4 硬性要求；若 hero-slideshow 的 `Coppice` preset 已占位，此处用 `Footer — Coppice` 之类不冲突的名字，**同一主题只需至少一个**，优先落在首页 T-2.1）

#### T-1.2 售后/保修文本 + 菜单列 block · 0.5 人日 · 依赖：T-0.2

- [ ] `text` block ×N：售后承诺、保修说明、支持入口引导语；preset 用 T-0.2 定稿文案（非占位符）
- [ ] `menu` block ×N：每列一个 `link_list`（`default: "footer"`），列标题走设置项 + `t:` 键
- [ ] 商家未填菜单/文本 → **该列不渲染**，不留空壳、不崩页（AGENTS.md §6）
- [ ] 触摸目标 ≥ 44×44 px（链接行高/内距按此算）
- [ ] 类名：`footer__column` / `footer__column-title` / `footer__link`

#### T-1.3 `newsletter` block · 0.5 人日 · 依赖：T-0.2 · 对应强制项 **#11**

- [ ] `{% form 'customer' %}` + `<input type="email" name="contact[email]">`（F-9，字段名错则表单不提交）
- [ ] `contact[tags]` 隐藏域值 `newsletter` —— **社区惯例，非官方文档要求**，写入注释标明来源，别当官方规范
- [ ] 成功态 `form.posted_successfully?` → 原位确认文案（`aria-live="polite"`）；错误态读 `form.errors` / `form.errors.messages`，`aria-invalid` + `aria-describedby` 挂到输入框，**保留用户已填邮箱**
- [ ] 双 opt-in 提示：文案说明"需查收确认邮件"（后台 Settings → Notifications 开关，主题侧只能提示）
- [ ] 同意语一行（可退订），走 `t:` 键
- [ ] 无 JS 时表单仍可提交（`{% form %}` 输出真实 `<form>`，天然可降级 —— 不要做成纯 JS 交互）
- [ ] `id` 唯一（页尾全站仅一处，但 preset 若复制 section 需防重）

#### T-1.4 `localization` 选择器（国家/货币 + 语言）· 1.0 人日 · 依赖：T-0.3 · 对应强制项 **#8 #9**

- [ ] **渐进增强基线（选它，不选纯 JS popover）**：默认渲染原生 `<select name="country_code">` / `<select name="language_code">` + 提交按钮，包在 `{% form 'localization' %}` 内 → **无 JS 完全可用**（F-8 明确要求 fallback）
- [ ] 用 JS 增强为 popover（`{% javascript %}`，`defer`）：`aria-expanded` / `aria-controls` / `Esc` 关闭回焦 / 点击外部关闭
- [ ] 条件输出：`available_countries.size > 1` 才输出国家选择器；`available_languages.size > 1` 才输出语言选择器（**F-6，不是优化，是官方规则**）
- [ ] 两者同时存在时**必须相邻**（F-6）；页尾位置在 sub-footer 内容顶部、**与页尾导航链接分离**（F-6）
- [ ] 国家项格式 `United States (USD $)`：全名 + 货币代码 + 货币符号（F-7）
- [ ] 语言项用 `endonym_name`（母语名），加 `hreflang` + `lang` 属性；当前项 `aria-current="true"`
- [ ] **禁止硬编码 URL**：`country` 对象无 `url` 属性（F-1/T-0.1 已核实），切换只能表单提交；站内链接一律 `routes`（requirements §7）
- [ ] 触摸目标 ≥ 44×44 px；`<select>` 样式继承主题下拉态（UX 指南：借用主题 dropdown 样式，hover/focus/selected 一致）

#### T-1.5 联系方式 block · 0.5 人日 · 依赖：T-0.2

- [ ] 块内容：售后电话（`tel:`）、邮箱（`mailto:`）、联系页链接（走 `routes` 或商家 `page` 设置，**不手拼路径**）
- [ ] 电话/邮箱走商家设置项，preset 里留 Northbark 虚拟品牌占位（`555-01xx` 段留空位，**不编真实号码**）
- [ ] 无设置项 → 整块不渲染
- [ ] 不实现任何联系表单（`page.contact.json` 是另一份工单，不在本清单）

#### T-1.6 社交图标 + 支付图标 block · 0.5 人日 · 依赖：T-0.2 · 对应 **F-3 F-4 F-5**

- [ ] 社交 block ×N：平台选择（`select`）+ URL（`url` 设置，**由商家填，主题不预置任何具体网址**）
- [ ] **URL 为空 → 整个图标不渲染**，不留空心图标/占位文案（F-5 + AGENTS.md §6）
- [ ] preset 里社交 block 数量按"演示需要"决定：F-5 要求占位留空 → **建议 preset 放 0 个社交 block**（图标库照样交付，商家自选），避免出现指向虚拟/真实平台的死链
- [ ] 支付图标：`{% for type in shop.enabled_payment_types %}{{ type | payment_type_svg_tag }}{% endfor %}`，**必须全彩**（F-3）
- [ ] 支付图标区块 `show_payment_icons` 设置默认 `true`；无启用支付方式 → 整块不渲染
- [ ] 社交/支付图标 aria：有链接的社交图标需 `aria-label` + `rel="noopener"`；支付图标组 `aria-label` 群组、单个图标 `aria-hidden="true"` + `visually-hidden` 文本
- [ ] 尺寸 ≥ 44×44 px 触摸目标；社交 SVG 用 `inline_asset_content`（走 CDN，`asset_url` 家族）
- [ ] 命名遵循术语表：`social media icons` 不叫 `social buttons`（F-11）

### P2 组装与文案

#### T-2.1 重写 `sections/footer-group.json` + locale 键 · 0.5 人日 · 依赖：T-1.1 ~ T-1.6

- [ ] group JSON 只放一个 section（方案 A），保留 `type: "footer"`；补 `enabled_on` 之类非必需字段不必加
- [ ] locale 键落 `locales/en.default.json` + `en.default.schema.json`，覆盖：section/label 名、block 名与默认文案、newsletter 成功/错误/同意语、选择器 label 与"更新"按钮、bottom bar 术语（F-11）
- [ ] 面向商家文案 **sentence case + 美式英语**（AGENTS.md §9）；`canceled`/`color` 等拼写按官方术语表
- [ ] locale/JSON 文件写入前**先剥 Shopify dev 同步的 `/* */` 注释头**再校验（AGENTS.md §6）
- [ ] 所有设置项必须有 `label`（requirements §14）

### P3 验收

#### T-3.1 页尾验收 · 1.0 人日 · 依赖：T-2.1（+ T-0.3 决定 `#8/#9` 能否肉眼验收）

- [ ] `shopify theme check` 涉及页尾文件 **0 Error**，Warning 记录并清零
- [ ] **强制项逐条核对**：#11 newsletter（表单能提交、客户后台收到、tag 正确）｜ #8 #9 选择器（依赖 T-0.3 方案）
- [ ] **F-2 复核**：页尾所有 `link_list` 设置都有 `default`，值合法
- [ ] **F-3 复核**：支付图标来自 `enabled_payment_types` 且为全彩
- [ ] **F-6/F-7 复核**：单市场单语言下整块消失；多市场下显示 `United States (USD $)` 格式；两选择器相邻且位于导航链接上方
- [ ] **无 JS 实测**：newsletter 能提交、国家/语言能用原生 select 切换（**F-8 明文要求**）
- [ ] **缺数据实测**：清空菜单 / 清空社交 URL / 清空电话 → 对应列或图标消失，无空壳、无 `0`、无报错
- [ ] 键盘走查：全链路 Tab 可达、焦点可见、`Esc` 关闭 popover 回焦、无正 `tabindex`
- [ ] 无障碍：动态区域 `aria-live="polite"`；触摸目标 ≥ 44×44 px；对比度正文 4.5:1 / 图标 3:1；RTL 镜像抽查
- [ ] Lighthouse：页尾改动后复测 home / product / collection 三页双端，性能均值 ≥ 60、无障碍均值 ≥ 90（SDD §8.1/§8.2）；**页尾不引入首屏阻塞资源**（社交 SVG 走 inline、不 JS 阻塞）
- [ ] 移动端真机：375 / 768 / 1920 三断点，页尾不横向溢出
- [ ] 主流程冒烟：任意页 → 加购 → 购物车 → 结账，页尾不影响（AGENTS.md §10）

---

## 3. 验收锚点对照

| 任务 | pages-ui | SDD | 官方事实 |
| --- | --- | --- | --- |
| T-0.1 | — | §3 事实基线 | requirements §5/§7/§13/§14/§20 |
| T-0.2 | §1.2 数据源列 | §4.2、§9 | F-4 F-5 |
| T-0.3 | §1.2 localization 行 | §7.1 #8 #9 | F-6 |
| T-1.1 | §1.2 整体线框 | §4.2 | F-1 F-2 |
| T-1.2 | §1.2 footer-text / footer-menu | §4.2 | F-2 |
| T-1.3 | §1.2 newsletter 行 | §7.1 #11 | F-9 |
| T-1.4 | §1.2 localization 行 | §7.1 #8 #9 | F-6 F-7 F-8 |
| T-1.5 | §1.2 联系方式 | §4.2 | requirements §7（routes） |
| T-1.6 | §1.2 social + payment 行 | §7.2 红线 | F-3 F-4 F-5 F-11 |
| T-2.1 | §1.2 | §8.6术语 | F-2 F-11 |
| T-3.1 | §1.2 状态要点 | §8.1/§8.2/§8.3/§13 | F-2 F-3 F-6 F-8 |

## 4. 人日累加链

```
T-0.1 0.5 + T-0.2 0.5 + T-0.3 0.5 = 1.5
+ T-1.1 1.0 + T-1.2 0.5 + T-1.3 0.5 + T-1.4 1.0 + T-1.5 0.5 + T-1.6 0.5 = 4.0   （累计 5.5）
+ T-2.1 0.5   （累计 6.0）
+ T-3.1 1.0   （累计 7.0）
────────────────────────────
合计 7.0 人日（单人估算）
```

> **v1.0 初稿曾记 6.5**，复核发现漏算 T-0.3（多市场配置）的 0.5，已修正为 **7.0**。社交图标若要求严格品牌字形再 +0.5。
> 追加项须回填本清单并重算累加链。

## 5. 本清单**不做**的事（防范围蔓延）

- 不改header group、不做移动端导航抽屉、不做搜索/预测搜索
- 不做对比栏/对比勾选（属集合页与商品卡）
- 不做购物车抽屉、加速结账按钮（属 cart / product）
- 不做礼品卡二维码（`gift_card.liquid` 另有模板）
- 不实现愿望清单等依赖 App 的功能（AGENTS.md §4 红线）
- 不改 `layout/theme.liquid`（`{% sections 'footer-group' %}` 已就位）
- **不修 header.liquid**（F-2 缺陷只在 footer 范围内记录与修复；header 的同类缺陷另立 header 清单时处理）

---

## 维护规则

SDD / pages-ui 变更时同步本清单对应任务；任务状态变更（完成/阻塞）在条目后加 `✅ 日期` / `⛔ 原因`；bug / 返工当日记入 `dev-docs/bugs.md`（BUG-NNN 编号）。新增任务插入对应阶段并重编号前，先检查 §3 锚点表引用。