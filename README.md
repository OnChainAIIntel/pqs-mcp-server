[![smithery badge](https://smithery.ai/badge/onchaintel/pqs)](https://smithery.ai/servers/onchaintel/pqs)
[![GitHub Marketplace](https://img.shields.io/badge/GitHub_Marketplace-PQS_Check-2ea44f?logo=github)](https://github.com/marketplace/actions/pqs-check)
[![pqs-mcp-server MCP server](https://glama.ai/mcp/servers/OnChainAIIntel/pqs-mcp-server/badges/card.svg)](https://glama.ai/mcp/servers/OnChainAIIntel/pqs-mcp-server)
# PQS MCP Server

The fastest way to get better output from any AI model. 8 dimensions. 5 frameworks. Pre-flight, not post-hoc.

Score, grade, optimize, and compare LLM prompts before they hit any model. Built on PEEM, RAGAS, MT-Bench, G-Eval, and ROUGE.

## Install

### Claude Desktop

Add to your config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "pqs": {
      "command": "npx",
      "args": ["pqs-mcp-server"]
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
Score any prompt before it hits any model. Returns grade A-F, score out of 80, and percentile.

**Example output:**
```json
{
  "pqs_version": "1.0",
  "prompt": "analyze this wallet",
  "score": 16,
  "out_of": 80,
  "grade": "D",
  "upgrade": "Get full dimension breakdown and an optimized prompt at /api/score/full",
  "powered_by": "PQS, promptqualityscore.com"
}
```

### optimize_prompt
Score AND optimize any prompt. Returns full 8-dimension breakdown plus an optimized version.

**Requires:** a PQS API key. SaaS-billed per tier. Get one at [promptqualityscore.com](https://promptqualityscore.com?utm_source=mcp&utm_medium=readme&utm_campaign=2026-05-mcp-readme), see pricing at [promptqualityscore.com/pricing](https://promptqualityscore.com/pricing?utm_source=mcp&utm_medium=readme&utm_campaign=2026-05-mcp-readme).

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
