# PR_REVIEW_ANALYSIS.md Entry Templates

Single source of truth for the analysis document. Create it in step 3, update it in place in later steps. No extra fields, no reordering.

## File location and creation rule

- Path: `./PR_REVIEW_ANALYSIS.md` (current working directory / repo root).
- Create or overwrite immediately after fetching threads + completing analysis, before Gate A.
- Never skip creation — even if zero unresolved threads, write file with summary + per-thread entries.
- Later steps update same entries in place; never create a second file.

## File header template

Start every new file with this header, filled with real values:

```markdown
# PR Review Analysis — <OWNER>/<REPO> #<PR_NUMBER>

**Generated:** <ISO_TIMESTAMP>
**Threads:** <N> total, <U> unresolved, <R> already resolved
```

## Initial per-thread entry (step 3, before Gate A)

Write one block per thread immediately after analysis. Use `pending` statuses — do not mark posted/resolved here.

```markdown
### Comment #<DATABASE_ID>

**Thread ID:** <THREAD_ID>
**Reviewer:** <reviewer-login>
**Path:** `<path>` (line <line>)
**State:** isResolved=<true|false>, isOutdated=<true|false>

**Reviewer Comment:**
> <first ~10 lines of comment body, quoted>

**LLM Recommendation:** Action Required | No Change | Already Resolved | Rejected
**Rationale:** <1-3 sentences: why fix needed or not>
**Proposed Fix:** <concrete file/function change plan, or "None — reply only">

**Analysis Status:** <pending | resolved>
**Implementation:** Pending
**User Verification:** Pending
**Reply:** Pending
**Thread Resolution:** Pending
```

Set `Analysis Status: resolved` only for threads already `isResolved == true` on GitHub. All others start as `pending`.

## Update entry after implementation + verification (Gate B passed)

Edit same block in place, replacing only these lines:

```markdown
**Analysis Status:** implemented | no_change
**Implementation:** Completed | Not Required
**User Verification:** Approved
```

## Success entry (after reply posted + resolve verified)

Edit same block in place, replacing only these lines:

```markdown
**Reply:** Posted
**Thread Resolution:** Resolved
**Resolution Time:** <ISO_TIMESTAMP>
```

## Failed resolution entry

Edit same block in place, replacing only these lines:

```markdown
**Reply:** Posted

**Thread Resolution:** Failed

**Reason:** <actual `gh` error output>

**Action Required:** Resolve the thread manually or retry.
```

## Rejected entry (user explicitly rejects comment)

Edit same block in place, replacing only these lines:

```markdown
**Analysis Status:** rejected
**Reply:** Skipped
**Thread Resolution:** Unresolved
**Reason:** User rejected — <short user reason>
```

Notes:

- Record actual reason from `gh` output in `**Reason:**`.
- Never mark `Resolved` unless the verify step in `apis/resolve-thread.md` passed.
- Never mark `Posted` unless the verify step in `apis/post-reply.md` passed.
