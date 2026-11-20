#!/usr/bin/env python3
"""校验主题包：注释残留 + 不该进包的文件。包里干净才返回 0。

用法：
    python3 tools/verify-package.py Coppice-0.1.0.zip
    python3 tools/verify-package.py /tmp/pkg/Coppice-0.1.0.zip --keep   # 保留解压目录

为什么要有这一步：剥离脚本按扩展名清单扫描，漏一类文件就会带进包
（2026-11-20 先后漏了 templates/*.liquid 和 {% liquid %} 块内 # 注释）。
**只有对整包重新扫一遍才是权威判据。**
"""
import os
import re
import shutil
import sys
import tempfile
import zipfile

# 七类注释，与 tools/strip-comments.py 保持同源
CHECKS = [
    ('{% comment %}', re.compile(r'\{%-?\s*comment\s*-?%\}')),
    ('{% doc %}', re.compile(r'\{%-?\s*doc\s*-?%\}')),
    ('{% # %}', re.compile(r'\{%-?\s*#')),
    ('/* */', re.compile(r'/\*')),
    ('<!-- -->', re.compile(r'<!--(?!\[if)')),
    ('JS 行首 //', re.compile(r'^[ \t]*//', re.M)),
]
RE_LIQ_TAG = re.compile(r'(\{%-?\s*liquid\b)(.*?)(-?%\})', re.S)
RE_HASH_LINE = re.compile(r'^[ \t]*#', re.M)

# 不该出现在包里的东西
FORBIDDEN_NAMES = ('.md', '.bak', '.DS_Store', '.scss', '.map')
FORBIDDEN_PARTS = ('dev-docs', 'docs', 'tools', '.workbuddy', 'node_modules', '.git')


def scan(root):
    notes = {k: 0 for k, _ in CHECKS}
    hash_block = 0
    offenders = []
    scanned = 0

    for dirpath, dirnames, filenames in os.walk(root):
        for fn in filenames:
            ext = os.path.splitext(fn)[1]
            if ext not in ('.liquid', '.css', '.js'):
                continue
            p = os.path.join(dirpath, fn)
            scanned += 1
            s = open(p, encoding='utf-8', errors='ignore').read()
            rel = os.path.relpath(p, root)
            hit = []
            for name, pat in CHECKS:
                c = len(pat.findall(s))
                if c:
                    notes[name] += c
                    hit.append(f'{name}×{c}')
            hb = 0
            for m in RE_LIQ_TAG.finditer(s):
                hb += len(RE_HASH_LINE.findall(m.group(2)))
            if hb:
                hash_block += hb
                hit.append(f'liquid 块内 #×{hb}')
            if hit:
                offenders.append((rel, hit))
    return scanned, notes, hash_block, offenders


def forbidden(root):
    bad = []
    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = os.path.relpath(dirpath, root)
        for part in FORBIDDEN_PARTS:
            if part in rel_dir.split(os.sep):
                bad.append(rel_dir + '/ (目录)')
                dirnames[:] = []
                break
        for fn in filenames:
            rel = os.path.relpath(os.path.join(dirpath, fn), root)
            if any(fn.endswith(n) or fn == n for n in FORBIDDEN_NAMES):
                bad.append(rel)
    return sorted(set(bad))


def main():
    if len(sys.argv) < 2:
        sys.exit('用法: python3 tools/verify-package.py <主题包.zip> [--keep]')
    zip_path = sys.argv[1]
    keep = '--keep' in sys.argv
    if not os.path.isfile(zip_path):
        sys.exit(f'找不到 {zip_path}')

    tmp = tempfile.mkdtemp(prefix='pkgverify-')
    try:
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(tmp)
        scanned, notes, hash_block, offenders = scan(tmp)
        bad_files = forbidden(tmp)

        print(f'包: {zip_path}')
        print(f'扫描 {scanned} 个 .liquid/.css/.js 文件')
        print('\n注释残留：')
        total = 0
        for name, cnt in notes.items():
            total += cnt
            if cnt:
                print(f'  ✗ {name:16s} {cnt}')
        if hash_block:
            total += hash_block
            print(f'  ✗ {"liquid 块内 #":16s} {hash_block}')
        if total == 0:
            print('  ✓ 七类全部为 0')

        if offenders:
            print('\n残留位置（前 10）：')
            for rel, hit in offenders[:10]:
                print(f'  {rel}: {", ".join(hit)}')

        print('\n不该进包的文件：')
        if bad_files:
            for b in bad_files[:15]:
                print(f'  ✗ {b}')
        else:
            print('  ✓ 无')

        ok = total == 0 and not bad_files
        print('\n' + ('✓ 包干净' if ok else '✗ 有问题，需要修复'))
        if ok and not keep:
            pass
        return 0 if ok else 1
    finally:
        if keep:
            print(f'\n解压目录保留: {tmp}')
        else:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
