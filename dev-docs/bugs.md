# Bug 收集与复盘 — bugs.md

> **用途**：记录开发过程中实际发生的 bug / 事故 / 返工，每条含现象、根因、修复与**预防措施**。价值在最后一列——同类问题不许二犯。
> **规则**：新 bug 按时间顺序追加编号（BUG-NNN），发现即记录（哪怕当场修复）；状态 Open / Fixed / Won't-fix；预防措施必须可执行（写进流程或文档才算，"注意"两个字不算）。
> **关联**：任务状态见 `task-index.md`；素材验收口径见 `docs/demo-store/asset-provenance.md`。

---

## Open（待处理）

### BUG-015 · Ryobi 原图刀盘标"20 in"与 CSV 标题"21 in"矛盾
- **日期**：2026-09-30 ｜ **状态**：Open（真实品牌图已弃用，转为确认 NB 造型时不再复现）
- **现象**：Ryobi 产品图机身印有 "20 in" 标识，CSV 标题写 21 in。
- **根因**：图片可能不是 RY401150US 同款。
- **处置**：真实品牌路线已废弃（BUG-010），NB 体系出图按 metafield 规格。**预防**：出图验收清单加一条"图内可见规格与该款 metafield 一致"。

### BUG-016 · BP/BS 暂共用图片，BS 专属图待补
- **日期**：2026-10-08 ｜ **状态**：Open（已按共用图对齐 alt，专属图待出）
- **现象**：NB-21BP 与 NB-21BS（手推款/自走款）暂共用 main 与 kit 图，BS 的"自走式、2×6.0 Ah 同款电池"卖点无对应图。
- **处置**：alt 已按共用画面事实改写（去 self-propelled/容量描述），台账 #11/12 标注。**预防**：临时共用必须当场记录 alt 对齐动作，防止日后当成疏漏。

### BUG-017 · 店侧遗留：旧真实品牌商品与 Files 图待删
- **日期**：2026-10-08 ｜ **状态**：Open（刘工操作）
- **现象**：CSV 已虚拟品牌化并导入 NB 系列，但店内核实前，旧 11 款真实品牌商品与 Shopify Files 里的真实品牌图仍在。
- **影响**：演示店混入非虚拟品牌商品 → 违反 SDD §9.1。
- **处置**：重导后删除旧商品/旧图，复查集合计数（40V=2、80V=1、Gas=7、20V/60V=0），重关 task-index T-0.1。

### BUG-018 · 误装残留：~/node_modules 半成品
- **日期**：2026-10-08 ｜ **状态**：Open（个人目录，仅报告不清除）
- **现象**：npm 在未钉 package.json 的目录执行安装，向上解析把包装进了 `~/node_modules`（esbuild 多平台二进制，几十 MB）。
- **根因**：受管 node workspace 目录当时不存在/无 package.json，npm 就近上溯。
- **处置**：已在正确目录补 package.json 钉根并成功安装；`~/node_modules` 属个人目录待刘工自行删除。**预防**：任何 npm install 前确认目标目录有 package.json。

---

## Fixed（已闭环）

### BUG-014 · `{% stylesheet %}` 嵌套在 `{% if %}` 内 → 本地 dev 全部新 section 报错
- **日期**：2026-10-08（首犯）/ **2026-10-09（二犯：重写 featured-collection.liquid 时重蹈）** ｜ **状态**：Fixed ×2
- **现象**：`Liquid syntax error: 'stylesheet' tag must not be nested inside other tags`，5 个新 section 全中；blog-posts 连带报 "Section type does not refer to an existing section file"（解析失败→section 无效→引用找不到，并非文件缺失）。
- **根因**：Shopify 要求 stylesheet/javascript 标签位于 section **顶层**；且 **theme-check-node 静态分析不检查此规则**——theme check 全绿 ≠ dev server 无错。二犯根因：重写文件时凭旧结构记忆，没对照 bugs.md 首犯记录。
- **修复**：脚本统一把 stylesheet 块剪切到 endif 之后、schema 之前（两轮同法）。
- **预防（二犯后加码）**：**凡是 Write/Edit 一个 .liquid section，写完立刻检查 `{% stylesheet %}`/`{% javascript %}` 是否位于顶层**——已固化为操作步骤而非"经验"；AGENTS §6 样式归属判据条内含位置规则。

### BUG-013 · 正则批量改源码三连败
- **日期**：2026-10-08 ｜ **状态**：Fixed
- **现象**：用正则给 build_mower_csv.py 批量回填 URL，连续翻车三次：①捕获组多吞一个 `\(`；②替换串多写 `", "`；③旧串凭记忆写不匹配。中间产生一次语法损坏（靠备份恢复）。
- **根因**：正则没先在目标文本上验证；替换串与模式尾部重复；记忆不可靠。
- **修复**：恢复备份 → 模式先 search 验证 → 小步替换 → 每步立即跑脚本验证语法。
- **预防**：对源码做批量结构替换的固定流程：**验证 search 命中 → 替换 → 语法验证（跑一次）→ 失败即恢复备份**。

### BUG-012 · 手动回填后 CSV 第二次变成 XLSX
- **日期**：2026-09-30 ｜ **状态**：Fixed
- **现象**：`mower-products-import.csv` 扩展名 .csv、魔数 PK（Excel 2007），Shopify 拒收。与 09-30 上午同款事故第二次发生。
- **根因**：电子表格软件直接保存。
- **修复**：留档 `.from-xlsx.xlsx`，从 XLSX 抢救回填数据写入脚本，重跑生成纯文本。
- **预防**：**改数据只走脚本重跑；表格软件只看不存，要存必须"另存为 CSV UTF-8"**（已写进 task-index T-0.2 与记忆）。

### BUG-011 · 首批场景素材三重缺陷（水印/中文烧录/文件名对调）
- **日期**：2026-09-30 ｜ **状态**：Fixed（第二批全部解决）
- **现象**："豆包AI生成"水印 ×5、hero 中文文案+按钮烧录、Small_Yards/Large_Lawns 文件名与内容对调。
- **根因**：出图前无验收清单；免费生成渠道带强制水印（商用许可未核验）。
- **修复**：逐项反馈重出；后续建立"图片三无 + 内容对版"核验口径并写入 provenance。
- **预防**：**任何图先过核验清单再入库**；生成渠道商用条款核验登记为 provenance 必填项（§9.3）。

### BUG-010 · 演示店路线与 SDD §9.1 冲突（真实品牌 vs 虚拟品牌）
- **日期：2026-10-08 拍板 ｜ 状态：Fixed（回虚拟品牌原案，CSV 已改造）
- **现象**：CSV/产品图走真实品牌（Honda/Toro/John Deere 等）真实型号 + 厂商风格图，违反 SDD §9.1（虚拟品牌 Northbark + NB 自拟型号，明文禁真实型号码）。
- **根因**：数据先行时未对照 §9.1；产品图引入时未复核路线约束。
- **修复**：拍板回原案；CSV 去品牌化（vendor/型号/文案/召回提示），图全量 AI 重出。
- **预防**：**数据与素材动工前先查 SDD 对应章节的路线性决定**（AGENTS §1.1 既有规则，当时漏执行）。

### BUG-009 · 文档平台阵容漏 80V、20V/60V 与实际数据不符
- **日期**：2026-09-30 ｜ **状态**：Fixed
- **现象**：SDD §4.3 / pages-ui 菜单树只写 20V/40V/60V；实际导入数据为 40V×2、80V×1，无 20V/60V。
- **根因**：值域（含 80V）与文档阵容脱节。
- **修复**：三文档级联（SDD 加 80V 行、pages-ui 补行+空卡隐藏、task-index 按值域建集合）。
- **预防**：涉及枚举值域的文档修改，对照 metafield-reference 值域复核。

### BUG-008 · task-index 人日累加链算错
- **日期**：2026-09-30 ｜ **状态**：Fixed
- **现象**：首稿累加链 9.0/10.0，复核后实际 8.5。
- **预防**：累加链类数字改动必须重算链尾（已是 task-index 维护规则，本次是规则生效案例）。

### BUG-007 · "#8 垂直收纳"细节图即梦翻车
- **日期**：2026-10-08 ｜ **状态**：Fixed（切换备选 height-adjuster）
- **现象**：垂直收纳姿态训练样本少，折叠把手结构画错。
- **处置**：启用预埋备选细节图（零决策成本切换）；垂直收纳卖点保留在 CSV 描述。
- **预防**：每个细节图方案出图前预埋一条备选 variant（结构越不常见越要）。

### BUG-006 · 提示词术语"座驾式草坪拖拉机"不准确
- **日期**：2026-10-08 ｜ **状态**：Fixed
- **现象**：lawn tractor 直译成"草坪拖拉机"——术语错误 + "拖拉机"一词诱导模型画农用机型。
- **修复**：6 处替换为"驾乘式割草机"。
- **预防**：生成提示词中的中文产品术语按行业口径（lawn tractor→驾乘式割草机；zero-turn→零转向割草机）。

### BUG-005 · 第二批 hero 图仍有英文烧录 + 宽度不足
- **日期**：2026-09-30 ｜ **状态**：Fixed（第三批 8 张全过，10-08）
- **现象**：水印/中文已清，但英文标题/按钮仍烧录；Hero1/3 宽度 <2000px；无竖图。
- **预防**：给生成侧的验收口径一句话版——**画面出现任何文字/按钮/水印即不合格**；返工反馈必须附逐项核验清单（第二批因此自愈 3/6 项）。

### BUG-004 · task-index/T-0.1 前置未核先写
- **日期**：2026-09-30 ｜ **状态**：Fixed（纳入流程）
- **现象**：首稿任务清单对数据侧前置（metafield/集合/CSV）无核查任务，section 开发会缺数据。
- **预防**：任务清单 P0 前置段为固定结构（已固化）。

### BUG-003 · CSV 导入报错（首次 XLSX 事故）
- **日期**：2026-09-30 ｜ **状态**：Fixed
- **现象**：仅支持 CSV 的导入报错；魔数 PK。
- **修复**：重跑 build_mower_csv.py 恢复纯文本（50 列 11 行 0 错误）。
- **预防**：同 BUG-012（两次同款事故，第二次起规则写进文档）。

### BUG-002 · hero 首批素材（同 BUG-011 前半段）
- **日期**：2026-09-30 ｜ **状态**：Fixed
- 现象/处置与 BUG-011 前半段同源，合并记录不重复展开；编号保留供台账引用。

