# GPT_outputs

Deliverables as code.

This project renders consulting deliverables as webpages, with JSX and `.mjs` files capturing the underlying logic.

## Viewer routing
- `index.html` automatically redirects iPhone browsers to `iphone.html` while preserving query parameters and hash.
- Add `?desktop=1` to bypass redirect and force the desktop viewer.

## Local checks
- Run all logic checks: `npm test`
- Run a specific suite:
  - `npm run test:gamma`
  - `npm run test:truelayer`
  - `npm run test:clone`
- Run the clone benchmark: `npm run bench:clone`
