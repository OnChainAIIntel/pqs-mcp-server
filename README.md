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

Returns a 0-80 score, A-F grade, full 8-dimension breakdown (clarity, specificity, context, constraints, output_format, role_definition, examples, cot_structure), and the weakest dimension. Rate-limited per IP: 5/min, 10/day, 100/month.

Low- and mid-band scores also include a structured `suggestion` field with a message, a `next_tool` pointer to `optimize_prompt`, and a subscribe URL the consuming LLM can paraphrase back to the user.

**Example output (low-band score, suggestion attached):**
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
  "powered_by": "PQS — promptqualityscore.com",
  "suggestion": {
    "message": "This prompt scored 9/80 (F) — significant room to improve. The optimize_prompt tool rewrites it and shows side-by-side outputs from a frontier model, so you can see the impact. optimize_prompt is part of PQS Pro ($19.99/mo, 1,000 calls/mo). Subscribe at https://promptqualityscore.com/pricing?utm_source=mcp&utm_medium=suggestion_v140&utm_campaign=2026-05-mcp-tools-v140.",
    "next_tool": "optimize_prompt",
    "subscribe_url": "https://promptqualityscore.com/pricing?utm_source=mcp&utm_medium=suggestion_v140&utm_campaign=2026-05-mcp-tools-v140"
  }
}
```

If the per-IP rate limit is hit, the response is a structured `rate_limit_exceeded` payload with subscribe and account URLs.

### optimize_prompt (Pro subscription required)

Rewrites a prompt to score higher and runs both versions through a frontier model so the user can see the before/after output. Returns the optimized prompt, before/after dimension scores (with totals), `improvement_pct`, and side-by-side sample outputs.

**Pro subscription required ($19.99/mo, 1,000 calls/mo, includes batch + A/B comparison).** Subscribe at [promptqualityscore.com/pricing](https://promptqualityscore.com/pricing?utm_source=mcp&utm_medium=readme_v140&utm_campaign=2026-05-mcp-readme-v140).

If the API key is missing, invalid, or on the Free tier, the tool returns a structured error pointing the user at the right URL. No silent failures, no inventing keys. Errors emitted:

- `api_key_required`: no `api_key` argument was sent
- `api_key_invalid`: key not recognized
- `subscription_required`: key is valid but Free tier (subscribe to upgrade)
- `rate_limited`: per-minute burst limit reached (Pro is rate-limited per minute, not per month) or temporary upstream capacity issue
- `service_unavailable`: upstream 5xx

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

## x402 (legacy pay-per-call)

The MCP tools in this package use the SaaS API-key model. A separate x402-native pay-per-call path is available via the canonical PQS HTTP API (no API key, caller settles USDC on Base on-chain). For x402 integration, see the canonical pricing and discovery artifacts at [promptqualityscore.com](https://promptqualityscore.com?utm_source=mcp&utm_medium=readme_v140&utm_campaign=2026-05-mcp-readme-v140).

## Self-hosting

Override the PQS backend URL with the `PQS_BASE` environment variable:
```bash
PQS_BASE=https://your-pqs-host.example.com npx pqs-mcp-server
```

Defaults to `https://promptqualityscore.com`.

## Built by

OnChainIntel, [@OnChainAIIntel](https://twitter.com/OnChainAIIntel)
[promptqualityscore.com](https://promptqualityscore.com?utm_source=mcp&utm_medium=readme_v140&utm_campaign=2026-05-mcp-readme-v140)
