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

> **2026-11-25 补注（见 BUG-097）**：上面「22 条 = 误报」的判定**已过期**。当时确有整包误报（连 5 处有 `render` 调用的 `image` 都被报），但当前 theme check 版本做的是**真引用分析**：27 个 snippet 里只报 `snippets/image.liquid` 一个，而它的调用方在重构为 `image_tag` 后已归零——它是**真孤儿**，已于当日删除。此后不许再按「整包误报」豁免 `OrphanedSnippet`。

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

### BUG-061 · 集合页横幅两张图可能整条丢失 `alt` 属性（不是 `alt=""`，是压根没有）

- **日期**：2026-10-29 ｜ **状态**：Fixed（做集合 metafield 亮点时排查发现）
- **现象**：源图没填 alt 时，输出的 `<img>` 连 `alt` 属性都没有。Lighthouse a11y 的 `image-alt` 是"有属性才算过"，缺失直接判失败——空了不算，无属性才算错。
- **根因**：`image_tag` 对空 alt 的处理与 HTML 直觉相反——**它会把 `alt` 属性整条省掉**，而不是输出 `alt=""`。`hero-slideshow.liquid` 早前踩过并加了 `capture → unless contains ' alt=' → replace` 的兜底，但 `collection.liquid` 是后来（2026-10-20）新写 banner 时没照抄；产品岛的 alt 当时靠 `banner_badge_title` 兜底侥幸有值。
- **修复**：① 底图改为 capture 后检测，缺 `alt=` 就 `replace: '<img ', '<img alt="" '`（底图是装饰图，空 alt 是正确语义）；② 产品岛 alt 的兜底源 `banner_badge_title` 随毛玻璃小卡一起下线，改用 `collection.title`（每页不同、语义正确，比空 alt 强，也不用商品标题那种同页重复的兜底）。
- **预防**：**任何 `image_tag` 输出点都必须走 capture+unless 模式**，不能凭"我传了 alt 参数"就放心——传空等于没传。可执行做法：① `grep -rn "image_tag" sections snippets` 逐处确认是否在 `<capture>` 内且带 `contains ' alt='` 检查，新写的一律照抄 `hero-slideshow.liquid` 的形态；② 验收时把图 alt 清空再抓一次 HTML，`grep -o '<img[^>]*>'` 必须每张都有 `alt=`；③ 这条也写进交付文档的 a11y 检查清单。

### BUG-062 · PC 端购物车抽屉里改数量完全不生效（点加减号无反应、输入框改完不提交）

- **日期**：2026-11-03 ｜ **状态**：Fixed
- **现象**：刘工反馈"pc 端购物车抽屉中修改产品数量不生效"。抽屉能正常打开、行项、小计、结算按钮都在，但点 `+`／`−` 数字不动，直接改输入框也不提交；DevTools Network 里**一条请求都没有**（连失败的都没有），Console 干净。购物车页（`/cart`）上同样的行项是正常的，所以第一眼像"抽屉里的事件没绑上"，实际是两层原因叠加。
- **根因**（两层，缺一都不成立）：
  1. **脚本根本没加载**。`assets/cart-items.js` 只由 `sections/cart-lines.liquid` 引入，而那个 section 只存在于购物车页模板。抽屉是 layout 里的全站静态 section，在商品页 / 集合页 / 首页上**没有 cart-items.js** ⇒ `<cart-items>` 是个未定义的自定义元素，是个纯静态空壳。
  2. **就算加载了也绑不上**。`connectedCallback` 的守卫写的是 `if (!this.querySelector('#cart-form')) return;`，而 `#cart-form` 是购物车页那份 `<form>` 的 id；抽屉里没有 `<form>`（按钮都是 `type="button"`、没有 form 语义）⇒ 抽屉里的实例在守卫处直接 return，监听器一个都没挂。
  3. **附带的结构缺陷**：抽屉里 `data-cart-section` 包在 `<cart-items>` **外面**，改数量回来的整块替换会把发出请求的元素自身一起换掉 → 监听器、按行去重表、`AbortController` 全丢。实测（无头 Chrome，把某一行响应延迟 300ms）：同一帧内改两行，A 先回来触发替换，B 的请求在 `disconnectedCallback` 里被 abort，**服务端没收到 B 的修改**，界面却停在旧值。
- **修复**：① `sections/cart-drawer.liquid` 引入 `cart-items.js`（抽屉永远在页面上，这才是全站加载点），`sections/cart-lines.liquid` 里那份删除，避免购物车页塞两次；② 守卫改成 `if (!this.dataset.cartChangeUrl) return;`——判据取"有没有改数量的接口"，不取页面专属的 id；③ 抽屉结构调换成 `<cart-items>` 在外、`[data-cart-section]` 在内，外壳 `display: contents` 不参与布局，替换只发生在内层，元素实例与监听器全程存活；④ 顺带修 `cart-drawer.js` 的 `_refresh`：**去掉 `Accept: application/json`**（商品页上带它 Shopify 会走 AJAX Product API 返回 `{"product":…}`，`payload[id]` 恒 undefined，与 SDD §6.2 的 compare-lookup 同一条坑），改 `cache: 'no-store'`；⑤ `cart:updated` 增加 `detail.source = 'items'`，抽屉据此区分"自己改的（内容已换过，别再刷）"与"外部加购 / 另一个标签页（抽屉开着就得再刷一次）"——`cart:added` 是点击即发的，`_show()` 里那次刷新常常跑在 `/cart/add.js` 之前，抽屉会打开却看不到刚加的商品；⑥ `_announceTotal` 补 `[data-cart-drawer-subtotal]` 兜底（原先只认 `.cart-summary__total-value`，抽屉里小计播报一直是哑的）；⑦ 抽屉标题补 `tabindex="-1"`，`_restoreFocus` 的落点兜底认 `.cart-drawer__title`。
- **预防**：**全站组件的脚本必须由全站 section 加载，且"能不能用"不能靠页面专属的 DOM 结构来判断**。可执行做法：① 新增/移动任何 `assets/*.js` 时 `grep -rn "<脚本名>" sections snippets layout` 确认引入点覆盖**所有**渲染该元素的页面（抽屉、页头这类 `{% section %}`/`{% render %}` 在 layout 的一律按全站算）；② 自定义元素的 `connectedCallback` 守卫只允许判 `data-*` 能力标记（接口地址、模板字符串），不允许判 `#id` / 某个页面才有的子元素——`#cart-form` 这一条就是反例；③ **可交互元素在哪出现，就要在那份 DOM 里点一次实测**：本次三处 JS 都在购物车页验过、唯独抽屉没跑过，坏了两周没人发现（无报错、无网络请求，肉眼只看得到"没反应"）；④ 抽屉/浮层类组件，可刷新区域必须是组件的**子节点**，绝不能让组件成为被替换的节点本身（`display: contents` 外壳是最省事的写法）。

### BUG-063 · 对比页在移动端滚不动：表格被 `margin-inline: auto` 撑成了 fit-content，超出部分又被 `overflow-x: clip` 裁掉

- **日期**：2026-11-06 ｜ **状态**：Fixed
- **现象**：手机上打开对比页，表格右侧的列（第 3、4 款商品）看不到，**左右滑也滑不动**。不是"滚到一半卡住"，是滚动容器根本没有可滚空间；页面既不报错，列切换导航（上一款/下一款）也不出现——因为它的显示条件是 `scrollWidth - clientWidth > 4`，而这个差值恒为 0。
- **根因**：`.compare-page` 同时写了 `max-inline-size: 1400px` + `margin-inline: auto`，而它是 `.shopify-section`（三列 grid：`margin | content | margin`）的 grid item。**grid item 上的 auto margin 会让 `justify-self: stretch` 失效**——auto margin 先把轨道里的剩余空间吸走，元素宽度退化成 `fit-content`，于是被表格的 `min-inline-size: 640px` 撑到 **680**（= 640 + 两侧 padding 40），早已超出 460 的内容列。宽度传下去：`.compare-table-wrap` 拿到 640，与表格自身宽度相同 ⇒ `clientWidth == scrollWidth` ⇒ `overflow-x: auto` 永不触发。多出来的 700 落在包裹层，被 `.compare-page-section` 的 `overflow-x: clip` 裁掉——所以是"滚不动"**加**"看不见"两个症状同源。
  无头 Chrome 实测（500 视口，未修复）：列宽 `20px 460px 20px`，`section.compare-page w=680 minW=0px`，`wrap clientW=640 scrollW=640`，`canScroll=false`，包裹层 `scrollW=700 > clientW=500` 且 `overflow-x: clip`。
- **为什么 2026-10-22 的修复没兜住**：当时给 `.compare-page` 加的 `min-inline-size: 0` 解决的是"automatic minimum size"这一层，但本例里宽度不是被 min-content 撑开的（实测 `minWidth` 计算值已是 `0px`，宽度照旧 680）——是 auto margin 让 stretch 退出，`fit-content` 接管。**`min-inline-size` 与 auto margin 是两条独立通路，前者管"最小能收到多小"，后者管"是否参与拉伸"。**
- **修复**：① `.compare-page` 显式 `inline-size: 100%`——宽度不再由内容决定，stretch 恢复，auto margin 退化为纯居中（宽屏 `max-inline-size` 生效时仍然居中）；② `.compare-page__notice` 同款写法一并补上（同为 grid item + auto margin，只是内容窄没暴露）；③ 改写两处注释，把"能滚是因为 main 的 min-inline-size"和"clip 只是兜底"这两句**错误归因**纠正过来——原注释会让下一个人继续往 min-inline-size 上打补丁。
  实测（修复后，375 布局 / 500 视口）：`section.compare-page 335 / 460`（= 列宽），`wrap 293 / 420`，`scrollW 640`，`scrollLeft 0→120 成功`，包裹层 `scrollW == clientW`（clip 不再裁任何东西）。宽屏 1600 下修复前后完全一致（item 1160 / wrap 1080），**桌面端零变化**。
- **预防**：**判断"滚动容器不滚"，只看 `overflow-x` 是错的，必须量三件套：容器 `clientWidth`、内容 `scrollWidth`、以及容器自身是不是被撑成了 fit-content。** 可执行做法：
  1. `grep -rn "margin-inline: \\s*auto" sections assets --include=*.liquid --include=*.css`，每一处都要确认该元素的父级是不是 `display: grid` / `flex`——是的话，检查元素是否还有明确的 `width`；没有就补 `inline-size: 100%`。（当前全站 7 处：compare-page 2 处已修；`.template-cart #MainContent` 与 `.collection__layout` 各自显式写了 `inline-size` / `width`，安全；`.main-nav__inner`、`.main-nav__mega-inner`、`.product-highlights` 属同模式但内容不会超出列宽，暂未暴露，**将来这几块若要加横向滚动，先按本条补 `inline-size: 100%`**，否则会以完全相同的症状复现。）
  2. 无头 Chrome 验收脚本固定断言：`wrap.clientWidth < table.offsetWidth` 且 `(wrap.scrollLeft = 120) > 0`。只断言 `scrollWidth > clientWidth` 不够——本 bug 里这条恰好是 false，而那些用了 `overflow: hidden` 的错误实现里它可能是 true。
  3. 新写 grid item 的居中，**优先用容器的 `justify-items` / 列布局实现**，不要用 `margin-inline: auto` + `max-inline-size`；非要居中就给死 `inline-size: 100%`。

### BUG-064 · 自定义页 / 文章页正文全部挤在一起：`* { margin: 0 }` reset 之后没有任何富文本排版层

- **日期**：2026-11-07 ｜ **状态**：Fixed
- **现象**：商家在后台「页面」里用富文本编辑器写的正文（配送说明、政策条款），**后台编辑器里排版正常，前台打开标题与段落贴在一起、列表项行距极小、整页像一坨**。不报错、主题编辑器也看不出异常。整页正文横跨内容区全宽（大屏超过 1000px），阅读极难跟行。
- **根因**（三层，缺一层都不会有这症状）：
  1. **`assets/critical.css` 顶部的 reset** `* { box-sizing: border-box; margin: 0 }` 把 `h1–h6 / p / ul / ol` 的块间距**全部清零**，且文件里再没有一处恢复它——reset 区之后只有 `overflow-wrap` 和 `:is(p,h1…):first-child { margin-block-start: 0 }` 这类"减间距"规则，没有一条"加间距"的。无头 Chrome 实测（只加载 critical.css）：`h2 margin-block = 0px/0px`、`p = 0px/0px`、`ul = 0px/0px`，`line-height` 全部 `normal`。
  2. **`sections/page.liquid` / `sections/article.liquid` 是 Skeleton 原版骨架**，正文部分是裸的 `{{ page.content }}` / `{{ article.content }}`——既没有 `.rte` 包裹层，也没有任何 `{% stylesheet %}` 补排版，也没有限宽容器。也就是说 reset 清掉的间距从头到尾没人补回来。
  3. **后台编辑器展示的不是前台渲染**。Shopify 富文本编辑器的 iframe 自带一套 h2/p/ul 的默认 margin 与行高，跟主题 CSS 完全无关。所以"后台看着不错"对前台没有任何参考价值——这条是本 bug 被拖到上线后才发现的直接原因。
  附带：`dev-docs/pages-ui.md §6` 规划的是「page-content section = 标题 + 富文本 + rich-text/image/button 通用块，桌面限宽 ~720px」，**实际实现从没落地过**（一直是 Skeleton 原版），所以全文也没有阅读宽度约束。
- **修复**：
  1. `assets/critical.css` 追加 `.rte` 富文本排版层（h2–h6 的字号/字重/上下间距、`p`/`ul`/`ol`/`blockquote`/`table` 的块间距 0.875rem、列表缩进 1.25rem、`li + li` 0.375rem、链接品牌色、`blockquote` 左边框、`hr`、`table`/`th`/`td`）。放全局而不是各 section 的 `{% stylesheet %}`，因为富文本出现在 page / article / 将来的 page-content blocks 多处，写三份必然漂移。
     **字重必须是 700**：初版照抄 `.product-description__rte` 写了 `font-weight: 500`，刘工反馈"h2 以后不加粗"。本主题只 `font_face` 两档（`snippets/css-variables.liquid`：原字重 + bold；当前字体 `work_sans_n4`），**500 没有对应字体面，按 CSS 字重匹配规则退到 400**——等于写了个"没加粗"。实测（只声明 400/700 的字族，22px 同一串文字）：`w400=269.45 / w500=269.45 / w700=282.95`，500 与 400 逐像素等宽。且 h1–h6 的 UA 默认就是 bold、后台编辑器也按 bold 显示，改成 500 等于主题偷偷改了商家的排版意图。
  2. 两个 section 用 `<div class="rte">` 包裹正文，外层各套 `.page-content` / `.article-content`：`max-inline-size: min(720px, 100%)` + `margin-inline: auto` + **显式 `inline-size: 100%`**（BUG-063 那条通路：grid item 上 auto margin 会让 stretch 失效）。
  3. 页面 h1 补字号 `clamp(1.75rem, 1.15rem + 1.8vw, 2.25rem)`（reset 也没给标题字号，浏览器默认 32px 与 1rem 正文的比例失衡）。
  **刻意不恢复 `p:empty`**（reset 区有 `p:empty { display: none }`）：商家靠敲空行控距时，空行高度与段间距会叠加成双倍空白；段间节奏交给 margin，分段交给标题层级。
  实测（1200 视口，无头 Chrome 渲染等价结构）：`.page-content` `x=240 w=720`（居中正确），`.rte p` `margin-block 14px`、`line-height 27.2px`，`.rte h2` `margin-block-start 0`（首子元素）/ `margin-block-end 10px`。
