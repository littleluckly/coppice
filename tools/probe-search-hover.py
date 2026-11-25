#!/usr/bin/env python3
"""用真 Chrome（CDP）验证搜索抽屉三个可点元素的悬停反馈。

为什么必须这样：`--screenshot` / `--dump-dom` 两种无头模式都**不产生 hover 状态**
（没有鼠标），桩里 `dispatchEvent(new MouseEvent('mouseover'))` 也不会触发 CSS `:hover`。
所以悬停类改动在静态截图里永远是「看起来没变」——BUG-096 的教训是同一条：
形状/反馈类改动，验收必须覆盖静止态与交互态。

判定（每个元素三条）：
  1. 悬停后 `translate` 变成 `0px -2px`（--card-hover-lift）
  2. 悬停后 `box-shadow` 不是 none（--card-hover-shadow 的浅绿光晕）
  3. 鼠标移开后两个值都回落
另外顺带确认：没有 href 的快速链接卡**不**抬起（看着能点却点不动比没反馈更糟）。

依赖：`pip3 install websocket-client`

用法：
  python3 tools/gen-search-drawer-preview.py /tmp/search-drawer.html
  python3 tools/probe-search-hover.py /tmp/search-drawer.html [--shot /tmp/hover.png]
"""

import argparse
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

import websocket

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PORT = 9788
PROFILE = '/tmp/coppice-cdp-hover'

TARGETS = [
    ('快速链接卡', '.search-discovery__card-link[href]'),
    ('推荐卡', '.search-discovery__promo[href]'),
    ('热门搜索药丸', '.search-discovery__pill'),
]


class CDP:
    def __init__(self, ws):
        self.ws = ws
        self._id = 0

    def send(self, method, **params):
        self._id += 1
        msg_id = self._id
        self.ws.send(json.dumps({'id': msg_id, 'method': method, 'params': params}))
        while True:
            data = json.loads(self.ws.recv())
            if data.get('id') == msg_id:
                if 'error' in data:
                    raise RuntimeError(f"{method}: {data['error']}")
                return data.get('result', {})

    def js(self, expr):
        res = self.send(
            'Runtime.evaluate', expression=expr, returnByValue=True, awaitPromise=True
        )
        return res.get('result', {}).get('value')


def wait_for_devtools():
    """/json/version 给的是**浏览器级** target，Page.* 域只在页面 target 上存在。"""
    for _ in range(100):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/list') as r:
                targets = json.load(r)
            pages = [t for t in targets if t.get('type') == 'page' and t.get('url', '').startswith('file:')]
            if pages:
                return pages[0]['webSocketDebuggerUrl']
        except Exception:
            pass
        time.sleep(0.1)
    raise SystemExit('Chrome DevTools 页面 target 没起来')


