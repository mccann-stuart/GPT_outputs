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

## Generated assets
- `npm run manifest` refreshes the root `jsx-manifest.json` used by the local viewers.
- `npm run build:public` regenerates the deployable static asset set under `public/`.
- `public/` is generated output and is not source-controlled.

## Deployment
- Wrangler serves static assets from `public/`, while the simulation engine stays behind `POST /api/simulate` in the Worker.
- Local `wrangler dev` and `wrangler deploy` run `npm run build:public` via `wrangler.jsonc` before deploying.
- If this repo is connected to Cloudflare Workers Builds from Git, set the same build command in the Cloudflare dashboard because Workers Builds does not use Wrangler custom build config.
