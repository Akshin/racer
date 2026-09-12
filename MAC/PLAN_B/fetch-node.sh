#!/bin/bash
# Качает официальный Node 24 в MAC/PLAN_B/node/ — без установщика и без sudo.
# Нужен интернет. Повторный запуск пропускает уже скачанное.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_VERSION="24.20.0"
CACHE="$SCRIPT_DIR/.cache"
DEST="$SCRIPT_DIR/node"
BASE="https://nodejs.org/dist/v${NODE_VERSION}"

# https://nodejs.org/dist/v24.20.0/SHASUMS256.txt
ARM_SHA="40e5607e5ecb3db9192723776da2d75d966260fc74a7a9e731c1bd67dda96bc8"
X64_SHA="9e5b2644cf107befb6aefca676b96d3296bc10138096f022ed378d6233ed81f4"

mkdir -p "$CACHE" "$DEST"

fetch_one() {
  local arch="$1"
  local sha="$2"
  local name="node-v${NODE_VERSION}-darwin-${arch}"
  local tar="${name}.tar.gz"
  local url="${BASE}/${tar}"
  local tarball="$CACHE/$tar"
  local out="$DEST/darwin-${arch}"
  local node_bin="$out/bin/node"

  if [ -x "$node_bin" ]; then
    local ver
    ver="$("$node_bin" -v 2>/dev/null || true)"
    if [ "$ver" = "v${NODE_VERSION}" ]; then
      echo "уже есть $arch ($ver)"
      return 0
    fi
    rm -rf "$out"
  fi

  echo "качаю $tar ..."
  curl -fL --retry 3 --retry-delay 2 -o "$tarball" "$url"

  local got
  got="$(shasum -a 256 "$tarball" | awk '{print $1}')"
  if [ "$got" != "$sha" ]; then
    rm -f "$tarball"
    echo "контрольная сумма не совпала для $tar" >&2
    echo "ожидалось $sha" >&2
    echo "получено  $got" >&2
    return 1
  fi

  local tmp
  tmp="$(mktemp -d)"
  tar -xzf "$tarball" -C "$tmp"
  rm -rf "$out"
  mv "$tmp/$name" "$out"
  rm -rf "$tmp"

  xattr -dr com.apple.quarantine "$out" 2>/dev/null || true
  # npm зовём через node: bin/npm — симлинк с шебангом env node, а системного node может не быть.
  echo "готово $arch ($("$out/bin/node" -v), npm $("$out/bin/node" "$out/lib/node_modules/npm/bin/npm-cli.js" -v))"
}

fetch_one "arm64" "$ARM_SHA"
fetch_one "x64" "$X64_SHA"

echo
echo "Node $NODE_VERSION лежит в $DEST"
echo "На площадке: двойной клик по start.command в этой папке."
