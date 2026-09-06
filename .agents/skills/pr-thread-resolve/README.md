# pr-thread-resolve

Analyze GitHub PR review threads, write `PR_REVIEW_ANALYSIS.md`, then resolve threads only after reviewer reply posted + verified.

## What it does

Enforces safe analyze-then-reply-then-resolve workflow per review thread:

```text
FETCH THREADS
    ↓
ANALYZE + WRITE PR_REVIEW_ANALYSIS.md (mandatory, before Gate A)
    ↓
POST REPLY
    ↓
VERIFY REPLY
    ↓
RESOLVE THREAD
    ↓
VERIFY RESOLUTION
```

Key behaviors:

- **Analysis file first**: after fetch + analysis, always create/overwrite `./PR_REVIEW_ANALYSIS.md` with header + per-thread `pending` entries before Gate A. Never skip, even if zero unresolved.
- **Gate**: user approves implementation, verifies implementation, approves reply — then post, then resolve. Never resolve before reply verified.
- **Thread, not comment**: resolves GraphQL thread (`PRRT_...`) via `resolveReviewThread`, not individual comment.
- **Verify both steps**: re-fetch thread after post and after resolve; only then set `posted` / `resolved`.
- **Already-resolved**: `analysis_status = resolved`, skip by default; never re-resolve.
- **Independent tracking**: `analysis_status: pending | implemented | no_change | resolved | rejected`, `reply_status: pending | approved | posted | failed | skipped`, `resolution_status: not_applicable | pending | resolved | failed | unresolved`.
- **Doc update**: creates `./PR_REVIEW_ANALYSIS.md` in step 3, then updates entries in place with `Resolved` / `Failed` + reason + retry action.
- **Final report**: separates `Replies posted` from `Threads resolved`; failed threads listed as still unresolved.
- **Approval gates**: STOPs and asks at implementation, verification, reply, resolve. No assumed approvals.
- **Safe `gh` access**: only commands in `apis/`; reads run free, reply + resolve ask, deletes denied (enforced in `opencode.json` `permission.bash`).

## How to invoke

```
resolve review thread
reply to review comment
handle PR comments
process review feedback
analyze PR comments
```

## Example output

```text
PR Review Complete

Review threads:
- 12 total
- 7 already resolved
- 5 processed

Actions:
- 3 fixes implemented
- 1 no-change response
- 1 rejected

Replies:
- 4 posted
- 0 failed

Resolution:
- 4 threads resolved
- 0 resolution failures
```

## Layout

- [`SKILL.md`](./SKILL.md) — orchestrator: gates, sequence, workflow
- [`apis/fetch-threads.md`](./apis/fetch-threads.md) — canonical thread fetch query
- [`apis/post-reply.md`](./apis/post-reply.md) — reply mutations (GraphQL + REST)
- [`apis/resolve-thread.md`](./apis/resolve-thread.md) — resolve mutation + verify
- [`assets/analysis-entry.md`](./assets/analysis-entry.md) — `PR_REVIEW_ANALYSIS.md` templates
- [`assets/final-report.md`](./assets/final-report.md) — final report templates
- [`assets/status-schema.md`](./assets/status-schema.md) — `reply_status` / `resolution_status` values

## See also

- [`SKILL.md`](./SKILL.md) — full LLM-facing instructions
