import json
import os
from bs4 import BeautifulSoup
import re

def clean_text(text: str) -> str:
    """
    clean text by removing extra whitespace and html entities.

    args:
        text: the text to clean

    returns:
        cleaned text
    """
    # remove extra whitespace including non-breaking spaces
    text = re.sub(r'\s+', ' ', text).strip()
    # replace specific html entities if bs4 didn't catch them
    text = text.replace('&nbsp;', ' ')
    return text.strip()

def extract_district_data(soup: BeautifulSoup) -> dict[str, list[dict[str, str]]]:
    """
    extract electoral district data from the soup object.

    args:
        soup: beautifulsoup object of the html page

    returns:
        a dictionary where keys are province/territory names
        and values are lists of district dictionaries ({'code': '...', 'name': '...'})
    """
    districts_by_province: dict[str, list[dict[str, str]]] = {}
    # find all tables containing district data
    tables = soup.find_all("table", class_="widthFull tableau")

    for table in tables:
        caption_tag = table.find("caption")
        if not caption_tag or not caption_tag.get("id"):
            print("warning: skipping table without a caption or caption id.")
            continue

        province_name = clean_text(caption_tag.get_text())
        districts_by_province[province_name] = []

        tbody = table.find("tbody")
        if not tbody:
            print(f"warning: no tbody found for table under caption '{province_name}'.")
            continue

        # find all data rows (tr) skipping the header row (th)
        rows = tbody.find_all("tr")
        if not rows:
            print(f"warning: no rows found in tbody for table under caption '{province_name}'.")
            continue

        header_row = rows[0].find_all("th")
        if not header_row:
             print(f"warning: no header row (th) found for table under caption '{province_name}'.")
             continue # skip if no header

        for tr in rows[1:]:  # skip header row
            cells = tr.find_all("td")
            if len(cells) == 2:  # expect code and name
                code = clean_text(cells[0].get_text())
                name = clean_text(cells[1].get_text())
                if code and name: # ensure data is present
                     districts_by_province[province_name].append({"code": code, "name": name})
                else:
                    print(f"warning: skipping row with missing code or name in {province_name}: {tr}")
            else:
                 print(f"warning: skipping row with unexpected cell count in {province_name}: {tr}")


    return districts_by_province

# define paths relative to the script location
script_dir = os.path.dirname(os.path.abspath(__file__))
html_file_path = os.path.join(script_dir, "html.txt")
output_dir = os.path.join(script_dir, "data", "districts")
output_path = os.path.join(output_dir, "federal_districts.json")

# ensure the output directory exists
os.makedirs(output_dir, exist_ok=True)

# read the html file
print(f"reading html file from {html_file_path}...")
try:
    # use utf-8 encoding as the content appears to be utf-8 despite the meta tag
    with open(html_file_path, "r", encoding="utf-8") as f:
        html_content = f.read()
except FileNotFoundError:
    print(f"error: html file not found at {html_file_path}")


# parse html and extract data
print("Parsing html and extracting district data...")
soup = BeautifulSoup(html_content, "html.parser")
district_data = extract_district_data(soup)

# write data to json file
print(f"💾 Saving district data to {output_path}...")
try:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(district_data, f, indent=2, ensure_ascii=False)

    # calculate counts for the final message
    num_provinces = len(district_data)
    num_districts = sum(len(districts) for districts in district_data.values())

    print(f"\\nFederal electoral districts scraped and saved successfully ({num_districts} districts across {num_provinces} provinces/territories).")

except IOError as e:
    print(f"error writing json file: {e}")
    exit(1) 