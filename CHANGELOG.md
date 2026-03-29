# Changelog

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
