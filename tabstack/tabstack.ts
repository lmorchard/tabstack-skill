#!/usr/bin/env npx tsx
/**
 * tabstack.ts — CLI wrapper for the Tabstack API
 *
 * SDK method signatures (positional args, not options objects):
 *   client.extract.markdown(url, options?)
 *   client.extract.json(url, schema, options?)
 *   client.generate.json(url, schema, instructions, options?)
 *   client.agent.automate(task, options?)  — returns async iterable of events
 *
 * Usage:
 *   npx tsx tabstack.ts extract-markdown <url> [--metadata] [--nocache]
 *   npx tsx tabstack.ts extract-json <url> [json_schema] [--nocache]
 *   npx tsx tabstack.ts generate <url> <json_schema> <instructions> [--nocache]
 *   npx tsx tabstack.ts automate <task> [--url <url>] [--max-iterations N]
 *
 * Requires: TABSTACK_API_KEY env var
 */

import { Tabstack } from "@tabstack/sdk";

const apiKey = process.env.TABSTACK_API_KEY;
if (!apiKey) {
  console.error("ERROR: TABSTACK_API_KEY environment variable is not set.");
  process.exit(1);
}

const client = new Tabstack({ apiKey });

// ---------------------------------------------------------------------------
// extract-markdown
// ---------------------------------------------------------------------------
async function extractMarkdown(
  url: string,
  metadata: boolean,
  nocache: boolean
): Promise<void> {
  const opts: any = {};
  if (metadata) opts.metadata = true;
  if (nocache) opts.nocache = true;

  const result = await client.extract.markdown(url, opts);
  if (metadata && (result as any).metadata) {
    console.log("--- metadata ---");
    console.log(JSON.stringify((result as any).metadata, null, 2));
    console.log("--- content ---");
  }
  process.stdout.write((result as any).content ?? String(result));
}

// ---------------------------------------------------------------------------
// extract-json
// ---------------------------------------------------------------------------
async function extractJson(
  url: string,
  schemaArg?: string,
  nocache?: boolean
): Promise<void> {
  let schema: object | undefined;
  if (schemaArg) {
    try {
      schema = JSON.parse(schemaArg);
    } catch (e) {
      console.error(`ERROR: json_schema is not valid JSON: ${e}`);
      process.exit(1);
    }
  }
  const opts: any = {};
  if (nocache) opts.nocache = true;

  const result = await client.extract.json(url, schema, opts);
  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// generate
// ---------------------------------------------------------------------------
async function generate(
  url: string,
  schemaArg: string,
  instructions: string,
  nocache: boolean
): Promise<void> {
  let schema: object;
  try {
    schema = JSON.parse(schemaArg);
  } catch (e) {
    console.error(`ERROR: json_schema is not valid JSON: ${e}`);
    process.exit(1);
  }
  const opts: any = {};
  if (nocache) opts.nocache = true;

  const result = await client.generate.json(url, schema, instructions, opts);
  console.log(JSON.stringify(result, null, 2));
}

// ---------------------------------------------------------------------------
// automate
// SDK returns an async iterable of AutomateEvent objects with .type and .data
// ---------------------------------------------------------------------------
async function automate(
  task: string,
  url?: string,
  maxIterations?: number
): Promise<void> {
  const opts: any = {};
  if (url) opts.url = url;
  if (maxIterations) opts.maxIterations = maxIterations;

  const stream = client.agent.automate(task, opts);

  let finalAnswer: string | undefined;

  for await (const event of stream) {
    const eventType = (event as any).type;
    const data = (event as any).data;

    // Helper to get data fields — SDK uses EventData with .get() method
    const get = (key: string) => {
      if (data && typeof data.get === "function") return data.get(key);
      if (data && typeof data === "object") return data[key];
      return undefined;
    };

    switch (eventType) {
      case "agent:status":
        console.error(`[status] ${get("message") ?? JSON.stringify(data)}`);
        break;
      case "agent:action":
        console.error(`[action] ${get("action") ?? JSON.stringify(data)}`);
        break;
      case "task:completed":
        finalAnswer = get("finalAnswer") ?? JSON.stringify(data, null, 2);
        break;
      case "complete":
        finalAnswer = finalAnswer ?? get("finalAnswer") ?? JSON.stringify(data, null, 2);
        break;
      case "task:aborted":
        console.error(`[aborted] ${get("reason") ?? JSON.stringify(data)}`);
        break;
      case "error":
        console.error(`[error] ${get("message") ?? JSON.stringify(data)}`);
        break;
    }
  }

  if (finalAnswer) {
    process.stdout.write(finalAnswer);
  } else {
    console.error("ERROR: automate stream ended without a final answer.");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
function handleError(error: unknown): never {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// CLI dispatch
// ---------------------------------------------------------------------------
function parseFlags(args: string[]): {
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(args[i]);
    }
  }
  return { positional, flags };
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseFlags(rest);

  switch (command) {
    case "extract-markdown": {
      const [url] = positional;
      if (!url) {
        console.error("Usage: tabstack.ts extract-markdown <url> [--metadata] [--nocache]");
        process.exit(1);
      }
      await extractMarkdown(url, !!flags.metadata, !!flags.nocache).catch(handleError);
      break;
    }

    case "extract-json": {
      const [url, schema] = positional;
      if (!url) {
        console.error("Usage: tabstack.ts extract-json <url> [json_schema] [--nocache]");
        process.exit(1);
      }
      await extractJson(url, schema, !!flags.nocache).catch(handleError);
      break;
    }

    case "generate": {
      const [url, schema, ...instrParts] = positional;
      const instructions = instrParts.join(" ");
      if (!url || !schema || !instructions) {
        console.error("Usage: tabstack.ts generate <url> <json_schema> <instructions>");
        process.exit(1);
      }
      await generate(url, schema, instructions, !!flags.nocache).catch(handleError);
      break;
    }

    case "automate": {
      const task = positional.join(" ");
      if (!task) {
        console.error("Usage: tabstack.ts automate <task> [--url <url>] [--max-iterations N]");
        process.exit(1);
      }
      const url = flags.url as string | undefined;
      const maxIter = flags["max-iterations"]
        ? parseInt(flags["max-iterations"] as string, 10)
        : undefined;
      await automate(task, url, maxIter).catch(handleError);
      break;
    }

    default:
      console.error(`Unknown command: ${command ?? "(none)"}`);
      console.error("Commands: extract-markdown | extract-json | generate | automate");
      process.exit(1);
  }
}

main();
