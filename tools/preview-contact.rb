#!/usr/bin/env ruby
# frozen_string_literal: true

# 联系页本地预览 —— 用仓库里真实的
#   sections/contact-form.liquid（标记 + {% stylesheet %}）
#   sections/trust-bar.liquid
#   assets/critical.css + assets/icon-*.svg
# 渲染成单个 HTML，浏览器直接打开。
#
# 为什么需要它：联系页的版式依赖「页头之下无缝的横幅」「字段内浮动标签的两种态」
# 「信息卡的横排/竖排切换」—— 这三样在编辑器里只能看到静态一态，读代码也看不出
# 对齐问题。本脚本把 Liquid 层（标题三级回落 / 图标内联 / 图片标签）与 CSS 层
# （浮动标签的 :placeholder-shown 态、卡片断点、遮罩渐变）一起跑到可看的程度。
#
# 依赖（本机已验证：Ruby 2.6 + liquid 5.3）：
#   gem install liquid -v 5.3.0 --user-install
#
# 用法：
#   ruby tools/preview-contact.rb [输出路径] [--no-banner] [--no-image] [--filled]
#     --no-banner  不传横幅图（验「没图时标题区回白底」的降级）
#     --no-image   信息卡不传配图（验两栏回到 1.35/0.65）
#     --filled     表单预填值（验浮动标签的「已填」态：标签是否缩到框内上沿
#                  且不压住输入文字）
#     --focus      脚本 focus 第一个输入框（验聚焦态：标签浮起 + 图标转品牌色）。
#                  ⚠️ 只测 :focus，测不到 :focus-visible —— 那是 UA 启发式状态，
#                  得用真键盘 Tab（见 tools/probe-input-shape.py）。
#     --dark       Noir 深色 preset 的色值（验遮罩在深底下自动翻转）
#
# ⚠️ liquid gem 与 Shopify 的已知差异（别把桩的结论当成平台的结论）：
#   ① `x == blank` 对 nil **不成立**（Shopify 成立）—— 桩里给的是实值，
#      降级分支用 --no-banner / --no-image 显式走到，不靠空值触发。
#   ② `{% liquid %}` 里的 `#` 注释 gem 5.3 不认（Shopify 认），下面的
#      strip_hash_comments 先把这些行抹成空行（行号不变，便于对报错）。
#   ③ `{% form %}` 是平台标签，这里注册了一个只输出 <form> 的替身。

require 'liquid'
require 'json'
require 'cgi'

ROOT = File.expand_path('..', __dir__)
OUT  = ARGV.find { |a| !a.start_with?('--') } || '/tmp/coppice-contact.html'
NO_BANNER = ARGV.include?('--no-banner')
NO_IMAGE  = ARGV.include?('--no-image')
FILLED    = ARGV.include?('--filled')
FOCUS     = ARGV.include?('--focus')
DARK      = ARGV.include?('--dark')

def read_json(path)
  JSON.parse(File.read(path).sub(%r{\A\s*/\*.*?\*/}m, ''))
end

LOCALE = read_json(File.join(ROOT, 'locales/en.default.json'))
SETTINGS = read_json(File.join(ROOT, 'config/settings_data.json')).fetch('current', {})

# 预览用的「照片」：SVG 渐变，只为验证 cover / 圆角 / 遮罩强度，不代表真实素材。
# 故意做成左浅右深（天空 → 树荫），与参考图里文字所在侧的亮度分布一致。
PHOTO = 'data:image/svg+xml;utf8,' + CGI.escape(<<~SVG).gsub('+', '%20')
  <svg xmlns="http://www.w3.org/2000/svg" width="2400" height="600" viewBox="0 0 2400 600">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e8f0f2"/><stop offset="0.45" stop-color="#b9c9a8"/>
      <stop offset="1" stop-color="#6f8b62"/>
    </linearGradient></defs>
    <rect width="2400" height="600" fill="url(#sky)"/>
    <circle cx="1980" cy="180" r="90" fill="#f4e3c0" opacity="0.55"/>
    <rect x="1500" y="300" width="620" height="300" fill="#c9b79e" opacity="0.7"/>
    <text x="1200" y="330" font-family="sans-serif" font-size="46" fill="#3d4a3a"
      text-anchor="middle" opacity="0.45">banner photo</text>
  </svg>
