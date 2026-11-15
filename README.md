# toll

Cloudflare Worker that serves model price ratios for [new-api](https://github.com/QuantumNous/new-api)'s
"upstream price sync" (上游价格同步). Prices are each vendor's official standard API list price
(non-batch, non-discount), with no markup — markups belong in new-api group ratios.
Explicitly labelled third-party references are used for channel-only names without
an official list price; see the exceptions below.

```
GET /                  ─┐
GET /api/ratio_config  ─┴─> { "success": true, "data": { model_ratio, completion_ratio, cache_ratio, create_cache_ratio, image_ratio } }
```

Conversion (new-api baseline: ratio 1 = $2 / 1M tokens):

| key                  | formula               | emitted when          |
|----------------------|-----------------------|-----------------------|
| `model_ratio`        | `input / 2`           | always                |
| `completion_ratio`   | `output / input`      | always                |
| `cache_ratio`        | `cache_read / input`  | `cache_read` present  |
| `create_cache_ratio` | `cache_write / input` | `cache_write` present |
| `image_ratio`        | `image_input / input` | `image_input` present |

Every `name` and every alias becomes its own key with identical values.

## Editing prices

All prices live in [`prices.json`](prices.json), in **USD per 1M tokens**
(or explicitly noted nominal site-dollar units for third-party base rates):

```json
{ "name": "claude-sonnet-4-5-20250929", "aliases": ["claude-sonnet-4.5"],
  "input": 3, "output": 15, "cache_read": 0.3, "cache_write": 3.75,
  "source": "https://platform.claude.com/docs/en/about-claude/pricing",
  "note": "optional free text" }
```

- `cache_write` is the 5-minute cache write price (OpenAI uses 30 minutes). Omit `cache_read` / `cache_write` if the vendor
  doesn't publish them — never guess.
- `source` is required: the official page you took the numbers from.
  For an explicitly accepted third-party reference, use that provider's pricing
  URL and label the entry `THIRD-PARTY REFERENCE` in `note`.
- **Change a price:** edit the numbers (and `source` if it moved), push to `main`.
- **Add a model:** add an entry, or add another spelling of an existing model to its `aliases`
  (same model = one entry). If a new-api channel needs the name, also add it to
  [`scripts/required-models.ts`](scripts/required-models.ts).

`npm run validate` checks that every channel model is present exactly once across all names/aliases,
that prices are positive, and that every entry has a source. It runs in CI and as the wrangler
`[build]` step, so a bad `prices.json` fails the deploy instead of shipping.

### OpenAI pricing scope and exceptions

- Text models use Standard processing and the <=272K input-token tier. OpenAI's
  `cache_write` is the 30-minute tier. Long-context prices are recorded in notes;
  this static ratio endpoint does not switch tiers based on request length.
- Explicit GPT Image models use text input/cache rates, image output rates, and
  `image_input` for the separate image input rate. For example, $5 text input,
  $8 image input and $30 image output emit ratios 2.5, 1.6 and 6 respectively.
  Cached image input has the same relative discount as cached text input (0.25).
  For GPT Image 2 and 2.5, cache discounts apply only through the Responses API
  image tool; direct Images API calls do not get that discount. Select applicable
  fields when applying the sync to those channels.
- `gpt-6-chat-thinking` uses RelayCloud's public token quote: $0.40 input,
  $2 output, $0.04 cache read and $0.50 cache write per 1M tokens.
- `codex-auto-review` uses Orange AI's base token rates: 2 input, 12 output,
  0.2 cache read and 2.5 cache write per 1M tokens, in nominal site-dollar units.
- Bare `gpt-image-2.5` and `gpt-image-2.6` use HoseAPI's base token rates:
  8 input and 30 output per 1M tokens, in nominal site-dollar units. No cache
  rates are published. These are separate entries, not aliases to Sunburst/Flare.
- These four references were accepted on 2026-11-15. They are not official
  OpenAI prices or verified model mappings. Orange/Hose base rates exclude
  group multipliers and recharge discounts; they are not cash purchase costs.
  RelayCloud's quote came from a public indexed snapshot, since its live pricing
  page could not be revalidated directly.
- `sora-2` and `sora-2-pro` are intentionally excluded.

## Local development

```sh
npm install
npm run dev            # wrangler dev → http://localhost:8787/api/ratio_config
npm run check          # validate + typecheck
```

## Deployment

Cloudflare dashboard → Workers & Pages → Create → Import a repository → `sketchain/toll`,
production branch `main`, deploy command `npx wrangler deploy` (default). Every push to `main`
then deploys automatically. The worker name comes from `wrangler.toml` (`toll`).

## Using it in new-api

Admin → 设置 → 分组与模型定价设置 (Ratio settings) → 上游价格同步 / Upstream ratio sync → add a custom channel:

- **URL:** `https://toll.<your-subdomain>.workers.dev` (base URL; new-api requests `/api/ratio_config`.
  If your version asks for the full endpoint, use `.../api/ratio_config` — both paths return the same JSON.)
- Fetch, review the diff, apply the ratios you want.

