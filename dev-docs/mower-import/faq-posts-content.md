# FAQ 博客文章 — 4 篇（产品页 `product-faq` 区块的内容源）

> **用途**：`sections/product-faq.liquid` 不设问答 block，直接从**一个 blog 的前 4 篇文章**生成问答。这 4 篇就是喂给它的内容。
> **对接口径（决定怎么写）**：
> - 文章 **标题 → 手风琴上的「问题」**（单行最好读，建议 ≤ 50 字符）；
> - 文章 **摘要（Excerpt）→ 展开后的「答案」**，主题做 `strip_html | truncatewords: 26`；
> - 文章 **正文 → 点「Read the full guide」进文章页看到的完整答案**。
> **硬约束**：
> 1. **摘要必须 ≤ 26 个英文单词**。超出会被 `truncatewords: 26` 从中间切断并补 `...`，在 FAQ 里就是一句断掉的话。
> 2. **摘要是纯文本**，不要放 HTML（主题会 `strip_html`，写了也白写）。
> 3. 正文是 **Shopify 富文本（HTML 源码）**，粘贴前必须切到 **Show HTML** 视图（`</>`），否则 `<h2>` 会当文字显示。见 `how-to-publish-content.md`。
> 4. 正文单篇上限 64 KB（Shopify 硬限制）。这 4 篇各 2–4 KB，远低于上限。
> **事实来源**（不编数字）：
> - 机型 / 割幅 / 电池平台 / 保月数：`dev-docs/mower-import/build_mower_csv.py`（21 in、22 in、42 in；40V / 60V / 80V；`warranty_mo` 24–60）
> - 保修条款：`dev-docs/mower-import/support-pages-content.md` 的 Warranty 页
> **链接口径**：只连**已经存在**的页面与列表页 —— `/pages/warranty`、`/collections`。不写具体商品或集合 handle（会 404）。
> **标签**：`faq` + 主题标签，供商家在后台筛选（FAQ 区块本身不按标签取文，平台不支持按标签查文章）。

---

## 文章 1：Which mower deck size do I need?

- **标题**：`Which mower deck size do I need?`
- **建议 handle**：`which-mower-deck-size-do-i-need`
- **摘要**（24 词）：`Walk-behind mowers use a 21 in or 22 in deck; riding mowers use 42 in. Choose by edge tightness first, then by run length.`
- **作者**：`Northbark Service Team`
- **标签**：`faq, buying guide, mowers`

```html
<p>The deck is the single measurement that decides how a mower feels in use: how many passes
a lawn takes, how much of the cut you have to overlap, and how much machine you are pushing
or steering. Northbark walk-behind mowers come with a <strong>21 in</strong> or
<strong>22 in</strong> deck; the riding range uses a <strong>42 in</strong> deck.</p>

<h2>The three decks in the range</h2>

<table>
  <thead>
    <tr>
      <th scope="col">Deck</th>
      <th scope="col">Machine</th>
      <th scope="col">Where it makes sense</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">21 in (533 mm)</th>
      <td>Walk-behind, push or self-propelled</td>
      <td>Lawns broken up by beds, paths and corners, where you spend as much time turning as
        cutting</td>
    </tr>
    <tr>
      <th scope="row">22 in (559 mm)</th>
      <td>Walk-behind, self-propelled</td>
      <td>Larger or uneven lawns — the extra inch is small, but on a wide lawn it removes a
        noticeable number of passes</td>
    </tr>
    <tr>
      <th scope="row">42 in</th>
      <td>Riding mower, lawn tractor, zero-turn</td>
      <td>Large, open lawns with long straight runs and few obstacles to steer around</td>
    </tr>
  </tbody>
</table>

<h2>Why an inch matters more than it looks</h2>

<p>Cutting width compounds. Every pass overlaps the previous one by a few centimetres so you
don't leave a strip of uncut grass between them, so the effective width is always less than
the deck. The wider the deck, the more that overlap costs you, and the more it pays off over
a long run.</p>

<p>The trade-off is weight and control. Walk-behind models in the range sit between roughly
26 kg and 37 kg depending on drive type and battery count, and a heavier machine on a slope
is harder work. If your lawn has a bank, a narrower deck you can hold comfortably is usually
faster than a wider one you fight with.</p>

<h2>Match the deck to the shape of the lawn</h2>

<ul>
  <li><strong>Lots of edges, beds and trees:</strong> the 21 in deck turns in less space and
    leaves less hand-trimming along borders.</li>
  <li><strong>Mostly open lawn with some obstacles:</strong> the 22 in deck cuts the pass
    count without giving up much manoeuvrability.</li>
  <li><strong>Long runs, few obstacles, mowing time that has become a chore:</strong> a 42 in
    riding deck changes the job from an afternoon to well under an hour.</li>
</ul>

<h2>Check the deck, then check the rest</h2>

<p>Deck size is the first question, not the only one. Drive type (push, self-propelled,
hydrostatic, zero-turn), power source and 3-in-1 capability change the experience just as
much. Our <a href="/collections">collection pages</a> group the range by machine type and
deck size, and each product page lists the deck width and weight in its specifications
table.</p>
```

