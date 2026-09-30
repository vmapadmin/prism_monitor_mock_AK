# ValueMap Prism Monitor — POC source

Vanilla JS, no framework, no build dependencies beyond Python 3.

| File | Contents |
|---|---|
| core.js | Formatting (₹ Cr/L), seed data (13 borrowers), DocumentIntelligenceService mock, CreditRuleEngine, DP engine, derived case status, 12-month history, EWS insights, rules, notifications |
| ui.js | Badges, hand-built SVG charts, modal, toast, "Why?" explainers, role gating |
| case.js | Case workspace (12 tabs): document viewer, validation, statements, CAM/DN, exceptions, DP sheet, simulation, approval, CBS limit, timeline, reports |
| views.js | Top-level pages: Overview, My Work, Queue, Borrower 360, Exceptions, DP, Approvals, Limits, Monitoring, Analytics drilldown, Documents, Rules, Audit, Admin |
| app.js | Shell (sidebar/top bar), router/render, all user actions (global `A` object) |
| style.css | Design tokens (light/dark), layout, components |
| build.py | Concatenates `src/` CSS + JS into a single `dist/prism-monitor.html` |
| test.js | jsdom end-to-end test of the golden path and scenarios |

## Layout
    src/        source (style.css + core/ui/case/views/app.js)
    dist/       build output: prism-monitor.html (open directly in a browser)
    build.py    concatenates src/ into dist/prism-monitor.html
    test.js     jsdom end-to-end test against dist/prism-monitor.html

## Build
    python build.py          # or: npm run build

## Test
    npm install
    npm test                 # builds, then runs node test.js; expects "ERRORS 0"

## Run
Open `dist/prism-monitor.html` in any modern browser. No server needed.
