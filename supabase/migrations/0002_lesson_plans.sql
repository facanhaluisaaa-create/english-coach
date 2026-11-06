-- Collaborative lesson planning: the coach proposes, the teacher decides.

create table if not exists public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  status text not null default 'drafting' check (status in ('drafting', 'ready', 'taught', 'archived')),
  brief jsonb not null,          -- the teacher's own information about the class (required before any AI turn)
  plan jsonb,                    -- the current plan; only ever written by the teacher (directly or by applying a proposal)
  reflection text,
  taught_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lesson_plans_user on public.lesson_plans (user_id, updated_at desc);

create table if not exists public.lesson_messages (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lesson_plans (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  questions jsonb,               -- open questions the coach asked (string[])
  proposal jsonb,                -- a proposed plan snapshot awaiting the teacher's decision
  proposal_status text check (proposal_status in ('pending', 'applied', 'discarded')),
  created_at timestamptz not null default now()
);
create index if not exists lesson_messages_lesson on public.lesson_messages (lesson_id, created_at);

drop trigger if exists lesson_plans_set_updated_at on public.lesson_plans;
create trigger lesson_plans_set_updated_at before update on public.lesson_plans
  for each row execute procedure public.set_updated_at();

alter table public.lesson_plans enable row level security;
alter table public.lesson_messages enable row level security;

drop policy if exists "lesson_plans: own rows" on public.lesson_plans;
create policy "lesson_plans: own rows" on public.lesson_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "lesson_messages: own rows" on public.lesson_messages;
create policy "lesson_messages: own rows" on public.lesson_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
