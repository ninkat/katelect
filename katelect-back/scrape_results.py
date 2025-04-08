import requests
from bs4 import BeautifulSoup
import json
import os
import time
import re

# path to the input districts file
districts_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "districts", "federal_districts.json")

# create output directory path (relative to script location)
output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "results")
os.makedirs(output_dir, exist_ok=True)
output_file_path = os.path.join(output_dir, "federal_results.json")

# parties to look for
PARTIES = ["lpc", "cpc", "ndp", "bq", "gpc", "ppc"]

def clean_percentage(text: str) -> float | None:
    """
    clean percentage text and convert to float.
    handles formats like "47.3%", "<1%", ">99%".
    returns none if text is not a valid percentage or is 0.0%.
    """
    text = text.strip().lower().replace('%', '')
    if '<' in text or '>' in text:
        # for simplicity, treat <1 as 0.5 and >99 as 99.5, though this might not be accurate
        # for vote share, <1% likely means close to 0, and >99% is rare.
        # adjust logic if specific handling is needed. consider returning 0 or a special value.
        # for now, we'll try to extract the number, or return a small/large value.
        num_part = re.search(r'(\d+(\.\d+)?)', text)
        if num_part:
             val = float(num_part.group(1))
             return 0.1 if '<' in text else 99.9 # return small/large value or None? let's use 0.1 / 99.9
        return 0.1 # default small value if no number found after < or >
    try:
        value = float(text)
        # return none if the value is effectively zero, as 338 often omits 0%
        return value if value > 0.0 else None
    except ValueError:
        return None

def extract_district_results(soup: BeautifulSoup) -> dict | None:
    """
    extract 2019 and 2021 election results from the svg table on a district page.
    
    args:
        soup: beautifulsoup object of the district page.
        
    returns:
        a dictionary with results like {"2019": {"lpc": 47.3, ...}, "2021": {"lpc": 50.9, ...}} or none if table not found.
    """
    svg = soup.find("svg", id=lambda x: x and x.startswith('ridinghisto-'))
    if not svg:
        print("    warning: could not find results svg.")
        return None

    texts = svg.find_all("text")
    results = {"2019": {}, "2021": {}}
    
    # find elements based roughly on x coordinates typical for party, 2019 val, 2021 val
    # these coordinates might need adjustment if the site layout changes.
    party_x_coord = 32.0
    year_2019_x_coord = 96.0
    year_2021_x_coord = 160.0
    coord_tolerance = 5.0 # tolerance for matching x coordinates

    party_elements = {} # store potential party elements by their y-coordinate

    # first pass: identify potential party labels and their y-coordinates
    for text_elem in texts:
        try:
            x = float(text_elem.get('x', -1))
            y = float(text_elem.get('y', -1))
            party_name = text_elem.get_text(strip=True).lower()

            if abs(x - party_x_coord) < coord_tolerance and party_name in PARTIES:
                 # round y to handle minor variations
                party_elements[round(y)] = party_name
        except (ValueError, AttributeError):
            continue # skip elements without valid coordinates

    # second pass: find percentages matching the y-coordinate of identified parties
    for text_elem in texts:
        try:
            x = float(text_elem.get('x', -1))
            y = float(text_elem.get('y', -1))
            text_content = text_elem.get_text(strip=True)
            
            rounded_y = round(y)
            
            if rounded_y in party_elements:
                party = party_elements[rounded_y]
                percentage = clean_percentage(text_content)
                
                if percentage is not None:
                    if abs(x - year_2019_x_coord) < coord_tolerance:
                        results["2019"][party] = percentage
                    elif abs(x - year_2021_x_coord) < coord_tolerance:
                        results["2021"][party] = percentage
                        
        except (ValueError, AttributeError):
            continue # skip elements without valid coordinates or text

    # return none if no results were found
    if not results["2019"] and not results["2021"]:
        print("    warning: extracted results are empty.")
        return None
        
    return results


# load district data
try:
    with open(districts_file_path, 'r', encoding='utf-8') as f:
        all_districts_data = json.load(f)
except FileNotFoundError:
    print(f"error: districts file not found at {districts_file_path}")
    exit(1)
except json.JSONDecodeError:
    print(f"error: could not decode json from {districts_file_path}")
    exit(1)

# prepare structure for results
results_data = {}

# standard headers
request_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Charset': 'UTF-8', # specify utf-8
    'Accept-Language': 'en-US,en;q=0.5', # added language preference
}

total_districts = sum(len(districts) for districts in all_districts_data.values())
processed_count = 0

# iterate through provinces and districts
for province, districts in all_districts_data.items():
    print(f"processing province: {province}")
    results_data[province] = []
    for district in districts:
        processed_count += 1
        code = district.get("code")
        name = district.get("name")
        if not code or not name:
            print(f"    skipping invalid district entry: {district}")
            continue

        url = f"https://338canada.com/{code}e.htm"
        print(f"  ({processed_count}/{total_districts}) scraping district: {name} ({code}) from {url}...")

        try:
            # get request
            res = requests.get(url, headers=request_headers, timeout=20)
            res.raise_for_status() # raise an exception for bad status codes
            res.encoding = 'utf-8' # ensure correct encoding

            soup = BeautifulSoup(res.text, "html.parser")
            
            # extract results
            district_results = extract_district_results(soup)

            # add results to the district data
            district_data_with_results = district.copy() # create a copy to avoid modifying original
            district_data_with_results["results"] = district_results if district_results else {} # add empty dict if none
            results_data[province].append(district_data_with_results)

            # polite delay
            time.sleep(0.5) # wait half a second between requests

        except requests.exceptions.RequestException as e:
            print(f"    error fetching {url}: {e}")
            # add district with empty results on error? or skip? let's add with empty.
            district_data_with_results = district.copy()
            district_data_with_results["results"] = {}
            results_data[province].append(district_data_with_results)
            time.sleep(1) # longer delay after error
        except Exception as e:
            print(f"    unexpected error processing {name} ({code}): {e}")
            # add district with empty results on unexpected error
            district_data_with_results = district.copy()
            district_data_with_results["results"] = {}
            results_data[province].append(district_data_with_results)
            time.sleep(1)

# save the results to json
try:
    with open(output_file_path, "w", encoding="utf-8") as f:
        json.dump(results_data, f, indent=2, ensure_ascii=False)
    print(f"\nall districts processed. results saved to {output_file_path}")
except IOError as e:
    print(f"\nerror writing results to {output_file_path}: {e}")

print("\nscraping complete.") 