- **预防**：
  1. **凡输出 `{{ xxx.content }}` 或 `rich_text_field` metafield 的地方，必须套 `<div class="rte">`**。可执行检查：`grep -rn '{{ *\(page\|article\)\.content' sections` 命中的每一行，上下 3 行内必须能看到 `class="rte"`。
  2. **reset 里的 `margin: 0` 是"清场"，不是"排版"**。任何靠 reset 起手的主题，都必须配一份显式的正文排版层（本主题即 `.rte`）；新增内容类 section 时不要写自己的一套 `h2 { margin }`，直接复用 `.rte`——否则第三份副本出现时就开始漂移。
  3. **后台编辑器的显示不能当验收**。新页面类型上线前，必须在前台真页面上看一次：`shopify theme dev` 打开 `/pages/<handle>`，量 `p` 的 `marginTop` 是否 > 0、正文容器宽度是否 ≤ 760。
  4. `pages-ui.md §6` 的 page-content section（标题 + 富文本 + 通用 blocks）仍未落地，本修复只解决排版的"挤"，**不含 blocks 能力**；该工单项保持 Open，别把它当成已完成。
  5. **字重只允许写 400 / 700**。`snippets/css-variables.liquid` 的 `font_face` 只声明原字重与 bold 两档，`font_modify: 'weight'` 也只有 bold 一种 ⇒ **500 / 600 在本主题里没有对应字体面，一律按 CSS 字重匹配规则退到 400**。可执行检查：`grep -rn "font-weight: \(500\|600\)" sections assets`（2026-11-07 全量扫描：82 处）。判读方法：**先确认该规则命中的元素默认字重**——
     · 命中 `h1–h6` / `th` / `<b>` ⇒ 默认是 700，写 500 等于**把加粗改成常规（视觉变细，是真 bug）**。已修 4 处：`.rte :is(h2..h6)`、`.rte th`、`.product-description__heading`、`.product-description__rte :is(h2,h3,h4)`。
     · 命中 `div` / `span` / `a` / `button` / `p` ⇒ 默认就是 400，写 500 只是**无效声明**（不会变细，但作者以为存在的"半粗层级"从来没渲染出来）。
     剩下的 82 处需要逐条对照模板判断元素标签，**未批量清理，保持 Open**；不要一次性机械替换成 700——那会把卡片标题、按钮这类本该常规的文本整体加重一档。

### BUG-065 · `assets/critical.css` 里带着未解决的合并冲突标记提交了：`.rte th` 的 `color` 声明被静默吞掉，theme check 报 0 offenses

- **日期**：2026-11-07 ｜ **状态**：Fixed
- **现象**：`git status` 显示 `UU assets/critical.css`（工作区处于未完成的合并中），文件 865–877 行留着 `<<<<<<< HEAD` / `=======` / `>>>>>>>`（三层嵌套，来自两次合并）。页面上没有立刻可见的异常——因为被吞掉的恰好是 `.rte th` 的颜色声明，而当时演示店只有浅色预设，回落到浏览器默认黑色（#000）与主题前景色（#333）肉眼几乎分不出。**在 Coppice Noir 下会直接看不见**：`#000` 压在 `#0F1012` 上。
- **根因**：三件事叠加。
  1. **合并冲突被当成"文件内容"留在工作区**。冲突来自「本地改 `.rte` 字重（BUG-064）」与「Shopify 后台主题编辑器回写的旧版本」两路修改；本地把 `font-weight: 500` 改成 700，后台那份还是 500，两边都改了同一行 ⇒ 冲突。
  2. **CSS 的错误恢复让标记"看起来没坏"**。实测（无头 Chrome，同一段声明块分别带/不带标记，读 `getComputedStyle`）：带标记时 `font-weight` 仍是 **700**、`color` 变成 **rgb(0,0,0)**；不带标记时是 `700` / `rgb(51,51,51)`。机制是：`<<<<<<<` 是块内非法声明，解析器跳到下一个 `;` 后继续 → 第一条 `font-weight: 700` 生效；`=======` 同样非法，跳到下一个 `;` 时把**第二条 `font-weight: 700;` 一起吞掉**；`>>>>>>> abc123  color: #333;` 整段被当作一条非法声明丢弃 ⇒ **颜色没了**。因为块本身没断，后面的规则照常解析（同测试里 `.after-marker` 仍是 `flex`），所以整份样式表"大体正常"，只有被标记包住的那个块里、标记之后的声明会静默消失。
  3. **静态检查完全没有拦**。实测：把标记注入一份主题副本后跑 `shopify theme check` → **77 files inspected with no offenses found**。theme check 解析 Liquid、schema、HTML 结构，但不解析 CSS 声明值的合法性。
- **修复**：删掉三层标记，保留 HEAD 一侧（`font-weight: 700` + 那条"本主题没有 500"的注释），并把被吞掉的 `color: var(--color-foreground)` 显式写回。修完的内容与 `HEAD:assets/critical.css` **逐字节一致**（即 HEAD 里本来就是正确版本，冲突是这次进行中的合并把旧版本带回来的），索引里的 unmerged 条目随之清空（`git ls-files -u` 无输出）。⚠️ 但 `.git/MERGE_HEAD`（= `e40547d`）仍在，**这次合并本身还没收尾**，是否提交由刘工决定。
- **预防**：
  1. **动手写代码前先 `git status`，出现 `UU` / `AA` / `DU` 一律先解决冲突再往下做**——本次是写页脚时顺手撞见的，否则会带着一个已知损坏的文件继续开发。
  2. **提交前跑一次全量标记扫描**（theme check 指望不上，见根因 3）：
     ```
     grep -rn '^\(<<<<<<<\|=======\|>>>>>>>\)' --include=*.css --include=*.js --include=*.liquid --include=*.json .
     ```
     命中即阻塞。`=======` 会误伤 Markdown 分隔线与 banner 注释，看路径判断。
  3. **"theme check 0 offenses" 不等于"文件没坏"**。它的检查面是 Liquid / schema / HTML / 资源引用，**CSS 与 JS 的语义错误都在盲区**（JS 侧同理：`node --check` 只验语法，验不了运行时——见 MEMORY 的 `showToast is not defined`）。CSS 改动需要真渲染一次（无头 Chrome 建等价结构读 `getComputedStyle` 最省事）。
  4. 后台主题编辑器（"Update from Shopify" 提交）与本地的改动**会撞在同一个文件上**。同一段时间内两边都改 `.rte` 这类全局样式时，先 `git pull` 再动，别等合并时才发现。

### BUG-066 · 用 index/find 删一段 CSS 时把 `@media` 的闭合括号留在原地，页脚菜单列整片塌成一列（theme check 仍报 0 offenses）

- **日期**：2026-11-08 ｜ **状态**：Fixed
- **现象**：页脚 v3.0 改版中删掉一段 `@media (min-width: 750px) { .footer__brand-col { … } }` 覆盖后，
  SHOP / SUPPORT / COMPANY 三列竖向叠成一列、挤在第一个轨道里。`shopify theme check` 依旧
  **77 files inspected with no offenses found**；括号计数也"看着是平的"（443/443），因为多出来的
  `}` 正好和被删掉的 `@media {` 配平了。
- **根因**：删除用的是 `s[:start] + s[close:]`，`close` 取的是「`.footer__brand-col {` 之后第一个
  `  }`」——那是**规则自己的**闭合括号，不是 `@media` 的；于是 `@media {` 的开头被删、
  `@media` 的闭合 `}` 留下，成为游离的 `}`。
  游离 `}` 让浏览器错误恢复，`.footer__columns` 的 `max-inline-size: 32rem` 与 `flex: 1 1 auto`
  实际没生效 → 网格在**不确定宽度**下解析 `repeat(auto-fit, minmax(8rem, max-content))`，
  `auto-fit` 退化成 1 条轨道。**括号总数平衡 ≠ 结构正确**，这是这次最坑的地方。
- **修复**：删掉游离 `}`；复测 `getComputedStyle(.footer__columns).gridTemplateColumns`
  = `128px 128px 128px`、宽度 512，视觉恢复三列。
- **预防**：
  1. **删 CSS 块一律按"括号配平"删**，不要用「下一个 `  }`」当终点：从块的起始 `{` 开始数层级，
     数到归零为止。脚本里至少断言 `css.count('{') == css.count('}')` **并且**删前删后差值成对。
  2. **括号平衡是必要条件，不是充分条件**。改完必须真渲染一次并量 **`gridTemplateColumns` /
     `flex-basis` 这类计算结果**——游离括号不会报错、不会让总数失衡，只有布局会变。
  3. 同类操作（删 `@media` / 删嵌套规则）优先整段替换成空字符串并保留外层选择器，
     而不是按偏移切片。

### BUG-067 · 箭头红线三犯：改版 use-case-grid 时照效果图重新加了卡内 CTA 箭头
- **日期**：2026-11-12 ｜ **状态**：Fixed
- **现象**：首页场景卡片改版（左图右文、默认 7:3 / hover 5:5 展开描述）时，
  照参考效果图里的 "Shop Now →" 给 `.use-case-grid__link` 加了
  `::after { content: '\2192' }`。刘工验收要求「去掉箭头」。
  同一位置在 BUG-020 已被否过一次（当时卡内链接全带箭头、同屏 10 个），这是第三犯。
- **根因**：把「参考效果图的视觉形式」当成了覆盖既有红线的授权；动这个 section 之前
  没有先查 `dev-docs/bugs.md` 里关于它的历史决议。效果图是外部参考稿，
  其中的箭头不进入本项目的箭头准则（AGENTS §6）。
- **修复**：删除 `.use-case-grid__link::after` 整段规则。文案本身不含箭头（原本就是
  伪元素），locale 与 `templates/index.json` 均无需改动。复核：该 section 已无
  `content: '\2192'` / `&rarr;`；`shopify theme check` 77 文件 0 offenses；
  无头 Chrome 三态 17 项断言全 PASS。
- **预防**：
  1. **动任一 section 前先跑** `grep -n "<section 名>" dev-docs/bugs.md`，
     把命中的历史决议列进改动前提；命中红线的效果直接不做，而不是做完再问。
  2. 参考稿与 AGENTS.md / bugs.md 冲突时以后者为准；确需破例必须先拿到刘工明确确认
     **并同步改规范**，不能"先实现、再补例外"。
  3. 新增 `content: '\2192'` 或 `&rarr;` 前，按 AGENTS §6 数同屏箭头总数并核对允许位置
     （仅 View All 链接、行尾导航元素）；改完 `grep -n "2192\|rarr\|::after"` 复核产物。

### BUG-068 · mega 面板打开时鼠标移到 Support，两个面板堆叠
- **日期**：2026-11-12 ｜ **状态**：Fixed
- **现象**：桌面导航 hover Shop 展开通栏 mega 面板后，把鼠标移到 Support（普通下拉项），
  mega 面板不消失，Support 的小下拉压在 mega 面板上，两块面板同屏显示。
- **根因**：`assets/nav-pill.js` 用 `.is-open` 维持 mega 的「飞越间隙」拖尾展开，
  而 `.is-open` 是**不依赖 `:hover` 的持久状态**（CSS 里
  `.main-nav__item--group.is-open > .main-nav__mega { display:block }` 与 hover 条件是**或**关系）。
  清理路径原先只有两条：① `_openGroup()` 的互斥清理（仅 group→group 会走）；
  ② `_scheduleClose()`（仅 `mouseleave` 整个 `.main-nav__list` 时排期）。
  Shop → Support 全程都在 list 内，两条都不触发；`mouseover` handler 开头的
  `_cancelClose()` 反而把上一轮挂起的 200ms 关闭取消了。
  结果 Shop 的 `is-open` 永久残留，同时 Support 的 `:hover` 让下拉显示 ⇒ 堆叠。
  **本质是状态机漏了一个出口**：非 group 的一级项（普通下拉 / 叶子链接）从没被列为
  「应关闭其它面板」的输入。2026-10-28 新增 `--dropdown` 面板形态时只写了它的 CSS
  开合条件，没有回到状态机补出口，隔 15 天由刘工验收发现。
- **修复**：抽出 `_closeGroups()`（撤所有 group 的 `is-open` + 取消待切换，**不碰顶部药丸**），
  `mouseover` 里 hover 命中非 group 项时立即调用；`focusin` 同路径补一处
  （焦点在 group 内、含其 mega 后代时 `closest()` 仍返回该 group li，不会误关）；
  `_close()` 改为复用它，保证「立即关」与「延迟关」只有一个出口。
  刻意**不加** CSS 兜底（如 `:has(.dropdown:hover) .mega { display:none }`）——
  那会让面板显隐出现两套真值来源，且 `:has()` 不支持的浏览器上形成假双保险。
  代价：group → 非 group 项这条路径不再享受 200ms 宽容窗口，mega 立即开始 0.25s 收起；
  但该路径的终点本就是另一个面板，宽容窗口原本就不该给（它被误用了）。
- **验收**：无头 Chrome + CDP **真鼠标移动**（非合成 `MouseEvent`）、读真实 `getComputedStyle`：
  11/11 PASS（含 group→group 互斥、飞越面板内部保持展开、叶子链接、
  `mouseleave` 延迟关闭与药丸隐藏、focusin 清理、Support 下拉正常显示）。
  并用 `git show HEAD:assets/nav-pill.js`（修复前）跑同一路径做**对照**：
  旧版 `移入 Support → {aOpen:true, megaA:"block", dd:"block"}` 确凿复现堆叠，
  证明断言不是恒 PASS 的空壳；修复后 `{aOpen:false, megaA:"none", dd:"block"}`。
  `node --check` 通过；`shopify theme check` 77 文件 0 offenses。
- **预防**：
  1. **凡「不依赖 `:hover` 的持久状态类」（`is-open` / `is-active` 等），必须列全所有清除出口**。
     新增一类一级项 / 面板形态时，逐个核对「鼠标或焦点落到它上面时，其它面板的持久态由谁清」，
     把这条写进该形态的验收清单，而不是只验自己能不能打开。
  2. 交互状态机改动一律配**可跑验收 + 修复前对照**：用真实 `:hover`（CDP
     `Input.dispatchMouseEvent`）而非合成事件，再用 `git show HEAD:<file>` 的旧版
     跑同一断言并确认它能 FAIL。全 PASS 但抓不到 bug 的脚本等于没有。
  3. 只改 JS 状态、不改 CSS 显示条件时，不要在 CSS 再加一层兜底规则；
     两套真值来源会让后续排查失去单一入口。

### BUG-069 · 删掉 logo 的 assign 后，移动抽屉头部的 logo 变成未定义变量
- **日期**：2026-11-12 ｜ **状态**：Fixed（当日引入当日修）
- **现象**：全局 logo 改造删掉 `sections/main-nav.liquid` 顶部的 `assign logo_image = section.settings.logo` 后，`shopify theme check` 报 7 条 `UndefinedObject: Unknown object 'logo_image' used.`，全部落在约 548–560 行（移动抽屉头部品牌图）。浏览器侧**不报错**：Liquid 未定义变量返回 nil，传了 logo 时只是静默退化成空图。
- **根因**：`logo_image` 在 `main-nav.liquid` 里有**两个**消费点——桌面 Zone 0 与移动抽屉头部。改造时按 `grep 'section.settings.logo'` 定位，命中的只是赋值语句；删掉赋值后第二个消费点仍在引用该变量。页头桌面树 / 移动树是两份独立 DOM（task-header O-5 的既定结构），改一处不会自动同步另一处。
- **修复**：第二个消费点也改成 `{% render 'brand-logo', ... %}`（沿用 `nav-drawer__brand-img` 的 96 / 64 / 144 尺寸），两处统一走新建的 `snippets/brand-logo.liquid`。重跑 theme check → **78 files / 0 offenses**。
- **预防**：
  1. 删除任何 `assign` 前，先 `grep -rnF '<变量名>' --include=*.liquid .` 数**所有引用**并逐个改掉，不要只搜赋值语句里的那个表达式。**不要用 `\b` 词边界**——本机 BSD grep 的 ERE 不支持，会静默漏匹配。
  2. 改动后**必跑 `shopify theme check`**：`node --check`、本地 JSON / locale 脚本都抓不到 Liquid 未定义对象。CLI 在本沙箱已可见（`/Users/mac/.nvm/versions/node/v24.22.0/bin/shopify`，见 AGENTS §11），旧记录"沙箱不可见"已作废。
  3. 页头改任何品牌/图标元素时，按 O-5 主动核对「桌面 Zone 0」与「移动抽屉 head」两处，不要等检查器报。

