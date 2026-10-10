# Support 两个页面内容 — 建页面用

> **用途**：刘工在 Shopify 后台创建页面时使用。主题只负责渲染（pages-ui §6 `page-content`），内容属商家数据。
> **⚠️ 粘贴方法**：Shopify 富文本编辑器是所见即所得的，**不能直接粘贴 HTML 源码**——必须先点工具栏的 **Show HTML**（`</>`）按钮切到源码视图再粘。完整操作路径见 `how-to-publish-content.md`。
> **硬约束**：SDD §9.4「禁止 Lorem Ipsum、禁止占位符、禁止未发布的空页面」——所以下面是**可直接发布的实质内容**，不是草稿。
> **数据来源**：全部对齐 `dev-docs/mower-import/build_mower_csv.py` 的 11 款实际商品与 `metafield-reference.md` 字段定义，无编造数字。

---

## 页面 1：`Shipping & Oversized Delivery`

- **建议 handle**：`shipping-and-oversized-delivery`
- **建议标题**：`Shipping & oversized delivery`
- **模板**：`page.json`
- **菜单位置**：Support → Shipping & Oversized Delivery（pages-ui §1.1.1）

```html
<h2>Shipping & oversized delivery</h2>

<p>Outdoor power equipment ships in two very different ways, and the delivery method is
listed on every product page. Check the shipping badge on the product you are buying — it
tells you which of the arrangements below applies.</p>

<h3>Small parts and accessories: parcel delivery</h3>

<p>Blades, filters, oil and accessories ship by standard parcel service to a street
address. No special equipment is needed at the destination. Orders placed before the
cutoff are typically prepared within <strong>3 business days</strong>.</p>

<h3>Riding mowers and lawn tractors: freight delivery</h3>

<p>Our zero-turn and lawn-tractor models are too large for parcel carriers and ship by
freight (LTL). Delivery is <strong>curbside</strong> — the driver delivers to the curb or
driveway edge at your address, and unloads with a liftgate.</p>

<ul>
  <li><strong>Preparation time:</strong> <strong>7 business days</strong> before dispatch.</li>
  <li><strong>Liftgate service:</strong> included. The driver lowers the unit from the
    truck to the ground at your curb or driveway edge.</li>
  <li><strong>Assembly required:</strong> yes. Riding mowers and tractors arrive
    partially assembled and need a few hours of final setup before use. Assembly
    instructions are included in the packaging.</li>
  <li><strong>Access requirements:</strong> the delivery vehicle needs a clear path to
    the delivery point. Please keep cars, trailers, and low branches out of the way.</li>
</ul>

<h3>Where we deliver</h3>

<p>We ship to residential and commercial addresses. Large-unit freight delivery is
available where our carriers service the postcode. At checkout, enter your postcode to
confirm delivery availability before you pay.</p>

<h3>Damage on arrival</h3>

<p>Inspect the unit before the driver leaves if you can. If the packaging or the unit is
damaged, note it on the delivery receipt and contact us within <strong>7 days</strong>.
We'll arrange a replacement or a return.</p>

<h3>Order changes</h3>

<p>Because freight units are prepared to order, orders cannot be changed or cancelled
once preparation has started. Contact us as soon as possible — we'll do what we can.</p>
```

---

## 页面 2：`Warranty`

- **建议 handle**：`warranty`
- **建议标题**：`Warranty`
- **模板**：`page.json`
- **菜单位置**：Support → Warranty

```html
<h2>Warranty</h2>

<p>Every Northbark machine is warranted against defects in materials and workmanship.
<strong>The warranty period is listed on each product page</strong>, so you always see the
term for the exact model you are considering.</p>

<h3>Coverage by category</h3>

<table>
  <caption>Northbark warranty periods by product line</caption>
  <thead>
    <tr>
      <th scope="col">Product line</th>
      <th scope="col">Warranty period</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Battery-powered tools (40V and 80V platforms)</th>
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

<p class="fine-print">Exact terms for your model appear in the Specifications table on
its product page. The table above is a summary, not a substitute for the model terms.</p>

<h3>What is covered</h3>

<ul>
  <li>Defects in materials or workmanship under normal use.</li>
  <li>Repair or replacement of the faulty part, or of the whole unit where a repair is
    not practical.</li>
  <li>Engine and drivetrain components on gasoline-powered models, and the motor, battery
    and charger on battery-powered models, for the period shown on the product page.</li>
</ul>

<h3>What is not covered</h3>

<ul>
  <li>Normal wear items: <strong>blades, saw chains, air and oil filters, spark plugs,
    belts, and batteries</strong> — these are consumables and are expected to be replaced
    during the life of the machine.</li>
  <li>Damage from accidents, misuse, neglect, or from running the machine on an
    unsuitable surface.</li>
  <li>Damage from lack of maintenance, or from service by an unauthorized repairer.</li>
  <li>Normal fading of paint, plastic parts, or seat upholstery.</li>
  <li>Shipping and return freight charges, unless the unit arrived damaged or faulty.</li>
</ul>

<h3>How to make a claim</h3>

<ol>
  <li>Find your <strong>order number</strong> and the <strong>model number</strong> — the
    model number is on the identification plate under the deck cover or on the original
    carton.</li>
  <li>Contact our service team with both, plus a description of the fault and, if
    convenient, a photo.</li>
  <li>We will confirm coverage under the model terms and arrange parts, repair, or
    replacement.</li>
</ol>

<h3>Service and parts</h3>

<p>Parts for current models are stocked, and we keep blades, filters, and service items
available for machines well past their warranty period. Contact us with the model number
for the correct part.</p>

<p>Maintenance and servicing performed to the schedule in your model's manual keeps your
machine within warranty. Keep the maintenance receipts.</p>
```

---

## 建页面时的几个注意点

| 项 | 口径 |
| --- | --- |
| **数字** | 全部取自实际数据：Parcel 备货 3 天（7 款）、Freight 备货 7 天（4 款）；保修 24/36/60 个月；Freight 4 款均需 liftgate + 需组装 |
| **不要写具体运费金额或到货天数** | 演示店没有运费配置，写死会被审核当成虚假承诺 |
| **不要写公司地址电话** | SDD §9.4 禁占位符；编造地址电话反而假 |
| **表格用 `<table>` + `th scope`** | 符合 AGENTS §8（表格需 caption/th scope）。已带 `scope` 与 `<caption>`，**发布后到页面 HTML 里确认 caption 还在**——Shopify 富文本编辑器有时会剥离 `<caption>`，若被剥掉则在表格前加一行加粗标题文字兜底 |
| **句式** | sentence case + 美式英语（AGENTS §9），已按此写 |
| **两份都要发布** | 未发布的空页等于没建（SDD §9.4） |

## 第三个 Support 项：Maintenance Guides

这一项指向**博客**（blog.json），不是 page。需要至少 1–2 篇实质文章才能挂在菜单上（SDD §9.4 同样禁空页）。**这篇要另写**——不在这两份里，需要时我再出。
