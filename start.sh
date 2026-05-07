#!/usr/bin/env bash
set -e
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 未安装，请先安装 Node.js 18+"
  exit 1
fi
if [ ! -d node_modules ]; then
  npm install
fi
npm run build
npm run start
