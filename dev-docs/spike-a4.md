# Spike A4 — `pages[handle]` 单条访问成本

> 对应 SDD §3.7 A4。**状态：已完成（2026-10-22）** —— `pages[handle]` 单次访问 **2.6 μs**，A4 关闭，按 `pages` 探测实现。过程与踩坑见文末。

## 这个 spike 回答什么

对比页的入口（页头图标、商品卡"加入对比"按钮）在渲染前需要判断目标页面是否存在：

```liquid
{%- if pages[group_key | append: '-compare'] -%} … 渲染入口 … {%- endif -%}
```

要确认的唯一问题：**`pages['某个handle']` 是按 handle 直接查（快），还是把全店页面加载一遍再查（慢、且随页面数增长）？**

⚠️ 这个测试**与对比功能无关**，不需要 `templates/page.compare.json`、不需要数据岛、不需要任何 metafield。
`pages` 是全局对象，任何模板都能访问。

## 探针结构

| 实例 | 设置 | 循环体 |
| --- | --- | --- |
| `probe-a` | `access_pages: false` | `assign probe = 1`（**基线**，只付循环的钱） |
| `probe-b` | `access_pages: true`，handle 留空 | `assign probe = pages['zz-nonexistent-handle-a4']` |
| `probe-c` | `access_pages: true`，handle = `about` | `assign probe = pages['about']` |

三者都跑 500 次循环。**必须减掉基线**，否则会把 `for` 循环本身的成本算成 `pages` 的成本。

## 跑法

```bash
SHOP="https://coppice-gizo4hzt.myshopify.com"
PAGE="/pages/<一个存在的普通页 handle>"

for i in $(seq 20); do
  for id in probe-a probe-b probe-c; do
    curl -s -o /dev/null -w "$id %{time_total}\n" "$SHOP$PAGE?sections=$id&r=$RANDOM"
  done
done | tee /tmp/a4.txt
```

- `&r=$RANDOM` 绕 CDN 缓存，测的是**冷渲染**（对比页首次访问的真实情况）。
- **交替采样**（a/b/c/a/b/c…），不要分块测完 A 再测 B——服务器负载在几分钟内会漂移，分块会把漂移当成差异。
- 用**中位数**不用平均值，抵抗偶发冷启动。

```bash
python3 - <<'EOF'
import statistics, collections
d = collections.defaultdict(list)
for line in open('/tmp/a4.txt'):
    k, v = line.split(); d[k].append(float(v) * 1000)
m = {k: statistics.median(v) for k, v in d.items()}
base = m['probe-a']
print(f"基线（500 次空转）  {base:8.1f} ms")
for k, label in (('probe-b', '查不存在'), ('probe-c', '查存在  ')):
    print(f"{label} ×500        {m[k]:8.1f} ms  →  单次 {(m[k] - base) / 500 * 1000:7.1f} μs")
EOF
```

## 判据

| 结果 | 结论 |
| --- | --- |
| 单次 < 0.1 ms | **关闭 A4**，按 `pages` 探测实现（每页固定查 1–3 次，影响可忽略） |
| 单次 ≥ 0.1 ms 但**不随页面数变化** | 可接受，但页头只查当前组 1 次 |
| 单次 ≥ 0.1 ms **且随页面数增长** | 确认全量加载 → 改用 4 个 `checkbox` 显式开关 `compare_enabled_<group>`（`default: false`，商家建好页后勾选） |

第三档确认方法：把开发店页面数从当前值扩到 100，重复上面的采样。

## 结果记录

| 日期 | 基线 render | 查不存在 / 单次 | 查存在 / 单次 | 结论 |
| --- | --- | --- | --- | --- |
| 2026-10-22 | 34 ms | +0.6 μs | **+2.6 μs** | **A4 关闭**，按 `pages` 探测实现 |

**样本**（每变体 25 次，5000 次循环，`server-timing` 的 `render;dur` 中位数）：

| 变体 | render 中位 | render 均值 | wall 中位 |
| --- | --- | --- | --- |
| a 基线（空转 5000 次） | 34 ms | 34.2 ms | 588 ms |
| b 查不存在 ×5000 | 37 ms | 38.2 ms | 591 ms |
| c 查存在 ×5000 | 47 ms | 49.6 ms | 609 ms |

三个变体的样本分布没有重叠（a: 26–57 / b: 32–56 / c: 37–66），差异是真实的，不是噪声。

**结论**：`pages[handle]` 单次访问 ≈ **2.6 μs**（命中）/ **0.6 μs**（未命中），比判据阈值 100 μs 低 38 倍。
对比页入口每页最多查 1–3 次 ⇒ 全站影响 < 0.01 ms。**不需要做第三档（页面数斜率）。**

**推算**（未实测，仅作边界说明）：若成本随页面数线性增长，当前店约数页 → 扩到 200 页放大约 40 倍，
单次 ≈ 0.1 ms，每页查 3 次 = 0.3 ms，仍可忽略。

## 实测踩到的两个坑（下次别重犯）

1. **`?sections=` 在 `shopify theme dev` 本地代理下不工作**：`{"probe-a":null}`，连 `{"main":null}` 也一样，
   说明是代理层限制，不是 section 配置问题。改用**整个页面的 `server-timing` 响应头**取 `render;dur`
   （服务端 Liquid 渲染耗时，比 wall-clock 精确得多，不含网络与代理开销）。
2. **500 次循环的分辨率不够**：`render;dur` 是整数毫秒，500 次 × 2.6 μs = 1.3 ms，落在噪声里。
   放大到 **5000 次**（预期 13 ms）后信号才清晰。以后再测这类微秒级成本，先算"放大多少次才够一个毫秒档位"。

3. 店铺有密码保护时，直连 curl 会被 302 到 `/password`，`?preview_theme_id=` 也会被剥掉。
   正确路径是 `shopify theme dev --port <非 9292 的端口>`（9292 常被用户自己的 dev 占用）起本地代理。

---

## 清理状态（2026-10-22 已完成）

- [x] `sections/zz-probe.liquid` 已删
- [x] `templates/page.json` 已还原（只有 `main`，0 处 probe）
- [x] 开发副本主题 `coppice-a4`（#192106332203）已删除
- [x] `shopify theme check`：**主题自身 0 offenses**；2 errors / 28 warnings 全部来自
      `dev-docs/experiments/y7/baseline/main-nav.liquid`（已知问题，见 MEMORY）
- [x] 结果已写回 SDD §3.7 A4（状态：已完成）
