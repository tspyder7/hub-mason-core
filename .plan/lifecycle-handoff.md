# Lifecycle Handoff Plan — hub-mason-core

> Portal -> Engine snapshot handoff with injected status/emoji, HMAC 30m window, embed config, lifecycle folder.

## 1. Overview

Refactor `src/workflow/steps.ts` step lifecycle into generic `src/lifecycle/` core shared between `hub-mason-portal` and `hub-mason-engine`. Portal builds lifecycle, executes initial steps, serializes snapshot (+ config + HMAC) into `workflow_dispatch` `context` input. Engine hydrates same lifecycle via `hub-mason-core` utils, verifies HMAC, resumes from `in_progress`/next `pending`, preserving portal timestamps for debugging.

## 2. Goals

- Common utils in `hub-mason-core` for both portal and engine.
- Status, emoji, transitions injected (not hardcoded `StepStatus`).
- Serializable snapshot with full config embed, versioned.
- Secure handoff via HMAC-SHA256, 30 min expiry, no dedup store.
- Preservation of portal `startedAt`/`completedAt` for debug.
- Resume semantics: `pending` -> begin, `in_progress` -> take over, `failed` -> abort.
- Clean folder split: pure core vs GitHub adapters.

## 3. Non-Goals

- Changing `workflow_dispatch` auth (still GitHub token) — HMAC is additional layer only.
- Persisting snapshots outside GitHub (DB) — out of scope for core.
- UI rendering in portal beyond providing emoji map.
- Deduplication store for `requestId`.

## 4. Current State Analysis

### 4.1 Existing Files

```
src/workflow/steps.ts:1-173   — beginStep/finishStep/failStep/addStepDetails + createSteps factory
src/workflow/render.ts:1-132  — renderStatusComment(context:AppContext), renderSummary
src/workflow/status-comment.ts:1-31 — upsertStatusComment via AppContext singleton
src/workflow/status-label.ts:1-116  — updateStatus via AppContext
src/workflow/summary-comment.ts:1-18 — postSummaryComment
src/workflow/with-unlocked-issue.ts:1-30 — withUnlockedIssue
src/types/step.ts:1-28 — Step, StepDefinition, BoundSteps, StepError imports StepStatus from missing src/utils/constants.ts
src/types/event.ts:1-15 — GithubEvent
src/markdown/tags.ts — mdast helpers
src/github/issues/* — addComment, updateComment, etc. require (input, repository) second param
src/utils/logger.ts — pino
```

### 4.2 Issues

- `src/workflow/steps.ts:2` `import { AppContext } from '../context/app-context'` — `src/context` dir missing. All 6 workflow files broken (TS2307). `src/utils/constants.ts` missing, `src/helpers/github/issues` wrong path (should be `src/github/issues`), `src/types` barrel missing.
- Singleton `AppContext.getInstance()` `steps.ts:35,56,76,97,111,131` — cannot handle concurrent requests, not testable, not reusable portal vs engine.
- Side effects mixed: every transition does `context.setSteps(map)` + `await upsertStatusComment()` `steps.ts:52,72,92` — state + IO coupled, no reporter abstraction.
- No validation: `finishStep` can be called on `PENDING` without `begin`, `beginStep` twice allowed. No `transitions` map.
- `render.ts:51` takes whole `AppContext` not `Step[]` — not pure, not serializable. `StepStatusEmoji` hardcoded `render.ts:30` prevents injection.
- `status-comment.ts`/`status-label.ts`/`with-unlocked-issue.ts` are GitHub adapters, not core — wrong layer.
- No snapshot/serialization — portal cannot pass state to engine. `cancelPendingSteps` `steps.ts:110` sync vs async inconsistency.
- `createSteps` `steps.ts:146-173` type-safe but still calls global fns, no instance isolation.

### 4.3 Requirements From User

1. Pass snapshot via `workflow_dispatch` `context` input (existing two inputs: `request`, `context`).
2. HMAC validation.
3. Embed full config.
4. Preserve timestamps for debugging.
5. Portal may leave `in_progress` — engine continues; `failed` -> fail.
6. Folder name `lifecycle`.

