#!/bin/bash
# Запуск с Node из этой папки. Системный Node, nvm и права админа не нужны.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

pause_exit() {
  local code="$1"
  echo
  echo "Откройте файл ИНСТРУКЦИЯ.txt в папке MAC/PLAN_B."
  read -r _
  exit "$code"
}

# Скачанный Node и .command часто в карантине — снять без sudo.
xattr -dr com.apple.quarantine "$SCRIPT_DIR" 2>/dev/null || true

if sysctl -n hw.optional.arm64 2>/dev/null | grep -q 1; then
  ARCH="arm64"
else
  ARCH="x64"
fi

NODE_HOME="$SCRIPT_DIR/node/darwin-${ARCH}"
NODE_BIN="$NODE_HOME/bin/node"
NPM_BIN="$NODE_HOME/bin/npm"

if [ ! -x "$NODE_BIN" ]; then
  echo "В архиве нет Node для этого мака ($ARCH)."
  echo "На машине с интернетом запустите fetch-node.sh в этой папке и соберите архив снова."
  if [ -x "$SCRIPT_DIR/fetch-node.sh" ]; then
    echo
    echo "Пробую скачать Node прямо сейчас..."
    /bin/bash "$SCRIPT_DIR/fetch-node.sh" || pause_exit 1
  else
    pause_exit 1
  fi
fi

if [ ! -x "$NODE_BIN" ]; then
  echo "Node так и не найден: $NODE_BIN"
  pause_exit 1
fi

xattr -dr com.apple.quarantine "$NODE_HOME" 2>/dev/null || true
export PATH="$NODE_HOME/bin:$PATH"
export SOURCE=ant

echo "этот мак: $ARCH"
echo "Node: $("$NODE_BIN" -v)  ($NODE_BIN)"
echo "источник датчиков: ANT+ (SOURCE=ant)"

if [ ! -f "$ROOT/velo-node/.env" ]; then
  cp "$ROOT/velo-node/.env.example" "$ROOT/velo-node/.env"
fi
# Файл может содержать SOURCE=ble с разработки — на площадке всегда ant.
if grep -q '^SOURCE=' "$ROOT/velo-node/.env"; then
  sed -i.bak 's/^SOURCE=.*/SOURCE=ant/' "$ROOT/velo-node/.env"
  rm -f "$ROOT/velo-node/.env.bak"
else
  printf '\nSOURCE=ant\n' >> "$ROOT/velo-node/.env"
fi

ensure_deps() {
  local dir="$1"
  if [ ! -d "$dir/node_modules" ]; then
    echo "первый запуск: ставлю зависимости в $(basename "$dir") ..."
    (
      cd "$dir"
      "$NPM_BIN" install
    )
  fi
}

ensure_deps "$ROOT/velo-node"
ensure_deps "$ROOT/velo-game"

free_port() {
  local port="$1"
  local pids
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "порт $port занят, останавливаю PID $pids"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 0.4
    pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}

echo "Останавливаю прошлый запуск..."
pkill -f "$ROOT/velo-node/src/index.ts" 2>/dev/null || true
pkill -f "$ROOT/velo-game/node_modules/.bin/vite" 2>/dev/null || true
free_port 8080
free_port 5173
sleep 0.5

cleanup() {
  echo "Останавливаю адаптер и игру..."
  pkill -f "$ROOT/velo-node/src/index.ts" 2>/dev/null || true
  pkill -f "$ROOT/velo-game/node_modules/.bin/vite" 2>/dev/null || true
  free_port 8080
  free_port 5173
}
trap cleanup EXIT INT TERM

echo "Запускаю адаптер и игру..."
echo "Свисток ANT+ должен быть уже в USB."
(
  cd "$ROOT/velo-node"
  "$NPM_BIN" start
) &
(
  cd "$ROOT/velo-game"
  "$NPM_BIN" run dev
) &

echo "Жду, пока игра поднимется..."
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://127.0.0.1:5173/"; then
    open "http://localhost:5173"
    echo "Готово. Это окно Терминала не закрывайте, пока идёт заезд."
    wait
    exit 0
  fi
  sleep 1
done

echo "Игра не ответила. Смотрите лог выше."
pause_exit 1
