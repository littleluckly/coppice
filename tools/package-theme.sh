#!/usr/bin/env bash
#
# 一键出包：从 HEAD 取主题文件 → 剥注释 → 打包 → 清理 → 校验 → 落到项目根
#
# 用法：
#   tools/package-theme.sh              # 完整流程
#   tools/package-theme.sh --dry-run    # 只看会删多少注释，不打包
#
# 设计要点：
# - **不切分支、不碰工作区**。用 `git archive HEAD` 把主题文件取到临时目录再处理，
#   所以当前分支、未提交改动、dev-docs 都不受影响。注释是主线上的项目记忆，
#   永远不会被这个脚本删到。
# - 包内容 = HEAD 的代码。**工作区有未提交改动时会警告**——那些改动不会进包。
# - 校验用 tools/verify-package.py 对整包七类扫描，不看剥离脚本的自述。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SHOPIFY="${SHOPIFY_BIN:-shopify}"
PYTHON="${PYTHON_BIN:-python3}"
DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1

# --- 前置检查 ---------------------------------------------------------------
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "✗ 不在 git 仓库里" >&2; exit 1
fi
for f in "$PYTHON" "$SHOPIFY"; do
  command -v "$f" >/dev/null 2>&1 || { echo "✗ 找不到命令: $f" >&2; exit 1; }
done

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
HEAD_SHA="$(git rev-parse --short HEAD)"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠️  工作区有未提交改动，以下内容不会进包（包基于 HEAD ${HEAD_SHA}）："
  git status --short | sed 's/^/     /'
  echo
fi

BUILD="$(mktemp -d "${TMPDIR:-/tmp}/coppice-pkg.XXXXXX")"
cleanup() { rm -rf "$BUILD"; }
trap cleanup EXIT

# --- 1. 取主题文件 ----------------------------------------------------------
echo "→ 从 HEAD ($HEAD_SHA, 分支 $BRANCH) 取出 7 个主题目录"
git archive HEAD assets blocks config layout locales sections snippets templates \
  | tar -x -C "$BUILD"

# --- 2. 剥注释 --------------------------------------------------------------
if [[ $DRY -eq 1 ]]; then
  echo "→ 预演剥离（不写盘）"
  "$PYTHON" "$ROOT/tools/strip-comments.py" --root="$BUILD"
  echo "✓ 预演结束，未生成包"
  exit 0
fi

echo "→ 剥离注释"
"$PYTHON" "$ROOT/tools/strip-comments.py" --root="$BUILD" --apply --force | tail -12

# --- 3. 打包 ----------------------------------------------------------------
echo "→ 打包"
( cd "$BUILD" && "$SHOPIFY" theme package --path . --no-color >/dev/null )

ZIP="$(find "$BUILD" -maxdepth 1 -name '*.zip' | head -1)"
[[ -n "$ZIP" ]] || { echo "✗ 没生成 zip" >&2; exit 1; }

# --- 4. 清理偶发文件 --------------------------------------------------------
# CLI 对根目录 .md 有份不公开的排除名单（README 不进、AGENTS.md 进），
# 这里一律清掉，不依赖 CLI 的内部规则
zip -d "$ZIP" "*.DS_Store" "*.bak*" "AGENTS.md" \
       "README.md" "LICENSE.md" "CONTRIBUTING.md" "CODE_OF_CONDUCT.md" \
       >/dev/null 2>&1 || true

# --- 5. 校验 ----------------------------------------------------------------
echo "→ 校验"
if ! "$PYTHON" "$ROOT/tools/verify-package.py" "$ZIP"; then
  echo "✗ 校验未通过，包没有复制到项目根" >&2
  exit 1
fi

# --- 6. 落盘 ----------------------------------------------------------------
OUT="$ROOT/$(basename "$ZIP")"
cp "$ZIP" "$OUT"
SIZE="$(du -h "$OUT" | cut -f1 | tr -d ' ')"
COUNT="$(unzip -l "$OUT" | tail -1 | awk '{print $2}')"
echo
echo "✓ 完成: $OUT  ($SIZE, $COUNT 个文件)"
echo "  HEAD $HEAD_SHA ｜ 分支 $BRANCH"
