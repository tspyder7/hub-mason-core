# Reply and Resolution Status Schema

Track analysis, reply, and resolution independently per comment. Never conflate reply posted with thread resolved.

```text
analysis_status:
  pending
  implemented
  no_change
  resolved
  rejected

reply_status:
  pending
  approved
  posted
  failed
  skipped

resolution_status:
  not_applicable
  pending
  resolved
  failed
  unresolved
```

Example final state:

```text
comment_id: 12345
thread_id: PRRT_abc123

analysis_status: implemented
reply_status: posted
resolution_status: resolved
```

Notes:

- `analysis_status` meanings: `pending` = analyzed, awaiting Gate A decision;
  `implemented` = fix done; `no_change` = valid comment, reply only, no code change;
  `resolved` = thread already resolved on GitHub before workflow started;
  `rejected` = user explicitly rejected comment.
- Already-resolved thread before workflow: `resolved = true`, `analysis_status = resolved`.
- User-rejected comment: `analysis_status = rejected`, `reply_status = skipped`, `resolution_status = unresolved`.
- Reply posted but resolve failed: `reply_status = posted`, `resolution_status = failed`, thread stays unresolved.
