#!/bin/bash
cd /opt/forecasterarena
set -a
source .env.local
set +a
NODE_ENV=production npx tsx scripts/migrate-snapshots.ts
