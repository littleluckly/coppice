# Coppice 对比功能 · 商家配置指南

> **给谁看**：使用 Coppice 主题的店主 / 店铺运营。全程在 Shopify 后台操作，不需要改代码。
> **要多久**：第一次配 4 个分组约 30–40 分钟，之后维护几乎为零。

---

## 先理解一件事：为什么需要你配置

对比功能不是装完主题就能用的，因为**它需要三样东西互相认识**：

```
   商品上的标记          一个装商品的篮子            一个给人看的页面
 spec.compare_group  ←→  对比集合（collection）  ←→  /pages/<分组>-compare
       ↓                        ↓                          ↓
  "这台是链锯"            "所有链锯都在这里"          "链锯对比表"
```

- **没有商品标记** → 商品卡上不会出现「Compare」按钮
- **没有集合** → 对比页不知道拿哪些商品去比，只会显示一句提示
- **没有页面** → 页头不会出现对比图标，顾客没有入口

主题会用页面的 handle（网址里那段）自动认出这是哪一组的对比页，所以你**只要把标题起对，其他不用管**。

---

## 第一步：给商品打上分组标记

这一步决定「哪些商品能互相比较」。

1. 后台进入 **Products**，打开一个商品
2. 拉到最下面的 **Metafields**（元字段）区域
3. 找到 **Spec** 分组里的 **Compare group**（对比分组），填入下面的键名之一

**v1.0 内置的四个分组键**（必须一字不差，全小写、用连字符）：

| 分组键 | 对应商品 |
| --- | --- |
| `walk-behind-mower` | 手推式 / 自走式割草机 |
| `riding-mower` | 骑乘式割草机 |
| `chainsaw` | 链锯 |
| `string-trimmer` | 打草机 / 割灌机 |

4. 保存。**重复到所有要参与对比的商品**（批量改可以用产品 CSV 导入，列头写
   `Compare group (product.metafields.spec.compare_group)`）

> **如果找不到 Compare group 这一栏**：说明店铺还没建这个 metafield 定义。到
> **Settings → Custom data → Products → Add definition**，命名空间填 `spec`、键填
> `compare_group`、类型选 **Single line text**，保存后回到商品页就能看到了。

**两个可选的字段**：

| 字段 | 什么时候填 |
| --- | --- |
| **Compare hidden** | 勾上后这个商品完全不出现在对比入口（停产款、订制品） |
| **Spec variance note** | 这台机器的参数随规格变化时，写一句说明（如「切割宽度随机型不同：20 in 或 22 in」）。对比表会在表头显示一个 ⓘ，点开能看到这句 |

---

## 第二步：建四个对比页

1. 后台 **Online Store → Pages → Add page**
2. **Title 按这个规律写**（这是最关键的一步）：

   | Title 写 | 自动生成的 handle | 对应分组 |
   | --- | --- | --- |
   | `Walk-Behind Mower Compare` | `walk-behind-mower-compare` | `walk-behind-mower` |
   | `Riding Mower Compare` | `riding-mower-compare` | `riding-mower` |
   | `Chainsaw Compare` | `chainsaw-compare` | `chainsaw` |
   | `String Trimmer Compare` | `string-trimmer-compare` | `string-trimmer` |

   > 规律就一条：**`<分组键>` + ` Compare`**。主题会把结尾的 `-compare` 去掉，
   > 剩下的就是分组键。标题写对了，handle 自动就对，**不需要手动改 handle**。

3. 页面**内容留空**（表由主题自己渲染）
4. 右侧 **Theme template** 下拉里选 **`page.compare`**
5. 保存

四个页面重复一遍。

> **配好之后，每个页面的正文区可以在主题编辑器里加一句「选型建议」**
> （Customize → 切到该页面 → Compare page → Choosing guide）。
> 这句话会显示在对比表上方，用来解释「这组里怎么挑」，对转化很有用。

---

## 第三步：建四个集合，并在主题设置里挂上

对比表要拿商品数据，只能通过集合（Shopify 的商品查询限制，不是主题的选择）。所以每个分组建一个集合。

### 3a. 建集合

1. 后台 **Products → Collections → Create collection**
2. Title 与 handle 随意，但建议好认（如 `Chainsaws`）
3. **Collection type 选 Automated（自动）**
4. 条件设成：**Compare group** `is equal to` `chainsaw`（换成对应分组的键）
5. 保存

> 用**自动集合**的好处：以后新增商品只要填了分组键，会自动进这个集合，不用手动维护。
>
> 如果你的 metafield 条件下拉里找不到 `Compare group`：回到 **Settings → Custom data →
> Products → Compare group**，在 **Options** 里勾上 **Use as a condition in collections**。

### 3b. 给集合声明它属于哪个分组

1. 打开刚建的集合，拉到最下面 **Metafields**
2. 找 **Compare group**（命名空间 `custom`），填**分组键**
3. 保存

