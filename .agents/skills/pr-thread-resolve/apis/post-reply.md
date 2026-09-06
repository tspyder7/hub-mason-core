# Post Thread Reply

Single source of truth for replying to a review thread. Requires Gate C approval first. Reply must be posted and verified before any resolve attempt.

## GraphQL (preferred for thread replies)

```bash
gh api graphql --raw-field 'query=mutation {
  addPullRequestReviewThreadReply(
    input: {pullRequestReviewThreadId: "<THREAD_ID>", body: "<REPLY_BODY>"}
  ) { comment { id body } }
}'
```

Correct mutation is `addPullRequestReviewThreadReply`. Wrong: `addPullRequestReviewComment` (creates a new top-level comment, not a reply).

## REST (simpler for markdown / special characters)

```bash
gh api repos/<OWNER>/<REPO>/pulls/<PR_NUMBER>/comments/<DATABASE_ID>/replies -f body="<REPLY_BODY>"
```

- `<DATABASE_ID>`: numeric `databaseId` of any comment in the target thread (see `apis/fetch-threads.md`).
- Prefer REST when body contains quotes, code fences, or multiline markdown.

## Placeholders

- `<THREAD_ID>`: GraphQL node ID (`PRRT_...`), never the numeric comment ID.
- `<REPLY_BODY>`: user-approved reply text, verbatim. Never post unapproved text.

## Verify

Re-fetch via `apis/fetch-threads.md`. Confirm new reply present under correct `thread_id` with expected body/author/timestamp. Only then continue to resolve. On failure set `reply_status: failed` and stop — do not resolve.
