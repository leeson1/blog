#!/bin/bash
# 使用方法：在 ~/blog 目录下执行 bash ~/workspace/project1/backend/scripts/db-backup.sh
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="blog_backup_${TIMESTAMP}.sql"

echo "Backing up database to $BACKUP_FILE ..."
docker compose exec -T db pg_dump -U blog blog > "$BACKUP_FILE"
echo "Done. Backup saved to $(pwd)/$BACKUP_FILE"
echo ""
echo "To restore: bash db-restore.sh $BACKUP_FILE"