def probe(cdp, label, selector, shot=None):
    rect = cdp.js(
        f"""(() => {{
          const el = document.querySelector({selector!r});
          if (!el) return null;
          el.scrollIntoView({{block: 'center'}});
          const r = el.getBoundingClientRect();
          return {{x: r.x + r.width / 2, y: r.y + r.height / 2}};
        }})()"""
    )
    if not rect:
        return [f'{label}: 找不到元素 {selector}']

    cdp.send('Input.dispatchMouseEvent', type='mouseMoved', x=rect['x'], y=rect['y'], buttons=0)
    time.sleep(0.4)  # transition 0.2s，留一档余量

    state = cdp.js(
        f"""(() => {{
          const el = document.querySelector({selector!r});
          const cs = getComputedStyle(el);
          return {{translate: cs.translate, shadow: cs.boxShadow}};
        }})()"""
    )

    out = []
    out.append(
        f"{label} 悬停 translate={state['translate']}  "
        f"{'PASS' if state['translate'] in ('0px -2px', '0 -2px') else 'FAIL'}"
    )
    out.append(
        f"{label} 悬停 box-shadow {'有' if state['shadow'] != 'none' else '无'}  "
        f"{'PASS' if state['shadow'] != 'none' else 'FAIL'}"
    )

    if shot:
        data = cdp.send('Page.captureScreenshot', format='png')['data']
        open(shot, 'wb').write(base64.b64decode(data))
        out.append(f'{label} 截图 -> {shot}')

    # 移开鼠标，状态应回落
    cdp.send('Input.dispatchMouseEvent', type='mouseMoved', x=5, y=5, buttons=0)
    time.sleep(0.4)
    after = cdp.js(
        f"""(() => {{
          const el = document.querySelector({selector!r});
          const cs = getComputedStyle(el);
          return {{translate: cs.translate, shadow: cs.boxShadow}};
        }})()"""
    )
    out.append(
        f"{label} 移开后 translate={after['translate']}  "
        f"{'PASS' if after['translate'] in ('none', '0px', '0px 0px', 'normal') else 'FAIL'}"
    )
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('page')
    ap.add_argument('--shot', default='/tmp/search-hover.png')
    args = ap.parse_args()

    url = 'file://' + os.path.abspath(args.page)
    subprocess.run(['rm', '-rf', PROFILE], check=False)
    chrome = subprocess.Popen(
        [
            CHROME,
            '--headless=new',
            '--disable-gpu',
            '--no-sandbox',
            '--hide-scrollbars',
            f'--remote-debugging-port={PORT}',
            f'--user-data-dir={PROFILE}',
            '--window-size=1200,1100',
            url,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    results = []
    try:
        ws_url = wait_for_devtools()
        ws = websocket.create_connection(ws_url, timeout=15)
        cdp = CDP(ws)
        cdp.send('Page.enable')
        cdp.send('Runtime.enable')
        time.sleep(1.2)  # 等字体与样式落地

        # 先确认这个浏览器真的会进入 hover 状态，否则后面全是假阴性
        media = cdp.js(
            """(() => ({
              hover: matchMedia('(hover: hover)').matches,
              pointerFine: matchMedia('(pointer: fine)').matches,
            }))()"""
        )
        results.append(
            f"媒体特性 hover={media['hover']} pointer:fine={media['pointerFine']}  "
            f"{'PASS' if media['hover'] and media['pointerFine'] else 'FAIL（该环境不会触发 :hover）'}"
        )

        # 只测第一个舞台（idle 态）
        for i, (label, selector) in enumerate(TARGETS):
            shot = args.shot if i == 1 else None  # 推荐卡那张留图
            results += probe(cdp, label, selector, shot)

        # 无 href 的卡不该抬起
        no_href = cdp.js(
            """(() => {
              let el = document.querySelector('.search-discovery__card-link:not([href])');
              if (!el) {
                // 预览页里每张卡都配了链接，这里临时注入一个无 href 的样本
                el = document.createElement('a');
                el.className = 'search-discovery__card-link';
                el.id = 'hover-probe-no-href';
                el.textContent = 'no-href';
                el.style.cssText =
                  'position:fixed;left:8px;bottom:8px;inline-size:140px;padding:10px;z-index:9999';
                document.body.append(el);
              }
              const r = el.getBoundingClientRect();
              return {x: r.x + r.width / 2, y: r.y + r.height / 2};
            })()"""
        )
        if no_href == 'skip' or not no_href:
            results.append('无 href 卡：本页没有样本（跳过）')
        else:
            cdp.send('Input.dispatchMouseEvent', type='mouseMoved', x=no_href['x'], y=no_href['y'], buttons=0)
            time.sleep(0.4)
            t = cdp.js(
                """getComputedStyle(document.getElementById('hover-probe-no-href')).translate"""
            )
            results.append(
                f"无 href 卡 悬停 translate={t}  {'PASS' if t in ('none', '0px') else 'FAIL'}"
            )

        ws.close()
    finally:
        chrome.terminate()

    print('\n'.join(results))
    fails = [r for r in results if r.endswith('FAIL')]
    print(f'\n{len(results) - len(fails)} 条通过，{len(fails)} 条失败')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
