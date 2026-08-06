create table if not exists public.daily_conversation_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_date date not null,
  question text null check (char_length(question) between 1 and 160),
  topic text null check (topic in ('recently_enjoyed', 'watching_now', 'weekend_plan', 'currently_into', 'custom')),
  custom_topic text null check (char_length(custom_topic) between 1 and 60),
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_date),
  constraint daily_conversation_cards_custom_topic_valid check (
    (topic = 'custom' and custom_topic is not null)
    or (topic is distinct from 'custom' and custom_topic is null)
  )
);

create index if not exists daily_conversation_cards_card_date_idx
on public.daily_conversation_cards (card_date desc);

alter table public.daily_conversation_cards enable row level security;

create policy "Users can view their own daily conversation cards"
on public.daily_conversation_cards for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.kst_today()
returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;

create or replace function public.save_my_daily_conversation_card(
  p_action text,
  p_question text default null,
  p_topic text default null,
  p_custom_topic text default null
) returns public.daily_conversation_cards
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_today date := public.kst_today();
  v_previous public.daily_conversation_cards;
  v_card public.daily_conversation_cards;
begin
  if v_user_id is null then raise exception using errcode = 'P0001', message = 'authentication_required'; end if;
  if p_action not in ('keep_previous', 'skip', 'save') then raise exception using errcode = 'P0001', message = 'invalid_daily_card_action'; end if;

  if p_action = 'keep_previous' then
    select * into v_previous from public.daily_conversation_cards
    where user_id = v_user_id and card_date < v_today and skipped = false
    order by card_date desc limit 1;
    if not found then raise exception using errcode = 'P0001', message = 'previous_daily_card_not_found'; end if;
    p_question := v_previous.question;
    p_topic := v_previous.topic;
    p_custom_topic := v_previous.custom_topic;
  elsif p_action = 'skip' then
    p_question := null; p_topic := null; p_custom_topic := null;
  end if;

  if p_action = 'save'
    and nullif(btrim(p_question), '') is null
    and p_topic is null then
    raise exception using errcode = 'P0001', message = 'daily_card_content_required';
  end if;

  insert into public.daily_conversation_cards (user_id, card_date, question, topic, custom_topic, skipped, updated_at)
  values (v_user_id, v_today, nullif(btrim(p_question), ''), p_topic, nullif(btrim(p_custom_topic), ''), p_action = 'skip', now())
  on conflict (user_id, card_date) do update set
    question = excluded.question, topic = excluded.topic, custom_topic = excluded.custom_topic,
    skipped = excluded.skipped, updated_at = now()
  returning * into v_card;
  return v_card;
end;
$$;

revoke all on function public.save_my_daily_conversation_card(text, text, text, text) from public, anon;
grant execute on function public.save_my_daily_conversation_card(text, text, text, text) to authenticated;

create or replace function public.get_visible_daily_conversation_cards(p_user_ids uuid[])
returns table (user_id uuid, card_date date, question text, topic text, custom_topic text)
language sql stable security definer set search_path = '' as $$
  select card.user_id, card.card_date, card.question, card.topic, card.custom_topic
  from public.daily_conversation_cards card
  inner join public.profiles profile on profile.id = card.user_id
  where card.user_id = any(p_user_ids)
    and card.card_date = public.kst_today()
    and card.skipped = false
    and profile.is_public = true
    and (card.question is not null or card.topic is not null)
    and public.is_user_operational(card.user_id)
    and not exists (
      select 1
      from public.user_blocks blocked_pair
      where (blocked_pair.blocker_id = (select auth.uid()) and blocked_pair.blocked_id = card.user_id)
         or (blocked_pair.blocker_id = card.user_id and blocked_pair.blocked_id = (select auth.uid()))
    );
$$;

revoke all on function public.get_visible_daily_conversation_cards(uuid[]) from public, anon;
grant execute on function public.get_visible_daily_conversation_cards(uuid[]) to authenticated;
