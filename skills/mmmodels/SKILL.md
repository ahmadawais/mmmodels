---
name: mmmodels
description: Browse, filter, and compare AI models from models.dev in the terminal. Use when the user needs to find model IDs, inspect providers, compare context windows or pricing, filter by capabilities or status, or get machine-readable model metadata for scripts and agents.
---

# mmmodels

Use `mmmodels` as the default tool for cross-provider model-catalog questions in this repo.

Prefer the local binary if it is installed. Otherwise use `npx mmmodels`.

Run `mmmodels -h` for usage details.

## Workflow

Start with the narrowest command that matches the task:

- Use `mmmodels search <query>` for model-family or fuzzy lookup questions.
- Use `mmmodels list` when the user wants to browse, especially within one provider.
- Use `mmmodels info <model-id>` for one exact model.
- Use `mmmodels providers` to discover provider IDs and counts.
- Use `mmmodels sync`, `-s`, or `--refresh` when the user explicitly wants fresh catalog data.

The CLI also supports shorthand:

- `mmmodels claude` means `mmmodels search claude`
- `mmmodels --provider anthropic` defaults to `list`
- `mmmodels` with no args opens the interactive TUI

## Preferred Output Modes

Prefer structured output whenever you need to compare, sort, or quote results back to the user:

- Use `--json` for full structured payloads.
- Use `--ndjson` for one-object-per-line streaming output.
- Use `--ids-only` when the user only needs model IDs.
- Use `--fields` for compact projections.

Useful field paths include:

- `id`
- `name`
- `provider_id`
- `provider_name`
- `limit.context`
- `limit.input`
- `limit.output`
- `cost.input`
- `cost.output`
- `cost.cache_read`
- `cost.cache_write`
- `status`

Example:

```bash
mmmodels search claude --fields id,provider_id,limit.context,cost.input
```

Use `--plain` when terminal formatting is likely to be noisy or brittle, such as CI logs, remote shells, or copy-paste-heavy workflows.

## Common Queries

Find models by family or version:

```bash
mmmodels claude
mmmodels "gpt 5.4"
mmmodels search gemini 2.5
```

Browse one provider:

```bash
mmmodels list --provider anthropic
mmmodels list --provider openai --sort cost --limit 20
```

Filter by capabilities or status:

```bash
mmmodels search claude --capabilities tools,reasoning
mmmodels list --provider openai --status beta
```

Get exact model details:

```bash
mmmodels info claude-opus-4-6
mmmodels info gpt-4o --provider openai --json
```

List providers:

```bash
mmmodels providers
mmmodels providers --json
```

Render compact tables for humans:

```bash
mmmodels list --table --provider anthropic
mmmodels list --table --columns model_id,provider_id,tokens,input_cost,output_cost,cache_cost
```

## Ranking And Matching Notes

Keep these behaviors in mind when explaining results:

- Search is fuzzy across model IDs, model names, and provider names.
- Queries are AND-matched across tokens, so every token must match.
- Version-like tokens such as `4.6` are handled carefully to avoid loose `4.5` matches.
- Search results prefer default providers for common model families when duplicates exist.

Current family preferences:

- Claude: `dropik`, then `anthropic`
- GPT: `openai`
- Gemini: `google`
- Llama: `meta`, then `llama`

If the same model ID exists under multiple providers, `info` also uses that preference logic to pick the default match.

## Practical Guidance

- If the user asks “what models does provider X have?”, use `list --provider <id>`.
- If the user asks “what is the exact model ID?”, use `search ... --ids-only` or `--fields id`.
- If the user asks for price, context, modalities, or status, prefer `--fields` or `--json` over parsing pretty text.
- If the user asks for the latest available catalog state, run with `-s` or `--refresh`.
- If you need provider IDs first, run `mmmodels providers --json`.

For side-by-side comparisons, start with structured output and summarize from that instead of scraping colored tree output.