---

## 文章 2：Can I use one battery across tools?

- **标题**：`Can I use one battery across tools?`
- **建议 handle**：`can-i-use-one-battery-across-tools`
- **摘要**（25 词）：`Yes, within a platform: Northbark tools run on 40V, 60V or 80V systems, and any pack from a system fits every tool in that system.`
- **作者**：`Northbark Service Team`
- **标签**：`faq, batteries, cordless`

```html
<p>Yes — but only inside the same battery platform. A platform is the voltage family a tool
is built around: Northbark cordless tools run on <strong>40V</strong>, <strong>60V</strong>
or <strong>80V</strong> systems. Any pack from a platform fits every tool in that platform,
and the charger that came with it charges every pack of that platform.</p>

<h2>Check the platform before you assume</h2>

<p>Platforms are not interchangeable, and the model number alone is not a reliable guide —
a bigger number is not always a bigger voltage. Every product page lists
<strong>Battery platform</strong> in its specifications table. That row is the answer: if two
tools show the same platform, they share packs and chargers.</p>

<h2>What comes in the box</h2>

<p>Cordless machines are sold as kits: the tool, one or more battery packs, and a charger.
Kit contents differ by model — some walk-behind mowers ship with two packs so you can run one
while the other charges, others with a single pack and a second, smaller pack for lighter
work. The kit contents are listed on each product page.</p>

<p>To extend runtime on the 40V platform, the <strong>4.0 Ah pack</strong> is also sold on
its own as an accessory. A spare pack is the cheapest way to keep working through a long
session — swap it in and keep cutting instead of stopping to charge.</p>

<h2>What does not carry over</h2>

<ul>
  <li><strong>Packs and chargers are platform-specific.</strong> A 60V pack does not fit a
    40V tool, and a 40V charger will not charge an 80V pack.</li>
  <li><strong>Capacity is not the same as platform.</strong> A 6.0 Ah pack and a 2.0 Ah pack
    of the same platform are interchangeable — the larger one simply runs longer.</li>
  <li><strong>Gasoline models share nothing</strong> with the cordless range; they have no
    battery system at all.</li>
</ul>

<p>If you own tools from more than one platform, label the packs. Two packs of the same
voltage but different capacity look similar, and mixing them up between chargers is the most
common way people end up thinking a battery has failed.</p>
```

---

## 文章 3：How do I store batteries for winter?

- **标题**：`How do I store batteries for winter?`
- **建议 handle**：`how-do-i-store-batteries-for-winter`
- **摘要**（25 词）：`Store packs at 40–60% charge, indoors, away from frost and heat, and top them up about once a month. Never leave one flat all winter.`
- **作者**：`Northbark Service Team`
- **标签**：`faq, batteries, maintenance`

