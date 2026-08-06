# Operations runbook

## Database changes

Schema changes are versioned under `supabase/migrations`. Production changes
are applied only through the Supabase CLI:

```powershell
npx supabase@latest migration list
npx supabase@latest db push
```

For the existing production project, complete the one-time baseline adoption in
[`supabase/migrations/README.md`](../supabase/migrations/README.md) before the
first `db push`. This prevents an already-applied legacy SQL file from being
re-run while making every future change ordered and auditable.

## Error alerts

Set these Vercel Production variables to enable Sentry:

```text
SENTRY_DSN=<server DSN>
NEXT_PUBLIC_SENTRY_DSN=<browser DSN>
```

The DSN is an ingest endpoint, not a secret. The app still strips request
bodies, cookies, headers, email addresses, and IP addresses before reporting.
Create two Sentry alerts after the first deployment:

1. Any new unhandled error in production.
2. More than five `analyze_persona_failed` events in 15 minutes.

## AI analysis health

After migration `20260806000100_persona_analysis_observability.sql` is applied,
the admin dashboard shows the trailing 24-hour analysis request count, failure
count/rate, and stored OpenAI input/output/total token counts. Token totals are
successful persisted analyses only; failed upstream calls are visible through
the failure metric and Sentry event.

The dashboard is an operational signal, not billing reconciliation. Use the
OpenAI dashboard as the billing source of truth.