### BUG-070 · 新写的 `<ui-tooltip>` 气泡是空黑块、关不掉、文字冲出色块
- **日期**：2026-11-15 ｜ **状态**：Fixed（新功能开发期自测发现，未上线）
- **现象**：
  1. 气泡 `getBoundingClientRect()` 只有 20×13（只剩 padding + 箭头），hover 出来是一个黑块，文案不见了。
  2. `data-open` 已置上、`getComputedStyle(bubble).visibility` 却是 `visible` 改不回来 —— 指针已经离开 300ms，气泡还赖在页面上。
  3. 上真主题后（刘工截图）：气泡盒子被 `max-inline-size: 15rem` 正确钳到 239px，但文案**单行冲出深色块的右边缘**，压在白色页头上变成一行看不清的浅字。
- **根因**：
  1. `build()` 末尾调 `setText()` 写文案，而 `setText()` 的守卫是 `if (!this.bubble) return` —— `this.bubble` 正是 `build()` 的返回值，此刻还没赋值，整段文案被静默吞掉。**没有报错**，只是气泡变空。
  2. 用了 `visibility: hidden` + `visibility 0.14s` 过渡。它是离散属性，参与过渡时显隐被推迟到过渡中途/结束（Chrome 实测：打开态 200ms 读到 `hidden`、关闭态 300ms 仍读到 `visible`），两头都不可控。
  3. 页头行 `.main-nav__inner` 的 `white-space: nowrap`（导航项永不折行）**被气泡继承**。`max-inline-size` 只钳盒子，不钳文字：盒子 239px、文字仍按 nowrap 排成一行 250px+，直接画到盒子外面。本地桩用的是 `-apple-system`（13px 下这句恰好 239 内放得下），所以**桩里看不出问题，一上主题（字体更宽）就炸**。
- **修复**：
  1. `build()` 内直接写 `textContent`，不借道依赖 `this.bubble` 的方法。
  2. 气泡改为常驻 DOM、只用 `opacity` + `pointer-events: none` 收放，`visibility` / `display` 一概不用 —— 它的文本要**一直被 `aria-describedby` 问到**，本来就不该「不存在」。
  3. 气泡上显式 `white-space: normal` + `overflow-wrap: break-word`，把浮层的排版规则与宿主隔开。
- **预防**：
  1. **「自产自销」的初始化顺序**：方法 A 产出字段 X，A 内部又调依赖 X 的方法 B → 要么在 A 里直接写，要么把 B 挪到赋值之后。本项目的 CSS 变量派生、DOM 引用都踩过同一形状，往后遇到「XX 静默不生效」先查这个。
  2. **浮层显隐不要用 `visibility` / `display` 参与过渡**。非要用 `visibility`，必须 `0s` + 显式 `delay`，且**配断言**（`getComputedStyle().visibility`）—— 截图里看不出来。
  3. **绝对定位的浮层要「样式自成一套」**：`white-space` / `letter-spacing` / `text-transform` / `line-height` / `font-weight` 这些会继承的排版属性，浮层上一律显式写死。判据是「宿主是不是给某个方向定了规则」（页头 nowrap、按钮栏 uppercase、卡片 letter-spacing）——定了就一定会漏到浮层里。
  4. **桩页面的字体必须与主题一致**（或至少用更宽的那款）：`-apple-system` 比主题字体窄，本地量出来「刚好放得下」的文案上主题就溢出。验浮层宽度必须拿**最长的那条真文案**跑，不是随手编一句短的。
  5. 组件验收走 `--headless --dump-dom` 打断言集（PASS/FAIL 文本），别只看截图：`--virtual-time-budget` **只加速 `setTimeout`，不推进 CSS 过渡**，截图会停在过渡第一帧，把「正在过渡」误判成「没生效」（本次两轮误判都是这个原因）。
  6. 判 hover 能力**不要**用 `matchMedia('(hover: hover) and (pointer: fine)')` 当绑定开关 —— 无头环境不匹配，整页提示会静默全哑；改用 `PointerEvent.pointerType === 'touch'` 过滤。已写进 `tooltip.js` 头注释。

### BUG-071 · 礼品卡收件人字段的容器只剩 1px 宽：自定义元素宿主默认 `display: inline`

- **日期**：2026-11-17 ｜ **状态**：Fixed（新功能开发期自测发现，未上线）
- **现象**：`.gift-recipient` 明明写了 `border` / `padding` / `margin-block` / `background-color`，渲染出来却是一根 1px 宽的竖线，四个字段与复选行全部溢出到框外；DOM 与 computed 值都正常，没有报错。
- **根因**：`<gift-card-recipient>` 是自定义元素，**未定义 `display` 时按 UA 样式是 `display: inline`**。行内盒模型下，块级子元素（`.gift-recipient__fields` 的 grid、字段的 grid）会把行内盒切成碎片，边框只能画出碎片那一条。同一节里的 `<product-form>` 也是 inline，但它的子节点是 `<form>`（块级）且没有「容器型」外观，所以这个形态一直没暴露。
- **修复**：`.gift-recipient { display: block; }`（注释写在规则上方，说明为什么不能省）。
- **预防**：
  1. **凡是自带边框 / 内边距 / 背景的 Custom Element（容器型组件），样式里第一条就写 `display: block`**，不要指望「子元素都是块级所以会撑开」。判据：这个标签一旦被当成盒子看（有 border / padding / background / grid 布局），就必须显式声明 display。`assets/critical.css:561` 已有同类先例（`.back-to-top` 的注释写着同样的话）。
  2. 自测时**必须量宿主的 `getBoundingClientRect().width`**，不能只看子元素是否正常——本例子里元素全都在，只有盒子塌了；纯截图在窄屏下还会被误判成「内容就是这么窄」。
  3. 顺手记一条桩侧的复犯：验证桩的外层容器用 `margin-inline: auto`（居中）时，flex 列里的 item 宽度会退化成 fit-content（BUG-063 同一机制），本轮因此先误判了一次「容器被压窄」。桩容器要显式 `inline-size: 100%`。
  4. BUG-070 预防 #5 再命中一次：`--virtual-time-budget` 不推进 CSS 过渡，`transition: background-color .15s` 的勾选态在 headless 里永远读到起始色（白）。桩里判颜色前先注入 `* { transition: none !important }`，否则会把「没生效」当成 bug 修第二遍。
  5. 桩里剥 Liquid 会留下**裸露的属性词与未加引号的字符串**（`{% if %}checked{% endif %}` 剥完剩一个 `checked`；`{{ x | json }}` 剥完没引号 ⇒ JS 直接 ReferenceError，二维码不出来）。生成桩后先 `--dump-dom` 看一眼关键节点，再开始断言。

### BUG-072 · 单图商品的画廊只剩 76px 宽：桌面两列 grid 写死，没有缩略图时舞台被塞进缩略图列

- **日期**：2026-11-17 ｜ **状态**：Fixed
- **现象**（刘工截图，礼品卡商品页）：左侧只有一张约 76px 的小图，右边整片空白，大图/画廊不见了。设备像素下看起来就是"只有一个产品图，没有大图"。
- **证据**（本地 `theme dev` 抓真实 HTML + 源文件 stylesheet 复现，`--dump-dom` 断言）：
  - `data-media-count="1"`，`--gallery-ratio: 0.75`，只有一个 slide，`product-gallery__thumbs` 根本没渲染。
  - 修复前实测：`gallery=742x101 ｜ stage=76x101 ｜ slides=76x101`。舞台（`.product-gallery__stage`）宽度只有 76px，`ul` 按 `aspect-ratio: 0.75` 反推出 101 高。
- **根因**：`@media (min-width: 1100px)` 里把两列布局无条件挂在 `.product-gallery` 上：

  ```css
  .product-gallery { display: grid; grid-template-columns: 76px minmax(0, 1fr); align-items: start }
  ```

  这套网格假设「第一列永远是 76px 缩略图列、舞台在第二列」。多图时靠 `order: -1` 把 thumbs 排到第一列；**单图时 thumbs 不存在**，舞台作为唯一子项被自动放进第一列 = 76px，第二列空着。CSS 完全合法，theme check 0 offense，纯布局语义错配。
- **修复**：
  1. Liquid 侧按媒体数量给宿主加修饰类：`class="product-gallery{% if media_count > 1 %} product-gallery--thumbnails{% endif %}"`。
  2. 桌面两列规则改挂到 `.product-gallery--thumbnails`；`.product-gallery` 恢复默认 `display: block`。
  3. 附带 `.product-gallery__slides { margin-inline: auto }`：竖图被 `max-block-size: 78vh` 按高定宽后，盒子会窄于所在列（实测 476 < 742），auto 外边距把它居中；宽度撑满时 auto 无效。
- **修复后实测**：单图 `gallery=742x634 ｜ stage=742 ｜ slides=476x634`；模拟多图（补上修饰类 + 一个 thumb）`stage=654 ｜ thumbs=76`，两列照旧。
- **预防**：
  1. **`grid-template-columns` 写死像素轨道前，先问「这个轨道的内容是不是一定存在」**。凡是「可选子元素」占一个轨道，要么用 `repeat(auto-fit, …)`，要么由 Liquid 输出能力类把整条网格开关掉 —— 别指望空轨道自动消失（它会保留，并把唯一的子元素挤进去）。
  2. 验收产品页不要只验"图多的那个商品"。**单媒体是最容易漏的分支**：演示店商品几乎都有多图，礼品卡/新建商品往往只有一张。以后画廊/媒体类改动，至少各验一个单图和一个多图商品。
  3. 复现手段记一份：`theme dev` 起着的时候，`curl http://127.0.0.1:9292/products/<handle>` 拿**真实渲染的 HTML**，再用 `sections/*.liquid` 里的 `{% stylesheet %}` 原文拼成本地桩（`/private/tmp/gc-stub/build_gallery_stub.py`），`--dump-dom` 打 `getBoundingClientRect` 断言。比在浏览器里肉眼量准，也比 `--screenshot` 直接打 dev server 稳（本机 Chrome 直接截 dev server 会 SIGTERM，热更新长连接拖住加载）。
  4. 正则找标签别写 `<product-gallery.*?>` —— 样式表里的注释也含这个字符串，会先命中注释拿到假标签。要么先剥 `<style>` 再匹配，要么定位到含 `data-media-count` 的那一处。

### BUG-073 · 单图商品点「全屏查看」是一片空白：画布被自动放进 `auto` 列，宽度锁死在 0

- **日期**：2026-11-17 ｜ **状态**：Fixed
- **现象**（刘工截图）：单图商品（礼品卡）点舞台大图 → 灯箱打开，左上 `1 / 1`、右上关闭按钮都在，中间**全白**，没有任何图。
- **证据**（DevTools）：`<img class="product-lightbox__img" src="…footer-bg.png?width=1600" sizes="100vw">` 已在 DOM 里，自然尺寸 **1088×1448**、文件已加载（160 kB），但 **Rendered size 0 × 0**；Computed 面板里 `max-width` 显示自定义值却被划掉（生效的是 `max-inline-size: 100cqw`）。
- **本地复现**（真实 section HTML + 源 stylesheet + 真 `product-gallery.js`，`--dump-dom` 断言）：
  - 修复前：`canvas=0x712 ｜ img=0x0 ｜ canvasCol=auto ｜ arrowsHidden=true,true`
  - 修复后：`canvas=1333x712 ｜ img=534x712 ｜ canvasCol=2`
- **根因**：`.product-lightbox__stage` 是 `grid-template-columns: auto minmax(0,1fr) auto`，三列分别是「上一张箭头 / 画布 / 下一张箭头」。单图时 `_renderLightbox()` 把两个箭头 `hidden`（`total < 2`），**画布成为唯一 grid item → 隐式自动放置进第 1 列 `auto`**，宽度退化成内容宽。而画布是 `container-type: size`，`img` 的尺寸又只能从画布的 `100cqw/100cqh` 反推 —— 画布宽度来自内容、内容来自画布 → 环，最终 0。于是 `max-inline-size: 100cqw` 解析为 0，图片被压成 0×0。全链路**没有任何报错**，DOM、srcset、加载状态都正常。
- **修复**：`.product-lightbox__canvas { grid-column: 2 }` —— 显式钉在第 2 列（1fr），箭头在与不在都不影响画布。
- **预防**：
  1. **这是 BUG-072 的同族第二次**（24 小时内）：只要 grid 某条轨道是给「可能不存在的元素」预留的，固定元素就必须显式写 `grid-column` / `grid-row`，**不许依赖隐式自动放置**。判据一句话：*模板里有 `{% if %}` 或 JS 会 `hidden` 的兄弟节点，就要检查自动放置*。
  2. **`container-type: size` + cq 单位**的容器，宽度绝不能来自内容（`auto` 列、`inline-block`、`fit-content`）：会形成 cq 环、锁死为 0。诊断指纹：元素都在、加载完成、DevTools 里 `Rendered size 0 × 0` 而 `max-width` 被 cq 值覆盖。
  3. **单图 / 单元素分支必须单独实测**。多图商品的箭头一直在场，正好掩盖了 073；多图商品的多张图又掩盖了 072。以后画廊、灯箱、幻灯类改动，固定验三态：0 个可选元素、1 个、多个。
  4. 桩要**加载真实 JS**（`product-gallery.js` 从 file:// 引），并把 CDN 图换成 data URI —— 否则「图没插入」和「图加载失败」分不开。注意 `theme dev` 会把资源 URL 重写成 `/cdn/s/files/…/assets/x.js?v=…`，替换正则要按这个形状写，别只匹配 `/assets/x.js`。

---

### BUG-074 · 「回到顶部」按钮被 hCaptcha 徽标压住：主题浮层抢了第三方 widget 的默认角

- **日期**：2026-11-18 ｜ **状态**：Fixed
- **现象**（刘工截图，联系页）：右下角「Protected by hCaptcha / Privacy · Terms」胶囊整个压在按钮之上，按钮只露出左下小半圈，点不到。
- **根因**：`back-to-top` 用 `inset-inline-end: 1rem` 钉在右下角。Shopify 联系页的 hCaptcha 徽标是**平台注入的 fixed 浮层**，钉在**物理**右下（≈ right/bottom 14px），首屏之后异步插入，主题既不能改它的样式，也无法在 CSS 里预判它何时出现。两块浮层抢同一个角，且徽标后注入 + 更高层级 ⇒ 主题必输。这不是「避让写漏」，是**共处方案选错了**：右下是全球第三方浮层的默认位（hCaptcha、Shopify Inbox、客服脚本、cookie 横幅），位置不能指望独占，得会避让。
- **修复（v3，现行）**：位置留在右下，**底距默认 90px** + 运行时避让兜底。
  1. `assets/critical.css`：`back-to-top` 三个自定义属性 —— `--back-to-top-gap: 1rem`（横向）、`--back-to-top-offset: 90px`（底边基准，JS 读它推探针盒）、`--back-to-top-lift: 0px`（JS 写入的额外抬升）；`inset-block-end: calc(max(offset, 1rem + env(safe-area-inset-bottom)) + lift)`，宿主加 `transition: inset-block-end .2s`（`prefers-reduced-motion` 下关闭）。位置仍是逻辑属性 `inset-inline-end`：RTL 下翻到物理左边，与钉物理右侧的徽标天然不撞。
  2. **90px 是主手段**：徽标占底边 14 + 高 46 = 60px（收起态 56×56 = 70px），按钮占 90–134px ⇒ 留 20–30px 余量，**平时完全不需要 JS**。取 90px 而不是按徽标算 76px，是给「徽标展开/改版」留缓冲。
  3. `assets/back-to-top.js`：`measureAvoidance()` 只兜住**比 90px 还高**的挂件。探针盒由**视口**推导（`vh - offset` 起算）；候选集只有 `body` 直接子节点 + 全页 `iframe` 中「自身或祖先 `position: fixed`」且非 `pointer-events: none` 的；压住按钮那一格就写 `lift = 底边 - (box.top - 8px)`；`lift > vh*0.4` 则放弃（那是整屏浮层不是徽标）。触发点：`MutationObserver(body, childList)`、捕获阶段 `load`（iframe 晚加载，load 不冒泡）、`resize`、首次冒头，200ms 合并。
  4. v1（当日废弃）：把按钮挪到左下（`inset-inline-start`）。**刘工否掉——「回到顶部」在左下反直觉**。v2（当日废弃）：底距沿用 1rem + 纯运行时避让；刘工改为直接给 90px 静态底距。
  5. 同步描述位置的旧注释：`snippets/back-to-top.liquid` 的 doc 段、`sections/footer.liquid` 里「贴在右下角 16px 处」那句。
