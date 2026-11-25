#!/usr/bin/env ruby
# frozen_string_literal: true

# 商品卡「快速查看」本地预览 —— 用仓库里真实的
#   snippets/product-card.liquid + snippets/quick-view.liquid
#   assets/product-card.css + assets/critical.css
#   assets/quick-view.js + assets/product-form.js + assets/bottom-sheet.js
# 渲染出三张卡（多变体有货 / 多变体全售罄 / 单变体），浏览器打开即可点选。
#
# 为什么需要它：演示店没有多变体商品（`dev-docs/task-product.md` 风险 12：
# 21 款全是 Default Title），快速查看在店铺里看不到。本脚本用真实模板 + 手造
# product 数据，把 Liquid 层（三态分流、option 的 data-*、缩略图上限）与
# JS 层（variant select 联动、缩略图切图、加购后收面板）跑到可看的程度。
#
# 桩 ≠ 平台的三处已知偏差（照 lib/preview-selling-plans.rb 的经验处理）：
#   1. `x == blank` 在 liquid gem 里对 nil 不成立（Shopify 成立）→ 桩副本把
#      `blank` 字面替换成 `nil`，用例里的"空"一律用缺键表达。
#   2. `product.gift_card?` 的 `?` 不是合法变量字符 → 桩副本改写成
#      `product.gift_card`，数据里给 false。
#   3. `{% doc %}` / `{% enddoc %}` 是 Shopify 扩展 → 解析前整块剥掉。
#
# 依赖：gem install liquid -v 5.3.0 --user-install
#
# 用法：
#   ruby tools/preview-quick-view.rb [输出路径]
#   ruby tools/preview-quick-view.rb --measure     # 只打印单卡面板字节数

require 'liquid'
require 'json'
require 'zlib'

ROOT = File.expand_path('..', __dir__)
OUT  = if ARGV[0] && !ARGV[0].start_with?('--')
         ARGV[0]
       elsif ARGV.include?('--no-extras')
         '/tmp/coppice-quick-view-preview-noextras.html'
       elsif ARGV.include?('--no-warranty')
         '/tmp/coppice-quick-view-preview-nowarranty.html'
       else
         '/tmp/coppice-quick-view-preview.html'
       end
MEASURE_ONLY = ARGV.include?('--measure')
# --no-extras：模拟商家把「规格 / 信任」两个总开关关掉（2026-11-21 新增设置）
NO_EXTRAS = ARGV.include?('--no-extras')
# --no-warranty：模拟关掉「保修徽标」开关（它不在 qv_trust_1..3 那三行里，
# 是自动项 —— 2026-11-21 刘工问"为什么弹窗有 4 条、设置只有 3 条"就是它）
NO_WARRANTY = ARGV.include?('--no-warranty')

locale_src = File.read(File.join(ROOT, 'locales/en.default.json')).sub(%r{\A\s*/\*.*?\*/}m, '')
LOCALE = JSON.parse(locale_src)

