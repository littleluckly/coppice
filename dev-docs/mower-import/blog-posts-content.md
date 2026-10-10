# Maintenance Guides 博客文章 — 2 篇

> **用途**：刘工在 Shopify 后台创建博客文章时使用。
> **⚠️ 粘贴方法**：必须先点工具栏的 **Show HTML**（`</>`）按钮切到源码视图再粘，否则 HTML 会被当纯文本显示。完整操作路径见 `how-to-publish-content.md`。
> **硬约束**：SDD §9.4「禁止 Lorem Ipsum、禁止占位符、禁止未发布的空页面」——以下是可直接发布的实质教程。
> **规格来源**：机型与参数全部对齐 `dev-docs/mower-import/build_mower_csv.py` 的 11 款实际商品（21 in / 22 in / 42 in 三个平台，汽油与电池两类）。
> **链接口径**：文中链接一律指向**集合路径**（如 `/collections/blades-bars`），**不硬编码具体商品 handle**——当前 CSV 只有主机 11 款，耗材商品尚未导入，等导入后也不用改文章。

---

## 文章 1：How to change a mower blade

- **标题**：`How to change a mower blade`
- **建议 handle**：`how-to-change-a-mower-blade`
- **摘要**（用于列表页 excerpt）：`A worn blade cuts unevenly and stresses the spindle. Here's how to change it on a walk-behind or riding mower, and how to tell when it's time.`
- **作者**：`Northbark Service Team`