SVG

CARD_PHOTO = 'data:image/svg+xml;utf8,' + CGI.escape(<<~SVG).gsub('+', '%20')
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#cfe3d4"/><stop offset="1" stop-color="#5d7f6a"/>
    </linearGradient></defs>
    <rect width="900" height="1200" fill="url(#g)"/>
    <text x="450" y="610" font-family="sans-serif" font-size="38" fill="#ffffff"
      text-anchor="middle" opacity="0.8">card photo</text>
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
    file = File.join(ROOT, 'assets', path)
    File.exist?(file) ? File.read(file) : "<!-- missing #{path} -->"
  end

  def image_url(input, _args = {})
    return nil if input.nil?

    { 'url' => input['url'], 'alt' => input['alt'], 'width' => input['width'] }
  end

  # 只复刻本页用到的形态；srcset / sizes 的取舍交给真平台
  def image_tag(input, args = {})
    return '' if input.nil?

    attrs = []
    attrs << %(src="#{input['url']}")
    attrs << %(alt="#{args[:alt] || input['alt']}")
    attrs << %(width="#{args[:width] || input['width']}") if input['width']
    attrs << %(sizes="#{args[:sizes]}") if args[:sizes]
    attrs << %(loading="#{args[:loading]}") if args[:loading]
    attrs << %(class="#{args[:class]}") if args[:class]
    "<img #{attrs.join(' ')}>"
  end

  def newline_to_br(input)
    input.to_s.gsub("\n", '<br>')
  end
end
Liquid::Template.register_filter(ShopFilters)

# {% form 'contact', class: 'x', id: 'y' %} 的替身：输出一个真 <form>，
# 并把 form.* 可见的几个键塞进作用域（空值 ⇒ 成功/错误提示都不渲染）。
#
# ⚠️ class / id 必须照抄调用方（2026-11-25 踩过）：第一版写死成一个裸 <form>，
# 于是 .contact__form 的 grid / gap / margin 全都没命中，预览里的字段间距是
# 行盒撑出来的假间距 —— 而截图看起来「还行」，最容易把错的当对的验收。
class StubFormTag < Liquid::Block
  def initialize(tag_name, markup, parse_context)
    super
    @class_name = markup[/class:\s*'([^']*)'/, 1]
    @id = markup[/id:\s*'([^']*)'/, 1]
  end

  def render(context)
    context.stack do
      context['form'] = FILLED ? {
        'name' => 'Alex Rivera', 'email' => 'alex@example.com',
        'phone' => '(555) 010-0182', 'body' => 'Hi, I need a replacement deck blade for a 46 cm mower.',
        'posted_successfully?' => false, 'errors' => nil
      } : {
        'name' => nil, 'email' => nil, 'phone' => nil, 'body' => nil,
        'posted_successfully?' => false, 'errors' => nil
      }
      attrs = [%(method="post"), %(action="#"), %(accept-charset="UTF-8")]
      attrs << %(class="#{@class_name}") if @class_name
      attrs << %(id="#{@id}") if @id
      "<form #{attrs.join(' ')}>#{super}</form>"
    end
  end
end
Liquid::Template.register_tag('form', StubFormTag)

