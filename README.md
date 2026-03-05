# tabstack — OpenClaw Skill

An [OpenClaw](https://docs.openclaw.ai/) skill that gives your agent web
browsing, data extraction, content transformation, web research, and browser
automation capabilities via the [Tabstack API](https://docs.tabstack.ai/).

Uses `@tabstack/sdk` v2.

## What It Does

| Command            | Purpose                                  | Cost    | Timeout |
|--------------------|------------------------------------------|---------|---------|
| `extract-markdown` | Read a page as clean Markdown            | Lowest  | 60s     |
| `extract-json`     | Pull structured data from a page         | Medium  | 60s     |
| `generate`         | AI-transform web content into JSON shape | Medium  | 60s     |
| `research`         | AI-powered multi-source web research     | Medium  | 420s    |
| `automate`         | Multi-step browser automation            | Highest | 420s    |

All commands support `--geo CC` for region-specific content (ISO country code).

The `automate` command also supports `--guardrails` (safety constraints) and
`--data` (JSON context for form filling).

## Requirements

- [OpenClaw](https://docs.openclaw.ai/) gateway running
- Node.js >= 20 (available inside the OpenClaw container)
- A [Tabstack API key](https://tabstack.ai)

## Install

Copy the `tabstack/` directory into your OpenClaw workspace:

```bash
cp -r tabstack/ ~/.openclaw/workspace/skills/tabstack/
cd ~/.openclaw/workspace/skills/tabstack && npm install
```

Set your API key:

```bash
openclaw config set env.TABSTACK_API_KEY "your-key-here"
```

Restart the gateway to pick up the new skill.

## Install from .skill File

```bash
unzip tabstack.skill -d ~/.openclaw/workspace/skills/
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

This creates `tabstack.skill` (a zip archive) that can be shared with other
OpenClaw users.

## How It Works

1. OpenClaw discovers `SKILL.md` in the workspace skills directory
2. The skill's `description` tells the agent when to use it
3. When triggered, the agent reads SKILL.md for instructions
4. The agent runs `npx tsx ./tabstack.ts <command>` via the `exec` tool
5. The CLI wrapper calls the Tabstack API and returns results to stdout

## Files

```
tabstack/
├── SKILL.md              — Skill definition and agent instructions
├── tabstack.ts           — CLI wrapper for the Tabstack SDK (v2)
├── package.json          — Dependencies (@tabstack/sdk ^2.2.0, tsx)
└── references/
    └── examples.md       — JSON schema patterns and generate recipes
```
