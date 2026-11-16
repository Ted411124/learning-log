-- 在 Supabase SQL Editor 執行。可重複執行以更新資料表與政策。
create table if not exists public.learning_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  learning text not null check (length(trim(learning)) > 0),
  minutes integer not null check (minutes between 1 and 1440),
  stuck text,
  created_at timestamptz not null default now()
);

alter table public.learning_logs enable row level security;

grant select, insert, update, delete on table public.learning_logs to authenticated;

drop policy if exists "Users can view their own learning logs" on public.learning_logs;
create policy "Users can view their own learning logs"
  on public.learning_logs for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own learning logs" on public.learning_logs;
create policy "Users can insert their own learning logs"
  on public.learning_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own learning logs" on public.learning_logs;
create policy "Users can update their own learning logs"
  on public.learning_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own learning logs" on public.learning_logs;
create policy "Users can delete their own learning logs"
  on public.learning_logs for delete to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists learning_logs_user_date_idx
  on public.learning_logs (user_id, log_date desc, created_at desc);