- **验证**（桩：正则抽真标记 + 绝对 `file://` 引真 `critical.css` + 真 `back-to-top.js`；`--dump-dom` 打断言；1280×673 与 500×773 两个视口）：
  1. 无遮挡 → `lift=0px`，`host y=539`（= 距底 90px）
  2. 注入 hCaptcha 同尺寸徽标（250×46 @ bottom 14）→ **`lift=0px` 且不重叠**（按钮 539–583 / 徽标 613–659，间距 30px）；连续采样 6 次全等
  3. 移除徽标 → `lift=0px`
  4. 左下浮层 200×60 → `lift=0px`（横向不相交不抬）
  5. 高挂件 250×160 → `lift=92px`（90px 挡不住时才抬，抬完间距 8px）
  6. 整宽 320px 底部面板 → `lift=0px`（超过 `vh*0.4` 主动放弃）
  7. 500×773 窄视口全部同上
  - `shopify theme check` 0 error（1 warning = 已知 `image.liquid` 的 `OrphanedSnippet` 误报）。
- **预防**：
  1. **与第三方浮层共处 = 位置留在常规角 + 给足静态余量 + 高个子才运行时避让**。换角会牺牲可预期性（本轮实测被否）；纯静态又会被「比预期更高的挂件」打穿。判据：*这个角上有没有一块不由我控制、会在首屏之后出现的盒子？有 ⇒ 先按它的常见尺寸给足余量，再留一条量它的兜底。*
  2. **避让量必须由视口推导，不能拿被避让元素自己的 rect 当探针**：抬升会改 rect ⇒ 抬高→测不到→降回→又测到，0.2s 过渡期间最容易自激。水平方向可以取实时 rect（不受抬升影响），纵向不行。
  3. **自定义属性读回来是原始 token**：`--x: 1rem` 经 `getPropertyValue` 得到字符串 `"1rem"`，`parseFloat` 得到 **1**（不是 16）。本轮先写成 `parseFloat(...)`，避让量算成 67px（应为 52）才暴露——与 `hero-slideshow.js` 里 `.55s` 被 `parseFloat` 小 1000 倍同族。**凡 JS 读 CSS 长度/时长，先判单位再换算**。
  4. **桩里量浮层先关过渡；判「截图里画没画」看 md5 或红描边**：无头截图常在 JS 跑之前抓帧——本轮 6 次截图里 `data-visible` 断言为 true、`opacity: 1`，像素里却完全没有按钮（加 `outline: 4px solid red !important` 后 md5 才变）。断言一律走 `--dump-dom`，截图只作最后一道肉眼确认；要看终态就把 JS 会写的值直接落进桩标记。
  5. **MutationObserver 只监听 `body` 的 `childList`，不上 `subtree`**：页面内部变动（筛选刷新、变体切换）跟这个角落无关，上 subtree 会让测量被高频唤醒，而测量里是 `getComputedStyle` + `getBoundingClientRect`（强制样式/布局）。徽标本体埋在深处这种情况，靠「捕获阶段 `load`」补齐。

---

### BUG-075 · 跨 section 复用组件时样式「拿不到」不报错：stylesheet 按 section 聚合 + 令牌有作用域

- **日期**：2026-11-18 ｜ **状态**：Fixed（G-07 搜索页筛选接入时暴露并顺手解决）
- **现象**：搜索页要复用集合页的筛选组件（同一个 snippet、同一个 JS），把标记搬过去以后**看起来"没装样式"**：筛选卡没有卡面、排序按钮没有边框和圆角、Apply 是裸文字。控制台零报错，`theme check` 也零相关告警。
- **根因**（两层，都是静默的）：
  1. **`{% stylesheet %}` 按 section 聚合、只随渲染它的 section 加载**。`.facets__*` 全部写在 `sections/collection.liquid` 的 stylesheet 块里，搜索页不渲染 collection section ⇒ 那份 CSS 根本不在页面上。它不像 `assets/x.css` 那样可以跨 section 引用。
  2. **`--facet-control-radius` / `--facet-control-border` 定义在 `.collection` 作用域**。搜索页没有 `.collection` 祖先 ⇒ `var()` 解析失败 ⇒ 整条 `border` / `border-radius` 声明被丢弃。CSS 变量解析失败**不报错、不回退**，元素就是没有那条属性。
- **修复**：
  1. `.facets__*`（筛选组 / 排序 / 已选标签 / 骨架 / 抽屉）整块抽到 `assets/facets.css`，两个 section 各自 `stylesheet_tag` 条件加载（集合页：`collection.filters.size > 0 or show_sort`；搜索页：`search.performed`）。
  2. 三个控制令牌提到 `:root`（值仍是 `max(var(--style-border-radius-inputs), 14px)`，商家设置照样生效），并从 `.collection` 里删掉旧定义——**不留第二份**：同值重复定义会让"改了一处不生效"成为最难查的问题。
  3. 选择器里的 `.collection__` 前缀归一化：`collection-facets[data-facets-ready]` / `[data-facets-count]` / `[data-facets-toolbar]` / `.product-card`。搜索页不该为了复用样式而假装自己是集合页。
- **预防**（可执行）：
  1. **抽 CSS 用脚本、不用手抄**：`tools/split-facets-css.py` 按「选择器归属白名单」切分，可重跑。切分后必须过四项校核——① 规则数守恒（原始 = 组件 + 剩余，除有意改名的选择器）；② `.facets*` 类名集合零丢失；③ 两文件花括号各自平衡；④ 每一段 `@media` 内的规则递归判归属（混装段最容易只搬走一半）。
  2. **先跑「变量依赖清单」再落盘**：`grep -oE "var\(--[a-z0-9-]+" 新文件 | sort -u`，逐个确认定义在 `:root` 或该文件的祖先作用域里。凡出现"定义在某个 section 根类上"的令牌，一律提到 `:root`。
  3. **用一个"计算样式探针"代替肉眼**：`tools/probe-facets-css.py` 从真实 section / snippet 抽标记（不手抄），挂真实 `critical.css` + 目标 CSS，用无头 Chrome `--dump-dom` 读 `getComputedStyle`。两档视口各跑一次（1440 与 500），断言写成"该有的值"而不是"看着对"。本次靠它一次抓出 `--facet-control-*` 的作用域问题。
  4. **判断"样式该放哪"的一句话判据**：*这个 section 被移除时，这条样式还该不该留在页面上？* 该留 ⇒ `assets/*.css`；不该留 ⇒ section 的 stylesheet。

---

### BUG-076 · 搜索页的加载骨架铺满整屏：absolute 覆盖层没人给它定位祖先

- **日期**：2026-11-19 ｜ **状态**：Fixed
- **现象**（刘工截图，`/search?q=push` 勾筛选时）：fetch 期间的白底骨架从页头下方一直盖到视口底部、横向铺满，把分类栏、工具栏、结果卡全糊住。集合页同一套骨架正常。
- **根因**：`.collection__skeleton` 是 `position: absolute; inset: 0`，**只遮住最近定位祖先**。集合页早在 `.collection__results` 上写过 `position: relative`；搜索页的 `.search-page__results`（同一个 `data-facets-results` 钩子）**从来没写过** ⇒ 就近定位祖先是初始包含块 ⇒ 骨架 = 视口大小。两页共用一份骨架样式，差异却被写在了消费方的样式里。
- **修复**：把契约上移到组件侧 —— `assets/facets.css` 的骨架段开头加
  `[data-facets-results] { position: relative; }`。消费方只要把 `data-facets-results` 放在结果容器上，就自动是定位上下文，不用再各自记得补一条 relative。
- **同轮补齐（列表视图骨架）**：`html[data-collection-view='list']` 下结果网格变单列，骨架却仍是 2/3/4 列方格 —— 「切到列表 → 勾筛选」会先闪一片方格再跳成横条。按 `product-card` 的列表版式给骨架加了横排形态：单列 + 卡内 `clamp(104px,30%,168px)` 左图 + 右侧三条线（线条限宽 320/180/120，否则 70% 会被拉成 650px 的灰长带）。集合页共用这套骨架，一并受益。
- **验证**（`tools/probe-facets-css.py` 新增两条断言：骨架 rect 必须等于结果区 rect；列表态骨架必须单列且卡内两列）：
  - 修复后 1440 视口：结果区 `1145×1247@0`，骨架 `1145×1247@0`（视口 `1440×813`）✅
  - 反证（把 `[data-facets-results]` 强行改回 `static`，复现修复前）：骨架 `1429×813@0` —— 与截图的"铺满整屏"完全一致，根因确认
  - 列表态 1440：骨架 `1145px` 单列、卡内 `168px + 935px`、图 `168×168`、三条线 `320/180/120`；500 视口：单列 `500px`、`142+316`、图 `142×142`、线 `221/126/95`（按比例缩，未触顶）
  - 500 / 900 两档网格态：骨架与结果区逐值相等
- **预防**（可执行）：
  1. **组件里的 absolute 覆盖层，定位上下文必须写在组件自己的 CSS 里**，锚 `data-*` 钩子，绝不留给消费方"记得补 relative"。判据：*这条样式是不是为了让组件某一部分正确工作？是 ⇒ 和组件放一起。*
  2. **probe 常驻一条"覆盖层尺寸 == 容器尺寸"断言**（本次已加进 `probe-facets-css.py`）。这类 bug 肉眼只在"刚好在加载"的半秒里出现，截图和肉眼都容易错过；尺寸比对是唯一稳定的抓法。
  3. 新增骨架 / 遮罩 / loading 层时先回答一句：**这个 absolute 盒子的 GPS 是谁？** 答不出来就是错的。

---

### BUG-077 · `sections/search.liquid` 头注释整段重复粘贴，theme check 报 2 个 error（G-08 收口时踩到）

- **日期**：2026-11-18 ｜ **状态**：Fixed
- **现象**：跑 `shopify theme check` 时 `sections/search.liquid` 报 2 条 error —— `LiquidHTMLSyntaxError` + `LiquidSyntaxError`，均为 *"Attempting to close LiquidTag 'comment' before it was opened without a matching 'comment'"*，指向第 79 行。`theme check` 因此不是 0 error，**属于"不许提交"状态**。
- **根因**：2026-11-18 搜索页改版（G-07）改头注释时，末段 12 行（推荐搜索词 / 分类计数口径 / hero 默认图 / 不引入 collection 设置）被**整段重复粘贴**了一次：第 66 行已有 `{% endcomment %}`，第 67–78 行是重复正文，第 79 行是第二个 `{% endcomment %}`。后果有两层——① 第二个 `endcomment` 无匹配 ⇒ 语法 error；② 即使语法过关，第 67–78 行是**裸文本**，会原样输出到页面 `<head>` 区域上方。
- **修复**：删掉第 67–79 行（13 行），保留第 66 行的 `{% endcomment %}`。删除前用 `diff` 确认第 67–78 行与第 54–65 行逐字相同（唯一差异是第 66 行多出的 `endcomment`），不是"看起来像重复"。
- **预防**（可执行）：
  1. **改大段注释后必须跑一次 `theme check`**，不能只看"页面渲染正常"。`endcomment` 多一个时 Liquid 不中止渲染，只是把后文当文本吐出来——肉眼很容易漏；`theme check` 一条就抓住。本次是顺手跑 G-08 的验证时才发现，说明上次改完没跑。
  2. **`check-tag-balance.py` 抓不到这类问题**（它只配 HTML 标签，Liquid 标签不在其范围）。Liquid 结构问题只有 `theme check` 算数——已写进 AGENTS §2，这条是它的实例。
  3. 粘贴式改动后 `grep -c "endcomment"` 与 `grep -c "^{% comment"` 对不上就是手工核验的最快信号（本例 2 vs 1）。

---

### BUG-078 · 商品卡价格三件套在窄屏横向溢出：`nowrap` 的"现价 + 划线价"组比卡内容宽还宽

- **日期**：2026-11-18 ｜ **状态**：Fixed（刘工 2026-11-18 拍板走 **A**：允许组内折行）
- **现象**：375px 视口、集合页两列网格下，9 字符价格（演示店最贵档 `$3,428.55` / 划线 `$3,609.00`）的商品卡里，`.product-card__price-main` 实测 **136.0px**，而卡内容宽 **135.5–136px**（`(375 − 20×2 − 12) / 2 − 26`）——**临界**。主题字体（Montserrat 系）比探针用的 `-apple-system` 宽 ⇒ 实机上会溢出；320px 视口内容宽仅 ~108px，**必然溢出 28px**。卡内容溢出会顺着 grid item 的 automatic minimum size 传导成整页横向滚动（MEMORY"grid/flex item 横向溢出"同族）。
- **根因**：2026-10-29 定"现价与划线价绑成 `nowrap` 一组，换行点只在'价格块 / 折扣胶囊'之间"时，依据是"手机 106px 内容宽下合计 104.8px"——那是**短价格**（如 `$699.00` + `$749.00` 实测 111.3px，已超）的量值。价格位数一变（四位数 + 两位小数），这组就撑破容器，而 `nowrap` 让它无处可折。
- **影响面**：集合页 / 首页 featured-collection / 搜索页 / 各推荐位（共用同一张卡）；触发条件是「四位数价格 + 有划线价 + 窄屏」。

**修复（2026-11-18，方案 A）**

`.product-card__price-main` 的 `flex-wrap: nowrap` → `wrap`（`assets/product-card.css`），并在
`snippets/product-card.liquid` 的价格注释里写明行为变化。**没有**加 `min-inline-size: 0`：
这一组的 min-content 就是"最宽那个价格"，压到它以下会让现价自己溢出，属于把问题换个地方藏。

- **代价（明确记下）**：这是对 2026-10-29「绝不把两个价格拆开」的有意识修改——划线价在装不下时会落到第二行。只在装不下时发生，短价格逐像素不变。
- **验证**（`/tmp/probe6`，标记从 `snippets/product-card.liquid` 正则抽取、非手抄；`--page-margin: 20` / gap 12 / 两列）：

| 视口 | 卡内容宽 | `$3,428.55`+`$3,609.00` | `$699.00`+`$749.00` | `$1,299.00`+`$1,499.00` | 只有现价 | 整页横向溢出 |
| --- | --- | --- | --- | --- | --- | --- |
| 375 | 135.5px | 组高 42.8px（**已折行**，修复前 136.0px 溢出） | 组高 21.0px（单行，与修复前一致） | 组高 21.0px（单行） | 21.0px | **无**（`docScrollW=375`） |
| 320 | 108.0px | 42.8px（折行） | 42.8px（折行，修复前溢出 3.3px） | 42.8px（折行，修复前溢出 25px） | 21.0px | **无**（`docScrollW=320`） |

  所有卡片 `最大超出 = 0.0px`；`.product-card__unit-price` 在两种宽度都是单行 16px、宽 = 内容宽。
  截图（375，四张卡对照）：现价 / 划线价 / `Save N%` / 单位价 四层顺序在折行后仍然读得顺，无裁切。

- **候选修法（决策留痕，A 已采纳）**：
  - **A（最小改动，已采纳）**：`.product-card__price-main { flex-wrap: wrap }` —— 装不下时划线价自己落到第二行。代价：**正是当年刻意避免的"两个价格被拆开"**，但只在这组装不下时发生，正常价位零变化。落地时**去掉了候选里的 `min-inline-size: 0`**（理由见"修复"段）。
  - **B（保分组）**：窄屏用容器查询把 `.product-card__price-current` 降到 0.85rem、划线价降到 0.72rem，让 136px 缩进 108px。代价：价格字号随卡片宽度浮动，同一页可能两种字号。
  - **C（不改版式，只收口）**：给 `.product-card__price` 加 `overflow: clip`。**不推荐**：等于把划线价裁掉，信息丢失，比换行更糟。
- **预防**：① 价格类的"合计宽度"结论必须**按最长价格串（`$9,999.99`）算**，不能按当时看到的那几个价格算——写进卡内测量注释前先量最长值。这条同时提醒：CSS 注释里的"实测 xx px 放得下"必须写明**测量用的是什么数据**，否则下一轮换价格就失效。② 判"是否折行"别用 `top` 差 —— 同排的 `s`（0.78rem）与现价（0.95rem）是**基线对齐**，顶边天然差 3px，用 `top` 差 <2px 判会全部误判成"已折行"（本次先踩了一次）。判据用**组高**：单行 21px / 双行 42.8px。

