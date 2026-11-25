#!/usr/bin/env python3
"""用真 Chrome（CDP）验证 product-faq 的自动播放，而不是用事件桩。

为什么必须这样：`--dump-dom` / `--screenshot` 两种无头模式都**不推进 CSS 动画时间轴**，
桩里 `dispatchEvent(new MouseEvent('click'))` 也**不会移动焦点、不会产生 hover 状态**。
于是 BUG-088 的两个缺陷在桩里全绿、在店里全坏：
  ① 鼠标点开 <summary> 后焦点留在它身上 ⇒ `:focus-within` 永久挂起倒计时
     （桩里没焦点，看不见）；
  ② 关掉再打开的条目，动画会带着上一次的 finished 状态回来 ⇒ 进度条满格、
     不再派 animationend（桩里手工派事件，永远"通过"）。
只有让浏览器自己跑真实时间、用 Input.dispatchMouseEvent 发真输入，才看得见。

依赖：`pip3 install websocket-client`（本机 2026-11-20 已验证可用）

用法：
  ruby tools/preview-product-faq.rb /tmp/faq.html   # 先生成自包含预览页
  python3 tools/probe-faq-autoplay.py /tmp/faq.html [--interval 6]

判定：每条断言打印 PASS/FAIL，最后一行汇总；有 FAIL 退出码 1。
覆盖：初始轮播 / 自动切条 / 点开后仍在播 / 收起再展开重计时 / 悬停只认展开项 /
键盘焦点暂停与恢复 / 无 JS 异常。
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request

import websocket

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PORT = 9777
PROFILE = '/tmp/coppice-cdp-profile'

STATE_JS = """
(() => {
  const root = document.querySelector('product-faq');
  if (!root) return { err: 'no <product-faq>' };
  const items = [...root.children].filter((el) => el.tagName === 'DETAILS');
  const bar = root.querySelector('details[open] .product-faq__progress-bar');
  const cs = bar ? getComputedStyle(bar) : null;
  return {
    open: items.findIndex((d) => d.open),
    openCount: items.filter((d) => d.open).length,
    playing: root.hasAttribute('data-playing'),
    paused: root.hasAttribute('data-paused'),
    playState: cs ? cs.animationPlayState : '-',
    scale: cs ? Number((cs.transform.match(/matrix\\(([-\\d.]+)/) || [0, 0])[1]) : -1,
    active: document.activeElement.tagName + '.' + (document.activeElement.className || ''),
    focusVisible: root.matches(':has(:focus-visible)'),
  };
})()
"""


def rect_js(index):
    return f"""
(() => {{
  const items = [...document.querySelector('product-faq').children].filter((el) => el.tagName === 'DETAILS');
  const r = items[{index}].querySelector('summary').getBoundingClientRect();
  return {{ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }};
}})()
"""


class Browser:
    def __init__(self):
        self.proc = subprocess.Popen(
            [CHROME, '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
             f'--remote-debugging-port={PORT}', f'--user-data-dir={PROFILE}',
             '--window-size=1440,900', 'about:blank'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self.errors = []
        self._seq = 0
        self.ws = None
        self._connect()

    def _connect(self):
        ws_url = None
        for _ in range(60):
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/list', timeout=1) as r:
                    pages = [t for t in json.load(r) if t['type'] == 'page']
                if pages:
                    ws_url = pages[0]['webSocketDebuggerUrl']
                    break
            except Exception:
                time.sleep(0.25)
        if not ws_url:
            raise SystemExit('拿不到 Chrome 调试目标（端口被占？先关掉旧的调试实例）')
        self.ws = websocket.create_connection(ws_url, timeout=30)
        self.call('Runtime.enable')
        self.call('Page.enable')

    def call(self, method, params=None):
        self._seq += 1
        self.ws.send(json.dumps({'id': self._seq, 'method': method, 'params': params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get('method') == 'Runtime.exceptionThrown':
                self.errors.append(msg['params']['exceptionDetails'].get('text', '?'))
            if msg.get('id') == self._seq:
                return msg.get('result', {})

    def js(self, expr):
        r = self.call('Runtime.evaluate', {'expression': expr, 'returnByValue': True})
        return r.get('result', {}).get('value')

    def goto(self, url, settle=2.0):
        self.call('Page.navigate', {'url': url})
        time.sleep(settle)

    def click(self, index, settle=0.4):
        pos = self.js(rect_js(index))
        for kind in ('mousePressed', 'mouseReleased'):
            self.call('Input.dispatchMouseEvent',
                      {'type': kind, 'x': pos['x'], 'y': pos['y'], 'button': 'left', 'clickCount': 1})
        time.sleep(settle)

    def click_at(self, x, y, settle=0.4):
        for kind in ('mousePressed', 'mouseReleased'):
            self.call('Input.dispatchMouseEvent',
                      {'type': kind, 'x': x, 'y': y, 'button': 'left', 'clickCount': 1})
        time.sleep(settle)

    def move(self, x=4, y=4, settle=0.4):
        self.call('Input.dispatchMouseEvent', {'type': 'mouseMoved', 'x': x, 'y': y, 'button': 'none'})
        time.sleep(settle)

    def hover_item(self, index, settle=0.4):
        """把指针停在某一条的 summary 上（真实 hover，mock 不出来）"""
        pos = self.js(rect_js(index))
        self.move(pos['x'], pos['y'], settle)

    def tab(self, times=1, settle=0.35):
        for _ in range(times):
            for kind in ('rawKeyDown', 'keyUp'):
                self.call('Input.dispatchKeyEvent',
                          {'type': kind, 'key': 'Tab', 'code': 'Tab', 'windowsVirtualKeyCode': 9})
            time.sleep(settle)

    def close(self):
        try:
            self.ws.close()
        finally:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except Exception:
                self.proc.kill()


RESULTS = []


def check(label, ok, detail=''):
    RESULTS.append(ok)
    print(f'{"PASS" if ok else "FAIL"}  {label}' + (f'   [{detail}]' if detail else ''))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('page', nargs='?', default='/tmp/coppice-product-faq.html')
    ap.add_argument('--interval', type=int, default=6, help='与 section 里的 autoplay_seconds 一致')
    args = ap.parse_args()

    if not os.path.exists(args.page):
        raise SystemExit(f'预览页不存在：{args.page}\n先跑 ruby tools/preview-product-faq.rb {args.page}')

    wait = args.interval + 0.8
    b = Browser()
    try:
        b.goto('file://' + os.path.abspath(args.page))

        s = b.js(STATE_JS)
        check('初始：第一条展开且在播', s['open'] == 0 and s['playing'] and s['playState'] == 'running', json.dumps(s))

        time.sleep(wait)
        s = b.js(STATE_JS)
        check(f'静置 {wait:.1f}s：自动切到下一条', s['open'] == 1 and s['openCount'] == 1, f"open={s['open']}")

        # 刘工 2026-11-20 报的路径：点开 → 收起 → 再点开 → 移开鼠标
        b.click(2)
        b.move()
        s = b.js(STATE_JS)
        check('鼠标点开第 3 条后仍在播（焦点没把倒计时挂住）',
              s['open'] == 2 and s['playState'] == 'running' and not s['focusVisible'], json.dumps(s))

        b.click(2)
        b.move()
        s = b.js(STATE_JS)
        check('再点一次收起全部', s['open'] == -1 and s['openCount'] == 0, f"open={s['open']}")

        b.click(0)
        b.move()
        s = b.js(STATE_JS)
        check('重新点开第 1 条：倒计时从 0 重启（不是满格）',
              s['open'] == 0 and s['scale'] < 0.3, f"scale={s['scale']:.2f}")

        time.sleep(wait)
        s = b.js(STATE_JS)
        check(f'移开鼠标再等 {wait:.1f}s：继续自动切下一条', s['open'] == 1, f"open={s['open']}")

        # 悬停判定只认"当前展开的那一条"（2026-11-20 刘工）：此时 open=1
        b.hover_item(3)
        s = b.js(STATE_JS)
        check('悬停在未展开的条目上：展开那条继续走', s['open'] == 1 and s['playState'] == 'running',
              f"open={s['open']} playState={s['playState']}")

        b.hover_item(1)
        s = b.js(STATE_JS)
        check('悬停在展开的那一条上：暂停', s['playState'] == 'paused', f"open={s['open']}")

        b.move()
        s = b.js(STATE_JS)
        check('移开鼠标：恢复', s['playState'] == 'running', f"playState={s['playState']}")

        # 键盘用户：Tab 聚焦应暂停（WCAG 的"可停"），点空白处恢复
        b.tab(1)
        s = b.js(STATE_JS)
        check('Tab 聚焦后暂停', s['focusVisible'] and s['playState'] == 'paused', s['active'])
        # 点页面空白处取消焦点（不能点 summary，那只会再开一条）
        b.click_at(1200, 840)
        s = b.js(STATE_JS)
        check('失去焦点后恢复', not s['focusVisible'] and s['playState'] == 'running', s['active'])

        check('无 JS 异常', not b.errors, '; '.join(b.errors[:2]))
    finally:
        b.close()

    print(f'\n{sum(RESULTS)}/{len(RESULTS)} 通过')
    sys.exit(0 if all(RESULTS) else 1)


main()