### BUG-001 · pages-ui 初稿把 5 个 section 需求写成单文件
- **日期**：2026-09-30 ｜ **状态**：Fixed
- **现象**：首页 hero/platform/use-case 等在早期草稿中混写于单 section 设想。
- **修复**：按 pages-ui §2 拆为独立 section（本次实现即按此执行）。
- **预防**：Sections Everywhere 原则下，每个页面区域 = 独立 section 文件。

---

### BUG-019 · Self-propelled 集合条件与实际 drive_type 数据不符
- **日期**：2026-10-09 ｜ **状态**：Fixed
- **现象**：pages-ui §1.1.1 写集合条件 `drive_type = Self-propelled`，但 CSV 自走款（NB-21S/22S/21BS/21B80）drive_type 实际填 Rear-wheel drive（行业真实值）——照文档建集合必为空。
- **根因**：文档按值域想象写条件，未对照导入数据实际值。
- **修复**：条件改为 `operation_type = Walk-behind` 且 `drive_type is not equal to Push`（pages-ui.md，备份 .bak-20261009）。
- **预防**：**写集合条件前先 grep CSV 实际值**——文档条件必须以数据实况为准，值域是值域、取值是取值。

### BUG-020 · 箭头设计二犯 + 坏 CSS：规则重复与裸 ::after
- **日期**：2026-10-09 ｜ **状态**：Fixed
- **现象 A**：全站 ::after 箭头滥用——use-case/blog 卡内链接也加了箭头，同屏 10 个，刘工反馈"到处都是箭头"。**现象 B**：上一轮用脚本给三处插入 `::after` 规则时产生坏 CSS——规则块整段重复 + `::after` 丢失选择器前缀（裸 `::after {`），platform-cards / blog-posts / use-case 三处全中。
- **根因**：A——把概念稿"每个链接带箭头"当落地规范，未做箭头层级设计。B——脚本插入逻辑有缺陷（group 重复拼接），且插入后未检查产物。
- **修复**：A——箭头收敛：仅保留 View All 链接与 platform 卡右端导航箭头，卡内文字链接去箭头。B——三处折叠修复（重复块删除、::after 补回选择器前缀），`grep "^ *::after"` 清零。
- **预防**：①**箭头准则（AGENTS §6）**：`→` 仅用于 View All 链接与行尾导航元素，卡内文字链接不加；②脚本改 CSS 后必须 grep 检查产物（重复块/裸选择器），不能只看"执行成功"。

### BUG-021 · locale JSON 校验脚本未剥 Shopify 注释头
- **日期**：2026-10-09 ｜ **状态**：Fixed
- **现象**：theme dev 热同步会给 JSON 文件加 `/* */` 注释头，`json.load` 直接读报错（误判文件损坏）。
- **根因**：校验脚本没适配 Shopify 的带注释 JSON 格式。
- **修复**：校验前剥头（re.sub 注释块）。
- **预防**：所有 JSON 校验脚本统一走剥头逻辑。

### BUG-022 · 连续多轮改 dev-docs 文档未先备份（违反 AGENTS §1.5）
- **日期**：2026-10-09 ｜ **状态**：Fixed
- **现象**：创建并连续三轮修改 `dev-docs/task-header.md`（v1.0→v1.3）全程未备份，直接原地编辑；直到第四轮才发现并补 `task-header.md.bak-20261009`。同期 `pages-ui.md` 因是既有文件、有 `.bak-*` 惯例，侥幸未出事。
- **根因**：新文件没有"同名 .bak 会被覆盖"的直觉约束（新文件每次都是全量重写，误以为不需要备份）；且把 AGENTS §1.5 的备份要求当成只针对"修改既有文档"，没意识到**新建文档后的后续编辑同样受约束**。
- **修复**：补建 `task-header.md.bak-20261009`；本轮改 `pages-ui.md` 前已按流程备份 `pages-ui.md.bak-20261009-2`。
- **预防**：①**动 `dev-docs/` 下任何文件前先 `cp` 备份**（新建文件的第一版就建 `.bak`，而不是等到第二次编辑）；②备份是**逐次**的——同一个文件改多轮，要么每轮一个新 `.bak`，要么一次改完再拆多个动作，不能"反正内容在上下文里"跳过；③新建文档时把首次写入就当作一次改动处理。

### BUG-023 · 菜单父级分组项若直接输出 `<a>` 会渲染出假链接
- **日期**：2026-10-09 ｜ **状态**：Open（尚未实现，作为设计预防登记）
- **现象**：刘工问"Shop / Mowers 这类只有层级的菜单项，后台 link 是否必填"，实际后台**可以留空**（父级作分组项）。但如果主题实现时照搬官方示例的无条件 `<a href="{{ link.url }}">`，空 url 会渲染出 `href="#"` 或空 href 的假链接——点击无反应或跳回顶部，无障碍上属坏链，且 Lighthouse 会扣分。
- **根因**：官方 navigation 教程的示例代码是**简化示例**（官方原文注明 "not a complete navigation feature"），它无条件输出 `<a>`，未覆盖"父级无链接"这一真实场景。
- **修复**（待实现时执行）：`main-nav` 按 `link.links.size` 分支——`> 0` 渲染 `<span>`/`<button>` 不输出 `<a>`；`== 0` 才输出 `<a>`。
- **预防**：①**菜单渲染必须区分分组项与叶子项**，不能照抄官方简化示例；②当前页标示用官方 `link.current` / `link.child_active` / `link.child_current`，不要自己比对路径字符串（官方已处理 URL 参数与集合内产品 URL 的等价判定）；③`link.url` 在 Liquid 侧可能为空，任何 `href="{{ link.url }}"` 前都要判空。

### BUG-024 · `{% javascript %}` 内不能用 Liquid 加载外部 asset
- **日期**：2026-10-09 ｜ **状态**：Fixed
- **现象**：T-1.3 main-nav 首版用 `{% javascript %} import {{ 'nav-drawer.js' | asset_url }};` 加载自定义元素脚本，theme check 报 4 个 offense：`StaticStylesheetAndJavascriptTags`（Liquid 标签 / Liquid 变量出现在 JS 块内）×2、`JavascriptOncePerFile`、`UnusedAssign`（`levels` 赋了没用——且它引用了 schema 里不存在的 `mobile_nav_depth`）。
- **根因**：**`{% javascript %}` / `{% stylesheet %}` 内不渲染 Liquid**（官方明确：内容会被聚合进单一 scripts.js / styles.css 并自动 defer 注入，所以不能用 asset_url 动态生成路径）。我当时以为它像普通 Liquid 模板。**另有一处是真错误**：`levels` 是写模板时留下的残留变量，schema 里根本没有对应设置项。
- **修复**：①外部 asset 改用手写 script 标签 `<script src="{{ 'x.js' | asset_url }}" defer></script>`；②删除 `levels` 赋值及其不存在的设置项引用。
- **预防**：①**`{% javascript %}` / `{% stylesheet %}` 只放静态代码，不放任何 Liquid**；②**加载外部 JS 必须手写 `<script defer>`**——`script_tag` filter 即使传 `defer: true` 也仍被 theme check 判为 `ParserBlockingScript`（官方明确：script_tag filter 不支持 defer/async 属性）；③**写 section 时不留未使用的 assign**——theme check 的 UnusedAssign 是廉价的静态检查，能当场抓出"写了但没接线"的残留。

### BUG-025 · schema 里 `t:` 引用的 locale 键不存在
- **日期**：2026-10-09 ｜ **状态**：Fixed
- **现象**：T-1.1 announcement-bar 的 block settings 用了 `t:labels.link`，但 schema locale 里没有这个键，theme check 报 `ValidSchemaTranslations`。
- **根因**：写 section 时只查了**前台** `en.default.json` 有没有键，没意识到 **schema 块里的 `t:` 走的是另一个文件** `en.default.schema.json`——两个命名空间独立。已有键里 `button_link` / `view_all_link` 带 link，但没有裸的 `link`。
- **修复**：补 `labels.link` = "Link"（备份 `.bak-20261009-2`）。
- **预防**：**新增 section 后跑一次全量校验**：扫所有 section/snippet/block/layout，把**正文里的 `'t:x.y'`（查前台 locale）**与 **schema 块里的 `"t:x.y"`（查 schema locale）**分开验证存在性。两个文件的键要分别维护，写完就查，别等 theme check。

### BUG-026 · 结构重构漏掉闭合标签
- **日期**：2026-10-10 ｜ **状态**：Fixed
- **现象**：方案 A 把 account/cart 并入 main-nav 后，theme check 报 `LiquidHTMLSyntaxError: Attempting to close HtmlElement 'nav' before HtmlElement 'div' was closed`（L262）。9 个 `<div>` 开标签只有 8 个闭标签——重构时把 `.main-nav__desktop` 换成 `.main-nav__inner`，**漏掉了外层 `</div>`**。
- **为什么没自查出来**：当时的标签计数脚本被注释里的标签名与属性里的 `>` 干扰，**连续四次误报或漏报**。这是本项目里最值得记住的一次：改进正则不如换工具。
- **修复**：在 `</div>
    </div>` 后补第三个 `</div>`。
- **预防**：写了 `tools/check-tag-balance.py`（深度栈配对，先剥 Liquid 注释/标签 + 中性化开标签属性）。**每次大段结构改动后跑一次**，并注意脚本声明的三个不可靠点。**优先级 theme check > 本脚本 > 肉眼。**

### BUG-027 · locale 校验脚本漏掉 `{{ 'x' | t }}` 写法
- **日期**：2026-10-10 ｜ **状态**：Fixed
- **现象**：`snippets/skip-link.liquid` 用了 `{{ 'accessibility.skip_to_text' | t }}`，但 `locales/en.default.json` 里没有 `accessibility` 段。theme check 报 `TranslationKeyExists`（error），而 `tools/check-locale-keys.py` 报"全部命中 ✓"。
- **根因**：脚本的正则只匹配 **带 `t:` 前缀**的写法（`'t:general.foo'`，那是 schema 块里的形式），**完全不认 `'general.foo' | t` 这种过滤器写法**——而后者才是正文里的主流写法。等于脚本只覆盖了两种命名空间里的一种。
- **修复**：补 `locales/en.default.json` 的 `accessibility` 段（`skip_to_text` + `refresh_page`，备份 `.bak-20261010`）；脚本改为 `collect_keys()` 分别处理两种命名空间，正文同时匹配 `'x.y' | t` 与 `'t:x.y' | t`。
- **反向验证**：临时删掉 `accessibility` 段 → 脚本准确报 `t:accessibility.skip_to_text ← skip-link.liquid`、退出码 1；还原后归零。
- **预防**：**新增 `{{ 'x' | t }}` 引用后必须跑校验脚本**，它现在是双写法的。写脚本时先确认"实际代码用的是哪种写法"，别只覆盖自己熟悉的那一种。