```html
<p>A lithium-ion pack ages fastest at the two extremes: stored completely flat, or stored
full and hot. Winter storage is where most of the damage happens, and it is entirely
avoidable — what you do in October decides how the pack performs next spring.</p>

<h2>Before the machine goes away</h2>

<ol>
  <li><strong>Run the pack down to roughly 40–60%.</strong> If it is full after the last cut
    of the season, run the tool for a few minutes rather than storing it charged. If it is
    flat, charge it part way back up — a pack left at zero for months can refuse to take a
    charge at all.</li>
  <li><strong>Wipe the contacts.</strong> Grass dust and moisture on the terminals cause
    intermittent contact long before the cells are the problem.</li>
  <li><strong>Take the pack off the tool.</strong> A pack left on the machine can be drained
    by the tool's standby electronics over the winter.</li>
  <li><strong>Store it indoors.</strong> A dry room at normal household temperature is
    better than an unheated shed that freezes, and far better than a garage floor.</li>
</ol>

<h2>While it sits</h2>

<ul>
  <li><strong>Check it about once a month.</strong> If the indicator shows it has dropped
    well below half, top it back up to around 40–60% — not to full.</li>
  <li><strong>Keep it away from heat:</strong> radiators, sunny windowsills, and the inside
    of a parked car in summer.</li>
  <li><strong>Do not charge a freezing pack.</strong> If it has been stored somewhere cold,
    let it sit at room temperature until it is warm to the touch before putting it on the
    charger.</li>
</ul>

<h2>Starting again in spring</h2>

<ol>
  <li>Let the pack reach room temperature, then charge it to full before the first use.</li>
  <li>Check the charger and the pack are from the same platform — see
    <a href="/collections">the cordless range</a> if you are adding a pack.</li>
  <li>If runtime has clearly dropped compared with previous seasons, that is normal
    capacity loss rather than a fault; a replacement pack is the fix. Packs that have
    simply reached the end of their service life are wear items — more on that on our
    <a href="/pages/warranty">warranty page</a>.</li>
</ol>

<p>The same routine applies to any long gap between uses, not just winter. A pack that goes
into a hot shed for three months in July comes out in the same condition as one that spent
the winter there.</p>
```

---

## 文章 4：What does the warranty cover?

- **标题**：`What does the warranty cover?`
- **建议 handle**：`what-does-the-warranty-cover`
- **摘要**（24 词）：`Every machine is covered against defects in materials and workmanship — 36–60 months on battery tools, 24–36 on gas mowers. Wear parts are excluded.`
- **作者**：`Northbark Service Team`
- **标签**：`faq, warranty, support`

