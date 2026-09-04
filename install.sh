#!/usr/bin/env bash
# install.sh — Pod 解压后跑一次（每次发布都会跑，必须幂等）
#
# 本项目不使用 PostgreSQL（对话记录只存在浏览器内存里），所以模板里的
# DB 初始化那一段整段删掉了，也不存在 backend/init_db.js。
# 注意：这里绝不能跑 build——前端 dist 由 prepack.sh 在打包阶段产出。
set -eo pipefail
cd "$(dirname "$0")"

BACKEND_DIR="backend"

echo "[install] step: start (backend_dir='${BACKEND_DIR}')"

_cd_backend() {
  if [ -n "$BACKEND_DIR" ] && [ -d "$BACKEND_DIR" ]; then
    cd "$BACKEND_DIR"
  fi
}

# Node 依赖：.npmrc 已配双路内部 registry，不需要额外 -i 参数
if [ "1" = "1" ]; then
  (
    _cd_backend
    if [ -f package.json ]; then
      echo "[install] step: npm ci --omit=dev in $(pwd)"
      npm ci --omit=dev 2>&1
    fi
  )
fi

echo "[install] done"
