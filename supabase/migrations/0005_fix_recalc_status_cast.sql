-- ============================================================================
-- Kira Asistan — Fix: cast computed status to the payment_status enum.
-- Without the ::payment_status cast Postgres raises:
--   column "status" is of type payment_status but expression is of type text
-- ============================================================================

create or replace function recalc_payment() returns trigger as $$
declare
  total numeric(12,2);
  rec   payments%rowtype;
begin
  select * into rec from payments where id = coalesce(new.payment_id, old.payment_id);
  select coalesce(sum(amount), 0) into total
    from payment_transactions where payment_id = rec.id;

  update payments
     set amount_paid = total,
         paid_at = case when total > 0 then current_date else null end,
         status = (case
           when total >= rec.amount_due then 'paid'
           when total > 0 and rec.due_date < current_date then 'overdue'
           when total > 0 then 'partial'
           when rec.due_date < current_date then 'overdue'
           else 'pending'
         end)::payment_status
   where id = rec.id;
  return null;
end;
$$ language plpgsql;
