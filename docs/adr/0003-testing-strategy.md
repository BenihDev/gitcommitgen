# Testing the provider layer

The provider layer is tested with the test runner Node already bundles: `node:test` with `node:assert/strict`, run through `tsx --test`. No third-party runner, no coverage tool, and no new dependency. Tests sit next to the unit they cover as `*.test.ts`, and the one suite that needs a real model server is `local.integration.test.ts`.

Testing is split into two layers. The **unit layer** replaces `globalThis.fetch` with a stub inside each test `beforeEach`/`afterEach`, and asserts on four groups for each provider: the request URL (`baseURL` + `/chat/completions`) and method; the `Authorization` header, present when a key exists and absent when it does not; the request body (`model` passed through verbatim, `messages` holding one system and one user entry, `max_tokens` and `temperature` set); and the result path — response parsing (`choices[0].message.content` for OpenAI-compatible, `content[0].text` for Anthropic) plus `LLMError` carrying `provider`, `status`, and the normalised message on a non-2xx reply. The orchestrator gets its own unit test for `sanitize()`, because that lives in the orchestrator, not a provider against a stub. The **local layer** hits a real Ollama at `localhost:11434` and skips unless `GITCOMMITGEN_LOCAL_TESTS=1` or the server answers within ~300 ms; CI never installs Ollama.

Rejected alternatives: a third-party runner (Vitest/Jest, adding a dependency and config for code that is plain modules and `fetch` calls); injecting `fetch` into the provider (mutates the locked one-argument `generate(diff)` contract to serve the test); fixture files in batch 1 (inline mock responses stay readable under ~15 lines; a `__fixtures__/` directory arrives only when one outgrows that); a coverage-percentage gate (a number to chase, not evidence that each decision branch has a test — the branch list is the criterion); testing `git.ts` and `edit.ts` here (they shell out; that is a separate effort).

## Consequences

- Every required branch has a named unit test: key present, key absent, HTTP error, parse success. Coverage numbers and `c8` are out of scope for batch 1.
- The local-integration suite is deliberately skip-by-default, so `npm test` passes on a clean machine and CI stays fast and hermetic.
- A provider never reads `process.stdout` or shows a spinner under test: ADR 0001 put both in the orchestrator, so the stubbed provider runs headless without gymnastics.
- Config-file reading is tested only for its pure part (parsing and `Resolution` precedence); the file-system read itself is exercised by the local layer or skipped.
