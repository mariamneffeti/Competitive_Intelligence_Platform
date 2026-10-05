# Competitive Intelligence Platform

An interactive portfolio case study for a competitive intelligence pipeline built around n8n workflows, tiered signal analysis, and evidence tracking.

## Project contents

- `index.html` — portfolio page and interactive synthetic-signal demo.
- `demo.js` — submits a selected sample and confidence threshold to the demo API, renders returned Tier 1/Tier 2 analysis, and clearly marks local fallback results.
- `site.css`, `demo-branch.css`, `schema.css` — page styling.
- `architecture-diagrams/` — organized collection of the project architecture PNGs.

The website currently references four diagram images at the repository root for compatibility with its existing image and social preview URLs. The `architecture-diagrams/` folder contains the complete organized diagram set.

## Run the page locally

From this directory, start a static web server:

```sh
python -m http.server 8000
```

Open <http://localhost:8000> in a browser. The demo page calls the configured API URL in the `demo-api-url` meta tag in `index.html`.

## Demo API

The browser calls the Flask proxy endpoint `POST /api/run`. The proxy validates the sample ID and threshold, then forwards the request to n8n when configured. Keep the n8n webhook URL and authentication secret in the proxy's server-side environment; never put them in browser code.

The current page is configured for:

```text
https://proxy-ne3o.onrender.com/api/run<>
```

To use another proxy, update the `demo-api-url` meta tag. The proxy must allow the website's exact origin through its CORS configuration. If the API is unreachable or returns an incomplete/error response, the page identifies the issue and displays a marked local mock result.

## Synthetic data and diagrams

The three interactive samples and their evidence excerpts are fictional and exist only to demonstrate the workflow. The diagrams document the proposed architecture; they do not indicate that every depicted service is currently deployed or connected.