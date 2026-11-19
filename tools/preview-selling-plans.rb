#!/usr/bin/env ruby
# frozen_string_literal: true

# 购买选项（selling plan）本地预览 —— 用仓库里真实的
#   snippets/selling-plan-picker.liquid
#   sections/main-product.liquid 的 {% stylesheet %}
#   assets/selling-plan-picker.js / assets/critical.css
# 渲染出三种商品形态的完整页面，输出单个 HTML 文件，浏览器直接打开即可点选。
#
# 为什么需要它：演示店没有订阅 app，`product.selling_plan_groups` 恒为空，
# 这块在店铺里永远不渲染（见 dev-docs/task-product.md §5 风险 13）。
# 本脚本用真实模板 + 手造 product 数据，把 Liquid 层（数据岛 JSON、循环、条件、
# 折扣徽标、选中态）和 JS 层（变体联动、价格覆盖、提交校验）一起跑到可看的程度。
#
# 依赖（本机已验证：Ruby 2.6 + liquid 5.3）：
#   gem install liquid -v 5.3.0 --user-install
#
# 用法：
#   ruby tools/preview-selling-plans.rb [输出路径]
#   默认输出 /tmp/coppice-selling-plans-preview.html

require 'liquid'
require 'json'
require 'cgi'
require 'tmpdir'

ROOT = File.expand_path('..', __dir__)
OUT  = ARGV[0] || '/tmp/coppice-selling-plans-preview.html'

# ---- Shopify 侧过滤器的本地替身 -------------------------------------------
# 只实现本 snippet 用到的那些；取值口径与平台一致（money 用分为单位）。
locale_src = File.read(File.join(ROOT, 'locales/en.default.json')).sub(%r{\A\s*/\*.*?\*/}m, '')
LOCALE = JSON.parse(locale_src)

module ShopFilters
  def money(input)
    return nil if input.nil?

    whole, frac = format('%.2f', input / 100.0).split('.')
    "$#{whole.reverse.scan(/\d{1,3}/).join(',').reverse}.#{frac}"
  end

  # Shopify 平台自带 `json` 过滤器，本地 liquid gem 没有，补等价实现
  def json(input)
    JSON.generate(input)
  end

  # 只解析 t: 键，占位符按 {{ name }} 形式替换
  def t(key, args = {})
    str = LOCALE.dig(*key.split('.')) || "MISSING(#{key})"
    args.each { |k, v| str = str.gsub("{{ #{k} }}", v.to_s) }
    str
  end
end
Liquid::Template.register_filter(ShopFilters)

# ---- 抽出 section 里的真实样式 -------------------------------------------
section_src = File.read(File.join(ROOT, 'sections/main-product.liquid'))
css = section_src[%r{\{%\s*stylesheet\s*%\}(.*?)\{%\s*endstylesheet\s*%\}}m, 1]
abort '找不到 main-product.liquid 的 {% stylesheet %} 块' if css.nil?
if css.include?('{{') || css.include?('{%')
  abort '样式块里出现了 Liquid —— {% stylesheet %} 只允许静态代码（theme check 会报）'
end
css_path = File.join(Dir.tmpdir, 'coppice-main-product.css')
File.write(css_path, css)

# ---- 手造数据 -------------------------------------------------------------
def plan(id, name, adjustments)
  { 'id' => id, 'name' => name, 'price_adjustments' => adjustments }
end

def alloc(p, price, compare)
  { 'selling_plan' => p, 'price' => price, 'compare_at_price' => compare }
end

plan_30 = plan(9001, 'Deliver every 30 days', [{ 'value_type' => 'percentage', 'value' => 10 }])
# 计划名自带百分比（app 生成的常见形态）：徽标应不出现，避免 "15% off  Save 15%" 重复
plan_60 = plan(9002, 'Deliver every 60 days, 15% off', [{ 'value_type' => 'percentage', 'value' => 15 }])
# 多层定价（前 3 个月 20%、之后 15%）：按设计**不该**出百分比徽标
plan_multi = plan(9003, 'First 3 months 20% off', [
                    { 'value_type' => 'percentage', 'value' => 20 },
                    { 'value_type' => 'percentage', 'value' => 15 }
                  ])

v_a = { 'id' => 4001, 'price' => 129_900, 'compare_at_price' => 149_900, 'requires_selling_plan' => false,
        'selling_plan_allocations' => [alloc(plan_30, 116_910, 129_900),
                                       alloc(plan_60, 110_415, 129_900),
                                       alloc(plan_multi, 103_920, 129_900)] }
v_b = { 'id' => 4002, 'price' => 149_900, 'compare_at_price' => 0, 'requires_selling_plan' => false,
        'selling_plan_allocations' => [alloc(plan_60, 127_415, 149_900)] }

