#!/bin/bash
# Собирает velo-game, velo-node и MAC в zip для теста датчиков.
# node_modules, dist, кэш и служебные файлы в архив не попадают.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date +%Y%m%d)"
OUT="${1:-$HOME/Desktop/velo-sensor-test-$STAMP.zip}"
NAME="velo-sensor-test"
TMP="$(mktemp -d)"
DEST="$TMP/$NAME"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

mkdir -p "$DEST"

# --copy-links: zip не умеет нормально таскать симлинки из node_modules и т.п.
rsync -a --copy-links \
  --exclude node_modules \
  --exclude dist \
  --exclude dist-ssr \
  --exclude .git \
  --exclude .DS_Store \
  --exclude .assetpack \
  --exclude coverage \
  --exclude .eslintcache \
  --exclude '*.tsbuildinfo' \
  --exclude '*.log' \
  --exclude .vite \
  "$ROOT/velo-game" \
  "$ROOT/velo-node" \
  "$ROOT/MAC" \
  "$DEST/"

# start.command должен остаться исполняемым после распаковки.
chmod +x "$DEST/MAC/start.command"

rm -f "$OUT"
(
  cd "$TMP"
  zip -qry "$OUT" "$NAME"
)

echo "Архив: $OUT"
echo "Размер: $(du -sh "$OUT" | awk '{print $1}')"
echo
echo "Другу: распаковать, в velo-node и velo-game сделать npm install,"
echo "в velo-node/.env выставить SOURCE=ble или ant, затем двойной клик по MAC/start.command"
