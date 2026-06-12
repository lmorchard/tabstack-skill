# Tabstack Skill Rewrite (Official CLI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the `tabstack` OpenClaw skill to drive the official standalone `tabstack` Go binary directly, retiring the `@tabstack/sdk` TypeScript wrapper.

**Architecture:** SKILL.md calls `tabstack` directly (assume on PATH, no wrapper). All Node/npm/`tsx` machinery is deleted. The skill stays OpenClaw-format-compatible (slimmed `metadata.openclaw` block). Content is restructured to lead with and encourage `extract`/`generate`.

**Tech Stack:** Markdown (SKILL.md, README, examples), Make + zip packaging, Python frontmatter validator (`validate_skill.py`).

**Working dir:** `tabstack-openclaw` repo, branch `rewrite-skill-for-official-cli` (already created; spec already committed there).

**Verification model (no unit tests):** `make validate` (frontmatter), `make package` (archive contents), and `grep` for residual `npx`/`tsx`/`run.sh`/`@tabstack/sdk`/`npm install`.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `SKILL.md` | Rewrite | Agent-facing instructions: setup, invocation, operations, choosing, errors, security |
| `scripts/tabstack.ts` | Delete | Old SDK wrapper |
| `scripts/run.sh` | Delete | Old entry point |
| `scripts/` | Delete (dir) | No replacement |
| `package.json` | Delete | npm deps |
| `package-lock.json` | Delete | npm lockfile |
| `Makefile` | Modify | `SKILL_FILES` + `install` target |
| `README.md` | Modify | Human-facing: install/setup/packaging story |
| `references/examples.md` | Modify | Add extract/generate use cases |
| `tabstack.skill` | Regenerate | Build artifact (`make package`) |

---

## Reference: exact CLI command lines (verbatim — the load-bearing content)

These are the real flag names verified against `tabstack-cli`. Use them exactly in SKILL.md.

```bash
# Read a page/PDF as Markdown (lead operation, cheapest)
tabstack extract markdown <url> -o pretty            # -o pretty = clean Markdown; default JSON wraps it in .content
tabstack extract markdown <url> --metadata --effort min --geo US --nocache

# Structured data from a page/PDF (schema is a required flag)
tabstack extract json <url> --schema @schema.json
tabstack extract json <url> --schema '{"type":"object","properties":{"title":{"type":"string"}}}' --effort standard --geo GB --nocache

# AI-transform page/PDF content into a custom JSON shape (instructions + schema both required)
tabstack generate json <url> --instructions "Summarise and list key points" --schema @schema.json --effort max --geo US --nocache

# Multi-source cited research (NO --geo)
tabstack agent research "<query>" --mode fast            # fast | balanced
tabstack agent research "<query>" --mode balanced --fetch-timeout 30 --nocache

# Browser automation (HAS --geo)
tabstack agent automate "<task>" --url <url>
tabstack agent automate "<task>" --url <url> --data '{"name":"Alex"}' --guardrails "browse only, don't submit forms" --max-iterations 50 --max-validation-attempts 3 --geo US
tabstack agent automate "Find the current price of a MacBook Air M4"   # no --url: uses built-in web search

# Resume or cancel an automation that paused asking for input
tabstack agent input <request-id> --data '{"fields":[{"ref":"field1","value":"yes"}]}'
tabstack agent input <request-id> --data '{"cancelled":true}'
```

Shared: `--schema`/`--instructions`/`--data` accept literal, `@file`, or `-` (stdin). `--effort min|standard|max` on extract/generate. Exit codes: `0` success, `1` runtime/network, `2` usage/invalid input, `3` API error or in-band task failure.

---

## Task 1: Rewrite SKILL.md

**Files:**
- Modify: `SKILL.md`

- [ ] **Step 1: Replace the frontmatter metadata block**

