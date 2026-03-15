#!/bin/bash
set -e

# 首次启动时从 data-init 初始化数据目录
if [ ! -f /app/data/users.csv ]; then
    echo "Initializing data directory..."
    cp -rn /app/data-init/. /app/data/
fi

cd /app/build
exec ./blog_backend
