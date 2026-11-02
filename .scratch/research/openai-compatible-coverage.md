# Riset: Cakupan endpoint OpenAI-compatible

Tiket: [#2 Verifikasi cakupan endpoint OpenAI-compatible](https://github.com/BenihDev/gitcommitgen/issues/2) — Wayfinder: Provider-agnostic LLM layer (#1)

Pertanyaan: apakah satu provider generik `openai-compatible` cukup untuk Ollama, LM Studio, Groq, OpenRouter, dan Gemini, untuk kasus pakai gitcommitgen (satu chat completion non-streaming, system+user, `max_tokens`, `temperature`)?

## Ringkasan jawaban

**Ya, satu provider generik cukup.** Kelima target memakai `POST <base>/chat/completions` dengan payload yang identik untuk kebutuhan kita (`model`, `messages`, `temperature`, `max_tokens`) dan bentuk respons yang sama (`choices[0].message.content`). Tidak ada target yang butuh penanganan khusus untuk kasus pakai ini.

| Target | Base URL | Key | Catatan untuk kasus kita |
| --- | --- | --- | --- |
| Ollama (lokal) | `http://localhost:11434/v1` | tidak perlu (dummy diabaikan) | Terverifikasi langsung, lihat di bawah |
| LM Studio (lokal) | `http://localhost:1234/v1` | dummy (`lm-studio`) | `system`+`user`, `temperature`, `max_tokens` semua didukung |
| Groq | `https://api.groq.com/openai/v1` | `GROQ_API_KEY` | `temperature` 0 dikonversi ke `1e-8` |
| OpenRouter | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | Header `HTTP-Referer`/`X-OpenRouter-Title` opsional |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/` | `GEMINI_API_KEY` | **Beta**; parameter tak dikenal di-silently-ignore |

## Fakta per target

### Ollama — terverifikasi langsung (bukan hanya dokumen)

Versi klien Ollama lokal: **0.32.1**. Model tersedia: `gemma4:latest` (8.0B, Q4_K_M).

Uji nyata terhadap `http://localhost:11434/v1/chat/completions`:

| Uji | Hasil |
| --- | --- |
| POST tanpa header `Authorization` | **HTTP 200**, respons valid (`choices[0].message.content`) |
| POST dengan `Authorization: Bearer ollama` | **HTTP 200**, key diabaikan |
| Model tidak ada (`does-not-exist`) | **HTTP 404**, `{"error":{"message":"model '...' not found","type":"not_found_error",...}}` |
| GET `/v1/models` | **HTTP 200**, `{"object":"list","data":[{"id":"gemma4:latest",...}]}` |

Payload yang berhasil: `model`, `messages` (system + user), `temperature`, `max_tokens`. Bentuk respons persis OpenAI (`id`, `object: chat.completion`, `choices[].message.content`, `usage`).

Dokumen resmi mengonfirmasi daftar field: `model`, `messages`, `temperature`, `top_p`, `max_tokens`, `stream`, `seed`, `stop`, `response_format`, `frequency_penalty`, `presence_penalty`, dll. Tidak didukung: `logit_bias`, `user`, `n`, `tool_choice`. Untuk kita semua field yang dipakai didukung.

Endpoint lain juga tersedia: `/v1/completions`, `/v1/models`, `/v1/embeddings`, `/v1/responses`. Kita tidak butuh.

Sumber: `https://raw.githubusercontent.com/ollama/ollama/main/docs/api/openai-compatibility.mdx` (dokumen resmi repo ollama/ollama) + verifikasi langsung di mesin ini.

### LM Studio

- Base URL: `http://localhost:1234/v1` (port default 1234), key dummy `lm-studio`.
- Endpoint didukung: `/v1/models`, `/v1/responses`, `/v1/chat/completions`, `/v1/embeddings`, `/v1/completions`, `/v1/decisions`.
- Payload didukung: `model`, `messages`, `temperature`, `max_tokens`, `top_p`, `stop`, `seed`, dll. Cocok.
- Contoh resmi memakai system + user message persis pola kita.

Sumber: `https://raw.githubusercontent.com/lmstudio-ai/docs/main/1_developer/3_openai-compat/chat-completions.md` dan `index.mdx`.

### Groq

- Base URL: `https://api.groq.com/openai/v1`.
- Tidak didukung (menyebabkan **HTTP 400**): `logprobs`, `logit_bias`, `top_logprobs`, `messages[].name`; `N` harus = 1 bila dikirim. **Tidak satu pun dipakai gitcommitgen.**
- `temperature: 0` dikonversi ke `1e-8`. Kita memakai `0.3`, aman.
- Groq menyarankan library sendiri, tapi OpenAI-compat resmi didokumentasikan.

Sumber: `https://console.groq.com/docs/openai` (via reader), bagian "Currently Unsupported OpenAI Features".

### OpenRouter

- Base URL: `https://openrouter.ai/api/v1`; auth via `Authorization: Bearer <OPENROUTER_API_KEY>`.
- Contoh resmi memakai OpenAI SDK dengan `base_url` yang sama; header `HTTP-Referer` dan `X-OpenRouter-Title` **opsional** (untuk ranking di situsnya).
- Model slug berbeda-beda (`openai/gpt-4o-mini`, `anthropic/claude-...`) sehingga `model` harus bisa diisi bebas dari config.

Sumber: `https://openrouter.ai/docs/quickstart`.

### Gemini (mode OpenAI-compatible)

- Base URL: `https://generativelanguage.googleapis.com/v1beta/openai/`; key via `GEMINI_API_KEY` sebagai Bearer.
- **Status beta**: "Support for the OpenAI libraries is still in beta while we extend feature support."
- **Bahaya silent-fail**: "Any other parameters not listed here ... will be silently ignored by the compatibility layer." Artinya parameter invalid tidak memunculkan error — harus hati-hati, tapi untuk field inti kita aman.
- Google sendiri menyarankan SDK native bila memungkinkan; OpenAI-compat ditujukan untuk yang sudah pakai library OpenAI.

Sumber: `https://ai.google.dev/gemini-api/docs/openai`.

## Konsekuensi untuk desain

1. **Satu provider `openai-compatible` cukup.** Tidak perlu kelas khusus per target; perbedaan hanya di baseURL + key (dan opsi header).
2. **Key opsional secara desain.** Ollama & LM Studio jalan tanpa key nyata; beberapa implementasi OpenAI-compat masih mewajibkan header `Authorization` diisi nilai dummy. Provider generik sebaiknya: bila preset tidak butuh key, kirim header dummy atau lewati header — keduanya bekerja pada Ollama (terverifikasi). Untuk kejelasan, kirim `Authorization: Bearer <apiKey || "ollama">` tetap aman.
3. **`model` harus bebas diisi.** Slug beda-beda (OpenRouter memakai `vendor/model`, Ollama memakai `nama:tag`). Jangan validasi ketat.
4. **Penanganan error: baca `.error.message`.** Ollama, dan OpenAI-compat pada umumnya, mengembalikan `{"error":{"message":...}}`. Format ini seragam → satu parser error cukup.
5. **Gemini berstatus beta + silent-ignore parameter.** Bila Gemini dimasukkan sebagai preset, beri catatan; jangan andalkan error untuk parameter salah. Ini memperkuat keputusan standing: Gemini native out of scope, presets tetap tipis.
6. **Groq membatasi beberapa field dengan 400.** Pastikan payload provider generik hanya mengirim field yang dipakai (jangan kirim `logprobs`, `logit_probs`, `messages[].name`, `n`) — payload minimal saat ini sudah benar.

## Yang tidak diselesaikan riset ini

- Perilaku endpoint OpenAI resmi itu sendiri (dianggap referensi, karena provider `openai` existing sudah memakainya).
- Provider lain di luar lima target (Together, Fireworks, DeepInfra, dsb.) — kemungkinan besar juga OpenAI-compatible, tapi belum diverifikasi.
- Streaming: tidak relevan untuk gitcommitgen (butuh hasil utuh sebelum commit).
