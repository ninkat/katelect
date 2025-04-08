from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import json
import uvicorn

# Define directories
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / "data"
POLLS_DIR = DATA_DIR / "polls"
AVERAGES_DIR = DATA_DIR / "averages"
LATEST_DIR = DATA_DIR / "latest"

# Mapping from file codes (ab, qc) to frontend names (alberta, quebec)
# Ensure these names match the keys in regionDisplayNames in Polls.tsx
REGION_CODE_TO_NAME = {
    "federal": "federal",
    "ab": "alberta",
    "atl": "atlantic",
    "bc": "bc",
    "on": "ontario",
    "pr": "prairies",
    "qc": "quebec",
}

def transform_poll_data(raw_poll):
    """transform raw poll data into the format expected by the frontend."""
    try:
        # convert string percentages to float numbers
        def safe_float(value):
            try:
                return float(value) if value and value.strip() else None
            except (ValueError, TypeError):
                return None

        # handle different field names for pollster
        pollster = raw_poll.get("Polling Firm") or raw_poll.get("Firm")
        if not pollster:
            raise ValueError("No pollster field found")

        # handle different field names for sample size
        sample_size = raw_poll.get("Sample")
        sample_size = int(sample_size.replace(",", "")) if sample_size else None

        # get party percentages, handling missing fields
        transformed = {
            "date": raw_poll["Date (middle)"],
            "pollster": pollster,
            "sampleSize": sample_size,
            "liberal": safe_float(raw_poll.get("LPC")),
            "conservative": safe_float(raw_poll.get("CPC")),
            "ndp": safe_float(raw_poll.get("NDP")),
            "green": safe_float(raw_poll.get("GPC")),
            "ppc": safe_float(raw_poll.get("PPC")),
            "other": 0.0  # default to 0 since it's not in raw data
        }

        # only include bloc if present (federal/quebec only)
        bloc_value = safe_float(raw_poll.get("BQ"))
        if bloc_value is not None:
            transformed["bloc"] = bloc_value

        return transformed
    except Exception as e:
        print(f"Error transforming poll data: {e}")
        return None

# Reverse mapping for internal file lookup
NAME_TO_REGION_CODE = {v: k for k, v in REGION_CODE_TO_NAME.items()}

# Generate list of valid region *names* based on existing files and map
VALID_CODES = [f.stem.split('_')[1] for f in POLLS_DIR.glob("polls_*.json")]
VALID_REGIONS = sorted([REGION_CODE_TO_NAME[code] for code in VALID_CODES if code in REGION_CODE_TO_NAME])

app = FastAPI()

# cors middleware to allow requests from the frontend (adjust origins if necessary)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # adjust to your frontend url
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"]
)

def read_json_file(file_path: Path):
    """helper function to read and parse json file."""
    if not file_path.exists():
        return None
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error reading file {file_path}: {e}") # Log error
        return None

@app.get("/api/polls/{region_name}")
async def get_raw_polls(region_name: str):
    """endpoint to get raw polling data for a specific region (using full name)."""
    if region_name not in VALID_REGIONS:
        raise HTTPException(status_code=404, detail=f"Region '{region_name}' not found.")

    # Map full name back to code to find file
    region_code = NAME_TO_REGION_CODE.get(region_name)
    if not region_code:
         raise HTTPException(status_code=500, detail=f"Internal error mapping region name '{region_name}'.")

    file_path = POLLS_DIR / f"polls_{region_code}.json"
    data = read_json_file(file_path)

    if data is None:
        raise HTTPException(status_code=500, detail=f"Could not load raw poll data for region '{region_name}'.")

    # Transform each poll into the expected format
    transformed_data = [transformed for poll in data if (transformed := transform_poll_data(poll)) is not None]
    return transformed_data

@app.get("/api/averages/{region_name}")
async def get_averaged_polls(region_name: str):
    """endpoint to get averaged (ewma normalized) polling data for a specific region (using full name)."""
    if region_name not in VALID_REGIONS:
        raise HTTPException(status_code=404, detail=f"Region '{region_name}' not found.")

    region_code = NAME_TO_REGION_CODE.get(region_name)
    if not region_code:
         raise HTTPException(status_code=500, detail=f"Internal error mapping region name '{region_name}'.")

    file_path = AVERAGES_DIR / f"{region_code}_averages.json"
    data = read_json_file(file_path)

    if data is None:
        raise HTTPException(status_code=500, detail=f"Could not load averaged poll data for region '{region_name}'.")

    return data

@app.get("/api/latest/{region_name}")
async def get_latest_polls(region_name: str):
    """endpoint to get the latest polling average and changes for a specific region (using full name)."""
    if region_name not in VALID_REGIONS:
        raise HTTPException(status_code=404, detail=f"Region '{region_name}' not found.")

    region_code = NAME_TO_REGION_CODE.get(region_name)
    if not region_code:
         raise HTTPException(status_code=500, detail=f"Internal error mapping region name '{region_name}'.")

    file_path = LATEST_DIR / f"{region_code}_latest.json"
    data = read_json_file(file_path)

    if data is None:
        raise HTTPException(status_code=500, detail=f"Could not load latest poll data for region '{region_name}'.")

    return data

@app.get("/api/regions")
async def get_regions():
    """endpoint to get a list of available region *names*."""
    # Return the list of full names
    return VALID_REGIONS


if __name__ == "__main__":
    # Run scrape and aggregate scripts before starting the server
    # This assumes scrape_polls.py and aggregate_polls.py are executable and in the path
    # You might need to adjust the command based on your setup (e.g., using python explicitly)
    print("Running initial data preparation...")
    # os.system("python scrape_polls.py") # Consider running these manually or in a separate process
    # os.system("python aggregate_polls.py")
    print("Starting FastAPI server...")

    # Note: Make sure the data directories/files exist before starting.
    # Consider running scrape_polls.py and aggregate_polls.py manually or via a script first.
    if not POLLS_DIR.exists() or not AVERAGES_DIR.exists() or not LATEST_DIR.exists():
        print("\n⚠️ Warning: Data directories (polls, averages, latest) not found.")
        print("Please run 'python scrape_polls.py' and 'python aggregate_polls.py' first.\n")

    uvicorn.run(app, host="0.0.0.0", port=8000) 