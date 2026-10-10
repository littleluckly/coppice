# 支持页与博客的后台录入操作手册

> **面向**：在 Shopify 后台创建 4 个内容项（2 个 page + 1 个 blog + 2 篇文章）。
> **前置**：内容已备妥 ——
> - `dev-docs/mower-import/support-pages-content.md`（2 个 page）
> - `dev-docs/mower-import/blog-posts-content.md`（2 篇文章）
>
> **内容大小已核**：四篇分别为 2.2 KB / 2.9 KB / 6.6 KB / 7.2 KB，**远低于 Shopify 富文本编辑器 64 KB 硬性上限**（官方限制），不会被截断。

---

## ⚠️ 先看这个：不要直接往富文本框里粘贴

Shopify 的富文本编辑器是**所见即所得**的。如果你把 HTML 源码直接粘进去，它会把 `<h2>` `<table>` 当成**普通文字显示**，页面上会出现一堆尖括号。

**必须先切换到 HTML 视图再粘贴。** 这是整个操作里唯一容易出错的地方。

---

## 一、创建 2 个页面（Page）

### 页面 1：Shipping & oversized delivery

**操作路径**

1. 后台左侧：**Online Store（在线商店）→ Pages（页面）**
2. 右上角点 **Add page（添加页面）**
3. **Title** 字段填：`Shipping & oversized delivery`
4. **Visibility** 保持 **Visible（可见）** ← 关键，别设成 Hidden
5. 点 **Content** 框上方的 **Show HTML** 按钮（有的版本显示为 `</>` 图标）
   - 编辑区会从富文本切成 HTML 源码
6. **全选 Content 里原有的空内容**（`Cmd+A`），删掉
7. 打开 `support-pages-content.md`，复制「页面 1」代码块**内部**的 HTML（从 `<h2>` 到 `</p>` 最后一行，**不要**包含 ```html 那三个反引号）
8. 粘贴进 Content
9. 点 **Show Editor** 切回预览，检查标题层级和表格显示正常
10. 点 **Save**

**handle 确认**（页面 URL 里的那段）：保存后从浏览器地址栏看，`/pages/` 后面那串就是 handle。默认会按标题生成 `shipping-and-oversized-delivery`。**记下来**，博客文章里要链到它。

### 页面 2：Warranty

同上，Title 填 `Warranty`，handle 应为 `warranty`。

**⚠️ 这两页必须 Visible**，否则博客文章链过去会 404，且 SDD §9.4 要求"禁止未发布的空页面"。

---

## 二、创建博客与 2 篇文章

### 建 blog

**操作路径**

1. **Online Store → Blogs**
2. 点 **Create blog**
3. **Title** 填：`Maintenance Guides`
4. **Handle** 填：`maintenance-guides`
5. 其余留空 → **Save**

### 建文章 1

1. 进入刚建的 blog，点 **Add post**
2. **Title**：`How to change a mower blade`
3. **Handle**：`how-to-change-a-mower-blade`
4. **Author**：`Northbark Service Team`
5. **Tags**：`maintenance`、`blades`
6. **Excerpt（摘要）**：粘贴 `blog-posts-content.md` 里文章 1 的摘要那一行
7. 点 **Content** 上方 **Show HTML** → `Cmd+A` 删空 → 粘贴代码块内部 HTML → **Show Editor** 切回
8. **Save** → **Publish**（草稿状态菜单项不算发布）

### 建文章 2

同上：

- Title：`Seasonal maintenance checklist`
- Handle：`seasonal-maintenance-checklist`
- Tags：`maintenance`、`seasonal`

---

## 三、验证（发布完做一遍）

| 检查项 | 怎么看 |
| --- | --- |
| 表格显示正常 | Warranty 页的保修表有没有边框和表头；Seasonal 文章的周期表 |
| 链接可点 | 点保修页底部的 "warranty page" 链接，应跳到 `/pages/warranty`；文章里的 `/collections` 应跳到集合列表页 |
| 无源码外泄 | 页面上**看不到** `<h2>`、`<table>` 这类尖括号文字 |
| 表格标题 | 查看页面源码（`Cmd+U`），确认 `<caption>` 还在——TinyMCE 有时会剥离它。若被剥掉，在表格前加一行加粗标题文字 |
| 主题渲染 | 页头页尾正常，`page.json` 模板生效 |

---

## 四、如果粘贴后格式乱了怎么办

**现象**：粘贴后缩进乱了、`<p class="fine-print">` 的样式没生效。

Shopify 的富文本编辑器会过滤部分标签和属性（官方称 "TinyMCE 内容清理"），这是正常的。

**处理**：不用管 `class` 属性丢失。`<p class="fine-print">` 去掉 class 后就是一个普通段落，**不影响内容可读性**。真正要保证的是 `<h2>` `<h3>` `<ul>` `<ol>` `<table>` `<th scope>` 这几个——它们是结构和无障碍语义，编辑器不会过滤掉。

若某段真被过滤了，切回 **Show HTML** 手动补那一小段即可。

---

## 五、备选方案：不想碰 HTML 视图

如果 HTML 视图操作不顺，可以用 Shopify 的 **主题编辑器**：

1. **Online Store → Themes → Customize**
2. 顶部选择你要的页面模板（`page.json`）
3. 进入 **Page content** 区块，直接在富文本框里写

这条路的区别是：**内容跟着模板走**，而不是存成可复用的 Page 对象。对演示店够用，但菜单链接要指到模板的 URL，**不如建 Page 干净**。所以推荐上面的正式做法。
