#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const PQS_BASE = "https://pqs.onchainintel.net";

const server = new Server(
  {
    name: "pqs-mcp-server",
    version: "1.0.0",
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
          "Score any LLM prompt for quality using PQS (Prompt Quality Score). Returns a grade (A-F), score out of 40, and percentile. Free tier — no payment required. Use this before sending any prompt to an LLM to check if it is worth running.",
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
          "Score AND optimize any LLM prompt using PQS. Returns the original score, an optimized version of the prompt, and dimension-by-dimension breakdown across 8 quality dimensions based on PEEM, RAGAS, G-Eval, and MT-Bench frameworks. Costs $0.025 USDC via x402. Use this when you want to improve a prompt before running it.",
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
              description: "PQS API key for authentication. Get one at pqs.onchainintel.net",
            },
          },
          required: ["prompt", "api_key"],
        },
      },
      {
        name: "compare_models",
        description:
          "Compare how Claude vs GPT-4o handles the same prompt using PQS. Both models are scored head-to-head by a third model judge. Returns winner, scores, and recommendation on which model to use for this prompt type. Costs $0.50 USDC via x402.",
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
              description: "PQS API key for authentication. Get one at pqs.onchainintel.net",
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
    const response = await fetch(`${PQS_BASE}/api/score/free`, {
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

  if (name === "optimize_prompt") {
    const response = await fetch(`${PQS_BASE}/api/score/full`, {
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
    const response = await fetch(`${PQS_BASE}/api/score/compare`, {
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
