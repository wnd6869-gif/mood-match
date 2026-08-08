-- Repairs the historical personas schema so current analysis telemetry can be
-- persisted. The application also has a core-result fallback for staged
-- rollouts, but this migration restores the full current contract.

alter table public.personas
  add column if not exists visual_traits jsonb null,
  add column if not exists model_name text null,
  add column if not exists input_tokens integer null,
  add column if not exists output_tokens integer null,
  add column if not exists total_tokens integer null,
  add column if not exists analysis_source text null;

update public.personas
set analysis_source = 'openai'
where analysis_source is null;

alter table public.personas
  alter column analysis_source set default 'openai',
  alter column analysis_source set not null;

notify pgrst, 'reload schema';
