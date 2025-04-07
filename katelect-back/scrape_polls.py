import requests
from bs4 import BeautifulSoup
import json
import os
import re

# URLs to scrape
urls = {
    "federal": "https://338canada.com/polls.htm",
    "atl": 'https://338canada.com/polls-atl.htm',
    "qc": "https://338canada.com/polls-qc.htm",
    "on": "https://338canada.com/polls-on.htm",
    "pr": "https://338canada.com/polls-pr.htm",
    "ab": "https://338canada.com/polls-ab.htm",
    "bc": "https://338canada.com/polls-bc.htm",
}

def clean_text(text: str) -> str:
    """
    clean text by removing extra whitespace and unwanted characters
    
    args:
        text: the text to clean
        
    returns:
        cleaned text
    """
    # remove extra whitespace
    text = ' '.join(text.split())
    
    # remove text in parentheses with numbers (e.g., "(1/3)")
    text = re.sub(r'\s*\(\d+/\d+\)', '', text)
    
    # remove asterisks and their following text
    text = re.sub(r'\*+.*$', '', text)
    
    return text.strip()

def extract_poll_table(soup):
    """
    extract polling data from the table
    
    args:
        soup: beautifulsoup object of the page
        
    returns:
        list of dictionaries containing poll data
    """
    table = soup.find("table", {"id": "myTable"})
    if not table:
        return []

    # get headers and clean them
    headers = [clean_text(th.get_text()) for th in table.find_all("th")]

    rows = []
    for tr in table.find_all("tr")[1:]:  # skip header row
        cells = [td.get_text() for td in tr.find_all("td")]
        if len(cells) == len(headers):
            # clean each cell's text
            cleaned_cells = [clean_text(cell) for cell in cells]
            row = dict(zip(headers, cleaned_cells))
            rows.append(row)

    return rows

# Create output directory path (relative to script location)
script_dir = os.path.dirname(os.path.abspath(__file__))
output_dir = os.path.join(script_dir, "..", "katelect-front", "public", "polls")
os.makedirs(output_dir, exist_ok=True)

# Scrape and write each region to a separate file
for region, url in urls.items():
    print(f"🔍 Scraping {region} polls from {url}...")
    
    # set proper headers for the request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Charset': 'UTF-8',
    }
    
    res = requests.get(url, headers=headers)
    res.encoding = 'utf-8'  # force utf-8 encoding
    
    soup = BeautifulSoup(res.text, "html.parser")
    data = extract_poll_table(soup)

    output_path = os.path.join(output_dir, f"polls_{region}.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Saved {region} polls to {output_path}")

print("\n🎉 All regions scraped and saved.")
