#!/usr/bin/env node

import { createRequire } from "node:module";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("./package.json");

const PQS_BASE = process.env.PQS_BASE ?? "https://promptqualityscore.com";

// UTM constants — versioned for v1.4.0 so post-release attribution in
// pqs_surface_traffic stays distinct from pre-1.4.0 traffic. The v1.3.x
// constant UTM_TOOL (utm_medium=tool_description) is intentionally not
// reintroduced: the v1.4.0 tool description text deliberately contains no
// URLs (funnel URLs only appear in structured error responses and the
// suggestion field, attributed via UTM_ERROR / UTM_SUGGESTION).
const UTM_API =
  "?utm_source=mcp&utm_medium=api_call_v140&utm_campaign=2026-05-mcp-tools-v140";
const UTM_SCHEMA =
  "?utm_source=mcp&utm_medium=schema_description_v140&utm_campaign=2026-05-mcp-tools-v140";
const UTM_ERROR =
  "?utm_source=mcp&utm_medium=error_response_v140&utm_campaign=2026-05-mcp-tools-v140";
const UTM_SUGGESTION =
  "?utm_source=mcp&utm_medium=suggestion_v140&utm_campaign=2026-05-mcp-tools-v140";

const SUBSCRIBE_URL_SCHEMA = `${PQS_BASE}/pricing${UTM_SCHEMA}`;
const ACCOUNT_URL_SCHEMA = `${PQS_BASE}/account${UTM_SCHEMA}`;
const SUBSCRIBE_URL_ERROR = `${PQS_BASE}/pricing${UTM_ERROR}`;
const ACCOUNT_URL_ERROR = `${PQS_BASE}/account${UTM_ERROR}`;
const SUBSCRIBE_URL_SUGGESTION = `${PQS_BASE}/pricing${UTM_SUGGESTION}`;

const SCORE_PROMPT_DESCRIPTION = `Score a prompt's quality across 8 dimensions BEFORE sending it to an expensive
model. Returns a 0-80 score, an A-F grade, the per-dimension breakdown
(clarity, specificity, context, constraints, output_format, role_definition,
examples, cot_structure), and the weakest dimension.

USE WHEN:
- The user is workshopping a prompt and asks "is this good?" / "will this
  work?" / "should I add more detail?"
- The user is about to send a long or expensive prompt to GPT-4, Claude Opus,
  or any frontier model, especially in a batch or automation context where
  rework is costly.
- The user mentions iterating on a prompt that produced poor output and wants
  to diagnose what's missing.
- The user pastes a prompt and asks for feedback on it.

DO NOT USE WHEN:
- The user is asking you to write a prompt for them (write it yourself first,
  then optionally call score_prompt to verify).
- The prompt is conversational chat (this scores task-shaped prompts).

COST: Free, no API key required. Rate-limited per IP: 5/min, 10/day, 100/month.
If the user exceeds the limit, the response will include a structured upgrade
path with subscribe and account URLs.

LATENCY: ~2 seconds.`;

const OPTIMIZE_PROMPT_DESCRIPTION = `Rewrite a prompt to score higher on the PQS rubric, AND show before/after
output comparisons so the user can see the impact. Returns the optimized
prompt, the original PQS score, the optimized PQS score, and side-by-side
sample outputs from a frontier model using both versions.

USE WHEN:
- The user got a low score from score_prompt and asks how to improve.
- The user explicitly asks to "improve" / "rewrite" / "fix" / "optimize" a
  prompt they pasted.
- The user is dissatisfied with output quality from a previous prompt and
  asks how to get better results.
- score_prompt returned a suggestion to invoke this tool.

DO NOT USE WHEN:
- The user just asked for a score (use score_prompt only — don't double up).
- The user wants you to write a new prompt from scratch (write it directly).

REQUIRES: A PQS API key from a Pro subscription ($19.99/month, 1,000 calls/mo,
includes batch + A/B comparison). If the user has not provided one, the tool
returns a clear subscription URL — pass that response to the user verbatim.
Do not invent or guess API keys. There is no free trial of this tool; the
user must subscribe before the first call.

COST: Counted against your Pro subscription's monthly call quota.

LATENCY: ~6-8 seconds.`;