## 5. Proposed Architecture

### 5.1 Principles

- **Generic core**: `LifecycleManager<S extends string>` parameterized by status union, no GitHub imports. Data types (`LifecycleSnapshot`, `LifecycleConfig`, `Step`) remain `Lifecycle*` — manager is runtime orchestrator.
- **Dependency inversion**: `StepStore<S>` + `Reporter<S>` injected, `clock` injected for tests.
- **Ports & adapters**: core pure, adapters in `src/adapters/github/` handle comments/labels/lock.
- **Snapshot as contract**: JSON with zod, versioned, embedded config.
- **HMAC time-window only**: `createSignature`/`verifySignature` use `requestId.issuedAt` payload only (no snapshot hash/stableStringify), 30m expiry, `timingSafeEqual`; snapshot integrity relies on `workflow_dispatch` auth token (portal is only caller).
- **Object inputs**: any function with >2 params uses single object param (e.g. `createSignature({requestId,issuedAt,secret})`), keeps API extensible per TS standards.

### 5.2 Final File Structure

```
src/
  lifecycle/
    core/
      types.ts        // Step<S>, StepDefinition, StepError, StepStore<S>, Reporter<S>
      config.ts       // LifecycleConfig<S> + zod lifecycleConfigSchema, status enums not hardcoded
      manager.ts      // LifecycleManager<S> class, transition validation via config.transitions (was machine.ts / Lifecycle)
      snapshot.ts     // lifecycleSnapshotSchema, requestContextSchema, createSnapshot, hydrate, createDispatchContext, parseDispatchContext
      errors.ts       // toStepError (was steps.ts:22), TransitionError, ValidationError, SignatureError, ExpiredError
    security/
      sign.ts         // createSignature, verifySignature, timingSafeEqual (node:crypto) — no stableStringify/hashSnapshot, payload = requestId.issuedAt
    presets/
      index.ts        // optional: portalPreset, enginePreset helpers (convenience, not source of truth)
    index.ts          // public barrel re-exports
  adapters/
    github/
      renderer.ts     // pure renderer (steps, meta, emojiMap) -> markdown, was render.ts:51
      comment-reporter.ts // was status-comment.ts + summary-comment.ts unified
      label-reporter.ts   // was status-label.ts, injects labelPrefix from config
  github/
    issues/
      with-lock.ts    // move with-unlocked-issue.ts
  # remaining unchanged: src/github/*, src/markdown/*, src/utils/logger.ts, src/types/event.ts etc.
  # deleted/replaced: src/workflow/*, src/types/step.ts (re-export shim), src/utils/constants.ts (replaced by config.ts)
```

Shim for backward compat: `src/workflow/steps.ts` re-exports `lifecycle` with deprecation notice using `AppContextStore` adapter until consumers migrate. `src/types/step.ts` re-exports from `lifecycle/core/types.ts`. Public export `LifecycleManager` (alias `Lifecycle` deprecated).

### 5.3 Types

```ts
// src/lifecycle/core/types.ts
export interface StepDefinition { id: string; name: string }
export interface StepError { message: string; stack?: string }
export interface Step<S extends string> {
  id: string;
  name: string;
  status: S;
  startedAt?: string; // ISO, preserved from portal
  completedAt?: string;
  details: string[];
  error?: StepError;
}
export interface StepStore<S extends string> {
  get(): readonly Step<S>[];
  set(updater: (prev: readonly Step<S>[]) => readonly Step<S>[]): void;
  subscribe?(cb: (steps: readonly Step<S>[]) => void): () => void;
}
export interface Reporter<S extends string> {
  onTransition?: (e: { step: Step<S>; from: S; to: S; all: readonly Step<S>[] }) => Promise<void> | void;
}
export interface WorkflowMeta {
  requestId: string;
  requestType?: string;
  owner?: string;
  repo?: string;
  runId?: number;
  actor?: string;
}
```

