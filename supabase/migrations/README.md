# Supabase migration workflow

New schema changes must go in this directory and be applied in filename order
with the Supabase CLI. Do not add production instructions that require pasting
app SQL into the Dashboard SQL Editor.

## One-time production adoption

Production predates this workflow and already has legacy SQL under
`supabase/*.sql`. Link the project and register the verified state without
rerunning legacy SQL:

```powershell
npx supabase@latest login
npx supabase@latest link --project-ref cacamioeisdhizvpspzf
npx supabase@latest migration repair --status applied 20260806000000
npx supabase@latest db push
```

Before `migration repair`, confirm the legacy schema includes profiles, profile
photos, personas with `claim_persona_analysis`, public/direct/group chat,
moderation, admin, legal consents, character compositions, avatar recipes, and
message pagination. Missing legacy pieces must be repaired in a new numbered
migration, then applied by `db push`.

## Ongoing use

```powershell
npx supabase@latest migration new meaningful_change
# edit supabase/migrations/<timestamp>_meaningful_change.sql
npx supabase@latest db push
```

Release validation should run `npx supabase@latest migration list` and fail when
local and remote migration histories differ.
