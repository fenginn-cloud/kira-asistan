-- ============================================================================
-- Kira Asistan — Web Push (background notifications)
-- ============================================================================

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

drop policy if exists push_self on push_subscriptions;
create policy push_self on push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Records which reminders were already pushed, so none repeats.
create table if not exists notification_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  reminder_key text not null,
  sent_at      timestamptz not null default now(),
  unique (user_id, reminder_key)
);

alter table notification_log enable row level security;
-- Only the service role (Edge Function) touches this table — no client policies.
