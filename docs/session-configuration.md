# Session Configuration

This document outlines the session and runtime profile configuration options available for provider integration. These profiles configure the headless CLI and app-server runtimes.

## Codex Runtime Connection Profile
The connection profile (`CodexRuntimeConnectionProfile`) defines the environment for the Codex app-server runtime.

- **`codexHome`** (`string`): The isolated home directory path (`CODEX_HOME`) for the provider session.
- **`apiKey`** (`string`, optional): The API key injected into the runtime environment (e.g., `OPENAI_API_KEY` or `OPENROUTER_API_KEY`). The engine ensures this is never logged or exposed.
- **`extraEnv`** (`Record<string, string>`, optional): Additional environment variables required by the runtime.

## Codex Runtime Profile
The runtime profile (`CodexRuntimeProfile`) dictates how the Codex app-server is configured for different upstream providers (e.g., Codex or OpenRouter).

- **`providerName`** (`'codex' | 'openrouter'`): The identifier for the provider.
- **`defaultModel`** (`string`): The default model to use when one is not explicitly selected in the agent binding.
- **`modelProvider`** (`string`, optional): The upstream model provider identifier (e.g., `openrouter`). When set, it overrides the default OpenAI-compatible API target.

## Orchestrator Session State
Provider sessions can be resumable (e.g., Codex app-server threads, Claude Agent SDK live queries) or single-shot (e.g., Antigravity).
- **Resumable Sessions**: The engine reuses the same connection profile and session reference across orchestration gates to maintain context and history.
- **Single-shot Sessions**: The engine provisions a new connection and re-injects the prior context in a fresh prompt using the orchestrator's retry addendum or context fields.
