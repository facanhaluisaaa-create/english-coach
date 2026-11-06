-- English Mastery — initial schema
-- Run with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  daily_goal_minutes integer not null default 20 check (daily_goal_minutes between 5 and 120),
  toefl_target_band numeric(2,1) not null default 6.0 check (toefl_target_band between 1 and 6),
  teaching_contexts text,
  focus_notes text,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_session_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Learning sessions (daily plan or on-demand practice)
-- ---------------------------------------------------------------------------
create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'daily' check (kind in ('daily', 'practice')),
  session_date date not null default (now() at time zone 'utc')::date,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed')),
  plan jsonb not null,
  summary jsonb,
  total_score numeric,
  max_score numeric,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists learning_sessions_one_daily_per_day
  on public.learning_sessions (user_id, session_date) where kind = 'daily';
create index if not exists learning_sessions_user_date on public.learning_sessions (user_id, session_date desc);

-- ---------------------------------------------------------------------------
-- Exercises (blocks inside a session)
-- ---------------------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learning_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null,
  skill text not null check (skill in ('vocabulary', 'grammar', 'toefl', 'teaching', 'review')),
  exercise_type text not null,
  title text not null,
  estimated_minutes integer not null default 5,
  content jsonb not null,
  response jsonb,
  evaluation jsonb,
  score numeric,
  max_score numeric not null default 100,
  status text not null default 'pending' check (status in ('pending', 'submitted', 'evaluated', 'skipped')),
  started_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists exercises_session on public.exercises (session_id, position);
create index if not exists exercises_user_created on public.exercises (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Vocabulary with spaced repetition state
-- ---------------------------------------------------------------------------
create table if not exists public.vocabulary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  term text not null,
  part_of_speech text,
  definition text not null,
  example text,
  collocations text[] not null default '{}',
  register text,
  cefr_level text,
  notes text,
  source_exercise_id uuid references public.exercises (id) on delete set null,
  repetitions integer not null default 0,
  interval_days numeric not null default 0,
  ease numeric not null default 2.5,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  times_correct integer not null default 0,
  times_incorrect integer not null default 0,
  mastery text not null default 'new' check (mastery in ('new', 'learning', 'reviewing', 'mastered')),
  created_at timestamptz not null default now()
);
create unique index if not exists vocabulary_items_user_term on public.vocabulary_items (user_id, lower(term));
create index if not exists vocabulary_items_due on public.vocabulary_items (user_id, due_at);

-- ---------------------------------------------------------------------------
-- Concepts: grammar weaknesses, recurring errors, things to reinforce
-- ---------------------------------------------------------------------------
create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in (
    'grammar', 'vocabulary', 'pronunciation', 'writing', 'speaking',
    'reading', 'listening', 'teaching', 'register', 'discourse'
  )),
  name text not null,
  description text,
  severity integer not null default 3 check (severity between 1 and 5),
  occurrences integer not null default 1,
  status text not null default 'active' check (status in ('active', 'improving', 'mastered')),
  repetitions integer not null default 0,
  interval_days numeric not null default 0,
  ease numeric not null default 2.5,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  times_correct integer not null default 0,
  times_incorrect integer not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists concepts_user_name on public.concepts (user_id, lower(name));
create index if not exists concepts_due on public.concepts (user_id, status, due_at);

-- ---------------------------------------------------------------------------
-- Error log: every corrected sentence, linked to a concept when possible
-- ---------------------------------------------------------------------------
create table if not exists public.error_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  concept_id uuid references public.concepts (id) on delete set null,
  original text not null,
  corrected text not null,
  explanation text not null,
  error_type text not null default 'error' check (error_type in ('error', 'stylistic', 'register', 'naturalness')),
  created_at timestamptz not null default now()
);
create index if not exists error_log_user on public.error_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Review log: every active-recall attempt
-- ---------------------------------------------------------------------------
create table if not exists public.review_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('vocabulary', 'concept')),
  item_id uuid not null,
  exercise_id uuid references public.exercises (id) on delete set null,
  rating integer not null check (rating between 0 and 5),
  correct boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists review_log_user on public.review_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Skill scores: time series for trends (per skill / TOEFL section)
-- ---------------------------------------------------------------------------
create table if not exists public.skill_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  skill text not null,
  score numeric not null,
  max_score numeric not null default 100,
  band numeric(2,1),
  recorded_at timestamptz not null default now()
);
create index if not exists skill_scores_user_skill on public.skill_scores (user_id, skill, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Coach chat history
-- ---------------------------------------------------------------------------
create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_messages_user on public.coach_messages (user_id, created_at);

-- ---------------------------------------------------------------------------
-- Profile auto-creation
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: every learner sees only their own data
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.exercises enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.concepts enable row level security;
alter table public.error_log enable row level security;
alter table public.review_log enable row level security;
alter table public.skill_scores enable row level security;
alter table public.coach_messages enable row level security;

drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array[
    'learning_sessions', 'exercises', 'vocabulary_items', 'concepts',
    'error_log', 'review_log', 'skill_scores', 'coach_messages'
  ] loop
    execute format('drop policy if exists "%1$s: own rows" on public.%1$s', t);
    execute format(
      'create policy "%1$s: own rows" on public.%1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t
    );
  end loop;
end $$;
