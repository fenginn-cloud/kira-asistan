-- ============================================================================
-- 0021 — Cihaz oturumları (device_sessions)
-- Kullanıcının hangi cihazlarda açık olduğunu gösterir; bir cihaz "iptal"
-- edilince (revoked=true) o cihaz çevrimiçi olunca kendi oturumunu kapatır.
-- Her satır kullanıcıya aittir (user_id = auth.uid()); RLS ile korunur.
-- ============================================================================

create table if not exists device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_token text not null,            -- cihaz başına yerelde saklanan kimlik
  label text not null,                   -- ör. "Chrome · Windows"
  platform text,                         -- web / ios / android
  last_active timestamptz not null default now(),
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, device_token)
);

create index if not exists device_sessions_user_idx on device_sessions (user_id);

alter table device_sessions enable row level security;

-- Kullanıcı yalnızca kendi cihaz oturumlarını görebilir/yönetebilir.
drop policy if exists device_sessions_select on device_sessions;
create policy device_sessions_select on device_sessions for select
  using (user_id = auth.uid());

drop policy if exists device_sessions_insert on device_sessions;
create policy device_sessions_insert on device_sessions for insert
  with check (user_id = auth.uid());

drop policy if exists device_sessions_update on device_sessions;
create policy device_sessions_update on device_sessions for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists device_sessions_delete on device_sessions;
create policy device_sessions_delete on device_sessions for delete
  using (user_id = auth.uid());