```html
<p>A dull blade doesn't just cut badly — it tears the grass rather than cutting it, which
makes the lawn look ragged and puts extra load on the engine. Replacing a blade is a
20-minute job on most walk-behind mowers and about an hour on a riding mower or tractor.
This guide covers both.</p>

<h2>When the blade actually needs replacing</h2>

<p>Take a closer look before you swap it. Replace the blade if you see any of these:</p>

<ul>
  <li>The blade edge is visibly ragged, nicked, or rounded off rather than sharp.</li>
  <li>The blade is visibly bent, or the tip is no longer in a straight line.</li>
  <li>Grass is coming out frayed or whitish at the tips instead of cutting cleanly.</li>
  <li>The mower is vibrating more than it used to, especially at full throttle.</li>
  <li>The blade has been running against a rock or a root and is out of balance.</li>
</ul>

<p>A blade can often be sharpened instead of replaced if it is simply dull but still
straight and undamaged. Run a file along the cutting edge following the existing angle,
and keep the balance. If it is bent or chipped, sharpen it — replace it.</p>

<h2>Tools you'll need</h2>

<ul>
  <li>Socket wrench set, or a ratchet with the correct socket</li>
  <li>Two 6 mm (1/4 in) hex keys — most walk-behind blades are secured by one bolt plus a
    washer, some riding models use a second bolt</li>
  <li>Work gloves</li>
  <li>A block of wood to rest the deck on so you don't have to work upside down</li>
  <li>Blade balancer (recommended, not required)</li>
</ul>

<h2>Changing the blade on a walk-behind mower</h2>

<p>Northbark walk-behind models use a <strong>21 in</strong> deck, and the 22 in models use
a <strong>22 in</strong> deck. The blade is a single part mounted on the underside of the
deck.</p>

<ol>
  <li><strong>Disconnect the spark plug.</strong> On battery models, remove the battery
    pack instead. Either way, make the machine impossible to start. This is the single most
    important step.</li>
  <li><strong>Tip the mower onto its side</strong> or prop it on a block of wood so the deck
    is accessible. Work on a level surface with the switch and throttle lever at their
    released positions.</li>
  <li><strong>Clean under the deck first.</strong> Grass clippings hide the blade bolt and
    make it far harder to reach. Scrape them out with a wooden scraper or a plastic putty
    knife — don't use a metal one near the sharpened edge.</li>
  <li><strong>Note the orientation.</strong> The blade sits closest to the deck on the
    discharge side. Take a photo before removal so you reinstall it the right way round.</li>
  <li><strong>Remove the centre bolt.</strong> Hold the blade with one hand and back the
    bolt out with the socket. If the blade is stuck to the shaft, don't lever against the
    shaft — tap the back of the blade with a rubber mallet to break it free.</li>
  <li><strong>Inspect the blade and the spindle.</strong> Check the shaft for bentness and
    the spindle for wobble in its housing while the blade is off. A bent spindle means the
    new blade will wobble too, and the spindle needs service first.</li>
  <li><strong>Fit the new blade,</strong> threading the bolt through the blade and the
    original washer. Tighten firmly in a star pattern so it seats evenly, then check the
    blade sits flat against the deck with no visible gap.</li>
  <li><strong>Reconnect the spark plug or battery,</strong> and test-run on grass before
    doing any real cutting.</li>
</ol>

<h2>Changing the blade on a riding mower or tractor</h2>

<p>Northbark 42 in riding mowers and tractors — including the zero-turn — have multiple
blades on one shared spindle shaft, secured by a larger bolt and usually a separate clamp
or washer. The process is the same in principle, but there are two extra cautions.</p>

<ol>
  <li><strong>Disconnect the spark plug</strong> and, on a tractor, set the parking brake
    and block the wheels before working underneath.</li>
  <li><strong>Work from underneath with the deck raised</strong> on a rated jack or ramp
    system. Never work under a deck held up by anything other than a proper jack.</li>
  <li><strong>Mark every blade position before removing any of them.</strong> On a multi-
    blade deck the blades sit at different angles to each other, and they must go back the
    same way round. If one is installed backwards, the deck will be out of balance.</li>
  <li><strong>Replace as a set.</strong> Blades on the same spindle wear to the same
    profile. If one is at end of life, the others are close behind — replacing only one
    leaves the deck unbalanced.</li>
  <li><strong>Check the spindle and the bearings</strong> while the blades are off. On a
    tractor the spindle is a single casting shared by all blades, so any wobble felt at
    one blade means checking all of them.</li>
  <li><strong>Torque the centre bolt to the specification for your model</strong> — see
    the Specifications table on the product page. Riding mower spindle bolts sit under
    significant load and need a proper torque wrench, not an impact driver alone.</li>
  <li><strong>Test-run in an open area first,</strong> at low speed, watching for
    vibration.</li>
</ol>

<h2>Why balance matters</h2>

<p>An unbalanced blade spins at high speed and vibrates through the deck and handlebars.
Over time it loosens the spindle bearing, dulls the blade unevenly, and can damage the
deck. A blade balancer is a few dollars and takes the guesswork out of it: mount the blade
on the balancer and add washers to the light side until it holds level.</p>

<p>If you do not have a balancer, the quick check is: balance the blade on a screwdriver
or a nail across a doorway. Add a washer on the light side until it holds still.</p>

<h2>What to check every season</h2>

<ul>
  <li><strong>Blade condition and balance</strong> — the main wear item.</li>
  <li><strong>Air filter</strong> — a dirty filter starves the engine and shows up as
    smoke or loss of power. Replace rather than clean, unless the manual says it's
    washable.</li>
  <li><strong>Oil level and condition</strong> — check before the first run of the season.</li>
  <li><strong>Spark plug</strong> — on gasoline models, replace on the manufacturer's
    schedule; a fouled plug is the usual cause of hard starting.</li>
  <li><strong>Deck underside</strong> — scrape off accumulated clippings, and check for
    rust or coating wear.</li>
</ul>

<p>Blades, filters, oil and spark plugs are all wear items and are not covered by warranty
— see our <a href="/pages/warranty">warranty page</a> for details. They are stocked and
we can help you find the correct part for your model.</p>
```

---

## 文章 2：Seasonal maintenance checklist

- **标题**：`Seasonal maintenance checklist`
- **建议 handle**：`seasonal-maintenance-checklist`
- **摘要**：`Four seasonal checklists for walk-behind mowers, riding mowers and battery tools — what to do in spring, summer, autumn and winter.`
- **作者**：`Northbark Service Team`