### 关于 30 条 warning 的判定（记录以免重复排查）
- **22 条 `OrphanedSnippet` = 误报**。逐个核实：8 个 snippet 全部有 `render` 引用（`account-entry` 2 次、`cart-entry` 2 次、`css-variables` 2 次、`image` 5 次、`meta-tags` 2 次、`predictive-search-entry` / `product-card` / `skip-link` / `spec-value` 各 1 次）。连 Skeleton 自带的 `css-variables`、`meta-tags`、`image` 都被报 orphaned，说明**该 theme check 版本的引用扫描整体失效**。
- **`ValidScopedCSSClass` 属实但不修**。`snippets/product-card.liquid`（Skeleton 自带）报同类警告，说明这是既有模式：snippet 只有标记、样式写在调用它的 section 里。
  **不修的理由**：基础样式搬进 snippet 后，抽屉用的 `.account--in-drawer` / `.cart-entry--in-drawer` modifier（依赖基础类名）必须留在 main-nav，样式会**拆成两处**——正是 BUG-026 漏 `</div>` 那类容易出错的地方，收益（消 warning）远小于风险。
- **搜索不受影响**：`predictive-search-entry` 与 `predictive-search` section **各自带 `{% stylesheet %}`**，标记与样式同文件，是正确写法。

### BUG-028 · 预测搜索接线错位：响应按 JSON 解析，联想面板永远出不来
- **日期**：2026-10-10 ｜ **状态**：Fixed
- **现象**：`assets/predictive-search.js` 的 `_fetch()` 对 `/search/suggest` 发起请求后执行 `await response.json()` 并读取 `sections[id].html`。按官方 Predictive Search API 参考，`section_id` 参数的响应是 **HTML**（含 `#shopify-section-<id>` 包裹层），HTML 走 JSON 解析必然抛错 → 落入 catch → 面板永远 `_close()`。且当时传的 `section_id` 是 main-nav 的动态实例 id 而非 section 文件名，即使解析成功拿到的也是整个导航行的 HTML。**T-1.4 完成时未做浏览器实测，这个缺陷在 T-3.1 验收前不会被暴露。**
- **根因**：实现时只核实了**请求参数**（`resources[type]` 等，已写对），没有核实**响应格式**；"拿 JSON 里的 sections 对象"是 `?sections=`（复数）参数的行为，与 `?section_id=`（单数）混淆了。
- **修复**：随搜索抽屉重构（2026-10-10 刘工）一并修正——`section_id=predictive-search`（section **文件名**），响应 `text()` → DOMParser → 提取 `#shopify-section-predictive-search` 的 innerHTML 注入面板（官方示例与 Dawn 同款）。
- **预防**：**核实 API 时"请求参数"与"响应格式"都要核对原文**，只核对一半等于没核实。**涉及网络请求的功能，落地当天就要在开发店浏览器里实测一次成功路径**，不能全押在 T-3.1；theme check 只查语法，不查行为。

### BUG-029 · 搜索抽屉放进 display:none 容器，showModal 成功但永远不可见
- **日期**：2026-10-10 ｜ **状态**：Fixed
- **现象**：点击搜索图标，抽屉不出现，但页面竖向滚动条消失、内容向右抖动（scroll-lock + 背景 inert 都生效了——说明 `showModal()` 确实执行、`[open]` 已挂上）。
- **根因**：`<search-drawer>` 元素被插进了 `.main-nav__mobile` 容器内部，而该容器桌面端 `display: none`。**top layer 只提升绘制层级，救不了 `display: none` 祖先**——祖先不生成盒子，dialog 连同它一起不渲染。滚动条消失正是 `html:has(dialog[scroll-lock][open])` 命中的副作用，恰好成了定位线索。
- **修复**：`<search-drawer>` 移出 `.main-nav__mobile`，改为 `<nav>` 直接子元素（`sections/main-nav.liquid` L330）。
- **预防**：**dialog / 抽屉类组件的挂载点必须放在任何条件 `display:none` 容器之外**（与桌面/移动互斥容器平级）。审查抽屉类改动时，先核对祖先链上有没有 `display:none`——`showModal()` 不报错不代表能看见。

### BUG-030 · search-drawer 漏 bind：close 按钮与遮罩点击全部失效
- **日期**：2026-10-10 ｜ **状态**：Fixed
- **现象**：抽屉能打开，但点右上角 close 无反应（遮罩点击同样失效；Esc 关闭后焦点也不回弹）。
- **根因**：`assets/search-drawer.js` 从 nav-drawer.js 复制结构时**漏抄了构造器里的 `this._onClose = this._onClose.bind(this)`**。`_onClose` 是原型方法，作为 listener 被调用时 `this` 是被监听元素（dialog / close 按钮）而非组件实例，方法内的 `this._dialog` 变成 `undefined`，守卫 `if (!this._dialog?.open) return` 直接短路——事件"看似绑了，永远不执行"。
- **修复**：构造器补 bind（`_onClose` + `_onDialogClick`）。
- **预防**：**从既有组件复制骨架时，constructor 里的 bind 行是"不可见依赖"，逐行核对**。更稳的写法是类字段箭头函数（`_onClose = () => {...}`，predictive-search.js 风格），从语言层面消除 this 漂移——新增组件优先用它。另外 `node --check` 只查语法不查 this 指向，这类 bug 只能靠浏览器实测。

### BUG-031 · 抽屉锁滚动导致页面抖动（滚动条退出布局）
- **日期**：2026-10-10 ｜ **状态**：Fixed
- **现象**：搜索/导航抽屉打开瞬间，页面内容向右抖一下——`html` 被 `overflow: hidden` 锁滚动后，滚动条从布局中消失，内容区凭空变宽一个滚动条宽度，居中/右对齐内容整体挪位。动画上线后滚动条消失仍在，抖动反而更显眼。
- **根因**：critical.css 的锁滚动规则（Skeleton 时期遗留 + 各抽屉沿用）只做了 `overflow: hidden`，没补偿滚动条占位。仅经典滚动条系统可见（overlay 滚动条无布局宽度，macOS 默认无感）。
- **修复**：锁滚动规则内加 `scrollbar-gutter: stable`——锁定期间保留滚动条占位，解锁时占位与滚动条同步还原，双向无位移。**已核实**（gomakethings / polypane / veronezi 三处独立来源）：stable 在 `overflow: hidden` 期间依然保留占位，正是官方推荐的 modal 防跳方案。放在锁滚动规则内部而非 `html` 全局，避免短页面常驻一条空槽。
- **预防**：**凡是"隐藏页面滚动条"的实现（overflow hidden / body lock），都要同时处理滚动条占位补偿**——`scrollbar-gutter: stable`（CSS）或测宽补 padding（JS 兜底）。这是模态类组件的标准配套项，写进抽屉/dialog 的实现检查点。

### BUG-032 · sticky 挂错元素：导航吸顶从未生效 + 限宽层框死通栏
- **日期**：2026-10-10 ｜ **状态**：Fixed
- **现象**：① 页头 sticky 不生效，滚动时整行跟着走；② hero 有 `full-width` 类却通不了栏。两者同源。
- **根因**：两层问题叠加。
  1. **sticky 挂在 `.main-nav` 上，而它的父级是 Shopify 自动生成的 `.shopify-section` 包裹 div——高度只有导航行自身**。sticky 只能在父盒内"黏"，没有滚动余量，等于没黏。
  2. `.main-content` 在 critical.css 里加了 `max-inline-size: var(--page-width)` + `padding-inline`，把 main 内所有 section（含 hero）框在内容盒里——`full-width` 最多通到 main 的边；且 main 的 padding 与区块网格的 `minmax(page-margin, 1fr)` 边距列**叠加成双倍页边距**。
- **修复**：① schema 加 `"class": "main-nav-section"`，sticky 挪到包裹层（body 的 flex 子项、纵贯整页，才有黏的空间）；`.main-nav` 根加 `full-width` 通栏，内容行改为 `max-inline-size: var(--content-width)` 居中（--content-width 从包裹层继承），与下方 section 文案同一列线。② `.main-content` 的限宽/内边距整体移除（critical.css 留注释说明），页宽与边距统一由区块网格管理——hero 根节点本就带 `full-width`、文案本就在内容网格第 2 列，无需改动。
- **预防**：**sticky 的父盒必须有比 sticky 元素更高的滚动空间**——Shopify 主题里吸顶一律挂在 section 包裹层（schema `"class"` + 包裹层选择器），不挂在 section 根元素上。**`.full-width` 机制要求其所有祖先不限宽**——main/容器层只做 landmark，不做限宽；限宽是区块网格（第 2 列）的职责。

### BUG-033 · nav-drawer 漏 bind _onOpen：移动端汉堡点击静默无反应
- **日期**：2026-10-13 ｜ **状态**：Fixed
- **现象**：移动端（<990px）点击顶部导航 menu 图标，抽屉不出现，控制台也无任何报错——点击"看似绑了，永远不执行"。
- **根因**：`assets/nav-drawer.js` 构造器只 bind 了 `_onClose`，**`_onOpen` 与 `_onDialogClick` 作为原型方法直接传给 `addEventListener`，调用时 `this` 是被监听元素（burger 按钮 / dialog）而非组件实例**，方法内 `this._dialog` 为 `undefined`，守卫 `if (!this._dialog || this._dialog.open) return` 静默短路。讽刺的是 BUG-030（search-drawer 复制本文件时漏 bind `_onClose`/`_onDialogClick`）修掉的正是"复制品的病"，**原件的 `_onOpen` 从第一天起就没 bind 过**——search-drawer 因 opener 用箭头函数包了一层躲过，nav-drawer 直接传方法引用，当场暴露。同时 `_onDialogClick` 未 bind 还是潜伏缺陷：抽屉一旦能开，点遮罩也关不掉。
- **修复**：构造器补 bind 三连（`_onOpen` / `_onClose` / `_onDialogClick`）。
- **预防**：**bind 这类"复制时漏一行"的错在两个文件间已经双向各犯一次，靠人工核对不再可靠**——两个抽屉组件应整体迁移到类字段箭头函数写法（`_onOpen = () => {...}`，predictive-search.js 风格），从语言层面消灭 this 漂移；下次改到这两个文件时顺手完成。`node --check` 只查语法不查 this 指向，抽屉类组件的"点开 / 点关 / 点遮罩 / Esc"四个动作必须在开发店浏览器实测一轮才算验收。

