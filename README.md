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

## Deployment build
- `npm run build:public` generates the deployable static asset set under `public/`.
- The simulation UI remains public, but the `simulate` engine now runs behind `POST /api/simulate` in the Worker.