def strip_hash_comments(src)
  # Shopify 的 {% liquid %} 以 `%}` / `-%}` 收尾（没有 endliquid），
  # 所以要匹配到第一个 `%}`；块内出现 `%}` 属极少数情况，本 section 没有。
  src.gsub(/\{%-?\s*liquid\b(.*?)-?%\}/m) do
    whole = Regexp.last_match(0)
    inner = Regexp.last_match(1)
    strip = inner.gsub(/^[ \t]*#.*$/, '')
    whole.sub(inner, strip)
  end
end

def load_section(name)
  src = strip_hash_comments(File.read(File.join(ROOT, "sections/#{name}.liquid")))
  css = src[%r{\{%\s*stylesheet\s*%\}(.*?)\{%\s*endstylesheet\s*%\}}m, 1]
  abort "#{name}.liquid 里找不到 {% stylesheet %}" if css.nil?
  if css.include?('{{') || css.include?('{%')
    abort "#{name}.liquid 的样式块里出现了 Liquid（平台不允许）"
  end

  markup = src
           .sub(%r{\{%\s*schema\s*%\}.*?\{%\s*endschema\s*%\}}m, '')
           .sub(%r{\{%\s*stylesheet\s*%\}.*?\{%\s*endstylesheet\s*%\}}m, '')
           .sub(%r{\{%\s*comment\s*%\}.*?\{%\s*endcomment\s*%\}}m, '')
  [markup, css]
end

# ---- 联系页 -----------------------------------------------------------------
contact_markup, contact_css = load_section('contact-form')

contact_settings = {
  'eyebrow' => 'Get in touch',
  'heading' => 'Contact Us',
  'lead' => "Questions about a machine, an order or a spare part?\n" \
            'Send us a note and we will get back to you within one business day.',
  'form_heading' => 'Send us a message',
  'show_phone' => true,
  'consent' => nil,
  'info_heading' => 'Contact details',
  'info_phone' => '(555) 010-0182',
  'info_email' => 'support@northbark.example',
  'info_address' => "1204 Mill Road\nAsheville, NC 28801",
  'info_hours' => "Mon–Fri, 8am–6pm ET\nSat, 9am–4pm ET",
  'info_note' => 'Parts orders placed before 2pm ET ship the same day.',
  'banner_overlay' => 78,
  'banner_image' => nil,
  'info_image' => nil
}
contact_settings['banner_image'] = { 'url' => PHOTO, 'alt' => '', 'width' => 2400 } unless NO_BANNER
contact_settings['info_image'] = { 'url' => CARD_PHOTO, 'alt' => '', 'width' => 900 } unless NO_IMAGE

contact_html = Liquid::Template.parse(contact_markup).render(
  'section' => { 'id' => 'template--1001__main', 'settings' => contact_settings },
  'page' => { 'title' => 'Contact us', 'content' => nil },
  'customer' => nil
)

# ---- 信任条 -----------------------------------------------------------------
trust_markup, trust_css = load_section('trust-bar')
trust_blocks = [
  ['truck', 'Free shipping over $99', 'Fast & reliable delivery'],
  ['warranty', 'Warranty protection', 'Built to last'],
  ['parts', 'Genuine parts & service', 'Keep your equipment running'],
  ['support', 'Dedicated customer support', 'Here to help']
].each_with_index.map do |(icon, text, subtext), i|
  {
    'id' => "item_#{i + 1}",
    'type' => 'item',
    'settings' => { 'icon' => icon, 'text' => text, 'subtext' => subtext, 'link' => nil }
  }
end

trust_html = Liquid::Template.parse(trust_markup).render(
  'section' => { 'id' => 'template--1001__trust', 'settings' => { 'show_dividers' => true }, 'blocks' => trust_blocks }
)

theme = DARK ? {
  'background_color' => '#17181a', 'foreground_color' => '#f2f3f1', 'brand_color' => '#a3e635'
} : SETTINGS

page_vars = <<~CSS
  :root {
    --font-primary--family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    --font-primary--style: normal;
    --page-width: #{SETTINGS['max_page_width'] || '90rem'};
    --page-margin: #{SETTINGS['min_page_margin'] || 20}px;
    --color-background: #{theme['background_color'] || '#ffffff'};
    --color-foreground: #{theme['foreground_color'] || '#333333'};
    --color-brand: #{theme['brand_color'] || '#1e4b3c'};
    --color-brand-accent: #{theme['brand_accent'] || '#2e6b4e'};
    --color-foreground-muted: color-mix(in srgb, var(--color-foreground) 70%, transparent);
    --color-sale: #c62828;
    --color-sale-surface: #ffebeb;
    --input-radius: 999px;
    --input-radius-multiline: 1rem;
  }
CSS

File.write(OUT, <<~HTML)
  <!doctype html>
  <html lang="en">
  <head>
  <meta charset="utf-8">
  <title>contact preview</title>
  <style>#{File.read(File.join(ROOT, 'assets/critical.css'))}</style>
  <style>
  #{page_vars}
  body { margin: 0; background: var(--color-background); color: var(--color-foreground);
    font-family: var(--font-primary--family); }
  /* 页头替身：只为看「横幅是否贴着页头」，高度取真实页头的量级 */
  .stub-header { block-size: 72px; display: flex; align-items: center;
    padding-inline: var(--page-margin); border-block-end: 1px solid #e6e6e3;
    font-weight: 700; }
  /* 两个 section 的样式在真站是聚合后的 styles.css，这里直接内联 */
  #{contact_css}
  #{trust_css}
  </style>
  </head>
  <body>
  <div class="stub-header">Northbark</div>
  <div class="shopify-section contact-section">
  #{contact_html}
  </div>
  <div class="shopify-section trust-bar-section">
  #{trust_html}
  </div>
  <!-- 量尺寸用（--dump-dom 读回）：形状/间距对不对不靠眼睛估，靠 getBoundingClientRect -->
  <pre id="metrics" hidden></pre>
  #{FOCUS ? '<style>/* 冻结过渡：无头下 --virtual-time-budget 不推进 CSS transition，' \
              '不冻结就永远截到过渡起点（标签还在居中大字号） */' \
              '* { transition: none !important; }</style>' \
              '<script>document.querySelector(".contact__input").focus();</script>' : ''}
  <script>
    (function () {
      function box(sel) {
        var el = document.querySelector(sel);
        if (!el) return null;
        var b = el.getBoundingClientRect();
        return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)];
      }
      function fs(sel) {
        var el = document.querySelector(sel);
        return el ? getComputedStyle(el).fontSize : null;
      }
      var inputs = [].map.call(document.querySelectorAll('.contact__input'), function (el) {
        var b = el.getBoundingClientRect();
        var label = el.parentNode.querySelector('.contact__label');
        var lb = label ? label.getBoundingClientRect() : null;
        return {
          id: el.id,
          h: Math.round(b.height),
          padTop: getComputedStyle(el).paddingTop,
          labelTop: lb ? Math.round(lb.top - b.top) : null,
          labelH: lb ? Math.round(lb.height) : null,
          labelFs: label ? getComputedStyle(label).fontSize : null,
          value: el.value ? 'filled' : 'empty'
        };
      });
      document.getElementById('metrics').textContent = JSON.stringify({
        doc: document.documentElement.scrollWidth + 'x' + document.documentElement.scrollHeight,
        banner: box('.contact__banner'),
        bannerInner: box('.contact__banner-inner'),
        intro: box('.contact__intro'),
        headingFs: fs('.contact__heading'),
        lead: box('.contact__lead'),
        gridCols: getComputedStyle(document.querySelector('.contact__grid')).gridTemplateColumns,
        formHeading: box('.contact__form-heading'),
        form: box('.contact__form'),
        inputs: inputs,
        textarea: box('.contact__textarea'),
        card: box('.contact__info'),
        cardMedia: box('.contact__info-media'),
        details: box('.contact__details'),
        trust: box('.trust-bar')
      }, null, 1);
    })();
  </script>
  </body>
  </html>
HTML

puts "已写入 #{OUT}"
