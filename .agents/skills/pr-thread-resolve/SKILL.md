---
name: pr-thread-resolve
description:
    Analyze GitHub PR review threads, write PR_REVIEW_ANALYSIS.md, then resolve
    threads only after successfully posting the reviewer reply. Use when handling
    PR review comments, replying to review threads, resolving review threads,
    updating PR_REVIEW_ANALYSIS.md, or reporting review completion.
    Triggers on phrases like "resolve review thread", "reply to review comment",
    "handle PR comments", "process review feedback", "analyze PR comments",
    or any request to work through unresolved GitHub review threads.
compatibility: opencode
metadata:
    audience: developers
    workflow: git
---

# PR Thread Resolve Skill

Analyze GitHub review **threads**, write results to `PR_REVIEW_ANALYSIS.md`,
then resolve each thread only after reviewer reply posted successfully.
Never resolve before reply verified. Never finish analysis without writing file.

---

## When to trigger

- User says "resolve review thread", "reply to review comment", "handle PR comments", "analyze PR comments", "fetch PR comments"
- User asks to process unresolved review threads on a PR
- User asks to create or update `PR_REVIEW_ANALYSIS.md` with reply/resolution status
- Workflow has produced implementation + proposed reply and needs post + resolve

---

## Hard rules

1. Resolve only after successful reply. Required order per thread:
   1. User approves implementation.
   2. Implementation completed.
   3. User verifies implementation.
   4. User approves proposed reviewer reply.
   5. Reply successfully posted to correct GitHub review thread.
   6. Only then resolve GitHub review thread.
2. Never resolve a thread before reply successfully posted.
3. Resolve the **thread**, not merely mark individual comment handled.
4. Never claim full completion if resolve failed.
5. Do not resolve rejected comment unless user explicitly instructs it.
6. Do not attempt "resolve" again on already-resolved thread.
7. Run only `gh` commands defined in `apis/`. Never run any other `gh` subcommand.
8. Never delete anything: no `-X DELETE` / `--method DELETE`, no `delete` subcommand
   (`cache`, `release`, `repo`, `pr`, `issue`, `secret`, `variable`), no `pr close/merge`.
   Read-only `gh` runs free; reply + resolve always need approval (see Approval gates).
9. Always write `./PR_REVIEW_ANALYSIS.md` immediately after fetching + analyzing
   threads, before Gate A. Analysis without file = incomplete. Never skip file
   creation, even if all threads already resolved or zero unresolved.

---

## Approval gates (STOP and ask)

Use the `question` tool. Present proposal, then STOP. Never proceed past a gate
without explicit user reply. May batch multiple threads in one question.

- **Gate A — implementation:** after analysis file written, propose fix (or no-change response).
  Wait for user approval before touching code.
- **Gate B — verification:** after implementation, show diff + test evidence.
  Wait for user verification before drafting reply.
- **Gate C — reply:** show exact reply body per thread. Wait for user approval
  before posting. Post approved text verbatim.
- **Gate D — resolve:** resolve (step 6) runs only after Gate C text posted + verified
  (step 5). If user rejected comment, skip reply + resolve unless user explicitly
  instructs otherwise.

If user does not answer, wait. Never assume approval, never auto-resolve.

---

## Resolution sequence

Use this exact sequence per thread:

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
    ↓
