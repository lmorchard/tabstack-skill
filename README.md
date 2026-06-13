# tabstack — Agent Skill

A portable [agent skill](https://code.claude.com/docs/en/skills) (the
`SKILL.md` format) that gives your agent web browsing, data extraction, content
transformation, web research, and browser automation via the
[Tabstack API](https://docs.tabstack.ai/).

Works with any runtime that reads the `SKILL.md` format — including
[Claude Code](https://code.claude.com/docs/en/skills),
[OpenClaw](https://docs.openclaw.ai/),
[nanobot](https://github.com/HKUDS/nanobot), and
[Hermes](https://hermes-agent.nousresearch.com/).

The skill drives the official [`tabstack` CLI](https://github.com/Mozilla-Ocho/tabstack-cli)
— a single standalone Go binary — by shelling out to it directly.

## What It Does

| Command                 | Purpose                                     | Cost    | Timeout |
|-------------------------|---------------------------------------------|---------|---------|
| `extract markdown`      | Read a page or PDF as clean Markdown        | Lowest  | 60s     |
| `extract json`          | Pull structured data from a page or PDF     | Medium  | 60s     |
| `generate json`         | AI-transform web/PDF content into JSON      | Medium  | 60s     |
| `agent research`        | AI-powered multi-source web research        | Medium  | 420s    |
| `agent automate`        | Multi-step browser automation or web search | Highest | 420s    |

The extract, generate, and `agent automate` commands support `--geo CC` for
region-specific content; `agent research` does not. Extract and generate also
take `--effort min|standard|max` to trade cost against thoroughness.

The `agent automate` command supports `--guardrails` (safety constraints) and
`--data` (JSON context for form filling). When called without `--url`, it
uses built-in web search — useful for simple factual lookups. A paused
automation can be resumed or cancelled with `agent input <request-id>`.

JSON arguments (schemas, --data) can be passed inline or as a file path
prefixed with `@` (e.g. `@/tmp/schema.json`).

## Requirements

- A `SKILL.md`-compatible agent runtime (e.g. Claude Code, OpenClaw, nanobot, Hermes)
- The [`tabstack` CLI](https://github.com/Mozilla-Ocho/tabstack-cli) installed
  and on the agent's PATH (prebuilt binary, `go install`, or build from source)
- A [Tabstack API key](https://tabstack.ai)

## Install Location

Each runtime has its own skills directory — drop the skill into the one your
runtime scans. Common locations:

- **Claude Code:** `~/.claude/skills/tabstack/`
- **OpenClaw:** `~/.openclaw/workspace/skills/tabstack/` (per-agent workbench,
  highest priority) or `~/.openclaw/skills/tabstack/` (shared, used by
  `clawhub install`)

The examples below use `$SKILLS_DIR` — set it to your runtime's path, e.g.
`export SKILLS_DIR=~/.claude/skills`.

## Install from Source

Copy the skill files into your runtime's skills directory:

```bash
mkdir -p "$SKILLS_DIR/tabstack"
cp -r SKILL.md references/ "$SKILLS_DIR/tabstack/"
```

Make sure the `tabstack` CLI is installed and on PATH (see
[Requirements](#requirements)), then set your API key — see
[the SKILL.md Setup section](SKILL.md) for the options (`tabstack auth login`,
`TABSTACK_API_KEY`, or a runtime-specific mechanism). Reload/restart your
runtime so it picks up the new skill.

## Install from .skill File

```bash
mkdir -p "$SKILLS_DIR/tabstack"
unzip tabstack.skill -d "$SKILLS_DIR/tabstack/"
```

## Development

Validate the skill structure:

```bash
make validate
```

Package for distribution:

```bash
make package
```

This creates `tabstack.skill` (a zip archive containing only the skill files)
that can be shared with other users.

Install locally (defaults to the OpenClaw workspace; override `SKILLS_DIR` for
another runtime):

```bash
make install                              # ~/.openclaw/workspace/skills/tabstack
make install SKILLS_DIR=~/.claude/skills  # Claude Code
```

## How It Works

1. Your agent runtime discovers `SKILL.md` in its skills directory
2. The skill's `description` tells the agent when to use it
3. When triggered, the agent reads SKILL.md for instructions
4. The agent calls `tabstack <command>` directly via the `exec` tool
5. The `tabstack` CLI talks to the Tabstack API and returns results to stdout

## Skill Files

```
SKILL.md              — Skill definition and agent instructions
references/
  examples.md         — JSON schema patterns and generate recipes
```

The agent invokes the `tabstack` CLI directly; the skill ships no wrapper
code or dependencies of its own.

## Repository Files

```
Makefile              — validate, package, install targets
validate_skill.py     — SKILL.md frontmatter validator
README.md             — This file
LICENSE               — MIT
```
