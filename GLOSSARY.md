# gitcommitgen

A CLI that turns the staged git diff into a conventional commit message using an LLM. It runs inside a developer's repo, reads the staged changes, and can either print the message or commit it.

## Language

**Diff**:
The staged changes (`git diff --staged`) that are the sole input to message generation.
_Avoid_: patch, changeset, patchset

**Provider**:
A transport that sends one `Diff` to one model endpoint and returns the raw message text. It owns no user-visible behaviour — no spinner, no sanitising, no prompt policy.
_Avoid_: backend, adapter, client, model

**Provider name**:
The string a user sets in config or `--provider` to name a `Provider` in the registry — e.g. `ollama`, `groq`, `openrouter`. Resolves to a base URL and whether an API key is required; it is not itself the base URL.
_Avoid_: provider type, vendor, endpoint

**Preset**:
The built-in defaults a `Provider name` points at: its base URL, whether it requires an API key, and (when it has one) a default model. Overrides sit on top of presets; a preset is never the base URL itself.
_Avoid_: profile, template, built-in, provider type

**Provider config**:
The value handed to a provider factory: `baseURL`, `apiKey`, `model`, `systemPrompt`. `model` is a free-form string naming the model, never an enum.
_Avoid_: options, settings, credentials

**Resolution**:
Picking the final field value by precedence — CLI flag, then config file, then `Preset` default, then the program's own constant.
_Avoid_: merging, cascading, inheritance

**Unit layer**:
Tests that replace `fetch` with a stub and never touch the network; they run anywhere, in CI, without a key.
_Avoid_: mocked tests, offline tests, fast tests

**Local layer**:
Tests that call a real model server on `localhost` (an Ollama or LM Studio instance) and skip by default when none answers.
_Avoid_: integration tests, e2e tests, smoke tests

**Message**:
The conventional-commit text (`type(scope): description` plus optional body) that the orchestrator yields after sanitising provider output.
_Avoid_: response, output, completion

**Orchestrator**:
The layer in `src/llm.ts` that owns the spinner, output sanitising, prompt construction, and dispatch to a provider. It is the only thing `src/index.ts` calls on the LLM side.
_Avoid_: manager, service, engine

**Sanitising**:
Stripping markdown fences and surrounding whitespace from raw provider output to yield a `Message`. Lives only in the orchestrator.
_Avoid_: cleaning, normalising, post-processing

**System prompt**:
The shared instruction text telling the model to emit a conventional commit message and nothing else. One copy, passed in via the `Provider config`; never per-provider.
_Avoid_: instruction, template, preamble

**Error**:
A uniform `LLMError { provider, status }` that carries the provider's normalised `{"error":{"message":…}}` text — the one error shape all OpenAI-compatible backends share.
_Avoid_: exception, failure case, fault