### BUG-079 · 合规对账把「平台自动实现」判成「主题未实现」：G-05 图片焦点被列成 S1 缺口

- **日期**：2026-11-19 ｜ **状态**：Fixed
- **现象**：`task-compliance.md` 把「图片焦点（focal point）未实现」列为 **S1 拒审级**缺口，还据此排了一条「改动面最大」的 T-1.5（按 15 处会裁剪的地方逐个手写 `object-position`）。实际主题**早就支持**：`image_tag` 在有焦点时自动给 `<img>` 写内联 `object-position`，全站 18 处 `object-fit: cover` 全部在 `image_tag` 通道上。若按原方案执行，等于给平台已有行为加一层冗余，其中几处还会顶掉设计构图（集合 banner 的 `center right`、搜索 hero 的 `62% center`）。
- **根因**：判定依据是 `grep -rnE "focal_point|presentation"` 得 **0 命中**。0 命中只能证明「主题里没有手写消费点」，证明不了「平台没做这件事」。**用字样检索代替了机制核实**——与 §0.2 的 grep 多词陷阱同源，只是方向相反（那次把已实现误判成缺失，这次把平台能力误判成主题缺失）。
- **修复**：① 按官方机制重核：theme 开发文档「image focal points」的检查清单只有「用 `image_tag` 渲染」+「容器 `object-fit: cover`」，且明写「若提供焦点，`image_tag` 会加 `object-position` 样式」。② 找出唯一真洞并补掉：hero 移动端底图走 `<picture><source>`，`<source>` 不能承载 `object-position`，`<img>` 上带的是**桌面图**焦点 → 补 `--focal-m` + 749 断点 `!important` 覆盖。③ `snippets/image.liquid` 去掉 `image_url` 的 `crop` 传参（定死裁剪会让焦点失效）。④ 新建 `tools/check-focal-points.py`。
- **预防**：① 任何「主题不支持 X」的否定结论，先查官方文档里 X 的**生效条件**——是主题要做，还是平台自动做；首选查 `shopify.dev/docs/api/liquid/filters/<filter>` 与 `shopify.dev/docs/storefronts/themes/architecture/settings/input-settings`。② 判据固化成 `python3 tools/check-focal-points.py`：只查「有没有绕开 `image_tag`」，**不查 `focal_point` 字样**；改动任何 cover 图或 `<picture>` 后跑一次。③ 合规清单里凡是写「未实现」的行，必须同时写「怎么才算实现」（可执行的验收动作）——写不出验收动作，说明结论还没核到机制层。

### BUG-080 · `shopify theme package` 无视 `.shopifyignore` 的文件级规则，把仓库文档、备份与 `.DS_Store` 打进提交包

- **日期**：2026-11-19 ｜ **状态**：Fixed（打包流程加清理步骤）
- **现象**：`shopify theme package` 生成的 `Coppice-0.1.0.zip`（CLI **4.9.4**）里带了三样不该进包的东西：根目录 `AGENTS.md`（18.6 KB）、`config/settings_schema.json.bak-20261119`、以及 `assets/` `sections/` `locales/` 各一个 `.DS_Store`。共 5 个文件。若直接上传，商家装完会拿到我们的开发守则和一份 schema 备份。
- **根因**：`.shopifyignore` 里原本只有 `dev-docs/` `docs/` `minimal-repro/` 三个**目录**条目，它们确实生效了（dev-docs 没进包）。但本轮补的**文件级规则全部无效**——做过两次对照：① 写通配符 `*.bak*` 与 `.DS_Store`；② 写精确路径 `config/settings_schema.json.bak-20261119` 与 `assets/.DS_Store`。两次重新打包，这 5 个条目照旧在 zip 里。**结论：这个版本的 package 只按目录排除，文件级/通配符规则被忽略**（不排除其他版本行为不同，见预防②）。
- **修复**：打包后清一遍
  ```bash
  zip -d Coppice-0.1.0.zip "*.DS_Store" "*.bak*" "AGENTS.md"
  unzip -l Coppice-0.1.0.zip | grep -E "\.bak|DS_Store|\.md"   # 应为空
  ```
  清理后 171 个文件、顶层只剩 8 个主题目录。
- **根上的隐患**：`AGENTS.md` 进包这件事本身说明 **CLI 对根目录 `.md` 有内置的排除名单**（`README.md` / `CONTRIBUTING.md` / `LICENSE.md` / `CODE_OF_CONDUCT.md` 都没进，只有我们自己新增的 `AGENTS.md` 进了）。这个名单不公开，**新增任何根目录文件后都要重新验证一次包内容**，不能假定"上次干净这次也干净"。
- **预防**：① 打包必须走"打包 → `zip -d` → `unzip -l` 验证"三步，缺一步不算打完（已写进 `task-package.md` §7 第 3 步）。② 升级 CLI 后重跑一次对照实验：若新版开始支持文件级 `.shopifyignore`，可以去掉 `zip -d`，但**在没验证前不要删这一步**。③ 判断"包里有没有脏东西"只看 `unzip -l` 的输出，不看 `.shopifyignore` 写了什么——写了不等于生效。

### BUG-081 · 移动端集合页/搜索页 CLS 0.34：筛选表单"JS 就绪后才隐藏"，而就绪晚于首帧

- **日期**：2026-11-20 ｜ **状态**：Fixed
- **现象**：benchmark 店集合页移动端 Lighthouse **CLS 0.339**、Performance 71（同店其它五页 CLS 都 ≤0.005）。puppeteer 抓到的位移证据：`div.collection__content` 在 **2838ms** 从 `y=656, h=259` 变成 `y=259, h=656` —— 下方内容整体上跳 **397px**。
- **根因**：`assets/facets.css` 的移动端规则用 `collection-facets[data-facets-ready] .facets__form { display: none }` 控制"表单移入抽屉后不再占流内空间"。`data-facets-ready` 由组件的 `connectedCallback` 写入（`faceted-filters.js:255`），**晚于首帧**。于是：首帧表单按流内布局占约 397px → 组件就绪 → `display:none` → 全部商品卡上跳。这是"渐进增强"（无 JS 时表单必须流内可见）与 CLS 的正面冲突，当初只考虑了前一半。
- **为什么演示店没暴露**：演示店那页筛选源为空，表单根本没渲染，位移为 0。**只要有筛选条件的集合页必然触发**，属于商家装完就会遇到的问题。
- **修复**：门控换成 `html.js`（`layout/theme.liquid:5-7` 的内联脚本在首次绘制前加，原本就有），改两处：① `assets/facets.css` 的 `.facets__form { display: none }`；② `sections/collection.liquid` 的 `.facets__form-slot { padding: 0 }`（那条依赖 `[data-facets-ready]` 的 rule 会把 20px 内边距留到就绪后）。搜索页与集合页共用同一套 `<collection-facets>` + `.facets__form`，一并修好。
- **验证**：① puppeteer 复测 `total: 0, count: 0`，`content` 首帧即在 `y=259` 不动；② 禁 JS 复测：`htmlClass=""`、`.facets__form` `display: block`、高 378px、slot padding 仍是 `0px 20px 20px` ⇒ 渐进增强边界没变；③ Lighthouse 集合页移动端 **71 → 98**，CLS 0，LCP 2.3s。
- **预防**：① **任何"JS 就绪后才隐藏 / 折叠首屏内容"的 CSS 规则，门控必须是首帧前就能确定的东西**（`html.js` 这类内联标记，或服务端已定的属性），不能用组件生命周期里写的 `data-*`。判据：问一句"这个属性在第一帧存在吗？"——不存在就会跳。② `:defined` 也不够：`customElements.define` 在 defer 脚本里执行，仍晚于首帧。③ 新增/修改移动端折叠式组件后，跑一次 puppeteer 量 `PerformanceObserver` 的 layout-shift（脚本见 §验证），别只看 Lighthouse 总分——CLS 在总分里可能只扣几分，但它是硬线（目标 <0.1）。

### BUG-082 · 用带长度上限的正则查 `<img>`，"匹配 0 个"被当成"元素不存在"，误判首页 hero 无图

- **日期**：2026-11-20 ｜ **状态**：Fixed（结论已纠正，代码无改动）
- **现象**：检查 benchmark 店首页 HTML，声称 `<hero-slideshow>` 里"四个 slide 一张 `<img>` 都没有"，并据此判断"首页 93 分是上限估计、切图后要复测"。实际页面里有 **8 张**（4 张 `banner-bg*` 背景 + 4 张 `banner-island-*` 产品岛），Lighthouse 的 `network-requests` 也记录了它们当时全部下载过（62 KB / 118 KB / 91 KB…）。刘工贴截图指出有图，才发现判错。
- **根因**：脚本写的是 `re.findall(r'<img[^>]{0,200}>', seg)`。真实 `<img>` 带 `src` + `srcset`（多档 width）+ `sizes` + `width`/`height` + `style`，**标签长度远超 200 字符** ⇒ 一个都匹配不上，返回空列表。**"正则没匹配到"被直接读成"页面没有这个元素"**，中间缺一步验证。
- **修复**：无代码改动（页面本来就是对的）。改的是受影响的结论：`dev-docs/lighthouse/README.md` 里"首页 LCP 偏乐观"整段删除，改为"图已就位，93 分有效"。
- **预防**：① **判断元素是否存在，不要用带长度上限的正则**：要么 `grep -c '<img'`（只数标签开头），要么用 DOM（`document.querySelectorAll('img').length`），要么正则写 `[^>]*` 不设上限。② 任何"页面里没有 X"的结论，先自问一句「我的工具能不能看见 X」——超长属性、注释、转义实体都会让匹配静默失败。③ 这是 BUG-079 的同族第二次（那次是 `grep` 字样 0 命中被当成"平台没实现"，这次是正则截断），**"零结果"永远要先验证工具本身**。

### BUG-083 · 加购后抽屉先闪「Your cart is empty」，等第二次请求回来才变成商品行

- **日期**：2026-11-20 ｜ **状态**：Fixed
- **现象**：刘工截图。点商品卡 Add to cart，抽屉立刻打开，内容区显示空态文案 + 一个样式坏掉的「Continue shopping」按钮（白字带下划线、压在深绿胶囊上边缘、比胶囊还宽）；约一秒后自己变成正常商品行。
- **根因（两件事，只是同时在截图上出现）**：
  1. **空态是"请求拿到加购前的快照"**。`assets/quick-add.js`（product-form / supplies 同）派 `cart:added` 的时刻是 **fetch `/cart/add.js` 之前**（2026-10-16 为飞入动画不迟滞定的）。`cart-drawer._onAdded` 收到就 `_show()` → `_refresh()` 发 `?sections=`，这个请求与 `/cart/add.js` **并发**且常先到服务端 ⇒ 服务端读到的还是空车 ⇒ 返回的 HTML 就是空态。等 `/cart/add.js` 成功、`_syncCartCount()` 派 `cart:updated` 触发**第二次**刷新才对。也就是每次加购都必然先渲染一次错误内容（不是"旧内容没换"，是"新内容本身就是错的"）。
  2. **按钮坏是漏了排版类**。`.btn-solid` 只定义形状与配色（position / min-height 44 / border-radius / 背景 / 颜色 / 光晕），**display、居中、内边距、text-decoration 一律由用法方补**——全站 13 处用法每一处都补了，只有 `sections/cart-drawer.liquid` 的空态 CTA 是裸 `<a class="btn-solid">`。裸用渲染成 `display:block`、`min-height:44px`、`padding:0`、带 `<a>` 默认下划线的块，文字顶在上边缘、左右贴边。实测复现：`display:block / minHeight:44px / padding:0px / textDecoration:underline / alignItems:normal`。
- **修复**：
  1. `assets/cart-drawer.js`：`_onAdded` 改为**只挂骨架、不发请求**（`data-cart-loading` + 面板 `aria-busy`），刷新时机改挂 `cart:updated`——它由三处加购在 `/cart/add.js` 成功、`/cart.js` 查回 `item_count` **之后**派发，那一刻服务端已经是加完的购物车。补 `cart:add-failed` 事件（三条加购路径的 catch 各派一次）让失败时退出等待；12s 超时兜底自愈；`_refresh` 用 `finally` 收骨架 + 请求序号 `_refreshSeq` 丢弃过期响应；`_onOpen` 在 pending 期间不抢先刷新。
  2. `sections/cart-drawer.liquid`：新增 `[data-cart-skeleton]` 骨架（放在 `[data-cart-section]` **内部**，跟着整块替换，服务端那份也带着它）；`.cart-drawer__empty-cta` 补 `display:inline-flex / align-items / justify-content / padding`。
  3. `assets/critical.css`：`.btn-solid` 补 `text-decoration: none`（`<a>` 当按钮用时白字下划线会横穿胶囊底部；此前 13 处各自写过一遍，属于形状固有属性，上收到唯一出口）。
- **验证**：① 无头 Chrome 桩 fetch 跑时序：`cart:added` 后 150ms `loading=true / body=display:none / skeleton=grid` 且**零次 `?sections=` 请求**；`cart:updated` 后才出现请求，返回后 `loading=false / body=block / 骨架消失`；`cart:add-failed` 路径同样能退出骨架。② 空态按钮渲染实测：白字垂直居中、无下划线、左右 1.5rem 内边距。③ 骨架在 500px 视口量得 `left=20 right=480`（容器 500），不横向溢出。
- **预防**：① **"刷新内容"必须挂在写操作完成的信号上，不能挂在"点击即发"的信号上**。本项目 `cart:added` 是乐观事件（喂飞入动画的），`cart:updated` 才是事实事件（带服务端回查的真实 `item_count`）——凡是"要根据新数据重渲染"的消费方，一律只听后者。判据：问一句"这个事件派发时，服务端的状态改了吗？"没改就不能拿它当刷新触发。② **`cart:added` 的消费方必须能"等"**：现在契约是 added → (updated | add-failed)，新增加购路径两条事件都要派，否则抽屉会卡骨架（有 12s 兜底，但那是遮丑不是修复）。③ `.btn-solid` **不是完整按钮**，新增用法必须自带排版类；改动它之后跑一次空态/次级态截图，别只看主流程。④ 记录这类"闪一下"的问题要附实测时序表（请求发在哪、事件派在哪），否则下次只能靠肉眼复现。

### BUG-084 · 只抽一个文件就说"包内无注释"，漏掉 `templates/gift_card.liquid` 的 10 处

- **日期**：2026-11-20 ｜ **状态**：Fixed
- **现象**：刘工反馈"打包后的 `sections/collection.liquid` 还有注释"。核查后包内该文件确实是 0 注释（36,369 字节，与打包分支 md5 一致），但我顺着做**全包扫描**时发现 `templates/gift_card.liquid` 残留 10 处注释（3 个 `{% comment %}`、7 个 `/* */`、4 个 `{% # %}`）。上一轮我给出的结论是"包内 0 注释"——那个结论只基于 `collection.liquid` 一个文件的 `grep`。
- **根因**：两层。① 剥离脚本 `tools/strip-comments.py` 的 `LIQUID` 清单写的是 `sections/ snippets/ blocks/ layout/`，**漏了 `templates/*.liquid`**（该目录下只有 `gift_card.liquid` 一个 `.liquid`，最容易在写 glob 时被忽略）。② 验证时用**样本代替全集**：查了一个文件就对整个包下结论。
- **修复**：脚本补 `templates/*.liquid`；重新剥离后 `gift_card.liquid` 11279 → 8788 字节，全包 `grep -rlE "\{%-? *comment|/\*" --include=*.liquid --include=*.css --include=*.js` 输出为空。`task-package.md` §7 第 5 步加同一条整包扫描命令，脚本末尾提示同步改成四步。
- **预防**：① 任何"整个包 / 整个仓库都 X"的结论，必须用**全量扫描**支撑（`grep -rl` 遍历目标扩展名全集），**不能用抽样结果外推**。② 写"处理某类文件"的脚本时，扩展名清单要对着 `find . -name "*.<ext>"` 的实际结果核对一遍，而不是凭印象列目录。③ 这是同族第三次：BUG-079（`grep` 字样 0 命中当成"平台未实现"）、BUG-082（正则长度上限导致假 0）、本次（扫描范围不全）——共同点是**验证手段自身的覆盖面没被检查**。今后凡是"没有 X"的断言，都要能回答"我是怎么遍历完的"。