```ts
// src/lifecycle/core/config.ts
export type LifecycleConfig<S extends string> = {
  statuses: readonly S[];                 // e.g. ['pending','running','done','failed','cancelled'] as const
  initial: S;                             // first status, e.g. 'pending'
  transitions: Record<S, readonly S[]>;   // allowed next statuses per status
  emoji?: Partial<Record<S, string>>;     // injected, not hardcoded StepStatusEmoji
  terminal?: readonly S[];                // statuses considered terminal (done/failed/cancelled)
  version?: string;                       // optional config version for debugging
};
// zod schemas:
// lifecycleConfigSchema validates statuses non-empty, initial ∈ statuses, transitions keys ⊆ statuses, values ⊆ statuses
// stepSchema, stepDefinitionSchema etc.
```

```ts
// src/lifecycle/core/snapshot.ts
export interface LifecycleSnapshot<S extends string> {
  v: 1;
  config: LifecycleConfig<S>;
  definitions: readonly StepDefinition[];
  steps: readonly Step<S>[];
  meta: { requestId: string; requestType?: string; createdAt: string; portalVersion?: string; };
}
export interface RequestContext<S extends string> {
  requestId: string; // equals snapshot.meta.requestId
  requestType: string;
  lifecycleSnapshot: LifecycleSnapshot<S>;
  signature: string; // hex hmac
  issuedAt: string; // ISO datetime, for 30m window
  actor?: string;
}
// zod:
// lifecycleSnapshotSchema validates definitions ids unique, steps ids ⊆ definitions, steps[].status ∈ config.statuses
// requestContextSchema validates issuedAt not future, signature hex, lifecycleSnapshot valid
```

### 5.4 Manager — `LifecycleManager`

`manager.ts` holds `LifecycleManager` runtime logic (previously `machine.ts`/`Lifecycle`). Naming: `Lifecycle` denotes data (`LifecycleSnapshot`, `LifecycleConfig`, `Step`), `LifecycleManager` denotes active orchestrator that owns store, validates transitions, emits reporter, creates snapshots.

```ts
// src/lifecycle/core/manager.ts
export class LifecycleManager<S extends string> {
  constructor(input: {
    definitions: readonly StepDefinition[];
    config: LifecycleConfig<S>;
    store: StepStore<S>;
    reporter?: Reporter<S>;
    clock?: () => string;
  })
  get steps(): readonly Step<S>[]
  get config(): LifecycleConfig<S>
  get definitions(): readonly StepDefinition[]
  getSnapshot(): LifecycleSnapshot<S>
  static fromSnapshot<S extends string>(input: {
    snapshot: unknown;
    store?: StepStore<S>;
    reporter?: Reporter<S>;
    clock?: () => string;
  }): LifecycleManager<S>
  transition(id: string, to: S): Promise<Step<S>> // validates via config.transitions[from], throws TransitionError, updates startedAt/completedAt via clock, calls reporter.onTransition
  addDetail(id: string, detail: string): Promise<Step<S>>
  cancelPending(): void // moves pending|in_progress -> terminal cancelled per config.terminal
  getNextPending(): Step<S> | null
  findByStatus(status: S): Step<S> | undefined
  hasFailed(): boolean // any step status terminal failed
  run<R>(id: string, fn: () => Promise<R>): Promise<R> // auto transition to next status on success/failure
}
```

Transition rules embedded in config, e.g. portal:
```ts
transitions: {
  pending: ['running','cancelled'],
  running: ['done','failed','cancelled'],
  done: [],
  failed: [],
  cancelled: []
}
```

Engine config may use `in_progress` instead of `running` — generic handles any.

Timestamp preservation: `fromSnapshot` hydrates store with exact `startedAt`/`completedAt` from snapshot. Only new transitions generate new timestamps via `clock()`.

### 5.5 Security — HMAC (`createSignature` / `verifySignature` + `timingSafeEqual`, time-window only)

