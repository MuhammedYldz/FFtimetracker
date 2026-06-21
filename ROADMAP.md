# FocusFlow — Roadmap & Product Decisions

A focused time-tracker. Guiding principle: **do one thing extremely well — track time
against tasks.** Resist scope creep.

## Target user (now)
**Solo users** — freelancers, contractors, indie devs, self-learners. They manage their
own time, often bill clients, and have no IT/admin overhead. This is the wedge.

## Shipped
- Offline-first timer (start/pause/resume/stop, survives restart)
- Manual entries (add/edit/delete)
- Categories ("types") + first-class **Tasks** (track time against real work items)
- Dashboard (today/week/month, breakdowns) + Calendar
- Accounts + cloud sync (Supabase, per-user, RLS); forgot-password; per-identity local storage
- Light/Dark/System theme; brand logo; accessibility labels
- **Integrations** (token-based, freelancer tools): Todoist, GitHub, Notion + generic Custom API
- **CSV export** (client billing)
- Web app (GitHub Pages, auto-deploy) + Android (EAS APK/AAB)

## Decisions
- **Teams / organizations / role-based access / manager dashboards: deferred.** It's a
  different product in a crowded market (Clockify/Toggl/Harvest) and a re-architecture
  (org auth model, not a feature). Build only when BOTH: (a) solo users retain/love it,
  and (b) a real design-partner company asks. Start minimal (read-only opt-in team view),
  not full RBAC/payroll.
- **Storage stays on Postgres/Supabase**, not user Google Drive/OneDrive. Time data is tiny
  (~1.5 MB/user/year); Postgres + RLS is the right tool and scales far past need. Revisit
  only at thousands of active users (then archive cold entries).
- **Integrations = freelancer tools** (Todoist/GitHub/Notion), not enterprise Jira/Azure.
  Custom API covers anything else. Token-based (no OAuth server); works on native, and on
  web where the provider allows CORS (GitHub does; Todoist/Notion may not).

## Possible next (pull-based, when users ask)
- Idle / forgotten-timer reminder (notifications)
- Weekly goal customization; richer per-task reports
- Push time back to integrations (worklogs)
- OAuth (vs token) for integrations; web proxy via Edge Function for CORS-blocked providers
- iOS build (needs Apple Developer account, $99/yr)
- Teams (only per the trigger above)
