[![smithery badge](https://smithery.ai/badge/onchaintel/pqs)](https://smithery.ai/servers/onchaintel/pqs)
[![GitHub Marketplace](https://img.shields.io/badge/GitHub_Marketplace-PQS_Check-2ea44f?logo=github)](https://github.com/marketplace/actions/pqs-check)
[![pqs-mcp-server MCP server](https://glama.ai/mcp/servers/OnChainAIIntel/pqs-mcp-server/badges/card.svg)](https://glama.ai/mcp/servers/OnChainAIIntel/pqs-mcp-server)
# PQS MCP Server

Score prompt quality before it reaches any AI model. An MCP server for PQS.

Score and optimize LLM prompts before they hit any model. Built on PEEM, RAGAS, MT-Bench, G-Eval, and ROUGE.

## Install

### Claude Desktop (stdio)

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "pqs": {
      "command": "npx",
      "args": ["-y", "pqs-mcp-server"]
    }
  }
}
```

### Remote (HTTP)

Use this when your MCP client supports streamable-HTTP transport (no local npm install required):
```json
{
  "mcpServers": {
    "pqs": {
      "url": "https://promptqualityscore.com/api/mcp"
    }
  }
}
```

### Smithery
```bash
smithery mcp add onchaintel/pqs
```

## Tools

### score_prompt (Free, no API key required)
Returns grade (A-F), score out of 80, and full 8-dimension breakdown across clarity, specificity, context, constraints, output_format, role_definition, examples, and cot_structure.

**Example output:**
```json
{
  "pqs_version": "2.0",
  "prompt": "analyze this wallet",
  "score": 9,
  "out_of": 80,
  "grade": "F",
  "dimensions": {
    "clarity": 2,
    "specificity": 1,
    "context": 1,
    "constraints": 1,
    "output_format": 1,
    "role_definition": 1,
    "examples": 1,
    "cot_structure": 1
  },
  "weakest_dimension": "specificity",
  "upgrade": "Get top_fixes and a rewritten prompt at /api/v1/optimize for $0.025 USDC via x402 — promptqualityscore.com",
  "powered_by": "PQS — promptqualityscore.com"
}
```

### optimize_prompt
Returns a rewritten, higher-scoring version of your prompt with before/after dimension deltas. $0.025 USDC via x402. Requires API key from [promptqualityscore.com](https://promptqualityscore.com?utm_source=mcp&utm_medium=readme&utm_campaign=2026-05-mcp-readme).

## Quality Gate Pattern

Use PQS as a pre-inference quality gate:
```javascript
const score = await fetch("https://promptqualityscore.com/api/score/free", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: userPrompt })
});
const { score: pqsScore } = await score.json();
if (pqsScore < 56) throw new Error("Prompt quality too low. Improve and retry.");
```

Grade D or below (under 56/80) means the prompt will waste inference spend.

## x402 paid endpoints

Per-call USDC payment on Base is also available via the canonical PQS HTTP API (no API key needed, caller settles on-chain). The MCP tools in this package use the SaaS API-key model. For x402 integration, see the canonical pricing and discovery artifacts at [promptqualityscore.com](https://promptqualityscore.com?utm_source=mcp&utm_medium=readme&utm_campaign=2026-05-mcp-readme).

## Self-hosting

Override the PQS backend URL with the `PQS_BASE` environment variable:
```bash
PQS_BASE=https://your-pqs-host.example.com npx pqs-mcp-server
```

Defaults to `https://promptqualityscore.com`.

## Built by

OnChainIntel, [@OnChainAIIntel](https://twitter.com/OnChainAIIntel)
[promptqualityscore.com](https://promptqualityscore.com?utm_source=mcp&utm_medium=readme&utm_campaign=2026-05-mcp-readme)
