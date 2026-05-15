// Thin server-only wrapper around the Anthropic SDK. Keeps model name, retry
// policy, and JSON-extraction helpers in one place.

import Anthropic from "@anthropic-ai/sdk";
import { estimateTokens } from "./utils/perf";

const DEFAULT_MODEL =
  process.env.ANTHROPIC_GENERATE_MODEL ??
  process.env.ANTHROPIC_MODEL ??
  "claude-sonnet-4-6";
export const ANALYZE_MODEL =
  process.env.ANTHROPIC_ANALYZE_MODEL ??
  process.env.ANTHROPIC_MODEL ??
  DEFAULT_MODEL;
const DEFAULT_MAX_TOKENS = 2048;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Copy .env.local.example to .env.local and add your key."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export interface CallLlmArgs {
  system: string;
  user: string;
  maxTokens?: number;
  model?: string;
  temperature?: number;
  // Optional per-request timeout in ms. If the Anthropic call doesn't
  // complete in this time, the abort signal fires and the SDK throws.
  timeoutMs?: number;
  // Short label for log lines so you can tell which call logged what.
  tag?: string;
  // If JSON.parse fails after extract+repair, make a second LLM call asking
  // the model to re-emit ONLY the valid JSON. Off by default because it
  // doubles latency on the rare bad path; opt in per-call.
  repairOnParseFail?: boolean;
}

