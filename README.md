# CSE Department Research Dashboard

A faculty research analytics dashboard for the Department of Computer Science and Engineering. It aggregates publication metrics from Google Scholar and OpenAlex, renders them in a Windows 95-inspired UI, and refreshes automatically every day via GitHub Actions.

---

## Table of Contents

- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
  - [Data Pipeline](#data-pipeline)
  - [Frontend](#frontend)
  - [Automation](#automation)
- [Data Schema](#data-schema)
- [Filtering & Search Logic](#filtering--search-logic)
- [Architectural Decisions](#architectural-decisions)
- [Setup & Running Locally](#setup--running-locally)
- [Configuration](#configuration)
- [Known Limitations](#known-limitations)

---

## Live Demo

Open `index.html` directly in a browser, or serve it with any static file server:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | Vanilla HTML5, CSS3, ES6+ JavaScript |
| Styling | Custom Windows 95 retro theme, Google Fonts (Inter) |
| Data collection | Python 3.11, `scholarly` library, `requests`, `pandas` |
| Scholar source | Google Scholar (via `scholarly` v1.7.11) |
| Enrichment API | OpenAlex (`api.openalex.org`) |
| Data store | `data.json` (flat JSON file, no database) |
| Automation | GitHub Actions (daily cron + manual dispatch) |
| Hosting | Any static file host (GitHub Pages, Nginx, etc.) |

---

## Project Structure

```
cse-scholar-main/
├── index.html              # Application shell — layout, toolbar, stat panels
├── script.js               # All frontend logic: data loading, filtering, rendering, modals
├── style.css               # Windows 95 theme, grid layout, responsive breakpoints
├── fetch_data.py           # Data collection and enrichment pipeline
├── scholars.csv            # Input: faculty names + Google Scholar IDs
├── data.json               # Output: enriched research metrics (committed to repo)
├── requirements.txt        # Python dependencies
├── run.bat                 # Windows helper — installs deps, runs pipeline, opens browser
└── .github/
    └── workflows/
        └── update.yml      # GitHub Actions: daily data refresh at 02:00 UTC
```

---

## Architecture Overview

The system is split into two completely independent phases: a **data pipeline** that runs in batch, and a **static frontend** that consumes its output.

```
┌─────────────────────────────────────────────────────────────┐
│                       DATA PIPELINE                         │
│                     (Python, batch)                         │
│                                                             │
│  scholars.csv ──► fetch_data.py ──► Google Scholar API      │
│                         │                                   │
│                         ▼                                   │
│                    OpenAlex API  (per-publication enrich)   │
│                         │                                   │
│                         ▼                                   │
│                     data.json  (committed to repo)          │
└─────────────────────────────────────────────────────────────┘
                           │
                    GitHub Actions
                  (commits data.json
                   daily at 02:00 UTC)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      STATIC FRONTEND                        │
│               (HTML + CSS + Vanilla JS)                     │
│                                                             │
│  index.html ──► fetch("data.json") ──► render faculty grid  │
│                         │                                   │
│                         ▼                                   │
│              Real-time filter / search bar                  │
│                         │                                   │
│                         ▼                                   │
│              Modal detail window per faculty                │
└─────────────────────────────────────────────────────────────┘
```

### Data Pipeline

`fetch_data.py` processes `scholars.csv` row by row:

1. **Read input** — `pandas` reads `scholars.csv`; each row contains a faculty `name` and their `scholar_id`.

2. **Fetch Google Scholar profile** — `scholarly.search_author_id()` retrieves citation count, h-index, i10-index, and up to `MAX_ARTICLES = 5` publications. Requests are retried up to 3 times with linear backoff on failure.

3. **Rate limiting** — a random 2–5 second sleep between faculty requests prevents triggering Google Scholar's bot detection. An additional 0.5 s delay separates each OpenAlex call within a faculty's publications.

4. **Enrich via OpenAlex** — for each publication title, the script queries `api.openalex.org/works` to retrieve:
   - DOI
   - Journal name and ISSN
   - Citation count (used as the Scopus proxy)
   - `cited_by_percentile_year.min` (used to derive quartile and SCI status)
   - Author list (first 5, excluding the primary faculty member)

5. **Compute derived fields**:
   - `quartile`: Q1 if percentile > 75, Q2 > 50, Q3 > 25, else Q4
   - `is_sci`: `"SCI"` if percentile > 40, else `"Non-SCI"`
   - `sci_citations`: 80% of OpenAlex citation count (rough proxy)

6. **Write output** — faculty sorted by total citations descending; saved to `data.json`.

### Frontend

`script.js` runs entirely in the browser with no build step:

- **`loadData()`** — fetches `data.json` with a cache-busting query string (`?t=<timestamp>`), stores the sorted faculty array in the module-level `allFaculty` variable, and triggers `updateStats()` + `applyFilters()`.
- **`updateStats()`** — computes aggregate stats (active profiles, total publications) and runs animated easing counters via `requestAnimationFrame`.
- **`applyFilters()`** — filters `allFaculty` in memory across four independent dimensions (text search, profile status, quartile, SCI flag) and calls `render()`.
- **`render()`** — builds faculty folder card HTML via `buildFolder()` and injects it into the DOM.
- **`showFacultyDetail()`** — constructs and appends a modal window with per-publication metrics; previous modal is removed before inserting a new one.
- **`escapeHtml()`** — all user-visible strings from `data.json` pass through a DOM-based escape function before being set as `innerHTML`, preventing stored XSS.

### Automation

`.github/workflows/update.yml` runs on a `cron: "0 2 * * *"` schedule and on `workflow_dispatch`:

1. Checks out the repo
2. Installs Python 3.11 with pip caching
3. Runs `fetch_data.py`
4. Compares `git diff --staged` — skips the commit entirely if `data.json` is unchanged, avoiding noise in git history
5. Commits and pushes with a timestamp message if data changed

---

## Data Schema

`data.json` top-level structure:

```json
{
  "total_citations": 12345,
  "last_updated": "2026-05-20",
  "faculty": [ ... ]
}
```

Each faculty object:

```json
{
  "name": "Dr.S.Malliga",
  "citations": 450,
  "h_index": 12,
  "i10_index": 8,
  "profile_link": "https://scholar.google.com/citations?user=NSRyKhIAAAAJ",
  "articles": [
    {
      "title": "Publication Title",
      "link": "https://scholar.google.com/scholar?q=...",
      "doi": "10.xxxx/yyyy",
      "journal": "Journal Name",
      "issn": "0000-0000",
      "scopus_citations": 125,
      "sci_citations": 100,
      "quartile": "Q1",
      "is_sci": "SCI",
      "coauthors": "Author A, Author B"
    }
  ]
}
```

`articles` is capped at 5 entries per faculty (`MAX_ARTICLES`). Faculty with no `scholar_id` in the CSV receive a stub record with zeroed metrics and an empty articles array.

---

## Filtering & Search Logic

All four filters are applied client-side in `applyFilters()` as sequential reductions over `allFaculty`:

| Filter | Field | Match condition |
|---|---|---|
| Text search | `name`, `articles[].title`, `articles[].issn`, `articles[].doi` | case-insensitive substring |
| Profile filter | `profile_link` | truthy / falsy |
| Quartile filter | `articles[].quartile` | exact match (`q1`–`q4`) |
| SCI filter | `articles[].is_sci` | exact match (`sci` / `non-sci`) |

Quartile and SCI filters match faculty who have **at least one** article matching the criterion — not all articles need to match.

---

## Architectural Decisions

### 1. No database — JSON file as the data store

The dataset is small (≤ 20 faculty, ≤ 100 articles), read-only from the browser's perspective, and refreshed in bulk once per day. A traditional database would add operational cost (hosting, connection management, migrations) with no benefit at this scale. Committing `data.json` to the repository also gives a full audit history of data changes for free.

### 2. No framework — vanilla HTML/CSS/JS

There is no build pipeline, no `node_modules`, no bundler. The entire frontend is three files that open directly in a browser. This keeps the deployment surface minimal and makes the project maintainable without Node tooling. The dataset is small enough that virtual DOM diffing or component reactivity provide no perceptible benefit.

### 3. Client-side filtering over server-side search

With fewer than 100 records in memory, all filter operations complete in microseconds. Pushing this to a server would require an API endpoint, hosting, and network round-trips, all for a dataset that fits in a single JSON response. The `allFaculty` array is loaded once; every subsequent filter is a pure in-memory pass.

### 4. GitHub Actions as the "server"

Rather than running a persistent server to call Scholar's API, the data collection runs as a scheduled CI job. This costs nothing beyond the GitHub Actions free tier, requires zero infrastructure to maintain, and naturally handles retries (re-run the job). The bot commits directly to the repository, so `data.json` is always in sync with what the static site serves.

### 5. OpenAlex for journal metadata instead of Scopus/SJR directly

The Scopus and SJR APIs require institutional access or paid keys. OpenAlex is free, does not require authentication (the `mailto` parameter opts the caller into the polite pool for better rate limits), and covers the same journal/DOI metadata needed for quartile classification. The tradeoff is that quartile assignment here is heuristic (based on `cited_by_percentile_year`) rather than an authoritative SJR lookup.

### 6. Rate limiting baked into the pipeline, not configurable

Scholar aggressively rate-limits automated access. The 2–5 second random delay between requests and the 0.5 second per-publication delay are intentional. Exposing these as environment variables would invite accidental misconfiguration that causes the pipeline to be blocked. The constants are documented at the top of `fetch_data.py`.

### 7. Max 5 articles per faculty

Google Scholar profiles can have hundreds of publications. Fetching and enriching all of them would take hours and burn through API rate limits. Five articles captures the most-cited recent work while keeping the pipeline under the GitHub Actions 30-minute timeout.

### 8. XSS mitigation via DOM-based escaping

All dynamic content rendered into `innerHTML` passes through `escapeHtml()`, which creates a temporary text node and reads back the escaped HTML. This is safer than a regex-based approach because the browser's own HTML parser handles edge cases.

---

## Setup & Running Locally

**Prerequisites:** Python 3.11+

```bash
# 1. Clone the repo
git clone <repo-url>
cd cse-scholar-main

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Populate data.json (takes several minutes due to rate limiting)
python fetch_data.py

# 4. Serve the frontend
python -m http.server 8000
# Open http://localhost:8000
```

On Windows, `run.bat` does steps 2–4 automatically.

---

## Configuration

All pipeline constants live at the top of `fetch_data.py`:

| Constant | Default | Purpose |
|---|---|---|
| `MAX_ARTICLES` | `5` | Publications fetched per faculty |
| `DELAY_MIN` | `2` | Minimum sleep between Scholar requests (seconds) |
| `DELAY_MAX` | `5` | Maximum sleep between Scholar requests (seconds) |
| `MAX_RETRIES` | `3` | Retry attempts per Scholar profile fetch |
| `OPENALEX_URL` | `https://api.openalex.org/works` | OpenAlex endpoint |

To add or remove faculty, edit `scholars.csv`:

```csv
name,scholar_id
Dr.FirstName.LastName,GoogleScholarID
```

The `scholar_id` can be found in the Google Scholar profile URL: `?user=<ID>`.

---

## Known Limitations

- **Quartile classification is approximate.** The `cited_by_percentile_year` heuristic does not map to the official Scimago SJR quartile list. For authoritative Q1–Q4 classification, match the ISSN against a downloaded SJR CSV.
- **SCI designation is inferred, not validated.** The 40th-percentile threshold is an approximation. The authoritative source is the Clarivate Web of Science Master Journal List.
- **Google Scholar rate limits.** Running the pipeline too frequently will trigger CAPTCHAs. The GitHub Actions schedule (once daily) is conservative by design.
- **5-article cap per faculty.** The dashboard shows only the first 5 publications returned by the Scholar API, which may not be the 5 most significant.
- **No user authentication.** The dashboard is fully public and read-only by design; there is no admin interface.
- **Static hosting only.** There is no server-side component. Real-time data or user-submitted content would require a backend.
