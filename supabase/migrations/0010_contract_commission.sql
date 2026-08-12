-- ============================================================================
-- 0010 — Sözleşmeye komisyon alanı. Kiracı girişinde alınan bir kerelik komisyon.
-- Varsayılan 0; mevcut kayıtlar etkilenmez. Excel Aktarımı komisyon sütununu
-- otomatik okuyup bu alanı doldurur. İstatistik ekranında toplanır.
-- ============================================================================

alter table contracts
  add column if not exists commission_amount numeric not null default 0;
