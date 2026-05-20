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
    version: "1.1.3",
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
          "Checks prompt quality before Claude answers. Returns an A-F grade in 2 seconds, catches vague instructions, missing context, and ambiguity that produce bad answers. Free, no API key. Ask 'score this prompt' or 'check this before answering' when you want better output.",
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
        name: "optimize_prompt",
        description:
          `Rewrites your prompt to fix the issues score_prompt found. Returns the improved version, what changed, and why. Run score_prompt first (free) to see what is broken, then use this tool to fix it. Requires an API key from https://promptqualityscore.com/${UTM_TOOL}`,
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
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "score_prompt") {
    const response = await fetch(`${PQS_BASE}/api/score/free${UTM_API}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "pqs-mcp-server/1.1.3",
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

  if (name === "grade_prompt") {
    const response = await fetch(`${PQS_BASE}/api/pqs-grade${UTM_API}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": args.api_key,
        "User-Agent": "pqs-mcp-server/1.1.3",
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
        "User-Agent": "pqs-mcp-server/1.1.3",
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
        "User-Agent": "pqs-mcp-server/1.1.3",
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