def shopifyize(src)
  out = src.gsub(/\{%-?\s*doc\s*-?%\}.*?\{%-?\s*enddoc\s*-?%\}/m, '')
  # `{% # 行内注释 %}` 也是平台扩展：gem 的标签名正则只认 \w，连名字都取不出来 → 整条剥掉
  out = out.gsub(/\{%-?\s*#.*?-?%\}/m, '')
  # `{% liquid %}` 里的 `#` 行注释同上 —— 只剥注释行
  out = out.gsub(/\{%-?\s*liquid\b.*?-?%\}/m) { |block| block.gsub(/^\s*#[^\n]*\n/, '') }
  out = out.gsub(/\bproduct\.gift_card\?/, 'product.gift_card')
  out.gsub(/\bblank\b/, 'nil')
end

module ShopFilters
  def money(input)
    return nil if input.nil?

    whole, frac = format('%.2f', input / 100.0).split('.')
    "$#{whole.reverse.scan(/\d{1,3}/).join(',').reverse}.#{frac}"
  end

  def json(input)
    JSON.generate(input)
  end

  def t(key, args = {})
    str = LOCALE.dig(*key.split('.')) || "MISSING(#{key})"
    args.each { |k, v| str = str.gsub("{{ #{k} }}", v.to_s) }
    str
  end

  # 假 CDN：图片对象带 url/width/height/alt。file:// 下不支持查询串，
  # 所以 image_url 只出裸路径（宽高由 image_tag 的 width/height 属性表达），
  # srcset 仅在该路径带 ?w= 时才生成——桩不追求 srcset 保真，只为不被浏览器
  # 当成"坏图"而看不出布局。
  def image_url(image, _params = {})
    return nil if image.nil?

    "file://#{ROOT}/dev-docs/local-assets/#{image['url']}"
  end

  def image_tag(source, params = {})
    return nil if source.nil?

    path, width = source.split('?w=')
    width = (width || params['width'] || 800).to_i
    widths = params['widths'] ? params['widths'].split(',').map(&:to_i) : []
    attrs = []
    attrs << %(src="#{path}")
    attrs << %(srcset="#{widths.map { |w| "#{path} #{w}w" }.join(', ')}") unless widths.empty?
    attrs << %(sizes="#{params['sizes']}") if params['sizes']
    attrs << %(width="#{params['width'] || width}")
    attrs << %(height="#{params['height'] || width}")
    attrs << %(loading="#{params['loading']}") if params['loading']
    attrs << %(class="#{params['class']}") if params['class']
    # Shopify 的 image_tag 在 alt 为空时整条属性被吞掉，桩照此实现，
    # 好让 snippet 里那段 replace: '<img ', '<img alt="" ' 真的被验到
    attrs << %(alt="#{params['alt']}") if params['alt'] && !params['alt'].empty?
    "<img #{attrs.join(' ')}>"
  end

  # 平台签名：{{ 'product-1' | placeholder_svg_tag: 'class' }} —— 输入是占位图名
  def placeholder_svg_tag(_name, class_name = 'placeholder-svg')
    %(<svg class="#{class_name}" viewBox="0 0 100 100" aria-hidden="true"></svg>)
  end

  def inline_asset_content(name)
    File.read(File.join(ROOT, 'assets', name))
  end

  # css-variables 用到的几个：color_brightness 算 luma，字体两个只求不炸
  def color_brightness(color)
    return 255 if color.nil? || color.to_s.empty?

    r, g, b = color.to_s.delete('#').scan(/../).map { |c| c.to_i(16) }
    return 255 if r.nil?

    ((r * 299) + (g * 587) + (b * 114)) / 1000
  end

  def font_face(_font, _params = {})
    ''
  end

  def font_modify(font, _attr = nil, _value = nil)
    font
  end

  # 加速结账 / 分期：平台 filter，gem 没有。桩返回**假标记**（形状对得上即可），
  # 用来验"容器只在有内容时出现"以及间距；真样式归平台，桩不模拟。
  # 输出**平台旧版（非 shadow DOM）的类名**，这样 critical.css 里那套
  # `.accelerated-checkout .shopify-payment-button__button--unbranded` 真的会命中，
  # 截图能看出"胶囊描边"的形态是否与产品页一致。真按钮在 closed shadow DOM 里，
  # 主题只能通过官方自定义属性影响它（见 critical.css 该段注释）。
  def payment_button(_form)
    '<button type="button" class="shopify-payment-button__button shopify-payment-button__button--unbranded">Buy with Shop Pay</button>'
  end

  def payment_terms(_form)
    '<div class="stub-terms">4 interest-free payments of $324.75 with Shop Pay</div>'
  end
end
Liquid::Template.register_filter(ShopFilters)

# gem 的 LocalFileSystem 用 `[a-zA-Z0-9_/]` 校验片段名，**连字符一律拒绝**
# （quick-view / product-card / spec-value 全中）。这里放宽到允许 `-`，
# 其余仍按 gem 的规则防目录穿越。
class DashedSnippets < Liquid::LocalFileSystem
  TEMPLATE_NAME = %r{\A[^./][\w\-/]+\.?\w*\z}.freeze

  def full_path(template_path)
    unless template_path =~ TEMPLATE_NAME && !template_path.include?('..')
      raise Liquid::FileSystemError, "Illegal template name '#{template_path}'"
    end

    File.join(@root, "#{template_path}.liquid")
  end

  # 片段也要过 shopifyize：`{% doc %}` 是平台扩展，直接读原文会解析失败
  def read_template_file(template_path)
    shopifyize(File.read(full_path(template_path)))
  end
end
Liquid::Template.file_system = DashedSnippets.new(File.join(ROOT, 'snippets'), '%s.liquid')

# `{% form 'product' %}` 是平台标签（gem 没有）：桩只出 <form> 外壳 + 一个假的
# form 变量。quick-view / product-card 都不用 form 的对象能力（payment_button、
# payment_terms），所以不做更细的仿真。
class StubFormTag < Liquid::Block
  def render(context)
    context.stack do
      context['form'] = { 'id' => 'stub-form' }
      %(<form method="post" action="/cart/add" data-stub-form>#{super}</form>)
    end
  end
end
Liquid::Template.register_tag('form', StubFormTag)

# `{% style %}` / `{% # 注释 %}` 同样是平台标签：前者出 <style>，后者什么都不出
class StubStyleTag < Liquid::Block
  def render(context)
    "<style>#{super}</style>"
  end
end
class StubHashComment < Liquid::Tag
  def render(_context)
    ''
  end
end
Liquid::Template.register_tag('style', StubStyleTag)
Liquid::Template.register_tag('#', StubHashComment)

# ---- 手造商品数据 ----------------------------------------------------------
# media 必须带 id：变体图联动靠 variant.featured_media.id → 缩略图的 data-media-id
# 对上（2026-11-21 改成共享 variant-picker 后，mediaId 来自变体 JSON 数据岛）。
def image(name, alt = '', width = 1200)
  $media_seq = ($media_seq || 0) + 1
  { 'id' => 700_000 + $media_seq, 'url' => name, 'width' => width, 'height' => width, 'alt' => alt }
end

def variant(id, value, price, compare, available, img)
  {
    'id' => id, 'title' => value, 'available' => available,
    'price' => price, 'compare_at_price' => compare,
    'featured_media' => { 'id' => img['id'], 'preview_image' => img },
    'options' => [value], 'unit_price_measurement' => nil
  }
end

def product(id:, title:, handle:, variants:, media:, available: true, selling_plans: [],
            option_name: 'Motor power')
  # media 传的是图片数组，这里包成平台的 media 对象形状（有 .id / .preview_image）
  media_items = media.map { |img| { 'id' => img['id'], 'preview_image' => img } }
  first_available = variants.find { |v| v['available'] } || variants.first
  values = variants.map { |v| v['options'].first }
  {
    'id' => id, 'title' => title, 'handle' => handle,
    'url' => "/products/#{handle}",
    'available' => available,
    'price' => variants.map { |v| v['price'] }.min,
    # 变体价差：平台在 Liquid 侧给的就是这个布尔（卡片据此出 "From" 并关掉折扣胶囊）
    'price_varies' => variants.map { |v| v['price'] }.uniq.size > 1,
    'compare_at_price' => variants.map { |v| v['compare_at_price'] }.max,
    'variants' => variants,
    'has_only_default_variant' => variants.size == 1,
    'options_with_values' => [
      { 'name' => option_name, 'position' => 1, 'values' => values,
        'selected_value' => first_available['options'].first }
    ],
    'media' => media_items,
    'featured_media' => media_items.first,
    'featured_image' => media.first,
    'selected_or_first_available_variant' => first_available,
    'selling_plan_groups' => selling_plans,
    'gift_card' => false,
    # 参数行（spec-bullets）读的就是这几个；给 mock 值只为让弹窗里那三条出现
    'metafields' => {
      'spec' => {
        'cutting_width_mm' => { 'value' => 533 },
        'power_w' => { 'value' => 1600 },
        'power_source' => { 'value' => 'Battery' },
        'drive_type' => { 'value' => 'Rear-wheel drive' },
        'displacement_cc' => { 'value' => nil },
        'warranty_months' => { 'value' => 60 }
      },
      'platform' => { 'battery_platform' => { 'value' => '80V' } }
    }
  }
end

mower_imgs = [
  image('product-mower/product-nb-21b80-1-main.png', 'NB-21B80 front'),
  image('product-mower/product-nb-21b80-2-kit.png', 'NB-21B80 kit'),
  image('product-mower/product-nb-21bp-1-main.png', 'NB-21BP front'),
  image('product-mower/product-nb-21bs-1-main.png', 'NB-21BS front')
]

multi_available = product(
  id: 8_100_001, title: 'NB-21B80 21" Self-Propelled Mower', handle: 'nb-21b80',
  variants: [
    variant(90_001, '1,600 W', 129_900, 149_900, true, mower_imgs[1]),
    variant(90_002, '1,200 W', 89_900, 99_900, false, mower_imgs[2]),
    variant(90_003, '1,000 W', 139_900, 159_900, true, mower_imgs[3])
  ],
  media: mower_imgs
)

multi_sold_out = product(
  id: 8_100_002, title: 'NB-22SP 22" Steel-Deck Mower', handle: 'nb-22sp',
  variants: [
    variant(90_011, '1,600 W', 159_900, 179_900, false, mower_imgs[0]),
    variant(90_012, '1,400 W', 179_900, 199_900, false, mower_imgs[1])
  ],
  media: mower_imgs, available: false
)

single = product(
  id: 8_100_003, title: 'NB-C16G 16" Gas Chainsaw', handle: 'nb-c16g',
  variants: [variant(90_021, 'Default Title', 24_900, 29_900, true,
                     image('product-chainsaw/product-chainsaw-nb-c16g-1-main.png', 'C16G'))],
  media: [image('product-chainsaw/product-chainsaw-nb-c16g-1-main.png', 'C16G')]
)

# 订阅商品：面板不该出现，只留产品页链接
sub_product = product(
  id: 8_100_004, title: '2-Stroke Oil 1L (subscription)', handle: 'oil-1l',
  variants: [
    variant(90_031, '1 L', 1_290, 1_290, true, mower_imgs[0]),
    variant(90_032, '5 L', 4_990, 4_990, true, mower_imgs[0])
  ],
  media: [mower_imgs[0]], option_name: 'Size',
  selling_plans: [{ 'name' => 'Deliver every 30 days' }]
)

# ---- 配色令牌：直接渲染真实的 snippets/css-variables.liquid -----------------
# 不手抄 :root（手抄会与线上漂移）：用 config/settings_data.json 的当前分组喂给
# 真 snippet，color-mix / oklch 这些公式原样保留。
settings_src = File.read(File.join(ROOT, 'config/settings_data.json')).sub(%r{\A\s*/\*.*?\*/}m, '')
SETTINGS = JSON.parse(settings_src)['current'] || {}
if NO_EXTRAS
  SETTINGS['qv_show_specs'] = false
  SETTINGS['qv_show_trust'] = false
end
SETTINGS['qv_show_warranty'] = false if NO_WARRANTY
SETTINGS['type_primary_font'] = {
  'family' => 'Work Sans', 'fallback_families' => 'sans-serif',
  'style' => 'normal', 'weight' => 400
}
tokens_css = Liquid::Template
             .parse(shopifyize(File.read(File.join(ROOT, 'snippets/css-variables.liquid'))))
             .render!('settings' => SETTINGS)

# ---- 渲染 -----------------------------------------------------------------
card_tpl = Liquid::Template.parse(shopifyize(File.read(File.join(ROOT, 'snippets/product-card.liquid'))))
quick_view_tpl = Liquid::Template.parse(shopifyize(File.read(File.join(ROOT, 'snippets/quick-view.liquid'))))
picker_tpl = Liquid::Template.parse(shopifyize(File.read(File.join(ROOT, 'snippets/variant-picker.liquid'))))

# PDP 形态的买盒壳（2026-11-21）：验证「同一个 <variant-picker> 在另一个作用域里
# 也能工作」——尤其是产品页特有的 `form` 属性路径（选择器在 <form> 之外）。
# 这是**契约壳**，不是 main-product 的拷贝：只复刻 product-form.js 认识的那些
# data-* 钩子；main-product 的真实标记不走这个桩（它需要 section.settings 等）。
def render_pdp_shell(product, picker_tpl)
  form_id = 'pdp-stub-form'
  picker = picker_tpl.render!('product' => product, 'form_id' => form_id)
  <<~HTML
    <section class="demo-pdp" data-variant-scope data-section-id="pdp-stub"
             data-save-template="Save [percent]%"
             data-unit-class="demo-pdp__unit">
      <div class="demo-pdp__price" data-price-block>
        <span class="demo-pdp__price-current" data-price>#{product['selected_or_first_available_variant']['price']}</span>
        <s data-compare-price hidden></s>
        <span data-save-badge hidden></span>
      </div>
      <p class="demo-pdp__unit" data-unit-price hidden></p>
      #{picker}
      <product-form class="demo-pdp__form">
        <form id="#{form_id}" method="post" action="/cart/add">
          <input type="hidden" name="id" value="#{product['selected_or_first_available_variant']['id']}" data-variant-input>
          <button type="submit" class="btn-solid" data-add-button
                  data-add-label="Add to cart" data-sold-out-label="Sold out"
                  data-added-label="Added" data-error-message="Could not add to cart.">Add to cart</button>
        </form>
      </product-form>
    </section>
  HTML
end

def render_card(tpl, product)
  # render! 而非 render：桩里出 Liquid 报错要当场炸掉，不允许"页面上留一句
  # Liquid error"被截图带过去（这就是 2026-11-20 第一次跑桩时漏掉整块 CTA 的原因）
  tpl.render!(
    'product' => product,
    'quick_add' => true,
    'show_width' => false,
    'show_cc' => false,
    'show_power' => false,
    'show_weight' => false,
    'sizes' => '(min-width: 750px) 240px, 45vw',
    'routes' => { 'cart_add_url' => '/cart/add' },
    'request' => { 'locale' => { 'iso_code' => 'en' } },
    'shop' => { 'money_format' => '${{ amount }}' },
    # 主题设置：信任徽标文案来自 settings.qv_trust_*，桩必须把 settings 传进去
    'settings' => SETTINGS
  )
end

cases = [
  ['多变体 · 有货（2 个可售 + 1 个售罄）', multi_available],
  ['多变体 · 全部售罄', multi_sold_out],
  ['单变体 · 有货（走 quick-add，对照用）', single],
  ['多变体 · 带订阅计划（只留链接，不弹窗）', sub_product]
]

if MEASURE_ONLY
  cases.each do |label, prod|
    html = quick_view_tpl.render('product' => prod, 'routes' => { 'cart_add_url' => '/cart/add' }, 'shop' => { 'money_format' => '${{ amount }}' }, 'settings' => SETTINGS)
    next if html.strip.empty?

    gz = Zlib.gzip(html).bytesize
    puts format('%-28s raw %6d B   gzip %5d B', label, html.bytesize, gz)
  end

  # 整页增量：面板结构高度重复，gzip 会跨卡去重 —— 24 张多变体卡的压缩增量
  # 远小于 24 × 单卡，把这个数一起印出来，免得拿单卡数字吓人。
  panel = quick_view_tpl.render('product' => multi_available, 'routes' => { 'cart_add_url' => '/cart/add' }, 'shop' => { 'money_format' => '${{ amount }}' }, 'settings' => SETTINGS)
  puts format('24 张多变体卡：gzip 增量 %5d B（结构重复，跨卡去重后）', Zlib.gzip(panel * 24).bytesize - Zlib.gzip('').bytesize)
  exit
end

cards = cases.map do |label, prod|
  <<~HTML
    <section class="demo-block">
      <h2 class="demo-label">#{label}</h2>
      <ul class="demo-grid" role="list"><li>#{render_card(card_tpl, prod)}</li></ul>
    </section>
  HTML
end.join("\n")

# PDP 契约壳单独一块：证明同一套 <variant-picker> 在「另一个作用域 + form 属性」下也成立
pdp_block = <<~HTML
  <section class="demo-block">
    <h2 class="demo-label">PDP 形态买盒（同一套 variant-picker，作用域换成 section）</h2>
    #{render_pdp_shell(multi_available, picker_tpl)}
  </section>
HTML

page = <<~HTML
  <!doctype html>
  <html lang="en" class="js">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Coppice · 商品卡快速查看预览</title>
    #{tokens_css}
    <link rel="stylesheet" href="file://#{ROOT}/assets/critical.css">
    <link rel="stylesheet" href="file://#{ROOT}/assets/product-card.css">
    <style>
      /* 桩外壳：只负责把卡片摆到网格里，不参与被验内容的样式 */
      body { padding: 2rem; background: var(--color-background); color: var(--color-foreground); }
      .demo-block { margin-block-end: 3rem; }
      .demo-label { font-size: .9rem; font-weight: 600; margin-block-end: .75rem; color: var(--color-foreground-muted); }
      .demo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; list-style: none; margin: 0; padding: 0; }
    </style>
    <script src="file://#{ROOT}/assets/bottom-sheet.js" defer></script>
    <script src="file://#{ROOT}/assets/product-form.js" defer></script>
    <script src="file://#{ROOT}/assets/quick-view.js" defer></script>
    <script>
      /* 截图用开关：带 #open 打开第一张卡的弹窗（file:// 下不能用父页面脚本
         去点 iframe 里的元素，所以由本页自己读 hash） */
      addEventListener('load', () => {
        if (location.hash !== '#open' && location.hash !== '#openscroll') return;
        const trigger = document.querySelector('quick-view [data-quick-view-open]');
        if (!trigger) return;
        trigger.click();
        /* #openscroll：把它滚到中途，用来验底部固定条是否悬在内容之上（毛玻璃） */
        if (location.hash === '#openscroll') {
          /* 滚动容器随断点变：桌面是右列，手机是 body（2026-11-21） */
          const dlg = document.querySelector('quick-view dialog');
          const scroller = window.innerWidth >= 750
            ? dlg.querySelector('.quick-view__info')
            : dlg.querySelector('.quick-view__body');
          /* 直接滚到底：右列内容是 scrollHeight 撑出来的，滚到底才看得出"只有它在动"，
             也才能验最后一行不被固定条压住（容器自己留了 4.75rem 的底部空白）。
             注：这版面板只溢出约 65px，早些写"距底 90px"会算成 0、等于没滚。 */
          scroller.scrollTop = scroller.scrollHeight;
        }
      });

      /* 交互自检：带 #test 跑一遍并把手写进 #results，配
         `--headless=new --dump-dom --virtual-time-budget=4000` 读取。
         （不依赖 rAF/scroll 事件，只依赖 setTimeout —— 这两类在无头虚拟时间下
         的行为差异见记忆里的工具坑。） */
      addEventListener('load', async () => {
        if (location.hash !== '#test') return;
        /* 由 Ruby 侧注入：本页是用 --no-extras 跑的那一份吗 */
        const NO_EXTRAS = #{NO_EXTRAS ? 'true' : 'false'};
        const NO_WARRANTY = #{NO_WARRANTY ? 'true' : 'false'};
        const log = [];
        try {
        const ok = (name, cond, extra = '') =>
          log.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' · ' + extra : ''}`);

        const qv = document.querySelector('quick-view');
        const dialog = qv.querySelector('dialog');
        const button = dialog.querySelector('[data-add-button]');
        const price = dialog.querySelector('[data-price]');
        const stage = dialog.querySelector('[data-quick-view-stage] img');

        /* 胶囊是 label 包 radio（不再用 id/for），点 label 即可；
           桩里直接给 radio 设 checked + 派发 change，等价于用户点击 */
        const pick = (root, value) => {
          const radio = [...root.querySelectorAll('input[data-option-position]')].find(
            (item) => item.value === value
          );
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        };

        const serverSrc = stage.src;
        /* 先滚一段再点：产品页上从卡片中点开弹窗，页面不该跳回顶部（刘工 2026-11-21 报的 bug） */
        window.scrollTo(0, 420);
        const y0 = window.scrollY;
        qv.querySelector('[data-quick-view-open]').click();
        await new Promise((resolve) => setTimeout(resolve, 60));
        ok('打开弹窗不跳顶', window.scrollY >= y0 - 2,
           'y0=' + y0 + ' y1=' + window.scrollY
           + ' | html.overflow=' + getComputedStyle(document.documentElement).overflow
           + ' | html.cls=' + (document.documentElement.className || '-')
           + ' | body.style=' + (document.body.style.cssText || '-')
           + ' | url=' + location.href.split('/').pop());
        ok('点击入口打开面板', dialog.open === true);
        ok('打开时不改主图（仍是最初渲染的那张）', stage.src === serverSrc, stage.src.split('/').pop());
        ok('面板里有胶囊选择器（不是原生 select）',
           dialog.querySelectorAll('.product-variant__pill').length === 3
           && !dialog.querySelector('select[data-quick-view-variant]'));
        ok('页面里没有 option-* 之类的 id（同商品重复渲染不会撞 id）',
           document.querySelectorAll('[id^="option-"]').length === 0);

        pick(dialog, '1,200 W');
        ok('切到售罄变体 → 按钮禁用', button.disabled === true, button.textContent.trim());
        ok('切到售罄变体 → 价格跟随', price.textContent.trim() === '$899.00', price.textContent.trim());
        ok('切到售罄变体 → 划线价出现', !dialog.querySelector('[data-compare-price]').hasAttribute('hidden'));
        ok('切到售罄变体 → 折扣徽标出现', !dialog.querySelector('[data-save-badge]').hasAttribute('hidden'));

        pick(dialog, '1,600 W');
        ok('切回有货变体 → 按钮恢复', button.disabled === false, button.textContent.trim());
        ok('隐藏 id 输入同步为选中变体', dialog.querySelector('[data-variant-input]').value === '90001',
           dialog.querySelector('[data-variant-input]').value);

        const thumbs = dialog.querySelectorAll('[data-quick-view-thumb]');
        thumbs[3].click();
        ok(
          '缩略图切主图 + 选中态',
          stage.src === thumbs[3].dataset.media && thumbs[3].classList.contains('is-active'),
          stage.src.split('/').pop()
        );
        ok('切图后 srcset 已摘除', !stage.hasAttribute('srcset'));

        /* 变体自带图：1,000 W 的 featured media 是第 4 张图 → 应命中 thumbs[3] */
        pick(dialog, '1,000 W');
        ok('变体自带图 → 主图跟随（按 mediaId 找缩略图）',
           stage.src === thumbs[3].dataset.media, stage.src.split('/').pop());

        window.fetch = async (url) =>
          String(url).includes('/cart.js')
            ? new Response(JSON.stringify({ item_count: 3 }), { status: 200 })
            : new Response('{}', { status: 200 });

        pick(dialog, '1,600 W');
        dialog.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await new Promise((resolve) => setTimeout(resolve, 900));
        ok('加购成功（cart:updated）后收面板', dialog.open === false);

        window.fetch = async () => new Response('boom', { status: 500 });
        qv.querySelector('[data-quick-view-open]').click();
        pick(dialog, '1,000 W');
        dialog.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        await new Promise((resolve) => setTimeout(resolve, 600));
        ok('加购失败后面板保留', dialog.open === true);
        const statusText = dialog.querySelector('[data-form-status]').textContent.trim();
        ok('失败提示已写进面板（不是残留的成功文案）', statusText.length > 0 && !statusText.includes('added to your cart'), statusText);

        ok('订阅商品不弹窗（全页只有一个 dialog）', document.querySelectorAll('quick-view dialog').length === 1);

        /* PDP 形态：同一个 <variant-picker> 换作用域后仍然工作 —— 这条专门盯
           「选择器在 <form> 之外、靠 form 属性提交」那个产品页特有的路径 */
        const pdp = document.querySelector('.demo-pdp');
        pick(pdp, '1,200 W');
        ok('PDP 壳：切变体 → 价格跟随', pdp.querySelector('[data-price]').textContent.trim() === '$899.00',
           pdp.querySelector('[data-price]').textContent.trim());
        ok('PDP 壳：隐藏 id 输入跟随', pdp.querySelector('[data-variant-input]').value === '90002',
           pdp.querySelector('[data-variant-input]').value);
        ok('PDP 壳：按钮态跟随', pdp.querySelector('[data-add-button]').disabled === true);
        ok('PDP 壳：radio 带 form 属性（选择器在表单外也能提交）',
           [...pdp.querySelectorAll('input[data-option-position]')].every((r) => r.form !== null));

        /* Ruby 的 <<~HTML 是双引号 heredoc，JS 里的 \n 会先被 Ruby 解成真换行、
           把字符串字面量截断（第一次跑就是这么静默挂掉的）——这里绕开反斜杠 */
        /* 买盒补齐的三项（2026-11-21 刘工第二轮）：信任徽标 / 加速结账的共享类 */
        const trustItems = dialog.querySelectorAll('.quick-view__trust .trust-item');
        if (NO_EXTRAS) {
          /* 总开关关掉：规格与信任**连容器都不该出现**（不是 display:none ——
             那块容器自带顶线，空壳会留一条横线，见 BUG-085 的判据） */
          ok('关掉规格开关 → 不渲染规格块', dialog.querySelector('.quick-view__specs') === null);
          ok('关掉信任开关 → 不渲染信任块', dialog.querySelector('.quick-view__trust') === null);
        } else {
          if (NO_WARRANTY) {
            /* 关掉自动保修：只剩手填的两行（桩的 Line 3 是空的） */
            ok('关掉保修开关 → 信任项只剩手填的两行', trustItems.length === 2,
               String(trustItems.length));
            ok('关掉保修开关 → 没有 warranty 文案',
               (dialog.querySelector('.quick-view__trust')?.textContent || '').indexOf('warranty') === -1);
          } else {
            ok('弹窗里有信任徽标（1 条自动保修 + 2 条手填）', trustItems.length === 3, String(trustItems.length));
          }
          ok('弹窗里有规格行（默认开启）', dialog.querySelectorAll('.quick-view__specs .spec-bullets__item').length === 3,
             String(dialog.querySelectorAll('.quick-view__specs .spec-bullets__item').length));
        }
        if (!NO_EXTRAS && !NO_WARRANTY) {
          ok('保修徽标来自产品 metafield（不是写死的文案）',
             (trustItems[0]?.textContent || '').indexOf('warranty') !== -1,
             (trustItems[0]?.textContent || '').trim());
        }
        ok('加速结账容器带共享类 accelerated-checkout（与产品页同一份样式）',
           dialog.querySelector('.quick-view__accelerated.accelerated-checkout') !== null);

        /* 底部固定条：验"机制"而不是"看着像" ——
           ① 它在滚动容器之外；② 滚动容器真的能滚（否则没有东西从它背后过）；
           ③ 毛玻璃的三件套都生效：半透明底色 / backdrop-filter / 支持时不被 @supports 兜底覆盖 */
        const foot = dialog.querySelector('.quick-view__foot');
        const bodyEl = dialog.querySelector('.quick-view__body');
        ok('固定条不在滚动容器里', foot && !foot.closest('.quick-view__body'));

        /* 滚动归属（2026-11-21 刘工）：桌面「只有右列出滚动条」，手机仍整体滚。
           验的是**谁在滚**，不是"能不能滚" —— 后者两版都成立，分辨不出来。 */
        const infoEl = dialog.querySelector('.quick-view__info');
        const galleryEl = dialog.querySelector('.quick-view__gallery');
        const desktop = window.innerWidth >= 750;
        const scroller = desktop ? infoEl : bodyEl;
        /* 内容装得下时「能滚」本来就不该成立 —— 关掉规格/信任后就是这样，
           所以这条要按"有没有溢出"分叉，不能一律要求能滚（否则关开关反而报红）。 */
        const canScroll = scroller.scrollHeight > scroller.clientHeight + 40;
        ok(canScroll ? '滚动容器真的能滚（内容超过一屏）' : '内容装得下，无需滚动',
           true, (desktop ? 'info ' : 'body ') + scroller.scrollHeight + '>' + scroller.clientHeight);
        if (desktop) {
          ok('桌面：外层 body 不滚（overflow hidden）',
             getComputedStyle(bodyEl).overflowY === 'hidden', getComputedStyle(bodyEl).overflowY);
          const gTopBefore = galleryEl.getBoundingClientRect().top;
          scroller.scrollTop = 120;
          await new Promise((resolve) => setTimeout(resolve, 40));
          if (canScroll) {
            ok('桌面：右列真的滚了（scrollTop 生效）', scroller.scrollTop > 0,
               'scrollTop=' + scroller.scrollTop + ' max=' + (scroller.scrollHeight - scroller.clientHeight));
            ok('桌面：滚右列时画廊不动', galleryEl.getBoundingClientRect().top === gTopBefore,
               gTopBefore + ' -> ' + galleryEl.getBoundingClientRect().top);
          }

          /* 滚到底：最后一项必须完整露在固定条上沿之上 ——
             这正是"底部空白归滚动容器自己留"要解决的问题。
             固定条现在是不透明的，压住就是真的看不见（没有毛玻璃兜底）。 */
          scroller.scrollTop = scroller.scrollHeight;
          await new Promise((resolve) => setTimeout(resolve, 40));
          const lastItem = infoEl.querySelector('.quick-view__trust .trust-item:last-child')
            || infoEl.lastElementChild;
          const lastBottom = lastItem.getBoundingClientRect().bottom;
          const footTop = foot.getBoundingClientRect().top;
          ok('桌面：滚到底时最后一行没被固定条压住', lastBottom <= footTop + 1,
             'last.bottom=' + Math.round(lastBottom) + ' foot.top=' + Math.round(footTop));
          ok('桌面：滚右列不带动页面', window.scrollY >= 420, 'scrollY=' + window.scrollY);
          scroller.scrollTop = 0;
        } else {
          ok('手机：整体滚动（body 是滚动容器）', getComputedStyle(bodyEl).overflowY === 'auto',
             getComputedStyle(bodyEl).overflowY);
        }
        const footStyle = getComputedStyle(foot);
        const footBg = footStyle.backgroundColor || '';
        /* 2026-11-21 刘工改口径：不要毛玻璃，实底 + 顶线。
           所以这两条断言跟着反向 —— 断的是"没有半透明、没有模糊"，
           不然改了样式断言还绿，等于没验。 */
        ok('固定条是实底（不带 alpha）',
           footBg.indexOf('rgba') === -1 && footBg.indexOf('/') === -1, footBg);
        const footBlur = footStyle.backdropFilter || footStyle.webkitBackdropFilter || 'none';
        ok('固定条没有 backdrop-filter', footBlur === 'none', footBlur);
        ok('固定条贴住 dialog 底边',
           Math.abs(foot.getBoundingClientRect().bottom - dialog.getBoundingClientRect().bottom) < 2);

        } catch (error) {
          log.push('EXCEPTION ' + error.name + ': ' + error.message);
        }
        document.body.innerHTML = '<pre id="results">' + log.join(String.fromCharCode(10)) + '</pre>';
      });
    </script>
  </head>
  <body>
    #{cards}
    #{pdp_block}
  </body>
  </html>
HTML

File.write(OUT, page)

# 375 宽度的截图必须套 iframe：无头 Chrome 的窗口宽有 500 下限，
# 直接给 375 会得到"右侧被裁"的假溢出（见记忆里的工具坑）。
wrapper = <<~HTML
  <!doctype html>
  <html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #ddd; }
    iframe { width: 375px; height: 812px; border: 0; background: #fff; display: block; }
  </style></head>
  <body><iframe src="file://#{OUT}#open"></iframe></body></html>
HTML
wrapper_path = OUT.sub(/\.html\z/, '-375.html')
File.write(wrapper_path, wrapper)

puts "wrote #{OUT} (#{page.bytesize} B)"
puts "wrote #{wrapper_path} (iframe 375×812，验移动端)"

