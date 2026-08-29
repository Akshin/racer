#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

# Двойной клик из Finder не читает .zshrc — подхватим обычные места Node и nvm.
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
fi

if ! command -v node >/dev/null; then
  echo "Node.js не найден. Откройте файл ИНСТРУКЦИЯ.txt в папке MAC."
  read -r _
  exit 1
fi

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
(
  cd "$ROOT/velo-node"
  npm start
) &
(
  cd "$ROOT/velo-game"
  npm run dev
) &

echo "Жду, пока игра поднимется..."
for _ in $(seq 1 40); do
  if curl -sf -o /dev/null "http://127.0.0.1:5173/"; then
    open "http://localhost:5173"
    echo "Готово. Это окно Терминала не закрывайте, пока идёт заезд."
    wait
    exit 0
  fi
  sleep 1
done

echo "Игра не ответила. Смотрите лог выше и файл ИНСТРУКЦИЯ.txt в папке MAC."
read -r _
exit 1
