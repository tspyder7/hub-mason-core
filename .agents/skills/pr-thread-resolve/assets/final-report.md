# Final Report Templates

Final output must distinguish replied vs resolved. Use these templates verbatim, filled with real counts.

## Success template

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

## Failure template

```text
Replies:
- 4 posted

Resolution:
- 3 threads resolved
- 1 thread could not be resolved

The failed thread remains unresolved on GitHub.
```

Notes:

- List every failed `thread_id` with reason and manual retry command below the block.
- Never report a failed thread as resolved.
