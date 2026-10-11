# Invest-broker — Slack AI Workflow Integration (Phase 1)

This folder is an isolated Slack-hosted workflow app scaffold. It does not alter the existing Invest-broker application or enable financial actions.

## Phase 1 default workflow

**Answer a question with AI.** A Workflow Builder step accepts a question and optional context and returns a concise answer. The workflow does not read channel history or post messages automatically; users explicitly supply the context.

## Requirements

- Slack CLI and a Slack workspace that supports custom workflow steps. Slack documents that custom workflow steps require a paid plan or a developer sandbox.
- Deno / Slack CLI project support.
- An OpenAI API key stored as a Slack app secret, never committed to Git.

## Setup

1. Install and authenticate the Slack CLI: `slack login`.
2. From this directory, run `slack run` to validate the app in a development workspace.
3. Add the provider key to the Slack app's secret store using the Slack CLI: `slack secrets add OPENAI_API_KEY <your-key>`.
4. Deploy with `slack deploy`.
5. In Slack Workflow Builder, add the custom step **Answer with AI** and map the question and optional context inputs.
6. Test with non-sensitive text before enabling it for a team.

> Do not paste API keys into source files, workflow inputs, issues, or chat. The key is only read server-side by the function.

## Files

- `manifest.ts`: declares the custom workflow function.
- `functions/answer_question.ts`: validates inputs, calls the OpenAI API, and returns the answer.
- `deno.json`: pins the Slack SDK import.

## Security and behavior

- Input length is bounded before sending to the model.
- Provider credentials are read from the runtime secret store.
- The function returns a generic failure message to the workflow while logging diagnostic details server-side.
- The first phase does not request Slack message-history scopes, access investments, modify balances, execute trades, or perform deposits/withdrawals.
- Treat workflow inputs as potentially sensitive; only provide information permitted by your workspace policies.

## Verification status

This is a repository scaffold. It is not deployed to a Slack workspace yet. Deployment requires an authorized Slack CLI session and the secret configured in that workspace.