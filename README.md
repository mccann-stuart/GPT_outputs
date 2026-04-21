# GPT_outputs

Deliverables as code.

This project renders consulting deliverables as webpages, with JSX and `.mjs` files capturing the underlying logic.

## Viewer routing
- `index.html` automatically redirects iPhone browsers to `iphone.html` while preserving query parameters and hash.
- Add `?desktop=1` to bypass redirect and force the desktop viewer.

## Local checks
- Run all logic checks: `npm test`
- Run only the simulation/Worker suites: `npm run test:simulate`
- Run the clone benchmark: `npm run bench:clone`

## Security and UI notes
- `/api/simulate` and `/api/preview` accept only JSON POST bodies and reject oversized payloads before running the simulation engine.
- Simulator count fields are validated as integers and capped to keep adversarial payloads from forcing very large arrays or nested interval calculations.
- Viewer shared-state URLs are limited to files in `jsx-manifest.json`; unsafe object keys are ignored before settings are merged.
- Simulator activity logs and hotspot rows are rendered with DOM text nodes rather than HTML string interpolation.
- The simulator layout includes tablet and phone breakpoints for the input, simulation, analysis, chart, and hotspot-table views.
- SlideVault caps local `.pptx` processing by file size, slide count, and extracted media volume to reduce browser memory pressure.

## Generated assets
- `npm run manifest` refreshes the root `jsx-manifest.json` used by the local viewers.
- `npm run build:public` regenerates the deployable static asset set under `public/`.
- `public/` is generated output and is not source-controlled.

## Deployment
- Wrangler serves static assets from `public/`, while the simulation engine stays behind `POST /api/simulate` in the Worker.
- Local `wrangler dev` and `wrangler deploy` run `npm run build:public` via `wrangler.jsonc` before deploying.
- If this repo is connected to Cloudflare Workers Builds from Git, set the same build command in the Cloudflare dashboard because Workers Builds does not use Wrangler custom build config.