> ### ⚠️ 这一步最容易填错
>
> 填的是**分组键**，不是页面网址、也不是页面标题里的那个字符串：
>
> | 分组 | ✅ 填这个 | ❌ 不是这个 |
> | --- | --- | --- |
> | 链锯 | `chainsaw` | ~~`chainsaw-compare`~~ |
> | 骑乘式割草机 | `riding-mower` | ~~`riding-mower-compare`~~ |
> | 手推式割草机 | `walk-behind-mower` | ~~`walk-behind-mower-compare`~~ |
> | 打草机 | `string-trimmer` | ~~`string-trimmer-compare`~~ |
>
> 混了也不会坏（主题会自动去掉 `-compare` 再比对），但统一用分组键，以后排查省事。
> **填错的症状**：对比页显示 `No product collection is linked to this comparison group yet.`
>
> 如果这个字段不存在：**Settings → Custom data → Collections → Add definition**，
> 命名空间 `custom`、键 `compare_group`、类型 **Single line text**。
>
> **为什么还要填一遍**：主题靠它认出「这个集合是给哪一组的」，而不是靠集合名字。
> 集合改名字不会影响对比功能。
>
> **但如果这个字段是空的**，主题会退回去拿**集合的 handle** 跟分组键比对。此时名字就有关系了：
> 集合标题写 `String Trimmers`（复数）→ handle 是 `string-trimmers`，
> 而分组键是 `string-trimmer`（单数）→ **差一个 s，静默不匹配**，
> 对比页照旧显示「未链接集合」。所以：**要么把这栏填上（推荐），要么集合标题用单数 `String Trimmer`**。
> 同理 `Chainsaws` 的 handle 是 `chainsaws`，也与分组键 `chainsaw` 差一个 s。

### 3c. 在主题设置里挂上

1. **Online Store → Themes → Customize**
2. 左侧齿轮 **Theme settings** → 找到 **Compare** 分组
3. **Comparison collections** → 把你建好的 4 个集合**全部选进来**
4. 顺手检查这两项：
   - **Products in the default table**：没选过商品的访客看到几款（默认 3）
   - **Allow search engines to index comparison pages**：不想被搜索引擎收录就关掉
5. 保存

---

## 配完的验证清单

按顺序查，哪一条不过就看下一节的排错表。

- [ ] 任意商品页 → 商品卡上有 **Compare** 按钮 → 说明第一步做对了
- [ ] 页头右上角（购物车左边）出现**双向箭头图标** → 说明第二步做对了
      · **手机上看不到是正常的**：手机上页头要给菜单、logo、搜索、账号、购物车留位置，
        对比图标只在「已经加了商品」之后才出现。用电脑验证这一步。
- [ ] 直接访问 `/pages/chainsaw-compare` → 能看到对比表，且表头有商品缩略图 → 说明第三步做对了
- [ ] 点一个商品的 Compare → 图标角标变 `1`，屏幕底部弹出确认条
- [ ] 再点同组另一款 → 角标变 `2`，表里出现两列
- [ ] 点购物车旁边的对比图标 → 跳到该组的对比页，看到你选的那几款

---

## 排错表

| 现象 | 最可能的原因 | 怎么修 |
| --- | --- | --- |
| **页头没有对比图标** | 一个对比页都没建好，或标题没按规律写 | 检查四个页面的标题是否都以 `Compare` 结尾、模板是否选了 `page.compare` |
| **部分分组有图标、部分没有** | 缺的那组页面没建 / handle 不对 | 打开该页面对比标题；handle 必须正好是 `<分组键>-compare` |
| **商品卡没有 Compare 按钮** | 商品没填 `spec.compare_group`，或 Compare hidden 勾上了 | 回第一步检查 |
| **对比页显示 "No product collection is linked…"** | ① 集合没选进主题设置；② 集合的 `custom.compare_group` 没填；③ 填的值与分组键对不上 | 回 3b / 3c；值应填 `chainsaw` 这类**分组键**，不是 `chainsaw-compare` |
| **对比页显示 "no products to compare in this group"** | 集合里少于 2 个商品，或自动集合的条件没匹配上 | 打开集合确认商品数量 ≥ 2 |
| **表里大部分格子是 `—`** | 商品缺对应的参数 metafield | 这是正常的（缺值显示破折号，不显示 0）；要补就在商品里填 |
| **点 Compare 弹出一句「只能比同类型商品」** | 对比清单里已有别的分组的商品 | 这是设计如此——给了「清空并加入这一款」按钮，点它就换组 |
| **改了主题设置没生效** | 设置是全局的，可能改的是预览主题 | 确认右上角是已发布主题，改完点保存 |

---

## 顾客会看到什么（这套功能的边界）

写下来，免得你对顾客的预期和实际不符：

| 项 | 行为 |
| --- | --- |
| 对比清单存在哪 | **顾客自己的浏览器里**（localStorage）。换设备、换浏览器、清缓存都会丢 |
| 能不能分享对比结果 | **不能**。对比页网址永远不带参数，无法生成「我的对比清单」链接 |
| 最多比几款 | **4 款**。到第 4 款再点，会提示先移除一款 |
| 不同分组能混着比吗 | **不能**。清单里只能有一个分组的商品，跨组时会提示并提供「清空并加入」 |
| 没有 JS 的浏览器 | 商品卡上的 Compare 按钮与页头图标**都不显示**；对比页本身仍有内容（服务端渲染的默认表），对搜索引擎可见 |
| 一款商品都还没选时 | 页头图标仍可点，跳到该组的对比页看默认表 |

---

## 想加第五个分组？

可以，需要三步：

1. 主题设置 → **Comparison group keys** 里把新键加上（逗号分隔）
2. 建新页面：标题 `<新键> Compare`
3. 建新集合并填 `custom.compare_group`，再选进 Comparison collections

> **⚠️ 一个诚实的限制**：v1.0 里每组的「对比表显示哪几行参数」是写在主题代码里的。
> 新增的分组会自动套用一套**通用参数行**（动力源 / 操作方式 / 适用面积 / 使用强度 /
> 排量或功率 / 整机重量 / 噪音 / 保修）。要定制这组的行，需要改主题代码。

---

## 一句话总结

**商品填标记 → 建页面（标题 `<分组> Compare`）→ 建集合（填 `custom.compare_group`）→ 主题设置里选集合。**
四件事错一件，对应的入口就不出现——这是有意的设计，宁可入口消失也不给顾客一个 404。
