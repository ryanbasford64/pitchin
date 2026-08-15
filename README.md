# PitchIn — people helping people

A neighborhood readiness board. Needs arrive in plain English, get decomposed into taskable
units, get matched to what neighbors actually have, and get closed with an after-action report.

**Nextdoor tells you what your neighbors are complaining about. PitchIn tells you what they need
and lets you say yes.**

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build — must pass
npx tsc --noEmit # typecheck — must pass
npm run lint     # must pass
```

The store is a JSON file at `data/pitchin.json`, created and seeded on first read from
`src/lib/seed.ts` (Hamilton, Montana — 14 members, 3 crews, 6 needs, 9 tasks, 1 published AAR).
`data/` is gitignored. Delete the file to reseed, or `POST /api/demo/reset`.

There are no accounts. "Who am I" is the member switcher in the nav (cookie-backed, see
`src/lib/session.ts`), so a walkthrough can move between a helper, a requester and a coordinator.

## Product rules that are load-bearing

These are design commitments, not preferences. Do not build around them.

1. **Every item on the Board is actionable.** No posts, no opinions, no announcements. If you
   can't claim it or fulfill it, it doesn't belong on the Board.
2. **You respond by committing, not commenting.** The primary control is *I'll take it*. Needs
   have no comment box — only a logistics Q&A visible to people who have claimed the task.
3. **Verification comes from the requester, never the helper.** Self-reported good deeds are
   worthless as currency.
4. **Show-rate, not hours.** Standing is commitments kept over commitments made. 40 hours once
   and then vanishing is worth less than 20 minutes a week for two years.
5. **Declining is free.** Only an unannounced no-show hurts show-rate — the harm is the broken
   promise, not the absence. After misses the ask *shrinks* (`askMinutes` in `src/lib/derive.ts`).
6. **Quorum.** A task does not launch below its minimum headcount. Nobody shows up alone to a
   two-person job.
7. **Crew-level standings only.** No individual leaderboard, no points, no XP, no currency.
8. **Asking is as dignified as offering.** Private and coordinator-routed needs never appear on
   the public Board; names and quotes are published only with `publishConsent`.
9. **No crime or suspicion category. Ever.**
10. **Degrades to paper.** The printable weekly board must stand alone in a diner window.

## Architecture

- Next.js 16 (App Router, RSC by default), TypeScript strict, Tailwind v4.
- `src/lib/types.ts` — the domain contract shared by every slice. **Additive changes only**; if you
  think you need to change an existing field, say so instead.
- `src/lib/store.ts` — `db()` to read, `write(mutator)` to mutate and persist, `reseed()`.
- `src/lib/derive.ts` — pure derived read models (show-rate, quorum, readiness, ranking, gaps).
  Put shared computation here so every slice reports the same numbers.
- `src/lib/session.ts` — current member.
- `src/components/ui.tsx` — `Section`, `Card`, `Tag`, `Stat`, `Empty`. Use these; don't invent a
  parallel design system.
- Mutations are route handlers under `src/app/api/*` called from client components, or server
  actions — either is fine, but revalidate/refresh so the Board reflects reality immediately.

## Slice ownership

Work only inside your slice's files to keep parallel work conflict-free.

| Slice | Owns | Routes |
|---|---|---|
| A — Board & needs | `src/app/page.tsx`, `src/app/needs/**`, `src/components/board/**`, `src/app/api/needs/**`, `src/app/api/tasks/**` | `/`, `/needs/[id]` |
| B — Pitch, crews, standing | `src/app/pitch/**`, `src/app/crews/**`, `src/app/api/pitch/**`, `src/components/pitch/**` | `/pitch`, `/crews` |
| C — Coordinator & AAR | `src/app/coordinator/**`, `src/app/api/coordinator/**`, `src/app/reports/**`, `src/components/coordinator/**` | `/coordinator`, `/reports/[needId]` |
| D — Readiness, map, printable board | `src/app/readiness/**`, `src/app/print/**`, `src/components/readiness/**`, `src/app/api/demo/**` | `/readiness`, `/print` |

Shared files (`types.ts`, `derive.ts`, `store.ts`, `ui.tsx`, `Nav.tsx`) are append-only for
everyone: add helpers, don't rewrite what's there.
