---
name: explain
description: >
  Explain any code, concept, error, architecture, or question in full detail with examples and
  diagrams when helpful. Use when user invokes /explain, asks to explain, describe how something
  works, why something happens, walk through code, or asks what/why/how about current project,
  another project, or general knowledge. Read-only explainer that suspends terse modes like caveman.
compatibility: opencode
metadata:
    audience: developers
    workflow: explain
---

# Explain Skill

Answer the user's question with a thorough, clear explanation. Make no changes.

`/explain` is a thin wrapper around this skill. When `/explain` is invoked, invoke this skill
and follow its instructions exactly.

## Hard Rules

1. Read-only. NEVER edit, write, delete, commit, push, install, run mutations, or change
   configuration. Do not use `edit`, `write`, or mutating `bash` commands. Allowed tools:
   `read`, `glob`, `grep`, `webfetch`, `websearch`, and read-only `bash` (e.g. `ls`, `git status`,
   `git log`) only for inspection.
2. Temporarily suspend token-saving styles. Ignore `.agents/rules/caveman.md` and any active
   `caveman` skill level (`lite`, `full`, `ultra`, `wenyan-*`) for the duration of the answer.
   Use full sentences, complete explanations, and normal detailed prose. Do not compress,
   abbreviate, or use fragments. Resume prior style only after the explanation is done.
3. Never announce the mode switch. Just answer in full detail.
4. Base every claim on evidence. Inspect local files before asserting project behavior.
5. Preserve code, identifiers, API names, CLI commands, and error strings exactly as found.

## Workflow

### 1. Capture the query

- The command wrapper passes the query as `$ARGUMENTS`. If empty, ask what to explain and STOP
  until the user replies.

### 2. Classify scope

Decide where the answer lives:

- **Current project:** query mentions a local file, symbol, error, test, config, or behavior
  observable in this workspace.
- **Another project / external:** query names a different repo, library, framework, service,
  version, or URL outside this workspace.
- **General knowledge:** concepts, algorithms, protocols, language features, interview topics
  with no repo tie-in.

A query can span scopes (e.g. "how does our auth differ from standard OAuth2"). Cover each
relevant scope.

### 3. Gather local evidence (current project)

If scope is current project or ambiguous:

1. Locate candidates with `glob` and `grep` (file names, symbol definitions, error strings).
2. `read` the defining files in full enough to explain correctly: implementation, callers,
   tests, config, related docs.
3. Check recent history only if behavior is unclear (`git log --oneline -10`,
   `git status` read-only).
4. Do not paste whole large files into the answer. Quote only the decisive snippet with
   `file_path:line_number` references.

If nothing relevant exists locally, state that explicitly and fall through to general /
external explanation.

### 4. Research externally when required

Do web research when any of these hold:

- Query is about another project, library version, SaaS, or fast-moving ecosystem.
- Local evidence is missing or insufficient.
- Answer depends on behavior beyond knowledge cutoff (current year is 2026 — search with
  2026-qualified queries for recent topics).
- User explicitly asks for docs, best practices, or comparisons.

Use `websearch` first, then `webfetch` the most relevant URLs. Prefer official docs and
source repos. If a fetch redirects, follow the redirect URL.

### 5. Answer

Structure from simple to deep:

1. **Direct answer:** 2-4 sentences that resolve the query without requiring further reading.
2. **How it works:** step-by-step mechanism, control flow, data flow, key files/symbols with
   `file_path:line_number` links for local code.
3. **Example:** minimal runnable code sample when it clarifies. Keep it copy-pasteable and
   consistent with repo conventions.
4. **Diagram:** add only when structure, flow, lifecycle, or architecture is easier to grasp
   visually. Prefer a short `mermaid` code block (flowchart / sequence). Fall back to a small
   ASCII diagram only if mermaid cannot express it.
5. **Edge cases / gotchas:** common misunderstandings, failure modes, version differences.
6. **Sources:** list local files inspected plus external URLs fetched, so the answer is
   verifiable.

Adjust depth to the query: a "what is X" gets definition + example; a "why does X fail"
gets cause + evidence + fix direction (describe the fix, do not apply it).

## Output Guidelines

- Full prose. Complete sentences. No caveman fragments.
- Headings, short paragraphs, bullets where they aid scanning.
- Code blocks unchanged and syntactically valid. Normal comments inside code are fine.
- Keep examples minimal. One good example beats three redundant ones.
- If the query was ambiguous, state the interpretation used and offer one follow-up
  (e.g. "Want a deeper walkthrough of file X?").

## Boundaries

- Explain only. If the user wants a fix, feature, refactor, commit, or PR, STOP and ask
  whether to switch out of `/explain` mode — never start mutating unprompted.
- Security warnings, destructive-operation explanations, and multi-step sequences stay in
  full prose (no compression) even if caveman resumes afterward.
- If no query and no context can be found, ask for clarification instead of guessing.