### BUG-035 · 导入 CSV 第三次变成 XLSX（磁盘副本损坏）
- **日期**：2026-10-13 ｜ **状态**：Fixed
- **现象**：排查集合页外部依赖时发现 `dev-docs/mower-import/mower-products-import.csv` 文件头为 `PK` zip 魔数——又是 XLSX 伪装（BUG-003 首次、BUG-012 第二次，本次三犯）。直接拿去后台导入会再次报格式错误。
- **根因**：9/30 曾重生成过纯文本，但磁盘上现存的这份副本又被表格软件以 XLSX 格式覆盖保存（具体操作人/时间不可考）。**同一坑三犯说明"提醒别用表格软件存"无效，问题在"磁盘上常驻一份导入副本"本身**——副本必然被打开、被另存、被污染。
- **修复**：`python3 build_mower_csv.py` 重新生成（脚本自校验 0 错误 / 0 警告；22 行 = 11 主行 + 11 第二图行，vendor 全 Northbark，22 个图片 URL 全回填）。
- **预防**：**导入副本改为用时即弃**——`mower-products-import.csv` 不再作为常驻文件维护，每次导入前从 `build_mower_csv.py` 现生成、导入完即删；单一事实源只有脚本。发现 CSV 再损时第一反应是重跑脚本，不是修文件。

### BUG-036 · check-locale-keys.py 因双注释头解析失败，locale 校验长期静默失效
- **日期**：2026-10-16 ｜ **状态**：Fixed
- **现象**：`python3 tools/check-locale-keys.py` 启动即崩，`json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)`，回溯指向 `load(LOCALES / "en.default.schema.json")`。脚本从未输出过"缺失清单"或"全部命中"——AGENTS §2 要求的"新增 locale 键后跑一次"实际上没有可用工具。
- **根因**：`COMMENT_HEAD = re.compile(r"^\s*/\*.*?\*/\s*", re.S)` 带 `^` 但**没有 `re.M`**，一次只能吃掉开头那一个注释头；而 `locales/en.default.schema.json` 磁盘上存在**连续两个** `/* ... */` 注释头（Shopify dev 反复同步叠加，非人工写入）。`load()` 里单次 `COMMENT_HEAD.sub("", raw)` 留下第二个，`json.loads` 在首字符即失败。**已在改动前的 HEAD 版本上复现同一错误，属既有缺陷，非本次引入。**
- **修复**：抽出 `strip_comment_heads()`，循环 `sub(count=1)` 直到内容不再变化，再交给 `json.loads`。
- **预防**：① **"脚本存在"不等于"脚本在跑"**——AGENTS §2 列的验收命令，每次用到都必须真的执行并核对退出码，不能凭"清单里有"就当作已校验；② 注释头剥离一律写成循环，Shopify dev 叠加注释头不是一次性事件；③ 待办：脚本的失败信息要能区分"文件解析失败"与"键缺失"，否则前者会被误读成后者（本次未改输出格式）。

### BUG-037 · check-locale-keys.py 不扫 config/，全局设置的翻译键全在盲区
- **日期**：2026-10-16 ｜ **状态**：Fixed
- **现象**：`config/settings_schema.json` 是 schema 命名空间翻译键最密集的文件（Colors / Layout / Header 等分组标题与所有 label / info 都在此），但脚本 `TARGET_DIRS = ["sections", "snippets", "blocks", "layout"]` 只 glob 这四个目录的 `*.liquid`，config 下的 `t:` 键一个都查不到——新增全局设置后脚本报"全部命中"，其实什么都没验。
- **根因**：脚本按"section 是 schema 键的主要来源"写死了扫描目录，忽略了 `settings_schema.json` 同样是 `en.default.schema.json` 的消费者。本次给 Colors 组加骨架配色设置时才发现：新键的校验结果根本不可能来自脚本。
- **修复**：新增 `collect_config_schema_keys()`，把 `config/settings_schema.json` 全文的 `"t:..."` 纳入 schema 命名空间校验，缺失时来源标注为 `config/settings_schema.json`。
- **预防**：**按"命名空间的消费者"而不是"文件类型"来定扫描范围**——新增任何消费 `t:` 键的文件时必须同步把它加进脚本目录清单。theme check 的 `ValidSchemaTranslations` 是这条的最终兜底。**[2026-10-16 更正]** 本条目原先写的"沙箱里跑不了 theme check"**不成立**：`shopify theme check` 是纯本地静态检查，不联网、不需登录，随时可跑（实测 53 文件 0 offenses）。"待刘工代跑 theme check"这类待办今后由 Agent 自行清理。

### BUG-038 · 浅色 preset 缺骨架三色，从深色切回时会残留深色骨架
- **日期**：2026-10-16 ｜ **状态**：Fixed
- **现象**：`config/settings_data.json` 的 `Coppice`（浅色）preset 只写了 10 个 theme setting，缺 `skeleton_background_color` / `skeleton_foreground_color` / `skeleton_accent_color`；而 `Coppice Noir` 覆盖全部 13 个。后果：在编辑器里从 Noir 切回 Coppice 后，页头页脚仍是黑的（深色值残留）。
- **根因**：官方对 preset 切换的定义是**"把 preset 的值更新进 `current`"**（settings_data.json 文档：*Selecting a theme preset updates the current object to use the associated theme preset values*），**不是用 preset 整体替换 current**。因此 preset 里缺席的键不会被清除，而是沿用 `current` 中的旧值——Noir 写进去的 `#0F1012` 就这样活到了浅色预设里。
- **修复**：给 `Coppice` preset 显式写入三个空字符串（官方语义：color 清空后存 `""`，Liquid 侧返回 blank，被 `snippets/css-variables.liquid` 的 `| default:` 回落成全局色）。修完两个 preset 的键集合一致（各 13 个），双向切换都干净。
- **预防**：**一个主题内的所有 preset 必须覆盖完全相同的 setting id 集合**——preset 之间的"键差集"就是"切换残留"的入口。新增 `tools/use-preset.py`，其 `--list` 会对覆盖不全的 preset 打 `[!] 仅覆盖 N/M 个键` 标记；改 preset 后跑一次即可暴露。**判据不是我猜的，是官方原文**：改 preset 相关逻辑前先回读 settings-data-json 文档那一节。

### BUG-039 · 局部更新后缓存的表单引用脱离 DOM，第二次变更筛选静默失效
- **日期**：2026-10-16 ｜ **状态**：Fixed（代码审查发现，浏览器表现待实测确认——requestSubmit 对 detached form 是抛 InvalidStateError 还是静默无效，未验证，不影响结论：两条都不是"正常提交"）
- **现象**：`faceted-filters.js` 的 `_onChange` 调用 `connectedCallback` 时缓存的 `this._form.requestSubmit()`；而 `_load` 用 `replaceChildren` 替换整个 `<collection-facets>` 容器。首次筛选/排序后，缓存的 form 引用指向已脱离 DOM 的旧节点——**第二次变更筛选时请求不会发出**，页面像"卡死"（`_onSubmit` 路径因每次从 `event.target` 现场取 form 而幸免，但 JS 就绪后 Apply 按钮是隐藏的，change 路径是唯一入口）。
- **根因**：把"一次性查询"的结果存成实例字段，但容器内容会被整段替换——**缓存的生命周期与 DOM 不一致**。本次把排序 select 移出表单（改用 form 属性关联）重构 `_onChange` 时才暴露。
- **修复**：`_onChange` 现场重查（`event.target.closest('[data-facets-form]') || this.querySelector('[data-facets-form]')`）；`connectedCallback` 不再缓存 `_form` 字段。
- **预防**：**委托监听的组件里，实例字段缓存的 DOM 引用不能跨 `replaceChildren` / `innerHTML` 存活**——要么每次现场查询，要么在替换逻辑末尾统一刷新引用。审查带局部更新的组件时，先列出所有实例字段里的 DOM 引用，逐个问一句"容器被替换后它还活着吗"。

### BUG-040 · `_buildUrl` 调用了不存在的 `url.append()`，左侧筛选从未提交成功过
- **日期**：2026-10-16 ｜ **状态**：Fixed（刘工实测报错 `Uncaught TypeError: url.append is not a function` 定位）
- **现象**：集合页勾选筛选后商品不刷新，控制台报 `TypeError: url.append is not a function`（`_buildUrl` 第 100 行）。
- **根因**：`_buildUrl` 写的是 `url.append(key, value)`——`URL` 对象没有 `append` 方法，参数必须挂 `url.searchParams`。**HEAD 版本即如此（`git show HEAD` 核实），自 T-2.2 文件创建起筛选提交路径从未走通过**；此前局部更新只有"点击已选标签"（`_onClick` 直接传 `link.href`，不经过 `_buildUrl`）一条路是活的。
- **修复**：`url.append` → `url.searchParams.append`（保留 `value !== ''` 跳过空价格输入）。
- **预防**：**URL 操作只能走 `searchParams`**——`URL` 实例上不存在裸 `append/set/delete`，这类错误 `node --check` 查不出（是运行时 TypeError 不是语法错）。新写 URL 拼接时先想一遍对象 API，或直接复制 `_onChange` 里已验证的写法。
- **关联**：本 bug 是 BUG-039 真正的"第一现场"——BUG-039（缓存表单失效）只有先经标签点击成功局部更新后才触达；修复 040 后两条路径都活了，039 的修复仍有必要。