export async function callLlm(args: CallLlmArgs): Promise<string> {
  const model = args.model ?? DEFAULT_MODEL;
  const tag = args.tag ?? "llm";
  const started = Date.now();
  logPromptSize(tag, model, args);

  // Wire up an AbortController if the caller supplied a timeout so a stuck
  // request can't hang the whole route for the SDK's 10-minute default.
  let abort: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (args.timeoutMs && args.timeoutMs > 0) {
    abort = new AbortController();
    timer = setTimeout(() => abort?.abort(), args.timeoutMs);
  }

  try {
    const res = await getClient().messages.create(
      {
        model,
        max_tokens: args.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: args.temperature ?? 0.4,
        system: args.system,
        messages: [{ role: "user", content: args.user }]
      },
      abort ? { signal: abort.signal } : undefined
    );

    const parts = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text);
    const out = parts.join("\n").trim();
    console.info(
      `[${tag}] ok model=${model} ms=${Date.now() - started} outLen=${out.length}`
    );
    return out;
  } catch (err) {
    logAnthropicError(tag, model, started, err);
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Ask the model for JSON and parse it. Tolerates stray prose around the
// object/array, markdown fences, comments, trailing commas, smart quotes,
// and (optionally) one LLM-based repair retry.
//
// Kept for belt-and-suspenders use. Prefer callLlmStructured when you know
// the exact shape you want — it uses tool use and eliminates this whole
// class of parse failures.
export async function callLlmJson<T = unknown>(args: CallLlmArgs): Promise<T> {
  const tag = args.tag ?? "llm-json";
  const text = await callLlm(args);
  const parsed = tryParseJson<T>(text, tag);
  if (parsed.ok) return parsed.value;

  // Repair pipeline: extract -> strip fences/comments/trailing-commas/smart
  // quotes -> parse again.
  const repaired = repairJson(text);
  if (repaired !== null) {
    try {
      const value = JSON.parse(repaired) as T;
      console.info(`[${tag}] JSON repair succeeded (local)`);
      return value;
    } catch {
      // fall through to LLM repair or throw
    }
  }

  // Last-resort: ask the model to re-emit valid JSON only. Opt-in.
  if (args.repairOnParseFail) {
    console.warn(`[${tag}] local repair failed; attempting LLM repair`);
    const repairedByLlm = await callLlm({
      system:
        "You receive text that was supposed to be JSON but isn't parseable. " +
        "Output ONLY valid JSON that preserves the original meaning. " +
        "No markdown, no code fences, no comments, no prose, no trailing commas. " +
        "All string values must escape internal double quotes as \\\". " +
        "Your entire response must be parseable by JSON.parse.",
      user: `Repair this into valid JSON. Return JSON only.\n\n${text}`,
      maxTokens: args.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: 0,
      timeoutMs: args.timeoutMs,
      tag: `${tag}-repair`
    });
    const extracted = extractJson(repairedByLlm);
    try {
      const value = JSON.parse(extracted) as T;
      console.info(`[${tag}] JSON repair succeeded (llm)`);
      return value;
    } catch (finalErr) {
      logParseFailure(tag, repairedByLlm, finalErr);
      throw finalErr;
    }
  }

  // No repair requested and local repair failed — throw with a logged preview.
  const err = new Error(
    `[${tag}] response was not valid JSON after local repair.`
  );
  logParseFailure(tag, text, err);
  throw err;
}

// Force a structured response via Anthropic tool use. The model is required
// to call a single synthetic tool whose input_schema matches our target
// shape; the SDK returns the input already parsed as an object, so there is
// no JSON string to misparse.
//
// This is the preferred path for any call where we know the shape up front.
export async function callLlmStructured<T = unknown>(
  args: CallLlmArgs,
  schema: {
    toolName: string;
    description: string;
    // JSON Schema object describing the expected tool input. We accept
    // `unknown` here to avoid coupling to the SDK's internal JSONSchema type.
    inputSchema: Record<string, unknown>;
  }
): Promise<T> {
  const model = args.model ?? DEFAULT_MODEL;
  const tag = args.tag ?? "llm-structured";
  const started = Date.now();
  logPromptSize(tag, model, args);

  let abort: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (args.timeoutMs && args.timeoutMs > 0) {
    abort = new AbortController();
    timer = setTimeout(() => abort?.abort(), args.timeoutMs);
  }

  try {
    const res = await getClient().messages.create(
      {
        model,
        max_tokens: args.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: args.temperature ?? 0.4,
        system: args.system,
        messages: [{ role: "user", content: args.user }],
        tools: [
          {
            name: schema.toolName,
            description: schema.description,
            // The SDK's typed InputSchema is more permissive than our tightly
            // typed JSON Schema subset; cast is safe because we control the
            // shape at the call site.
            input_schema:
              schema.inputSchema as unknown as Anthropic.Tool.InputSchema
          }
        ],
        tool_choice: { type: "tool", name: schema.toolName }
      },
      abort ? { signal: abort.signal } : undefined
    );

    const toolBlock = res.content.find(
      (b): b is Anthropic.ToolUseBlock =>
        b.type === "tool_use" && b.name === schema.toolName
    );
    if (!toolBlock) {
      throw new Error(
        `[${tag}] model did not call tool "${schema.toolName}". stop_reason=${res.stop_reason}`
      );
    }
    // The SDK parses `input` for us — it's already a structured object.
    console.info(
      `[${tag}] ok model=${model} ms=${Date.now() - started} toolUse=${schema.toolName}`
    );
    return toolBlock.input as T;
  } catch (err) {
    logAnthropicError(tag, model, started, err);
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function logPromptSize(tag: string, model: string, args: CallLlmArgs): void {
  if (process.env.NODE_ENV === "production") return;
  const promptChars = args.system.length + args.user.length;
  console.info(
    `[${tag}] start model=${model} promptChars=${promptChars} promptTokensEst=${estimateTokens(
      `${args.system}\n${args.user}`
    )} maxTokens=${args.maxTokens ?? DEFAULT_MAX_TOKENS} timeoutMs=${args.timeoutMs ?? 0}`
  );
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function logAnthropicError(
  tag: string,
  model: string,
  started: number,
  err: unknown
): void {
  // Log enough detail to diagnose the common failure modes:
  //   - 401 invalid/missing API key
  //   - 404 model not found / not accessible on this account
  //   - 429 rate limited
  //   - 529 overloaded
  //   - AbortError (our own timeout)
  //   - network/DNS/socket
  const anyErr = err as {
    status?: number;
    error?: { type?: string; message?: string };
    name?: string;
    message?: string;
  };
  const status = anyErr?.status;
  const apiType = anyErr?.error?.type;
  const apiMsg = anyErr?.error?.message;
  const name = anyErr?.name;
  const msg = anyErr?.message;
  console.error(
    `[${tag}] FAILED model=${model} ms=${Date.now() - started} status=${status ?? "?"} name=${name ?? "?"} apiType=${apiType ?? "?"} msg=${msg ?? "?"} apiMsg=${apiMsg ?? "?"}`
  );
}

function logParseFailure(tag: string, text: string, err: unknown): void {
  const preview = text.slice(0, 300).replace(/\s+/g, " ");
  console.warn(
    `[${tag}] JSON parse failed. len=${text.length} preview="${preview}${text.length > 300 ? "…" : ""}"`,
    err
  );
}

function tryParseJson<T>(
  text: string,
  tag: string
):
  | { ok: true; value: T }
  | { ok: false; err: unknown } {
  const candidate = extractJson(text);
  try {
    return { ok: true, value: JSON.parse(candidate) as T };
  } catch (err) {
    // Not a hard failure yet — caller will try repair — but log so the
    // malformed response is visible even when repair succeeds.
    console.warn(
      `[${tag}] first JSON.parse failed (will attempt repair). msg=${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return { ok: false, err };
  }
}

// Pull the largest balanced JSON object or array out of a blob of text.
// Handles markdown fences and leading/trailing prose. Walks the string
// tracking string state and brace/bracket depth so we don't fall over on
// braces inside string values (the naive `lastIndexOf` approach did).
function extractJson(s: string): string {
  const trimmed = s.trim();

  // Strip a single markdown code fence if present.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fence ? fence[1].trim() : trimmed;

  const firstObj = source.indexOf("{");
  const firstArr = source.indexOf("[");
  const starts = [firstObj, firstArr].filter((n) => n !== -1);
  if (starts.length === 0) return source;
  const start = Math.min(...starts);
  const open = source[start];
  const close = open === "{" ? "}" : "]";

  // Balanced scan: track string state and depth.
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  // Unbalanced — fall back to the outermost closer so repair has a chance.
  const lastClose = source.lastIndexOf(close);
  if (lastClose > start) return source.slice(start, lastClose + 1);
  return source;
}

// Best-effort repair of lightly malformed JSON emitted by the model.
// Does not try to rebuild semantics; only fixes common formatting slips.
// Returns null if there's nothing that looks like JSON to repair.
function repairJson(text: string): string | null {
  const candidate = extractJson(text);
  if (!candidate || (candidate[0] !== "{" && candidate[0] !== "[")) return null;

  let out = candidate;

  // Normalize smart quotes to straight quotes — but only outside of strings
  // is hard to determine, so we do a global replace. Our prompts never ask
  // for smart quotes as literal content, so this is safe in practice.
  out = out
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  // Strip // line comments and /* block comments */, preserving content
  // inside string literals.
  out = stripCommentsOutsideStrings(out);

  // Remove trailing commas before ] or }.
  out = out.replace(/,(\s*[\]}])/g, "$1");

  return out;
}

function stripCommentsOutsideStrings(s: string): string {
  let result = "";
  let inStr = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];
    if (inStr) {
      result += ch;
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
      result += ch;
      continue;
    }
    // // line comment — skip to end of line
    if (ch === "/" && next === "/") {
      while (i < s.length && s[i] !== "\n") i++;
      // keep the newline so line numbers in any subsequent error are stable
      if (i < s.length) result += s[i];
      continue;
    }
    // /* block comment */ — skip to */
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < s.length - 1 && !(s[i] === "*" && s[i + 1] === "/")) i++;
      i += 1; // land on '/', loop will increment past it
      continue;
    }
    result += ch;
  }
  return result;
}
