# Spec: Rework the `tabstack` skill for the official `tabstack` CLI

**Date:** 2026-06-12
**Repo:** `tabstack-openclaw`

## Problem

The `tabstack` OpenClaw skill currently wraps the `@tabstack/sdk` Node package
through a hand-written TypeScript CLI (`scripts/tabstack.ts`), invoked via
`scripts/run.sh` (`npx tsx ...`). This requires `node`/`npx` in the container
and an `npm install` bootstrap on first use.

A separate, official Go CLI (`tabstack`, from the `tabstack-cli` repo) now
exists: a single self-contained binary with a Cobra command tree, scriptable
exit codes, and pretty/JSON output. We want to retire the vibe-coded TypeScript
wrapper and rewrite the skill to drive the official CLI instead.

A second goal: the original skill under-sold the cheap, high-value
`extract`/`generate` operations and over-steered agents toward `research`/
`automate`. The rewrite should actively steer agents toward extract/generate
for reading and structured-data tasks.

## Goals

- Drive the official `tabstack` CLI directly; remove all Node/npm/`tsx`
  machinery.
- Map the old command surface onto the new one accurately (positionals →
  flags, renamed subcommands).
- Document the genuinely-new capabilities: `--effort`, `agent input`, and the
  minor tuning flags.
- Correct stale facts (geo support, mode values).
- Restructure SKILL.md to lead with and encourage `extract`/`generate`.

## Non-goals

- No change to the `tabstack-cli` Go project itself.
- No new skill capabilities beyond what the CLI already exposes.
- Not generalizing away from the OpenClaw format — the repo keeps its OpenClaw
  identity (slimmed `metadata.openclaw` block retained as a preflight hint;
  other runtimes ignore unknown frontmatter).

## Command surface mapping

| Old (`run.sh ...`) | New (`tabstack ...`) | Notes |
|---|---|---|
| `extract-markdown <url>` | `extract markdown <url>` | gains `--effort` |
| `extract-json <url> [@schema]` | `extract json <url> --schema <s>` | schema now a **required** flag |
| `generate <url> <schema> <instr>` | `generate json <url> --instructions <i> --schema <s>` | both now flags, both required |
| `research <query>` | `agent research <query>` | `--mode fast\|balanced`; **no** `--geo`; adds `--fetch-timeout`, `--nocache` |
| `automate <task>` | `agent automate <task>` | **gains** `--geo`; adds `--max-validation-attempts` |
| — | `agent input <request-id> --data <d>` | **new** — resume/cancel a paused automation |

