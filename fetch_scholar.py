import pandas as pd
from scholarly import scholarly

scholars = pd.read_csv("scholars.csv")

all_papers = []

for index, row in scholars.iterrows():

    name = row["name"]
    scholar_id = row["scholar_id"]

    print("Fetching:", name)

    author = scholarly.search_author_id(scholar_id)
    author = scholarly.fill(author)

    for pub in author["publications"]:

        pub = scholarly.fill(pub)

        title = pub["bib"].get("title","")
        year = pub["bib"].get("pub_year","")
        citations = pub.get("num_citations",0)

        all_papers.append({
            "author": name,
            "title": title,
            "year": year,
            "citations": citations
        })

df = pd.DataFrame(all_papers)

df.to_csv("department_publications.csv", index=False)

print("Saved department_publications.csv")