#!/bin/bash
# Собирает velo-game, velo-node и MAC в zip для теста датчиков.
# node_modules, dist, кэш и служебные файлы в архив не попадают.
# Portable Node для MAC/PLAN_B качается сюда же (без sudo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date +%Y%m%d)"
OUT="${1:-$HOME/Desktop/velo-sensor-test-$STAMP.zip}"
NAME="velo-sensor-test"
TMP="$(mktemp -d)"
DEST="$TMP/$NAME"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "Проверяю Node для MAC/PLAN_B..."
/bin/bash "$ROOT/MAC/PLAN_B/fetch-node.sh"

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
  --exclude .cache \
  "$ROOT/velo-game" \
  "$ROOT/velo-node" \
  "$ROOT/MAC" \
  "$DEST/"

chmod +x "$DEST/MAC/start.command" "$DEST/MAC/PLAN_B/start.command" "$DEST/MAC/PLAN_B/fetch-node.sh"

if [ -f "$DEST/velo-node/.env" ]; then
  if grep -q '^SOURCE=' "$DEST/velo-node/.env"; then
    sed -i.bak 's/^SOURCE=.*/SOURCE=ant/' "$DEST/velo-node/.env"
    rm -f "$DEST/velo-node/.env.bak"
  else
    printf '\nSOURCE=ant\n' >> "$DEST/velo-node/.env"
  fi
else
  sed 's/^SOURCE=.*/SOURCE=ant/' "$ROOT/velo-node/.env.example" > "$DEST/velo-node/.env"
fi

rm -f "$OUT"
(
  cd "$TMP"
  zip -qry "$OUT" "$NAME"
)

echo "Архив: $OUT"
echo "Размер: $(du -sh "$OUT" | awk '{print $1}')"
echo
echo "Обычный путь: npm install в velo-node и velo-game, затем MAC/start.command"
echo "Без админа / без системного Node: MAC/PLAN_B/start.command (SOURCE=ant уже в .env)"