group = { 'id' => 77, 'name' => 'Subscribe & save', 'selling_plans' => [plan_30, plan_60, plan_multi] }

product_a = {
  'requires_selling_plan' => false,
  'selected_selling_plan' => nil,
  'selected_selling_plan_allocation' => nil,
  'selected_or_first_available_variant' => v_a,
  'variants' => [v_a, v_b],
  'selling_plan_groups' => [group]
}

# 强制订阅：一次性项不该出现，legend 应视觉隐藏
product_b = product_a.merge(
  'requires_selling_plan' => true,
  'variants' => [v_a.merge('requires_selling_plan' => true), v_b.merge('requires_selling_plan' => true)]
)

# URL 带 ?selling_plan=9002：该计划应默认选中，价格按 allocation 走
product_c = product_a.merge(
  'selected_selling_plan' => plan_60,
  'selected_selling_plan_allocation' => alloc(plan_60, 110_415, 129_900)
)

SNIPPET = File.read(File.join(ROOT, 'snippets/selling-plan-picker.liquid'))

def render_case(product, section_id)
  Liquid::Template.parse(SNIPPET).render(
    'product' => product,
    'variant' => product['selected_or_first_available_variant'],
    'section' => { 'id' => section_id }
  )
end

cases = [
  ['形态 1 · 允许一次性（2 变体，变体 1 支持 3 个计划）', 'case-a', render_case(product_a, 'case-a'), 4001, '$1,299.00'],
  ['形态 2 · 强制订阅（所有变体都要求计划）', 'case-b', render_case(product_b, 'case-b'), 4001, '$1,299.00'],
  ['形态 3 · URL 带 ?selling_plan=（应默认选中 60 天计划）', 'case-c', render_case(product_c, 'case-c'), 4001, '$1,299.00']
]

blocks = cases.map do |title, section_id, html, variant_id, price|
  <<~HTML
    <section class="main-product" data-save-template="Save [percent]%" data-section-id="#{section_id}">
      <h3 class="case-title">#{CGI.escapeHTML(title)}</h3>
      <div class="main-product__price">
        <span class="main-product__price-current" data-price>#{price}</span>
        <s class="main-product__price-compare" data-compare-price hidden></s>
        <span class="main-product__price-save" data-save-badge hidden></span>
      </div>
      <input type="hidden" name="id" value="#{variant_id}" data-variant-input>
      <form class="product-form__form">
        #{html}
      </form>
    </section>
  HTML
end

page = <<~HTML
  <!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Coppice — 购买选项预览（selling plans）</title>
    <link rel="stylesheet" href="file://#{ROOT}/assets/critical.css">
    <link rel="stylesheet" href="file://#{css_path}">
    <style>
      /* 只补主题里由 snippets/css-variables.liquid 输出的变量（Coppice 浅色 preset） */
      :root {
        --color-background: #FFFFFF;
        --color-foreground: #333333;
        --color-brand: #1E4B3C;
        --color-brand-accent: #2E6B4E;
        --color-foreground-muted: color-mix(in srgb, #333333 70%, transparent);
        --style-border-radius-inputs: 6px;
        --font-primary--family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        --page-width: 1200px;
        --page-margin: 20px;
      }
      html, body { display: block; }
      body { font-family: var(--font-primary--family); background: var(--color-background);
             color: var(--color-foreground); padding: 24px; margin: 0; }
      .main-product { max-width: 420px; margin: 0 0 40px; }
      .case-title { font-size: 13px; text-transform: uppercase; letter-spacing: .04em;
                    color: #666; margin: 0 0 12px; }
    </style>
  </head>
  <body>
    #{blocks.join("\n")}
    <script src="file://#{ROOT}/assets/selling-plan-picker.js"></script>
  </body>
  </html>
HTML

File.write(OUT, page)
puts "已生成：#{OUT}"
puts

# 数据岛自检：JSON 必须可解析，否则 JS 会静默放弃接管
cases.each do |title, _sid, html, _vid, _price|
  raw = html[/data-plan-json>(.*?)<\/script>/m, 1]
  parsed = JSON.parse(raw)
  summary = parsed.map { |vid, v| "#{vid}: 计划 #{v['plans'].size} 个 / requiresPlan=#{v['requiresPlan']}" }.join(' | ')
  puts "  ✓ #{title}\n      #{summary}"
rescue JSON::ParserError => e
  abort "  ✗ #{title} 数据岛不是合法 JSON：#{e.message}"
end

puts
puts '浏览器打开即可点：切换选项看价格与徽标、看组名与一次性项的条件渲染。'
puts '注意：这份预览用的是手造 product 数据，只覆盖 Liquid + JS + CSS，不含店铺侧真实计划。'
