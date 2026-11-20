# 主题文档站与支持渠道 — task-docs.md

> **性质**：`theme_info.theme_documentation_url` 指向的文档站的建设清单。拆自 `dev-docs/task-package.md` §3（P0 主题元信息）。
> **权威关系**：与 SDD 冲突以 `dev-docs/sdd.md` 为准；本清单只解决"文档站从无到可访问"。
> **版本**：v1.0 ｜ 建立日期：2026-11-19 ｜ 不含工期（沿用 `task-footer.md` 的口径，避免无实测支撑的人日数字）
> **前置决定（2026-11-19 刘工拍板）**：文档站落 GitHub Pages；支持渠道用邮箱 `hncu1900@gmail.com`（不另设 support URL）。

---

## 0. 为什么必须做（不是加分项）

`theme_info` 五个字段全必填，`theme_documentation_url` 是其中之一。扣分点不在于"填了什么"，而在于**审核方点进去看到什么**：

| 现状 | 审核方的解读 |
| --- | --- |
| `help.shopify.com/manual/online-store/themes`（原值） | 指向平台自家主题总览页，这套主题一字未提 → 判定"未提供文档" |
| 填了但没建站的"预定地址" | 比原值更糟——原值至少能打开 |

**当前状态：已解除（2026-11-19）。** 站点 `https://littleluckly.github.io/coppice-docs/` 已上线，`curl` 返回 **200**。

> **真源在独立仓库，不在主题仓库里**：本地克隆 `/Users/mac/workspaces/coppice-docs/`，`git push` 后 Pages 自动构建（SSH 通道 `git@github.com` 已实测可用，无需手动网页上传）。
> 原先放在 `dev-docs/docs-site/index.html` 的副本已删除——同一份文件两处存在必然漂移，主题仓库只留本清单。

---

## 1. 发布方式（2026-11-19 已定：独立仓库 `coppice-docs`）

建一个**公开**仓库 `littleluckly/coppice-docs`，Pages source 设为 **`master`** 分支根目录（`/`）。公开仓库开 Pages 免费，站点地址固定为 `https://littleluckly.github.io/coppice-docs/`。

> ⚠️ **这个仓库的默认分支是 `master`，不是 `main`**（2026-11-19 建库时 Pages 下拉实测）。GitHub 新账户默认 `main`、老账户沿用 `master`，照抄别处教程会选错分支——下拉里没有 `main` 就是这个原因。

被否掉的两条路，记在这里免得下次重走：

| 方案 | 为什么不选 |
| --- | --- |
| 同仓库 `/docs` 目录 | **名字被占**：`docs/` 已装内部物料（`demo-store/`、`design/`、`merchant-compare-setup.md`、一份交接记录），Pages 目录发布只支持「仓库根」或「`/docs`」两个位置，没有第三个；腾位置要搬 6 个文件并改 `task-index.md` 等处引用 |
| 同仓库 `gh-pages` 分支 | URL 能保持 `/coppice/`，但要用 worktree 维护第二分支，单人操作**容易把未提交的主题改动带过去**，事故成本高于收益 |

选独立仓库换来的：主题仓库零污染、**天然不可能被打进主题 zip**、文档更新与主题提交互不干扰。付出的代价：两个仓库、URL 从 `/coppice/` 变成 `/coppice-docs/`。

> 仓库必须是 **public**。私有仓库开 Pages 需要付费计划（Pro/Team），而文档站本来就要给商家看，公开没有损失。

---

## 2. 站点骨架（独立仓库根目录）

```
coppice-docs/          ← 独立仓库，Pages 按 master 分支根目录发布
  index.html           ← 概览 + 指向其余页面的入口
  install.html         ← 安装
  settings.html        ← 主题设置（preset / logo / 配色 / 字体）
  sections.html        ← 各 section 的设置项说明
  metafields.html      ← 数据前置：商家必须自建的 metafield
  faq.html             ← 常见问题 + 支持方式（邮箱必须与 theme_info 一致）
  changelog.html       ← 版本记录
  assets/style.css     ← 单文件样式，不引外部 CDN
  README.md            ← 给仓库自己看的维护说明（说明这是 Coppice 的商家文档站）
```

硬性要求：

- **不引任何外部 CDN 资源**（字体、图标、框架）——文档站虽然是站外资产不受主题红线约束，但审核方可能顺带看加载是否干净。
- **不复制主题源码片段**作为卖点展示（避免与提交包内容产生"两套真源"）。
- 文档里的支持邮箱必须与 `config/settings_schema.json` 的 `theme_support_email` **完全一致**（`hncu1900@gmail.com`），改一处必须改另一处。
- 站点页脚署名统一为 **`Coppice Studio`**，与 `theme_author` 保持一致（文档站写的作者名和主题包里的对不上，是个廉价的可疑点）。

---

## 3. 内容清单（审核真正会扫的六块）

- [ ] **概览**：这套主题面向谁（OPE / 园艺机械）、演示店链接、主要特性一句话一条
- [ ] **安装**：Theme Store 安装路径 + zip 上传路径（两条都要写，审核用后者）
- [ ] **首次设置**：两个 preset（`Coppice` / `Coppice Noir`）的区别；logo / 配色 / 字体在哪改
- [ ] **数据前置**（最容易漏、也最容易被判"装完是坏主题"）：`spec.*` metafield 定义清单 —— 商家不建这些，规格表就是空的。直接对齐 `dev-docs/metafield-reference.md`，但**只写商家该做什么**，不抄字段全部定义表
- [ ] **页面与 section 说明**：每个 section 干什么、关键设置项、留空的后果
- [ ] **FAQ + 支持**：常见安装/显示问题；支持邮箱；明确"文档未覆盖的问题走邮箱"

**已知必须写进文档的降级项**（SDD §3 的推论，装完即 404 的风险点）：

- 主题包带不了页面/商品/集合/博客 → 联系页、关于页、集合页需商家自建，装完不建就是 404
- 对比页、搜索、账户页依赖平台页面存在
- 未填 metafield 的兼容性表现（显示 `—`，不显示 0）

---

## 4. 验收线（提交前逐条过）

- [x] 仓库 `littleluckly/coppice-docs` 已建且为 **public**，Pages 已启用（source = `master` / 根目录）✅ 2026-11-19
- [x] `curl -I https://littleluckly.github.io/coppice-docs/` 返回 **200** ✅ 2026-11-19
- [x] 首页在移动端（375 宽）可正常阅读、无横向滚动 ✅ 实测（无头 Chrome + 375 iframe；三列表格在窄屏已改为堆叠块，避免 "Single line text" 被挤成三行）
- [ ] 六块内容齐全 —— **初版单页覆盖 4/6**：install / first setup / product data / content-to-create 已写；**缺 sections 逐项说明 与 changelog 独立页**
- [x] 页面里出现的支持邮箱 = `theme_info.theme_support_email`（`hncu1900@gmail.com`）✅
- [x] 文档站是独立仓库 ⇒ **天然不在**主题提交 zip 内，无需额外检查（选独立仓库的理由之一）
- [x] 文档里不出现真实品牌名（示例句里的 "if the figure excludes the battery" 不涉品牌；`Kobalt` 之类未出现）✅

---

## 5. 与提交的关系

- **硬阻塞**：文档 URL 404 时不要提交 —— 这一条会以"信息不实/文档缺失"进拒审意见，且修完要重新排审核队列。
- **软关联**：`theme_version` 每次提交升号时，`changelog.html` 同步加一条（后台主题卡显示的版本号与文档记录对不上，是个廉价的可疑点）。
