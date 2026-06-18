-- ============================================================================
-- Kira Asistan — Payment method + receipt on transactions
-- ============================================================================

alter table payment_transactions
  add column if not exists method      text,
  add column if not exists receipt_url text;
