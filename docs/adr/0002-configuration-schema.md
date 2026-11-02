# Configuration schema: named presets with per-field overrides

A user names a provider in `--provider` or the config file and gets a working endpoint without typing a base URL. We implement that with a flat config schema plus a preset table: `provider`, `model`, `commit`, `edit`, `dryRun`, and two optional overrides, `baseURL` and `apiKeyEnv`. Every field resolves by precedence — CLI flag, then config file, then the preset's default, then the program's own constant. A preset maps a `Provider name` to a base URL, whether it needs an API key, and (when one exists) a default model; the six presets are `openai`, `anthropic`, `ollama`, `lmstudio`, `groq`, `openrouter`.

Rejected alternatives: a nested `providers` object in the config file (more expressive, but nothing in batch 1 needs per-name profiles customised in one file — it makes the common case read worse); letting `apiKey` live in the config file (a secret would then sit in a file users copy between machines and paste into issues — only the environment variable *name* is configurable); requiring `--model` for every provider (a preset that knows its default should use it); a fixed base-URL switch per provider name instead of a preset table (the table is the same switch, but with one place to add a name and one place for the validation message to read from).

## Consequences

- `openai` and `anthropic` keep their existing defaults, so old configs and commands behave identically; `--provider anthropic` alone now gets the Anthropic default model instead of inheriting OpenAI's, which fixes a latent bug where a global default leaked across providers.
- `ollama` and `lmstudio` need no key. A provider without a key sends no `Authorization` header at all, rather than loading its environment variable, which works for both local targets that ignore or reject a dummy key.
- `groq`, `openrouter`, `ollama`, and `lmstudio` require an explicit `--model` until a default is worth betting on; leaving it out is a clear error naming the missing `--model`, not a request to some unknown documented model.
- `apiKeyEnv` exists because providers disagree on variable names (`OPENROUTER_API_KEY`, `GROQ_API_KEY`) and often want a non-default name. Its default is derived from the provider name, so most users never set it.
- Config is global (`~/.gitcommitgen.json`) only. Per-repo config is a separate effort.
