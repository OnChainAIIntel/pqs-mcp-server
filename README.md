[![smithery badge](https://smithery.ai/badge/onchaintel/pqs)](https://smithery.ai/servers/onchaintel/pqs)

# PQS MCP Server

The world's first named AI prompt quality score — as an MCP server.

Score, optimize, and compare LLM prompts before they hit any model. Built on PEEM, RAGAS, G-Eval, and MT-Bench frameworks.

## Install

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
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

## Tools

- **score_prompt** — Free. Score any prompt, get grade + percentile. No API key needed.
- **optimize_prompt** — $0.025 USDC via x402. Full dimension breakdown + optimized prompt.
- **compare_models** — $0.50 USDC via x402. Claude vs GPT-4o head-to-head.

## Get an API Key

pqs.onchainintel.net

## Built by

John / OnChainIntel — @OnChainAIIntel
