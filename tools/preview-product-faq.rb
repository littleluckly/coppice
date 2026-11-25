#!/usr/bin/env ruby
# frozen_string_literal: true

# 产品页 FAQ 本地预览 —— 用仓库里真实的
#   sections/product-faq.liquid（标记 + {% stylesheet %}）
#   assets/product-faq.js
#   assets/critical.css
# 渲染成单个 HTML，浏览器直接打开。
#
# 为什么需要它：演示店配好 blog 之前（模板里 blog 留空 ⇒ 整块不输出），
# 这块在店铺里根本看不见；而且自动播放倒计时在截图里也截不到。
# 本脚本用真实模板 + 手造 blog 数据，把 Liquid 层（循环 / 截断 / 条件 /
# 图片焦点链）和 CSS 层（两栏栅格 / 展开态 / 进度条基线）一起跑到可看的程度。
#
# 依赖（本机已验证：Ruby 2.6 + liquid 5.3）：
#   gem install liquid -v 5.3.0 --user-install
#
# 用法：
#   ruby tools/preview-product-faq.rb [输出路径] [--static]
#     --static  把 section 自己输出的 product-faq.js 摘掉（截图用）。脚本一跑
#               就会写 data-playing 开始倒计时，而无头 Chrome 不推进动画 ⇒ 每次
#               都截到 scaleX(0) 的空轨道；摘掉脚本才是「无 JS / 停播」的静态态。
#
# ⚠️ liquid gem 与 Shopify 的已知差异（别把桩的结论当成平台的结论）：
#   `x == blank` 对 nil **不成立**（Shopify 成立）。所以这里给值的原则是
#   「要么给真值、要么给真正会走到目标分支的值」，不要指望靠空值触发降级分支。
#   本脚本刻意都传了实值（heading / subheading / image / button_link），
#   降级路径（无图单栏、无 blog 不输出）不在预览覆盖范围内。
#   另两条 gem 差异：
#   ① `section.settings.blog` 在 Shopify 解析成 **blog drop**（不是 handle 字符串），
#      桩里必须给 hash，给 'guides' 会让 `blog_source.articles` 取到 nil、整块不输出。
#   ② `{% liquid %}` 块里的 `#` 注释 gem 5.3 不认（Shopify 认），会抛
#      "Unknown tag"。section 里因此不用行内 `#`，理由写在 `{% comment %}` 里。

require 'liquid'
require 'json'
require 'cgi'
require 'tmpdir'

ROOT = File.expand_path('..', __dir__)
OUT  = ARGV.find { |a| !a.start_with?('--') } || '/tmp/coppice-product-faq.html'
STATIC = ARGV.include?('--static')

# ---- 本地替身：Shopify 过滤器 --------------------------------------------
schemas_src = File.read(File.join(ROOT, 'locales/en.default.json')).sub(%r{\A\s*/\*.*?\*/}m, '')
LOCALE = JSON.parse(schemas_src)
SETTINGS = JSON.parse(
  File.read(File.join(ROOT, 'config/settings_data.json')).sub(%r{\A\s*/\*.*?\*/}m, '')
).fetch('current', {})

# 预览用的「照片」：SVG 渐变，只为验证 cover / 圆角 / 比例，不代表真实素材
PHOTO = 'data:image/svg+xml;utf8,' + CGI.escape(<<~SVG).gsub('+', '%20')
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#cfe3d4"/><stop offset="1" stop-color="#5d7f6a"/>
    </linearGradient></defs>
    <rect width="900" height="600" fill="url(#g)"/>
    <text x="450" y="310" font-family="sans-serif" font-size="34" fill="#ffffff"
      text-anchor="middle" opacity="0.85">product photo</text>
  </svg>
SVG

module ShopFilters
  def t(key, args = {})
    str = LOCALE.dig(*key.split('.')) || "MISSING(#{key})"
    args.each { |k, v| str = str.gsub("{{ #{k} }}", v.to_s) }
    str
  end

  def asset_url(path)
    "file://#{ROOT}/assets/#{path}"
  end

  def inline_asset_content(path)
    File.read(File.join(ROOT, 'assets', path))
  end

  # 只复刻本 section 用到的形态：src / alt / class / loading，srcset 交给真平台
  def image_url(input, _args = {})
    return nil if input.nil?

    { 'url' => input['url'], 'alt' => input['alt'], 'width' => input['width'] }
  end

  def image_tag(input, args = {})
    return '' if input.nil?

    attrs = []
    attrs << %(src="#{input['url']}")
    attrs << %(alt="#{args[:alt] || input['alt']}")
    attrs << %(width="#{input['width']}") if input['width']
    attrs << %(loading="#{args[:loading]}") if args[:loading]
    attrs << %(class="#{args[:class]}") if args[:class]
    "<img #{attrs.join(' ')}>"
  end

  def strip_html(input)
    return '' if input.nil?

    input.to_s.gsub(/<[^>]*>/, '')
  end

  def truncatewords(input, count)
    words = input.to_s.split(/\s+/)
    return input.to_s if words.length <= count

    "#{words[0, count].join(' ')}..."
  end
end
Liquid::Template.register_filter(ShopFilters)

# ---- 真实标记 + 真实样式 --------------------------------------------------
section_src = File.read(File.join(ROOT, 'sections/product-faq.liquid'))
css = section_src[%r{\{%\s*stylesheet\s*%\}(.*?)\{%\s*endstylesheet\s*%\}}m, 1]
abort '找不到 product-faq.liquid 的 {% stylesheet %} 块' if css.nil?
abort '样式块里出现了 Liquid（{% stylesheet %} 只允许静态代码）' if css.include?('{{') || css.include?('{%')

