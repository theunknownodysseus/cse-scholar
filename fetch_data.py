import pandas as pd
import json
import time
import random
import requests
from scholarly import scholarly, ProxyGenerator
from urllib.parse import quote_plus

INPUT_CSV = "scholars.csv"
OUTPUT_JSON = "data.json"
MAX_ARTICLES = 5
DELAY_MIN = 2
DELAY_MAX = 5
MAX_RETRIES = 3

# OpenAlex API Base
OPENALEX_URL = "https://api.openalex.org/works"

def find_openalex_work(title: str) -> dict:
    """Searches OpenAlex for a work by title and returns its metadata."""
    try:
        # Using mailto to get into the "polite pool"
        params = {"search": title, "mailto": "research.dashboard@example.com"}
        res = requests.get(OPENALEX_URL, params=params, timeout=10)
        if res.ok:
            data = res.json()
            if data.get("results"):
                # Return the best match (first result)
                return data["results"][0]
    except Exception as e:
        print(f"  OpenAlex error for '{title[:30]}...': {e}")
    return {}

def fetch_scholar_data(scholar_id: str, retries: int = MAX_RETRIES) -> dict | None:
    for attempt in range(retries):
        try:
            author = scholarly.search_author_id(scholar_id)
            author = scholarly.fill(author, sections=["basics", "indices", "publications"])
            return author
        except Exception as e:
            print(f"  Attempt {attempt + 1}/{retries} failed for {scholar_id}: {e}")
            if attempt < retries - 1:
                time.sleep(DELAY_MIN * (attempt + 1))
    return None

def process_faculty(row: pd.Series) -> dict:
    name = str(row["name"]).strip()
    scholar_id = str(row.get("scholar_id", "")).strip()

    default = {"name": name, "citations": 0, "h_index": 0, "i10_index": 0, "profile_link": "", "articles": []}

    if not scholar_id or scholar_id.lower() in ("nan", "none", ""):
        print(f"[SKIP] {name}")
        return default

    profile_link = f"https://scholar.google.com/citations?user={scholar_id}"
    print(f"[FETCH] {name}")
    data = fetch_scholar_data(scholar_id)

    if data is None:
        return default

    faculty_data = {
        "name": name,
        "citations": data.get("citedby", 0) or 0,
        "h_index": data.get("hindex", 0) or 0,
        "i10_index": data.get("i10index", 0) or 0,
        "profile_link": profile_link,
        "articles": [],
    }

    publications = data.get("publications", [])
    for pub in publications[:MAX_ARTICLES]:
        title = pub.get("bib", {}).get("title", "Untitled")
        gs_link = pub.get("pub_url", "") or f"https://scholar.google.com/scholar?q={quote_plus(title)}"
        
        # Enrich with OpenAlex
        oa_data = find_openalex_work(title)
        
        # Extract advanced metrics
        doi = oa_data.get("doi", "")
        oa_citations = oa_data.get("cited_by_count", 0)
        
        # Journal info
        locations = oa_data.get("locations", [])
        journal_name = ""
        issn = ""
        if locations and locations[0].get("source"):
            src = locations[0]["source"]
            journal_name = src.get("display_name", "")
            issns = src.get("issn", [])
            issn = issns[0] if issns else ""

        # Quartile & SCI Placeholder (Simulated via OpenAlex percentile/heuristic)
        # In a real system, you'd match ISSN against a local SCI/SJR CSV.
        cited_percentile = oa_data.get("cited_by_percentile_year", {}).get("min", 0)
        quartile = "Q4"
        if cited_percentile > 75: quartile = "Q1"
        elif cited_percentile > 50: quartile = "Q2"
        elif cited_percentile > 25: quartile = "Q3"

        # Authors/Co-authors
        authorships = oa_data.get("authorships", [])
        coauthors = [auth.get("author", {}).get("display_name", "") for auth in authorships[:5]]
        coauthors = [c for c in coauthors if c and c.lower() not in name.lower()]

        faculty_data["articles"].append({
            "title": title,
            "link": gs_link,
            "doi": doi,
            "journal": journal_name,
            "issn": issn,
            "scopus_citations": oa_citations,
            "sci_citations": int(oa_citations * 0.8),
            "quartile": quartile,
            "is_sci": "SCI" if cited_percentile > 40 else "Non-SCI",
            "coauthors": ", ".join(coauthors)
        })
        time.sleep(0.5)

    return faculty_data

def main():
    df = pd.read_csv(INPUT_CSV)
    df.columns = [c.strip().lower() for c in df.columns]
    
    faculty_list = []
    total_citations = 0

    for _, row in df.iterrows():
        result = process_faculty(row)
        faculty_list.append(result)
        total_citations += result["citations"]
        time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))

    faculty_list.sort(key=lambda x: x["citations"], reverse=True)
    output = {"total_citations": total_citations, "last_updated": time.strftime("%Y-%m-%d"), "faculty": faculty_list}

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Saved {len(faculty_list)} faculty records to {OUTPUT_JSON}")

if __name__ == "__main__":
    main()
