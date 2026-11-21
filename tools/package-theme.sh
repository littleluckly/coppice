#!/usr/bin/env bash
#
# 一键出包：从 HEAD 取主题文件 → 剥注释 → 打包 → 清理 → 校验 → 落到项目根
#
# 用法：
#   tools/package-theme.sh              # 只出包
#   tools/package-theme.sh --dry-run    # 只看会删多少注释，不打包
#   tools/package-theme.sh --deploy     # 出包 + 推到 benchmark 店（保留店铺配置）
#   tools/package-theme.sh --deploy --full  # 连 templates/ 与设置一起覆盖（谨慎）
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
DEPLOY=0
FULL=0
for _arg in "$@"; do
  case "$_arg" in
    --dry-run) DRY=1 ;;
    --deploy)  DEPLOY=1 ;;
    --full)    FULL=1 ;;
    *) echo "✗ 未知参数: $_arg（可用 --dry-run / --deploy / --full）" >&2; exit 1 ;;
  esac
done

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

# --- 7. 可选：推到 benchmark 店 ---------------------------------------------
# 推的是 $BUILD（= 包的内容），不是工作区，所以线上跑的一定是「无注释的那份」。
# 默认只推代码：templates/ 和 sections/*.json 是店铺配置，推上去会把
# benchmark 店调好的图与区块顺序冲回演示店状态。确要覆盖时加 --full。
if [[ $DEPLOY -eq 1 ]]; then
  echo "→ 推送到 benchmark 店（主题 #191882166593，live）"
  # `-e <env>` 的 shopify.theme.toml 是从 `--path` 找的，而包在临时目录里，
  # 所以先把配置复制进去，否则报 "Environment file not found"。
  cp "$ROOT/shopify.theme.toml" "$BUILD/shopify.theme.toml"
  PUSH_ARGS=(--path "$BUILD" -e benchmark --allow-live --no-color)
  if [[ $FULL -eq 0 ]]; then
    PUSH_ARGS+=(
      --ignore "templates/*"
      --ignore "config/settings_data.json"
      --ignore "sections/*.json"
    )
    echo "   保留店铺配置（templates/ · config/settings_data.json · sections/*.json）"
  else
    echo "   ⚠️ --full：连店铺配置一起覆盖"
  fi
  # -e 读的是 cwd 的 shopify.theme.toml，所以必须在项目根执行
  ( cd "$ROOT" && "$SHOPIFY" theme push "${PUSH_ARGS[@]}" ) | tail -8
fi
SIZE="$(du -h "$OUT" | cut -f1 | tr -d ' ')"
COUNT="$(unzip -l "$OUT" | tail -1 | awk '{print $2}')"
echo
echo "✓ 完成: $OUT  ($SIZE, $COUNT 个文件)"
echo "  HEAD $HEAD_SHA ｜ 分支 $BRANCH"
