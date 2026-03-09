# tabstack — OpenClaw Skill

An [OpenClaw](https://docs.openclaw.ai/) skill that gives your agent web
browsing, data extraction, content transformation, web research, and browser
automation capabilities via the [Tabstack API](https://docs.tabstack.ai/).

Also works with [nanobot](https://github.com/HKUDS/nanobot) and other
frameworks that use the OpenClaw skill format.

Uses `@tabstack/sdk` v2.

## What It Does

| Command            | Purpose                                  | Cost    | Timeout |
|--------------------|------------------------------------------|---------|---------|
| `extract-markdown` | Read a page or PDF as clean Markdown     | Lowest  | 60s     |
| `extract-json`     | Pull structured data from a page or PDF  | Medium  | 60s     |
| `generate`         | AI-transform web/PDF content into JSON   | Medium  | 60s     |
| `research`         | AI-powered multi-source web research     | Medium  | 420s    |
| `automate`         | Multi-step browser automation            | Highest | 420s    |

All commands support `--geo CC` for region-specific content (ISO country code).

The `automate` command also supports `--guardrails` (safety constraints) and
`--data` (JSON context for form filling).

JSON arguments (schemas, --data) can be passed inline or as a file path
prefixed with `@` (e.g. `@/tmp/schema.json`).

## Requirements

- [OpenClaw](https://docs.openclaw.ai/) gateway running (or compatible framework)
- Node.js >= 20 (available inside the OpenClaw container)
- A [Tabstack API key](https://tabstack.ai)

## Install from Source

Copy the skill files into your OpenClaw workspace:

```bash
mkdir -p ~/.openclaw/workspace/skills/tabstack
cp SKILL.md tabstack.ts package.json package-lock.json ~/.openclaw/workspace/skills/tabstack/
cp -r references ~/.openclaw/workspace/skills/tabstack/
cd ~/.openclaw/workspace/skills/tabstack && npm install
```

Set your API key:

```bash
openclaw config set env.TABSTACK_API_KEY "your-key-here"
```

Restart the gateway to pick up the new skill.

## Install from .skill File

```bash
mkdir -p ~/.openclaw/workspace/skills/tabstack
unzip tabstack.skill -d ~/.openclaw/workspace/skills/tabstack/
cd ~/.openclaw/workspace/skills/tabstack && npm install
openclaw config set env.TABSTACK_API_KEY "your-key-here"
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
that can be shared with other OpenClaw users.

Install locally:

```bash
make install
```

## How It Works

1. OpenClaw discovers `SKILL.md` in the workspace skills directory
2. The skill's `description` tells the agent when to use it
3. When triggered, the agent reads SKILL.md for instructions
4. The agent runs `npx tsx ./tabstack.ts <command>` via the `exec` tool
5. The CLI wrapper calls the Tabstack API and returns results to stdout

## Skill Files

```
SKILL.md              — Skill definition and agent instructions
tabstack.ts           — CLI wrapper for the Tabstack SDK (v2)
package.json          — Dependencies (@tabstack/sdk ^2.2.0, tsx)
references/
  examples.md         — JSON schema patterns and generate recipes
```

## Repository Files

```
Makefile              — validate, package, install targets
validate_skill.py     — Skill structure validator (from OpenClaw)
README.md             — This file
LICENSE               — MIT
```