### BUG-041 · 移动抽屉裸移 aside 进 dialog，控件脱离 form：抽屉内筛选/Apply/关闭按钮全部失效
- **日期**：2026-10-16 ｜ **状态**：Fixed（代码审查发现，未实测）
- **现象**：打开移动端筛选抽屉后：勾选筛选无反应；Apply 点击无反应；**关闭按钮点击无反应（只有 Esc 能关）**。
- **根因**：三重叠加，根子是同一个——`<dialog>` 挂在 `<collection-facets>` **兄弟位置**，`_movePanelIntoDialog` 只把裸 `<aside>` 移进去：① aside 内控件的最近 form 祖先消失 → **form 归属为 null** → `FormData(form)` 不含它们、Apply（type=submit）没有归属表单可提交；② change/submit 事件不再冒泡到 `<collection-facets>` → `_onChange`/`_onSubmit` 委托监听收不到；③ 关闭按钮 `[data-facets-close]` 的点击同样收不到。
- **修复**：改为**筛选 form 整体移入 dialog**（`_moveFormIntoDialog`，控件随 DOM 子树保留 form 归属）；同一组委托监听同时挂到 dialog 上（submit/change/click/close 五个）；局部更新时清掉 dialog 里被换下的旧 form 再移入新 form；关闭时 form 归位为 `data-facets-layout` 的第一个 grid item。顺带补上点遮罩关闭（`event.target === dialog`，对齐 nav-drawer）。
- **预防**：**物理移动 DOM 的组件，移动前先问"控件的身份绑定（form 归属 / label 关联 / aria 引用）是否跟着子树走"**——`<form>` 整体移动身份不丢，散件移动必丢。dialog 挂载点若在本元素之外，本元素的委托监听对 dialog 内容全部失效，需把监听同步挂到 dialog。

### BUG-042 · 移动端筛选面板留在文档流内，产品列表被顶到最下方
- **日期**：2026-10-16 ｜ **状态**：Fixed（刘工实测反馈定位）
- **现象**：视口 <990px 时整个筛选面板渲染在产品列表上方，产品列表被推到很靠下的位置；与设计（pages-ui §4 移动端 = `[筛选☰] [排序▾]` + 抽屉筛选）不符。
- **根因**：`.facets__aside` 从未有过任何"流内隐藏"规则——设计意图是 JS 就绪后面板只存在于抽屉里，但那条 CSS 一直没写。HEAD 版本即缺失，非本次引入。
- **修复**：`@media (max-width: 989.98px) { .collection__facets[data-facets-ready] .facets__form { display: none; } }`——隐藏 form 整体（而非 aside），顺带消掉空 form 在 grid 里占出的整行 + gap。无 JS 时 `data-facets-ready` 缺席，面板照常流内展示（降级路径不变）。
- **预防**：**"隐藏组件（抽屉/面板）首次打开才可见"必须同时落两条：DOM 移动逻辑 + 流内隐藏 CSS**，二者缺一就是"功能在、观感崩"。审查抽屉类 UI 时对照 pages-ui 的移动端布局 ASCII 图逐块核对。

### BUG-043 · 点已选标签（删除胶囊）没有骨架 loading，实际是整页跳转
- **日期**：2026-10-16 ｜ **状态**：Fixed（刘工实测反馈定位）
- **现象**：点击工具条里的已选筛选胶囊（含 Clear all）删除筛选条件时，没有骨架 loading，页面整体闪白——实际走了整页导航而非 Section Rendering 局部更新。
- **根因**：`_onClick` 的链接拦截条件是 `link.closest('[data-facets-form]')`，而已选标签渲染在**工具条**（`active-facets` 由 section 第 188 行渲染在 `.collection__toolbar` 内），不在 form 子树里——拦截条件永远不命中，`<a>` 原生跳转。"左列两张卡"改版把标签留在了 form 外，此分支自此变成死条件。
- **修复**：拦截条件扩为 `closest('[data-facets-active]') || closest('[data-facets-form]')`——标签与 Clear all（同在 `data-facets-active` 容器）走 `_load` 局部更新（含骨架）；分页链接**故意不拦**：`_load` 用 `history.replaceState` 不留历史，分页的前进/后退语义需要整页导航。
- **预防**：**委托拦截的"范围条件"要与点击目标的实际挂载位置对账**——凡"X 应该局部更新"的需求，先在 DOM 里确认 X 在不在拦截选择器的子树内（grep 渲染行号即可），再谈事件逻辑。改版挪过挂载位置的功能（标签从 form 挪到工具条），挪完必须回归一遍相关交互路径。

### BUG-044 · 编辑器画布静默丢弃页头组：大体积 + 纯 ASCII 的 section 渲染输出（平台侧）
- **日期**：2026-10-19 ｜ **状态**：Fixed（方案①防御修法已验证，2026-10-19 刘工确认页头正常；平台 bug 待报 Shopify）
- **现象**：店面与预览正常，**仅主题编辑器中间画布**不渲染 header-group：组内 section 包裹层与 `<!-- END sections: header-group -->` 全部消失，但组内 5 个 `<script>` 仍在 ⇒ 服务端渲染完整，是**编辑器客户端摘除节点**。无 Console 报错、无失败 Network 请求、无「HTML error found」横幅（静默失败）。20+ 个对照主题（y/r/v 系列，2026-10-18~19）单变量二分后，现象层判据钉死：
  - main-nav 渲染输出的 **HTML 源码字节含任意非 ASCII 字节（≥0x80）→ 编辑器正常**（`欢迎`、`é`、`欢` 均活）；
  - **纯 ASCII → 整组静默丢弃**（无标记、`hello`、`helloo`、`Y21/Y22`、HTML 实体 `&#27426;&#36808;` 均死）；
  - 实体死 ⇒ 判据在**实体解码之前的字节层**；`é`（2B）就活 ⇒ 与 CJK 专属、字节长度阈值无关（v23 已证 6 个 ASCII 字节不活而 6 字节的"欢迎"活）。
- **根因**：Shopify 新编辑器（画布 iframe 挂 `online-store-web.shopifyapps.com`，社区称 "Dux"）对 section HTML 的处理存在**无文档的 ASCII 敏感分岔**。注意"纯 ASCII 即死"**不成立**：页脚组（~1KB）、公告条（~3KB）、首页主内容各 section（≤6KB）全是纯 ASCII 却在编辑器里正常；唯一死的是渲染标记 ≈28KB（实际 ~35KB）的 main-nav——页面上其他 section 的 8~10 倍。**统一解释（理论，机制不可见、未证实）**：编辑器对大体积 section 载荷走某条与内容编码相关的处理路径（charset 探测/转码类），该路径在纯 ASCII 输入上静默失败；输出含非 ASCII 字节时被判定为 UTF-8 走正常路径；小载荷根本不进该路径。该理论与全部实验数据吻合，且自动消解 y11 悬案（三个平凡 div 是小载荷，文字是什么都该活）。官方文档（shopify.dev sections 集成、JSON templates、编辑器事件）、开发者社区、changelog 均无此限制的记载；全网无同类报告——推测因绝大多数主题输出天然含非 ASCII 字节（©、→、…、货币符号、非英语内容），纯英文纯 ASCII 店铺才会踩中。
- **修复**：**方案①（已落码 2026-10-19，经二次修正）**——初版把两处 View All 箭头实体 `&rarr;` 换成字面量 `→`（mega 面板深处）**无效**（刘工实测仍空），因判据要求非 ASCII 落在 **`<nav>` 首子节点文本**而非任意嵌套位置。终版：在 `<nav>` 首子节点放 `<span class="main-nav__bug044-guard" aria-hidden="true">→</span>`（字面量 U+2192），配 `{% stylesheet %}` 内的 `.main-nav__bug044-guard` visually-hidden 裁剪样式（`clip`/`clip-path`，非 `display:none`、非零高度，标准 1px sr-only）。视觉与无障碍树双重隐藏，零可见痕迹。同时删除调试绿条、`sections/header-group.json` 恢复完整态（announcement-bar + utility-bar + main-nav）。**关键判据**（三次成对复现 + 二次修正钉死）：① 非 ASCII 必须在 `<nav>` 首子节点文本（深处、HTML 实体均无效）；② 可见性非变量（y22 死因是 ASCII 文本非 `block-size:0`）；③ 与 CJK 专属、字节长度阈值无关。theme check 移开 dev-docs 后 69 files 0 offense。
- **预防**：**"仅编辑器画布坏 + 店面正常 + 零报错零横幅"的静默失败，先查本条与「样式块只能在 section 顶层」（BUG 索引）这两类平台级判据，再怀疑自己代码结构**。编辑器二分实验时：① 标志物必须放被测元素内部、判生死以其为准（K 组教训）；② 单变量推进，每步回读远端确认推送成功；③ 先删旧对照主题再建新的（店上限 20 个）。

### BUG-045 · 沉浸页头把横幅顶到公告条底下，公告条整条被盖住
- **日期**：2026-10-20 ｜ **状态**：Fixed（无头 Chrome 复现页截图实测修复前后）
- **现象**：`settings.immersive_header` 开启时（集合页），banner 图片盖住顶部公告条：公告条的文字完全看不见（截图里公告条区域显示的是横幅图），而导航行正常。
- **根因**：**双重问题，主因是偏移量，次因才是层叠**。① `site-header.js` 的 `measure()` 把「公告条 + 导航行」的合计高度写进 `--site-header-h`，`critical.css` 用 `margin-block-start: -var(--site-header-h)` 上移 `.main-content` ⇒ 横幅顶边被顶到**页面最顶端**，连公告条一起盖。② `.announcement-bar` 与 `.collection__banner` 同为 `position: relative`、`z-index: auto`，按 DOM 顺序绘制（横幅在后）⇒ 即使公告条透明叠图，文字也被横幅压住。桌面导航行之所以"幸免"，是因为 `.main-nav-section` 在 ≥990px 是 `position: sticky; z-index: 20`。③ 沉浸态本来还把 `.announcement-bar` 设成 `background-color: transparent`，等于主动放弃了公告条的实底。
- **修复**：把沉浸范围收窄为**只沉浸导航行**：① 偏移量改为只减导航行高（新变量 `--site-nav-h`），横幅顶边落在公告条下沿；② 删除公告条的透明覆盖，公告条全程品牌实底 + 反白字；③ 偏移只在 ≥990px 生效（移动端导航不吸顶也不透明，横幅钻过去只会被它盖住），JS 非桌面时清掉内联 margin；④ solid 阈值按刘工定的规则改为「**滚过页头高度（公告条 + 导航行）即上实底**」——透明底一旦离开横幅、压到白底内容上，导航文字就看不见了；同时保底取 `min(页头高, 横幅底边滚过导航行底边)`，横幅若比页头还矮也不会留出"透明压白底"的空档。CSS 层不加任何 z-index——导航行靠既有的 sticky `z-index:20` 压在横幅之上，不引入新的层叠博弈。
- **预防**：**"沉浸/透明页头"这类效果的偏移量必须与"被透明化的元素"逐个对账**：哪个页头部件被设成透明，才允许内容钻到它背后；不透明的部件（公告条、utility 栏）一律排除在偏移之外。改 `measure()` 时先在页面上把每个页头根节点的高度与"是否透明"列成表，再决定减哪几段。**层叠问题不要先动 z-index**——先确认绘制顺序与偏移量，z-index 只解决"叠了但不该叠"的场景，解决不了"根本不该叠"。

