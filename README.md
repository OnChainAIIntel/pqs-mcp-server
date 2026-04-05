[![smithery badge](https://smithery.ai/badge/onchaintel/pqs)](https://smithery.ai/servers/onchaintel/pqs)

# PQS MCP Server

The world's first named AI prompt quality score — as an MCP server.

Score, optimize, and compare LLM prompts before they hit any model. Built on PEEM, RAGAS, G-Eval, and MT-Bench frameworks.

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

### score_prompt (Free — no API key needed)
Score any prompt before it hits any model. Returns grade A-F, score out of 40, and percentile.

**Example output:**
```json
{
  "pqs_version": "1.0",
  "prompt": "analyze this wallet",
  "vertical": "crypto",
  "score": 8,
  "out_of": 40,
  "grade": "D",
  "upgrade": "Get full dimension breakdown at /api/score for $0.025 USDC via x402",
  "powered_by": "PQS — pqs.onchainintel.net"
}
```

### optimize_prompt ($0.025 USDC via x402)
Score AND optimize any prompt. Returns full 8-dimension breakdown + optimized version.

**Requires:** PQS API key (get one free at pqs.onchainintel.net)

### compare_models ($1.25 USDC via x402)
Compare Claude vs GPT-4o on the same prompt. Judged by a third model. Returns winner, scores, and recommendation.

**Requires:** PQS API key (get one free at pqs.onchainintel.net)

## Verticals

Specify the domain context for more accurate scoring:

- `software` — Software engineering, code, debugging
- `content` — Content creation, copywriting, social media
- `business` — Business analysis, finance, strategy
- `education` — Education, research, academic writing
- `science` — Scientific research, data analysis
- `crypto` — Crypto trading, DeFi, onchain analysis
- `general` — General purpose (default)

## Quality Gate Pattern

Use PQS as a pre-inference quality gate:
```javascript
const score = await fetch("https://pqs.onchainintel.net/api/score/free", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: userPrompt, vertical: "software" })
});
const { score: pqsScore } = await score.json();
if (pqsScore < 28) throw new Error("Prompt quality too low — improve and retry");
```

Grade D or below (< 28/40) means the prompt will waste inference spend.

## Built by

John / OnChainIntel — @OnChainAIIntel  
pqs.onchainintel.net
