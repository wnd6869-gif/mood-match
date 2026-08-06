-- One-time display-name cleanup for AI identities generated before the
-- natural Korean connector rule was introduced. Run after persona-identity.sql.
-- It only changes the first adjective: "다정한 특별한 수달" ->
-- "다정하고 특별한 수달". Existing collision-free identities stay stable.

with normalized_identities as (
  select
    profile.id,
    pg_catalog.regexp_replace(
      profile.public_nickname,
      '^([가-힣]{1,8})한 ([가-힣]{1,8}) ',
      '\1하고 \2 ',
      'g'
    ) as normalized_nickname
  from public.profiles as profile
  where profile.public_nickname ~ '^[가-힣]{1,8}한 [가-힣]{1,8} [가-힣]{1,8}$'
)
update public.profiles as profile
set public_nickname = normalized.normalized_nickname
from normalized_identities as normalized
where profile.id = normalized.id
  and profile.public_nickname <> normalized.normalized_nickname
  and not exists (
    select 1
    from public.profiles as other_profile
    where other_profile.id <> profile.id
      and lower(
        pg_catalog.regexp_replace(
          other_profile.public_nickname,
          '\s+',
          '',
          'g'
        )
      ) = lower(
        pg_catalog.regexp_replace(
          normalized.normalized_nickname,
          '\s+',
          '',
          'g'
        )
      )
  );
