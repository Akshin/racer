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

# Исходники проектов: --copy-links, потому что симлинки внутри репо нам не нужны.
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
  "$DEST/"

# MAC копируем отдельно и БЕЗ --copy-links и БЕЗ --exclude node_modules:
#   1) в portable Node npm лежит в node/darwin-*/lib/node_modules/npm — общий
#      --exclude node_modules выкидывал сам npm из архива;
#   2) bin/npm и bin/npx — симлинки на ../lib/node_modules/npm/bin/*-cli.js,
#      --copy-links превращал их в копии, и относительный require('../lib/cli.js') ломался.
# zip ниже вызывается с -y, симлинки сохранятся как симлинки.
rsync -a \
  --exclude .DS_Store \
  --exclude .cache \
  --exclude '*.log' \
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

# Страховка: без npm внутри portable Node на площадке ничего не поставится.
for arch in arm64 x64; do
  npm_cli="$DEST/MAC/PLAN_B/node/darwin-$arch/lib/node_modules/npm/bin/npm-cli.js"
  if [ ! -f "$npm_cli" ]; then
    echo "в архив не попал npm для $arch: $npm_cli" >&2
    exit 1
  fi
done

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