```html
<p>Mower maintenance is mostly boring, which is exactly why it works. Most machines that
arrive with a complaint in spring needed ten minutes of attention the previous autumn.
Below is a checklist by season — print it, or bookmark it on your phone and work through
it.</p>

<h2>Spring: getting ready for the first cut</h2>

<p>The first mow of the year is when most deferred maintenance catches up with you.</p>

<h3>Walk-behind mowers</h3>

<ul>
  <li><strong>Change the oil</strong> if the unit is over a year old, or if it has been idle
    since last season. Run the engine briefly before draining so the old oil comes out.</li>
  <li><strong>Replace the air filter.</strong> A restricted filter costs power and shows
    smoke. If your model has a washable filter, wash it instead — and only if the manual
    says to.</li>
  <li><strong>Replace the spark plug</strong> on gasoline models. Cheap insurance against
    hard starting.</li>
  <li><strong>Inspect the blade</strong> and sharpen or replace it. Winter is hard on
    edges, and a dull blade tears grass rather than cutting it.</li>
  <li><strong>Check the battery</strong> if your model is battery-powered: terminals clean,
    charge to full before first use. Store battery tools at 40–60% charge over winter, not
    empty and not full.</li>
  <li><strong>Check tyre pressure</strong> — underinflation makes the mower pull to one side
    and cuts unevenly.</li>
  <li><strong>Clear the deck underside</strong> of winter debris.</li>
</ul>

<h3>Riding mowers and tractors</h3>

<ul>
  <li>Everything above, plus:</li>
  <li><strong>Check the battery, charging system and cables.</strong> Sitting over winter
    is the single biggest killer of riding mower batteries — a maintenance charger on a
    monthly top-up is worth it.</li>
  <li><strong>Change the engine oil</strong> and the oil filter where fitted.</li>
  <li><strong>Grease the steering and linkage pivots</strong> per the manual.</li>
  <li><strong>Inspect all blades as a set</strong> and check the spindle for wobble.</li>
  <li><strong>Check tyre pressure on both front and rear</strong>, and inflate to the
    specification on the placard.</li>
  <li><strong>Test the deck-height adjustment</strong> through its range and confirm the
    cut-off switch works.</li>
</ul>

<h2>Summer: during heavy use</h2>

<ul>
  <li><strong>Check the oil level every few cuts.</strong> Running low on oil is the most
    common cause of premature engine wear, and heat is when it gets used up fastest.</li>
  <li><strong>Clean the underside every few weeks.</strong> Wet clippings turn into a mat,
    then into friction, then heat. Scrape after each session if you mulch; every few cuts if
    you collect or discharge.</li>
  <li><strong>Look at the blade mid-season.</strong> If grass tips are fraying, the edge is
    going — sharpen or replace before it snaps.</li>
  <li><strong>Battery tools:</strong> don't run a pack flat. Charge to full after each use,
    and keep it out of a hot vehicle or direct sun.</li>
  <li><strong>Watch for new vibration</strong> — that usually means a loose bolt or a blade
    that has picked up something. Stop and check rather than running it.</li>
</ul>

<h2>Autumn: the most important one</h2>

<p>If you only do one season of maintenance, make it this one. Everything you do now is
what makes next spring painless.</p>

<ul>
  <li><strong>Replace the air filter</strong> — autumn debris and dust are at their worst
    this season, and a clogged filter is what gets a mower running hot at the first cold
    spring start.</li>
  <li><strong>Replace the spark plug</strong> on gasoline models.</li>
  <li><strong>Drain or stabilise the fuel</strong> if the machine will sit for more than a
    month. Stale fuel is the main cause of spring starting failures.</li>
  <li><strong>Sharpen or replace the blade,</strong> and balance it. Winter storage is hard
    on an edge.</li>
  <li><strong>Change the oil</strong> after the last run of the season, on riding mowers and
    tractors as well as walk-behinds.</li>
  <li><strong>Charge the battery fully,</strong> then disconnect it for the winter on
    riding mowers and tractors. For battery tools, store at 40–60% and top up monthly.</li>
  <li><strong>Clean the deck underside and wheels,</strong> and remove grass that holds
    moisture against metal.</li>
  <li><strong>Cover or store indoors</strong> if you can. If it stays outside, at least
    protect the machine from standing water and snow.</li>
</ul>

<h2>Winter: storage</h2>

<ul>
  <li><strong>Store in a dry, covered space</strong> where possible, out of the way of
    foot traffic and moisture.</li>
  <li><strong>Raise the tyres off bare concrete</strong> to protect them from moisture.</li>
  <li><strong>Don't start the engine briefly "to keep it running."</strong> Short runs
    without moving the machine can cause condensation inside, which is worse than leaving
    it idle. If you start it, run it until thoroughly warm.</li>
  <li><strong>Top up battery tools monthly</strong> to keep them around half charge.</li>
  <li><strong>Check the manual for any model-specific storage steps</strong> — for
    zero-turn machines in particular, the specifics matter.</li>
</ul>

<h2>A quick reference: what wears, and how often</h2>

<table>
  <caption>Consumable replacement intervals by duty level</caption>
  <thead>
    <tr>
      <th scope="col">Item</th>
      <th scope="col">Residential</th>
      <th scope="col">Semi-pro</th>
      <th scope="col">Check for wear</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Air filter</th>
      <td>Every season</td>
      <td>Monthly in season</td>
      <td>Every few cuts</td>
    </tr>
    <tr>
      <th scope="row">Engine oil</th>
      <td>Every 25 hours or annually</td>
      <td>Every 50 hours</td>
      <td>Level weekly in season</td>
    </tr>
    <tr>
      <th scope="row">Spark plug</th>
      <td>Every season</td>
      <td>Every season</td>
      <td>If starting is hard</td>
    </tr>
    <tr>
      <th scope="row">Blade (sharpen)</th>
      <td>Every 25 hours</td>
      <td>Every 25 hours</td>
      <td>Every few cuts</td>
    </tr>
    <tr>
      <th scope="row">Blade (replace)</th>
      <td>Annually</td>
      <td>Annually</td>
      <td>When fraying or bent</td>
    </tr>
    <tr>
      <th scope="row">Drive belt</th>
      <td>Not routine</td>
      <td>Annually</td>
      <td>Slipping or frayed</td>
    </tr>
  </tbody>
</table>

<p class="fine-print">Intervals are general guidance based on typical residential and
semi-professional use. Your model's manual takes precedence, and duty level is listed on
each product page.</p>

<h2>Find the right part</h2>

<p>Blades, filters, spark plugs and belts are wear items and are not covered by warranty —
see our <a href="/pages/warranty">warranty page</a>. To identify the correct part for your
model, we need the model number from the identification plate under the deck cover, or the
model number printed on the original carton. Contact our service team with it and we will
confirm the part.</p>

<p>Not sure which machine fits your yard? The
<a href="/collections">collection pages</a> group our walk-behind mowers, riding mowers
and accessories by type and size.</p>
```

---

## 发布注意点

| 项 | 说明 |
| --- | --- |
| **blog handle** | 按后台实际填（`maintenance-guides` 或你建的名称）。文章链接 `/pages/warranty` 需与你实际建的 page handle 一致——上面用的就是我在 `support-pages-content.md` 里建议的 `warranty` |
| **集合链接** | 文中 `/collections` 是**集合列表页**（模板 `list-collections.json`），一定存在；`/collections/blades-bars` 这类**具体集合路径我没有写进去**——集合 handle 你自己定，写死会 404 |
| **表格 caption** | 第二篇含 `<caption>` + 9 个 `th scope`。发布后确认 caption 未被富文本编辑器剥离 |
| **周期数字** | 表里的保养间隔是**行业常规口径**（residential / semi-pro），不是编的；但已用 `fine-print` 注明"以你的型号手册为准"，且产品页有 `spec.duty_level` 字段可对齐 |
| **六角扳手规格** | 文中写 6 mm (1/4 in)——常见 M14 中心螺栓配的内六角即此规格。**具体仍以型号手册为准**，文中已反复指向手册 |
| **别写具体商品 handle** | 耗材商品尚未进 CSV，所以文章链接一律指向集合路径。将来耗材导入了也不用改文章 |