markup = section_src
         .sub(%r{\{%\s*schema\s*%\}.*?\{%\s*endschema\s*%\}}m, '')
         .sub(%r{\{%\s*stylesheet\s*%\}.*?\{%\s*endstylesheet\s*%\}}m, '')
         .sub(%r{\{%\s*comment\s*%\}.*?\{%\s*endcomment\s*%\}}m, '')

# ---- 手造数据 -------------------------------------------------------------
# 桩数据用 `dev-docs/mower-import/faq-posts-content.md` 那 4 篇的**真实标题与摘要**，
# 这样预览能顺便验「标题在卡里是否单行、摘要截在 26 词内是否读得通」。
articles = [
  ['Which mower deck size do I need?',
   'Walk-behind mowers use a 21 in or 22 in deck; riding mowers use 42 in. ' \
   'Choose by edge tightness first, then by run length.',
   '/blogs/faq/which-mower-deck-size-do-i-need'],
  ['Can I use one battery across tools?',
   'Yes, within a platform: Northbark tools run on 40V, 60V or 80V systems, and any ' \
   'pack from a system fits every tool in that system.',
   '/blogs/faq/can-i-use-one-battery-across-tools'],
  ['How do I store batteries for winter?',
   'Store packs at 40–60% charge, indoors, away from frost and heat, and top them up ' \
   'about once a month. Never leave one flat all winter.',
   '/blogs/faq/how-do-i-store-batteries-for-winter'],
  ['What does the warranty cover?',
   'Every machine is covered against defects in materials and workmanship — 36–60 months ' \
   'on battery tools, 24–36 on gas mowers. Wear parts are excluded.',
   '/blogs/faq/what-does-the-warranty-cover']
]

blog = {
  'url' => '/blogs/faq',
  'articles' => articles.map do |title, excerpt, url|
    { 'title' => title, 'excerpt' => excerpt, 'content' => excerpt, 'url' => url }
  end
}

section_drop = {
  'id' => 'template--1001__product-faq',
  'settings' => {
    # Shopify 的 blog 设置解析成 blog drop（不是 handle 字符串），桩照此给
    'blog' => blog,
    'limit' => 4,
    'eyebrow' => 'FAQ',
    'heading' => 'Frequently asked questions',
    'subheading' => 'Quick answers to the questions we hear most about our machines, ' \
                    'battery system, and support.',
    'image' => { 'url' => PHOTO, 'alt' => 'Coppice 46 cm cordless mower on a lawn', 'width' => 900 },
    'autoplay' => true,
    'autoplay_seconds' => 6,
    'button_label' => 'View more FAQs',
    'button_link' => '/blogs/guides'
  }
}

product_drop = {
  'title' => 'Coppice 46 cm Cordless Mower',
  'featured_image' => { 'url' => PHOTO, 'alt' => 'Coppice 46 cm cordless mower', 'width' => 900 }
}

html_body = Liquid::Template.parse(markup).render(
  'section' => section_drop,
  'blog' => blog,
  'product' => product_drop
)

# ---- 页面外壳：全局变量照 settings_data 取，critical.css 走绝对 file:// ----
page_vars = <<~CSS
  :root {
    --font-primary--family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    --page-width: #{SETTINGS['max_page_width'] || '90rem'};
    --page-margin: #{SETTINGS['min_page_margin'] || 20}px;
    --color-background: #{SETTINGS['background_color'] || '#ffffff'};
    --color-foreground: #{SETTINGS['foreground_color'] || '#333333'};
    --color-brand: #{SETTINGS['brand_color'] || '#1e4b3c'};
    --color-brand-accent: #{SETTINGS['brand_accent'] || '#2e6b4e'};
    --color-foreground-muted: color-mix(in srgb, var(--color-foreground) 70%, transparent);
    --style-border-radius-inputs: #{SETTINGS['input_corner_radius'] || 4}px;
    --card-hover-shadow: 0 6px 20px color-mix(in srgb, var(--color-brand) 22%, transparent);
    --card-hover-lift: -2px;
  }
CSS

# 脚本是 section 自己输出的（不是本脚本加的）。两种模式都先把它从产物里摘掉：
# 预览页可能被本地静态服务以 http:// 打开，那时 file:// 的 script 会被拦；
# 交互版把脚本**内联**进页面（否则会和外部那份重复声明同一个类，直接抛 SyntaxError）。
html_body = html_body.gsub(%r{\s*<script[^>]*product-faq\.js[^>]*></script>}, '')
unless STATIC
  js = File.read(File.join(ROOT, 'assets/product-faq.js'))
  html_body = html_body.sub(%r{</section>}, "</section>\n<script>#{js}</script>")
end

File.write(OUT, <<~HTML)
  <!doctype html>
  <html lang="en">
  <head>
  <meta charset="utf-8">
  <title>product-faq preview</title>
  <style>#{File.read(File.join(ROOT, 'assets/critical.css'))}</style>
  <style>
  #{page_vars}
  /* section 产物在真站是聚合后的 styles.css，这里直接内联 */
  #{css}
  body { margin: 0; background: var(--color-background); color: var(--color-foreground); }
  </style>
  </head>
  <body>
  <div class="shopify-section product-faq-section">
  #{html_body}
  </div>
  </body>
  </html>
HTML

puts "已写入 #{OUT}#{STATIC ? '（静态态，无脚本）' : ''}"