---

### BUG-085 · 产品页规格全空时仍留一个带顶线的空壳：`main-product__specs` 夹出「两条横线 + 一段空白」

- **日期**：2026-11-20 ｜ **状态**：Fixed
- **现象**：刘工截图（Northbark 40V 4.0 Ah Lithium-Ion Battery，配件）。买盒里 Add to cart / Buy it now 下方**两条水平分隔线之间是一段空白**，中间什么都没有；信任行（Free shipping / 30-day returns）本身正常。凡商品 metafield 全空（配件、新上架未填规格）必现。
- **根因**：`sections/main-product.liquid` 里容器判据写的是「有没有这个 block」，不是「这个 block 有没有渲染出东西」。`sections` 外层用 `has_spec / has_trust` 只扫 `block.type`；而里面 `snippets/spec-bullets.liquid` 在三条值（切割宽度/导板、动力、驱动方式）全空时按 SDD §5.7「不留空壳」**整段不输出**，`trust_warranty`（warranty 空/0）与 `trust_item`（text 空）同样如此。于是 `<div class="main-product__specs">` 里只剩一个空的 `<div shopify_attributes>`，它自带的 `border-block-start: 1px + margin 1.25rem + padding 1.25rem` 就变成两条线之间的 40px 空白。
- **修复**：`sections/main-product.liquid` 两段都改成 **先 capture 出内容、再按内容判定**：`{% capture specs_html %}` 包住 spec_bullets 渲染，`{% if specs_html contains 'class="spec-bullets"' %}` 才输出 `.main-product__specs`；信任组同理判 `class="trust-item"`。删掉 `has_spec / has_trust` 的预扫描循环（顺带消掉 UnusedAssign 隐患），trust 段缩进一并修正。判据说明与耦合点写进了代码注释（改 snippet 根类名必须同步这两处）。
- **验证**：`ruby` + liquid 5.3.0 桩渲染改动片段四例——A 规格全空+信任有值（截图场景：无 specs 容器、有 trust 容器）、B 都有（两个容器都出）、C 都空（两个都不出）、D 只有 spec block（都不出）；反向断言 B 用例三条 bullet 一条不少（`spec-bullets__item` × 3）。`shopify theme check`：0 error / 1 warning（`OrphanedSnippet` 对 `snippets/image.liquid`，属已知误报）。
- **预防**：① **装饰容器的显隐信号只能是"内容真的产生了"**，不能是"商家配过 block"。判据：容器只要带 `border` / divider / 额外上下 padding，而内容由 snippet 条件输出，就必须 capture 后按内容判——按 block 存在判等于在赌内容一定非空。② **capture 判空的坑**：capture 里若留着一个空的 `<div shopify_attributes>`，capture 本身就非空白，`!= blank` 永远成立；正确信号是「片段自己的根类名是否出现」，或干脆把空壳 `<div>` 也一起放进 capture 内部的条件分支里。③ **桩渲染要校语义差**（本轮踩到）：liquid gem 里 `x == blank` 对 `nil` **不成立**（Shopify 成立），第一次跑仿真把"缺值"当"有值"，四个用例全红、差点据此判断"修复无效"。凡是拿 gem 当 Shopify 跑的桩，`blank` → `nil` 必须显式替换，且用例里的"空"一律用缺失键表达，别用 `''`。
- **附带更正**：本文件此前出现两条 `### BUG-083`（「加购抽屉先闪空态」与「只抽一个文件就说包内无注释」），后者已就地更正为 **BUG-084**，编号接续。

---

### BUG-086 · FAQ 图列比问题列高出 70px：断点覆盖被基线规则反压

- **日期**：2026-11-20 ｜ **状态**：Fixed
- **现象**：新建 `sections/product-faq.liquid` 首版渲染（1440×900）里，右侧图片上下边比左侧手风琴多出约 70px，图列底部留一条突兀空白。效果图里两列是等高的。
- **根因**：桌面覆盖写成 `@media (min-width:990px) { .product-faq__media { aspect-ratio: auto; block-size: 100% } }`，但**基线** `.product-faq__media { aspect-ratio: 3 / 2 }` 写在样式块的靠后位置。媒体查询**不提高特异性**，两条同为 (0,1,0)，后写的胜出 ⇒ 桌面端的 `aspect-ratio: auto` 被基线吃掉，图仍按 3/2 撑高整行；`align-items: stretch` 其实已生效，面板被拉到同样高，只是它没有背景/边框，肉眼看不出被拉伸，于是只剩"图比卡片高"这一个现象。
- **修复**：`.product-faq__layout` 桌面端改 `align-items: stretch`（图列跟手风琴实际高度走，不再靠比例），并把 `aspect-ratio: auto` 的桌面覆盖移到 `.product-faq__media` 基线**之后**，就地写明"顺序依赖，放前面会被盖掉"。
- **验证**：`ruby tools/preview-product-faq.rb` 用真实 `{% stylesheet %}` + 真实标记渲染，无头 Chrome 1440×900 截图：图列与末张卡上下边对齐（top 135 / bottom 395 两侧一致）；375px（iframe 套层）截图无横向溢出、卡片单列、图 3/2。
- **预防**：① 在 `{% stylesheet %}` 里写**断点覆盖**，要么紧跟在被覆盖的基线之后，要么把基线本身写成"只在小屏生效"的分支——**同特异性下是源序决定胜负，媒体查询不加权**。这条对全站所有 section 样式块成立，写完用 `grep -n "aspect-ratio\|@media" sections/<x>.liquid` 顺一遍顺序。② 判"两列等高/对齐"不要靠肉眼看截图留白，**量 rect**：取左右两个元素 `getBoundingClientRect()` 的 top/bottom 是否相等。③ 媒体查询内的错误 theme check 一条都不会报，新增 section 一律跑一次 1440 / 375 双宽真渲染截图。

---

### BUG-087 · 手动点一下手风琴，自动播放就再也不动了

- **日期**：2026-11-20 ｜ **状态**：Fixed
- **现象**：刘工在产品页 FAQ 上手动点开一条问题后，进度条不再走、也不再自动跳到下一条，整块"死"在那里。
- **根因**：初版把"用户动过就永久停播"当安全网写死了——`click` 落在 `summary` 上就调 `_stopAutoplay()`，摘掉 `data-playing`（动画开关）并打 `data-stopped`。但自动播放**本来只依赖一个信号**：当前展开条的进度条动画跑完（`animationend`）就切下一条；而手动打开新条目时，选择器 `[data-playing] > details[open]` 会重新匹配，动画自己就从 0 开始了，轮播本来接得上。那条分支等于用一层状态把天然行为一票否决，而且不可恢复（没有任何"复活"入口）。
- **修复**：删掉 `click` 监听与 `_stopAutoplay()`（`data-stopped` 属性一并消失）。保留四路挂起：hover / focus-within（纯 CSS）、离开视口（IO）、标签页后台（visibilitychange）、`prefers-reduced-motion`。全部收起时没有展开项也就没有进度条动画，轮播自然停住；再点开任意一条即恢复。`sections/product-faq.liquid` 与 schema 的 `autoplay_info` 文案同步改成"手动打开 = 该条重新计时"，并把这次反转写进文件头，防止下次又加回去。
- **验证**：桩实测 8 条断言——初始 open=0 且在播；点开第 3 条后 `playing` 仍在、无 `data-stopped`、`animationName=product-faq-fill`（倒计时重启）；两次 `animationend` 走 2→3→0 回绕且始终只开一条；收起全部 → open=-1；再点开 → 动画恢复并继续推进。动画参数实测 `duration=6s / linear / forwards / transform-origin 左端`，来源是设置输出的 `--product-faq-interval: 6s`。
- **预防**：① 自动播放的"停"必须能指出**哪一步真的不该再动**；"用户碰过"不是理由——它顺带否掉了"碰过之后还想看轮播"这个更常见的诉求。真要停，就得同时给恢复入口。② 实现"停止类"逻辑前先回答：这个功能**靠什么信号推进**？若信号本身（动画结束）已经覆盖了手动交互，就别再叠一层状态去压制它——那层状态迟早变成"功能失效"。③ 自动播放的验收必须分三段：初始轮播 / 手动点开后是否继续 / 全部收起再打开是否恢复。只测第一段正好漏掉本次问题。

---

### BUG-088 · 手动开合手风琴后移开鼠标，自动播放不动了（两个叠加缺陷）

- **日期**：2026-11-20 ｜ **状态**：Fixed
- **现象**：在产品页 FAQ 上手动展开、收起、再展开，然后把鼠标移开，进度条不再走、也不再自动跳下一条。
- **根因（两个，都只在真浏览器里显形）**：
  1. **`:focus-within` 被点击留下的焦点永久点亮**。悬停/焦点暂停写的是 `.product-faq__panel:focus-within`，而鼠标点 `<summary>` 后 Chrome 会把焦点留在它身上（实测 `document.activeElement = SUMMARY.product-faq__summary`）。鼠标移开后 `:hover` 为假、`:focus-within` 仍为真 ⇒ `animation-play-state: paused` 一直挂着。
  2. **关掉再打开的条目会带着 finished 状态回来**。原先指望"重新匹配 `[data-playing] > details[open]` 选择器"就等于重启动画；实测打开的瞬间 `transform` 直接是 `matrix(1,0,0,1)`（满格）且不再派 `animationend`，于是轮播停摆——即使焦点问题修好，它也会在"收起再展开"这一步继续坏。
- **修复**：
  1. `sections/product-faq.liquid`：焦点暂停改成 `.product-faq__panel:has(:focus-visible)`。鼠标点击不匹配 `:focus-visible`（实测 false），键盘 Tab 仍匹配（实测 true）⇒ 只保留键盘用户需要的"可停"，鼠标路径不再被粘住。
  2. `assets/product-faq.js`：新增 `_restartProgress(item)`——`animation: none` → 强制一次重排（`void bar.offsetWidth`）→ 撤销内联值，让样式表里的动画真正从 0 重新开始。`_advance()` 打开下一条后调用它；`click` 落在 summary 上时延后一拍（原生 toggle 在 click 派发之后生效）对当前展开项调用它。
- **验证**：新增 `tools/probe-faq-autoplay.py`（CDP 驱动真 Chrome、真实鼠标/键盘输入、真实时间）：9/9 通过——初始轮播、静置一个周期自动切、点开后仍在播（`playState=running` 且 `focusVisible=false`）、点同一条收起全部、重新点开后 `scale=0.07`（从 0 重启而非满格）、移开鼠标再等一个周期继续切、Tab 聚焦暂停、点空白恢复、无 JS 异常。另跑连续三轮推进 1→2→3→回绕 0。`theme check` 对 product-faq 零命中（整包仅 1 条既有 `OrphanedSnippet` 误报）。
- **预防**：① **交互类验证不许只用事件桩**：`dispatchEvent(new MouseEvent('click'))` 不移动焦点、不产生 `:hover`，`--dump-dom` 不推进动画时间轴——这三个盲区正好覆盖了本次两个缺陷。凡涉及自动播放 / 悬停 / 焦点，一律用 `tools/probe-faq-autoplay.py` 这种"真 Chrome + CDP 真实输入 + 真实时间"的探针。② **`:focus-within` 不能用作"鼠标离开就恢复"的暂停开关**：点击会把焦点留在元素上。要区分输入方式就用 `:focus-visible`（鼠标 false / 键盘 true）。③ **"重新开始一段 CSS 动画"不能靠选择器重新匹配**，必须显式 restart（摘动画 + 强制重排 + 复位），否则会继承上一次的 finished 状态。

---

### BUG-089 · 规格表标题右侧的「Why specs can vary」像一段悬空绿字，点了说明还吊在表格外面

- **日期**：2026-11-21 ｜ **状态**：Fixed
- **现象**：产品页 Specifications 标题行右侧一段品牌色小字 `Why specs can vary`，看不出可点；点开后台说明挂在表格右上角外侧、把表格往下推。刘工一句「这是什么，直接删除吧，看起来很奇怪」。
- **根因（两处，都不报错）**：
  1. **`<summary>` 上写了 `display: inline-flex`**（当初为了 44px 触摸区 + 垂直居中）。Chrome 的默认三角标记只在 `display: list-item` 时渲染，`display` 一改就整块消失 ⇒ 可展开块退化成裸文本，affordance 归零。
  2. **说明文字挂在标题行的 flex item 内部**：`.product-spec-table__head` 是 `justify-content: space-between`，`<details>` 是它的第二个 flex 子项，展开的 `<p>` 只能长在右侧那一栏里——于是"解释表格的文字"被放在表格外面、且与被解释对象没有任何版面关系。
- **修复**：`sections/product-spec-table.liquid` 里把 `<details>/<summary>` 整块换成表格之后的静态 `<p class="product-spec-table__note">`（0.85rem / `--color-foreground-muted` / `max-width: 72ch` / 上边距 0.65rem）；删除 `.product-spec-table__note-summary` / `-note-text` 两个废弃类；删除已无消费点的 locale 键 `sections.product_spec_table.variance_label`。变体差异的披露本身**没有丢**（NB-21P 选 150cc 时规格表仍显示 166 cc，脚注负责说明）。对比页列头的 "i" 提示图标由 `assets/compare.js` 另建 DOM，不受影响。
- **验证**：从 section 抽真 CSS + 正则抽真标记，无头 Chrome 渲染桌面 1200 / 移动 390（`<iframe width="390">` 套一层）两档——脚注紧贴表格下方、移动端两行不裁切；`check-locale-keys.py` 两个命名空间全命中，`en.default.json` 剥注释头后 JSON 合法；`check-tag-balance.py` 对本文件零命中（其余 15 处为既有误报）。
- **预防**：① **`<summary>` 上加任何 `display` 都会吃掉默认三角标记**——要可展开就必须显式补一个可见标记（对比表用 "i" 徽标就是这么做的），否则等于静默删掉 affordance。② **解释某块内容的文字，位置由被解释对象的版面关系决定**：脚注就该在表格下方，不能塞进标题行的 flex 当第二个子项。判据——这段文字是否必须与某元素视觉紧邻？是则贴它，否则平铺成脚注。

---

### BUG-090 · 预览桩"成功"生成了一页没有 CTA 的截图，差点当成"功能没生效"

- **日期**：2026-11-20 ｜ **状态**：Fixed
- **现象**：为商品卡快速查看写 `tools/preview-quick-view.rb` 后，页面能生成、无报错，但整个卡片 CTA 区（含新加的 `quick-view`）**一个字都没输出**；同时卡片主图位置是一句 `Liquid error: wrong number of arguments`。若不是顺手 `grep` 了一眼，下一步就是拿这张"看着正常"的截图去判断样式。
- **根因**：三层叠加，且**都没有抛出**。① 桩用 `Liquid::Template#render` 渲染（默认 `render` 会吞异常，把错误降级成一句 `Liquid error` 落进 HTML）；② 桩漏传 `quick_add` 参数 → `{%- if quick_add -%}` 为假 → CTA 整块静默不渲染（真实调用方都传了，只有桩没传）；③ Ruby `<<~HTML` 是**双引号 heredoc**，注入 JS 里的 `\n` 先被 Ruby 解成真换行、把字符串字面量截断，自检脚本整段 SyntaxError 静默失效。
- **修复**：桩改成 `render!`（Liquid 报错当场炸掉，不许页面留 `Liquid error`）；`render_card` 补齐调用方真实参数（`quick_add` / `show_*` / `sizes`）；注入 JS 里一律不写反斜杠（换行用 `String.fromCharCode(10)`）；页内自检改用 `#test` 模式 + `--dump-dom` 读结果，逐条 PASS/FAIL。
- **验证**：`--measure` 能算出单卡面板 9.2 KB / 1.7 KB gzip；`#test` 模式 11 条断言全 PASS（开面板 / 售罄变体禁用 / 价格联动 / 缩略图切图 / 摘 srcset / 变体图跟随 / 加购成功收面板 / 加购失败保留面板 + 错误文案 / 订阅商品不弹窗）。
- **预防**：① 桩里**一律用 `render!`**（或 `Liquid::Template.error_mode = :strict`），并断言关键选择器数量（如 `assert html.include?('data-quick-view-open')`）——"页面生成了"不等于"你要验的东西在里面"。② 桩的渲染参数必须**照抄真实调用方**：少传一个布尔值就等于换了另一条分支，测的东西根本不是你改的那条。③ 往 Ruby heredoc 里注入 JS 时，反斜杠先被 Ruby 吃掉一层：字符串里的 `\n` 用 `String.fromCharCode(10)`，正则里的 `\s` 用 `[[:space:]]` 或字符类，写完先 `grep` 一眼产出文件确认没被截断。**2026-11-21 复发一次更隐蔽的**：桩脚本是 python 生成 ruby 源、ruby 再生成 HTML，`\(` 经两层转义落到浏览器里变成裸 `(`，正则未闭合 → **整段 `<script>` 语法错误、连 `load` 监听都没注册**，界面上表现为"什么都没发生"（不是报错）。对策：桩里的 JS 一律不写反斜杠，正则换 `indexOf`/`includes`；`#test` 已包 try/catch，异常会作为 `EXCEPTION ...` 写进结果行。

