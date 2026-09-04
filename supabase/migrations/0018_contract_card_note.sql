-- ============================================================================
-- Kira Asistan — Sözleşme kartı hızlı notu
--
-- Sözleşme detayına girmeden, kartların üzerinde görünen kısa bir not.
-- Örn: "Kira günü bugün ama kiracı 10 gün sonra ödeyecek."
-- Tekrar çalıştırılabilir.
-- ============================================================================

alter table contracts
  add column if not exists card_note text;
