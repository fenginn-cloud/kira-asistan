#!/usr/bin/env bash
# Yerel bir PostgreSQL'e (ör. PGHOST=/var/tmp/pg PGPORT=5433) tüm migration'ları
# sırayla uygular, 0023 öncesi örnek veri ekler ve 0023 testini çalıştırır.
# CANLI VERİTABANINA KARŞI ÇALIŞTIRMAYIN — veritabanını sıfırdan oluşturur.
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=${TEST_DB:-kira_test}
psql -U "${PGUSER:-postgres}" -d postgres -qc "drop database if exists $DB" -c "create database $DB"
P="psql -U ${PGUSER:-postgres} -d $DB -v ON_ERROR_STOP=1 -q"
$P -f supabase/tests/stubs.sql
for f in $(ls supabase/migrations/*.sql | sort); do
  [[ "$f" == *0023_* ]] && $P -f supabase/tests/seed_pre_0023.sql
  $P -f "$f" 2>/dev/null >/dev/null || { echo "migration failed: $f"; $P -f "$f"; exit 1; }
done
$P -f supabase/tests/0023_lifecycle_test.sql 2>&1 | grep -E "ok |FAIL|ERROR"