Shared flags: `--schema`/`--instructions`/`--data` accept literal, `@file`, or
`-` (stdin). `--effort min|standard|max` on extract + generate. `--geo CC`
on extract/generate/**automate** (not research).

### Stale facts to correct (from the old SKILL.md)

- automate **does** support `--geo` now (old skill said it did not).
- research does **not** support `--geo` (old skill claimed it did).
- research `--mode` values are `fast|balanced` (unchanged; verify wording).

## File-level changes

**Delete** (Node wrapper machinery):
- `scripts/tabstack.ts`
- `scripts/run.sh`
- `scripts/` directory (removed wholesale — no helper replaces it)
- `package.json`
- `package-lock.json`
- `node_modules/` (untracked; ensure gone from packaging)

**Rewrite:**
- `SKILL.md` — new command surface, direct `tabstack` invocation, Setup
  section, reordered operations, extract/generate steering, exit-code table.

**Update:**
- `README.md` — drop the SDK/npm/`tsx` story; describe binary install + setup;
  install-from-source and `.skill` instructions copy only `SKILL.md` +
  `references/`.
- `Makefile` — `SKILL_FILES := SKILL.md references/`; `install` target drops
  the `npm install` step; `package`/`validate` otherwise unchanged.
- `references/examples.md` — keep (schemas still valid); expand with more
  extract/generate use cases.
- `tabstack.skill` — regenerate via `make package` after the above.

**Metadata block** (in SKILL.md frontmatter) slims to:
```
metadata: {"openclaw":{"requires":{"env":["TABSTACK_API_KEY"],"bins":["tabstack"]},"primaryEnv":"TABSTACK_API_KEY"}}
```

## SKILL.md structure (new)

Ordered to lead with the cheap reading/extraction operations:

1. **Title + intro** — one paragraph on what Tabstack does.
2. **Setup (first use only)** — install the `tabstack` binary
   (prebuilt release download / `go install` / build from source), then
   `openclaw config set env.TABSTACK_API_KEY "your-key"`. No npm. Note the
   skill errors out if the key is unset.
3. **Invocation** — call `tabstack` directly (no `cd`, no wrapper). JSON
   arguments inline or `@file`/`-`. Run in the **foreground**. Agent commands
   (research/automate) stream and can take 60–120s — use ≥420s exec timeout.
   **Output mode:** under `exec` there is no TTY, so the CLI defaults to JSON
   (and streaming commands emit NDJSON). For `extract markdown`, pass
   `-o pretty` to get clean Markdown to read; the JSON/generate endpoints are
   already JSON, so the default is fine and parseable. Document this so the
   agent isn't surprised by JSON-wrapped Markdown.
4. **Operations**, in this order:
   1. `extract markdown` — lead; cheapest; the default for read/summarize.
   2. `extract json` — structured data, with `--schema`; inline use cases.
   3. `generate json` — AI-transformed JSON, `--instructions` + `--schema`.
   4. `agent research` — multi-source cited research.
   5. `agent automate` — browser automation; **`agent input`** documented as a
      sub-step for paused (human-in-the-loop) automations.
   Each op lists its real flags including `--effort`, corrected `--geo`,
   `--max-iterations`/`--max-validation-attempts`/`--fetch-timeout`.
5. **Choosing the right operation** — table re-weighted to push
   extract/generate first; explicit cue: *if you just need to read or pull
   data from a known URL, use extract/generate — do not reach for
   research/automate.*
6. **Error handling** — add the CLI **exit codes** (0 success, 1 runtime/
   network, 2 usage/invalid input, 3 API error or in-band task failure)
   alongside the existing HTTP-meaning table. Keep the automate-retry-once /
   fall-back-to-extract-markdown guidance.
7. **Security & privacy** — update: binary install (not npm SDK); same
   data-sent-to-Tabstack and `--guardrails` caveats; no persistence.

## Extract/generate steering (the substantive content change)

- Frame `extract markdown` up front as the **default** for any read/summarize/
  "what does this page say" request — cheaper and faster than `research`.
- Give `extract json` concrete inline use cases: prices, product specs,
  comparison tables, search-result lists, contact/directory data.
- Give `generate json` inline use cases: summaries, categorization, sentiment,
  content digests.
- Add a decision cue in "Choosing the right operation": prefer extract/generate
  whenever the URL is known and the task is read-or-extract.

## Testing / verification

- `make validate` passes (frontmatter rules).
- `make package` produces a `tabstack.skill` containing only `SKILL.md` +
  `references/` (no `scripts/`, no `package*.json`, no `node_modules`).
- Manual: spot-check that every command line in SKILL.md matches the real CLI
  flag names (`tabstack <cmd> --help`).
- Grep the rewritten SKILL.md/README for residual `npx`, `run.sh`, `tsx`,
  `@tabstack/sdk`, `npm install` references — should be none.

## Risks / open questions

- Binary delivery is now the container operator's responsibility (assume on
  PATH). The `metadata.openclaw.requires.bins:["tabstack"]` hint lets OpenClaw
  warn pre-flight, but does not install anything. Documented in Setup.
- `tabstack.skill` is a committed build artifact; it must be regenerated or it
  will drift from source. Regenerate as the final step.
