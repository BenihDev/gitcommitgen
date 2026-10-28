# Provider contract for the LLM layer

The LLM layer talks to one model endpoint per run over a single non-streaming chat completion. We split transports into a thin `LLMProvider` interface — `generate(diff)` returns the message text — and move every concern that isn't transport (spinner, output sanitising, the shared `SYSTEM_PROMPT`) into an orchestrator. A provider is created by a factory from a `ProviderConfig` (`baseURL`, `apiKey`, `model`, `systemPrompt`), and a registry maps provider names to factories so `src/providers/` can grow without touching the orchestrator.

Rejected alternatives: letting each provider own its spinner, sanitising, or prompt (would clone logic per provider and make providers hard to test headlessly); a context-passing signature `generate(diff, { model, apiKey })` (mutates the locked one-argument contract and scatters config assembly); a rich provider interface with `validateConfig`/`listModels`/streaming (no consumer needs it yet — commit generation always reads the full message). Errors are normalised to a single `LLMError { provider, status }` because every OpenAI-compatible backend returns `{"error":{"message": …}}`, which makes the error path uniform for both the orchestrator and the test strategy.

## Consequences

- Adding a backend (Ollama, LM Studio, Groq, OpenRouter, Gemini via their OpenAI-compatible base URLs) is a registry entry plus a `ProviderConfig`, not a new module.
- `Config.provider` can no longer be a closed union `"openai" | "anthropic"`; it is a provider name with registry defaults, resolved in a later ticket.