Keep `name: tabstack` and the existing `description` (it's good and trigger-rich; verify it stays under 1024 chars and has no `<`/`>`). Replace the metadata line with:

```
metadata: {"openclaw":{"requires":{"env":["TABSTACK_API_KEY"],"bins":["tabstack"]},"primaryEnv":"TABSTACK_API_KEY"}}
```

- [ ] **Step 2: Rewrite the Setup section**

Replace the npm-install setup with binary install + key config:

```markdown
## Setup (first use only)

This skill drives the `tabstack` CLI — a single standalone binary. Ensure it is
installed and on your PATH:

- **Prebuilt binary:** download for your platform from
  https://github.com/Mozilla-Ocho/tabstack-cli/releases and place it on PATH.
- **Go developers:** `go install github.com/Mozilla-Ocho/tabstack-cli/cmd/tabstack@latest`
- **From source:** `git clone https://github.com/Mozilla-Ocho/tabstack-cli && cd tabstack-cli && make install-local`

Verify: `tabstack --version`

Set your API key (the skill exits with an error if it is unset):

​```bash
openclaw config set env.TABSTACK_API_KEY "your-key-here"
​```
```

- [ ] **Step 3: Rewrite the Invocation / conventions section**

Cover: call `tabstack` directly (no `cd`, no wrapper script); run in the **foreground**; JSON args inline or `@file`/`-`; **output mode** note (no TTY under `exec` → defaults to JSON, streaming → NDJSON; use `-o pretty` for clean Markdown from `extract markdown`; JSON/generate endpoints are already JSON and parseable); agent commands (research/automate) can take 60–120s, use ≥420s exec timeout.

- [ ] **Step 4: Rewrite the Operations section, reordered to lead with extract/generate**

Order and emphasis:
1. `extract markdown` — **lead**; frame as the default for any "read / summarize / tell me about / what does this page say" request; cheapest and fastest; use `-o pretty`. Flags: `--metadata`, `--effort`, `--geo`, `--nocache`.
2. `extract json` — structured data via `--schema`; **inline use cases**: prices, product specs, comparison tables, search-result lists, contact/directory data; point to `references/examples.md` for schema patterns. Flags: `--schema` (required), `--effort`, `--geo`, `--nocache`.
3. `generate json` — AI-transformed JSON via `--instructions` + `--schema`; **inline use cases**: summaries, categorization, sentiment, content digests. Flags: both required, `--effort`, `--geo`, `--nocache`.
4. `agent research` — multi-source cited research; `--mode fast|balanced`; `--fetch-timeout`, `--nocache`; **no `--geo`**.
5. `agent automate` — browser automation; `--url`, `--data`, `--guardrails`, `--max-iterations`, `--max-validation-attempts`, **`--geo`**; without `--url` uses built-in web search. Then document **`agent input <request-id>`** as a sub-step: when an automation pauses asking for human input, supply field values with `--data '{"fields":[...]}'` or decline with `--data '{"cancelled":true}'`.

Use the verbatim command lines from the Reference section above.

- [ ] **Step 5: Rewrite "Choosing the right operation"**

Re-weight the table to push extract/generate first (lead rows), keep the cost/timeout columns, and add an explicit decision cue:

> If the URL is known and you just need to **read** or **pull data** from it, use `extract markdown` / `extract json` / `generate json` — do **not** reach for `research` or `automate`. Use `research` for open-ended multi-source questions and `automate` only when the task needs clicking, navigating, or form interaction.

- [ ] **Step 6: Update Error handling**

Keep the HTTP-meaning table (401/422/400/no-output) and the "retry automate once, then fall back to `extract markdown`" guidance. Add the CLI exit-code table:

```markdown
| Exit code | Meaning |
|-----------|---------|
| 0 | success |
| 1 | runtime / network error |
| 2 | usage / invalid input |
| 3 | API error or in-band task failure |
```

- [ ] **Step 7: Update Security & privacy + Environment sections**

Replace "installs `@tabstack/sdk` and `tsx` from npm" with: the skill invokes the `tabstack` binary (installed per Setup). Keep: API key from env, data-sent-to-Tabstack caveats (don't pass secrets via `--data`), `--guardrails` for automate, no persistence.

- [ ] **Step 8: Validate frontmatter**

Run: `make validate`
Expected: `Skill is valid!`

- [ ] **Step 9: Grep for residual Node references in SKILL.md**

Run: `grep -nE 'npx|tsx|run\.sh|@tabstack/sdk|npm install|scripts/' SKILL.md`
Expected: no matches.

- [ ] **Step 10: Commit**

```bash
git add SKILL.md
git commit -m "feat: rewrite SKILL.md to drive the official tabstack CLI"
```

---

## Task 2: Delete Node machinery and fix the Makefile

**Files:**
- Delete: `scripts/tabstack.ts`, `scripts/run.sh`, `scripts/` (dir), `package.json`, `package-lock.json`
- Modify: `Makefile`

- [ ] **Step 1: Remove the Node files**

```bash
git rm scripts/tabstack.ts scripts/run.sh package.json package-lock.json
rm -rf scripts node_modules
```

- [ ] **Step 2: Update `SKILL_FILES` in Makefile**

Change line 2 from:
```make
SKILL_FILES := SKILL.md package.json package-lock.json references/ scripts/
```
to:
```make
SKILL_FILES := SKILL.md references/
```

- [ ] **Step 3: Drop the npm-install step from the `install` target**

Remove the final line of the `install` target:
```make
	cd ~/.openclaw/workspace/skills/$(SKILL_NAME) && npm install
```
so `install` ends after the `unzip` line.

- [ ] **Step 4: Validate still passes**

Run: `make validate`
Expected: `Skill is valid!`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove @tabstack/sdk wrapper and npm machinery"
```

---

## Task 3: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite the intro / "Uses @tabstack/sdk v2" line**

Drop the SDK reference. State the skill drives the official `tabstack` CLI (single Go binary).

- [ ] **Step 2: Replace Requirements**

Remove "Node.js >= 20" and the SDK note. Require: the `tabstack` CLI on PATH (link to tabstack-cli releases / `go install` / build from source) and a Tabstack API key.

- [ ] **Step 3: Fix Install-from-source and Install-from-.skill blocks**

Both currently copy `package.json package-lock.json scripts/` and run `npm install`. Change to copy only `SKILL.md` and `references/`, and drop the `npm install` line. Keep the `openclaw config set env.TABSTACK_API_KEY` step.

- [ ] **Step 4: Fix the "Skill Files" and "How It Works" sections**

Update the file tree to drop `package.json`/`scripts/` and reflect: `SKILL.md` + `references/examples.md` only. In "How It Works", replace step 4/5 ("calls `scripts/run.sh` … runs the Tabstack SDK CLI") with: the agent calls `tabstack <command>` directly via the exec tool.

- [ ] **Step 5: Grep README for residual Node references**

Run: `grep -nE 'npx|tsx|run\.sh|@tabstack/sdk|npm install|package\.json|Node\.js' README.md`
Expected: no matches (or only intentional historical mentions — there should be none).

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: update README for the official tabstack CLI"
```

---

## Task 4: Expand references/examples.md with extract/generate use cases

**Files:**
- Modify: `references/examples.md`

- [ ] **Step 1: Add a short "When to use extract-json vs generate" framing paragraph at the top**

Clarify: `extract json` pulls data that already exists on the page (prices, tables, listings); `generate json` creates new content from the page (summaries, classifications, digests).

- [ ] **Step 2: Add 1–2 more extract-json schema examples**

Add a **search-results / link list** schema and an **invoice / receipt** schema (fields: vendor, date, line_items[], total, currency) alongside the existing article/product/table/event/contact schemas.

- [ ] **Step 3: Keep the existing generate instruction recipes**

They are still valid. Optionally add one "translate / localize" recipe. No command-syntax changes needed (examples are schema/instruction content, transport-agnostic).

- [ ] **Step 4: Commit**

```bash
git add references/examples.md
git commit -m "docs: expand examples with more extract/generate use cases"
```

---

## Task 5: Regenerate the .skill artifact and final verification

**Files:**
- Regenerate: `tabstack.skill`

- [ ] **Step 1: Package**

Run: `make package`
Expected: `Skill is valid!` then a fresh `tabstack.skill`.

- [ ] **Step 2: Verify archive contents**

Run: `unzip -l tabstack.skill`
Expected: contains `SKILL.md` and `references/examples.md` only — **no** `scripts/`, `package.json`, `package-lock.json`, or `node_modules`.

- [ ] **Step 3: Repo-wide grep for residual Node references**

Run: `grep -rnE 'npx|tsx|@tabstack/sdk|npm install|run\.sh' --include='*.md' --include='Makefile' . | grep -v docs/superpowers/`
Expected: no matches.

- [ ] **Step 4: Commit the regenerated artifact**

```bash
git add tabstack.skill
git commit -m "build: regenerate tabstack.skill"
```

---

## Self-review notes

- **Spec coverage:** Setup/invocation/operations/choosing/errors/security → Task 1; file deletions + Makefile → Task 2; README → Task 3; examples expansion → Task 4; packaging + grep verification → Task 5. All spec sections covered.
- **Stale-fact corrections** (automate gains `--geo`, research loses it; `--mode fast|balanced`) are baked into Task 1 Steps 4 and the verbatim Reference block.
- **New capabilities** (`--effort`, `agent input`, `--max-validation-attempts`, `--fetch-timeout`) all appear in Task 1 Step 4 / Reference block.