### BUG-046 · solid 状态类挂在 `<body>` 上，CSS 却写成后代选择器：实底自 2026-10-18 起从未生效
- **日期**：2026-10-20 ｜ **状态**：Fixed（无头 Chrome 双页对照实测：同一份 body 类，只改选择器写法）
- **现象**：沉浸页头滚动后导航行始终不出现白底（实底不生效），白字一直压在滚动经过的产品区上、完全读不出来。刘工反馈"实底没有生效"。
- **根因**：`site-header.js` 把 `site-header--solid` 切在 `<body>` 上，而 `<body>` 同时已有 `template-collection` / `immersive-header`；`critical.css` 的恢复态全写成
  `.js .template-collection.immersive-header .site-header--solid .main-nav__desktop`——**`immersive-header` 与 `site-header--solid` 之间有空格 = 后代关系**，但两者是同一元素上的复合类，所以这组规则**永远不可能命中**。2026-10-18 把状态类从包裹元素挪到 `<body>` 时，JS 注释里那句"CSS 选择器不变，仍是后代选择器"正是错误前提（旧结构里包裹元素确实是子元素）。因此实底从 10-18 起静默失效，期间所有"滚动后页头变白"的表现都不存在。
- **修复**：恢复态选择器全部改为复合类 `.template-collection.immersive-header.site-header--solid ...`（5 组，含 nav 根部/桌面行/品牌字/链接字/logo 反白）；同时修正 JS 注释里的错误前提。
- **预防**：**状态类的"挂载元素"变了，必须逐条回读引用它的每个选择器，核对组合子（空格=后代、无空格=复合）与实际 DOM 层级**。可执行做法：改完挂载点后 `grep -n "<类名>" assets/ critical.css`，对每条选择器在心里数一次"这个类在目标元素上，还是在它的祖先上"；再用一个最小对照页（同一份 body 类，两条选择器各写一遍）截图验一次，比读代码可靠。**CSS 静默失效不会报错**，theme check 也查不出——只能靠这类对照实验。

### BUG-047 · `{% if pages[handle] %}` 对不存在的页面也返回真，四个对比入口全渲染成 404 链接
- **日期**：2026-10-22 ｜ **状态**：Fixed（真实店铺推送后实测）
- **现象**：对比功能首次推送到开发店，页头对比图标按设计「无对比页就该隐藏」却出现了；`data-groups` 列出全部 4 个分组、`data-url-*` 指向四个 URL，而 `/pages/chainsaw-compare` 等**实际全是 404**。若上线，顾客点入口就撞 404 —— 正是 SDD §6.2.5 验收条要防的那个问题。
- **根因**：`pages['不存在的handle']` 返回的是**空 drop（truthy）**，`{% if pages[handle] %}` 判真。而 `| default` 过滤器对 empty 同样生效，所以 A4 探针里 `{{ probe | default: 'nil' }}` 输出 `nil` 让人误以为它是 falsy——**两条证据看着一致，其实是两个不同语义**（truthiness vs default 过滤的替换规则）。设计阶段只验证了「访问成本」，从没验证过「不存在的 handle 在 `if` 里是真是假」。
- **修复**：存在性判断统一改为 `{% if pages[handle].title != blank %}`（空 drop 的 title 为 blank）。全站只有一处探测入口：`snippets/compare-page-urls.liquid`。修复后同一页面实测 `compare-entry` 正确输出 `hidden`，入口消失。
- **预防**：**判「资源是否存在」一律用具体属性判空（`.title != blank` / `.handle != blank`），不用裸对象真值判断。** 可执行做法：新增任何「探测资源存在性」的代码后，必须在真实店铺用一个**确定不存在**的 handle 打印两个结果并对照——`{% if pages[h] %}` 与 `{{ pages[h] | default: 'nil' }}`——两者不一致就说明真值判断不可用。Liquid 的空对象不报错、不警告，theme check 也查不出。

### BUG-048 · 商家把集合 metafield 填成页面 handle（`chainsaw-compare`），对比页报「未链接集合」
- **日期**：2026-10-22 ｜ **状态**：Fixed（代码容错 + 文档重写）
- **现象**：商家按文档配完三步，`/pages/riding-mower-compare` 仍显示 `No product collection is linked to this comparison group yet.`；集合元字段实际填的是 `riding-mower-compare`，主题要比对的却是分组键 `riding-mower`。
- **根因**：**文档自己给了错误示范**。`docs/merchant-compare-setup.md` 第二步的表格列的是页面标题与 handle（`Riding Mower Compare` → `riding-mower-compare`），第三步却说"填和商品一样的分组键"。同一个概念在一篇文档里出现两种写法、且没有并排对照，商家照着上面那张表抄是最自然的动作。主题侧也只认精确相等，没有任何容错。
- **修复**：① 代码容错——`declared | strip | downcase | remove: '-compare'` 后再比对，填「分组键」或「页面 handle」都能识别；② 文档 3b 改成并排两列表（✅ `chainsaw` / ❌ `chainsaw-compare`）并写明填错的症状原文；③ 主题设置的 info 文案同步强调 "the GROUP KEY -- NOT chainsaw-compare"；④ 排错表补第三条原因。
- **预防**：**同一概念在一份文档里只允许出现一种"正确写法"，另一种必须显式标 ❌ 并排展示**。可执行做法：写完面向用户/商家的文档后，把文档里出现过的所有标识符（handle、key、slug）列一遍，逐个回答"这个字符串应该被复制到哪里"——只要有一个字符串会被复制到错误的位置，就补一列对照。另外：任何"用户在两个相近字符串之间二选一"的配置点，代码侧都应对两种写法都容错，而不是靠文档讲清楚。

### BUG-049 · hero 切换后顶部残留一条白色遮罩约 0.5s
- **日期**：2026-10-25 ｜ **状态**：Fixed
- **现象**：移动端 hero 触发切换后，画面顶部有一条半透明白色遮罩停留约 0.5s 才消失（残留时长 = 切换时长 600ms）。
- **根因**：`.hero-slideshow__fade` 是「底部（移动端）/左侧（桌面）渐隐遮罩」，它被**装进 `.hero-slideshow__bg` 里随背景一起卷动**。早期为了不让弧形边缘露在视口内，写的是 `top:-10%; height:120%`（移动端 `bottom:-10%; height:75%`）——元素底边比 slide 底边多出 10%。卷动 `translateY(-100%)` 之后，这多出来的 10% 正好停在视口最上沿，也就是那块白条。它压在当前屏（z-index 2）之上、下一屏之上，所以两屏都看得见。
- **修复**：① fade 尺寸收进 slide 内部（桌面 `top:0; height:100%`，移动端 `bottom:0`），卷出后完全离开视口；② 移动端切换改横向后，fade 还需要反向抵消父级位移（见 CSS 里 `hero-fade-hold-*` 四组 keyframes），否则它的左右边缘（同色硬边）会横扫出一条白幕。
- **预防**：**凡是"跟着父级一起做位移动画"的遮罩/渐变层，尺寸必须严格落在父级盒内**——元素一旦有 `top:-10% / height:120%` 这类越界，就要把「父级移动 100% 后它落在哪」算一遍。可执行做法：给会平移的层加越界偏移前，先在静态页里 `getBoundingClientRect()` 打印它相对 slide 的 top/bottom，要求 `bottom - slide.bottom == 0`。

### BUG-050 · 移动端产品图被顶出 slide 上沿，割草机手柄整段不可见
- **日期**：2026-10-25 ｜ **状态**：Fixed
- **现象**：移动端 hero 里 `hero-slideshow__product` 溢出 slide 顶部，产品图上沿（手柄、导向杆）被裁掉一段。
- **根因**：两层叠加。① 定位用 `top:30%` + `translate:-50% -50%`（中心对齐），图片高度一旦超过 60% 视口，上沿必然为负；② 只给了 `width:66%` 一个维度，图片高度完全由宽高比决定，商家传的图越"高"溢出越多。后来试图用 `max-height` 兜，同样无效——**父元素高度是 auto 时，子元素上的百分比 `max-height` 无法解析**，实测容器被算成 184px、图片仍是 313px。
- **修复**：移动端容器改成**明确高度** `height:44%` + `img { width:100%; height:100%; object-fit:contain; object-position:center bottom }`；`top` 表达顶边（`translate:-50% 0`）。同时新增 `product_image_mobile` 设置（block 级，`<source media="(max-width: 989px)">`），商家可给手机单独传一张方图。
- **预防**：**在 auto 高度的父元素上，不要用百分比 `max-height` 约束子图片**，改用父级定高 + 子级 `object-fit`。可执行做法：新增任何"图片按容器缩放"的布局后，用一张 **1:1 与一张 3:4** 的图各测一次 `getBoundingClientRect()`，确认 `img.bottom/right <= 容器.bottom/right`。