```html
<p>Every Northbark machine is warranted against defects in materials and workmanship under
normal use. The period depends on the product line, and the exact term for your model is
listed in the specifications table on its product page.</p>

<h2>How long coverage runs</h2>

<table>
  <thead>
    <tr>
      <th scope="col">Product line</th>
      <th scope="col">Warranty period</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Battery-powered tools (40V, 60V and 80V platforms)</th>
      <td>36–60 months, depending on the model</td>
    </tr>
    <tr>
      <th scope="row">Gasoline walk-behind mowers</th>
      <td>24–36 months, depending on the model</td>
    </tr>
    <tr>
      <th scope="row">Riding mowers and lawn tractors</th>
      <td>24–36 months, depending on the model</td>
    </tr>
  </tbody>
</table>

<h2>What counts as a defect</h2>

<ul>
  <li>A part that fails because of how it was made, not because of how it was used.</li>
  <li>Engine, drivetrain and deck components on gasoline models, and the motor, battery and
    charger on cordless models, within the period shown on the product page.</li>
  <li>Repair or replacement of the faulty part — or of the whole unit where a repair is not
    practical.</li>
</ul>

<h2>What is not covered</h2>

<ul>
  <li><strong>Wear items:</strong> blades, saw chains and guide bars, air filters, spark
    plugs, belts and trimmer line. These are consumables and are expected to be replaced
    during the life of the machine.</li>
  <li>Damage from accidents, misuse, neglect, or running the machine on ground it was not
    built for.</li>
  <li>Damage from skipped maintenance, or from service by someone unauthorised to do it.</li>
  <li>Normal fading of paint, plastic parts and seat upholstery.</li>
  <li>Shipping charges, unless the unit arrived damaged or faulty.</li>
</ul>

<h2>Batteries: defect, or simply worn out?</h2>

<p>Both can look the same from the outside, so the distinction is worth knowing. A pack that
fails early — will not hold a charge, will not accept one, or cuts out while the indicator
still shows charge — is a defect and is covered for the period shown on the product page. A
pack that has gradually lost runtime over several seasons has reached the end of its service
life; that is normal ageing and is treated as a wear item.</p>

<h2>How to make a claim</h2>

<ol>
  <li>Find your <strong>order number</strong> and the <strong>model number</strong>. The model
    number is on the identification plate under the deck cover or on the original carton.</li>
  <li>Contact our service team with both, a description of the fault, and a photo if you have
    one.</li>
  <li>We confirm the term for your model and arrange the part, the repair or a
    replacement.</li>
</ol>

<p>Keeping the machine serviced to the schedule in its manual keeps it within warranty — keep
the receipts. The full terms, including what counts as normal wear, are on our
<a href="/pages/warranty">warranty page</a>.</p>
```

---

## 发布注意点

| 项 | 口径 |
| --- | --- |
| **建独立 blog** | 建议新建一个 blog：**Title** `FAQ`、**Handle** `faq`。理由有二：① `product-faq` 取的是所选 blog 的**前 4 篇**，混在已有的 `maintenance-guides`（2 篇选购指南）里，前 4 篇会掺进教程；② 底部按钮会落到 `blog.url`，独立 blog 的列表页正好就是「所有 FAQ」。 |
| **发布顺序决定显示顺序** | `blog.articles` 默认**最新在前**。想让「Which mower deck size…」排第一条，就要**最后发它**：先发 4、再 3、2、1（每篇发布时间错开 1 分钟即可）。改顺序也可以事后改发布日期。 |
| **摘要 ≤ 26 词** | 摘要超词会被 `truncatewords: 26` 切断。四篇已分别控制到 24–25 词，**改动时别加长**。 |
| **摘要纯文本** | 摘要框里不要写 HTML 或 Markdown，主题会 `strip_html`；写 `**粗体**` 会原样显示星号。 |
| **正文要切 HTML 视图** | 后台正文框点 **Show HTML**（`</>`）再粘，否则 `<h2>` 会当文字显示。粘完切回编辑器看一遍标题层级与表格。 |
| **不要用 class** | 本主题的富文本样式挂在 `.rte` 下（`assets/critical.css`），**没有** `.fine-print` 这类自定义类。⚠️ 既有两篇教程里用了 `<p class="fine-print">`，在本主题下等于普通段落（无小字效果）—— 本文四篇一律不用 class。 |
| **表格写法** | 只用 `table / thead / tbody / tr / th(scope) / td`。不用 `<caption>`（TinyMCE sanitize 行为不稳定，没必要冒险）。 |
| **发布后必须配一次** | 主题编辑器打开任意商品页 → 点 FAQ 区块 → **Blog** 选 `FAQ`。不选 ⇒ 区块整块不输出（不是坏了，是没数据源）。选完 4 条问答、答语、右侧图（不配则回退商品主图）都会出来。 |
| **口径冲突待你定** | `Warranty` 页把 **batteries** 同时写进「covered（motor/battery/charger）」和「not covered（wear items）」两条，读起来自相矛盾。第 4 篇里我按行业惯例拆开写了：**保修期内的制造缺陷算覆盖，自然衰减到寿命终点算磨损件**。要不要把 Warranty 页也改成同一口径，你定。 |
