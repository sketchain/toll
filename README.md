# toll

Cloudflare Worker that serves model price ratios for [new-api](https://github.com/QuantumNous/new-api)'s
"upstream price sync" (上游价格同步). Prices are each vendor's official standard API list price
(non-batch, non-discount), with no markup — markups belong in new-api group ratios.

```
GET /                  ─┐
GET /api/ratio_config  ─┴─> { "success": true, "data": { model_ratio, completion_ratio, cache_ratio, create_cache_ratio } }
```

Conversion (new-api baseline: ratio 1 = $2 / 1M tokens):

| key                  | formula               | emitted when          |
|----------------------|-----------------------|-----------------------|
| `model_ratio`        | `input / 2`           | always                |
| `completion_ratio`   | `output / input`      | always                |
| `cache_ratio`        | `cache_read / input`  | `cache_read` present  |
| `create_cache_ratio` | `cache_write / input` | `cache_write` present |

Every `name` and every alias becomes its own key with identical values.

## Editing prices

All prices live in [`prices.json`](prices.json), in **USD per 1M tokens**:

```json
{ "name": "claude-sonnet-4-5-20250929", "aliases": ["claude-sonnet-4.5"],
  "input": 3, "output": 15, "cache_read": 0.3, "cache_write": 3.75,
  "source": "https://platform.claude.com/docs/en/about-claude/pricing",
  "note": "optional free text" }
```

- `cache_write` is the 5-minute cache write price. Omit `cache_read` / `cache_write` if the vendor
  doesn't publish them — never guess.
- `source` is required: the official page you took the numbers from.
- **Change a price:** edit the numbers (and `source` if it moved), push to `main`.
- **Add a model:** add an entry, or add another spelling of an existing model to its `aliases`
  (same model = one entry). If a new-api channel needs the name, also add it to
  [`scripts/required-models.ts`](scripts/required-models.ts).

`npm run validate` checks that every channel model is present exactly once across all names/aliases,
that prices are positive, and that every entry has a source. It runs in CI and as the wrangler
`[build]` step, so a bad `prices.json` fails the deploy instead of shipping.

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
