# Fetch Review Threads

Single source of truth for reading review threads. Use before reply, before resolve, and for both verify steps.

## Command

```bash
gh api graphql --raw-field 'query=query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          comments(first: 10) {
            nodes {
              id
              databaseId
              body
              author { login }
              createdAt
            }
          }
        }
      }
    }
  }
}' -F owner="<OWNER>" -F repo="<REPO>" -F number=<PR_NUMBER>
```

## Placeholders

- `<OWNER>`: repo owner (confirm from `gh repo view --json owner --jq .owner.login`).
- `<REPO>`: repo name (confirm from `gh repo view --json name --jq .name`).
- `<PR_NUMBER>`: pull request number, integer, no quotes.

## Identifiers

- `id` (`PRRT_...`): GraphQL thread node ID. Use for reply + resolve mutations.
- `databaseId` (numeric): REST comment ID. Use only for REST reply endpoint.
- Never pass `databaseId` where `threadId` required.

## Match rules

- Match target thread by `id == <THREAD_ID>`.
- Before reply/resolve, require `isResolved == false`.
- If thread missing (stale ID), re-fetch and re-match by `databaseId` / path / body. Never invent IDs.
- If `gh auth status` shows missing scope, stop and report to user.
