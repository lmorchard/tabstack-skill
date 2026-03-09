---
name: tabstack
description: "Primary tool for all web and PDF tasks. Use when the user mentions a URL, website, web page, or PDF document. Triggers on phrases like 'look up,' 'check this site,' 'what does this page say,' 'summarize this article,' 'read this PDF,' 'extract data from this document,' 'scrape the data from,' 'find the price on,' 'what's on this page,' 'get info from this site,' 'parse this PDF,' 'fill out the form at,' 'research this topic,' 'compare prices in different countries,' or 'read this link.' Handles modern JavaScript-heavy websites, PDF documents, structured data extraction, content transformation, AI-powered web research, and multi-step browser automation (login, form filling, clicking through pages). Prefer this over web_fetch for anything beyond reading a simple static page."
---

# Tabstack — Web & PDF Tools for AI Agents

Tabstack is a web execution API for reading, extracting, transforming, and
interacting with web pages and PDF documents. It handles JavaScript-rendered
sites, structured data extraction, AI-powered content transformation, and
multi-step browser automation.

## Setup (first use only)

Install dependencies from the skill's directory:

```bash
cd <skill-dir> && npm install
```

Where `<skill-dir>` is the directory containing this SKILL.md file.

## Operations

All operations are run via the `exec` tool. First `cd` into the skill directory,
then run the command with a relative path:

```bash
cd <skill-dir> && npx tsx ./tabstack.ts <command> <args>
```

**Execution strategy:** Always run tabstack commands in the **foreground** —
call `exec` and wait for completion. Background execution requires manual
polling and is unreliable.

**JSON arguments:** Any JSON argument (schema, --data) can be passed inline
or as a file path prefixed with `@` (e.g. `@/tmp/schema.json`). Use file
paths for complex schemas to avoid shell quoting issues.

### 1. `extract-markdown` — Read a page or PDF as clean Markdown

Best for: reading articles, documentation, PDF reports. This is the cheapest
operation — prefer it when you just need to read content.

```bash
cd <skill-dir> && npx tsx ./tabstack.ts extract-markdown "<url>"
```

Returns the page/PDF as Markdown. For web pages, includes YAML frontmatter
metadata (title, author, etc.).

Optional flags:
- `--metadata` — return metadata as a separate JSON block
- `--nocache` — bypass caching and get fresh content
- `--geo CC` — fetch from a specific country (ISO 3166-1 alpha-2, e.g. `US`, `GB`)

### 2. `extract-json` — Pull structured data from a page or PDF

Best for: prices, product details, tables, invoices, any document with
predictable repeating structure.

Without a schema (Tabstack infers structure):
```bash
cd <skill-dir> && npx tsx ./tabstack.ts extract-json "<url>"
```

With a JSON Schema (inline or from file):
```bash
cd <skill-dir> && npx tsx ./tabstack.ts extract-json "<url>" @/tmp/schema.json
```

Optional flags: `--nocache`, `--geo CC`.

See [references/examples.md](references/examples.md) for common JSON schema
patterns (products, articles, events, tables, contacts).

### 3. `generate` — Transform web/PDF content into a custom JSON shape

Best for: summaries, categorization, sentiment analysis, reformatting. Unlike
`extract-json` (which pulls existing data), `generate` uses an LLM to *create*
new content. May be slower due to LLM processing.

```bash
cd <skill-dir> && npx tsx ./tabstack.ts \
  generate "<url>" "<json_schema|@file>" "<instructions>"
```

Optional flags: `--nocache`, `--geo CC`.

Example — categorise and summarise HN posts:
```bash
cd <skill-dir> && npx tsx ./tabstack.ts \
  generate "https://news.ycombinator.com" \
  '{"type":"object","properties":{"stories":{"type":"array","items":{"type":"object","properties":{"title":{"type":"string"},"category":{"type":"string"},"summary":{"type":"string"}}}}}}' \
  "For each story, categorize as tech/business/science/other and write a one-sentence summary"
```

See [references/examples.md](references/examples.md) for more schema and
instruction examples.

### 4. `automate` — Multi-step browser task in natural language

Best for: tasks needing real browser interaction — clicking, navigating across
pages, filling forms. Does NOT support PDFs or `--geo`.

```bash
cd <skill-dir> && npx tsx ./tabstack.ts \
  automate "<natural language task>" --url "<url>"
```

Optional flags:
- `--url <url>` — starting URL for the task
- `--max-iterations N` — limit steps (default 50, range 1-100)
- `--guardrails "..."` — safety constraints (e.g. `"browse only, don't submit forms"`)
- `--data '{"key":"val"}'|@file` — JSON context for form filling

**Timeout:** May take 30-120 seconds. Use at least 420s exec timeout.

Example — fill a contact form with guardrails:
```bash
cd <skill-dir> && npx tsx ./tabstack.ts \
  automate "Fill out the contact form with my information" \
  --url "https://example.com/contact" \
  --data '{"name":"Alex","email":"alex@example.com","message":"Hello"}' \
  --guardrails "Only fill and submit the contact form, do not navigate away"
```

### 5. `research` — AI-powered web research

Best for: open-ended questions requiring multiple web sources. Unlike
`automate`, this doesn't interact with pages — it searches and reads them.

```bash
cd <skill-dir> && npx tsx ./tabstack.ts research "<query>"
```

Optional flags:
- `--mode fast|balanced` — `fast` for quick answers, `balanced` (default) for
  deeper multi-source research
- `--geo CC` — research from a specific country's perspective

**Timeout:** May take 60-120 seconds. Use at least 420s exec timeout.

## Reference: Examples & Recipes

Read [references/examples.md](references/examples.md) when you need to:

- **Build a JSON schema** for `extract-json` — patterns for products, articles,
  events, tables, contacts, invoices
- **Write effective instructions** for `generate` — recipes for summarization,
  sentiment analysis, competitive analysis, content digests
- **Recover from a failed attempt** — if a command doesn't produce good
  results, check for a better approach

## Choosing the Right Operation

| Operation          | Use when...                                    | Cost    | Timeout |
|--------------------|------------------------------------------------|---------|---------|
| `extract-markdown` | Read/summarise a page or PDF                   | Lowest  | 60s     |
| `extract-json`     | Structured data from a page or PDF             | Medium  | 60s     |
| `generate`         | AI-transformed content from a page or PDF      | Medium  | 60s     |
| `research`         | Answers from multiple web sources              | Medium  | 420s    |
| `automate`         | Multi-step browser interaction (no PDF)         | Highest | 420s    |

Prefer cheaper operations when they suffice. Use `extract-markdown` for
simple reading. Only use `automate` when the task requires clicking,
navigating, or form interaction.

Inform the user before triggering multiple `automate` calls — they are the
most expensive.

## Error Handling

| Error               | Meaning                                       |
|---------------------|-----------------------------------------------|
| `401 Unauthorized`  | TABSTACK_API_KEY is missing or invalid        |
| `422 Unprocessable` | URL is malformed or page is unreachable       |
| `400 Bad Request`   | Malformed request — check arguments           |
| No output           | Task timed out or page blocked automation     |

On `automate` failures, retry once. If it fails again, fall back to
`extract-markdown` for read-only tasks.

## Environment Configuration

To use this skill, you need a Tabstack API key from
[tabstack.ai](https://tabstack.ai).

Set the key via the CLI:

```bash
openclaw config set env.TABSTACK_API_KEY "your-key-here"
```