### BUG-051 · 耗材反挂 CSV 导入被拒：`Product options input is required when updating variants`
- **日期**：2026-10-28 ｜ **状态**：Fixed（生成脚本改列 + 一致性断言）
- **现象**：导入 `mower-products-import.pass2-consumables.csv` 报 `There was an error importing your CSV file... Product options input is required when updating variants`，**整份文件拒收**，19 台主机一条都没更新。
- **根因**：这份"更新型"CSV 只有 `URL handle` / `Title` / `Consumables` 三列，**没带 `Option1 name` / `Option1 value`**。我按"最少列最安全"的直觉设计，漏了官方那条硬规则：更新既有商品时，只要 CSV 触及变体相关数据，就必须同时给出 option 两列；否则平台按「删掉现有变体、新建一个默认变体」处理，验证阶段直接拒收。官方原文：*"if you update a column that is related to variants... you must also include the Option1 name and Option1 value columns. If you don't... a new default variant is created and existing variants are deleted."*
- **修复**：`write_pass2()` 输出 5 列 —— `Title` / `URL handle` / `Option1 name=Title` / `Option1 value=Default Title` / `Consumables`（值取自主文件，逐字一致）；并新增一致性断言：每行 Title 与 option 值必须与被更新商品的对应行完全相等，否则生成阶段就报错。
- **预防**：**任何"更新既有商品"的 CSV 必须带 `Option1 name` + `Option1 value`，且值等于首次导入时的原值**（改值同样会重建变体、换 variant ID，断掉下游引用）。可执行做法：生成任何更新型 CSV 后跑一条断言——`for row in pass2: assert row.Title == main[row.handle].Title and row.option == main[row.handle].option`；这条已写进 `build_mower_csv.py` 的 `write_pass2()`。
  另外把两条覆盖规则写进 `sources-and-notes.md` §5：**列不出现 = 保持原值；列出现但为空 = 覆盖成空**。所以更新型 CSV 只放「要改的列 + 匹配键 + option 列」，多带一列空列就是一次静默的数据清空。

### BUG-052 · 全屏查看器里竖版商品图溢出，被 dialog 的 `overflow:hidden` 裁掉一截
- **日期**：2026-10-28 ｜ **状态**：Fixed
- **现象**：灯箱里横版图正常；换成 600×1200 的竖版图后，图片按原始高度渲染，底部约 65px 被裁掉（画布 362×659，图片 362×724）。`max-block-size: 100%` 完全没起作用。
- **根因**：**BUG-050 的同类二犯**，换了层壳。这是百分比高度解析链：`.product-lightbox__canvas` 的高度来自「dialog 的 `minmax(0,1fr)` 行 → `block-size:100%`」，Chrome 在这条链上把高度当**不确定值**，子元素 `max-block-size:100%` 直接退化成 `none`；而 `max-inline-size:100%` 因为宽度确定仍然生效——于是宽度被收窄、高度按比例冲出去。中途试过把画布改成 `display:grid + place-items:center`，更糟：grid 的隐式行按内容定尺寸，两个百分比上限一起失效（1200 原样输出）。
- **修复**：画布加 `container-type: size`，图片改用 `max-inline-size: 100cqw` / `max-block-size: 100cqh`；百分比那两行保留在**前**作为老浏览器兜底（不支持容器查询时这两条声明被丢弃）。修复后 362×659 画布里是 325×650，图完整。
- **预防**：**"图片按容器缩放"的组件，验收必须同时用一张横版图和一张竖版图，并用 `getBoundingClientRect()` 断言 `img.bottom <= 容器.bottom`**——这次正是因为只看了横版图（横版不会触发高度约束）才漏到截图阶段。可执行判据：容器高度只要不是可解析的显式值（来自 `fr` 行、flex 拉伸、`aspect-ratio` 推导），就一律 `container-type: size` + cq 单位，**不要赌百分比**。

### BUG-053 · 自提列表没校验 `pick_up_enabled`，会把「不提供自提的门店」当成自提点列出来
- **日期**：2026-10-28 ｜ **状态**：Fixed
- **现象**：`sections/main-product.liquid` 的 `pickup` 块只按 `item.available` 过滤，把该变体有货的**全部** location 当自提门店渲染。
- **根因**：`variant.store_availabilities` 的语义是「这个变体在这个 location 有库存记录」，**不等于该 location 开通了 local pickup**。官方原文：*"A returned location isn't guaranteed to offer local pickup. Check `pick_up_enabled` before presenting a location as a pickup option."* 我把「有货」误当成「可自提」。
- **修复**：改用官方（也是 Dawn）的写法——过滤器前置：`assign pickup_items = current_variant.store_availabilities | where: 'pick_up_enabled', true`，循环里只判 `available`。`pickup_items.size > 0` 因此变成「有门店开通自提」，落到 else 分支显示 "Not available for pickup"。
- **预防**：凡是消费 `store_availabilities` 的地方，判据必须是 `available` + `pick_up_enabled` 两项；`physical_storefront` 只影响展示文案（如"仅线上仓"），不参与过滤。可执行做法：写一个断言脚本扫 `*.liquid` 里 `store_availabilities` 出现处，要求同段落内出现 `pick_up_enabled`。

### BUG-054 · 自提备货时长永远不显示：属性名写成 `pickup_time`（正确是 `pick_up_time`）
- **日期**：2026-10-28 ｜ **状态**：Fixed
- **现象**：`pickup` 块只渲染门店名，从不出现 "Ready in ..."。本地看是「数据没填」，容易一直以为是演示店没配 `pick_up_time`。
- **根因**：`store_availability` 的时间属性是 `pick_up_time`（pick 与 up 之间有下划线，与 `pick_up_enabled` 同一套命名），我按口语直觉写成了 `pickup_time`。Liquid 对不存在的属性返回 `blank` 而**不报错**，`if ... != blank` 于是恒假，整行被静默跳过。
- **修复**：`item.pickup_time` → `item.pick_up_time`（赋值、判断、`t:` 参数三处）。
- **预防**：**Liquid 对象属性名不许凭语感写**——`store_availability` 上是 `pick_up_enabled` / `pick_up_time`（下划线式），而同对象的 `physical_storefront` 又不是，靠"看起来对"必错。可执行做法：改完这类字段跑
  `grep -rnE "(item|variant|location|availability)\.(pickup|pick_up)_(time|enabled)" --include=*.liquid sections snippets blocks`
  —— 命中行里出现的必须全是 `pick_up_*`；出现 `pickup_*`（少下划线）即写错。本机 grep 是 BSD 版，`\b` 词边界不生效，别往这条里加。

### BUG-055 · 修好 BUG-054 后暴露：文案模板与平台返回值叠加成 "Ready in Usually ready in 24 hours"
- **日期**：2026-10-28 ｜ **状态**：Fixed
- **现象**：BUG-054 修复后 `pick_up_time` 第一次真正渲染。平台返回的**已是完整句子**（文档示例 `"Usually ready in 24 hours"`，商家可在后台改文案），而我们的 locale 模板是 `"Ready in {{ time }}"`，拼出来是病句。BUG-054 存在期间这行永远不渲染，等于把这个文案错误**藏了三个月**。
- **根因**：写模板时假设了 `pick_up_time` 是"一段时长"（如 "24 hours"），实际是"含前缀的整句"。假设没有对照文档核实——与 BUG-054 同源：属性语义凭语感。
- **修复**：直出平台原文 `{{ item.pick_up_time | escape }}`（与 Dawn 一致），删掉不再使用的 locale 键 `products.product.pickup_time`；`.pickup__time` 补样式（`flex-basis: 100%` 独占一行 + 0.8rem 弱化色），整句压在门店名下一行不显拥挤。
- **预防**：**消费平台文本字段前，先看官方文档里的示例值**，再决定要不要包模板；"字段返回什么形态"与"字段叫什么"一样要核实。可执行做法：给 `store_availability` 这类对象写字段消费代码时，把文档示例值贴进代码注释里（本次已在 BUG-054/055 注释中写明示例 `"Usually ready in 24 hours"`）。

### BUG-056 · 关闭过公告栏的访客，每次加载都会看到公告栏先亮一下再消失
- **日期**：2026-10-29 ｜ **状态**：Fixed
- **现象**：`announcement-bar` 渲染出来、过一会才消失。只在**点过关**的会话里出现；首次访问（未关闭）不会。
- **根因**：关闭态靠 `assets/announcement-bar.js`（`defer`）读 `sessionStorage` 后加 `data-announcement-closed`。文件头原注释断言"defer 执行在首屏绘制之前，肉眼不可见"——**这个前提是错的**。`defer` 只保证在 `DOMContentLoaded` 前执行；浏览器解析完 body 前半段（公告栏正是 header group 第一个 section，几乎最先完成解析）就可以先绘制一帧，defer 脚本还在下载队列里排队。于是关闭态用户看到一整条品牌色公告栏闪一下再消失（同时是一次 CLS）。样式侧也救不了：`.announcement-bar` 的 `display:flex` 在 `{% stylesheet %}` 聚合产物里，判定只能在 HTML 层做。
- **修复**：在 `<aside>` **之前**插一段内联同步脚本（同样由 `section.settings.dismissible` 门控）：读 `sessionStorage`，命中关闭态就把 Shopify 的 section 包裹层 `.shopify-section` 的**内联** `style.display` 设为 `none`。三个细节缺一不可——① 必须**内联**而非 `hidden` 属性：`critical.css` 的 `.shopify-section{display:grid}` 是作者样式，按层叠规则会盖掉 UA 的 `[hidden]{display:none}`；② 必须写在内联样式上，因为脚本执行时 `<aside>` 尚未解析，只有包裹层存在；③ key 由 Liquid 统一渲染进 `data-announcement-key`，`announcement-bar.js` 改从 `dataset` 读，key 不再有两处硬编码。附带：编辑器画布里 `window.Shopify.designMode` 直接跳过，避免商家自己关过一次后永远看不到该 section。无 JS 时整段不执行，公告栏照常显示。
- **预防**：**「defer 保证首屏绘制前执行」是本项目的高危错误假设，凡依赖它做防闪的都要复查**。可执行做法：① 任何"读存储决定首帧外观"的逻辑，判据是「这段代码是否在目标元素解析前同步执行」，不是「有没有加 defer」；`grep -rn "defer" sections snippets` 逐个确认里面有没有首帧视觉写入；② 用内联样式（`el.style.x`）而不是属性/类名做首帧隐藏，因为属性会输给作者样式；③ 验证方式不是看浏览器正常加载，而是 DevTools → Network 限速 Slow 3G + 硬刷新——首绘被拉长后这类闪跳才稳定复现。

