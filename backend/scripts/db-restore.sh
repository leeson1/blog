#!/bin/bash
# 使用方法：在 ~/blog 目录下执行 bash ~/workspace/project1/backend/scripts/db-restore.sh <backup_file.sql>
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.sql>"
    exit 1
fi

if [ ! -f "$1" ]; then
    echo "File not found: $1"
    exit 1
fi

echo "Restoring database from $1 ..."
docker compose exec -T db psql -U blog blog < "$1"
echo "Done."
