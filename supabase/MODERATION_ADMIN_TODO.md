# Moderation admin follow-up TODO

The minimum admin console now uses the authenticated user session,
`admin_users`, and security-definer RPCs from `admin.sql`. It does not use a
service-role key.

- Add immutable retention/export rules for `admin_audit_logs`.
- Add pagination and case assignment for larger report volumes.
- Add MFA and step-up verification for `admin` and `super_admin` accounts.
- Add a dedicated workflow for changing administrator membership and roles.
- Apply the same moderation checks to future group-chat membership and sends.
- Never expose a service-role credential through browser code or a
  `NEXT_PUBLIC_` variable.