---
### BUG-091 · 抽出共享变体选择器时，顺手删掉了四个事件 handler（面板加购后再也不收）

- **日期**：2026-11-21 ｜ **状态**：Fixed
- **现象**：`assets/quick-view.js` 改造成"接 `<variant-picker>` 事件"后，桩测里"加购成功后收面板"变红：按钮已经进入 `added` 态、`status` 也写入了"added to your cart"，面板却一直开着；"加购失败保留面板"却仍然绿（因为它本来就不该关）。
- **根因**：替换"`_onChange` 到 `_syncUnitPrice` 之前"这一整段代码时，按**旧**的行号锚点做区间替换，而被替换区间里还躺着 `_onSubmit` / `_onCartUpdated` / `_onCartFailed` / `_onDialogClose` 四个 handler。它们被一起删掉后：`addEventListener('submit', undefined)` 静默无效 → `_submitted` 永远 false → 收到 `cart:updated` 也不收面板。**`node --check` 通过、theme check 也不管 JS**，只有跑桩才炸。
- **修复**：把四个 handler 原样补回，并在 `_onSubmit` / `_onCartFailed` 上补注释说明"标记只用来回答'这个 cart:updated 是不是我这次提交引起的'"。
- **预防**：① **删除后的插入锚点必须重算**（`MEMORY.md` §五第一条，这次又犯）；区间替换前先 `grep -n "_on[A-Za-z]* ="` 把区间内**所有**函数名列一遍，或改用"只替换包含唯一上下文的最小片段"。② 桩的断言要覆盖**每一条有副作用的出口**：这次正是因为"失败路径"的断言与"成功路径"共用同一个"面板不关"的表象，才掩盖了 handler 消失。③ 改完 `grep -c "addEventListener"` 与 handler 定义数对一遍。

---

### BUG-092 · 同一页两个快速查看弹窗，先打开的那个选项选中态被"顶掉"（radio 没有 form owner）

- **日期**：2026-11-21 ｜ **状态**：Fixed
- **现象**：桩页里同时渲染 3 张多变体卡，第一个弹窗的"1,600 W"胶囊明明带 `checked` 属性，视觉上却和其它两个胶囊一模一样（没有品牌色描边）；用探针读状态才发现 `input.checked === false`，而 `input.hasAttribute('checked') === true`。
- **根因**：`snippets/variant-picker.liquid` 用 `{% if form_id != blank %}form="{{ form_id }}"{% endif %}` 决定要不要写 `form` 属性。liquid gem 里 `blank` 被桩替换成 `nil`，而 `'' != nil` 为真 ⇒ 桩渲染出 `form=""`。`form` 属性一旦存在就**覆盖祖先 `<form>` 的归属**，`form=""` 指向不存在的 id ⇒ radio 变成"无 form owner"。同名 radio 的互斥组按「同一棵树 + 同一 name + **同一 form owner**」划分 ⇒ 页面上所有弹窗的同名 radio 落进同一个组，后渲染的 `checked` 把先前的顶掉。（平台侧 `'' != blank` 为假、不会输出该属性，所以线上没这个现象；但"空 form 属性"这条静默失效路径是真的。）
- **修复**：条件改成 `{% if form_id and form_id != '' %}`（Liquid 里空串为真、nil 为假，两种运行环境结论一致）；`variant-picker.liquid` 的 `@doc` 补一段"radio 必须始终有 form owner"的说明。
- **预防**：① 任何"同 name 的 radio/checkbox"都必须能指出它的 form owner 来自哪里（祖先 `<form>` 或有效 `form` 属性），**不允许输出空 `form` 属性**；桩断言里已加一条 `every(r => r.form !== null)`。② 判"选中态有没有生效"不能只看 HTML 属性，要读 `input.checked` 或 `getComputedStyle`（本次属性在、状态不在）。③ 桩的 `blank` 语义与平台不同，凡是用 `!= blank` 决定"要不要输出属性"的地方，写成 `x and x != ''` 更稳。

---

### BUG-093 · 点「Choose options」整页跳到顶部

- **日期**：2026-11-21 ｜ **状态**：Fixed
- **现象**：在集合页往下滚几百像素后点卡片上的「Choose options」，弹窗正常打开，但**整页滚回顶部**（桩测：`scrollY` 420 → 0）。
- **根因**：给 `.quick-view` 加 `position: relative`（为让底部固定条有个"定位上下文"）时，覆盖掉了 **UA 给 modal dialog 的 `position: fixed`**。于是面板回到文档流的正常位置（就在那张卡里），`showModal()` 聚焦时浏览器把它 `scrollIntoView` ⇒ 整页跳到那张卡（在页面顶部）。讽刺的是**视觉上看不出异常**：top layer 仍然把它画在视口中央。
- **修复**：删掉 `.quick-view` 的 `position: relative`。footer 的绝对定位不需要它 —— `<dialog>` 本身是 `fixed`，天然就是绝对定位子元素的包含块。文件里留了"⚠️ 不能写 relative"的注释。
- **预防**：① **不要覆盖 `<dialog>` 的 `position`**（要定位上下文时，先确认当前 `position` 是不是 UA 给的 `fixed`；`getComputedStyle(dialog).position` 一行就能看出来）。② 模态相关改动的验收里固定加一条**"滚动位置不变"**断言（现在桩里就有：`打开弹窗不跳顶 y0=420 y1=420`）——这类 bug 截图全绿、只有量 scrollY 才看得见。③ top layer 元素"看起来对"不等于"定位对"：它被画在视口里，但盒模型可能还在文档流中。

---

### BUG-094 · 插入新函数时抄丢锚点里的一行，`fillColumn` 的 forEach 头被吃掉

- **日期**：2026-11-23 ｜ **状态**：Fixed（自查阶段发现，未进产物）
- **现象**：给 `assets/compare.js` 加 `numberTokens` / `resolveNoteRow` / `buildNote` 三个函数时，第一次编辑后 `fillColumn` 变成 `function fillColumn(tbody, index, values) { const cell = tr.children[index + 1]; …` —— `tbody.querySelectorAll('tr').forEach((tr, rowIndex) => {` 整行消失，`tr` / `rowIndex` 全部悬空。
- **根因**：Edit 的 `old_string` 抄了三行（注释 + 函数签名 + forEach 头），`new_string` 只写了两行（注释 + 函数签名）。**纯插入场景下 old 与 new 行数不对称，等于删掉了没重打的那一行**。`node --check` 不会报（未定义变量不是语法错误），只有跑到 `fillColumn`（超范围商品补拉）才炸 ReferenceError —— 与 BUG-091 同一类，只是那次吃掉的是一段函数体，这次是循环头。
- **修复**：按 `sed -n '620,642p'` 的现状把那行补回，`node --check` 通过，函数头尾（签名 → `});` → `}`）复核完整。
- **预防**：① **纯插入时 `new_string` = 新代码 + 完整原样的 `old_string`**，锚点不重打——重打就会漏行；只有确实要改被替换内容时才让两者不等长。② 结构性编辑后立刻 `sed -n 'A,Bp'` 看被改函数的**头尾**，别只跑 `node --check`（未定义变量、丢一行循环头都是语法合法的）。③ 本条补上 BUG-091 预防①的缺口：那条只讲"删除后重算插入锚点"，没覆盖"new 少抄 old 的行"。

---

### BUG-095 · 对比页整页没有面包屑（集合页、产品页都有）

- **日期**：2026-11-24 ｜ **状态**：Fixed
- **现象**：`/pages/<group>-compare` 从页头对比图标、toast「Manage comparison」、商品卡勾选进来后，页面顶部直接是 `h1`，没有 `Home / …` 这一行。同一站内集合页（§5）与产品页（§6）都有，只有这张"深一层"的页面没有——从面向上看像进了个孤岛，回上一级只能靠浏览器返回键。
- **根因**：**工单没画，实现就没做**。`dev-docs/pages-ui.md` §7 的线框只画了「H1 + 选型文案 + 表格」，`sections/compare-page.liquid` 严格照图施工。而面包屑在 pages-ui 里**只给集合页写过一条规格**（line 245），产品页那条是当时代码里顺手加的、从未进文档 ⇒ 没有"每个页面都要有"的全局约定可对照，遗漏不会在任何检查里暴露（theme check 不管、tag balance 不管、截图不看不知道）。
- **修复**：`sections/compare-page.liquid` 加 `compare_breadcrumb`（capture 一次、四处输出：分组未配 / 集合缺失 / 商品不足 2 / 正常）。末项取同一个 `compare_heading`（设置覆盖 → `page.title` → 翻译兜底）保证与 `h1` 一致，并 `escape`；不给自己链自己，用 `aria-current="page"`。翻译键复用 `general.home` / `general.breadcrumb`（产品页同一对，**不新增键**）。样式与集合页同参：44px 触控盒、`align-items: center`、`/` 伪元素分隔、`--color-foreground-muted`。pages-ui §7 线框补上这一行 + 三条落地说明。
- **验证**：从 section 文件里提取真实 `{% stylesheet %}` 样式、用 liquid gem 渲染 capture（`Engine & Bar <Compare>` 正确转义成 `&amp;` / `&lt;`），再用无头 Chrome 两个视口（1200 / 500）实测：链接盒高 44、两项文字中心差 0px、面包屑左缘 = `h1` 左缘（80/80、60/60）、空状态里在 62ch 窄列内左对齐且不跟随居中、`scrollWidth - clientWidth = 0` 无横向溢出。`python3 tools/check-tag-balance.py` 对本文件无告警。
- **预防**：① **pages-ui 的每节线框必须画全"页面级 chrome"**——面包屑 / `h1` / 主入口三件套；线框里没有的东西，实现者（人或 Agent）不会补，**不画 = 决定不做**。② 开工新页面前先 `grep -rn 'general.breadcrumb' sections/` 把既有页面的骨架过一遍，缺哪件在工单里写明"本页不做 + 理由"。③ 同一件事写在两个地方就等于没写：翻译键眼下有 `general.home/breadcrumb`（产品页、对比页）和 `collections.breadcrumb_*`（集合页）两套并存，合并要动 `collection.liquid` + locale，**留待专门一轮**，别在改页面时顺手改（会连带断掉集合页已验证的 44px 对齐）。

---

### BUG-096 · 购物车数量框聚焦时，浏览器默认焦点框套在数字格外面、还溢出胶囊上下沿

- **日期**：2026-11-24 ｜ **状态**：Fixed
- **现象**：购物车行里的数量步进器（胶囊 + `−` + 数字 + `+`），Tab 进数字格后出现一个**黑色圆角方框**：比 40px 宽的数字格大一圈，上下各溢出胶囊边沿约 2px（刘工截图）。同一处 `−`/`+` 按钮聚焦时也是同一个黑框。
- **根因**：三处数量步进器（`assets/cart-line.css` 的 `.cart-line__qty*`、`sections/main-product.liquid` 的 `.quantity*`、`assets/product-card.css` 的 `.quick-view__qty*`）**从来没有写过任何 `:focus` / `outline` 规则**，输入格与按钮全靠 UA 默认焦点框（Chrome 计算值 `outline: 1px auto`，实际绘制是画在元素边界外的双色环）。容器只有 1px 描边、数字格 40×44 撑满内高 —— 默认环一画就顶出胶囊。同类控件一直没人报，是因为全站焦点样式都是各页面自己写的，只有这三处没写；而当天刚做「输入框形状统一」，注意力在圆角与边框色上，没把 outline 纳入验收。
- **修复**：把步进器当**一个**控件处理 —— 容器 `:focus-within` 给 `border-color: var(--color-brand)` + `box-shadow: 0 0 0 1px var(--color-brand)`（1px 边框 + 1px 外扩 = 2px 实环，与搜索抽屉、价格区间同一口径），内部 `-btn` / `-input` 的 `:focus-visible` 一律 `outline: none`。三处同步改，容器加 `box-shadow` 过渡。
- **验证**：`tools/probe-input-shape.py` 扩到 20 条（新增 cart-qty / cart-qty-btn / product-qty / quickview-qty + 通用断言「控件自身 outline-width 必须 0px」），**并做了反向验证**：临时删掉 `outline: none` 后探针立刻报 `✗ 控件自身还有默认焦点框（outline 1px auto）`，18/20 —— 证明这条断言不是恒真。还原后 20/20。
- **预防**：① **凡是"内部元素撑满容器"的复合控件**（数量步进器、搜索条、价格区间、分段选择），焦点环一律画在容器上、内部控件 `outline: none` —— 已写进 AGENTS.md §6。② 改输入/控件的形状或边框时，**验收清单必须包含"聚焦态"一项**：只检查静止态，默认焦点框永远看不见。③ 探针里那条通用 outline 断言对所有 case 生效，新加控件会自动被它盯住。

---

### BUG-097 · 一个从未被渲染的 snippet 被当成「已知误报」维护了 8 天
- **日期**：2026-11-25 ｜ **状态**：Fixed
- **现象**：`shopify theme check` 从 81 files 到 90 files 的历次验证里稳定输出 1 条 warning（`OrphanedSnippet` · `snippets/image.liquid`），每次验证行都照抄一句「既有误报」带过；11-17 还以「预防性修正」为名改过这个文件（去掉 `image_url` 的 `crop`）。11-25 重跑时 warning 变成 2 条（新增 `SchemaPresetsBlockOrder`），顺手核 `OrphanedSnippet` 才发现：**27 个 snippet 只报这 1 个**，`css-variables` / `meta-tags` 都没被报。
- **根因**：两层。① 结论来自 2026-10-10 的**真实事件**——同一版本整包报了 22 条 `OrphanedSnippet`，逐条核实后 8 个 snippet 全都有 `render` 调用（`image` 5 次），于是判定「该版本的引用扫描整体失效」，写成「已知误报」。② 之后各 section 重构为直接用 `image_tag` 输出图片，`snippets/image.liquid` 的最后 5 处调用全部消失，它变成**真孤儿**；但「误报」两字已经作为结论固化进 AGENTS.md，没人回头复核，于是这个标签越过了一个已经变化的事实。文件本身是 **Skeleton 自带的 LiquidDoc 示例**（`@example` 里自己 render 自己 3 次，看着像有调用方，实际没有），更不容易被怀疑。
- **修复**：`git rm snippets/image.liquid` ⇒ 预期 0 warning（历史上它从不是功能的一部分，全仓 0 引用；G-05 那条「`image_url` 别传 `crop`」的教训在 `tools/check-focal-points.py` 的 C 检查、`bugs.md` 的 G-05 条目、AGENTS.md §4 都有留档，不随文件消失）。同步改：AGENTS.md §2 的结论、`bugs.md` 里 10-10 那段的补注、`task-compliance.md` v1.8 变更行。
- **预防**：① **凡写「已知误报 / 已知问题」，必须带复核日期与复核方法**；下一次验证不重新核实就自动降级为「待复核」，不许继续照抄。② **warning 数的变化必须逐条解释**（这次 1→2 就是新发现入口：多出来的那条是新问题，不是既有的那条变严重了）——只看 `error = 0` 会漏掉它。③ 判定「工具误报」的前提是**能举出反例**（如「这条它报错了，但该文件确实被 render」），举不出反例就按真问题处理。

