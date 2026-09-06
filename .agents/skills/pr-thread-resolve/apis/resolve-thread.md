# Resolve Review Thread

Single source of truth for resolving a review thread. Requires Gate D (reply posted + verified). Call only after reply posted and verified.

## Preconditions (confirm all five)

- Repository (owner + name).
- PR number.
- Thread ID (`PRRT_...`).
- Reply successfully created on that thread (see `apis/post-reply.md` verify step).
- Thread still unresolved (`isResolved == false` per `apis/fetch-threads.md`).

## Command

```bash
gh api graphql --raw-field 'query=mutation {
  resolveReviewThread(input: {threadId: "<THREAD_ID>"}) { thread { id isResolved } }
}'
```

Correct mutation is `resolveReviewThread`. Wrong: `resolvePullRequestReviewThread` (does not exist).

## Verify

Re-fetch via `apis/fetch-threads.md`. Confirm GitHub reports `isResolved == true`. Only then set `resolution_status = resolved`.

If still `false` or mutation errored, set `resolution_status = failed`, report `thread_id` + `gh` error + manual retry command. Never report failed thread as resolved.