`timingSafeEqual` is `node:crypto.timingSafeEqual` — constant-time `Buffer` compare. Unlike `===` which returns on first differing byte, `timingSafeEqual` always compares every byte, preventing timing side-channel where attacker measures response time to guess hex signature byte-by-byte. Requires equal-length buffers; therefore check `a.length !== b.length` first then `timingSafeEqual` (Node throws if lengths differ). Use hex encoding; convert both sides to `Buffer.from(..., 'hex')` before compare.

Payload is `requestId.issuedAt` only (per user decision). No `snapshot`, no `stableStringify`/`hashSnapshot` needed. Ensures request not older than 30m; snapshot authenticity relies on `workflow_dispatch` auth token — only `hub-mason-portal` can dispatch.

```ts
// src/lifecycle/security/sign.ts
import { createHmac, timingSafeEqual } from 'node:crypto';

// HMAC payload is small `requestId.issuedAt` only — >2 args so object input.
export const createSignature = (input: { requestId: string; issuedAt: string; secret: string }): string => {
  const payload = `${input.requestId}.${input.issuedAt}`;
  return createHmac('sha256', input.secret).update(payload, 'utf8').digest('hex');
};

// Verify with 30m skew (default), future check + constant-time compare — object input for >2 args.
export const verifySignature = (input: {
  signature: string;
  requestId: string;
  issuedAt: string;
  secret: string;
  skewMs?: number;
}): void => {
  const skewMs = input.skewMs ?? 30 * 60 * 1000;
  const now = Date.now();
  const issued = Date.parse(input.issuedAt);
  if (Number.isNaN(issued) || issued > now + 60_000) throw new ExpiredError('issuedAt in future');
  if (now - issued > skewMs) throw new ExpiredError('signature expired');

  const expected = createSignature({ requestId: input.requestId, issuedAt: input.issuedAt, secret: input.secret });
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(input.signature, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new SignatureError('invalid signature');
};
```

Env: `HUB_MASON_SHARED_SECRET` set in portal and engine GitHub secrets.

Portal signs: `sig = createSignature({ requestId: meta.requestId, issuedAt, secret })` then builds `requestContext = { requestId, requestType, lifecycleSnapshot: snapshot, signature: sig, issuedAt }` and passes `JSON.stringify(requestContext)` as `context` input to `workflow_dispatch`.

Engine verifies: `requestContext = requestContextSchema.parse(JSON.parse(inputs.context))`, then `verifySignature({ signature: requestContext.signature, requestId: requestContext.requestId, issuedAt: requestContext.issuedAt, secret })` before `LifecycleManager.fromSnapshot({ snapshot: requestContext.lifecycleSnapshot })`. On failure, mark workflow `FAILED` and throw. Snapshot content validated by zod only; not covered by HMAC per decision.

No dedup store — time window 30m sufficient per user.

### 5.6 Request Context in workflow_dispatch

Current `src/github/event/get-event.ts` uses `github.context.payload` etc. For `workflow_dispatch`, inputs available via `github.context.payload.inputs`. Need helper:

```ts
// src/lifecycle/snapshot.ts helper — object input because >2 fields conceptually, keep 1 object param
export const parseDispatchContext = <S extends string>(input: { inputs: { context?: string; request?: string }; secret: string }): RequestContext<S> => {
  const raw = input.inputs.context ?? '';
  const parsed = JSON.parse(raw);
  const ctx = requestContextSchema.parse(parsed);
  verifySignature({ signature: ctx.signature, requestId: ctx.requestId, issuedAt: ctx.issuedAt, secret: input.secret });
  // cross-check snapshot.meta.requestId === ctx.requestId
  if (ctx.lifecycleSnapshot.meta.requestId !== ctx.requestId) throw new ValidationError('requestId mismatch');
  return ctx as RequestContext<S>;
};
```

Size: JSON snapshot ~2-5KB, plus signature ~64 hex, issuedAt ~24 chars, well within `workflow_dispatch` string input limit (GitHub limit ~ 65536 per input). No compression needed initially; add `compressSnapshot` (base64 gzip) if needed later.

### 5.7 Renderer

