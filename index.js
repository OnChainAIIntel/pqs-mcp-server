#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const PQS_BASE = process.env.PQS_BASE ?? "https://promptqualityscore.com";

const UTM_TOOL =
  "?utm_source=mcp&utm_medium=tool_description&utm_campaign=2026-05-mcp-tools";
const UTM_SCHEMA =
  "?utm_source=mcp&utm_medium=schema_description&utm_campaign=2026-05-mcp-tools";
// Appended to the outbound API calls in the tool handlers below. The PQS edge
// middleware (surface-log) records req.nextUrl.search into pqs_surface_traffic,
// so this query string is what attributes MCP-driven API traffic. The handlers
// read their input from the POST body and ignore the query string.
const UTM_API =
  "?utm_source=mcp&utm_medium=api_call&utm_campaign=2026-05-mcp-tools";

const server = new Server(
  {
    name: "pqs-mcp-server",
    version: "1.1.2",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "score_prompt",
        description:
          "Score any LLM prompt for quality using PQS (Prompt Quality Score). Returns a grade (A-F), score out of 80, and percentile. Free, no API key required. Use this before sending any prompt to an LLM to check if it is worth running.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The prompt to score",
            },
            vertical: {
              type: "string",
              enum: ["software", "content", "business", "education", "science", "crypto", "general"],
              description: "The domain context for scoring. Defaults to general.",
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "grade_prompt",
        description:
          `Get a fast grade (A-F) and total score (0-80) for any LLM prompt without the full 8-dimension breakdown. Cheapest paid PQS tool, ideal for agent quality gating before sending to a model. Requires a PQS API key from https://promptqualityscore.com/${UTM_TOOL}`,
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The prompt to grade",
            },
            vertical: {
              type: "string",
              enum: ["software", "content", "business", "education", "science", "crypto", "general"],
              description: "The domain context for grading. Defaults to general.",
            },
            api_key: {
              type: "string",
              description: `PQS API key for authentication. Get one at https://promptqualityscore.com/${UTM_SCHEMA}`,
            },
          },
          required: ["prompt", "api_key"],
        },
      },
      {
        name: "optimize_prompt",
        description:
          `Score AND optimize any LLM prompt using PQS. Returns the original score, an optimized version of the prompt, and a dimension-by-dimension breakdown across 8 quality dimensions based on PEEM, RAGAS, MT-Bench, G-Eval, and ROUGE frameworks. Requires a PQS API key, SaaS-billed per tier. See pricing at https://promptqualityscore.com/pricing${UTM_TOOL}`,
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The prompt to optimize",
            },
            vertical: {
              type: "string",
              enum: ["software", "content", "business", "education", "science", "crypto", "general"],
              description: "The domain context for optimization. Defaults to general.",
            },
            api_key: {
              type: "string",
              description: `PQS API key for authentication. Get one at https://promptqualityscore.com${UTM_SCHEMA}`,
            },
          },
          required: ["prompt", "api_key"],
        },
      },
      {
        name: "compare_models",
        description:
          `Compare how Claude vs GPT-4o handles the same prompt using PQS. Both models are scored head-to-head by a third model judge. Returns winner, scores, and recommendation on which model to use for this prompt type. Requires a PQS API key, SaaS-billed per tier. See pricing at https://promptqualityscore.com/pricing${UTM_TOOL}`,
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The prompt to compare across models",
            },
            vertical: {
              type: "string",
              enum: ["software", "content", "business", "education", "science", "crypto", "general"],
              description: "The domain context. Defaults to general.",
            },
            api_key: {
              type: "string",
              description: `PQS API key for authentication. Get one at https://promptqualityscore.com${UTM_SCHEMA}`,
            },
          },
          required: ["prompt", "api_key"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "score_prompt") {
    const response = await fetch(`${PQS_BASE}/api/score/free${UTM_API}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: args.prompt,
        vertical: args.vertical || "general",
      }),
    });
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  if (name === "grade_prompt") {
    const response = await fetch(`${PQS_BASE}/api/pqs-grade${UTM_API}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": args.api_key,
      },
      body: JSON.stringify({
        prompt: args.prompt,
        vertical: args.vertical || "general",
      }),
    });
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  if (name === "optimize_prompt") {
    const response = await fetch(`${PQS_BASE}/api/score/full${UTM_API}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": args.api_key,
      },
      body: JSON.stringify({
        prompt: args.prompt,
        vertical: args.vertical || "general",
      }),
    });
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  if (name === "compare_models") {
    const response = await fetch(`${PQS_BASE}/api/score/compare${UTM_API}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": args.api_key,
      },
      body: JSON.stringify({
        prompt: args.prompt,
        vertical: args.vertical || "general",
      }),
    });
    const data = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PQS MCP Server running on stdio");
}

main().catch(console.error);