UPDATE PR_REVIEW_ANALYSIS.md entry in place
```

If posting reply fails:

```text
reply_posted = failed
thread = unresolved
```

Do not attempt to resolve thread.

If posting succeeds but resolving fails:

```text
reply_posted = posted
thread = unresolved
resolution_status = failed
```

Report failure to user. Do not claim review fully completed.

---

## Workflow

### 1. Confirm context

Confirm repository, PR number, thread ID (`PRRT_...`), reply created, thread still unresolved. Identifiers: `comment_id` is numeric REST `databaseId`; `thread_id` is GraphQL node ID. Mutations need `thread_id`.

### 2. Fetch threads

Read `apis/fetch-threads.md` and run its query. Match target by `id == <THREAD_ID>`, require `isResolved == false`. That file is single source of truth for fetch; if it changes, follow updated query.

### 3. Analyze + write PR_REVIEW_ANALYSIS.md (mandatory, before any gate)

This step is required on every run. Analysis without file = incomplete.

1. For each fetched thread, analyze: reviewer intent, validity, severity,
   whether code change needed, proposed fix plan.
2. Immediately create or overwrite `./PR_REVIEW_ANALYSIS.md` using
   `assets/analysis-entry.md` — read it and follow it exactly: file header +
   one initial per-thread entry with `pending` statuses. No extra fields, no reordering.
3. Confirm file written (path + thread count) in chat output before proceeding to Gate A.
4. Only then present analysis summary + Gate A proposal.

If all threads already resolved or zero unresolved, still write file with header + entries, then report and stop (skip to final report).

### 4. Post reply

Read `apis/post-reply.md` and run reply (GraphQL preferred, REST for markdown). Requires Gate C approval first. Post approved text verbatim. That file is single source of truth for reply mutations.

### 5. Verify reply

Re-fetch via `apis/fetch-threads.md`. Confirm new reply present under correct `thread_id`. Only proceed if verified, else set `reply_status: failed` and stop.

### 6. Resolve thread

Read `apis/resolve-thread.md` and run `resolveReviewThread` only after step 5 passed (Gate D). That file is single source of truth for resolve.

### 7. Verify resolution

Re-fetch via `apis/fetch-threads.md`. Confirm `isResolved == true`. Only then set `resolved = true`, `resolution_status = resolved`. Else set `resolution_status = failed` and report.

---

## Already-resolved threads

If thread already resolved before workflow started:

```text
resolved = true
analysis_status = resolved
```

Skip reply + resolve by default, but still record thread in `PR_REVIEW_ANALYSIS.md` step 3 entry with `Analysis Status: resolved`.

If user explicitly asks to analyze/fix resolved comment, it can be processed.

If changes made for already-resolved comment and user asks for reply, reply per normal approval workflow, but do not re-resolve. Set `resolution_status: not_applicable` (see `assets/status-schema.md`).

---

## Reply and resolution tracking

Track independently per comment per `assets/status-schema.md` — read it and use its values verbatim (`analysis_status: pending | implemented | no_change | resolved | rejected`; `reply_status: pending | approved | posted | failed | skipped`; `resolution_status: not_applicable | pending | resolved | failed | unresolved`). That file is single source of truth for state values.

---

## Update PR_REVIEW_ANALYSIS.md

Two phases, both using `assets/analysis-entry.md` — read it and follow it exactly: no extra fields, no reordering. That file is single source of truth for entry template; if it changes, follow updated template.

1. **Create (step 3, mandatory):** immediately after analysis, before Gate A. File header + one initial per-thread entry with `pending` statuses. Confirm path + count in chat.
2. **Update in place (later steps):** after Gate B, after reply posted + verified, after resolve verified, after reject. Edit same block; never create second file. Record actual `gh` error in `**Reason:**`. Never mark `Resolved` unless verify step passed. Never mark `Posted` unless reply verify passed.

---

## Final completion criteria

Analysis phase complete only when:

```text
Threads fetched
AND
Each thread analyzed
AND
./PR_REVIEW_ANALYSIS.md written with header + per-thread pending entries
```

Review comment completely handled only when:

```text
Analysis complete
AND
Implementation complete (if required)
AND
User verification complete
AND
Reply approved
AND
Reply successfully posted
AND
Thread successfully resolved
```

For comments requiring no code change:

```text
Analysis complete
AND
User approves reply
AND
Reply successfully posted
AND
Thread successfully resolved
```

For comments user explicitly rejects:

```text
analysis_status = rejected
reply_status = skipped
resolution_status = unresolved
```

Do not resolve rejected comment automatically unless user explicitly instructs skill to resolve it.

---

## Final report

Report with `assets/final-report.md` — read it and follow it exactly. Final output must distinguish replied vs resolved and state `PR_REVIEW_ANALYSIS.md` path. List every failed `thread_id` with reason and manual retry command. Never report failed thread as resolved.

---

## Boundaries

- Never finish analysis without writing `./PR_REVIEW_ANALYSIS.md` first.
- Never resolve before reply verified.
- Never post or resolve without passing its approval gate first.
- Never run `gh` commands outside `apis/`. Never delete: no DELETE method, no
  `delete` subcommand, no `pr close/merge`.
- Never use comment `databaseId` where GraphQL `threadId` required.
- Never invent thread IDs — always fetch from GitHub first.
- If `gh auth status` shows missing scope/permission, stop and report to user.
- If thread ID stale (thread not found), re-fetch threads and re-match.