### BUG-057 · 没有公告栏时页头阴影常驻：把「本来就在顶部」当成了「被吸住」
- **日期**：2026-10-29 ｜ **状态**：Fixed
- **现象**：桌面端页头吸顶阴影（`.main-nav-section.is-stuck`）只在**有公告栏**的页面上正常——页面停在顶部时无阴影、下滚才浮起。把公告栏删掉（或它的 blocks 为空、或访客点过关闭）之后，页面停在最顶部时阴影也一直挂着。
- **根因**：`nav-sticky.js` 的唯一判据是 `target.getBoundingClientRect().top <= 0.5`。页头组无包裹层（见 `critical.css` 打头那段说明），公告栏 section 与导航 section 是 `body` 的**直接兄弟**：有公告栏时导航文档位置在 y=44，顶部时 `rect.top=44`；没有公告栏时导航是**第一个流内子项**，文档位置 y=0，顶部时 `rect.top=0` → 判据恒真。`rect.top` 只能证明「贴在视口顶」，无法区分「本来就在顶部」与「从自然位置被吸住」——少了第二维信息。
- **修复**：判据改为两条同时成立——`rect.top <= 0.5`（贴顶）**且** `window.scrollY > 0.5`（确实滚动过）。语义自洽：吸附必然意味着滚动量越过了元素原始位置，滚都没滚过不可能被吸住。不引入缓存、不用 `offsetTop`/`offsetParent`，因此不受「公告栏被关闭」「字体加载后行高变化」这类会改变元素原始位置的事件影响，也就不存在缓存失效问题。`scrollY` 是纯读值不触发布局，每帧仍是「一次 rect + 一次 scrollY」，开销与修复前同级。
- **验证**（无头 Chrome，1280×800，四组对照）：`ann=1` 时新旧判据行为完全一致（@top 不吸、@44 吸）；`ann=0` 时旧判据 @top 与回到顶部后都判成吸住（复现），新判据 @top 不吸、滚 5px 才吸、回顶部取消（修复）。有公告栏的场景零回归。
- **预防**：**凡「判断元素是否处于吸附/固定状态」的判据，必须同时具备「视觉贴边」与「确实发生位移」两维信息**——`getBoundingClientRect().top` 单独一条永远不够，因为「原生就在那个位置」和「被钳制在那个位置」视觉上无从分辨。可执行做法：① `grep -rn "getBoundingClientRect().top *<=" assets/` 命中的每一处，同行或紧邻必须另有第二个条件（`scrollY`、位移量、或与父容器的相对位置），否则即潜在同类 bug；② 这类判据的测试矩阵**必须包含「目标元素是第一个流内子项（文档 y=0）」这一格**——前面有元素时判据自然通过，恰好把陷阱掩盖掉，本次就是只在有公告栏的布局下验过；③ 用无头 Chrome 断言：`window.scrollTo` 到 0 / 5 / 44 / 200 四个位置各读一次 `classList`，一次性覆盖全部边界。

### BUG-058 · 抽屉搜索从来没有过加载动画：`toggleAttribute('aria-busy', true)` 写入空值，`[aria-busy='true']` 永不命中

- **日期**：2026-10-29 ｜ **状态**：Fixed
- **现象**：搜索抽屉里输入关键词，`/search/suggest` 请求确实发出去了，但输入框下沿那条"加载扫描线"一次都没出现过；首查时结果面板还是空的，整块区域在响应回来之前**完全静止**——刘工反馈"触发了搜索，没有 loading 效果"。
- **根因**：`assets/predictive-search.js` 的 `_setBusy()` 写的是 `this.toggleAttribute('aria-busy', busy)`。`Element.toggleAttribute(name, force)` 在 force 为 true 时写入的是**空值属性**（`aria-busy=""`），而 CSS 侧写的是 `[aria-busy='true']`（精确匹配字符串 `true`），两者永不相等 ⇒ 那条 `::after` 扫描线自 2026-10-10 抽屉重构起就是死样式，安静失效了三周。无头 Chrome 实测：`el.toggleAttribute('aria-busy', true)` 之后 `getAttribute()` 返回 `""`、`el.matches("[aria-busy='true']")` 返回 **false**；换 `setAttribute('aria-busy','true')` 后返回 true。同项目的 `faceted-filters.js` 用的是 `setAttribute`，所以集合页的 `[aria-busy='true']` 反馈一直正常——**同一个属性、两种写法、只有一处失效**，从代码上看不出任何异常。
- **修复**：① `_setBusy()` 改为 `setAttribute('aria-busy','true')` / `removeAttribute('aria-busy')`；② 补一层结果区骨架屏（`_queueSkeleton` / `_hideSkeleton` + `snippets/predictive-search-entry.liquid` 的 `<template data-predictive-search-skeleton>` + `main-nav` 样式块）：只在「面板本来是空的」时出现（已有上一轮结果则保持不闪）、延迟 120ms 出现（避开"骨架一闪而过"）、`prefers-reduced-motion` 关停脉冲、配色从 `--color-foreground` 派生。行尺寸（112px 缩略图 + 两行文字 + 发丝线）与真实结果行同为 137px，换入结果不跳。
- **预防**：**用属性驱动样式的状态（`[data-x]` / `[aria-x='true']`）一律 `setAttribute(name, '值')`，不用 `toggleAttribute(name, true)`**——后者是"布尔属性"语法糖，只适合 `hidden` / `disabled` 这种按**存在与否**判定的属性，遇到按**值**匹配的选择器必然静默失效（不报错、不警告，theme check 也查不出）。可执行做法：`grep -rn "toggleAttribute(" assets/` 逐处确认目标选择器是 `[x]` 还是 `[x='true']`，后者必须改 `setAttribute`；同时，**新增任何加载/状态样式后必须发一次真实请求验收**（DevTools Network 限速 Slow 3G 更容易看见），只看代码里"选择器写对了"不算——这次的扫描线正是"代码看着对、从没在浏览器里见过它亮"。

### BUG-059 · 深色骨架下搜索抽屉里一片"看不见"：分组标签 / 放大镜 / 占位符 / 发丝线 / 划线价

- **日期**：2026-10-29 ｜ **状态**：Fixed
- **现象**：Coppice Noir（深色骨架）下打开搜索抽屉，输入框占位符、左侧放大镜图标、结果分组标签（PRODUCTS）、行分隔发丝线全部近乎不可见；给搜索列表补"划线原价"时发现同一处的划线价也读不出来。
- **根因**：两层，都是"颜色没从令牌派生"。① 这些位置直接写了 `rgb(0 0 0 / 45% | 40% | 25% | 7%)`——黑 alpha 压在 `#0F1012` 上等于没有。② 更隐蔽的一层：**即使改用 `--color-foreground-muted` 也救不了**。自定义属性值里的 `var()` 在「声明它的元素」（`:root`）上就解析完了，`--color-foreground-muted: color-mix(in srgb, var(--color-foreground) 70%, transparent)` 里烤死的是 `:root` 的前景色；`critical.css` 的页头组映射（`.shopify-section-group-header-group, .site-footer`）只翻了 background / foreground / brand，muted 不跟着变。无头 Chrome 实测：在 `--color-foreground:#E9E9EC` 的子树里，继承到的 muted 仍是 `color(srgb 0.2 0.2 0.2 / 0.7)`（=#333），而同一处内联写 `color-mix(... var(--color-foreground) 70% ...)` 算出 `0.9137`（=#E9E9EC）。
- **修复**：① 搜索组件内 7 处黑 alpha 全部改 `color-mix(in srgb, var(--color-foreground) N%, transparent)`（`main-nav` 3 处：放大镜 45% / 输入框底线 25% / 占位符 40%；`predictive-search` 4 处：分组标签 45% + 发丝线 7%×3）；② `critical.css` 页头组映射里补一行 `--color-foreground-muted` 重算（基于 skeleton-foreground），页头组/页脚内任何消费 muted 的组件从此跟着骨架色走。
- **预防**：**"改了 `--color-foreground` 就以为派生令牌跟着变"是错的**——凡在 `:root` 用 `var()` 组合出来的派生令牌，重映射父级令牌时必须在同一作用域内一并重算。可执行做法：① `grep -rn "color-foreground-muted:" --include=*.css --include=*.liquid`，每个重映射 `--color-foreground` 的选择器块里都必须同时出现 muted 的重算行；② 深色骨架下验收搜索抽屉，占位符 / 分组标签 / 发丝线 / 划线价四项都要看得见（无头 Chrome 读 computed color 就能验，不必肉眼）；③ 新写颜色一律 `color-mix(... var(--color-*) ...)`，改动文件里 `grep -rnE "rgb\(0 0 0|rgb\(255 255 255"` 必须为零（压商品图元素、投影除外）。

### BUG-060 · 折扣徽标 "Save 5%" 文字对比度 4.35:1，低于 WCAG AA 的 4.5:1

- **日期**：2026-10-29 ｜ **状态**：Fixed
- **现象**：产品详情页价格行的折扣胶囊是 `#d32f2f` 字压 `#ffebeb` 底。给搜索列表补同一套徽标时顺手算了一次对比度。
- **根因**：取色凭"红色 = 优惠"的直觉，没算对比度。徽标字号 0.8rem（12.8px），属 WCAG 的**正文小字**，要求 4.5:1，实测只有 **4.35:1**。同时它是硬编码 hex，与"配色唯一出口 `snippets/css-variables.liquid`"的纪律冲突——没有令牌，既不能跟随 preset，也无法在深色骨架下调整。
- **修复**：新增语义令牌 `--color-sale` / `--color-sale-surface`（固定值、不跟 preset，理由同 `--color-warning`），取值压到 `#c62828` / `#ffebeb` = **4.91:1**（肉眼几乎无色差）；PDP 与搜索列表共用同一组。Noir 下刻意保持同值：浅粉底 + 深红字在深底上对比更高，跟着翻成深红底反而会糊进背景。
- **预防**：**新增任何彩色小字（徽标 / 胶囊 / 标签 / 划线价）必须当场算对比度**，别等 Lighthouse 兜底。可执行做法：① 手头常备三行相对亮度脚本（本次用 python 算），落色前把 `fg/bg` 丢进去，结果 <4.5 就换色；② 语义色（降价 / 警告 / 成功）一律进 `css-variables.liquid` 成令牌，section 里只允许 `var(--color-*)`，因此 `grep -rnE "color: *#[0-9a-fA-F]{6}" sections` 的新增命中一律视为缺陷。

## 记录模板（追加新 bug 用）

```
### BUG-NNN · 一句话现象
- **日期**：YYYY-MM-DD ｜ **状态**：Open / Fixed
- **现象**：
- **根因**：
- **修复**：
- **预防**：（必须可执行：改流程 / 改文档 / 加检查，不写"注意"）
```