```ts
// src/adapters/github/renderer.ts — object input for >2 args
export const renderStatusComment = <S extends string>(input: { steps: readonly Step<S>[]; meta: WorkflowMeta; emoji: Partial<Record<S,string>> }): string => {
  // was render.ts:51 but no AppContext, pure, uses emoji map injected from config
  // table: Step | Status(emoji) | Details, failed blockquote, workflow run link
};
export const renderSummary = <S extends string>(input: { steps: readonly Step<S>[]; meta: WorkflowMeta; emoji: Partial<Record<S,string>> }): string => {
  // same object input
  return '';
};
```

### 5.8 Reporters / Adapters

```ts
// src/adapters/github/comment-reporter.ts — object input for >2 args
export const createGithubCommentReporter = <S extends string>(input: {
  repository: Repository; // src/types/repository.ts:1
  issueNumber: number;
  emoji: Partial<Record<S,string>>;
  getCommentId?: () => number | undefined;
  setCommentId?: (id: number) => void;
}): Reporter<S> => ({
  onTransition: async ({ all }) => {
    const body = renderStatusComment({ steps: all, meta: { owner: input.repository.owner, repo: input.repository.repo, runId: 0 }, emoji: input.emoji });
    // was status-comment.ts:9 upsertStatusComment — now uses addCommentToIssue(input, repository) :7 and updateCommentOnIssue
    // handles withUnlockedIssue via with-lock.ts
  }
});
```

`label-reporter.ts` similar: `createGithubLabelReporter({ repository, issueNumber, labelPrefix })` — object input. Uses `addLabelToIssue` `removeLabelFromIssue` with `STATUS_LABEL_PREFIX` from config `labelPrefix`.

`with-lock.ts` moved to `src/github/issues/with-lock.ts`, signature `withUnlockedIssue({ issueNumber, repository, fn })` — object input.

## 6. Sequence

```
Portal                         hub-mason-core                  Engine (workflow_dispatch)
  | create LifecycleManager({definitions:defs,config:portalConfig,store:MemoryStore}) |
  | transition validate running->done                                                  |
  | snap = getSnapshot() // includes definitions, steps, config, meta                   |
  | sig = createSignature({requestId:reqId, issuedAt, secret}) // payload reqId.issuedAt only |
  | ctx = {reqId, lifecycleSnapshot:snap, signature:sig, issuedAt}                     |
  | JSON.stringify(ctx) -> workflow_dispatch inputs.context --------------------------->| parseDispatchContext({inputs:{context}, secret})
  |                                                                                    | verifySignature({signature,requestId,issuedAt,secret}) + 30m (timingSafeEqual)
  |                                                                                    | wf = LifecycleManager.fromSnapshot({snapshot:snap, store:MemoryStore(allSteps), reporter:GithubReporter})
  |                                                                                    | if wf.hasFailed() throw
  |                                                                                    | cur = wf.findByStatus(in_progress) ?? wf.getNextPending()
  |                                                                                    | await wf.transition(cur.id, 'running') // if pending
  |                                                                                    | // do work
  |                                                                                    | await wf.transition(cur.id, 'done')
  |                                                                                    | reporter renders with emoji
```

## 7. Implementation Phases

### Phase 0 — Fix Baseline (no behavior change, make build green)

- Create `src/lifecycle/core/config.ts` zod schemas, replace missing `src/utils/constants.ts` (previously `StepStatus`, `StepStatusEmoji`, `STATUS_LABEL_PREFIX`).
- Fix imports: `../context/app-context` -> inject `Repository`+`WorkflowMeta` explicitly, `../helpers/github/issues` -> `../github/issues`, `../types` -> `../types/issues` or new `lifecycle` barrel, add `Repository` param to `addCommentToIssue` calls.
- Add `src/github/issues/with-lock.ts` wrapper.
- Make `tsc --noEmit` pass, `vitest --coverage` green (thresholds 100% per `vitest.config.ts`).

### Phase 1 — Generic Manager