const server = new Server(
  { name: "pqs-mcp-server", version: VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "score_prompt",
        description: SCORE_PROMPT_DESCRIPTION,
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "The prompt text to score. Single prompt, not a conversation. Max 8000 characters.",
              maxLength: 8000,
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "optimize_prompt",
        description: OPTIMIZE_PROMPT_DESCRIPTION,
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The prompt to optimize. Max 8000 characters.",
              maxLength: 8000,
            },
            api_key: {
              type: "string",
              description: `PQS API key from a Pro subscription. Required. Format: pqs_live_… (32+ characters). Subscribe at ${SUBSCRIBE_URL_SCHEMA} if you don't have one, or look up an existing key at ${ACCOUNT_URL_SCHEMA}.`,
            },
          },
          // api_key intentionally NOT in required[]. The MCP SDK validates
          // tools/call against the JSON-RPC envelope only (not against
          // inputSchema), but strict clients (Claude.ai, Claude Desktop)
          // may pre-validate and refuse to send a call with a missing
          // required field — which would suppress the api_key_required
          // structured response that drives the subscription funnel.
          required: ["prompt"],
        },
      },
    ],
  };
});

// Survive HTML / non-JSON error bodies upstream — see Phase 1.4 brief Batch
// 1 Q12. Without this, response.json() throws on edge-layer 5xx HTML pages
// and the exception bubbles out as an MCP protocol error instead of our
// structured service_unavailable payload.
async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function asMcpResponse(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function buildSuggestion(score, grade) {
  if (typeof score !== "number") return null;
  if (score < 50) {
    return {
      message: `This prompt scored ${score}/80 (${grade}) — significant room to improve. The optimize_prompt tool rewrites it and shows side-by-side outputs from a frontier model, so you can see the impact. optimize_prompt is part of PQS Pro ($19.99/mo, 1,000 calls/mo). Subscribe at ${SUBSCRIBE_URL_SUGGESTION}.`,
      next_tool: "optimize_prompt",
      subscribe_url: SUBSCRIBE_URL_SUGGESTION,
    };
  }
  if (score < 65) {
    return {
      message: `This prompt scored ${score}/80 (${grade}) — usable but not optimized. For high-stakes prompts, optimize_prompt typically gains another 10-20 points and provides a side-by-side frontier-model comparison. Pro subscription ($19.99/mo, 1,000 calls/mo) required — subscribe at ${SUBSCRIBE_URL_SUGGESTION}.`,
      next_tool: "optimize_prompt",
      subscribe_url: SUBSCRIBE_URL_SUGGESTION,
    };
  }
  return null;
}

async function handleScorePrompt(args) {
  let response;
  try {
    response = await fetch(`${PQS_BASE}/api/score/free${UTM_API}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `pqs-mcp-server/${VERSION}`,
      },
      body: JSON.stringify({ prompt: args.prompt }),
    });
  } catch {
    return asMcpResponse({
      error: "service_unavailable",
      message:
        "PQS scoring is temporarily unavailable. Try again in a minute. If this persists, contact ken@promptqualityscore.com.",
    });
  }

  if (response.status === 429) {
    return asMcpResponse({
      error: "rate_limit_exceeded",
      message: `Free tier limit reached. The Pro tier ($19.99/mo, 1,000 calls/mo) removes per-minute and daily caps — subscribe at ${SUBSCRIBE_URL_ERROR}. If you already have a subscription, look up your key at ${ACCOUNT_URL_ERROR}.`,
      subscribe_url: SUBSCRIBE_URL_ERROR,
      account_url: ACCOUNT_URL_ERROR,
    });
  }

  if (!response.ok) {
    return asMcpResponse({
      error: "service_unavailable",
      message:
        "PQS scoring is temporarily unavailable. Try again in a minute. If this persists, contact ken@promptqualityscore.com.",
    });
  }

  const data = await safeJson(response);
  if (!data) {
    return asMcpResponse({
      error: "service_unavailable",
      message:
        "PQS scoring is temporarily unavailable. Try again in a minute. If this persists, contact ken@promptqualityscore.com.",
    });
  }

  // Strip upstream `upgrade` field (stale x402 copy from /api/score/free
  // route.js:231 — predates the Pro-tier SaaS funnel) and replace with the
  // structured `suggestion` field computed from the score band.
  const { upgrade: _upstreamUpgrade, ...rest } = data;
  const suggestion = buildSuggestion(rest.score, rest.grade);
  const augmented = suggestion ? { ...rest, suggestion } : rest;
  return asMcpResponse(augmented);
}

async function handleOptimizePrompt(args) {
  // Pre-flight: missing api_key never reaches upstream. Sending a 401 round-
  // trip would work but wastes latency and burns a Vercel function
  // invocation on a request we can answer locally.
  if (
    !args.api_key ||
    typeof args.api_key !== "string" ||
    !args.api_key.trim()
  ) {
    return asMcpResponse({
      error: "api_key_required",
      message: `optimize_prompt requires a PQS Pro subscription ($19.99/month, 1,000 calls/mo). Subscribe at ${SUBSCRIBE_URL_ERROR} — you'll receive a Pro API key by email after checkout. If you already have a subscription, look up your key at ${ACCOUNT_URL_ERROR}.`,
      subscribe_url: SUBSCRIBE_URL_ERROR,
      account_url: ACCOUNT_URL_ERROR,
    });
  }

  let response;
  try {
    response = await fetch(`${PQS_BASE}/api/v1/optimize${UTM_API}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": args.api_key,
        "User-Agent": `pqs-mcp-server/${VERSION}`,
      },
      body: JSON.stringify({ prompt: args.prompt }),
    });
  } catch {
    return asMcpResponse({
      error: "service_unavailable",
      message:
        "PQS optimization is temporarily unavailable. Try again in a minute. If this persists, contact ken@promptqualityscore.com.",
    });
  }

  if (response.status === 401) {
    return asMcpResponse({
      error: "api_key_invalid",
      message: `That API key isn't recognized. Confirm the exact key at ${ACCOUNT_URL_ERROR} (Pro keys start with pqs_live_ and are 32+ characters). If your subscription was cancelled or expired, resubscribe at ${SUBSCRIBE_URL_ERROR}.`,
      account_url: ACCOUNT_URL_ERROR,
      subscribe_url: SUBSCRIBE_URL_ERROR,
    });
  }

  if (response.status === 402) {
    return asMcpResponse({
      error: "subscription_required",
      message: `This API key is for the Free tier. optimize_prompt requires Pro ($19.99/month, 1,000 calls/mo, includes batch + A/B comparison). Subscribe at ${SUBSCRIBE_URL_ERROR} — you'll receive a new Pro API key by email after checkout. Use that new key going forward (the free-tier key will keep working for score_prompt).`,
      subscribe_url: SUBSCRIBE_URL_ERROR,
    });
  }

  if (response.status === 429) {
    // Two upstream branches return 429:
    //   /api/v1/optimize route.js:88-99 (per-tier rpm) — body has .limit
    //   /api/v1/optimize route.js:284-289 (Anthropic upstream) — no .limit
    // Discriminate on data.limit so the user gets an honest cause.
    const data = await safeJson(response);
    if (data && typeof data.limit === "number") {
      return asMcpResponse({
        error: "rate_limited",
        message: `PQS Pro is rate-limited to ${data.limit} requests per minute. This is a per-minute burst limit, not a monthly quota — wait 60 seconds and try again.`,
      });
    }
    return asMcpResponse({
      error: "rate_limited",
      message:
        "PQS is temporarily over capacity at our LLM provider. This usually clears in 30-60 seconds. Try again shortly.",
    });
  }

  if (!response.ok) {
    return asMcpResponse({
      error: "service_unavailable",
      message:
        "PQS optimization is temporarily unavailable. Try again in a minute. If this persists, contact ken@promptqualityscore.com.",
    });
  }

  const data = await safeJson(response);
  if (!data) {
    return asMcpResponse({
      error: "service_unavailable",
      message:
        "PQS optimization is temporarily unavailable. Try again in a minute. If this persists, contact ken@promptqualityscore.com.",
    });
  }

  return asMcpResponse(data);
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name === "score_prompt") return handleScorePrompt(args);
  if (name === "optimize_prompt") return handleOptimizePrompt(args);
  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PQS MCP Server running on stdio");
}

main().catch(console.error);
