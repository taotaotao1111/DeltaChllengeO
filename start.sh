#!/usr/bin/env bash
# start.sh — 由 Guard 拉起业务主进程；末行必须 exec
set -eo pipefail
cd "$(dirname "$0")"

cd backend
export APP_PORT="${APP_PORT:-3000}"
exec node src/server.js 2>&1
