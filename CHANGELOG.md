# Changelog

## Unreleased

### Security
- Hardened API request handling with JSON content-type checks, request-size limits, integer count validation, and tighter simulation bounds.
- Sanitised viewer shared-state merging by filtering unsafe object keys and falling back to manifest-approved JSX files.
- Replaced simulator activity and hotspot HTML string rendering with DOM text rendering for API-provided values.
- Added SlideVault file, slide-count, and extracted-media caps for local `.pptx` ingestion.

### Fixed
- Improved simulator responsiveness across tablet and phone widths, including input cards, simulation controls, charts, summary cards, and hotspot tables.
- Aligned utilisation status colours so 90-100% utilisation is shown as high/amber and only over-100% demand is red.
- Added desktop viewer back/forward state handling and copy-link feedback, matching the mobile viewer behaviour more closely.

## Week of 2026-04-11 to 2026-04-17

### Highlights
- No substantive feature or fix work landed in repo history for this week; the only post-cutoff `main` commit updated `CHANGELOG.md` and `.DS_Store` on 2026-04-12.

### Key PRs
- No linked GitHub PRs were present in repo history for this week's commits.

## Week of 2026-04-04 to 2026-04-10

### Highlights
- Moved simulator execution behind a Worker API and refactored the simulator into a server-driven thin client, adding coverage for the simulate engine, worker, and thin-client flows.
- Fixed stuck simulator sliders by restoring default-value handling and inlined the simulation client into the JSX bundle with a smoke-test loader.
- Tidied project metadata and npm scripts by removing generated `public/` assets from source control and introducing manifest support for regenerated outputs.

### Key PRs
- [#29](https://github.com/mccann-stuart/GPT_outputs/pull/29) Tidy project metadata and npm scripts

## Week of 2026-03-28 to 2026-04-03

### Highlights
- Added a PRD for a UK income tax reform simulation notebook and the initial notebook files to start the exercise.

### Key PRs
- No linked GitHub PRs were present in repo history for this week's commits.

## Week of 2026-03-14 to 2026-03-20

### Highlights
- Added a new `frame.jsx` component for strategic decision frameworks and registered it in `jsx-manifest.json`.
- Refined the framework synthesis presentation with updated layout and clearer axis labeling.
- Improved the frame UI for iPhone-sized screens.

### Key PRs
- No linked GitHub PRs were present in repo history for this week's commits.

## Week of 2026-03-07 to 2026-03-13

### Highlights
- Rolled out the iPhone viewer work, including a dedicated `iphone.html` render path, iPhone auto-routing, browser history support, and rendering fixes.
- Expanded the market-model workflow with NICE model support, refreshed FY22-FY25 actuals, FY2025 SOM anchoring, updated CAGR and S-curve assumptions, and refined KPI and product-matching logic.
- Improved the UI with grouped solution lines, BCG/business-line context, percentage-friendly numeric inputs, and control-panel/layout refinements across desktop and iPhone views.
- Hardened and stabilized the codebase with JSX import and XSS protections, added tests for logistic math and settings-default fallbacks, and merged performance improvements for deep cloning and yearly data lookups.
- Added a live review system for EU regulations.

### Key PRs
- [#27](https://github.com/mccann-stuart/GPT_outputs/pull/27) Add iphone html render engine 16204962616621744510
- [#25](https://github.com/mccann-stuart/GPT_outputs/pull/25) Tidy project metadata and local tooling docs
- [#24](https://github.com/mccann-stuart/GPT_outputs/pull/24) Expose product business-line metadata, merge input product overrides, and show explanations in UI
- [#20](https://github.com/mccann-stuart/GPT_outputs/pull/20) Add business line explanations next to BCG Hypothesis in Claude Gamma model
- [#18](https://github.com/mccann-stuart/GPT_outputs/pull/18) feat: Add mobile JSX render engine for iPhone Safari
- [#17](https://github.com/mccann-stuart/GPT_outputs/pull/17) refactor: improve layout and styling of model metrics and BCG hypothesis display
- [#14](https://github.com/mccann-stuart/GPT_outputs/pull/14) Performance Optimization: Replace O(N) lookup with O(1) object access
- [#13](https://github.com/mccann-stuart/GPT_outputs/pull/13) Replace custom deepClone with structuredClone
- [#12](https://github.com/mccann-stuart/GPT_outputs/pull/12) Add tests for logistic math functions
- [#11](https://github.com/mccann-stuart/GPT_outputs/pull/11) [testing improvement] Add tests for resolveInitialSettings defaults fallbacks
- [#10](https://github.com/mccann-stuart/GPT_outputs/pull/10) Fix Security Vulnerability: XSS and Arbitrary Code Execution