### BUG-098 · 横幅底图配了也不显示：`image_tag` 缺 width/height 时静默输出空串
- **日期**：2026-11-26 ｜ **状态**：Fixed
- **现象**：集合列表页新增横幅底图。`section.settings.hero_image` 有值、`hero--image` 修饰类渲染了、`hero-media` 容器也在，**但容器里没有 `<img>`**，横幅静默退回淡色带。无报错、无 404、`shopify theme check` 也不报，只能靠读渲染出的 HTML 发现。
- **根因**：`image_tag` 的 `widths` / `sizes` 只负责生成 `srcset` / `sizes`，**元素自身的尺寸仍必须由 `width` 或 `height` 参数提供**；两者都缺时 filter 直接返回空字符串（不抛错）。我按「给了 widths 就不用 width」写，而既有卡图的调用里本来就带着 `width: … , height: …`，所以这个前提从来没被暴露过。
- **修复**：补 `width: hero_image.width, height: hero_image.height`。
- **预防**：① `image_tag` 输出为空时，**先数参数里有没有 width/height**，再怀疑图片对象是否为空（顺序反过来会白查半小时）。② 已把这条写进 AGENTS §6 的图片规范行——`widths` 不能替代 `width/height`。

---

### BUG-099 · 移动端页头行里根本没有对比图标：`compare-entry` 在移动行漏渲染
- **日期**：2026-11-26 ｜ **状态**：Fixed
- **现象**：手机上（≤989px）页头行只有 ☰ / 搜索 / 购物车三个图标，清单里加了商品、角标该出现的位置**什么都没有**；桌面页头同一个位置有图标。☰ 抽屉底部那行「Compare products」倒是在。
- **根因**：`sections/main-nav.liquid` 只渲染了两处 `compare-entry`——桌面工具区（第 632 行）与 ☰ 抽屉底部（第 895 行）。**移动行（`.main-nav__mobile`）从头到尾没有这一行 render**。而 SDD §6.2.8 写明「桌面常驻；移动端仅在角标 > 0 时渲染」，`snippets/compare-entry.liquid` 的 docblock 也按这个口径写了「移动端仅角标 > 0 时显示，由 `data-empty` + CSS 控制」，**CSS 却只写了空态的弱化色、没写隐藏规则，标记也从来没插进去**——文档描述的是一个不存在的东西。`pages-ui.md` 第 54 行当时反向记成了「移动端页头不渲染」，与 SDD 冲突但没人对照，于是这个缺口被两份文档各自描述成「有意为之」。
- **修复**：① 移动行在搜索与购物车之间加 `{% render 'compare-entry', class: 'compare-entry--mobile' %}`（不包 `<ui-tooltip>`：触摸没有 hover，包一层还往 flex 行里塞一个 0 宽宿主）。② 新增 `.compare-entry--mobile[data-empty] { display: none }`——**限定 `--mobile`**，桌面那份 2026-11-15 定的是「常驻弱化」而不是隐藏，写成 `compare-entry[data-empty]` 会把它一起抹掉。③ 移动行 0.35rem 的触摸缝规则把 `.compare-entry` 一并纳入。④ 顺手修 `compare.js` 的 `findTarget()`：原来只取 `document.querySelector('compare-entry')` 的第一个（桌面那份，移动端被 `display:none` 包着 ⇒ 0×0 ⇒ 返回 null），**移动端的加入飞入动画一直是空转**；改成遍历所有 `compare-entry` 取第一个真有尺寸的。
- **验证**：新增 `tools/preview-mobile-header.py`（抽 `main-nav.liquid` 的真实 `{% stylesheet %}` + 同构 DOM，无头 Chrome 读 `getBoundingClientRect`，断言 6 条）跑 375 / 320 两档。空清单：`compare-entry` 计算值 `display: none`、不占位；计数 2：`display: flex`、44×44、角标显示「2」，375 档 搜索 278–322 / 对比 328–372 / 购物车 378–422，两档 `scrollWidth === clientWidth` 均不溢出。`check-locale-keys` 两个命名空间全命中；`check-tag-balance` 仍是那 11 条既有误报（`main-nav.liquid` 不在其中）。
- **预防**：① **「文档说有、代码没有」的检查点放在渲染层**：新增/改动涉及条件渲染的组件时，先 `grep -rn "render '<组件名>'"` 数清渲染点，再逐个对照文档列出的位置——这次一处文档（SDD）、一处注释（snippet docblock）、一处 CSS 注释（"移动端要走 ☰ 抽屉那行"）三份描述互相矛盾，谁都没错得离谱，合起来就是这个洞。② **同一个组件多处渲染时，判「可见的那份」不许用 `querySelector` 取第一个**（`findTarget` 这次就是被跨断点的隐藏副本骗了）；要按 `getBoundingClientRect()` 是否有尺寸筛。③ 移动行再增减图标时，按 375px 实测一遍 `scrollWidth === clientWidth`（本 bug 的核对稿可复用）。

---

### BUG-100 · 快速查看里加购：弹窗与购物车抽屉同框数百毫秒，抽屉还是半截矮条弹出

- **日期**：2026-11-26 ｜ **状态**：Fixed
- **现象**：移动端商品卡「Choose options」弹窗里点 Add to cart，上半截仍停在快速查看（商品标题、价格、"was added to your cart"），下半截已经冒出 "Cart (29)" 抽屉，两截拼在一起、整屏发暗；过一会儿弹窗才滑走。同时抽屉只以一根约 340px 的矮条贴底弹出，等商品行刷回来才猛地长到 85vh —— 看起来"位置不对"。
- **根因**：两条时序不同步，各自都"按设计"在跑。① `cart:added` 是在 `fetch(/cart/add.js)` **之前**派发的（quick-add / product-form / supplies 三处同口径，为的是飞入动画不迟滞），`cart-drawer._onAdded` 收到就 `_showPending()` 把抽屉 `showModal()` 出来；而快速查看面板要等 `cart:updated`（`/cart/add.js` + `/cart.js` 两个来回之后）才 `close()`，还要再播 0.22s 滑出。这 400–600ms 里两张 modal dialog 同时在 top layer 上，后开的抽屉把已打开弹窗的遮罩再压一层。② 抽屉移动端是 `block-size: auto`，骨架只有两行 80px 高，所以第一帧的高度由骨架决定（实测 314px），与最终 85vh 差一倍多。
- **修复**：① `assets/cart-drawer.js` — `_onAdded(event)` 先认来源：`detail.button.closest('quick-view')` 命中时不立刻开抽屉，只 `_beginPending()`（骨架与 12s 兜底照旧起算）+ `_openAfterClose(dialog)` 排队等该 panel 的 `close`；close 是 `<bottom-sheet>` 播完滑出、真正 `dialog.close()` 的那一刻，在它的处理里同步 `_show()`，浏览器不绘制"两个都不开"的中间帧（`html:has(dialog[open])` 的滚动锁不抖）。`_onAddFailed` 里 `_cancelQueuedOpen()` —— 失败的加购要留弹窗显示错误（quick-view 的 `_onCartFailed` 刻意不收），抽屉不能跟着冒出来。② `sections/cart-drawer.liquid` — 移动端 `.cart-drawer__dialog:has(.cart-drawer__footer)` 与 `cart-drawer[data-cart-loading] .cart-drawer__dialog` 锁成 `block-size: 85dvh`（footer 只在 `item_count > 0` 时渲染，两条合起来覆盖"已有商品"和"骨架等待"两种态）。空车仍是 auto —— 那是一句话加一个按钮，撑满整屏更难看。用 `dvh` 不用 `vh`：地址栏展开时 85vh 会低于可视线，抓手和标题会被切掉。
- **验证**：`/tmp/cvdemo/` 用真实 `critical.css` + `cart-drawer.liquid` 的 `{% stylesheet %}` + `product-card.css` + 三个真实组件（`bottom-sheet.js` / `cart-drawer.js` / `quick-view.js`），桩掉 `fetch` 与 product-form 的两段延时（220ms + 160ms），无头 Chrome 390×844 每帧采样 `dialog[open]` 与 `getBoundingClientRect` 对比 HEAD 与工作区：修复前两浮层**同框 600ms / 29 帧**、抽屉高度 314→717 跳变；修复后**同框 0 帧**，弹窗滑出结束（t=650）下一帧抽屉才从 bottom 844 滑到 127，高度恒定 717。另验三条边界：空车首次加购（先摘掉 footer）高度取值只有 `[717]` 不跳；加购失败后抽屉不弹、事后手动关弹窗也不弹；产品页买盒（不在 quick-view 内）300ms 内照旧开抽屉。桌面 1280×900 同框 0 帧。`shopify theme check` 92 files 0 offenses。
- **预防**：① **"点击即发"的乐观事件（cart:added）只能承担无状态的视觉反馈**（飞入动画、角标），任何**有状态的浮层**都不该由它触发——它早于结果，必然和"结果驱动"的浮层抢同一个时间窗。要开浮层就挂结果事件（cart:updated）。② 多浮层页面里，**先后顺序用对方组件的 `close` 事件表达，不要复制动画时长常量**（`bottom-sheet` 已经把时长、兜底、动画名收在自己身上，抄一份必然漂）。③ **底部抽屉的高度不能由骨架决定**：骨架是"最少内容"，内容型高度会让第一帧与最终帧差一倍；要么给 loading 态锁高，要么按"是否已有内容"分支锁高。④ 复现脚本留在 `/tmp/cvdemo/`（`build.mjs` + `run.mjs` + `run2.mjs`），下次动这两个组件的时序先跑一遍：`重叠帧数` 必须为 0。
- **同日改口径 · 第二版（2026-11-26，刘工）**：要求改成「加购后抽屉直接弹出来、快速查看弹窗**不收**，保持覆盖」。于是 `cart-drawer.js` 的 `_onAdded` 回到 `_showPending()`（那一刻就开），排队等 close 的整套 `_openAfterClose` / `_cancelQueuedOpen` 删除。**能这么做的前提是抽屉必须比弹窗高** —— 移动端两者都锁 `88dvh`（`sections/cart-drawer.liquid` 的 `block-size`/`max-block-size` 与 `assets/product-card.css` 的 `.quick-view` max-height 逐字对齐），第一帧就整块盖住，看不到拼接。两处配套：① **桌面端**抽屉是右侧 26rem 窄栏、盖不住居中弹窗（两个浮层并排、弹窗被第二层遮罩压暗），所以 `quick-view.js` 按 989.98px 分流，桌面仍收面板；② **失败时**抽屉会盖住面板上的错误文案，`cart-drawer.js` 用 `_autoOpened` 记住"这次是加购自动叫出来的"，原路收回（顾客自己点开的只刷新不收）。
- **预防（第二版，取代上面的 ①/④）**：**「两个浮层同框」能不能接受，判据是"上层能否完全盖住下层"**，不是"先后顺序"。盖得住时同框优于串行（省掉 0.5s 的关+开、关掉抽屉还能落回原处）；盖不住就是两截拼接。因此这条判据必须是**写死的几何**（两者同为 88dvh）而不是"感觉够高"，且改任一边的高度都要同时改另一边 —— 两个文件的注释里已互相点名。复现脚本 `/tmp/cvdemo/run6.mjs`（覆盖判定：`cart.top <= qv.top`，并断言骨架期高度恒为 88dvh）与 `run8.mjs`（成功 / 失败 / 手动开抽屉三条路径），动时序或高度先跑这两个。

---

### BUG-101 · 快速查看第二次打开，上次那句 "was added to your cart" 还留在按钮下面

- **日期**：2026-11-26 ｜ **状态**：Fixed
- **现象**：移动端快速查看弹窗首次打开时没有那句提示；加购成功后按钮下方出现灰色一行「Northbark … was added to your cart」；关掉再打开同一个弹窗，它**还在**，紧挨着 Add to cart/Added 按钮与 Buy it now。同一个弹窗还出现第二个残留：按钮文字也永久停在 "Added"。
- **根因**：两处"只写不清"，都靠"初始为空"这个假设过日子。① `ProductForm._announce()` 写成 `if (this._status && message) this._status.textContent = message`，**空串被这个 if 吃掉**，所以没有任何一条路径能把文案撤掉；`:empty { display: none }` 的隐藏从此永久失效。② `ProductForm._reset()` 写成 `if (!this._button.dataset.addLabel)` 才恢复文字 —— 两处渲染点（`sections/main-product.liquid:531`、`snippets/quick-view.liquid:319`）**都带** `data-add-label`，这个分支永远进不去，按钮就永久停在 "Added"。弹窗是"关掉还留着 DOM、下次只 showModal"的形态，两个残留都会带进下一次。
- **修复**：① `_announce()` 改为无条件写入（空串 = 撤掉播报）。② 成功文案与按钮「已加入」同寿：`_revertTimer` 的回调改成先 `_announce('')` 再 `_reset()`；**失败路径不清**（错误提示要留在眼前，见 catch 里那条顺序）。③ `_reset()` 把按钮文字与可用性交还 `<variant-picker>`：把 `_apply()` 里那段按钮逻辑抽成 `_syncButton(variant)`，新增公开的 `syncButton()` 按当前选中变体重放一次。查找用 `closest('[data-variant-scope]')` 而不是 `this.querySelector` —— 产品页的 `<variant-picker>` 在 `<product-form>` **外面**（`main-product.liquid` 467 vs 469 行），只有快速查看那份在 form 内。
- **验证**：`/tmp/cvdemo/`（`build.mjs` 改成真实 `product-form.js` + 真实 DOM 结构，`run3.mjs` / `run4.mjs` / `run5.mjs`）对比 HEAD 与工作区。快速查看：修复前"回退后"文案仍在、二次打开 `h=30`（两行，正是刘工截图）且按钮 "Added"；修复后回退即清空、二次打开 `display:none`、按钮回 "Add to cart"。失败路径：错误文案在面板上保留（`h=15`），关掉再打开清空。产品页买盒单独同构页（`build2.mjs` + `run5.mjs`，variant-picker 放在 product-form 外）：修复前回退后仍 "Added" + 文案残留，修复后回 "Add to cart" + 清空。**反向验证**：加购后 2.5s 窗口内切到售罄变体，修复后回退仍是 "Sold out" + `disabled=true`，修复前是 "Sold out" 但 `disabled=false`（原代码 `disabled = false` 无条件执行，会把售罄变体改回可买）—— 顺手堵上了。`shopify theme check` 92 files 0 offenses。
- **预防**：① **"初始为空所以不用清"是隐性契约**：凡 `:empty` / `:has()` 靠"元素里没有内容"表达状态的组件（播报容器、空态占位、角标），必须有一条**显式的清空路径**，且清空函数不能把空串当"没有参数"。② **写 `if (!dataset.xxx)` 分支前先 grep 渲染点**：判断"某属性是否存在"的分支，属性在两处渲染点都常驻时就是死代码——这次死分支让按钮文字永不恢复，而注释还写着"回到加购/售罄"。③ **保留状态的开关（按钮文案、可用性）只认一个真值来源**（这里是 `<variant-picker>` 的当前变体）；宿主自己拼 `textContent = addLabel; disabled = false` 会覆盖掉用户在这段时间里的变体切换。④ 跨组件找元素用**约定的作用域锚点**（`[data-variant-scope]`），不要用 `this.querySelector` —— 两个宿主的 DOM 嵌套关系不一样。

---

## 记录模板（追加新 bug 用）

> **编号纪律**：新增前先 `grep -n "^### BUG-0" dev-docs/bugs.md | tail -3` 取最大号 +1。
> 2026-11-21 出现过两条记录同时用 088（两个会话并行写作），后来把后写的那条补成 090 ——
> 补号会上浮，别以为"文件最后一条 = 最大号"。

```
### BUG-NNN · 一句话现象
- **日期**：YYYY-MM-DD ｜ **状态**：Open / Fixed
- **现象**：
- **根因**：
- **修复**：
- **预防**：（必须可执行：改流程 / 改文档 / 加检查，不写"注意"）
```
