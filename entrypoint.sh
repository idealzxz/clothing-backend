#!/bin/sh
set -e

# Fix ownership of the mounted volume directory so node user can write to it.
# This is necessary because Docker named volumes are owned by root on first creation.
chown -R node:node /app/data

# Push schema to database (creates db file + tables on first boot, safe to re-run)
# Using db push because there are no migration files in this project
su-exec node npx prisma db push --accept-data-loss

# Hand off to the app as node user
exec su-exec node node dist/main.js
