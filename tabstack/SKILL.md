---
name: tabstack
description: "Primary tool for all web-related tasks involving a URL, website, web page, or PDF. Use when the user says things like 'look up,' 'check this site,' 'what does this page say,' 'summarize this article,' 'scrape the data from,' 'find the price on,' 'read this URL,' 'read this PDF,' 'extract data from this document,' 'fill out the form at,' 'research this topic,' or 'compare prices in different countries.' Handles modern JavaScript-heavy websites, PDFs, structured data extraction, content transformation, AI-powered web research, and multi-step browser automation (login, form filling, clicking through pages). Prefer this over web_fetch for anything beyond reading a simple static page."
---

# Tabstack — Web Browsing & Extraction for AI Agents

Tabstack is a web execution API. Use it when the agent needs to read, extract,
transform, or interact with the live web. It handles JavaScript-rendered pages,
PDFs, structured extraction, AI-powered content transformation, and multi-step
browser automation.

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

### 1. `extract-markdown` — Read a page or PDF as clean Markdown

Best for: reading articles, documentation, PDFs, feeding page content into
reasoning. This is the cheapest operation — prefer it when you just need to
read a page or document. Works with both web pages and PDF URLs.

```bash
cd <skill-dir> && npx tsx ./tabstack.ts extract-markdown "<url>"
```

Returns the page as Markdown with YAML frontmatter metadata.

Add `--metadata` to get metadata as a separate JSON block (useful for
programmatic access to title, author, etc.):

```bash
cd <skill-dir> && npx tsx ./tabstack.ts extract-markdown "<url>" --metadata
```

Optional flags:
- `--metadata` — return metadata as a separate JSON block
- `--nocache` — bypass caching and get fresh content
- `--geo CC` — fetch from a specific country (ISO 3166-1 alpha-2 code, e.g. `US`, `GB`, `DE`)

### 2. `extract-json` — Pull structured data from a page or PDF

Best for: prices, product details, headlines, tables — any page or PDF with
predictable repeating structure.

Without a schema (Tabstack infers structure):
```bash
cd <skill-dir> && npx tsx ./tabstack.ts extract-json "<url>"
```

With a JSON Schema (inline JSON string):
```bash
cd <skill-dir> && npx tsx ./tabstack.ts \
  extract-json "<url>" '{"type":"object","properties":{"title":{"type":"string"},"price":{"type":"number"}}}'
```

Returns a JSON object matching the page content.

Optional flags: `--nocache`, `--geo CC` (same as extract-markdown).

See [references/examples.md](references/examples.md) for common JSON schema
patterns (products, articles, events, tables, etc.).

### 3. `generate` — Transform web/PDF content into a custom JSON shape

Best for: summaries, categorization, sentiment analysis, reformatted data.
Works with both web pages and PDFs. Unlike `extract-json` (which pulls
existing data), `generate` uses an LLM to *create* new content based on your
instructions. This operation may be slower than extract operations since it
involves LLM processing.

All three arguments are required:
```bash
cd <skill-dir> && npx tsx ./tabstack.ts \
  generate "<url>" "<json_schema>" "<instructions>"
```

- `json_schema`: a JSON Schema object (inline JSON string)
- `instructions`: natural language description of what to produce

Optional flags: `--nocache`, `--geo CC` (same as extract-markdown).

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
pages, filling forms, or anything that can't be done with a single fetch.

```bash
cd <skill-dir> && npx tsx ./tabstack.ts \
  automate "<natural language task>" --url "<url>"
```

Optional flags:
- `--url <url>` — starting URL for the task
- `--max-iterations N` — limit steps (default 50, range 1-100)
- `--geo CC` — fetch from a specific country (e.g. `GB` for UK pricing)
- `--guardrails "..."` — safety constraints for what the browser agent should
  NOT do (e.g. `"browse only, don't click buy or submit forms"`)
- `--data '{"key":"val"}'` — JSON context for form filling (e.g. name, email,
  address fields the agent should use when filling forms)

Progress is printed to stderr. The final answer is printed to stdout.

**Note:** Automate tasks run a full browser session and may take 30-120 seconds.
Use a timeout of at least 420 seconds (7 minutes) on the exec call to avoid premature SIGTERM.

Example — fill a contact form with guardrails:
```bash
cd <skill-dir> && npx tsx ./tabstack.ts \
  automate "Fill out the contact form with my information" \
  --url "https://example.com/contact" \
  --data '{"name":"Alex","email":"alex@example.com","message":"Hello"}' \
  --guardrails "Only fill and submit the contact form, do not navigate away"
```

Example — compare prices across regions:
```bash
cd <skill-dir> && npx tsx ./tabstack.ts \
  extract-json "https://example.com/product" \
  '{"type":"object","properties":{"price":{"type":"number"},"currency":{"type":"string"}}}' \
  --geo GB
```

### 5. `research` — AI-powered web research

Best for: open-ended questions that require searching the web, analyzing
multiple sources, and synthesizing a comprehensive answer. Unlike `automate`,
this doesn't interact with pages — it searches and reads them.

```bash
cd <skill-dir> && npx tsx ./tabstack.ts \
  research "<query>"
```

Optional flags:
- `--mode fast|balanced` — `fast` for quick answers, `balanced` (default) for
  deeper multi-source research
- `--geo CC` — research from a specific country's perspective

Example:
```bash
cd <skill-dir> && npx tsx ./tabstack.ts \
  research "What are the latest developments in WebAssembly?" --mode balanced
```

Progress is printed to stderr. The final answer is printed to stdout.

**Note:** Research tasks involve multiple iterations of searching and analyzing
(especially in `balanced` mode) and can take 60-120 seconds. Use a timeout of
at least 420 seconds (7 minutes) on the exec call to avoid premature SIGTERM.

## Reference: Examples & Recipes

Read [references/examples.md](references/examples.md) when you need to:

- **Build a JSON schema** for `extract-json` — includes patterns for products,
  articles, events, tables, and contacts
- **Write effective instructions** for `generate` — includes recipes for
  summarization, sentiment analysis, competitive analysis, and content digests
- **Recover from a failed attempt** — if a simple command doesn't produce
  good results, check the examples for a better approach

## Choosing the Right Operation

| Operation          | Use when...                                    | Cost    | Timeout |
|--------------------|------------------------------------------------|---------|---------|
| `extract-markdown` | You need to read/summarise page content        | Lowest  | 60s     |
| `extract-json`     | You need structured data from a page           | Medium  | 60s     |
| `generate`         | You need AI-transformed content from a page    | Medium  | 60s     |
| `research`         | You need answers from multiple web sources     | Medium  | 420s    |
| `automate`         | You need multi-step browser interaction        | Highest | 420s    |

Always prefer cheaper operations when they suffice. Use `extract-markdown` for
simple page reading. Only use `automate` when the task genuinely requires
clicking, navigating, or form interaction.

Inform the user if a task will trigger multiple `automate` calls, as these are
the most expensive.

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