- Implement `src/lifecycle/core/types.ts`, `config.ts`, `manager.ts` (`LifecycleManager`) with `transition` validation, `clock` injection, `Store` abstraction.
- Tests: transition matrix, invalid transition throws `TransitionError`, timestamps via mock clock, `cancelPending`, `addDetail`.

### Phase 2 — Snapshot + Security

- Implement `snapshot.ts` schemas + `createSnapshot`/`hydrate`/`fromSnapshot`/`parseDispatchContext`, `security/sign.ts` `createSignature`/`verifySignature` + `timingSafeEqual` hmac + 30m window (payload = `requestId.issuedAt` only, no snapshot/stableStringify).
- Tests: round-trip `create->hydrate` preserves timestamps, tamper -> `ValidationError` (zod), expired/future -> `ExpiredError`, bad sig -> `SignatureError` via `timingSafeEqual`, known HMAC vectors for `requestId.issuedAt` payload.

### Phase 3 — Adapters

- Refactor `render.ts:51` -> `adapters/github/renderer.ts` pure, takes `emoji` param.
- Merge `status-comment.ts`+`summary-comment.ts` -> `comment-reporter.ts`, `status-label.ts` -> `label-reporter.ts`, inject `emoji`/`labelPrefix` from config.
- Tests: renderer snapshot with injected emoji, reporter mocks `addCommentToIssue` with `repository` param.

### Phase 4 — Integration

- Portal helper `createDispatchContext({ snapshot, meta, secret })` + engine helper `parseDispatchContext({ inputs, secret })` — object inputs.
- Update `src/github/event/get-event.ts` to expose `inputs` for dispatch.
- E2E test: portal create `new LifecycleManager({definitions,config,store})` -> sign `createSignature({requestId,issuedAt,secret})` -> engine `parseDispatchContext` -> hydrate `LifecycleManager.fromSnapshot({snapshot})` -> take-over `in_progress` -> complete.

### Phase 5 — Deprecation

- Keep `src/workflow/steps.ts` shim: `export const createSteps = ...` wraps `LifecycleManager` with default config + `AppContextStore` for legacy `hub-mason-engine` until migrated, marked `@deprecated` (alias `Lifecycle` -> `LifecycleManager`).
- `src/types/step.ts` re-exports from `lifecycle/core/types.ts`.
- Update `src/index.ts` barrel to export `LifecycleManager`, `createSnapshot`, `createSignature`, `verifySignature`.

## 8. Testing Strategy

- Follow `.agents/rules/testing-vitest.md`: Arrange-Act-Assert, `vi.mock` boundaries (Octokit, filesystem), no real GitHub calls.
- Coverage >90% (repo threshold 100% lines/branches/functions/statements).
- Fixtures: `createStep`, `createSnapshot` factories.
- Mock `HUB_MASON_SHARED_SECRET` via `vi.stubEnv`.
- Test vectors for HMAC `requestId.issuedAt` payload (known secret/payload/hex), clock injection, `timingSafeEqual` length mismatch.

## 9. Risks & Mitigations

- Input size limit: snapshot JSON may exceed dispatch limit if many steps/details — mitigate truncate `details` or gzip+base64 (add `compress` helper).
- HMAC secret rotation: support `HUB_MASON_SHARED_SECRET` comma-separated list, verify against any.
- Clock skew: engine and portal clocks may differ — 30m window generous, use `issuedAt` from portal not engine now.
- Forward compat: `v` field + zod `passthrough` for unknown fields, hydrate migrates `v=1->2`.
- Breaking import paths: shim `src/workflow/*` avoids immediate break.

## 10. Open / Resolved

- [x] Transport via `workflow_dispatch` `context` input.
- [x] HMAC with shared secret, 30m skew, no dedup store.
- [x] Embed config, preserve timestamps.
- [x] Folder `lifecycle`.
- [x] Resume `in_progress` take-over, `failed` abort.

## 11. Next Actions

- Approve this plan document (this file).
- Switch to build mode, execute Phase 0-2 in order, PR with `feat(lifecycle): generic handoff` and tests.
